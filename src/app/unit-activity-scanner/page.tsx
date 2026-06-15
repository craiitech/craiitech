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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Camera, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  ShieldAlert,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft
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

  const startScanning = () => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;
    if (!paramActivityId) return;

    setScannerActive(true);
    setScanResult({ status: 'none', message: 'Initializing camera stream...' });

    setTimeout(() => {
      try {
        const scanner = new (window as any).Html5Qrcode("reader-container");

        scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1.0
          },
          (decodedText: string) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage: string) => {
            // standard polling camera logs can be ignored
          }
        ).then(() => {
          html5QrCodeScannerRef.current = scanner;
        }).catch((err: any) => {
          console.error("Camera Start Error:", err);
          setScanResult({ status: 'error', message: `Camera access failed: ${err.message || err}. Please ensure camera permission is granted and you are using a secure connection (HTTPS).` });
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

      // Validate QR rotation expiration (60s grace + 10s buffer)
      if (Date.now() - timestamp > 70000) {
        setScanResult({ status: 'error', message: 'Rejected: Expired QR token. Use the rotating code from the active phone app.' });
        return;
      }

      // Verify strict Device Binding Lock in Firestore
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

  // Manage scanner camera lifecycle automatically based on fullscreen state
  useEffect(() => {
    if (isFullscreen && isScannerLibLoaded && paramActivityId) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isFullscreen, isScannerLibLoaded, paramActivityId, activeActivity]);

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
    ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(registrationUrl)}`
    : '';

  return (
    <div className="relative min-h-screen w-full bg-[#0d2a18] bg-radial-gradient flex flex-col justify-between overflow-y-auto xl:overflow-hidden p-4 md:p-6 lg:p-8 text-white font-sans">
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-[#1B6535]/25 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-[#D4AF37]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header/Action Bar */}
      <div className="w-full flex flex-col md:flex-row justify-between items-center z-10 gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src="/rsulogo.png" alt="RSU Logo" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#D4AF37] animate-pulse" />
              RSU Attendance Terminal
            </h1>
            <p className="text-[9px] font-black text-[#D4AF37] tracking-widest uppercase mt-0.5">
              Secure QR scanner portal
            </p>
          </div>
        </div>

        {/* Time & Date Widget */}
        {currentTime && (
          <div className="bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl px-5 py-2 shadow-xl flex items-center justify-between gap-4 max-w-md">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4.5 w-4.5 text-[#D4AF37] shrink-0" />
              <div>
                <p className="text-[7.5px] font-black uppercase tracking-widest text-[#D4AF37]/80 leading-none">Time</p>
                <p className="text-sm font-black text-white tabular-nums mt-1 leading-none">
                  {format(currentTime, 'hh:mm:ss a')}
                </p>
              </div>
            </div>
            <div className="h-6 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-2.5">
              <Calendar className="h-4.5 w-4.5 text-[#D4AF37] shrink-0" />
              <div>
                <p className="text-[7.5px] font-black uppercase tracking-widest text-[#D4AF37]/80 leading-none">Date</p>
                <p className="text-xs font-black text-white mt-1 leading-none">
                  {format(currentTime, 'EEEE, MMM dd')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-[#D4AF37]/20 shadow-lg active:scale-95"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#1B6535]/30 border border-[#D4AF37]/25 px-4 py-1.5 rounded-full shadow-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-white/85 uppercase tracking-widest">Active Terminal</span>
          </div>

          <button 
            onClick={handleExitTerminal}
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-350 transition-all bg-rose-500/10 hover:bg-rose-500/20 px-4 py-2 rounded-full border border-rose-500/30 shadow-lg"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Exit Terminal
          </button>
        </div>
      </div>

      {/* Main Two-Column View */}
      <div className="flex-1 flex flex-col xl:flex-row items-stretch justify-center gap-6 xl:gap-8 max-w-7xl w-full mx-auto my-2 z-10 xl:h-[calc(100vh-140px)] min-h-[500px]">
        
        {/* Left Column: Live camera scan section & registration QR */}
        <div className="w-full xl:w-[48%] flex flex-col justify-between space-y-6">
          
          {/* Top: Scanner Camera Viewport */}
          <Card className="bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden flex flex-col flex-1 min-h-[340px]">
            <CardHeader className="border-b border-white/10 py-3 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-200 tracking-wider">Attendance Scanner</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Activity: <span className="font-extrabold text-emerald-400">{activeActivity ? activeActivity.name : "None selected"}</span>
                </CardDescription>
              </div>
              {activeActivity && (
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8.5px] uppercase font-black px-2.5 py-0.5 rounded-full">
                  Unit: {activeActivityUnit}
                </Badge>
              )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col items-center justify-center p-5 relative">
              {!paramActivityId ? (
                <div className="text-center max-w-sm space-y-3 p-6">
                  <ShieldAlert className="h-12 w-12 text-[#D4AF37] animate-pulse mx-auto" />
                  <h3 className="text-sm font-black uppercase text-slate-200">Scanner Locked</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase leading-normal">
                    No specific activity session detected. Please select an active session from the main manager page to launch the scanner.
                  </p>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-full max-w-[280px] aspect-square bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-emerald-500/30 relative flex items-center justify-center">
                    <div id="reader-container" className="w-full h-full" />
                    {!scannerActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 p-4 text-center">
                        <Loader2 className="h-8 w-8 text-[#D4AF37] animate-spin mb-2" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]">Initializing Camera...</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-md">
                    {scanResult.status === 'none' ? (
                      <div className="text-center py-2.5 opacity-60">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {scanResult.message}
                        </p>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        scanResult.status === 'success' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' 
                          : scanResult.status === 'warning' 
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                          : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                      }`}>
                        <div className="shrink-0 mt-0.5">
                          {scanResult.status === 'success' ? (
                            <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                              <CheckCircle2 className="h-5 w-5" />
                            </div>
                          ) : scanResult.status === 'warning' ? (
                            <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                              <Clock className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
                              <XCircle className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[11px] font-black uppercase tracking-wider">
                            {scanResult.status === 'success' ? 'Scan Approved' : scanResult.status === 'warning' ? 'Scan Logged (Warning)' : 'Scan Rejected'}
                          </h4>
                          <p className="text-xs font-bold leading-normal mt-0.5 mb-2">
                            {scanResult.message}
                          </p>
                          
                          {scanResult.details && (
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-black/20 p-2.5 rounded-xl border border-white/5 font-semibold text-slate-300">
                              <div className="col-span-2 border-b border-white/5 pb-1 uppercase font-black tracking-wide text-white">
                                Attendee Profile
                              </div>
                              <div className="truncate">
                                <span className="text-[8.5px] font-black uppercase text-slate-400 block leading-none mb-0.5">Name:</span>
                                <span className="uppercase text-white truncate block">{scanResult.details.name}</span>
                              </div>
                              <div className="truncate">
                                <span className="text-[8.5px] font-black uppercase text-slate-400 block leading-none mb-0.5">Office:</span>
                                <span className="uppercase text-white truncate block">{scanResult.details.office}</span>
                              </div>
                              <div>
                                <span className="text-[8.5px] font-black uppercase text-slate-400 block leading-none mb-0.5">Time Logged:</span>
                                <span>{scanResult.details.time}</span>
                              </div>
                              <div>
                                <span className="text-[8.5px] font-black uppercase text-slate-400 block leading-none mb-0.5">Status:</span>
                                <span className={`${
                                  scanResult.details.status === 'ON TIME' 
                                    ? 'text-emerald-400' 
                                    : scanResult.details.status === 'LATE'
                                    ? 'text-amber-400'
                                    : 'text-rose-400'
                                } font-black uppercase`}>{scanResult.details.status}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bottom: RSU Attendance App Download QR */}
          <Card className="bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden shrink-0">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-2xl border border-white/10 shadow-inner shrink-0 w-[110px] h-[110px] flex items-center justify-center">
                {registrationQrCodeUrl ? (
                  <img
                    src={registrationQrCodeUrl}
                    alt="RSU Attendance App Sign Up QR"
                    className="w-[90px] h-[90px] object-contain"
                  />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-[#1B6535]" />
                )}
              </div>
              <div className="space-y-1 text-left flex-1 min-w-0">
                <Badge className="bg-[#D4AF37]/10 hover:bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-[8.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full mb-1">
                  First-Time Attendance
                </Badge>
                <h3 className="text-xs font-black uppercase tracking-wide text-white">No Attendance App Yet?</h3>
                <p className="text-[9.5px] text-slate-300 font-medium leading-relaxed">
                  Scan this QR code with your phone to access the **RSU Attendance App** portal. Register your name, office, and lock your device fingerprint to enable attendance scanning.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: List of Checked-In Participants */}
        <div className="w-full xl:w-[52%] flex flex-col">
          <Card className="bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl rounded-3xl overflow-hidden flex flex-col flex-1">
            <CardHeader className="border-b border-white/10 py-3 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-200 tracking-wider">Checked-In Registry</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Real-time verification logs
                </CardDescription>
              </div>
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-black tracking-widest px-3 py-1 rounded-full">
                Total: {sortedLogs.length} Checked In
              </Badge>
            </CardHeader>
            
            <CardContent className="p-0 flex-1 overflow-y-auto min-h-0">
              <Table>
                <TableHeader className="bg-white/[0.02] border-b border-white/5 shrink-0">
                  <TableRow className="border-b border-white/5 hover:bg-transparent">
                    <TableHead className="font-black text-[9px] uppercase pl-4 text-slate-400">Name</TableHead>
                    <TableHead className="font-black text-[9px] uppercase text-slate-400">Office / Unit</TableHead>
                    <TableHead className="font-black text-[9px] uppercase text-slate-400">Details</TableHead>
                    <TableHead className="font-black text-[9px] uppercase text-right pr-4 text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLogs.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-24 text-slate-400 font-bold uppercase italic text-[11px]">
                        No records checked in yet for this session.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLogs.map((log) => (
                      <TableRow key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <TableCell className="pl-4 py-3 font-extrabold text-xs text-white uppercase">
                          {log.userName}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-300 uppercase">
                          {log.unitName}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                            <span className="font-bold text-slate-300">{log.scannedAt?.toDate ? format(log.scannedAt.toDate(), 'hh:mm a') : 'N/A'}</span>
                            <span className="text-[9px]">{log.sex} &bull; {log.contactNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-4 py-3">
                          <Badge className={`${
                            log.status === 'ON_TIME' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : log.status === 'LATE'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          } text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full`}>
                            {log.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer info line */}
      <div className="w-full text-center z-10 border-t border-white/5 pt-3 mt-4 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
          Romblon State University &bull; EOMS QR Scanner Kiosk Console
        </p>
      </div>

      {/* CSS Radial Gradient overlay */}
      <style jsx global>{`
        .bg-radial-gradient {
          background-image: radial-gradient(circle at center, #0e301b 0%, #08170e 100%);
        }
        #reader-container video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }
      `}</style>

      {/* Kiosk Mode Paused Overlay */}
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
