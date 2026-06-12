'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { collection, addDoc, Timestamp, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Campus, Unit, SystemSettings } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Calendar, 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  Building2, 
  HelpCircle,
  Users2,
  Sparkles,
  ClipboardList,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { getDirectDriveLink } from '@/lib/utils';

export default function VisitorLogbookPage() {
  const { userProfile, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const unitRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return doc(firestore, 'units', userProfile.unitId);
  }, [firestore, userProfile?.unitId]);

  const campusRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId) return null;
    return doc(firestore, 'campuses', userProfile.campusId);
  }, [firestore, userProfile?.campusId]);

  const { data: unitDoc } = useDoc<Unit>(unitRef);
  const { data: campusDoc } = useDoc<Campus>(campusRef);

  const systemSettingsRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'system', 'settings');
  }, [firestore]);

  const { data: systemSettingsDoc } = useDoc<SystemSettings>(systemSettingsRef);

  const getCampusSitePrefix = (campusName: string): string => {
    const nameUpper = campusName.toUpperCase();
    if (/^SITE\s+\d+\s+-/.test(nameUpper)) {
      return nameUpper;
    }
    const match = nameUpper.match(/\bSITE\s+(\d+)\b/);
    if (match) {
      const siteNum = match[1];
      const cleanName = nameUpper.replace(/\bSITE\s+\d+\b/g, '').replace(/^[\s-:]+/, '').trim();
      return `SITE ${siteNum} - ${cleanName}`;
    }
    if (nameUpper.includes('MAIN')) return 'SITE 1 - MAIN CAMPUS';
    if (nameUpper.includes('ROMBLON')) return 'SITE 2 - ROMBLON CAMPUS';
    if (nameUpper.includes('SAN FERNANDO')) return 'SITE 3 - SAN FERNANDO CAMPUS';
    if (nameUpper.includes('CAJIDIOCAN')) return 'SITE 4 - CAJIDIOCAN CAMPUS';
    if (nameUpper.includes('SAN AGUSTIN')) return 'SITE 5 - SAN AGUSTIN CAMPUS';
    if (nameUpper.includes('CALATRAVA')) return 'SITE 6 - CALATRAVA CAMPUS';
    if (nameUpper.includes('SAN JOSE')) return 'SITE 7 - SAN JOSE CAMPUS';
    if (nameUpper.includes('SANTA FE')) return 'SITE 8 - SANTA FE CAMPUS';
    if (nameUpper.includes('SANTA MARIA')) return 'SITE 9 - SANTA MARIA CAMPUS';
    return campusName.toUpperCase();
  };

  const roleLower = userRole?.toLowerCase() || '';
  const isCampusOdimoOrDirector = roleLower.includes('campus director') || roleLower.includes('campus odimo');

  const campusNameStr = campusDoc?.name ? getCampusSitePrefix(campusDoc.name) : '';
  const unitNameStr = isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (unitDoc?.name ? unitDoc.name.toUpperCase() : '');

  const officeName = campusNameStr && unitNameStr 
    ? `${campusNameStr} | ${unitNameStr}`
    : (isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (userProfile?.unitName || 'our Office'));

  const logoSrc = systemSettingsDoc?.logoUrl 
    ? getDirectDriveLink(systemSettingsDoc.logoUrl) 
    : '/rsupage.png';

  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [sex, setSex] = useState('');
  const [purpose, setPurpose] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeVisitors, setActiveVisitors] = useState<any[]>([]);
  const [activeVisitorsLoading, setActiveVisitorsLoading] = useState(true);
  const [logoutSuccessVisitorName, setLogoutSuccessVisitorName] = useState<string | null>(null);

  // ARTA CSM survey kiosk states
  const [activeSurveyVisitor, setActiveSurveyVisitor] = useState<any | null>(null);
  const [csmAgeGroup, setCsmAgeGroup] = useState<string>('');
  const [csmClientType, setCsmClientType] = useState<string>('');
  const [csmCC1, setCsmCC1] = useState<number | null>(null);
  const [csmCC2, setCsmCC2] = useState<number | null>(null);
  const [csmCC3, setCsmCC3] = useState<number | null>(null);
  const [csmSQD1, setCsmSQD1] = useState<number>(5);
  const [csmSQD2, setCsmSQD2] = useState<number>(5);
  const [csmSQD3, setCsmSQD3] = useState<number>(5);
  const [csmSQD4, setCsmSQD4] = useState<number>(5);
  const [csmSQD5, setCsmSQD5] = useState<number>(5);
  const [csmSQD6, setCsmSQD6] = useState<number>(5);
  const [csmSQD7, setCsmSQD7] = useState<number>(5);
  const [csmSQD8, setCsmSQD8] = useState<number>(5);
  const [csmComments, setCsmComments] = useState<string>('');
  const [isSubmittingCsm, setIsSubmittingCsm] = useState<boolean>(false);


  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Enter fullscreen automatically on first user gesture if requested via query param
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const shouldAutoFullscreen = searchParams.get('fullscreen') === 'true';

      if (shouldAutoFullscreen) {
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
      }
    }
  }, []);

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

  // Update clock every second
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Form Reset timer on success
  useEffect(() => {
    if (submitSuccess) {
      const resetTimer = setTimeout(() => {
        setSubmitSuccess(false);
        setVisitorName('');
        setSex('');
        setPurpose('');
        setLookingFor('');
      }, 4000);
      return () => clearTimeout(resetTimer);
    }
  }, [submitSuccess]);

  // Real-time active visitors subscriber
  useEffect(() => {
    if (!firestore || !userProfile?.unitId) {
      setActiveVisitors([]);
      setActiveVisitorsLoading(false);
      return;
    }

    setActiveVisitorsLoading(true);
    const q = query(
      collection(firestore, 'visitorLogs'),
      where('unitId', '==', userProfile.unitId),
      where('isLoggedOut', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      // Sort in-memory by arrival time (createdAt) ascending
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeA - timeB;
      });
      setActiveVisitors(list);
      setActiveVisitorsLoading(false);
    }, (error) => {
      console.error("Error fetching active visitors:", error);
      setActiveVisitorsLoading(false);
    });

    return () => unsubscribe();
  }, [firestore, userProfile?.unitId]);

  // Logout Success auto-reset effect
  useEffect(() => {
    if (logoutSuccessVisitorName) {
      const timer = setTimeout(() => {
        setLogoutSuccessVisitorName(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [logoutSuccessVisitorName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !userProfile) return;

    if (!visitorName.trim() || !sex || !purpose.trim() || !lookingFor.trim()) {
      toast({
        title: 'Missing Details',
        description: 'Please complete all required fields (including selecting your sex).',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const logPayload = {
        name: visitorName.trim(),
        sex: sex,
        purpose: purpose.trim(),
        lookingFor: lookingFor.trim(),
        unitId: userProfile.unitId || 'N/A',
        campusId: userProfile.campusId || 'N/A',
        unitName: isCampusOdimoOrDirector ? "OFFICE OF THE CAMPUS DIRECTOR" : (unitDoc?.name || userProfile.unitName || 'Office'),
        createdAt: Timestamp.now(),
        isLoggedOut: false,
        loggedOutAt: null,
      };

      await addDoc(collection(firestore, 'visitorLogs'), logPayload);
      setSubmitSuccess(true);
      toast({
        title: 'Entry Recorded',
        description: `Welcome to our office, ${visitorName}!`,
      });
    } catch (error) {
      console.error('Error logging visitor:', error);
      toast({
        title: 'Submission Failed',
        description: 'Could not record your visit. Please notify staff.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutVisitor = (visitor: any) => {
    setActiveSurveyVisitor(visitor);
    setCsmAgeGroup('');
    setCsmClientType('');
    setCsmCC1(null);
    setCsmCC2(null);
    setCsmCC3(null);
    setCsmSQD1(5);
    setCsmSQD2(5);
    setCsmSQD3(5);
    setCsmSQD4(5);
    setCsmSQD5(5);
    setCsmSQD6(5);
    setCsmSQD7(5);
    setCsmSQD8(5);
    setCsmComments('');
  };

  const submitCsmCheckout = async (skip = false) => {
    if (!firestore || !activeSurveyVisitor) return;
    setIsSubmittingCsm(true);
    try {
      const visitorId = activeSurveyVisitor.id;
      const visitorName = activeSurveyVisitor.name;

      if (!skip) {
        if (!csmAgeGroup || !csmClientType || csmCC1 === null) {
          toast({
            title: 'Incomplete Survey',
            description: 'Please answer the profile and Citizen\'s Charter questions, or click Skip.',
            variant: 'destructive',
          });
          setIsSubmittingCsm(false);
          return;
        }

        const csmPayload = {
          visitorLogId: visitorId,
          visitorName: visitorName,
          sex: activeSurveyVisitor.sex || 'N/A',
          ageGroup: csmAgeGroup,
          clientType: csmClientType,
          campusId: activeSurveyVisitor.campusId || userProfile?.campusId || 'N/A',
          unitId: activeSurveyVisitor.unitId || 'N/A',
          unitName: activeSurveyVisitor.unitName || 'Office',
          purpose: activeSurveyVisitor.purpose || 'N/A',
          
          cc1: Number(csmCC1),
          cc2: csmCC2 !== null ? Number(csmCC2) : 5, // default to 5 (N/A)
          cc3: csmCC3 !== null ? Number(csmCC3) : 4, // default to 4 (N/A)
          
          sqd1: Number(csmSQD1),
          sqd2: Number(csmSQD2),
          sqd3: Number(csmSQD3),
          sqd4: Number(csmSQD4),
          sqd5: Number(csmSQD5),
          sqd6: Number(csmSQD6),
          sqd7: Number(csmSQD7),
          sqd8: Number(csmSQD8),
          
          comments: csmComments.trim(),
          createdAt: Timestamp.now(),
        };

        await addDoc(collection(firestore, 'csmResponses'), csmPayload);
      }

      await updateDoc(doc(firestore, 'visitorLogs', visitorId), {
        isLoggedOut: true,
        loggedOutAt: Timestamp.now(),
      });

      setLogoutSuccessVisitorName(visitorName);
      setActiveSurveyVisitor(null);
      toast({
        title: skip ? 'Visitor Logged Out' : 'Feedback Submitted & Checked Out',
        description: skip 
          ? `${visitorName} has logged out successfully.` 
          : `Thank you for completing the survey, ${visitorName}!`,
      });
    } catch (error) {
      console.error('Error logging out and saving CSM:', error);
      toast({
        title: 'Error Logging Out',
        description: 'Failed to record checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCsm(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  // officeName is dynamically defined above

  return (
    <div className="relative min-h-screen w-full bg-[#0d2a18] bg-radial-gradient flex flex-col justify-between overflow-hidden p-6 md:p-12">
      {/* Decorative shimmers */}
      <div className="absolute top-0 -left-1/4 w-[600px] h-[600px] bg-[#1B6535]/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[600px] h-[600px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top action bar: Return to dashboard */}
      <div className="w-full flex justify-between items-center z-10">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-[#D4AF37]/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#D4AF37]/70 hover:text-[#D4AF37] transition-all bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-[#D4AF37]/20 shadow-lg active:scale-95"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
          </button>

          <div className="flex items-center gap-2 bg-[#1B6535]/30 border border-[#D4AF37]/20 px-4 py-1.5 rounded-full shadow-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-white/85 uppercase tracking-widest">Kiosk Active</span>
          </div>
        </div>
      </div>

      {/* Main layout wrapper */}
      <div className="flex-1 flex flex-col xl:flex-row items-stretch justify-center gap-8 xl:gap-8 max-w-7xl w-full mx-auto my-8 z-10">
        
        {/* Left column: Welcome, date/time info */}
        <div className="w-full xl:w-[28%] flex flex-col justify-center text-center xl:text-left space-y-6">
          <div className="flex justify-center xl:justify-start">
            <div className="relative h-28 w-28 md:h-36 md:w-36 transition-all hover:scale-105 duration-300">
              <Image 
                src={logoSrc} 
                alt="University Logo" 
                fill 
                className="object-contain" 
                priority
              />
            </div>
          </div>
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="h-3 w-3" /> Romblon State University
            </span>
            <h1 className="text-4xl md:text-5xl font-black uppercase text-white tracking-tight leading-tight">
              Visitor <span className="text-[#D4AF37]">Logbook</span>
            </h1>
            <p className="text-lg md:text-xl font-bold text-slate-300">
              Welcome to <span className="text-emerald-400 font-extrabold">{officeName}</span>
            </p>
          </div>

          {currentTime && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto xl:mx-0">
              {/* Clock */}
              <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
                <Clock className="h-8 w-8 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/80">Current Time</p>
                  <p className="text-2xl font-black text-white leading-none mt-1 tabular-nums">
                    {format(currentTime, 'hh:mm:ss a')}
                  </p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-4 bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl">
                <Calendar className="h-8 w-8 text-[#D4AF37] shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/80">Today's Date</p>
                  <p className="text-base font-black text-white leading-tight mt-1">
                    {format(currentTime, 'EEEE, MMM dd')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
 
        {/* Middle column: Form Card */}
        <div className="w-full xl:w-[36%] max-w-md flex flex-col justify-start">
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 md:p-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-800">Sign In</CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold uppercase mt-0.5">Please log your credentials below</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 md:p-8 min-h-[360px] flex flex-col justify-center">
              {!submitSuccess ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Visitor Name */}
                  <div className="space-y-2">
                    <Label htmlFor="visitorName" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Your Full Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="visitorName"
                        type="text"
                        placeholder="e.g. Juan D. Dela Cruz"
                        value={visitorName}
                        onChange={(e) => setVisitorName(e.target.value)}
                        required
                        className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Sex Selection */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Sex
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setSex('Male')}
                        className={`h-11 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all active:scale-[0.98] ${
                          sex === 'Male'
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-lg shadow-[#1B6535]/20'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Male
                      </button>
                      <button
                        type="button"
                        onClick={() => setSex('Female')}
                        className={`h-11 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all active:scale-[0.98] ${
                          sex === 'Female'
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-lg shadow-[#1B6535]/20'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Female
                      </button>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Purpose of Visit
                    </Label>
                    <div className="relative">
                      <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="purpose"
                        type="text"
                        placeholder="e.g. Document submission, Meeting, Inquiry"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        required
                        className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Looking For */}
                  <div className="space-y-2">
                    <Label htmlFor="lookingFor" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Who are you looking for?
                    </Label>
                    <div className="relative">
                      <Users2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="lookingFor"
                        type="text"
                        placeholder="e.g. Sarah Jane Fallaria, Office Head"
                        value={lookingFor}
                        onChange={(e) => setLookingFor(e.target.value)}
                        required
                        className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl font-black uppercase tracking-widest shadow-lg shadow-[#1B6535]/20 focus-visible:ring-0 active:scale-[0.98] transition-all duration-150"
                  >
                    {isSubmitting ? 'Recording...' : 'Submit Entry'}
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 space-y-4 animate-in zoom-in duration-300">
                  <div className="relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black uppercase text-slate-800">Thank You!</h3>
                    <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Your visit has been logged.</p>
                  </div>
                  <p className="text-sm font-medium text-slate-600 max-w-xs pt-2">
                    Please take a seat. Staff from <span className="font-bold text-emerald-650">{officeName}</span> will assist you shortly.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column: Active Visitors Card */}
        <div className="w-full xl:w-[36%] max-w-md flex flex-col justify-start">
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden h-full flex flex-col">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Users2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black uppercase tracking-wider text-slate-800">Active Visitors</CardTitle>
                  <CardDescription className="text-slate-500 text-xs font-bold uppercase mt-0.5">Currently in the Office</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 flex-1 overflow-y-auto max-h-[450px]">
              {activeVisitorsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div className="h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Loading list...</span>
                </div>
              ) : activeVisitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                    <User className="h-6 w-6 opacity-40" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-slate-700">No visitors logged in</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">The visitor queue is currently empty.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeVisitors.map((visitor) => {
                    const timeInStr = visitor.createdAt?.toDate 
                      ? format(visitor.createdAt.toDate(), 'hh:mm a') 
                      : 'N/A';
                    return (
                      <div 
                        key={visitor.id} 
                        className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all text-left"
                      >
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{visitor.name}</h4>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <span>Time-in: <span className="font-mono text-slate-700">{timeInStr}</span></span>
                            <span>&bull;</span>
                            <span className="truncate max-w-[150px]">To Meet: <span className="text-slate-700">{visitor.lookingFor}</span></span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLogoutVisitor(visitor)}
                          className="h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 rounded-lg shadow-sm shrink-0"
                        >
                          Logout
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ARTA CSM Survey Kiosk Overlay */}
      {activeSurveyVisitor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-300">
          <div className="bg-white border border-[#D4AF37]/30 shadow-2xl rounded-3xl p-6 md:p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto text-left space-y-6 animate-in zoom-in-95 duration-300">
            
            {/* Header */}
            <div className="border-b pb-4 space-y-1">
              <h2 className="text-xl font-black uppercase tracking-tight text-[#1B6535]">Client Satisfaction Measurement (CSM)</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest leading-tight">
                Help us improve our service, <span className="text-emerald-700 font-extrabold">{activeSurveyVisitor.name}</span>!
              </p>
            </div>

            {/* Profile Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">1. Client Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Age Group */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">Age Group</label>
                  <div className="flex flex-wrap gap-2">
                    {['19-under', '20-34', '35-49', '50-64', '65-over'].map(age => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => setCsmAgeGroup(age)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                          csmAgeGroup === age
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {age === '19-under' ? '19 & Under' : age === '65-over' ? '65 & Over' : age}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Client Type */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-700">Client Type</label>
                  <div className="flex flex-wrap gap-2">
                    {['Citizen', 'Business', 'Government'].map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCsmClientType(type)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wide transition-all ${
                          csmClientType === type
                            ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Citizen's Charter */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">2. Citizen's Charter (CC)</h3>
              
              {/* CC1 */}
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-800">CC1. Which of the following best describes your awareness of a Citizen's Charter?</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { val: 1, label: "I know what a Citizen's Charter is and I saw this office's charter." },
                    { val: 2, label: "I know what a Citizen's Charter is but I did NOT see this office's charter." },
                    { val: 3, label: "I learned of the Citizen's Charter only when I saw this office's charter." },
                    { val: 4, label: "I do not know what a Citizen's Charter is and I did not see one." }
                  ].map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        setCsmCC1(opt.val);
                        if (opt.val === 2 || opt.val === 4) {
                          setCsmCC2(5);
                          setCsmCC3(4);
                        } else {
                          setCsmCC2(null);
                          setCsmCC3(null);
                        }
                      }}
                      className={`text-left p-3 rounded-xl border text-xs font-bold transition-all ${
                        csmCC1 === opt.val
                          ? 'bg-[#1B6535]/10 text-[#1B6535] border-[#1B6535] font-black'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CC2 & CC3 - only show if CC1 is 1 or 3 */}
              {(csmCC1 === 1 || csmCC1 === 3) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* CC2 */}
                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-800">CC2. How visible was the Citizen's Charter in this office?</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { val: 1, label: "Easy to see" },
                        { val: 2, label: "Somewhat easy to see" },
                        { val: 3, label: "Difficult to see" },
                        { val: 4, label: "Not visible at all" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCsmCC2(opt.val)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                            csmCC2 === opt.val
                              ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CC3 */}
                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-800">CC3. How much did the Citizen's Charter help you?</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {[
                        { val: 1, label: "Helped very much" },
                        { val: 2, label: "Somewhat helped" },
                        { val: 3, label: "Did not help" }
                      ].map(opt => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => setCsmCC3(opt.val)}
                          className={`text-left px-3 py-2 rounded-lg border text-xs font-bold transition-all ${
                            csmCC3 === opt.val
                              ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SQD Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">3. Service Quality Dimensions (SQD)</h3>
              
              <div className="space-y-4">
                {[
                  { id: 1, label: "SQD1. Responsiveness", desc: "I spent a reasonable amount of time for my transaction.", val: csmSQD1, setVal: setCsmSQD1 },
                  { id: 2, label: "SQD2. Reliability", desc: "The office followed the transaction's requirements and steps.", val: csmSQD2, setVal: setCsmSQD2 },
                  { id: 3, label: "SQD3. Access & Facilities", desc: "The office location was convenient, clean, and comfortable.", val: csmSQD3, setVal: setCsmSQD3 },
                  { id: 4, label: "SQD4. Communication", desc: "The staff explained the requirements and steps clearly.", val: csmSQD4, setVal: setCsmSQD4 },
                  { id: 5, label: "SQD5. Costs", desc: "The fees paid were just and reasonable (select N/A if transaction was free).", val: csmSQD5, setVal: setCsmSQD5, showNa: true },
                  { id: 6, label: "SQD6. Integrity", desc: "The transaction was clean (no extra payment/corruption experienced).", val: csmSQD6, setVal: setCsmSQD6 },
                  { id: 7, label: "SQD7. Assurance", desc: "I felt safe and secure, and the staff was professional/courteous.", val: csmSQD7, setVal: setCsmSQD7 },
                  { id: 8, label: "SQD8. Outcome", desc: "I got what I needed from the office (or got a clear explanation).", val: csmSQD8, setVal: setCsmSQD8 }
                ].map(sqd => {
                  const ratingOptions = [
                    { rating: 1, emoji: "😠", label: "Strongly Disagree" },
                    { rating: 2, emoji: "🙁", label: "Disagree" },
                    { rating: 3, emoji: "😐", label: "Neutral" },
                    { rating: 4, emoji: "🙂", label: "Agree" },
                    { rating: 5, emoji: "😍", label: "Strongly Agree" }
                  ];

                  return (
                    <div key={sqd.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                      <div>
                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{sqd.label}</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{sqd.desc}</p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 sm:gap-2.5">
                          {ratingOptions.map(opt => (
                            <button
                              key={opt.rating}
                              type="button"
                              disabled={sqd.val === 0}
                              onClick={() => sqd.setVal(opt.rating)}
                              className={`flex flex-col items-center justify-center h-12 w-12 rounded-xl border transition-all active:scale-95 ${
                                sqd.val === opt.rating
                                  ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md scale-105'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-30'
                              }`}
                              title={opt.label}
                            >
                              <span className="text-lg leading-none">{opt.emoji}</span>
                              <span className="text-[7px] font-black uppercase mt-1 leading-none">{opt.rating}</span>
                            </button>
                          ))}
                        </div>

                        {sqd.showNa && (
                          <button
                            type="button"
                            onClick={() => sqd.setVal(sqd.val === 0 ? 5 : 0)}
                            className={`px-3 h-12 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                              sqd.val === 0
                                ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                                : 'bg-white text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Not Applicable
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <label htmlFor="csmComments" className="text-[10px] font-black uppercase tracking-wider text-slate-700">4. Comments / Suggestions (Optional)</label>
              <textarea
                id="csmComments"
                rows={3}
                placeholder="Share details of your experience or suggestions to improve our service..."
                value={csmComments}
                onChange={(e) => setCsmComments(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t pt-4">
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmittingCsm}
                onClick={() => submitCsmCheckout(true)}
                className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-750 hover:bg-slate-100 rounded-xl"
              >
                Skip Feedback & Logout
              </Button>
              <Button
                type="button"
                disabled={isSubmittingCsm || !csmAgeGroup || !csmClientType || csmCC1 === null}
                onClick={() => submitCsmCheckout(false)}
                className="w-full sm:w-auto h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white font-black uppercase tracking-widest text-[10px] px-8 rounded-xl shadow-lg transition-all"
              >
                {isSubmittingCsm ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...
                  </>
                ) : (
                  "Submit Feedback & Logout"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Thank You Overlay */}
      {logoutSuccessVisitorName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-[#D4AF37]/30 shadow-2xl rounded-3xl p-8 max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="mx-auto relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800">Thank You, {logoutSuccessVisitorName}!</h3>
              <p className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Logout Successful</p>
            </div>
            <p className="text-sm font-medium text-slate-600 leading-relaxed">
              We hope your visit was productive. Thank you for logging your checkout. Please have a safe journey back, and we hope to welcome you again soon!
            </p>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="w-full text-center z-10 border-t border-[#D4AF37]/10 pt-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/50">
          Romblon State University &bull; Educational Organization Management System
        </p>
      </div>

      <style jsx global>{`
        .bg-radial-gradient {
          background-image: radial-gradient(circle at center, #0e301b 0%, #08170e 100%);
        }
      `}</style>
    </div>
  );
}
