'use client';

import { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { useFirestore, useCollection, useDoc, useMemoFirebase, useGetCollection } from '@/firebase';
import { collection, doc, getDoc, setDoc, getDocs, query, where, serverTimestamp, runTransaction, limit, updateDoc } from '@/firebase/firestore-wrapper';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getApp } from 'firebase/app';
import type { Campus, Unit, DeviceBinding, AttendanceActivity, ActivityAttendanceLog } from '@/lib/types';
import { generatePayloadSignature, generateActivityCode, signOfflineLog, verifyOfflineLog } from '@/lib/unit-activity-crypto';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Fingerprint, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  Loader2, 
  Building2, 
  User, 
  RefreshCw,
  Phone,
  Smartphone,
  ShieldCheck,
  KeyRound,
  Calendar,
  Download,
  GraduationCap,
  Users,
  LogIn,
  UserPlus,
  ExternalLink,
  Briefcase
} from 'lucide-react';

export default function RsuAttendanceApp() {
  const firestore = useFirestore();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true ||
                               document.referrer.includes('android-app://') ||
                               window.navigator.userAgent.includes('wv') ||
                               window.navigator.userAgent.includes('WebView');
      setIsStandalone(isStandaloneMode);
    }
  }, []);

  // Load campuses and units for registration form (static data, fetched once)
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useGetCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useGetCollection<Unit>(unitsQuery);

  // Client device details
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Binding and registration state
  const [binding, setBinding] = useState<DeviceBinding | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Registration Form state
  const [role, setRole] = useState<'employee' | 'student' | 'stakeholder' | null>(null);
  const [fullName, setFullName] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [sex, setSex] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // Employee login/account state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(true);

  // QR display state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [qrPayload, setQrPayload] = useState<string>('');

  // OTP states
  const [paramActivityId, setParamActivityId] = useState<string | null>(null);
  const [chosenActivityId, setChosenActivityId] = useState('');
  const [activeTab, setActiveTab] = useState<'qr' | 'code'>('qr');
  const [otpCode, setOtpCode] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  // Read URL query parameter for activityId on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const actId = searchParams.get('activityId');
      if (actId) {
        setParamActivityId(actId);
      }
    }
  }, []);

  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !binding) return null;
    return query(
      collection(firestore, 'unitActivities'),
      where('status', 'in', ['ACTIVE', 'UPCOMING']),
      where('unitId', '==', binding.unitId),
      limit(20)
    );
  }, [firestore, binding]);
  const { data: activeActivities } = useGetCollection<AttendanceActivity>(activitiesQuery);

  // Fetch specific selected activity document
  const selectedActivityRef = useMemoFirebase(() => {
    const actId = paramActivityId || chosenActivityId;
    if (!firestore || !actId) return null;
    return doc(firestore, 'unitActivities', actId);
  }, [firestore, paramActivityId, chosenActivityId]);
  const { data: selectedActivity } = useDoc<AttendanceActivity>(selectedActivityRef);

  const [offlineLogs, setOfflineLogs] = useState<ActivityAttendanceLog[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('rsu_attendance_offline_logs');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            (async () => {
              const valid = [];
              for (const log of parsed) {
                const sig = log._sig;
                if (!sig) continue;
                const logData = { ...log };
                delete logData._sig;
                const ok = await verifyOfflineLog(logData, sig);
                if (ok) valid.push(log);
              }
              if (valid.length !== parsed.length) {
                localStorage.setItem('rsu_attendance_offline_logs', JSON.stringify(valid));
              }
              setOfflineLogs(valid);
            })();
          }
        } catch (e) {
          console.error("Failed to parse offline logs:", e);
        }
      }
    }
  }, []);

  const saveOfflineLogsSigned = async (logs: ActivityAttendanceLog[]) => {
    const signed = await Promise.all(logs.map(async (log) => {
      const { _sig, ...logData } = log as any;
      const sig = await signOfflineLog(logData);
      return { ...logData, _sig: sig, synced: log.synced };
    }));
    localStorage.setItem('rsu_attendance_offline_logs', JSON.stringify(signed));
  };

  // Background Sync loop for bindings and logs
  useEffect(() => {
    if (!firestore) return;

    const interval = setInterval(async () => {
      // 1. Sync binding if unsynced
      if (typeof window !== 'undefined') {
        const storedLocalBinding = localStorage.getItem('rsu_attendance_local_binding');
        if (storedLocalBinding) {
          try {
            const parsed = JSON.parse(storedLocalBinding);
            if (!parsed.synced && parsed.id) {
              const bindingRef = doc(firestore, 'attendanceDeviceBindings', parsed.id);
              const bindingToUpload = { ...parsed };
              delete bindingToUpload.synced;
              if (bindingToUpload.boundAt) {
                bindingToUpload.boundAt = new Date(bindingToUpload.boundAt);
              }
              await setDoc(bindingRef, bindingToUpload);
              parsed.synced = true;
              localStorage.setItem('rsu_attendance_local_binding', JSON.stringify(parsed));
              console.log("Device binding synced online successfully.");
            }
          } catch (err: any) {
            console.warn("Failed to sync local device binding:", err.message);
          }
        }
      }

      // 2. Sync offline logs if any
      if (offlineLogs.length > 0) {
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
          await saveOfflineLogsSigned(remainingLogs);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [firestore, offlineLogs]);

  // 1. Calculate device fingerprint (canvas hashing)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setUserAgent(window.navigator.userAgent);

    const getFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return `UA-${window.navigator.userAgent.length}-${window.screen.width}`;
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("RSU_Attendance_Lock_1.0", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("RSU_Attendance_Lock_1.0", 4, 17);
      const dataUrl = canvas.toDataURL();

      let hash = 0;
      for (let i = 0; i < dataUrl.length; i++) {
        const char = dataUrl.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const screenDetails = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
      return `RSU-FP-${Math.abs(hash)}-${screenDetails}`;
    };

    const fp = getFingerprint();
    setDeviceFingerprint(fp);
  }, []);

  // 2. Query DB to check if this device is bound
  useEffect(() => {
    const checkBinding = async () => {
      if (!firestore || !deviceFingerprint) return;

      try {
        const docRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as DeviceBinding;
          setBinding(data);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rsu_attendance_local_binding', JSON.stringify({ ...data, synced: true }));
          }
          setIsLocked(true);
        } else {
          // Check local binding fallback
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('rsu_attendance_local_binding');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.id === deviceFingerprint) {
                setBinding(parsed);
                setIsLocked(true);
              } else {
                setBinding(null);
                setIsLocked(false);
              }
            } else {
              setBinding(null);
              setIsLocked(false);
            }
          } else {
            setBinding(null);
            setIsLocked(false);
          }
        }
      } catch (err) {
        console.error("Error checking device binding:", err);
        // Fallback to local storage on error
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('rsu_attendance_local_binding');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.id === deviceFingerprint) {
              setBinding(parsed);
              setIsLocked(true);
            }
          }
        }
      } finally {
        setIsInitializing(false);
      }
    };

    checkBinding();
  }, [firestore, deviceFingerprint]);

  // 3. Firebase Auth listener for employee login
  useEffect(() => {
    try {
      const app = getApp();
      const auth = getAuth(app);
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        setFirebaseUser(user);
        if (user && role === 'employee' && !fullName) {
          setFullName(user.displayName || user.email?.split('@')[0] || '');
          setAuthEmail(user.email || '');
        }
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase Auth not available:', e);
    }
  }, [role]);

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const app = getApp();
      const auth = getAuth(app);
      await signInWithEmailAndPassword(auth, authEmail, authPassword);
      setIsAuthLoading(false);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed.');
      setIsAuthLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);
    try {
      const app = getApp();
      const auth = getAuth(app);
      await createUserWithEmailAndPassword(auth, authEmail, authPassword);
      setIsAuthLoading(false);
    } catch (err: any) {
      setAuthError(err.message || 'Account creation failed.');
      setIsAuthLoading(false);
    }
  };

  const handleEmployeeLogout = async () => {
    try {
      const app = getApp();
      const auth = getAuth(app);
      await signOut(auth);
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  const [qrRefreshCounter, setQrRefreshCounter] = useState(0);

  const generateNewQR = async () => {
    if (!binding) return;

    const timestamp = Date.now();
    const signature = await generatePayloadSignature(binding.userId, timestamp, binding.id);

    const payloadObj = {
      u: binding.userId,
      f: binding.id,
      t: timestamp,
      s: signature,
      n: binding.userName,
      o: binding.unitName,
      i: binding.unitId,
      c: binding.contactNumber || '',
      x: binding.sex || ''
    };

    const payloadString = JSON.stringify(payloadObj);
    setQrPayload(payloadString);
    try {
      const qrDataUrl = await QRCode.toDataURL(payloadString, { margin: 1, width: 400 });
      setQrCodeUrl(qrDataUrl);
    } catch (err) {
      console.error('Failed to generate local QR code, falling back to API:', err);
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=L&data=${encodeURIComponent(payloadString)}`;
      setQrCodeUrl(qrUrl);
    }
    setTimeLeft(60);
  };

  useEffect(() => {
    if (!isLocked || !binding) return;
    generateNewQR();
  }, [isLocked, binding, qrRefreshCounter]);

  useEffect(() => {
    if (!isLocked || !binding) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setQrRefreshCounter(c => c + 1);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, binding]);

  // 5. Handle registration & strict device binding check
  const handleRegisterDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!firestore || !deviceFingerprint) return;
    if (!fullName.trim() || !selectedCampusId || !selectedUnitId || !contactNumber.trim() || !sex) {
      setRegError('Please complete all form fields including sex and contact number.');
      return;
    }

    setIsRegistering(true);

    try {
      // Derive a deterministic unique userId based on name and unit to enforce 1-name-per-device rule
      const normalizedName = fullName.trim().toLowerCase().replace(/\s+/g, '_');
      const userId = `${normalizedName}_${selectedUnitId}`;

      let nameAlreadyBound = false;

      try {
        // A. Assert: Make sure this user name is not already bound to a different device fingerprint
        const userBindingsQuery = query(
          collection(firestore, 'attendanceDeviceBindings'),
          where('userId', '==', userId)
        );
        const userBindingsSnap = await getDocs(userBindingsQuery);

        if (!userBindingsSnap.empty) {
          nameAlreadyBound = true;
        }
      } catch (err: any) {
        console.warn("Could not check user binding online (quota/network issue):", err);
        // Fallback: check local storage binding if any
        if (typeof window !== 'undefined') {
          const storedLocalBinding = localStorage.getItem('rsu_attendance_local_binding');
          if (storedLocalBinding) {
            const parsed = JSON.parse(storedLocalBinding);
            if (parsed.userId === userId && parsed.id !== deviceFingerprint) {
              nameAlreadyBound = true;
            }
          }
        }
      }

      if (nameAlreadyBound) {
        setRegError('This name is already registered to another device. RSU policy enforces 1 account per device.');
        setIsRegistering(false);
        return;
      }

      // B. Fetch unit name for metadata
      const unitName = units?.find(u => u.id === selectedUnitId)?.name || 'Office';

      // C. Construct device binding lock
      const newBinding: DeviceBinding = {
        id: deviceFingerprint,
        userId,
        userName: fullName.trim(),
        unitId: selectedUnitId,
        unitName,
        boundAt: new Date(),
        userAgent,
        contactNumber: contactNumber.trim(),
        sex,
        role: role || 'stakeholder'
      };

      let isBoundOnline = false;
      try {
        const docRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
        await setDoc(docRef, newBinding);
        isBoundOnline = true;
      } catch (err: any) {
        console.warn("Saving device binding lock online failed (quota/network issue), saving locally:", err);
      }

      // Save binding locally
      if (typeof window !== 'undefined') {
        localStorage.setItem('rsu_attendance_local_binding', JSON.stringify({
          ...newBinding,
          synced: isBoundOnline
        }));
      }
      
      setBinding(newBinding);
      setIsLocked(true);
    } catch (err: any) {
      console.error("Error locking device:", err);
      setRegError('Registration failed. Please contact your system administrator.');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess(null);

    const actId = paramActivityId || chosenActivityId;
    if (!firestore || !binding || !actId) {
      setOtpError('Missing device binding or selected activity.');
      return;
    }

    const trimmedOtp = otpCode.trim();
    if (trimmedOtp.length !== 3) {
      setOtpError('Please enter a valid 3-digit code.');
      return;
    }

    // 1. Math-based rolling code verification (client-side matching)
    const nowMs = Date.now();
    const [codeCurrent, codePrev, codeNext] = await Promise.all([
      generateActivityCode(actId, nowMs),
      generateActivityCode(actId, nowMs - 60000),
      generateActivityCode(actId, nowMs + 60000)
    ]);

    if (trimmedOtp !== codeCurrent && trimmedOtp !== codePrev && trimmedOtp !== codeNext) {
      setOtpError('Invalid code. The code may have already rolled or is incorrect.');
      return;
    }

    setIsSubmittingOtp(true);

    try {
      const actRef = doc(firestore, 'unitActivities', actId);
      let sessionDetails: any = null;
      let activityData: AttendanceActivity | null = null;
      let isOnlineSuccess = false;
      let transactionResult: any = null;

      try {
        transactionResult = await runTransaction(firestore, async (transaction) => {
          // 1. Read activity document for metadata/session info
          const actSnap = await transaction.get(actRef);
          if (!actSnap.exists()) {
            throw new Error('Activity does not exist or has been deleted.');
          }

          const actData = actSnap.data() as AttendanceActivity;
          if (actData.status !== 'ACTIVE') {
            throw new Error('This activity is not currently active for attendance.');
          }
          activityData = actData;

          // 2. Resolve active session
          const sessionId = actData.activeSessionId || 'default';
          
          // Find session configuration
          let sDetails = actData.sessions?.find(s => s.id === sessionId);
          if (!sDetails && sessionId === 'default') {
            const defaultDate = actData.startDateTime?.toDate 
              ? format(actData.startDateTime.toDate(), 'yyyy-MM-dd') 
              : format(new Date(), 'yyyy-MM-dd');
            const defaultStart = actData.startDateTime?.toDate 
              ? format(actData.startDateTime.toDate(), 'HH:mm') 
              : '08:00';
            const defaultEnd = actData.endDateTime?.toDate 
              ? format(actData.endDateTime.toDate(), 'HH:mm') 
              : '17:00';
            sDetails = {
              id: 'default',
              label: 'Default Session',
              date: defaultDate,
              sessionType: 'custom',
              startTime: defaultStart,
              endTime: defaultEnd,
              requiresLogout: actData.requiresLogout ?? false
            };
          }

          if (!sDetails) {
            throw new Error('The selected session configuration is invalid.');
          }
          sessionDetails = sDetails;

          // 3. Check if log already exists
          const logId = `${actId}_${sessionId}_${binding.userId}`;
          const logRef = doc(firestore, 'unitActivityAttendanceLogs', logId);
          const logSnap = await transaction.get(logRef);

          const requiresLogout = sessionDetails.requiresLogout;
          const now = new Date();

          if (logSnap.exists()) {
            const logData = logSnap.data() as ActivityAttendanceLog;
            if (requiresLogout && !logData.logoutAt) {
              // Update log document with logout timestamp
              transaction.update(logRef, { logoutAt: now });

              return { 
                type: 'logout', 
                message: `Logout recorded successfully for ${sessionDetails.label}.` 
              };
            } else {
              throw new Error(`You have already completed attendance (login/logout) for ${sessionDetails.label}.`);
            }
          } else {
            // Calculate lateness status
            const scanTime = now.getTime();
            
            const parseTime = (dateStr: string, timeStr: string) => {
              const d = new Date(`${dateStr}T${timeStr}:00`);
              return isNaN(d.getTime()) ? Date.now() : d.getTime();
            };

            const actStart = parseTime(sessionDetails.date, sessionDetails.startTime);
            const actEnd = parseTime(sessionDetails.date, sessionDetails.endTime);
            const lateThreshold = Number(actData.lateThresholdMinutes || 0);

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

            // Create new log document
            const newLog: ActivityAttendanceLog = {
              id: logId,
              activityId: actId,
              userId: binding.userId,
              userName: binding.userName,
              unitId: binding.unitId,
              unitName: binding.unitName,
              deviceFingerprint: binding.id,
              scannedAt: now,
              status: logStatus,
              contactNumber: binding.contactNumber || 'N/A',
              sex: binding.sex || 'Did not specify',
              sessionId,
              sessionLabel: sessionDetails.label
            };

            transaction.set(logRef, newLog);

            return { 
              type: 'login', 
              message: logStatus === 'ON_TIME' 
                ? `Check-in recorded on time for ${sessionDetails.label}.` 
                : logStatus === 'LATE'
                ? `Lateness recorded for ${sessionDetails.label}.`
                : `Check-in recorded outside window for ${sessionDetails.label}.` 
            };
          }
        });
        isOnlineSuccess = true;
      } catch (err: any) {
        if (err.message && (err.message.includes("already completed") || err.message.includes("does not exist") || err.message.includes("not currently active"))) {
          throw err;
        }
        console.warn("Online transaction write failed (quota/network issue), falling back to offline check-in:", err);
      }

      if (isOnlineSuccess && transactionResult) {
        setOtpSuccess(transactionResult.message);
        setOtpCode('');
        return;
      }

      // OFFLINE FALLBACK FLOW:
      const actData = selectedActivity || activityData;
      if (!actData) {
        throw new Error('Could not retrieve activity details. Please try again when online.');
      }

      const sessionId = actData.activeSessionId || 'default';
      let sDetails = actData.sessions?.find(s => s.id === sessionId);
      if (!sDetails && sessionId === 'default') {
        const defaultDate = actData.startDateTime?.toDate 
          ? format(actData.startDateTime.toDate(), 'yyyy-MM-dd') 
          : format(new Date(), 'yyyy-MM-dd');
        const defaultStart = actData.startDateTime?.toDate 
          ? format(actData.startDateTime.toDate(), 'HH:mm') 
          : '08:00';
        const defaultEnd = actData.endDateTime?.toDate 
          ? format(actData.endDateTime.toDate(), 'HH:mm') 
          : '17:00';
        sDetails = {
          id: 'default',
          label: 'Default Session',
          date: defaultDate,
          sessionType: 'custom',
          startTime: defaultStart,
          endTime: defaultEnd,
          requiresLogout: actData.requiresLogout ?? false
        };
      }

      if (!sDetails) {
        throw new Error('Invalid session configuration.');
      }

      const logId = `${actId}_${sessionId}_${binding.userId}`;
      const requiresLogout = sDetails.requiresLogout;
      const now = new Date();

      const existingOfflineLog = offlineLogs.find(l => l.id === logId);
      if (existingOfflineLog) {
        if (requiresLogout && !existingOfflineLog.logoutAt) {
          const updatedLogs = offlineLogs.map(l => {
            if (l.id === logId) {
              return { ...l, logoutAt: now, synced: false };
            }
            return l;
          });
          setOfflineLogs(updatedLogs);
          await saveOfflineLogsSigned(updatedLogs);
          setOtpSuccess(`Logout recorded offline successfully for ${sDetails.label}. It will sync automatically.`);
          setOtpCode('');
          return;
        } else {
          throw new Error(`You have already completed attendance (login/logout) for ${sDetails.label} (offline).`);
        }
      }

      const parseTime = (dateStr: string, timeStr: string) => {
        const d = new Date(`${dateStr}T${timeStr}:00`);
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
      };

      const actStart = parseTime(sDetails.date, sDetails.startTime);
      const actEnd = parseTime(sDetails.date, sDetails.endTime);
      const lateThreshold = Number(actData.lateThresholdMinutes || 0);

      let logStatus: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' = 'ON_TIME';
      if (lateThreshold === 0) {
        logStatus = now.getTime() <= actEnd ? 'ON_TIME' : 'OUTSIDE_WINDOW';
      } else {
        const lateCutoff = actStart + (lateThreshold * 60000);
        if (now.getTime() < actStart || now.getTime() <= lateCutoff) {
          logStatus = 'ON_TIME';
        } else if (now.getTime() <= actEnd) {
          logStatus = 'LATE';
        } else {
          logStatus = 'OUTSIDE_WINDOW';
        }
      }

      const newOfflineLog: ActivityAttendanceLog = {
        id: logId,
        activityId: actId,
        userId: binding.userId,
        userName: binding.userName,
        unitId: binding.unitId,
        unitName: binding.unitName,
        deviceFingerprint: binding.id,
        scannedAt: now,
        status: logStatus,
        contactNumber: binding.contactNumber || 'N/A',
        sex: binding.sex || 'Did not specify',
        sessionId,
        sessionLabel: sDetails.label,
        synced: false
      };

      const updatedLogs = [...offlineLogs, newOfflineLog];
      setOfflineLogs(updatedLogs);
      await saveOfflineLogsSigned(updatedLogs);

      setOtpSuccess(`Check-in (${logStatus.replace('_', ' ')}) recorded offline successfully for ${sDetails.label}. It will sync automatically.`);
      setOtpCode('');

    } catch (err: any) {
      console.error("OTP check-in failed:", err);
      setOtpError(err.message || 'Check-in failed. Please verify the code and try again.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="h-10 w-10 text-[#D4AF37] animate-spin mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Initializing RSU Attendance System...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-between p-4 text-white font-sans max-w-md mx-auto relative overflow-hidden">
      
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-[#D4AF37]/5 blur-[100px] pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="flex items-center gap-3 border-b border-slate-800 pb-4 pt-2">
        <img src="/rsulogo.png" alt="RSU Logo" className="h-10 w-10 object-contain" />
        <div>
          <h1 className="text-sm font-black tracking-tight text-white uppercase">RSU Attendance Portal</h1>
          <p className="text-[9px] font-black text-[#D4AF37] tracking-widest uppercase mt-0.5">Secure mobile credential</p>
        </div>
      </header>

      {/* DOWNLOAD APK BANNER */}
      {!isStandalone && (
        <div className="mt-4 p-3 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-[#D4AF37]" />
            <div>
              <div className="text-[10px] font-black text-white uppercase">Download Android App</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase">For faster, native QR scanning</div>
            </div>
          </div>
          <a
            href="/downloads/rsu-eoms-portal.apk"
            download
            className="h-7 px-3 bg-[#D4AF37] hover:bg-[#c29f32] text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Download APK
          </a>
        </div>
      )}

      {/* MAIN VIEWPORT */}
      <main className="my-auto py-6">
        {isLocked && binding ? (
          /* LOCKED ACTIVE ATTENDANCE CARD */
          <Card className="bg-slate-900/60 border-emerald-500/20 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            
            <CardHeader className="text-center pb-2 pt-6">
              <div className="flex justify-center mb-2">
                <Badge className="bg-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-widest uppercase px-3 py-1 flex items-center gap-1.5 rounded-full">
                  <ShieldCheck className="h-3.5 w-3.5" /> Device Locked Secure
                </Badge>
              </div>
              <CardTitle className="text-base font-black uppercase text-slate-100 truncate max-w-full">
                {binding.userName}
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {binding.unitName}
              </CardDescription>
            </CardHeader>

            {/* Tab Selector */}
            <div className="flex border-b border-slate-800 px-4 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('qr');
                  setOtpError('');
                  setOtpSuccess(null);
                }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'qr'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Show QR Code
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('code');
                  setOtpError('');
                  setOtpSuccess(null);
                }}
                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === 'code'
                    ? 'border-[#D4AF37] text-[#D4AF37]'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                Enter 3-Digit Code
              </button>
            </div>

            <CardContent className="flex flex-col items-center py-5 px-5">
              {activeTab === 'qr' ? (
                <>
                  {/* QR Render wrapper — large, fills most of the phone screen */}
                  <div className="relative mb-5 w-full">
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 blur-xl pointer-events-none" />
                    {/* Pulsing border ring */}
                    <div className="absolute -inset-1 rounded-3xl border-2 border-emerald-400/30 animate-pulse pointer-events-none" />
                    <div className="relative bg-white p-4 rounded-3xl shadow-2xl border-2 border-emerald-500/20 flex items-center justify-center aspect-square w-full">
                      {qrCodeUrl ? (
                        <img
                          src={qrCodeUrl}
                          alt="RSU Encrypted Rotation Token"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-12 w-12 text-[#D4AF37] animate-spin" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Generating QR...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress counter */}
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <span>QR Token Rotation</span>
                      <span className={`font-black text-sm tabular-nums ${timeLeft <= 10 ? 'text-rose-400' : 'text-emerald-400'}`}>{timeLeft}s</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ease-linear rounded-full ${timeLeft <= 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(timeLeft / 60) * 100}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1 w-full">
                      <p className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wide">
                        QR refreshes every 60s
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setQrRefreshCounter(c => c + 1);
                        }}
                        className="h-6 px-2 text-[9px] font-black text-[#D4AF37] hover:text-[#c29f32] hover:bg-slate-800/80 uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Refresh QR
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full space-y-4">
                  {/* Activity selection if not loaded from QR */}
                  {!paramActivityId ? (
                    <div className="w-full space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Select Event to Join</label>
                      <select
                        value={chosenActivityId}
                        onChange={(e) => {
                          setChosenActivityId(e.target.value);
                          setOtpError('');
                          setOtpSuccess(null);
                        }}
                        className="w-full bg-slate-950 border border-slate-800 text-xs font-bold h-10 px-3 rounded-xl text-white focus:outline-none focus:border-[#D4AF37]/50"
                      >
                        <option value="" className="text-slate-500">-- Choose Active Event --</option>
                        {activeActivities && activeActivities.length > 0 ? (
                          activeActivities.map(act => (
                            <option key={act.id} value={act.id} className="bg-slate-900 text-white font-bold">
                              {act.name}
                            </option>
                          ))
                        ) : (
                          <option disabled className="text-slate-500">No active events found</option>
                        )}
                      </select>
                    </div>
                  ) : (
                    selectedActivity && (
                      <div className="w-full p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-[#D4AF37] shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Event Joined</span>
                          <span className="text-[11px] font-black text-white uppercase block truncate">{selectedActivity.name}</span>
                        </div>
                      </div>
                    )
                  )}

                  {otpError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold leading-tight flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  {otpSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold leading-tight flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>{otpSuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleOtpSubmit} className="space-y-4">
                    <div className="flex flex-col items-center gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Enter 3-Digit Code from Screen
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={3}
                        placeholder="•••"
                        value={otpCode}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setOtpCode(val);
                        }}
                        className="w-32 h-14 bg-slate-950/80 border-2 border-slate-800 text-center text-3xl font-black tracking-[0.25em] text-[#D4AF37] rounded-2xl focus:border-[#D4AF37]/50 focus:outline-none placeholder-slate-800 transition-all font-mono"
                        disabled={isSubmittingOtp}
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmittingOtp || (!paramActivityId && !chosenActivityId) || otpCode.length !== 3}
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg transition-all"
                    >
                      {isSubmittingOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving check-in...
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-4 w-4 mr-2" /> Submit Code Check-in
                        </>
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-slate-950/40 p-4 border-t border-slate-800 flex items-center justify-center gap-2">
              <Fingerprint className="h-4.5 w-4.5 text-[#D4AF37]" />
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[280px]">
                DEVICE ID: {binding.id}
              </span>
            </CardFooter>
          </Card>
        ) : !role ? (
          /* ROLE SELECTION SCREEN */
          <Card className="bg-slate-900/60 border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-[#D4AF37]" />
            <CardHeader className="pb-3 pt-6">
              <CardTitle className="text-sm font-black uppercase text-slate-200 tracking-tight flex items-center gap-2">
                <Users className="h-5 w-5 text-[#D4AF37]" /> Who are you?
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 font-medium">
                Select your affiliation with RSU to proceed with device registration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setRole('employee')}
                className="w-full p-4 bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition-all">
                  <Briefcase className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">RSU Employee</p>
                  <p className="text-[9px] text-slate-400 font-medium">Faculty, staff, or administration with RSU account</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('student')}
                className="w-full p-4 bg-slate-950/60 border border-slate-800 hover:border-blue-500/50 rounded-xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-all">
                  <GraduationCap className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">RSU Student</p>
                  <p className="text-[9px] text-slate-400 font-medium">Currently enrolled student</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setRole('stakeholder')}
                className="w-full p-4 bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 rounded-xl flex items-center gap-4 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 group-hover:bg-amber-500/20 transition-all">
                  <Users className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-tight">Other Stakeholder</p>
                  <p className="text-[9px] text-slate-400 font-medium">Visitor, partner, or external participant</p>
                </div>
              </button>
            </CardContent>
            <CardFooter className="pt-2 pb-6">
              <p className="text-[8.5px] text-center text-slate-500 uppercase tracking-wide leading-normal w-full">
                Device binds to this phone permanently. One device per person.
              </p>
            </CardFooter>
          </Card>
        ) : role === 'employee' && !firebaseUser ? (
          /* EMPLOYEE LOGIN / ACCOUNT CREATION */
          <Card className="bg-slate-900/60 border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-sm font-black uppercase text-slate-200 tracking-tight flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-emerald-400" /> RSU Employee Access
                </CardTitle>
                <button
                  type="button"
                  onClick={() => { setRole(null); setAuthEmail(''); setAuthPassword(''); setAuthError(''); }}
                  className="text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-wider underline"
                >
                  Back
                </button>
              </div>
              <CardDescription className="text-[10px] text-slate-400 font-medium">
                Login or create your RSU account to register this device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {/* Tab: Login / Create Account */}
              <div className="flex border-b border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowLogin(true); setAuthError(''); }}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                    showLogin ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <LogIn className="h-3.5 w-3.5 inline-block mr-1.5" /> Login
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLogin(false); setAuthError(''); }}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                    !showLogin ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <UserPlus className="h-3.5 w-3.5 inline-block mr-1.5" /> Create Account
                </button>
              </div>

              {/* Download APK Banner */}
              {!isStandalone && (
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-[#D4AF37]" />
                    <div>
                      <div className="text-[9px] font-black text-white uppercase">RSU Attendance APK</div>
                      <div className="text-[7px] font-bold text-slate-400 uppercase">Install for native experience</div>
                    </div>
                  </div>
                  <a
                    href="/downloads/rsu-eoms-portal.apk"
                    download
                    className="h-7 px-3 bg-[#D4AF37] hover:bg-[#c29f32] text-slate-950 font-black text-[8px] uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                  >
                    <Download className="h-3 w-3" /> APK
                  </a>
                </div>
              )}

              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold leading-tight flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={showLogin ? handleEmployeeLogin : handleCreateAccount} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">RSU Email</label>
                  <Input
                    type="email"
                    placeholder="email@rsu.edu.ph"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs font-bold h-10 text-white rounded-xl focus-visible:ring-offset-0 focus-visible:ring-emerald-500/50"
                    disabled={isAuthLoading}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-xs font-bold h-10 text-white rounded-xl focus-visible:ring-offset-0 focus-visible:ring-emerald-500/50"
                    disabled={isAuthLoading}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isAuthLoading || !authEmail.trim() || !authPassword.trim()}
                  className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg transition-all"
                >
                  {isAuthLoading ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</>
                  ) : showLogin ? (
                    <><LogIn className="h-4 w-4 mr-2" /> Login &amp; Continue</>
                  ) : (
                    <><UserPlus className="h-4 w-4 mr-2" /> Create Account &amp; Continue</>
                  )}
                </Button>
              </form>

              <p className="text-[8px] text-center text-slate-500 uppercase tracking-wide">
                After login, you will register your device for attendance QR code access.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* REGISTRATION / DEVICE BINDING FORM (for student, stakeholder, or logged-in employee) */
          <Card className="bg-slate-900/60 border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-[#D4AF37]" />
            
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center justify-between mb-1">
                <CardTitle className="text-sm font-black uppercase text-slate-200 tracking-tight flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-[#D4AF37]" /> Device Registration
                </CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    if (role === 'employee') { handleEmployeeLogout(); }
                    setRole(null);
                    setFullName('');
                    setSelectedCampusId('');
                    setSelectedUnitId('');
                    setContactNumber('');
                    setSex('');
                    setRegError('');
                  }}
                  className="text-[9px] font-black text-slate-500 hover:text-slate-300 uppercase tracking-wider underline"
                >
                  Back
                </button>
              </div>
              <CardDescription className="text-[10px] text-slate-400 font-medium">
                {role === 'employee'
                  ? 'You are logged in. Register your device to enable attendance QR codes.'
                  : 'Register this phone to generate attendance QR codes.'}
              </CardDescription>
              {role && (
                <Badge className="w-fit mt-1 bg-slate-800 text-[8px] font-black uppercase tracking-widest text-slate-300 border border-slate-700 px-2 py-0.5">
                  {role === 'employee' ? 'RSU Employee' : role === 'student' ? 'RSU Student' : 'Stakeholder'}
                </Badge>
              )}
            </CardHeader>

            <form onSubmit={handleRegisterDevice}>
              <CardContent className="space-y-4 pt-1">
                {regError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10.5px] font-bold leading-tight flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* Device Details Info Box */}
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl flex items-center gap-3">
                  <Fingerprint className="h-6 w-6 text-[#D4AF37]" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Device Fingerprint Locked</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold truncate max-w-[200px]">
                      {deviceFingerprint || "Calculating..."}
                    </span>
                  </div>
                </div>

                {/* Name field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Full Name</label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. Juan Dela Cruz"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs font-bold pl-9 h-10 text-white rounded-xl focus-visible:ring-offset-0 focus-visible:ring-[#D4AF37]/50"
                      disabled={isRegistering}
                    />
                    <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                {/* Campus selector */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Campus Site</label>
                  <Select value={selectedCampusId} onValueChange={setSelectedCampusId} disabled={isRegistering}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold h-10 rounded-xl">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs font-semibold">
                      {campuses?.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Unit selector */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Assigned Office / Unit</label>
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={isRegistering || !selectedCampusId}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold h-10 rounded-xl">
                      <SelectValue placeholder="Select Office" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs font-semibold">
                      {units
                        ?.filter(u => u.campusIds?.includes(selectedCampusId))
                        .map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Number field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Contact Number (Mobile)</label>
                  <div className="relative">
                    <Input
                      placeholder="e.g. 09123456789"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="bg-slate-950 border-slate-800 text-xs font-bold pl-9 h-10 text-white rounded-xl focus-visible:ring-offset-0 focus-visible:ring-[#D4AF37]/50"
                      disabled={isRegistering}
                    />
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                {/* Sex Selector field */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Sex Identification</label>
                  <Select value={sex} onValueChange={setSex} disabled={isRegistering}>
                    <SelectTrigger className="bg-slate-950 border-slate-800 text-xs font-bold h-10 rounded-xl">
                      <SelectValue placeholder="Select Sex" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white text-xs font-semibold">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Others (LGBTQI++)">Others (LGBTQI++)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-6 flex flex-col gap-2">
                <Button 
                  type="submit" 
                  disabled={isRegistering || !deviceFingerprint}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 to-[#D4AF37] hover:from-amber-600 hover:to-[#c29f32] border-none text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-lg transition-all"
                >
                  {isRegistering ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving Binding Lock...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" /> Bind Account To Phone
                    </>
                  )}
                </Button>
                <p className="text-[8.5px] text-center text-slate-500 uppercase tracking-wide leading-normal">
                  ⚠️ Note: Only register your personal phone. Device binds cannot be shared or rewritten without admin approval.
                </p>
              </CardFooter>
            </form>
          </Card>
        )}
      </main>

      {/* FOOTER BRANDS */}
      <footer className="border-t border-slate-800/80 pt-4 pb-2 text-center text-[9px] font-semibold text-slate-500 uppercase tracking-[0.15em] flex flex-col gap-0.5">
        <span>© 2026 Romblon State University</span>
        <span className="text-[#D4AF37]/50 font-black">Digital Attendance Locker &bull; CRAIITech</span>
      </footer>
    </div>
  );
}
