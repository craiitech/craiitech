'use client';

import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useUser, useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  getDoc,
  setDoc,
  query, 
  where
} from 'firebase/firestore';
import type { Unit, AttendanceActivity, DeviceBinding, ActivityAttendanceLog } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  Users
} from 'lucide-react';

function UnitActivityScannerTerminal() {
  const { userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [paramActivityId, setParamActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setParamActivityId(searchParams.get('activityId'));
    }
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Fetch specific activity details
  const activityRef = useMemoFirebase(() => {
    if (!firestore || !paramActivityId) return null;
    return doc(firestore, 'unitActivities', paramActivityId);
  }, [firestore, paramActivityId]);
  const { data: activeActivity, isLoading: isLoadingActivity } = useDoc<AttendanceActivity>(activityRef);

  // Fetch unit list to resolve active activity unit name
  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // Fetch real-time logs for this activity
  const logsQuery = useMemoFirebase(() => {
    if (!firestore || !paramActivityId) return null;
    return query(collection(firestore, 'unitActivityAttendanceLogs'), where('activityId', '==', paramActivityId));
  }, [firestore, paramActivityId]);
  const { data: attendanceLogs } = useCollection<ActivityAttendanceLog>(logsQuery);

  const sortedLogs = useMemo(() => {
    if (!attendanceLogs) return [];
    return [...attendanceLogs].sort((a, b) => {
      const timeA = a.scannedAt?.toDate ? a.scannedAt.toDate().getTime() : (a.scannedAt?.seconds ? a.scannedAt.seconds * 1000 : new Date(a.scannedAt).getTime());
      const timeB = b.scannedAt?.toDate ? b.scannedAt.toDate().getTime() : (b.scannedAt?.seconds ? b.scannedAt.seconds * 1000 : new Date(b.scannedAt).getTime());
      return timeB - timeA;
    });
  }, [attendanceLogs]);

  // --- CAMERA QR SCANNING MODULE (CDN LOADED) ---
  const [isScannerLibLoaded, setIsScannerLibLoaded] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [supportsZoom, setSupportsZoom] = useState(false);
  const [showRegistryPanel, setShowRegistryPanel] = useState(false);
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

  // Load html5-qrcode library from CDN dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).Html5Qrcode) {
      setIsScannerLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => setIsScannerLibLoaded(true);
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

  const startScanning = () => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;
    if (!paramActivityId) return;

    setScannerActive(true);
    setScanResult({ status: 'none', message: 'Initializing camera stream...' });

    setTimeout(() => {
      try {
        const scanner = new (window as any).Html5Qrcode("reader-bg");

        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 280 },
            aspectRatio: window.innerWidth / window.innerHeight,
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
        setScanResult({ status: 'error', message: 'Rejected: Scanned content is not a valid RSU QR payload.' });
        return;
      }

      const { userId, userName, unitId, unitName, deviceFingerprint, contactNumber, sex, timestamp } = payload;

      if (!userId || !userName || !deviceFingerprint || !timestamp) {
        setScanResult({ status: 'error', message: 'Rejected: Missing security properties in QR payload.' });
        return;
      }

      if (Date.now() - timestamp > 70000) {
        setScanResult({ status: 'error', message: 'Rejected: Expired QR token. Use the rotating code from the active phone app.' });
        return;
      }

      const bindingRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
      const bindingSnap = await getDoc(bindingRef);

      if (!bindingSnap.exists()) {
        setScanResult({ status: 'error', message: 'Rejected: Untracked Device Fingerprint. Binding registration required.' });
        return;
      }

      const officialBinding = bindingSnap.data() as DeviceBinding;
      if (officialBinding.userId !== userId) {
        setScanResult({ status: 'error', message: `Security Rejection: Device Lock active. This phone is locked to another user.` });
        return;
      }

      const finalContact = contactNumber || officialBinding.contactNumber || 'N/A';
      const finalSex = sex || officialBinding.sex || 'Did not specify';

      const scanTime = Date.now();
      const actStart = activeActivity.startDateTime.toDate ? activeActivity.startDateTime.toDate().getTime() : new Date(activeActivity.startDateTime).getTime();
      const actEnd = activeActivity.endDateTime.toDate ? activeActivity.endDateTime.toDate().getTime() : new Date(activeActivity.endDateTime).getTime();
      const lateCutoff = actStart + (activeActivity.lateThresholdMinutes * 60000);

      let logStatus: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' = 'ON_TIME';
      if (scanTime < actStart) {
        logStatus = 'ON_TIME';
      } else if (scanTime <= lateCutoff) {
        logStatus = 'ON_TIME';
      } else if (scanTime <= actEnd) {
        logStatus = 'LATE';
      } else {
        logStatus = 'OUTSIDE_WINDOW';
      }

      const logId = `${activeActivity.id}_${userId}`;
      const logRef = doc(firestore, 'unitActivityAttendanceLogs', logId);

      const existingLog = await getDoc(logRef);
      if (existingLog.exists()) {
        setScanResult({
          status: 'warning',
          message: `${userName} has already signed in for this session. Duplicate scan ignored.`,
          details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
        });
        return;
      }

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
        sex: finalSex
      };

      await setDoc(logRef, newLog);

      setScanResult({
        status: logStatus === 'ON_TIME' ? 'success' : 'warning',
        message: logStatus === 'ON_TIME' 
          ? `Verified! Signed on time.` 
          : `Lateness recorded. Threshold was ${activeActivity.lateThresholdMinutes} mins.`,
        details: {
          name: userName,
          office: unitName,
          time: format(new Date(), 'hh:mm a'),
          status: logStatus.replace('_', ' ')
        }
      });

    } catch (err: any) {
      console.error(err);
      setScanResult({ status: 'error', message: `Internal Verification Error: ${err.message}` });
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
    if (isScannerLibLoaded && paramActivityId) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScannerLibLoaded, paramActivityId, activeActivity]);

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
  const registrationUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/attendance-app`
    : '';
  const registrationQrCodeUrl = registrationUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(registrationUrl)}`
    : '';

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black font-sans text-white">

      {/* ================================================================== */}
      {/* FULL-SCREEN CAMERA BACKGROUND                                       */}
      {/* ================================================================== */}
      <div
        id="reader-bg"
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />

      {/* Dark vignette overlay to make text readable over raw camera */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.72) 100%)',
        }}
      />
      {/* Top bar darkening */}
      <div
        className="absolute top-0 left-0 right-0 h-28 pointer-events-none"
        style={{ zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.80) 0%, transparent 100%)' }}
      />
      {/* Bottom bar darkening */}
      <div
        className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none"
        style={{ zIndex: 1, background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 100%)' }}
      />

      {/* ================================================================== */}
      {/* QR TARGETING RETICLE — centered scanning frame with corner borders  */}
      {/* ================================================================== */}
      {scannerActive && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ zIndex: 2 }}
        >
          <div className="relative" style={{ width: 280, height: 280 }}>
            {/* Corner brackets — green scanning frame */}
            {/* Top-left */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
            {/* Top-right */}
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
            {/* Bottom-left */}
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
            {/* Bottom-right */}
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />

            {/* Scanning sweep line */}
            <div
              className="absolute left-2 right-2"
              style={{
                height: 2,
                background: 'linear-gradient(to right, transparent, #34d399, #34d399, transparent)',
                animation: 'scanSweep 2s ease-in-out infinite',
                top: '50%',
              }}
            />

            {/* Center crosshair dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-400/80 shadow-[0_0_8px_2px_rgba(52,211,153,0.7)]" />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TOP HEADER BAR — floats over camera                                 */}
      {/* ================================================================== */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 gap-4"
      >
        {/* Branding */}
        <div className="flex items-center gap-3">
          <img src="/rsulogo.png" alt="RSU Logo" className="h-10 w-10 object-contain drop-shadow-lg" />
          <div>
            <h1 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-1.5 drop-shadow">
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
          <div className="hidden md:flex items-center gap-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 shadow-xl">
            <Clock className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <span className="text-sm font-black text-white tabular-nums">{format(currentTime, 'hh:mm:ss a')}</span>
            <div className="h-4 w-px bg-white/15" />
            <Calendar className="h-4 w-4 text-[#D4AF37] shrink-0" />
            <span className="text-xs font-bold text-white">{format(currentTime, 'EEE, MMM dd')}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-full">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] font-black text-white/85 uppercase tracking-widest">Live</span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/80 hover:text-[#D4AF37] bg-black/40 hover:bg-black/60 backdrop-blur-md px-3 py-2 rounded-full border border-white/10 transition-all"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>

          <button
            onClick={handleExitTerminal}
            className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 backdrop-blur-md px-3 py-2 rounded-full border border-rose-500/30 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Exit
          </button>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BOTTOM LEFT — Zoom controls + Scan result feed                      */}
      {/* ================================================================== */}
      <div
        className="absolute bottom-5 left-5 z-10 flex flex-col gap-3"
        style={{ maxWidth: 340 }}
      >
        {/* Zoom Slider — only shows when camera supports it */}
        {scannerActive && supportsZoom && (
          <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl">
            <button
              onClick={() => handleZoomChange(Math.max(1, zoomLevel - 0.5))}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <input
              type="range"
              min={1}
              max={5}
              step={0.1}
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-emerald-400"
            />
            <button
              onClick={() => handleZoomChange(Math.min(5, zoomLevel + 0.5))}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <span className="text-[9px] font-black text-emerald-400 w-8 text-right">{zoomLevel.toFixed(1)}×</span>
          </div>
        )}

        {/* Scan Result card */}
        {scanResult.status !== 'none' ? (
          <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all ${
            scanResult.status === 'success'
              ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-100'
              : scanResult.status === 'warning'
              ? 'bg-amber-500/20 border-amber-400/40 text-amber-100'
              : 'bg-rose-500/20 border-rose-400/40 text-rose-100'
          }`}>
            <div className="shrink-0 mt-0.5">
              {scanResult.status === 'success' ? (
                <div className="h-8 w-8 rounded-full bg-emerald-500/30 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              ) : scanResult.status === 'warning' ? (
                <div className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center text-amber-300">
                  <Clock className="h-5 w-5" />
                </div>
              ) : (
                <div className="h-8 w-8 rounded-full bg-rose-500/30 flex items-center justify-center text-rose-300">
                  <XCircle className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-wider">
                {scanResult.status === 'success' ? 'Scan Approved' : scanResult.status === 'warning' ? 'Scan Logged (Warning)' : 'Scan Rejected'}
              </h4>
              <p className="text-xs font-bold leading-snug mt-0.5">{scanResult.message}</p>
              {scanResult.details && (
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] bg-black/20 p-2.5 rounded-xl border border-white/5 font-semibold">
                  <div className="col-span-2 border-b border-white/10 pb-1 uppercase font-black tracking-wide text-white text-[8.5px]">Attendee</div>
                  <div>
                    <span className="text-[8px] font-black uppercase opacity-60 block">Name</span>
                    <span className="uppercase truncate block">{scanResult.details.name}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase opacity-60 block">Office</span>
                    <span className="uppercase truncate block">{scanResult.details.office}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase opacity-60 block">Time</span>
                    <span>{scanResult.details.time}</span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black uppercase opacity-60 block">Status</span>
                    <span className={`${
                      scanResult.details.status === 'ON TIME' ? 'text-emerald-300'
                      : scanResult.details.status === 'LATE' ? 'text-amber-300'
                      : 'text-rose-300'
                    } font-black uppercase`}>{scanResult.details.status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : scannerActive ? (
          <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Scanning for QR Code...</p>
          </div>
        ) : null}
      </div>

      {/* ================================================================== */}
      {/* BOTTOM RIGHT — Registration QR + toggle registry button            */}
      {/* ================================================================== */}
      <div className="absolute bottom-5 right-5 z-10 flex flex-col items-end gap-3">

        {/* Attendance Registry toggle */}
        <button
          onClick={() => setShowRegistryPanel(v => !v)}
          className="flex items-center gap-2 bg-black/50 backdrop-blur-md border border-white/10 rounded-full px-4 py-2.5 shadow-xl text-[9px] font-black uppercase tracking-widest text-white hover:bg-black/70 transition-all"
        >
          <Users className="h-3.5 w-3.5 text-emerald-400" />
          {sortedLogs.length} Checked In
        </button>

        {/* Registration QR Card */}
        <div className="bg-black/50 backdrop-blur-md border border-[#D4AF37]/20 rounded-2xl p-3 shadow-2xl flex flex-col items-center gap-2" style={{ maxWidth: 180 }}>
          <Badge className="bg-[#D4AF37]/15 hover:bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[7.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full">
            <QrCode className="h-2.5 w-2.5 mr-1" />
            No App Yet?
          </Badge>
          <div className="bg-white p-2 rounded-xl shadow-inner w-[130px] h-[130px] flex items-center justify-center">
            {registrationQrCodeUrl ? (
              <img
                src={registrationQrCodeUrl}
                alt="RSU Attendance App QR"
                className="w-full h-full object-contain"
              />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-[#1B6535]" />
            )}
          </div>
          <p className="text-[8px] font-bold text-slate-300 text-center leading-tight">
            Scan to open RSU Attendance App & register your phone
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* SLIDE-IN REGISTRY PANEL                                             */}
      {/* ================================================================== */}
      <div
        className={`absolute top-0 right-0 h-full z-20 transition-transform duration-300 ease-in-out ${showRegistryPanel ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: 360 }}
      >
        <div className="h-full bg-black/70 backdrop-blur-xl border-l border-white/10 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-xs font-black uppercase text-slate-200 tracking-wider">Checked-In Registry</h2>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Real-time verification logs</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full">
                {sortedLogs.length}
              </Badge>
              <button
                onClick={() => setShowRegistryPanel(false)}
                className="text-slate-400 hover:text-white transition-colors ml-1 text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Table>
              <TableHeader className="bg-white/[0.02] border-b border-white/5">
                <tr className="border-b border-white/5">
                  <TableHead className="font-black text-[8.5px] uppercase pl-4 text-slate-400 py-2">Name</TableHead>
                  <TableHead className="font-black text-[8.5px] uppercase text-slate-400 py-2">Unit</TableHead>
                  <TableHead className="font-black text-[8.5px] uppercase text-right pr-4 text-slate-400 py-2">Status</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {sortedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="text-center py-16 text-slate-500 font-bold uppercase italic text-[10px]">
                      No records yet.
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="pl-4 py-3">
                        <p className="font-extrabold text-[10px] text-white uppercase">{log.userName}</p>
                        <p className="text-[8.5px] text-slate-400 mt-0.5">{log.scannedAt?.toDate ? format(log.scannedAt.toDate(), 'hh:mm a') : 'N/A'}</p>
                      </td>
                      <td className="text-[10px] font-semibold text-slate-300 uppercase pr-2 py-3">{log.unitName}</td>
                      <td className="text-right pr-4 py-3">
                        <Badge className={`${
                          log.status === 'ON_TIME'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : log.status === 'LATE'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        } text-[7.5px] font-black uppercase px-2 py-0.5 rounded-full`}>
                          {log.status.replace('_', ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-white/5 px-5 py-3 shrink-0">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 text-center">
              RSU EOMS • QR Scanner Kiosk Console
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* NO ACTIVITY LOCKED OVERLAY                                          */}
      {/* ================================================================== */}
      {!paramActivityId && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-center p-8 space-y-4">
          <ShieldAlert className="h-16 w-16 text-[#D4AF37] animate-pulse" />
          <h3 className="text-xl font-black uppercase text-white">Scanner Locked</h3>
          <p className="text-sm font-bold text-slate-400 max-w-sm leading-relaxed uppercase">
            No activity session detected. Please select an active session from the Unit Activity manager and click Open Scanner.
          </p>
        </div>
      )}

      {/* ================================================================== */}
      {/* CSS: Scanning animation + html5-qrcode element overrides           */}
      {/* ================================================================== */}
      <style jsx global>{`
        @keyframes scanSweep {
          0% { transform: translateY(-130px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(130px); opacity: 0; }
        }

        /* Force the html5-qrcode video to fill the full background div */
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
