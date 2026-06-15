'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import type { Campus, Unit, AttendanceActivity, DeviceBinding, ActivityAttendanceLog } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { 
  Calendar, 
  Plus, 
  Camera, 
  Users, 
  Search, 
  FileSpreadsheet, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Loader2,
  Smartphone,
  ShieldAlert,
  Info,
  Maximize2,
  Minimize2,
  Sparkles,
  ArrowLeft,
  Building2,
  Check,
  Pencil,
  StopCircle,
  X
} from 'lucide-react';

export default function UnitActivityPage() {
  const { userProfile, isAdmin, isSupervisor } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const hasAccessToAll = isAdmin || isSupervisor;

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState('activities');

  // DB queries
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // Activities queries - Sort in memory to bypass composite index constraints for non-admin filters
  const activitiesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const base = collection(firestore, 'unitActivities');
    if (hasAccessToAll) {
      return base;
    }
    return query(base, where('unitId', '==', userProfile.unitId));
  }, [firestore, userProfile, hasAccessToAll]);
  const { data: activities, isLoading: isLoadingActivities } = useCollection<AttendanceActivity>(activitiesQuery);

  const sortedActivities = useMemo(() => {
    if (!activities) return [];
    return [...activities].sort((a, b) => {
      const timeA = a.startDateTime?.toDate ? a.startDateTime.toDate().getTime() : (a.startDateTime?.seconds ? a.startDateTime.seconds * 1000 : new Date(a.startDateTime).getTime());
      const timeB = b.startDateTime?.toDate ? b.startDateTime.toDate().getTime() : (b.startDateTime?.seconds ? b.startDateTime.seconds * 1000 : new Date(b.startDateTime).getTime());
      return timeB - timeA;
    });
  }, [activities]);

  // Device bindings query - Sort in memory
  const bindingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'attendanceDeviceBindings');
  }, [firestore, userProfile]);
  const { data: deviceBindings, isLoading: isLoadingBindings } = useCollection<DeviceBinding>(bindingsQuery);

  // --- 1. ACTIVITY CREATION STATE ---
  const [newActivityName, setNewActivityName] = useState('');
  const [newActivityStart, setNewActivityStart] = useState('');
  const [newActivityEnd, setNewActivityEnd] = useState('');
  const [lateThreshold, setLateThreshold] = useState('15');
  const [newRequiresLogout, setNewRequiresLogout] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  // --- EDIT ACTIVITY STATE ---
  const [editingActivity, setEditingActivity] = useState<AttendanceActivity | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editThreshold, setEditThreshold] = useState('');
  const [editRequiresLogout, setEditRequiresLogout] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;
    if (!newActivityName.trim() || !newActivityStart || !newActivityEnd) {
      toast({ title: 'Validation Error', description: 'Please complete all form fields.', variant: 'destructive' });
      return;
    }

    const start = new Date(newActivityStart);
    const end = new Date(newActivityEnd);
    if (end <= start) {
      toast({ title: 'Validation Error', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    setIsCreatingActivity(true);
    try {
      const activityId = `ACT-${Date.now()}`;
      const docRef = doc(firestore, 'unitActivities', activityId);
      const newAct: AttendanceActivity = {
        id: activityId,
        name: newActivityName.trim(),
        startDateTime: start,
        endDateTime: end,
        lateThresholdMinutes: Number(lateThreshold),
        requiresLogout: newRequiresLogout,
        status: 'ACTIVE',
        unitId: userProfile.unitId || 'all',
        campusId: userProfile.campusId || 'all',
        createdAt: new Date(),
        createdBy: userProfile.id
      };

      await setDoc(docRef, newAct);
      toast({ title: 'Activity Created', description: `Successfully created "${newActivityName}"` });
      setNewActivityName('');
      setNewActivityStart('');
      setNewActivityEnd('');
      setNewRequiresLogout(false);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to create activity.', variant: 'destructive' });
    } finally {
      setIsCreatingActivity(false);
    }
  };

  // --- EDIT & END ACTIVITY HANDLERS ---
  const openEditModal = (act: AttendanceActivity) => {
    setEditingActivity(act);
    setEditName(act.name);
    
    // Parse times for datetime-local input (format: yyyy-MM-ddTHH:mm)
    const startVal = act.startDateTime?.toDate 
      ? act.startDateTime.toDate() 
      : (act.startDateTime?.seconds ? new Date(act.startDateTime.seconds * 1000) : new Date(act.startDateTime));
    const endVal = act.endDateTime?.toDate 
      ? act.endDateTime.toDate() 
      : (act.endDateTime?.seconds ? new Date(act.endDateTime.seconds * 1000) : new Date(act.endDateTime));

    setEditStart(format(startVal, "yyyy-MM-dd'T'HH:mm"));
    setEditEnd(format(endVal, "yyyy-MM-dd'T'HH:mm"));
    setEditThreshold(String(act.lateThresholdMinutes || 0));
    setEditRequiresLogout(act.requiresLogout === true);
  };

  const handleEditActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !editingActivity) return;

    if (!editName.trim() || !editStart || !editEnd) {
      toast({ title: 'Validation Error', description: 'Please complete all form fields.', variant: 'destructive' });
      return;
    }

    const start = new Date(editStart);
    const end = new Date(editEnd);
    if (end <= start) {
      toast({ title: 'Validation Error', description: 'End time must be after start time.', variant: 'destructive' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const docRef = doc(firestore, 'unitActivities', editingActivity.id);
      
      const updatedActivity: AttendanceActivity = {
        ...editingActivity,
        name: editName.trim(),
        startDateTime: start,
        endDateTime: end,
        lateThresholdMinutes: Number(editThreshold),
        requiresLogout: editRequiresLogout
      };

      await setDoc(docRef, updatedActivity);
      toast({ title: 'Activity Updated', description: `Successfully updated "${editName}"` });
      setEditingActivity(null);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to update activity.', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEndActivity = async (act: AttendanceActivity) => {
    if (!firestore || !window.confirm(`Are you sure you want to end "${act.name}"? This will disable scanning and mark it as COMPLETED.`)) return;
    try {
      const docRef = doc(firestore, 'unitActivities', act.id);
      
      const updatedActivity: AttendanceActivity = {
        ...act,
        status: 'COMPLETED'
      };

      await setDoc(docRef, updatedActivity);
      toast({ title: 'Activity Ended', description: `Successfully completed "${act.name}"` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to end activity.', variant: 'destructive' });
    }
  };

  // --- 2. ATTENDANCE LOGS CORRELATION ---
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const activeActivity = useMemo(() => {
    return sortedActivities?.find(a => a.id === selectedActivityId) || null;
  }, [sortedActivities, selectedActivityId]);

  const logsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'unitActivityAttendanceLogs');
    if (selectedActivityId === 'all') {
      return base;
    }
    return query(base, where('activityId', '==', selectedActivityId));
  }, [firestore, selectedActivityId]);
  const { data: attendanceLogs } = useCollection<ActivityAttendanceLog>(logsQuery);

  const sortedLogs = useMemo(() => {
    if (!attendanceLogs) return [];
    return [...attendanceLogs].sort((a, b) => {
      const timeA = a.scannedAt?.toDate ? a.scannedAt.toDate().getTime() : (a.scannedAt?.seconds ? a.scannedAt.seconds * 1000 : new Date(a.scannedAt).getTime());
      const timeB = b.scannedAt?.toDate ? b.scannedAt.toDate().getTime() : (b.scannedAt?.seconds ? b.scannedAt.seconds * 1000 : new Date(b.scannedAt).getTime());
      return timeB - timeA;
    });
  }, [attendanceLogs]);

  // --- 3. CAMERA QR SCANNING MODULE (CDN LOADED) ---
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
      // Clean up script if component unmounts
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const startScanning = () => {
    if (!isScannerLibLoaded || !(window as any).Html5Qrcode) return;
    if (selectedActivityId === 'all') {
      toast({
        title: "Scanning Locked",
        description: "Please select a specific active activity to scan against.",
        variant: "destructive"
      });
      return;
    }

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
        setScanResult({ status: 'error', message: `Camera access failed: ${err.message || err}` });
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

  // Turn off scanner if tab changes
  useEffect(() => {
    if (activeTab !== 'scanner') {
      stopScanning();
    }
  }, [activeTab]);

  const handleScanError = (err: any) => {
    // Silent errors: standard polling camera logs can be ignored
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (!firestore || !activeActivity) return;

    try {
      // 1. Parse JSON payload
      let payload: any;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) {
        setScanResult({ status: 'error', message: 'Rejected: Scanned content is not a valid RSU QR payload.' });
        return;
      }

      const { userId, userName, unitId, unitName, deviceFingerprint, contactNumber, sex, timestamp, signature } = payload;

      if (!userId || !userName || !deviceFingerprint || !timestamp) {
        setScanResult({ status: 'error', message: 'Rejected: Missing security properties in QR payload.' });
        return;
      }

      // 2. Validate QR rotation expiration (60s grace + 10s buffer for network differences)
      if (Date.now() - timestamp > 70000) {
        setScanResult({ status: 'error', message: 'Rejected: Expired QR token. Use the rotating code from the active phone app.' });
        return;
      }

      // 3. Verify strict Device Binding Lock in Firestore
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

      // Fallback demographics from database binding if not present in payload
      const finalContact = contactNumber || officialBinding.contactNumber || 'N/A';
      const finalSex = sex || officialBinding.sex || 'Did not specify';

      // 4. Calculate Attendance Status (login)
      const scanTime = Date.now();
      const actStart = activeActivity.startDateTime.toDate ? activeActivity.startDateTime.toDate().getTime() : new Date(activeActivity.startDateTime).getTime();
      const actEnd = activeActivity.endDateTime.toDate ? activeActivity.endDateTime.toDate().getTime() : new Date(activeActivity.endDateTime).getTime();

      let logStatus: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' = 'ON_TIME';
      if (activeActivity.lateThresholdMinutes === 0) {
        // threshold=0 means no late marking — everyone within window is ON_TIME
        logStatus = scanTime <= actEnd ? 'ON_TIME' : 'OUTSIDE_WINDOW';
      } else {
        const lateCutoff = actStart + (activeActivity.lateThresholdMinutes * 60000);
        if (scanTime < actStart || scanTime <= lateCutoff) {
          logStatus = 'ON_TIME';
        } else if (scanTime <= actEnd) {
          logStatus = 'LATE';
        } else {
          logStatus = 'OUTSIDE_WINDOW';
        }
      }

      // 5. Write to Firestore
      const logId = `${activeActivity.id}_${userId}`;
      const logRef = doc(firestore, 'unitActivityAttendanceLogs', logId);

      const existingLog = await getDoc(logRef);
      if (existingLog.exists()) {
        const existingData = existingLog.data() as ActivityAttendanceLog;
        // Login+Logout mode: second scan = logout
        if (activeActivity.requiresLogout && !existingData.logoutAt) {
          await setDoc(logRef, { ...existingData, logoutAt: new Date() });
          setScanResult({
            status: 'success',
            message: `Logout recorded for ${userName}.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'LOGOUT' }
          });
        } else if (activeActivity.requiresLogout && existingData.logoutAt) {
          setScanResult({
            status: 'warning',
            message: `${userName} has already logged in and out. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        } else {
          setScanResult({
            status: 'warning',
            message: `${userName} has already signed in for this session. Duplicate scan ignored.`,
            details: { name: userName, office: unitName, time: format(new Date(), 'hh:mm a'), status: 'DUPLICATE' }
          });
        }
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
          ? `Login verified! Signed in on time.${ activeActivity.requiresLogout ? ' Scan again to logout.' : '' }`
          : logStatus === 'LATE'
          ? `Late login recorded. Threshold was ${activeActivity.lateThresholdMinutes} mins.`
          : `Scan outside activity window — recorded as OUTSIDE WINDOW.`,
        details: {
          name: userName,
          office: unitName,
          time: format(new Date(), 'hh:mm a'),
          status: logStatus === 'ON_TIME' ? 'LOGIN ON TIME' : logStatus === 'LATE' ? 'LOGIN LATE' : 'OUTSIDE WINDOW'
        }
      });

    } catch (err: any) {
      console.error(err);
      setScanResult({ status: 'error', message: `Internal Verification Error: ${err.message}` });
    }
  };

  // --- 4. EXPORT & RESET BINDINGS ACTIONS ---
  const handleResetBinding = async (fingerprint: string, userName: string) => {
    if (!firestore || !window.confirm(`Are you sure you want to reset the device binding lock for ${userName}?`)) return;
    try {
      const docRef = doc(firestore, 'attendanceDeviceBindings', fingerprint);
      await deleteDoc(docRef);
      toast({ title: 'Binding Reset', description: `Device lock for ${userName} cleared.` });
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to reset device binding.', variant: 'destructive' });
    }
  };

  const handleExportCSV = () => {
    if (!sortedLogs || sortedLogs.length === 0) {
      toast({ title: 'No Data', description: 'There are no attendance records to export.', variant: 'destructive' });
      return;
    }

    const activityName = activeActivity?.name || 'All-Sessions';
    const hasLogout = activeActivity?.requiresLogout === true;
    const headers = ['Name', 'Unit/Office', 'Contact Number', 'Sex', 'Login Time', ...(hasLogout ? ['Logout Time'] : []), 'Attendance Status', 'Device Fingerprint'];
    const csvContent = [
      headers,
      ...sortedLogs.map(log => {
        const loginStr = log.scannedAt?.toDate 
          ? format(log.scannedAt.toDate(), 'MM/dd/yyyy hh:mm a') 
          : 'N/A';
        const logoutStr = log.logoutAt?.toDate
          ? format(log.logoutAt.toDate(), 'MM/dd/yyyy hh:mm a')
          : log.logoutAt ? format(new Date(log.logoutAt), 'MM/dd/yyyy hh:mm a') : 'Not logged out';
        return [
          log.userName, 
          log.unitName, 
          log.contactNumber || 'N/A', 
          log.sex || 'Did not specify', 
          loginStr,
          ...(hasLogout ? [logoutStr] : []),
          log.status, 
          log.deviceFingerprint
        ];
      })
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `RSU_Attendance_${activityName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintAttendanceSheet = () => {
    if (!activeActivity) {
      toast({ title: 'Print Error', description: 'Please select a specific active activity to print its attendance sheet.', variant: 'destructive' });
      return;
    }

    if (activeActivity.status !== 'COMPLETED') {
      toast({ title: 'Print Locked', description: 'Printing is only allowed once the activity attendance session has ended (status is COMPLETED).', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Pop-up Blocked', description: 'Please allow pop-ups to print the attendance sheet.', variant: 'destructive' });
      return;
    }

    const activityName = activeActivity.name;
    const unitName = activeActivity.unitId === 'all' ? 'University Wide' : (units?.find(u => u.id === activeActivity.unitId)?.name || 'Office/Unit');
    const startStr = activeActivity.startDateTime?.toDate 
      ? format(activeActivity.startDateTime.toDate(), 'MMMM dd, yyyy')
      : format(new Date(activeActivity.startDateTime), 'MMMM dd, yyyy');
    const timeStr = activeActivity.startDateTime?.toDate && activeActivity.endDateTime?.toDate
      ? `${format(activeActivity.startDateTime.toDate(), 'hh:mm a')} - ${format(activeActivity.endDateTime.toDate(), 'hh:mm a')}`
      : 'N/A';

    const logs = sortedLogs || [];
    const isLogoutMode = activeActivity.requiresLogout === true;
    const ROWS_PER_PAGE = 25;

    // Chunk logs into pages of ROWS_PER_PAGE
    const pages: ActivityAttendanceLog[][] = [];
    if (logs.length === 0) {
      pages.push([]);
    } else {
      for (let i = 0; i < logs.length; i += ROWS_PER_PAGE) {
        pages.push(logs.slice(i, i + ROWS_PER_PAGE));
      }
    }

    let htmlContent = '';

    pages.forEach((pageLogs, pageIdx) => {
      let tableRowsHtml = '';

      for (let i = 0; i < ROWS_PER_PAGE; i++) {
        const log = pageLogs[i];
        const overallIndex = pageIdx * ROWS_PER_PAGE + i + 1;

        if (log) {
          const checkInTime = log.scannedAt?.toDate 
            ? format(log.scannedAt.toDate(), 'hh:mm a') 
            : 'N/A';

          if (isLogoutMode) {
            const checkOutTime = log.logoutAt?.toDate
              ? format(log.logoutAt.toDate(), 'hh:mm a')
              : log.logoutAt ? format(new Date(log.logoutAt), 'hh:mm a') : 'Not logged out';

            tableRowsHtml += `
              <tr>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${overallIndex}</td>
                <td style="border: 1px solid black; padding: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left;">${log.userName}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${log.contactNumber || 'N/A'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px;">${log.sex || 'Did not specify'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px; font-weight: bold;">${checkInTime}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10px; font-weight: bold;">${checkOutTime}</td>
              </tr>
            `;
          } else {
            tableRowsHtml += `
              <tr>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px;">${overallIndex}</td>
                <td style="border: 1px solid black; padding: 6px; font-weight: bold; font-size: 11px; text-transform: uppercase; text-align: left;">${log.userName}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${log.contactNumber || 'N/A'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 11px;">${log.sex || 'Did not specify'}</td>
                <td style="border: 1px solid black; padding: 6px; text-align: center;">
                  <span style="font-family: 'Georgia', serif; font-style: italic; font-size: 10px; font-weight: normal; color: #111;">
                    ${log.userName}
                  </span>
                  <span style="font-size: 8px; color: #666; display: block; margin-top: 2px;">
                    ✓ Verified (${checkInTime})
                  </span>
                </td>
              </tr>
            `;
          }
        } else {
          tableRowsHtml += `
            <tr>
              <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 11px; color: #ccc;">${overallIndex}</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              <td style="border: 1px solid black; padding: 6px;">&nbsp;</td>
              ${isLogoutMode ? '<td style="border: 1px solid black; padding: 6px;">&nbsp;</td>' : ''}
            </tr>
          `;
        }
      }

      const tableHeaderHtml = isLogoutMode ? `
        <thead>
          <tr>
            <th style="width: 6%;">No.</th>
            <th style="width: 34%;">Name</th>
            <th style="width: 20%;">Contact Number</th>
            <th style="width: 10%;">Sex</th>
            <th style="width: 15%;">Login Time</th>
            <th style="width: 15%;">Logout Time</th>
          </tr>
        </thead>
      ` : `
        <thead>
          <tr>
            <th style="width: 6%;">No.</th>
            <th style="width: 40%;">Name</th>
            <th style="width: 22%;">Contact Number</th>
            <th style="width: 12%;">Sex</th>
            <th style="width: 20%;">Signature</th>
          </tr>
        </thead>
      `;

      const pageBreakHtml = pageIdx < pages.length - 1 ? '<div class="page-break"></div>' : '';

      htmlContent += `
        <div class="print-page">
          <!-- Header -->
          <div class="header-container">
            <div class="header-logo-left">
              <img src="/rsulogo.png" />
            </div>
            <div class="header-text">
              <p>Republic of the Philippines</p>
              <h2>ROMBLON STATE UNIVERSITY</h2>
              <p>Romblon, Philippines</p>
            </div>
            <div class="header-logo-right">
              <img src="/ISOlogo.jpg" />
            </div>
          </div>

          <!-- Document Title -->
          <div class="title-box">
            <h3>ATTENDANCE SHEET</h3>
          </div>

          <!-- Metadata info lines -->
          <div class="metadata-container">
            <div class="metadata-row">
              <span>Unit:</span>
              <div class="metadata-line">${unitName}</div>
            </div>
            <div class="metadata-row">
              <span>Title of Activity:</span>
              <div class="metadata-line">${activityName}</div>
            </div>
            <div style="display: flex; gap: 20px;">
              <div class="metadata-row" style="flex: 2;">
                <span>Date of Activity:</span>
                <div class="metadata-line">${startStr}</div>
              </div>
              <div class="metadata-row" style="flex: 1.5;">
                <span>Time of Activity:</span>
                <div class="metadata-line">${timeStr}</div>
              </div>
            </div>
          </div>

          <!-- Data Privacy Statement Box -->
          <div class="privacy-box">
            <div class="privacy-title">Data Privacy Statement</div>
            Romblon State University respects your right to privacy and is committed to protecting the confidentiality of your personal information. By filling out this form, you are consenting to the collection, processing, and use of the information in accordance with this privacy notice. The information you have provided is used for any or all of the following: access provision, attendance, monitoring, evaluation, documentation, and communication purposes. The University shall only retain the said personal information until it serves its purpose, after which it shall be securely disposed of. Suppose you have concerns and queries on Data Privacy, email dpo@rsu.edu.ph. Rest assured that we will respect and protect the confidentiality and privacy of these data and information as required by the Data Privacy Act of 2012 (R.A 10173).
          </div>

          <!-- Main Table -->
          <table>
            ${tableHeaderHtml}
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <!-- Footer QAO template references -->
          <div class="footer-container">
            <div class="footer-left">
              <div>QAO-01-022</div>
              <div class="creation-date">Creation Date: 2021-02-14</div>
              <div class="revision-date">Revision Date: 2022-01-24</div>
            </div>
            <div style="flex: 1; text-align: center; font-size: 8.5px; font-weight: bold; color: #555;">
              Page ${pageIdx + 1} of ${pages.length}
            </div>
            <div class="footer-right">
              AT No. _________________
            </div>
          </div>
        </div>
        ${pageBreakHtml}
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Sheet - ${activityName}</title>
          <style>
            @media print {
              body { margin: 0; font-family: Arial, sans-serif; color: black; background-color: white; }
              .no-print { display: none !important; }
              @page {
                size: 8.5in 13in portrait;
                margin: 0.3in 0.4in 0.3in 0.4in;
              }
              .page-break {
                page-break-before: always;
                break-before: page;
              }
            }
            body { font-family: Arial, sans-serif; padding: 20px; color: black; background-color: white; line-height: 1.2; }
            .print-page {
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header-container { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 15px; }
            .header-logo-left { width: 65px; text-align: left; }
            .header-logo-left img { height: 55px; object-fit: contain; }
            .header-text { text-align: center; flex: 1; margin: 0 10px; }
            .header-text p { margin: 0; font-size: 10px; text-transform: uppercase; font-weight: normal; letter-spacing: 0.5px; }
            .header-text h2 { margin: 2px 0; font-size: 14px; font-weight: bold; letter-spacing: 0.5px; }
            .header-logo-right { width: 95px; text-align: right; }
            .header-logo-right img { height: 55px; object-fit: contain; }
            
            .title-box { text-align: center; margin-bottom: 12px; }
            .title-box h3 { margin: 0; font-size: 14px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }

            .metadata-container { margin-bottom: 12px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            .metadata-row { margin-bottom: 6px; display: flex; align-items: flex-end; }
            .metadata-line { border-bottom: 1px solid black; flex: 1; padding-bottom: 2px; padding-left: 8px; font-weight: normal; text-transform: uppercase; }
            
            .privacy-box { 
              border: 1px solid black; 
              padding: 8px; 
              font-size: 8.5px; 
              text-align: justify; 
              margin-bottom: 12px; 
              background-color: #fcfcfc;
              line-height: 1.3;
            }
            .privacy-title {
              font-weight: bold;
              text-align: center;
              margin-bottom: 3px;
              text-transform: uppercase;
            }

            table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
            th { 
              background-color: #e5e7eb; 
              border: 1px solid black; 
              padding: 6px; 
              text-align: center; 
              text-transform: uppercase; 
              font-size: 10px; 
              font-weight: bold; 
            }
            td { vertical-align: middle; height: 22px; }
            
            .footer-container { 
              margin-top: 15px; 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              font-size: 8.5px; 
              text-transform: uppercase; 
              font-weight: bold;
              line-height: 1.3;
            }
            .footer-left { text-align: left; }
            .footer-left .creation-date { font-weight: normal; text-transform: none; }
            .footer-left .revision-date { font-weight: normal; text-transform: none; }
            .footer-right { text-align: right; font-size: 9.5px; }
          </style>
        </head>
        <body>
          ${htmlContent}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Search logic for device bindings
  const [bindingSearch, setBindingSearch] = useState('');
  const filteredBindings = useMemo(() => {
    if (!deviceBindings) return [];
    if (!bindingSearch.trim()) return deviceBindings;
    const q = bindingSearch.toLowerCase();
    return deviceBindings.filter(b => 
      b.userName.toLowerCase().includes(q) || 
      b.unitName.toLowerCase().includes(q) || 
      b.id.toLowerCase().includes(q)
    );
  }, [deviceBindings, bindingSearch]);

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center p-5 bg-gradient-to-r from-emerald-800 to-[#1B6535] rounded-2xl shadow-lg border border-emerald-700 gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            UNIT ACTIVITY ATTENDANCE MANAGER
          </h2>
          <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-0.5">
            RSU Device-Locked Event Check-in
          </p>
        </div>

        {/* Global Activity Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-black uppercase text-emerald-100 tracking-wider">Active Activity:</span>
          <select 
            value={selectedActivityId} 
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="h-9 px-3 bg-white font-extrabold text-xs text-slate-800 border-none shadow-md rounded-xl outline-none"
          >
            <option value="all">📁 All activities / logs</option>
            {sortedActivities?.map(act => (
              <option key={act.id} value={act.id}>📍 {act.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border shadow-inner rounded-xl w-max flex gap-1 h-10">
          <TabsTrigger value="activities" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Calendar className="h-3.5 w-3.5" /> Session Manager
          </TabsTrigger>
          <TabsTrigger value="scanner" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Camera className="h-3.5 w-3.5" /> Live QR Scanner
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Users className="h-3.5 w-3.5" /> Attendance Logs
          </TabsTrigger>
          <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Smartphone className="h-3.5 w-3.5" /> Device Lock Registry
          </TabsTrigger>
        </TabsList>

        {/* ==================== SUB-TAB 1: SESSION MANAGER ==================== */}
        <TabsContent value="activities" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Create Activity Form */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-1">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Setup New Activity Session</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Configure cutoff time and threshold values.</CardDescription>
              </CardHeader>

              <form onSubmit={handleCreateActivity}>
                <CardContent className="space-y-4 pt-6">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Activity Name</label>
                    <Input 
                      placeholder="e.g. QMS Audit Briefing"
                      value={newActivityName}
                      onChange={(e) => setNewActivityName(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* Start time */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Start DateTime</label>
                    <Input 
                      type="datetime-local"
                      value={newActivityStart}
                      onChange={(e) => setNewActivityStart(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* End time */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">End DateTime</label>
                    <Input 
                      type="datetime-local"
                      value={newActivityEnd}
                      onChange={(e) => setNewActivityEnd(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* Threshold */}
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Late Threshold (minutes)</label>
                    <Input 
                      type="number"
                      min="0"
                      value={lateThreshold}
                      onChange={(e) => setLateThreshold(e.target.value)}
                      className="h-10 text-xs font-bold bg-white border-slate-200"
                    />
                  </div>

                  {/* Attendance Type (Login/Logout Mode) */}
                  <div className="space-y-2 pt-1">
                    <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5 block">Attendance Type</label>
                    <div className="flex gap-4 border border-slate-200 rounded-xl p-3 bg-white">
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="newRequiresLogout"
                          checked={!newRequiresLogout}
                          onChange={() => setNewRequiresLogout(false)}
                          className="h-4 w-4 accent-[#1B6535]"
                        />
                        Login Only
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="newRequiresLogout"
                          checked={newRequiresLogout}
                          onChange={() => setNewRequiresLogout(true)}
                          className="h-4 w-4 accent-[#1B6535]"
                        />
                        Login &amp; Logout
                      </label>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pb-6">
                  <Button 
                    type="submit" 
                    disabled={isCreatingActivity}
                    className="w-full h-10 bg-[#1B6535] hover:bg-[#154e29] border-none text-white font-black uppercase tracking-wider text-[10px] rounded-xl flex items-center justify-center gap-2"
                  >
                    {isCreatingActivity ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Generate Attendance Session
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Activities Table List */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b py-4">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Registered Activities</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Scheduled attendance sessions for your unit.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-black text-[10px] uppercase pl-4">Session Name</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">Start Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase">End Time</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Threshold</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-center">Status</TableHead>
                      <TableHead className="font-black text-[10px] uppercase text-right pr-4">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingActivities ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">Loading activities...</span>
                        </TableCell>
                      </TableRow>
                    ) : !sortedActivities || sortedActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                          No activities generated yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedActivities.map(act => {
                        const isEnded = act.status === 'COMPLETED' || act.status === 'CANCELLED';
                        return (
                          <TableRow key={act.id} className="hover:bg-slate-50/50">
                            <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 max-w-[180px]">
                              <span className="block truncate">{act.name}</span>
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">
                              {act.startDateTime?.toDate 
                                ? format(act.startDateTime.toDate(), 'MM/dd/yyyy hh:mm a') 
                                : format(new Date(act.startDateTime), 'MM/dd/yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="text-xs font-semibold text-slate-500">
                              {act.endDateTime?.toDate 
                                ? format(act.endDateTime.toDate(), 'MM/dd/yyyy hh:mm a') 
                                : format(new Date(act.endDateTime), 'MM/dd/yyyy hh:mm a')}
                            </TableCell>
                            <TableCell className="text-center py-3 text-xs font-bold text-[#1B6535]">
                              {act.lateThresholdMinutes} mins
                            </TableCell>
                            {/* Status badge */}
                            <TableCell className="text-center py-3">
                              <Badge className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full ${
                                act.status === 'ACTIVE' || act.status === 'UPCOMING'
                                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                  : act.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-500 border border-slate-300'
                                  : 'bg-rose-100 text-rose-600 border border-rose-300'
                              }`}>
                                {act.status}
                              </Badge>
                            </TableCell>
                            {/* Action buttons */}
                            <TableCell className="text-right pr-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* Open Scanner — disabled if ended */}
                                <Button 
                                  size="sm"
                                  variant="outline"
                                  disabled={isEnded}
                                  onClick={() => {
                                    window.open(`/unit-activity-scanner?activityId=${act.id}`, '_blank');
                                  }}
                                  className="h-8 text-[9px] font-black uppercase tracking-widest text-[#1B6535] border-emerald-500/20 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Camera className="h-3 w-3 mr-1" />
                                  Scanner
                                </Button>
                                {/* Edit */}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditModal(act)}
                                  className="h-8 text-[9px] font-black uppercase tracking-widest text-blue-600 border-blue-300/50 hover:bg-blue-50"
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  Edit
                                </Button>
                                {/* End Activity — only if not already ended */}
                                {!isEnded && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEndActivity(act)}
                                    className="h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-300/50 hover:bg-rose-50"
                                  >
                                    <StopCircle className="h-3 w-3 mr-1" />
                                    End
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== SUB-TAB 2: LIVE QR SCANNER ==================== */}
        <TabsContent value="scanner" className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Camera Viewport and Controller */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-2 overflow-hidden flex flex-col justify-between">
              <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase text-slate-700">Scan Session Camera</CardTitle>
                  <CardDescription className="text-[10px] text-slate-500">
                    Active: <span className="font-extrabold text-[#1B6535]">{activeActivity ? activeActivity.name : "None selected"}</span>
                  </CardDescription>
                </div>
                {activeActivity && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 text-[8.5px] uppercase font-black px-2 py-0.5">
                    Start time: {activeActivity.startDateTime?.toDate 
                      ? format(activeActivity.startDateTime.toDate(), 'hh:mm a') 
                      : 'N/A'}
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="flex-1 flex flex-col items-center justify-center p-6 min-h-[350px] bg-slate-950/5 relative">
                {selectedActivityId === 'all' ? (
                  <div className="text-center max-w-sm space-y-3">
                    <ShieldAlert className="h-12 w-12 text-[#D4AF37] animate-pulse mx-auto" />
                    <h3 className="text-sm font-black uppercase text-slate-800">Scanner Locked</h3>
                    <p className="text-[11px] font-bold text-slate-500 uppercase leading-normal">
                      Please select an active activity session in the header dropdown list first to configure your scanner logic.
                    </p>
                  </div>
                ) : !scannerActive ? (
                  <div className="text-center max-w-sm space-y-4">
                    <Camera className="h-10 w-10 text-slate-400 mx-auto" />
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-700">Camera stream offline</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Activate scanning permissions to capture codes.</p>
                    </div>
                    <Button 
                      onClick={startScanning} 
                      className="h-10 bg-[#1B6535] hover:bg-[#16542c] font-black uppercase tracking-wider text-[10px] rounded-xl px-6"
                    >
                      Initialize Scan Camera
                    </Button>
                  </div>
                ) : (
                  /* Scanner Reader element mount */
                  <div className="w-full max-w-sm space-y-4">
                    <div id="reader-container" className="w-full bg-black rounded-2xl overflow-hidden shadow-xl border-2 border-emerald-500/30" />
                    <Button 
                      onClick={stopScanning} 
                      variant="destructive"
                      className="w-full h-10 font-black uppercase tracking-wider text-[10px] rounded-xl"
                    >
                      Disconnect Camera
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation Panel Feed */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-1 flex flex-col justify-between">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Scan Validation Result</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">Real-time authentication feedback.</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-6 flex-1 flex flex-col justify-center">
                {scanResult.status === 'none' ? (
                  <div className="text-center py-10 space-y-2 opacity-40">
                    <Info className="h-8 w-8 text-slate-400 mx-auto" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                      {scanResult.message}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Status Alert Graphic */}
                    <div className={`p-4 rounded-2xl border text-center space-y-2 ${
                      scanResult.status === 'success' 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : scanResult.status === 'warning' 
                        ? 'bg-amber-50 border-amber-250 text-amber-800' 
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}>
                      <div className="flex justify-center">
                        {scanResult.status === 'success' ? (
                          <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
                        ) : scanResult.status === 'warning' ? (
                          <Clock className="h-10 w-10 text-amber-600 animate-pulse" />
                        ) : (
                          <XCircle className="h-10 w-10 text-rose-600 animate-pulse" />
                        )}
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wider">
                        {scanResult.status === 'success' ? 'Scanned Successfully' : scanResult.status === 'warning' ? 'Scan Warning' : 'Scan Rejected'}
                      </h4>
                      <p className="text-[11px] font-bold leading-normal italic">
                        "{scanResult.message}"
                      </p>
                    </div>

                    {/* Attendee Details */}
                    {scanResult.details && (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                        <div className="flex justify-between items-center border-b pb-1.5 text-[9px] font-black uppercase text-slate-400">
                          <span>User Verified</span>
                          <Badge className={`${
                            scanResult.details.status === 'ON TIME' 
                              ? 'bg-emerald-100 text-emerald-800 border-none' 
                              : scanResult.details.status === 'LATE'
                              ? 'bg-amber-100 text-amber-800 border-none'
                              : 'bg-slate-200 text-slate-800 border-none'
                          } text-[8px] font-black uppercase px-2`}>
                            {scanResult.details.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Employee Name:</span>
                          <span className="text-xs font-black text-slate-800 uppercase block">{scanResult.details.name}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Office / Unit:</span>
                          <span className="text-[11px] font-bold text-slate-600 uppercase block">{scanResult.details.office}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Timestamp:</span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 block">{scanResult.details.time}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4 justify-center">
                <span className="text-[8.5px] font-black uppercase text-slate-400 tracking-wider">Verification engine active (2026 EOMS)</span>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== SUB-TAB 3: ATTENDANCE RECORDS ==================== */}
        <TabsContent value="records" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-700">Attendance Logbook Entries</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Showing logs for: <span className="font-extrabold text-[#1B6535]">{activeActivity ? activeActivity.name : "All sessions"}</span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handlePrintAttendanceSheet}
                  disabled={!activeActivity || activeActivity.status !== 'COMPLETED'}
                  className="h-8 text-[9.5px] font-black uppercase tracking-wider bg-white border border-[#1B6535]/25 hover:bg-slate-50 text-[#1B6535] shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-40"
                  title={!activeActivity ? "Please select a specific completed activity from the dropdown above to print." : activeActivity.status !== 'COMPLETED' ? "Print attendance sheet is locked until the activity has ended." : "Print attendance sheet"}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1 text-amber-500" /> Print Official Sheet
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleExportCSV}
                  className="h-8 text-[9.5px] font-black uppercase tracking-wider bg-emerald-700 hover:bg-emerald-800 text-white border-none"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Export to CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-4">Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Unit/Office</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Contact Number</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Sex</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">{activeActivity?.requiresLogout ? 'Login Time' : 'Scanned Time'}</TableHead>
                    {activeActivity?.requiresLogout && (
                      <TableHead className="font-black text-[10px] uppercase">Logout Time</TableHead>
                    )}
                    <TableHead className="font-black text-[10px] uppercase text-center font-bold">Device Binding</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right pr-4">Lateness status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!sortedLogs || sortedLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={activeActivity?.requiresLogout ? 8 : 7} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                        No attendance entries logged for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedLogs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 uppercase">
                          {log.userName}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-650 uppercase">
                          {log.unitName}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-slate-600">
                          {log.contactNumber || 'N/A'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {log.sex || 'Did not specify'}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {log.scannedAt?.toDate 
                            ? format(log.scannedAt.toDate(), 'MM/dd/yyyy hh:mm a') 
                            : 'N/A'}
                        </TableCell>
                        {activeActivity?.requiresLogout && (
                          <TableCell className="text-xs font-semibold text-slate-500">
                            {log.logoutAt?.toDate
                              ? format(log.logoutAt.toDate(), 'MM/dd/yyyy hh:mm a')
                              : log.logoutAt ? format(new Date(log.logoutAt), 'MM/dd/yyyy hh:mm a') : 'Not logged out'}
                          </TableCell>
                        )}
                        <TableCell className="text-center py-3 text-[10px] font-mono text-slate-400">
                          {log.deviceFingerprint?.substring(0, 15)}...
                        </TableCell>
                        <TableCell className="text-right pr-4 py-3">
                          <Badge className={`${
                            log.status === 'ON_TIME' 
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                              : log.status === 'LATE'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-rose-50 text-rose-800 border border-rose-250'
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
        </TabsContent>

        {/* ==================== SUB-TAB 4: DEVICE LOCK REGISTRY ==================== */}
        <TabsContent value="registry" className="space-y-6 animate-in fade-in duration-500">
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-700">Official Device Registry</CardTitle>
                <CardDescription className="text-[10px] text-slate-500">
                  Enforces strict one account per physical device lock mapping.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search registered user name or office..."
                  value={bindingSearch}
                  onChange={(e) => setBindingSearch(e.target.value)}
                  className="h-8 text-xs font-bold w-[250px] bg-white border-slate-200"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-4">Locked Name</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Office / Unit</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Device Fingerprint Hash</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Registration Date</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-right pr-4">Reset Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBindings ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2 block">Loading device bindings...</span>
                      </TableCell>
                    </TableRow>
                  ) : filteredBindings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-16 text-slate-400 font-bold uppercase italic text-xs">
                        No registered device bindings matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBindings.map((bind) => (
                      <TableRow key={bind.id} className="hover:bg-slate-50/50">
                        <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-800 uppercase flex items-center gap-2">
                          <Smartphone className="h-4 w-4 text-[#D4AF37]" /> {bind.userName}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-600 uppercase">{bind.unitName}</TableCell>
                        <TableCell className="text-xs font-mono font-bold text-slate-400">
                          {bind.id}
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-slate-500">
                          {bind.boundAt?.toDate 
                            ? format(bind.boundAt.toDate(), 'MM/dd/yyyy hh:mm a') 
                            : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right pr-4 py-3">
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleResetBinding(bind.id, bind.userName)}
                            className="h-8 text-[9px] font-black uppercase tracking-widest px-3 flex items-center gap-1.5"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Unlock Device
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ================================================================== */}
      {/* EDIT ACTIVITY MODAL                                                 */}
      {/* ================================================================== */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-blue-500" />
                  Edit Activity
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{editingActivity.name}</p>
              </div>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditActivity}>
              <div className="px-6 py-5 space-y-4">
                {/* Activity Name */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Activity Name</label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. QMS Audit Briefing"
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* Start DateTime */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Start DateTime</label>
                  <Input
                    type="datetime-local"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* End DateTime */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">End DateTime</label>
                  <Input
                    type="datetime-local"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* Late Threshold */}
                <div className="space-y-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5">Late Threshold (minutes)</label>
                  <Input
                    type="number"
                    min="0"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="h-10 text-xs font-bold bg-white border-slate-200"
                  />
                </div>

                {/* Attendance Type (Login/Logout Mode) */}
                <div className="space-y-2 pt-1">
                  <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider pl-0.5 block">Attendance Type</label>
                  <div className="flex gap-4 border border-slate-200 rounded-xl p-3 bg-white">
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="editRequiresLogout"
                        checked={!editRequiresLogout}
                        onChange={() => setEditRequiresLogout(false)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      Login Only
                    </label>
                    <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="editRequiresLogout"
                        checked={editRequiresLogout}
                        onChange={() => setEditRequiresLogout(true)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      Login &amp; Logout
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingActivity(null)}
                  className="h-9 px-5 text-[10px] font-black uppercase tracking-wider"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingEdit}
                  className="h-9 px-6 bg-blue-600 hover:bg-blue-700 border-none text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-2"
                >
                  {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
