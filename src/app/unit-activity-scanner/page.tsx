'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase, useGetCollection } from '@/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  setDoc,
  query, 
  where,
  updateDoc,
  orderBy,
  limit
} from '@/firebase/firestore-wrapper';
import type { Unit, AttendanceActivity, DeviceBinding, ActivityAttendanceLog } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  QrCode,
  Users,
  FlipHorizontal2,
  KeyRound,
  RefreshCw
} from 'lucide-react';

const generateActivityCode = (activityId: string, timestamp: number) => {
  const windowId = Math.floor(timestamp / 60000); // 60-second window
  const inputStr = `${activityId}-${windowId}-rsu-secure-otp`;
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return ((Math.abs(hash) % 900) + 100).toString();
};

const APP_SECRET_SALT = "rsu_attendance_secure_salt_2026";

const generatePayloadSignature = (userId: string, timestamp: number, fp: string) => {
  const inputStr = `${userId}-${timestamp}-${fp}-${APP_SECRET_SALT}`;
  let hash = 0;
  for (let i = 0; i < inputStr.length; i++) {
    const char = inputStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `SIG-${Math.abs(hash)}`;
};

function UnitActivityScannerTerminal() {
  const { userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [paramActivityId, setParamActivityId] = useState<string | null>(null);
  const [offlineLogs, setOfflineLogs] = useState<ActivityAttendanceLog[]>([]);

  // Load offline logs from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rsu_attendance_offline_logs');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setOfflineLogs(parsed);
          }
        } catch (e) {
          console.error("Failed to parse offline logs:", e);
        }
      }
    }
  }, []);

  // Background Sync loop for scanner terminal
  useEffect(() => {
    if (!firestore || offlineLogs.length === 0) return;

    const interval = setInterval(async () => {
      let logsToSync = [...offlineLogs];
      let hasChanged = false;

      for (let i = 0; i < logsToSync.length; i++) {
        const log = logsToSync[i];
        if (log.synced) continue;

        try {
          const logRef = doc(firestore, 'unitActivityAttendanceLogs', log.id);
          const onlineSnap = await getDoc(logRef);
          
          const logDataForFirebase = { ...log };
          delete logDataForFirebase.synced;

          if (logDataForFirebase.scannedAt) {
            logDataForFirebase.scannedAt = new Date(logDataForFirebase.scannedAt);
          }
          if (logDataForFirebase.logoutAt) {
            logDataForFirebase.logoutAt = new Date(logDataForFirebase.logoutAt);
          }

          if (onlineSnap.exists()) {
            const onlineData = onlineSnap.data() as ActivityAttendanceLog;
            if (log.logoutAt && !onlineData.logoutAt) {
              await updateDoc(logRef, { logoutAt: logDataForFirebase.logoutAt });
            }
          } else {
            await setDoc(logRef, logDataForFirebase);
          }

          logsToSync[i] = { ...log, synced: true };
          hasChanged = true;
        } catch (err: any) {
          console.warn("Failed to sync offline log:", log.id, err.message);
          if (err.message?.includes("Quota exceeded") || err.code === 'resource-exhausted') {
            break;
          }
        }
      }

      if (hasChanged) {
        const remainingLogs = logsToSync.filter(l => !l.synced);
        setOfflineLogs(remainingLogs);
        localStorage.setItem('rsu_attendance_offline_logs', JSON.stringify(remainingLogs));
      }
    }, 30000); // Sync every 30 seconds

    return () => clearInterval(interval);
  }, [firestore, offlineLogs]);

  const formatTimeSafe = (dateVal: any) => {
    if (!dateVal) return 'N/A';
    try {
      if (dateVal.toDate) return format(dateVal.toDate(), 'hh:mm a');
      if (dateVal.seconds) return format(new Date(dateVal.seconds * 1000), 'hh:mm a');
      return format(new Date(dateVal), 'hh:mm a');
    } catch (e) {
      return 'N/A';
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setParamActivityId(searchParams.get('activityId'));
    }
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('default');

  // Fetch specific activity details
  const activityRef = useMemoFirebase(() => {
    if (!firestore || !paramActivityId) return null;
    return doc(firestore, 'unitActivities', paramActivityId);
  }, [firestore, paramActivityId]);
  const { data: activeActivity, isLoading: isLoadingActivity } = useDoc<AttendanceActivity>(activityRef);

  const [activeCode, setActiveCode] = useState('');
  const [codeSecondsLeft, setCodeSecondsLeft] = useState(60);

  // Sync activeSessionId from activity document
  useEffect(() => {
    if (activeActivity?.activeSessionId) {
      setSelectedSessionId(activeActivity.activeSessionId);
    }
  }, [activeActivity?.activeSessionId]);

  // Compute purely client-side mathematical rolling OTP code
  useEffect(() => {
    if (!paramActivityId) return;

    const updateCode = () => {
      const now = Date.now();
      const code = generateActivityCode(paramActivityId, now);
      setActiveCode(code);
      setCodeSecondsLeft(60 - (Math.floor(now / 1000) % 60));
    };

    updateCode();
    const interval = setInterval(updateCode, 1000);
    return () => clearInterval(interval);
  }, [paramActivityId]);

  const parseSessionTime = (dateStr: string, timeStr: string) => {
    try {
      const d = new Date(`${dateStr}T${timeStr}:00`);
      if (isNaN(d.getTime())) {
        return Date.now();
      }
      return d.getTime();
    } catch (e) {
      return Date.now();
    }
  };

  const sessions = useMemo(() => {
    if (activeActivity?.sessions && activeActivity.sessions.length > 0) {
      return activeActivity.sessions;
    }
    const label = 'Default Session';
    const date = activeActivity?.startDateTime?.toDate 
      ? format(activeActivity.startDateTime.toDate(), 'yyyy-MM-dd') 
      : activeActivity?.startDateTime
      ? format(new Date(activeActivity.startDateTime), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');
    const startTime = activeActivity?.startDateTime?.toDate 
      ? format(activeActivity.startDateTime.toDate(), 'HH:mm') 
      : activeActivity?.startDateTime
      ? format(new Date(activeActivity.startDateTime), 'HH:mm')
      : '08:00';
    const endTime = activeActivity?.endDateTime?.toDate 
      ? format(activeActivity.endDateTime.toDate(), 'HH:mm') 
      : activeActivity?.endDateTime
      ? format(new Date(activeActivity.endDateTime), 'HH:mm')
      : '17:00';
    return [{
      id: 'default',
      date,
      label,
      sessionType: 'WHOLE_DAY' as const,
      requiresLogout: activeActivity?.requiresLogout || false,
      startTime,
      endTime
    }];
  }, [activeActivity]);

  useEffect(() => {
    if (sessions.length > 0) {
      if (!sessions.some(s => s.id === selectedSessionId)) {
        setSelectedSessionId(sessions[0].id);
      }
    }
  }, [sessions, selectedSessionId]);

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === selectedSessionId) || sessions[0];
  }, [sessions, selectedSessionId]);

  // Fetch unit list to resolve active activity unit name (static, fetched once)
  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useGetCollection<Unit>(unitsQuery);

  // Fetch real-time logs for this activity (ordered by time and limited to top 50 to prevent huge reads)
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !paramActivityId || isUserLoading) return null;
    return query(
      collection(firestore, 'unitActivityAttendanceLogs'),
      where('activityId', '==', paramActivityId),
      orderBy('scannedAt', 'desc'),
      limit(50)
    );
  }, [firestore, paramActivityId, isUserLoading]);
  const { data: attendanceLogs } = useCollection<ActivityAttendanceLog>(logsQuery);

  const sortedLogs = useMemo(() => {
    const combined = attendanceLogs ? [...attendanceLogs] : [];

    // Filter offline logs for the current activity and session, and ensure they aren't already online
    const currentSessionOfflineLogs = offlineLogs.filter(log => {
      const matchesSession = (log.sessionId || 'default') === selectedSessionId;
      const matchesActivity = log.activityId === paramActivityId;
      if (!matchesSession || !matchesActivity) return false;
      
      const alreadyInOnline = combined.some(onlineLog => onlineLog.id === log.id);
      return !alreadyInOnline;
    });

    const merged = [...combined, ...currentSessionOfflineLogs];

    return merged
      .filter(log => {
        const logSessionId = log.sessionId || 'default';
        return logSessionId === selectedSessionId;
      })
      .sort((a, b) => {
        const getMs = (dateVal: any) => {
          if (!dateVal) return 0;
          if (dateVal.toDate) return dateVal.toDate().getTime();
          if (dateVal.seconds) return dateVal.seconds * 1000;
          return new Date(dateVal).getTime();
        };
        return getMs(b.scannedAt) - getMs(a.scannedAt);
      });
  }, [attendanceLogs, offlineLogs, selectedSessionId, paramActivityId]);

  // --- CAMERA QR SCANNING MODULE (CDN LOADED) ---
  const [isScannerLibLoaded, setIsScannerLibLoaded] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraCount, setCameraCount] = useState(0);
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'warning' | 'error' | 'none';
    message: string;
    details?: {
      name: string;
      office: string;
      time: string;
      status: string;
    };
  }>({ status: 'none', message: 'Ready to scan QR codes.' });

  const html5QrCodeScannerRef = useRef<any>(null);
  const readerBgRef = useRef<HTMLDivElement>(null);
  const resetTimeoutRef = useRef<any>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  const showScanResult = (result: typeof scanResult) => {
    setScanResult(result);
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
    }
    resetTimeoutRef.current = setTimeout(() => {
      setScanResult({ status: 'none', message: 'Ready to scan QR codes.' });
    }, 4500);
  };

  // Load html5-qrcode library from CDN dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Html5Qrcode) {
      setIsScannerLibLoaded(true);
      // Enumerate cameras to detect multi-camera support
      try {
        (window as any).Html5Qrcode.getCameras().then((devices: any[]) => {
          setCameraCount(devices?.length ?? 0);
        }).catch(() => {});
      } catch (e) {}
      return;
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => {
      setIsScannerLibLoaded(true);
      // Enumerate cameras after lib loads
      setTimeout(() => {
        try {
          (window as any).Html5Qrcode.getCameras().then((devices: any[]) => {
            setCameraCount(devices?.length ?? 0);
          }).catch(() => {});
        } catch (e) {}
      }, 300);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const applyZoom = (level: number) => {
    if (!html5QrCodeScannerRef.current) return;
    try {
      const caps = html5QrCodeScannerRef.current.getRunningTrackCapabilities?.();
      if (caps && caps.zoom) {
        const minZoom = caps.zoom.min ?? 1;
        const maxZoom = caps.zoom.max ?? 5;
        const clampedZoom = Math.min(Math.max(level, minZoom), maxZoom);
        html5QrCodeScannerRef.current.applyVideoConstraints({
          advanced: [{ zoom: clampedZoom }]
        }).catch(() => {});
      }
    } catch (e) {
      // zoom not supported
    }
  };

  const handleZoomChange = (newLevel: number) => {
    setZoomLevel(newLevel);
    applyZoom(newLevel);
  };

  const startScanning = (mode?: 'environment' | 'user') => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;
    if (!paramActivityId) return;
    if (!readerBgRef.current) {
      setScanResult({ status: 'error', message: 'Camera initialization failed: Scanner container not ready.' });
      setScannerActive(false);
      return;
    }

    const activeMode = mode ?? facingMode;

    setScannerActive(true);
    setScanResult({ status: 'none', message: 'Initializing camera stream...' });

    setTimeout(() => {
      if (!document.getElementById("reader-bg")) {
        // Container not ready or unmounted, abort gracefully
        return;
      }
      try {
        const scanner = new (window as any).Html5Qrcode("reader-bg");

        scanner.start(
          { facingMode: activeMode },
          {
            fps: 30,
            qrbox: { width: 180, height: 180 },
            aspectRatio: 1.0,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            }
          },
          (decodedText: string) => {
            handleScanSuccess(decodedText);
          },
          (_errorMessage: string) => {
            // silent polling errors
          }
        ).then(() => {
          html5QrCodeScannerRef.current = scanner;

          // Check zoom support after start
          try {
            const caps = scanner.getRunningTrackCapabilities?.();
            if (caps && caps.zoom && caps.zoom.max > 1) {
              setSupportsZoom(true);
            }
          } catch (e) {}

          // Apply continuous focus
          try {
            scanner.applyVideoConstraints({ focusMode: 'continuous' }).catch(() => {});
          } catch (e) {}
        }).catch((err: any) => {
          console.error("Camera Start Error:", err);
          setScanResult({ status: 'error', message: `Camera access failed: ${err.message || err}. Please ensure camera permission is granted.` });
          setScannerActive(false);
        });
      } catch (err: any) {
        console.error("Camera Init Error:", err);
        setScanResult({ status: 'error', message: `Camera initialization failed: ${err.message || err}` });
        setScannerActive(false);
      }
    }, 100);
  };

  // Switch between front and back camera
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    setSupportsZoom(false);
    setZoomLevel(1);
    // Stop current scanner then restart with new camera
    if (html5QrCodeScannerRef.current) {
      const scanner = html5QrCodeScannerRef.current;
      html5QrCodeScannerRef.current = null;
      try {
        scanner.stop().then(() => {
          startScanning(nextMode);
        }).catch(() => {
          startScanning(nextMode);
        });
      } catch (e) {
        startScanning(nextMode);
      }
    } else {
      startScanning(nextMode);
    }
  };

  const stopScanning = () => {
    if (html5QrCodeScannerRef.current) {
      const scanner = html5QrCodeScannerRef.current;
      html5QrCodeScannerRef.current = null;
      try {
        scanner.stop().catch((e: any) => {
          console.warn("Scanner stop promise catch:", e);
        });
      } catch (e) {
        console.error("Scanner stop error:", e);
      }
    }
    setScannerActive(false);
    setSupportsZoom(false);
    setZoomLevel(1);
    setScanResult({ status: 'none', message: 'Camera stream disconnected.' });
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!firestore || !activeActivity) return;

    try {
      let payload: any;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        showScanResult({ status: 'error', message: 'Rejected: Scanned content is not a valid RSU QR payload.' });
        return;
      }

      // Check if it's the minified/optimized payload format
      const isMinified = 'u' in payload && 'f' in payload && 't' in payload && 's' in payload;
      
      const userId = isMinified ? payload.u : payload.userId;
      const deviceFingerprint = isMinified ? payload.f : payload.deviceFingerprint;
      const timestamp = isMinified ? payload.t : payload.timestamp;
      const signature = isMinified ? payload.s : payload.signature;

      if (!userId || !deviceFingerprint || !timestamp || !signature) {
        showScanResult({ status: 'error', message: 'Rejected: Missing security properties in QR payload.' });
        return;
      }

      if (Date.now() - timestamp > 70000) {
        showScanResult({ status: 'error', message: 'Rejected: Expired QR token. Use the rotating code from the active phone app.' });
        return;
      }

      // Cryptographic signature check (tamper prevention / offline trust check)
      const computedSignature = generatePayloadSignature(userId, timestamp, deviceFingerprint);
      if (signature !== computedSignature) {
        showScanResult({ status: 'error', message: 'Security Rejection: Invalid QR signature (tamper detected).' });
        return;
      }

      // Extract user metadata from QR payload (avoids fetching attendanceDeviceBindings)
      const userName = payload.n || payload.userName || 'Attendee';
      const unitId = payload.i || payload.unitId || '';
      const unitName = payload.o || payload.unitName || 'Office';
      const finalContact = payload.c || payload.contactNumber || 'N/A';
      const finalSex = payload.x || payload.sex || 'Did not specify';

      const scanTime = Date.now();
      const actStart = parseSessionTime(selectedSession.date, selectedSession.startTime);
      const actEnd = parseSessionTime(selectedSession.date, selectedSession.endTime);
      const requiresLogout = selectedSession.requiresLogout;
      const lateThreshold = Number(activeActivity.lateThresholdMinutes || 0);

      let logStatus: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' = 'ON_TIME';
      if (lateThreshold === 0) {
        logStatus = scanTime <= actEnd ? 'ON_TIME' : 'OUTSIDE_WINDOW';
      } else {
        const lateCutoff = actStart + (lateThreshold * 60000);
        if (scanTime < actStart || scanTime <= lateCutoff) {
          logStatus = 'ON_TIME';
        } else if (scanTime <= actEnd) {
          logStatus = 'LATE';
        } else {
          logStatus = 'OUTSIDE_WINDOW';
        }
      }

      const logId = `${activeActivity.id}_${selectedSession.id}_${userId}`;
      const logRef = doc(firestore, 'unitActivityAttendanceLogs', logId);

      let existingLogData: ActivityAttendanceLog | null = null;
      let isOnlineSuccess = false;

      // Try checking online log first, fallback to local search if quota exceeded/offline
      try {
        const existingLog = await getDoc(logRef);
        if (existingLog.exists()) {
          existingLogData = existingLog.data() as ActivityAttendanceLog;
        }
        isOnlineSuccess = true;
      } catch (err: any) {
        console.warn("Could not check online log status, checking offline registry:", err);
        const localLog = offlineLogs.find(l => l.id === logId);
        if (localLog) {
          existingLogData = localLog;
        }
      }

      const logoutTime = new Date();

      if (existingLogData) {
        if (requiresLogout && !existingLogData.logoutAt) {
          // Update logout
          if (isOnlineSuccess) {
            try {
              await updateDoc(logRef, { logoutAt: logoutTime });
              showScanResult({
                status: 'success',
                message: `Logout recorded for ${userName} (${selectedSession.label}).`,
                details: { name: userName, office: unitName, time: format(logoutTime, 'hh:mm a'), status: 'LOGOUT' }
              });
              return;
            } catch (err: any) {
              console.warn("Online update failed, saving logout offline:", err);
            }
          }

          // Offline fallback logout saving
          const updatedLogs = offlineLogs.map(l => {
            if (l.id === logId) {
              return { ...l, logoutAt: logoutTime, synced: false };
            }
            return l;
          });

          if (!offlineLogs.some(l => l.id === logId)) {
            updatedLogs.push({
              ...existingLogData,
              logoutAt: logoutTime,
              synced: false
            });
          }

          setOfflineLogs(updatedLogs);
          localStorage.setItem('rsu_attendance_offline_logs', JSON.stringify(updatedLogs));

          showScanResult({
            status: 'success',
            message: `Scan Approved (Logout Saved Offline). It will sync automatically.`,
            details: { name: userName, office: unitName, time: format(logoutTime, 'hh:mm a'), status: 'LOGOUT (OFFLINE)' }
          });
        } else if (requiresLogout && existingLogData.logoutAt) {
          showScanResult({
            status: 'warning',
            message: `${userName} has already completed login and logout for ${selectedSession.label}. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        } else {
          showScanResult({
            status: 'warning',
            message: `${userName} has already signed in for ${selectedSession.label}. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        }
        return;
      }

      // First-time login / check-in
      const newLog: ActivityAttendanceLog = {
        id: logId,
        activityId: activeActivity.id,
        userId,
        userName,
        unitId,
        unitName,
        deviceFingerprint,
        scannedAt: new Date(),
        status: logStatus,
        contactNumber: finalContact,
        sex: finalSex,
        sessionId: selectedSession.id,
        sessionLabel: selectedSession.label
      };

      if (isOnlineSuccess) {
        try {
          await setDoc(logRef, newLog);
          showScanResult({
            status: logStatus === 'ON_TIME' ? 'success' : 'warning',
            message: logStatus === 'ON_TIME' 
              ? `Verified! Signed on time for ${selectedSession.label}.${ requiresLogout ? ' Scan again to logout.' : '' }` 
              : logStatus === 'LATE'
              ? `Lateness recorded for ${selectedSession.label}. Threshold was ${lateThreshold} mins.`
              : `Scan outside session window — recorded as OUTSIDE WINDOW.`,
            details: {
              name: userName,
              office: unitName,
              time: format(new Date(), 'hh:mm a'),
              status: logStatus === 'ON_TIME' ? 'LOGIN ON TIME' : logStatus === 'LATE' ? 'LOGIN LATE' : 'OUTSIDE WINDOW'
            }
          });
          return;
        } catch (err: any) {
          console.warn("Online setDoc failed, saving login offline:", err);
        }
      }

      // Offline fallback login saving
      const updatedLog = { ...newLog, synced: false };
      const updatedLogs = [...offlineLogs, updatedLog];
      setOfflineLogs(updatedLogs);
      localStorage.setItem('rsu_attendance_offline_logs', JSON.stringify(updatedLogs));

      showScanResult({
        status: 'success',
        message: `Scan Approved (Saved Offline). It will sync automatically.`,
        details: {
          name: userName,
          office: unitName,
          time: format(new Date(), 'hh:mm a'),
          status: logStatus === 'ON_TIME' ? 'LOGIN ON TIME (OFFLINE)' : logStatus === 'LATE' ? 'LOGIN LATE (OFFLINE)' : 'OUTSIDE WINDOW (OFFLINE)'
        }
      });

    } catch (err: any) {
      console.error(err);
      showScanResult({ status: 'error', message: `Internal Verification Error: ${err.message}` });
    }
  };

  // Monitor fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-request fullscreen on first gesture
  useEffect(() => {
    const enterFS = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
          console.warn('Auto-fullscreen failed:', err);
        });
      }
      events.forEach(event => window.removeEventListener(event, enterFS));
    };
    const events = ['click', 'touchstart', 'focusin', 'keydown'];
    events.forEach(event => window.addEventListener(event, enterFS, { passive: true }));
    return () => {
      events.forEach(event => window.removeEventListener(event, enterFS));
    };
  }, []);

  // Prevent Escape from exiting fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // Update clock every second
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Manage scanner camera lifecycle — start as soon as library and activityId are ready
  // Camera runs continuously; fullscreen overlay is cosmetic/security UX only
  useEffect(() => {
    if (isScannerLibLoaded && paramActivityId && !isUserLoading && !isLoadingActivity) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScannerLibLoaded, paramActivityId, isUserLoading, isLoadingActivity]);

  const handleExitTerminal = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn(e);
    }
    window.close();
    setTimeout(() => {
      window.location.href = '/unit-activity';
    }, 100);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Error toggling fullscreen:', err);
    }
  };

  if (isUserLoading || isLoadingActivity) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  const activeActivityUnit = activeActivity ? (units?.find(u => u.id === activeActivity.unitId)?.name || activeActivity.unitId) : 'N/A';
  const registrationUrl = typeof window !== 'undefined' && activeActivity
    ? `${window.location.origin}/attendance-app?activityId=${activeActivity.id}`
    : '';
  const registrationQrCodeUrl = registrationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(registrationUrl)}`
    : '';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d2a18] font-sans text-white flex flex-col">

      {/* ================================================================== */}
      {/* BACKGROUND: rsupage.png with Ken Burns Animation                   */}
      {/* ================================================================== */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: "url('/rsupage.png')",
            opacity: 0.12,
            animation: "kenBurnsBackground 40s ease-in-out infinite",
            mixBlendMode: "overlay"
          }}
        />
        {/* Soft layout overlay to keep UI text/cards perfectly legible */}
        <div className="absolute inset-0 bg-[#0d2a18]/90" />
      </div>

      {/* Decorative shimmers */}
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-[#1B6535]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ================================================================== */}
      {/* TOP HEADER BAR — floats over layout                                */}
      {/* ================================================================== */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-md border-b border-white/10 shrink-0 animate-in slide-in-from-top duration-300">
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src="/rsulogo.png" alt="RSU Logo" className="h-9 w-9 object-contain drop-shadow-lg" />
          <div>
            <h1 className="text-xs font-black tracking-tight text-white uppercase flex items-center gap-1.5 drop-shadow">
              <Sparkles className="h-3.5 w-3.5 text-[#D4AF37] animate-pulse" />
              RSU Attendance Terminal
            </h1>
            {activeActivity && (
              <p className="text-[9px] font-black text-[#D4AF37] tracking-widest uppercase mt-0.5 drop-shadow">
                {activeActivity.name} &bull; {activeActivityUnit}
              </p>
            )}
          </div>
        </div>

        {/* Clock widget */}
        {currentTime && (
          <div className="hidden lg:flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 shadow-xl">
            <Clock className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
            <span className="text-xs font-black text-white tabular-nums">{format(currentTime, 'hh:mm:ss a')}</span>
            <div className="h-3 w-px bg-white/15" />
            <Calendar className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
            <span className="text-[9.5px] font-bold text-white">{format(currentTime, 'EEE, MMM dd')}</span>
          </div>
        )}

        {/* Session Selector */}
        {sessions.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3.5 py-1 shadow-xl">
            <span className="text-[8.5px] font-black text-[#D4AF37] uppercase tracking-wider">Session:</span>
            <select
              value={selectedSessionId}
              onChange={async (e) => {
                const newSessionId = e.target.value;
                setSelectedSessionId(newSessionId);
                if (firestore && paramActivityId) {
                  try {
                    await updateDoc(doc(firestore, 'unitActivities', paramActivityId), {
                      activeSessionId: newSessionId
                    });
                  } catch (err) {
                    console.error("Error updating active session:", err);
                  }
                }
              }}
              className="bg-transparent border-none text-[9.5px] font-black text-white focus:outline-none cursor-pointer uppercase pr-2 max-w-[150px]"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-950 text-white text-[9px] font-bold">
                  {s.label} ({s.date})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 rounded-full">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[8.5px] font-black text-white/85 uppercase tracking-widest">Live</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-[#D4AF37]/80 hover:text-[#D4AF37] bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            Fullscreen
          </button>

          <button
            onClick={handleExitTerminal}
            className="inline-flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-500/30 transition-all"
          >
            <ArrowLeft className="h-3 w-3" />
            Exit
          </button>
        </div>
      </header>

      {/* ================================================================== */}
      {/* MAIN CONTAINER LAYOUT — 2-Column Split                             */}
      {/* ================================================================== */}
      <main className="relative z-10 flex-1 flex overflow-hidden w-full">
        
        {/* ==================== LEFT COLUMN: MAIN ATTENDANCE DISPLAY ==================== */}
        <section className="flex-1 flex flex-col p-6 gap-6 overflow-hidden min-w-0">
          
          {/* ---- ATTENDANCE INFORMATION (GIANT VALIDATION CARD) ---- */}
          <div className="shrink-0 animate-in slide-in-from-left duration-300">
            {scanResult.status === 'none' ? (
              // STANDBY WELCOME PANEL (OVERHAULED & MUCH BIGGER)
              <div className="relative min-h-[380px] rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center p-8 text-center overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#1B6535]/5 rounded-full blur-3xl pointer-events-none" />
                
                {currentTime && (
                  <div className="text-6xl sm:text-7xl lg:text-8xl font-black text-[#D4AF37] tracking-tight tabular-nums drop-shadow-md select-none">
                    {format(currentTime, 'hh:mm:ss a')}
                  </div>
                )}
                
                {currentTime && (
                  <p className="text-[10px] sm:text-xs font-extrabold text-slate-300 uppercase tracking-[0.25em] mb-4">
                    {format(currentTime, 'EEEE, MMMM dd, yyyy')}
                  </p>
                )}

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black uppercase tracking-wider text-white drop-shadow">
                  RSU Attendance Kiosk Active
                </h2>
                
                <p className="text-[9px] sm:text-[10px] text-emerald-300 uppercase tracking-widest font-black max-w-lg mt-2 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  ★ Align your mobile QR Code inside the scanner on the right ★
                </p>
                
                {/* Statistics Grid */}
                <div className="grid grid-cols-3 gap-4 sm:gap-6 mt-8 w-full max-w-2xl">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                    <span className="block text-[8px] sm:text-[9.5px] font-black text-slate-400 uppercase tracking-widest text-center">Total Present</span>
                    <span className="block text-2xl sm:text-3xl lg:text-4xl font-black text-[#D4AF37] tracking-tight mt-1">{sortedLogs.length}</span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                    <span className="block text-[8px] sm:text-[9.5px] font-black text-slate-400 uppercase tracking-widest text-center">On Time</span>
                    <span className="block text-2xl sm:text-3xl lg:text-4xl font-black text-emerald-400 tracking-tight mt-1">
                      {sortedLogs.filter(l => l.status === 'ON_TIME').length}
                    </span>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner">
                    <span className="block text-[8px] sm:text-[9.5px] font-black text-slate-400 uppercase tracking-widest text-center">Late</span>
                    <span className="block text-2xl sm:text-3xl lg:text-4xl font-black text-amber-400 tracking-tight mt-1">
                      {sortedLogs.filter(l => l.status === 'LATE').length}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              // ACTIVE SCAN RESULT DISPLAY (OVERHAULED & GIANT ATTENDANCE DETAILS)
              <div className={`relative min-h-[380px] rounded-3xl border backdrop-blur-md shadow-2xl flex items-center p-8 transition-all duration-300 overflow-hidden ${
                scanResult.status === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/40 shadow-emerald-950/20'
                  : scanResult.status === 'warning'
                  ? 'bg-amber-500/15 border-amber-400/40 shadow-amber-950/20'
                  : 'bg-rose-500/15 border-rose-400/40 shadow-rose-950/20'
              }`}>
                {/* Glow ring */}
                <div className={`absolute -inset-1 rounded-3xl border-2 pointer-events-none opacity-45 ${
                  scanResult.status === 'success' ? 'border-emerald-400/45 animate-pulse'
                  : scanResult.status === 'warning' ? 'border-amber-400/45 animate-pulse'
                  : 'border-rose-400/45 animate-pulse'
                }`} />

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 w-full z-10">
                  {/* Big Status Icon */}
                  <div className="shrink-0">
                    {scanResult.status === 'success' ? (
                      <div className="h-28 w-28 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 shadow-xl animate-bounce">
                        <CheckCircle2 className="h-14 w-14" />
                      </div>
                    ) : scanResult.status === 'warning' ? (
                      <div className="h-28 w-28 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-xl animate-pulse">
                        <Clock className="h-14 w-14" />
                      </div>
                    ) : (
                      <div className="h-28 w-28 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shadow-xl animate-shake">
                        <XCircle className="h-14 w-14" />
                      </div>
                    )}
                  </div>

                  {/* Giant Attendance Details */}
                  <div className="flex-1 min-w-0 text-center sm:text-left space-y-3">
                    <span className={`inline-block text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                      scanResult.status === 'success' ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                      : scanResult.status === 'warning' ? 'bg-amber-500/25 text-amber-300 border-amber-500/30'
                      : 'bg-rose-500/25 text-rose-300 border-rose-500/30'
                    }`}>
                      {scanResult.status === 'success' ? '✓ Scan Approved' : scanResult.status === 'warning' ? '⚠ Scan Warning' : '✗ Scan Rejected'}
                    </span>

                    {scanResult.details ? (
                      // Success/Warning details in giant fonts
                      <div className="space-y-2">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight truncate leading-tight select-all">
                          {scanResult.details.name}
                        </h2>
                        <p className="text-base sm:text-lg md:text-xl font-extrabold text-[#D4AF37] uppercase tracking-wide">
                          {scanResult.details.office}
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 pt-4 text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest">
                          <span className="flex items-center gap-2 bg-black/30 border border-white/5 px-3 py-1 rounded-lg">
                            <Clock className="h-4 w-4 text-slate-400" />
                            Time: {scanResult.details.time}
                          </span>
                          <span className="flex items-center gap-2 bg-black/30 border border-white/5 px-3 py-1 rounded-lg">
                            <Users className="h-4 w-4 text-slate-400" />
                            Log type: <strong className={scanResult.details.status === 'LOGOUT' ? 'text-cyan-300' : 'text-emerald-300'}>{scanResult.details.status}</strong>
                          </span>
                        </div>
                      </div>
                    ) : (
                      // Error Message details
                      <div className="space-y-3">
                        <h2 className="text-2xl sm:text-3xl font-black text-rose-300 uppercase tracking-tight animate-shake">
                          Verification Error
                        </h2>
                        <p className="text-sm sm:text-base text-slate-200 font-bold max-w-2xl leading-relaxed">
                          {scanResult.message}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shrinking Countdown Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/10 overflow-hidden rounded-b-3xl">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      scanResult.status === 'success' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                      : scanResult.status === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                      : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                    }`}
                    style={{
                      animation: 'shrinkProgress 4.5s linear forwards'
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ---- CHECKED-IN REGISTRY (GIANT CENTRAL LOG LIST) ---- */}
          <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-3xl flex flex-col p-5 backdrop-blur-md overflow-hidden shadow-2xl relative animate-in slide-in-from-bottom duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#1B6535]/5 rounded-full blur-2xl pointer-events-none" />
            
            {/* List Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">Checked-In Registry Logs</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Real-time attendance record</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black px-2.5 py-0.5 rounded-full">
                {sortedLogs.length} Checked In
              </Badge>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1">
              {sortedLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500 text-xs font-black uppercase tracking-wider italic gap-3 opacity-60">
                  <Users className="h-8 w-8 opacity-30" />
                  No records logged for this session yet
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-2">
                  {sortedLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between gap-3 hover:bg-white/10 transition-all shadow"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-[12px] text-white uppercase truncate leading-tight">{log.userName}</p>
                        <p className="text-[10px] text-[#D4AF37] uppercase truncate mt-1 font-bold">{log.unitName}</p>
                        <p className="text-[9.5px] text-slate-400 mt-2 font-semibold flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-slate-500" />
                          In: {formatTimeSafe(log.scannedAt)}
                          {log.logoutAt && ` • Out: ${formatTimeSafe(log.logoutAt)}`}
                        </p>
                      </div>
                      <Badge className={`shrink-0 ${
                        log.synced === false
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse'
                          : log.status === 'ON_TIME'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : log.status === 'LATE'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      } text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full`}>
                        {log.synced === false ? 'OFFLINE' : log.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ==================== RIGHT COLUMN: SCANNER & CONTROLS ==================== */}
        <section className="w-[300px] shrink-0 border-l border-white/10 bg-black/20 backdrop-blur-2xl flex flex-col p-5 gap-6 overflow-y-auto animate-in slide-in-from-right duration-300">
          
          {/* ---- SMALL COMPACT SCANNER CARD ---- */}
          <div className="flex flex-col gap-2.5 items-center">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest self-start">
              Scan Camera Viewport
            </span>
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl flex items-center justify-center">
              
              {/* Camera Mount Element */}
              <div
                ref={readerBgRef}
                id="reader-bg"
                className="absolute inset-0 w-full h-full"
                style={{ zIndex: 0 }}
              />

              {/* Dynamic Compact Targeting Reticle Overlay */}
              {scannerActive && (() => {
                const hasResult = scanResult.status === 'success' || scanResult.status === 'warning';
                const isError = scanResult.status === 'error';
                
                const colorClass = hasResult 
                  ? 'border-emerald-400 text-emerald-400' 
                  : 'border-rose-500 text-rose-500';

                const sweepBg = hasResult
                  ? 'linear-gradient(to right, transparent, #34d399, #6ee7b7, #34d399, transparent)'
                  : 'linear-gradient(to right, transparent, #f43f5e, #fda4af, #f43f5e, transparent)';

                const sweepShadow = hasResult
                  ? '0 0 8px 2px rgba(52,211,153,0.5)'
                  : '0 0 8px 2px rgba(244,63,94,0.5)';

                const dotColor = hasResult
                  ? 'bg-emerald-400/90 shadow-[0_0_8px_3px_rgba(52,211,153,0.8)]'
                  : 'bg-rose-500/90 shadow-[0_0_8px_3px_rgba(244,63,94,0.8)]';

                return (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div
                      className="relative transition-all duration-300"
                      style={{
                        width: '75%',
                        height: '75%',
                      }}
                    >
                      {/* Corner brackets */}
                      <div className={`absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 rounded-tl-md transition-all duration-300 ${colorClass}`} />
                      <div className={`absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 rounded-tr-md transition-all duration-300 ${colorClass}`} />
                      <div className={`absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 rounded-bl-md transition-all duration-300 ${colorClass}`} />
                      <div className={`absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 rounded-br-md transition-all duration-300 ${colorClass}`} />

                      {/* Sweep line */}
                      <div
                        className="absolute left-2 right-2 transition-all duration-300"
                        style={{
                          height: 2,
                          background: sweepBg,
                          animation: 'scanSweep 2s ease-in-out infinite',
                          top: '50%',
                          boxShadow: sweepShadow,
                        }}
                      />

                      {/* Center crosshair dot */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${dotColor}`} />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Dim vignette to make content readable inside preview card */}
              <div className="absolute inset-0 pointer-events-none bg-slate-950/20 z-0" />
            </div>

            {/* Instruction Labels */}
            <div className="text-center p-2 rounded-xl bg-white/5 border border-white/10 w-full">
              <span className={`text-[8.5px] font-black uppercase tracking-wider ${
                scanResult.status === 'success' || scanResult.status === 'warning'
                  ? 'text-emerald-300'
                  : scanResult.status === 'error'
                  ? 'text-rose-300'
                  : 'text-rose-300/80'
              }`}>
                {scanResult.status === 'success'
                  ? '✓ Logged'
                  : scanResult.status === 'warning'
                  ? '⚠ Logged (Warning)'
                  : scanResult.status === 'error'
                  ? '✗ Rejected'
                  : '⚠ Align QR Code inside Box'}
              </span>
              <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {scanResult.status === 'none' ? 'Hold device steady' : 'Ready for next scan'}
              </p>
            </div>
            
            {/* Compact zoom slider */}
            {scannerActive && supportsZoom && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1 shadow w-full">
                <ZoomOut className="h-3 w-3 text-slate-400 shrink-0 cursor-pointer" onClick={() => handleZoomChange(Math.max(1, zoomLevel - 0.5))} />
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.1}
                  value={zoomLevel}
                  onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                  className="flex-1 h-0.5 accent-emerald-400"
                />
                <ZoomIn className="h-3 w-3 text-slate-400 shrink-0 cursor-pointer" onClick={() => handleZoomChange(Math.min(5, zoomLevel + 0.5))} />
                <span className="text-[8px] font-black text-emerald-400 w-6 text-right shrink-0">{zoomLevel.toFixed(1)}×</span>
              </div>
            )}
          </div>

          {/* ---- ATTENDANCE OTP CARD ---- */}
          {activeActivity && activeCode && (
            <div className="p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-3xl flex flex-col gap-2 shadow-lg relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 rounded-full blur-md pointer-events-none" />
              <div className="flex justify-between items-center pb-1 border-b border-[#D4AF37]/20">
                <span className="text-[8px] font-black text-[#D4AF37] uppercase tracking-widest flex items-center gap-1">
                  <KeyRound className="h-3 w-3" />
                  Attendance Code
                </span>
                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5 text-[#D4AF37]/80 animate-pulse" />
                  Code rolls in {codeSecondsLeft}s
                </span>
              </div>
              
              <div className="flex items-center justify-center gap-2.5 py-1.5">
                {activeCode.split('').map((char, index) => (
                  <div 
                    key={index}
                    className="w-9 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-base font-black text-[#D4AF37] shadow-inner font-mono animate-in zoom-in-50 duration-200"
                  >
                    {char}
                  </div>
                ))}
              </div>
              <p className="text-[7.5px] font-bold text-slate-400 text-center uppercase tracking-wider leading-normal">
                Enter code on RSU App to check in
              </p>
            </div>
          )}

          {/* ---- REGISTRATION QR CODE CARD ---- */}
          <div className="border border-white/15 bg-white/5 p-4 rounded-3xl flex flex-col items-center gap-2.5 shrink-0 shadow">
            <Badge className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[7px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
              <QrCode className="h-2.5 w-2.5 mr-1" />
              No App Installed?
            </Badge>
            <div className="bg-white p-2 rounded-2xl shadow-inner w-[96px] h-[96px] flex items-center justify-center overflow-hidden">
              {registrationQrCodeUrl ? (
                <img
                  src={registrationQrCodeUrl}
                  alt="RSU Attendance App QR"
                  className="w-full h-full object-contain"
                />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-[#1B6535]" />
              )}
            </div>
            <p className="text-[7px] font-bold text-slate-400 text-center leading-normal uppercase">
              Scan to open RSU Attendance Portal
            </p>
          </div>

          {/* Footer brand label */}
          <div className="mt-auto pt-4 border-t border-white/5">
            <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-500 text-center leading-none">
              RSU EOMS &bull; CRAIITech
            </p>
          </div>
        </section>
      </main>

      {/* ================================================================== */}
      {/* NO ACTIVITY LOCKED OVERLAY                                          */}
      {/* ================================================================== */}
      {!paramActivityId && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm text-center p-8 space-y-4">
          <ShieldAlert className="h-16 w-16 text-[#D4AF37] animate-pulse" />
          <h3 className="text-xl font-black uppercase text-white">Scanner Locked</h3>
          <p className="text-sm font-bold text-slate-400 max-w-sm leading-relaxed uppercase">
            No activity session detected. Please select an active session from the Unit Activity manager and click Open Scanner.
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* KIOSK PAUSED OVERLAY — when not fullscreen                         */}
      {/* ================================================================== */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center space-y-6 animate-in fade-in duration-300">
          <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] animate-pulse">
            <Maximize2 className="h-10 w-10 animate-bounce" />
          </div>
          <div className="space-y-2 max-w-md">
            <h3 className="text-2xl font-black uppercase tracking-tight text-white">
              Scanner Terminal Halted
            </h3>
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">
              Fullscreen Mode Inactive
            </p>
            <p className="text-sm font-medium text-slate-300 pt-2 leading-relaxed">
              For security and strict physical lock validation, the visitor/participant QR scanner terminal must operate in fullscreen mode.
            </p>
          </div>
          <div className="pt-2 w-full max-w-xs">
            <Button
              onClick={async () => {
                try {
                  await document.documentElement.requestFullscreen();
                } catch (err) {
                  console.warn('Failed to resume fullscreen:', err);
                }
              }}
              className="w-full h-12 bg-gradient-to-r from-emerald-600 to-[#1B6535] hover:from-emerald-700 hover:to-[#154e29] text-white font-black uppercase tracking-widest shadow-lg shadow-emerald-900/20 active:scale-95 transition-all duration-150 border-none rounded-xl"
            >
              Resume Terminal
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CSS: Scanning animation + html5-qrcode element overrides           */}
      {/* ================================================================== */}
      <style jsx global>{`
        @keyframes scanSweep {
          0%   { transform: translateY(-80px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(80px);  opacity: 0; }
        }
        @keyframes shrinkProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes kenBurnsBackground {
          0% {
            transform: scale(1) translate(0, 0);
          }
          50% {
            transform: scale(1.12) translate(-1%, -1%);
          }
          100% {
            transform: scale(1) translate(0, 0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }

        /* Force the html5-qrcode video to fill the compact container */
        #reader-bg {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
        }
        #reader-bg > div {
          width: 100% !important;
          height: 100% !important;
        }
        #reader-bg video {
          position: absolute !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          z-index: 0 !important;
        }
        /* Hide default html5-qrcode UI elements: button bar, select, canvas overlay */
        #reader-bg #reader-bg__scan_region img,
        #reader-bg #reader-bg__dashboard,
        #reader-bg #reader-bg__header_message,
        #reader-bg button,
        #reader-bg select,
        #reader-bg__dashboard_section_swaplink {
          display: none !important;
        }
        /* Hide the library's built-in green qr box border (we draw our own) */
        #reader-bg canvas {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

export default function UnitActivityScannerPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Loading Terminal...</p>
        </div>
      </div>
    }>
      <UnitActivityScannerTerminal />
    </Suspense>
  );
}
