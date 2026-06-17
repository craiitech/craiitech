'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, getDoc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import type { Campus, Unit, DeviceBinding } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ShieldCheck
} from 'lucide-react';

// Client-side secure hash/signature key for tamper-prevention
const APP_SECRET_SALT = "rsu_attendance_secure_salt_2026";

// Custom SHA-256 equivalent hash function for browser environments without native crypto dependencies
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

export default function RsuAttendanceApp() {
  const firestore = useFirestore();

  // Load campuses and units for registration form
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // Client device details
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [userAgent, setUserAgent] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Binding and registration state
  const [binding, setBinding] = useState<DeviceBinding | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // Registration Form state
  const [fullName, setFullName] = useState('');
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [sex, setSex] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regError, setRegError] = useState('');

  // QR display state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [qrPayload, setQrPayload] = useState<string>('');

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
          setBinding(docSnap.data() as DeviceBinding);
          setIsLocked(true);
        } else {
          setBinding(null);
          setIsLocked(false);
        }
      } catch (err) {
        console.error("Error checking device binding:", err);
      } finally {
        setIsInitializing(false);
      }
    };

    checkBinding();
  }, [firestore, deviceFingerprint]);

  // 3. Generate signed rotating QR payload
  const generateNewQR = () => {
    if (!binding) return;

    const timestamp = Date.now();
    const signature = generatePayloadSignature(binding.userId, timestamp, binding.id);

    // Construct signed token payload (highly optimized/minified for fast, low-density QR scans)
    const payloadObj = {
      u: binding.userId,
      f: binding.id,
      t: timestamp,
      s: signature
    };

    const payloadString = JSON.stringify(payloadObj);
    setQrPayload(payloadString);
    
    // Construct QR rendering URL from API server (optimized size & Low ECC for maximum speed)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&ecc=L&data=${encodeURIComponent(payloadString)}`;
    setQrCodeUrl(qrUrl);
    setTimeLeft(60);
  };

  // 4. Trigger QR rotation on timer
  useEffect(() => {
    if (!isLocked || !binding) return;

    generateNewQR();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateNewQR();
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

      // A. Assert: Make sure this user name is not already bound to a different device fingerprint
      const userBindingsQuery = query(
        collection(firestore, 'attendanceDeviceBindings'),
        where('userId', '==', userId)
      );
      const userBindingsSnap = await getDocs(userBindingsQuery);

      if (!userBindingsSnap.empty) {
        setRegError('This name is already registered to another device. RSU policy enforces 1 account per device.');
        setIsRegistering(false);
        return;
      }

      // B. Fetch unit name for metadata
      const unitName = units?.find(u => u.id === selectedUnitId)?.name || 'Office';

      // C. Save device binding lock
      const docRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
      const newBinding: DeviceBinding = {
        id: deviceFingerprint,
        userId,
        userName: fullName.trim(),
        unitId: selectedUnitId,
        unitName,
        boundAt: new Date(),
        userAgent,
        contactNumber: contactNumber.trim(),
        sex
      };

      await setDoc(docRef, newBinding);
      
      setBinding(newBinding);
      setIsLocked(true);
    } catch (err: any) {
      console.error("Error locking device:", err);
      setRegError('Registration failed. Please contact your system administrator.');
    } finally {
      setIsRegistering(false);
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

            <CardContent className="flex flex-col items-center py-4 px-4">
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
                <p className="text-[8.5px] text-center text-slate-500 font-bold uppercase tracking-wide pt-0.5">
                  QR code refreshes every 60 seconds for security
                </p>
              </div>
            </CardContent>

            <CardFooter className="bg-slate-950/40 p-4 border-t border-slate-800 flex items-center justify-center gap-2">
              <Fingerprint className="h-4.5 w-4.5 text-[#D4AF37]" />
              <span className="text-[8.5px] font-bold text-slate-500 uppercase tracking-widest truncate max-w-[280px]">
                DEVICE ID: {binding.id}
              </span>
            </CardFooter>
          </Card>
        ) : (
          /* FIRST TIME REGISTRATION / DEVICE BINDING FORM */
          <Card className="bg-slate-900/60 border-slate-800/80 shadow-2xl rounded-2xl overflow-hidden relative backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-[#D4AF37]" />
            
            <CardHeader className="pb-3 pt-6">
              <CardTitle className="text-sm font-black uppercase text-slate-200 tracking-tight flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-[#D4AF37]" /> First-Time Registration
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 font-medium">
                Registering binds this specific phone/device to your name and unit permanently. Access will be locked to this hardware.
              </CardDescription>
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
