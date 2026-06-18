'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc, Timestamp, doc, updateDoc, query, where } from '@/firebase/firestore-wrapper';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2, 
  HelpCircle,
  Users2,
  Sparkles,
  ClipboardList,
  Loader2,
  Globe,
  LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import Image from 'next/image';

// Inner component to access search params securely in Suspense
function MobileVisitorLogbookContent() {
  const firebaseState = useFirebase();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const unitId = searchParams.get('unitId') || 'N/A';
  const campusId = searchParams.get('campusId') || 'N/A';
  const unitName = searchParams.get('unitName') || 'Office';

  const firestore = firebaseState.areServicesAvailable ? firebaseState.firestore : null;
  const currentUser = firebaseState.areServicesAvailable ? firebaseState.user : null;

  const unitCsmSettingsRef = useMemoFirebase(() => {
    if (!firestore || !unitId || unitId === 'N/A' || !currentUser) return null;
    return doc(firestore, 'unitCsmSettings', unitId);
  }, [firestore, unitId, currentUser]);

  const { data: unitCsmSettingsDoc } = useDoc<any>(unitCsmSettingsRef);

  // Fetch active employees for Visitor Logbook
  const activeEmployeesQuery = useMemoFirebase(() => {
    if (!firestore || !unitId || unitId === 'N/A' || !currentUser) return null;
    return query(
      collection(firestore, 'unitPersonnel'),
      where('unitId', '==', unitId),
      where('isActive', '==', true)
    );
  }, [firestore, unitId, currentUser]);

  const { data: activeEmployees } = useCollection<Employee>(activeEmployeesQuery);

  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Form sign in states
  const [visitorName, setVisitorName] = useState('');
  const [sex, setSex] = useState('');
  const [purpose, setPurpose] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [selectedLookingFor, setSelectedLookingFor] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Mobile Session Management
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [storedVisitorName, setStoredVisitorName] = useState<string>('');
  const [storedVisitorSex, setStoredVisitorSex] = useState<string>('');

  // ARTA CSM survey states
  const [csmLanguage, setCsmLanguage] = useState<'EN' | 'FIL'>('EN');
  const [csmSubmitted, setCsmSubmitted] = useState<boolean>(false);
  const [showSurvey, setShowSurvey] = useState<boolean>(false);
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
  const [csmSQD0, setCsmSQD0] = useState<number>(5);
  const [csmComments, setCsmComments] = useState<string>('');
  const [isSubmittingCsm, setIsSubmittingCsm] = useState<boolean>(false);
  
  const [checkoutComplete, setCheckoutComplete] = useState<boolean>(false);

  // Silent Anonymous Authentication on mount
  useEffect(() => {
    if (firebaseState.areServicesAvailable) {
      const { auth } = firebaseState;
      if (!auth.currentUser) {
        setIsAuthenticating(true);
        signInAnonymously(auth)
          .then(() => {
            setIsAuthenticating(false);
          })
          .catch((err) => {
            console.error("Anonymous authentication failed:", err);
            setAuthError(err.message || "Failed to authenticate device.");
            setIsAuthenticating(false);
          });
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [firebaseState]);

  // Load existing session from LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedId = localStorage.getItem('rsu_mobile_visitor_log_id');
      const storedName = localStorage.getItem('rsu_mobile_visitor_name');
      const storedSex = localStorage.getItem('rsu_mobile_visitor_sex');
      if (storedId) {
        setActiveLogId(storedId);
        setStoredVisitorName(storedName || 'Client');
        setStoredVisitorSex(storedSex || 'N/A');
      }
    }
  }, []);

  const t: Record<'EN' | 'FIL', any> = {
    EN: {
      profile: "1. Client Profile",
      ageGroup: "Age Group",
      ageUnder: "Below 20",
      ageOver: "65 and above",
      clientType: "Client Type",
      charter: "2. Citizen's Charter (CC)",
      cc1Q: "CC1. Which of the following best describes your awareness of a Citizen's Charter?",
      cc1Opts: [
        "I know what a Citizen's Charter is and I saw this office's charter.",
        "I know what a Citizen's Charter is but I did NOT see this office's charter.",
        "I learned of the Citizen's Charter only when I saw this office's charter.",
        "I do not know what a Citizen's Charter is and I did not see one."
      ],
      cc2Q: "CC2. How visible was the Citizen's Charter in this office?",
      cc2Opts: [
        "Easy to see",
        "Somewhat easy to see",
        "Difficult to see",
        "Not visible at all"
      ],
      cc3Q: "CC3. How much did the Citizen's Charter help you?",
      cc3Opts: [
        "Helped very much",
        "Somewhat helped",
        "Did not help"
      ],
      sqdTitle: "3. Service Quality Dimensions (SQD)",
      sqd0: "SQD0. Overall Satisfaction",
      sqd0D: "I am satisfied with the service that I availed.",
      sqd1: "SQD1. Responsiveness",
      sqd1D: "I spent a reasonable amount of time for my transaction.",
      sqd2: "SQD2. Reliability",
      sqd2D: "The office followed the transaction's requirements and steps based on the information provided.",
      sqd3: "SQD3. Access & Facilities",
      sqd3D: "The steps (including payment) I needed to do for my transaction were easy and simple.",
      sqd4: "SQD4. Communication",
      sqd4D: "I easily found information about my transaction from the office or its website.",
      sqd5: "SQD5. Costs",
      sqd5D: "I paid a reasonable amount of fees for my transaction (select N/A if transaction was free).",
      sqd6: "SQD6. Integrity",
      sqd6D: "I feel the office was fair to everyone, or 'walang palakasan', during my transaction.",
      sqd7: "SQD7. Assurance",
      sqd7D: "I was treated courteously by the staff, and (if asked for help) the staff was helpful.",
      sqd8: "SQD8. Outcome",
      sqd8D: "I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.",
      na: "Not Applicable",
      comments: "4. Comments / Suggestions (Optional)",
      commentsPlaceholder: "Share details of your experience or suggestions to improve our service...",
      skip: "Skip Feedback & Logout",
      submit: "Submit Feedback & Logout",
      submitting: "Submitting...",
      incompleteTitle: "Incomplete Survey",
      incompleteDesc: "Please answer the profile and Citizen's Charter questions, or click Skip.",
      thankYouTitle: "Thank You, {name}!",
      thankYouDesc: "We appreciate your feedback!",
      thankYouMessage: "Your satisfaction rating helps us continuously improve our services. Have a safe journey back!",
      helpUs: "Help us improve our service, {name}!"
    },
    FIL: {
      profile: "1. Profile ng Kliyente",
      ageGroup: "Grupo ng Edad",
      ageUnder: "Mababa sa 20",
      ageOver: "65 at pataas",
      clientType: "Uri ng Kliyente",
      charter: "2. Karta ng Mamamayan (Citizen's Charter)",
      cc1Q: "CC1. Alin sa mga sumusunod ang pinakamahusay na naglalarawan sa iyong kaalaman sa Citizen's Charter?",
      cc1Opts: [
        "Alam ko kung ano ang Citizen's Charter at nakita ko ang karta ng tanggapang ito.",
        "Alam ko kung ano ang Citizen's Charter ngunit HINDI ko nakita ang karta ng tanggapang ito.",
        "Nalaman ko ang tungkol sa Citizen's Charter nang makita ko ang karta ng tanggapang ito.",
        "Hindi ko alam kung ano ang Citizen's Charter at wala akong nakitang ganoon."
      ],
      cc2Q: "CC2. Gaano kadaling makita ang Citizen's Charter sa tanggapang ito?",
      cc2Opts: [
        "Madaling makita",
        "Medyo madaling makita",
        "Mahirap makita",
        "Hindi makita kahit kailan"
      ],
      cc3Q: "CC3. Gaano kalaki ang naitulong sa iyo ng Citizen's Charter?",
      cc3Opts: [
        "Napakalaki ng naitulong",
        "Medyo nakatulong",
        "Hindi nakatulong"
      ],
      sqdTitle: "3. Mga Dimensyon ng Kalidad ng Serbisyo (SQD)",
      sqd0: "SQD0. Pangkalahatang Kasiyahan",
      sqd0D: "Ako ay nasisiyahan sa serbisyong aking natanggap.",
      sqd1: "SQD1. Pagtugon (Responsiveness)",
      sqd1D: "Naglaan ako ng makatwirang oras para sa aking transaksyon.",
      sqd2: "SQD2. Maaasahan (Reliability)",
      sqd2D: "Sinunod ng tanggapan ang mga kinakailangan at hakbang ng transaksyon batay sa ibinigay na impormasyon.",
      sqd3: "SQD3. Pag-access at Pasilidad (Access & Facilities)",
      sqd3D: "Ang mga hakbang (kabilang ang pagbabayad) na kailangan kong gawin para sa aking transaksyon ay madali at simple.",
      sqd4: "SQD4. Komunikasyon (Communication)",
      sqd4D: "Madali kong natagpuan ang impormasyon tungkol sa aking transaksyon mula sa tanggapan o sa website nito.",
      sqd5: "SQD5. Gastos (Costs)",
      sqd5D: "Nagbayad ako ng makatwirang halaga ng mga bayarin para sa aking transaksyon (piliin ang N/A kung libre ang transaksyon).",
      sqd6: "SQD6. Integridad (Integrity)",
      sqd6D: "Pakiramdam ko ay patas ang tanggapan sa lahat, o 'walang palakasan', sa aking transaksyon.",
      sqd7: "SQD7. Pagtitiyak (Assurance)",
      sqd7D: "Ako ay magalang na pinakitunguhan ng mga kawani, at (kung humingi ng tulong) ang mga kawani ay nakatulong.",
      sqd8: "SQD8. Kinalabasan (Outcome)",
      sqd8D: "Nakuha ko ang kailangan ko mula sa tanggapan, o (kung tinanggihan) ang pagtanggi ay sapat na ipinaliwanag sa akin.",
      na: "Hindi Angkop (N/A)",
      comments: "4. Mga Komento / Mungkahi (Opsyonal)",
      commentsPlaceholder: "Ibahagi ang mga detalye ng iyong karanasan o mga mungkahi upang mapabuti ang aming serbisyo...",
      skip: "Laktawan at Mag-logout",
      submit: "Isumite ang Feedback at Mag-logout",
      submitting: "Ipinapadala...",
      incompleteTitle: "Hindi Kumpletong Survey",
      incompleteDesc: "Mangyaring sagutin ang profile at mga tanong sa Citizen's Charter, o i-click ang Laktawan.",
      thankYouTitle: "Maraming Salamat, {name}!",
      thankYouDesc: "Pinahahalagahan namin ang iyong feedback!",
      thankYouMessage: "Ang iyong rating sa kasiyahan ay nagtutulong sa amin na patuloy na mapabuti ang aming mga serbisyo. Mag-ingat sa iyong pag-uwi!",
      helpUs: "Tulungan kaming mapabuti ang aming serbisyo, {name}!"
    }
  };

  const getBlinkingField = () => {
    if (!csmAgeGroup) return 'ageGroup';
    if (!csmClientType) return 'clientType';
    if (csmCC1 === null) return 'cc1';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC2 === null) return 'cc2';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC3 === null) return 'cc3';
    return null;
  };

  // Submit Mobile Sign In Log
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseState.areServicesAvailable) return;
    const { firestore } = firebaseState;

    if (!visitorName.trim() || !sex || !purpose.trim() || !lookingFor.trim()) {
      toast({
        title: 'Missing Fields',
        description: 'Please complete all required fields.',
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
        unitId: unitId,
        campusId: campusId,
        unitName: unitName,
        createdAt: Timestamp.now(),
        isLoggedOut: false,
        loggedOutAt: null,
      };

      const docRef = await addDoc(collection(firestore, 'visitorLogs'), logPayload);
      
      // Save session locally to remember visitor on their phone
      localStorage.setItem('rsu_mobile_visitor_log_id', docRef.id);
      localStorage.setItem('rsu_mobile_visitor_name', visitorName.trim());
      localStorage.setItem('rsu_mobile_visitor_sex', sex);
      
      setActiveLogId(docRef.id);
      setStoredVisitorName(visitorName.trim());
      setStoredVisitorSex(sex);

      toast({
        title: 'Signed In successfully',
        description: `Welcome to ${unitName}!`,
      });
    } catch (err) {
      console.error('Error logging in visitor:', err);
      toast({
        title: 'Sign-In Failed',
        description: 'Could not record your visit. Please verify network or try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit CSM Evaluation & Sign Out
  const submitCsmCheckout = async (skip = false) => {
    if (!firebaseState.areServicesAvailable || !activeLogId) return;
    const { firestore } = firebaseState;
    
    setIsSubmittingCsm(true);
    try {
      if (!skip) {
        if (!csmAgeGroup || !csmClientType || csmCC1 === null) {
          toast({
            title: t[csmLanguage].incompleteTitle,
            description: t[csmLanguage].incompleteDesc,
            variant: 'destructive',
          });
          setIsSubmittingCsm(false);
          return;
        }

        const csmPayload = {
          visitorLogId: activeLogId,
          visitorName: storedVisitorName,
          sex: storedVisitorSex,
          ageGroup: csmAgeGroup,
          clientType: csmClientType,
          campusId: campusId,
          unitId: unitId,
          unitName: unitName,
          purpose: purpose || 'Mobile Kiosk',
          
          cc1: Number(csmCC1),
          cc2: csmCC2 !== null ? Number(csmCC2) : 5,
          cc3: csmCC3 !== null ? Number(csmCC3) : 4,
          
          sqd1: Number(csmSQD1),
          sqd2: Number(csmSQD2),
          sqd3: Number(csmSQD3),
          sqd4: Number(csmSQD4),
          sqd5: Number(csmSQD5),
          sqd6: Number(csmSQD6),
          sqd7: Number(csmSQD7),
          sqd8: Number(csmSQD8),
          sqd0: Number(csmSQD0),
          
          comments: csmComments.trim(),
          createdAt: Timestamp.now(),
        };

        await addDoc(collection(firestore, 'csmResponses'), csmPayload);
      }

      // Mark the visitor logs as checked out
      await updateDoc(doc(firestore, 'visitorLogs', activeLogId), {
        isLoggedOut: true,
        loggedOutAt: Timestamp.now(),
      });

      setCsmSubmitted(!skip);
      setCheckoutComplete(true);
      
      // Clear mobile session
      localStorage.removeItem('rsu_mobile_visitor_log_id');
      localStorage.removeItem('rsu_mobile_visitor_name');
      localStorage.removeItem('rsu_mobile_visitor_sex');
      
      toast({
        title: skip ? 'Logged Out successfully' : 'Feedback Submitted',
        description: skip 
          ? 'Have a safe journey back!' 
          : 'Thank you for your valuable feedback!',
      });
    } catch (err) {
      console.error('Checkout error:', err);
      toast({
        title: 'Action Failed',
        description: 'Failed to record checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCsm(false);
    }
  };

  const resetPage = () => {
    setActiveLogId(null);
    setVisitorName('');
    setSex('');
    setPurpose('');
    setLookingFor('');
    setSelectedLookingFor('');
    setCheckoutComplete(false);
    setShowSurvey(false);
    setCsmAgeGroup('');
    setCsmClientType('');
    setCsmCC1(null);
    setCsmCC2(null);
    setCsmCC3(null);
    setCsmComments('');
  };

  // Render Loader if initializing
  if (!firebaseState.areServicesAvailable || isAuthenticating) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0d2a18] p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Initializing Secure Mobile Portal...</p>
        </div>
      </div>
    );
  }

  // Render Authentication Error
  if (authError) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0d2a18] p-4 text-center">
        <div className="bg-white rounded-3xl p-6 border border-rose-200 max-w-sm space-y-4">
          <h2 className="text-xl font-black text-rose-600 uppercase">Authentication Error</h2>
          <p className="text-slate-600 text-sm">{authError}</p>
          <p className="text-xs text-slate-400">Please scan the QR code again or connect to the internet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#0d2a18] bg-radial-gradient flex flex-col justify-between overflow-x-hidden p-4">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 -left-1/4 w-[300px] h-[300px] bg-[#1B6535]/20 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-0 -right-1/4 w-[300px] h-[300px] bg-[#D4AF37]/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Header section */}
      <div className="w-full flex flex-col items-center text-center mt-4 space-y-3 z-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-[10px] font-black uppercase tracking-widest">
          <Sparkles className="h-3 w-3" /> Romblon State University
        </span>
        <h1 className="text-2xl font-black uppercase text-white tracking-tight leading-tight">
          Mobile <span className="text-[#D4AF37]">Logbook</span>
        </h1>
        <p className="text-slate-350 text-xs font-semibold">
          Signing into: <span className="text-[#D4AF37] font-extrabold">{unitName.toUpperCase()}</span>
        </p>
      </div>

      {/* Main card panel */}
      <div className="w-full max-w-md mx-auto my-6 z-10 flex-1 flex flex-col justify-center">
        
        {/* CHECKOUT THANK YOU VIEW */}
        {checkoutComplete ? (
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden text-center py-8 px-6 space-y-6">
            <div className="mx-auto relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tight text-[#1B6535]">
                {csmSubmitted ? t[csmLanguage].thankYouTitle.replace('{name}', storedVisitorName) : `Thank You, ${storedVisitorName}!`}
              </h3>
              <p className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">
                {csmSubmitted ? t[csmLanguage].thankYouDesc : 'Checkout Successful'}
              </p>
            </div>
            
            <p className="text-sm font-bold text-slate-600 leading-relaxed">
              {csmSubmitted 
                ? t[csmLanguage].thankYouMessage 
                : 'We hope your visit was productive. Thank you for logging your checkout. Have a safe journey back!'}
            </p>
            
            <div className="pt-2">
              <Button
                onClick={resetPage}
                className="w-full h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all duration-150"
              >
                Sign In Again
              </Button>
            </div>
          </Card>
        ) : activeLogId ? (
          /* ACTIVE LOGGED-IN SESSION PANEL: PROMPT CHECKOUT */
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden p-6 space-y-6">
            
            {!showSurvey ? (
              <div className="text-center py-6 space-y-6">
                <div className="h-16 w-16 bg-[#1B6535]/10 rounded-full flex items-center justify-center mx-auto text-[#1B6535]">
                  <Users2 className="h-8 w-8" />
                </div>
                
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#D4AF37] border border-[#D4AF37]/30 px-2 py-0.5 rounded bg-[#D4AF37]/5">Active Session</span>
                  <h3 className="text-xl font-black text-slate-800 uppercase pt-2">Welcome, {storedVisitorName}!</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">You are currently logged into {unitName}</p>
                </div>

                <p className="text-xs font-semibold text-slate-650 leading-relaxed px-4">
                  When you have completed your transaction, please click the button below to sign out and rate our service quality.
                </p>

                <div className="space-y-3 pt-4">
                  <Button
                    onClick={() => setShowSurvey(true)}
                    className="w-full h-14 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-xl font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <LogOut className="h-5 w-5" /> Proceed to Logout
                  </Button>
                </div>
              </div>
            ) : (
              /* ARTA CSM SURVEY QUESTIONNAIRE MOBILE */
              <div className="space-y-6 text-left max-h-[75vh] overflow-y-auto pr-1">
                
                {/* Survey Header */}
                <div className="border-b pb-4 flex flex-col gap-2">
                  <h2 className="text-lg font-black uppercase text-[#1B6535] leading-snug">
                    {csmLanguage === 'EN' ? 'Client Satisfaction Survey' : 'Pagsukat ng Kasiyahan'}
                  </h2>
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-start">
                    <button
                      type="button"
                      onClick={() => setCsmLanguage('EN')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        csmLanguage === 'EN' ? 'bg-white text-[#1B6535] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      onClick={() => setCsmLanguage('FIL')}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        csmLanguage === 'FIL' ? 'bg-white text-[#1B6535] shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      Tagalog
                    </button>
                  </div>
                </div>

                {/* 1. Client Profile */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                    {t[csmLanguage].profile}
                  </h3>
                  
                  {/* Age Group */}
                  <div className={`space-y-2 p-2 rounded-xl border transition-all ${
                    getBlinkingField() === 'ageGroup' ? 'border-[#D4AF37] bg-amber-50/10' : 'border-transparent'
                  }`}>
                    <label className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1">
                      {t[csmLanguage].ageGroup} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Below 20', '20-34', '35-49', '50-64', '65 and above'].map(age => (
                        <button
                          key={age}
                          type="button"
                          onClick={() => setCsmAgeGroup(age)}
                          className={`py-2 px-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider text-center transition-all ${
                            csmAgeGroup === age
                              ? 'bg-[#1B6535] text-white border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {age === 'Below 20' ? t[csmLanguage].ageUnder : age === '65 and above' ? t[csmLanguage].ageOver : age}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Client Type */}
                  <div className={`space-y-2 p-2 rounded-xl border transition-all ${
                    getBlinkingField() === 'clientType' ? 'border-[#D4AF37] bg-amber-50/10' : 'border-transparent'
                  }`}>
                    <label className="text-[11px] font-black uppercase text-slate-700 flex items-center gap-1">
                      {t[csmLanguage].clientType} <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Student', 'Parents', 'Government Employees', 'Internal Employees', 'Citizens', 'Others'].map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setCsmClientType(type)}
                          className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider text-center transition-all ${
                            csmClientType === type
                              ? 'bg-[#1B6535] text-white border-[#1B6535]'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. Citizen's Charter */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                    {t[csmLanguage].charter}
                  </h3>
                  
                  {/* CC1 */}
                  <div className={`space-y-2 p-3 rounded-xl border transition-all ${
                    getBlinkingField() === 'cc1' ? 'border-[#D4AF37] bg-amber-50/10' : 'border-transparent'
                  }`}>
                    <p className="text-xs font-black text-slate-800 leading-snug">
                      {t[csmLanguage].cc1Q} <span className="text-rose-500">*</span>
                    </p>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {[
                        { val: 1, label: t[csmLanguage].cc1Opts[0] },
                        { val: 2, label: t[csmLanguage].cc1Opts[1] },
                        { val: 3, label: t[csmLanguage].cc1Opts[2] },
                        { val: 4, label: t[csmLanguage].cc1Opts[3] }
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
                          className={`text-left p-3 rounded-lg border text-xs font-semibold leading-relaxed transition-all ${
                            csmCC1 === opt.val
                              ? 'bg-[#1B6535]/10 text-[#1B6535] border-[#1B6535] font-bold'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CC2 & CC3 */}
                  {(csmCC1 === 1 || csmCC1 === 3) && (
                    <div className="space-y-4 pt-1">
                      {/* CC2 */}
                      <div className={`space-y-2 p-2 rounded-xl border transition-all ${
                        getBlinkingField() === 'cc2' ? 'border-[#D4AF37] bg-amber-50/10' : 'border-transparent'
                      }`}>
                        <p className="text-xs font-black text-slate-800 leading-snug">
                          {t[csmLanguage].cc2Q} <span className="text-rose-500">*</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {[
                            { val: 1, label: t[csmLanguage].cc2Opts[0] },
                            { val: 2, label: t[csmLanguage].cc2Opts[1] },
                            { val: 3, label: t[csmLanguage].cc2Opts[2] },
                            { val: 4, label: t[csmLanguage].cc2Opts[3] }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setCsmCC2(opt.val)}
                              className={`text-left p-2 rounded-lg border text-[10px] font-semibold leading-tight transition-all ${
                                csmCC2 === opt.val
                                  ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535] font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* CC3 */}
                      <div className={`space-y-2 p-2 rounded-xl border transition-all ${
                        getBlinkingField() === 'cc3' ? 'border-[#D4AF37] bg-amber-50/10' : 'border-transparent'
                      }`}>
                        <p className="text-xs font-black text-slate-800 leading-snug">
                          {t[csmLanguage].cc3Q} <span className="text-rose-500">*</span>
                        </p>
                        <div className="grid grid-cols-1 gap-2 pt-1">
                          {[
                            { val: 1, label: t[csmLanguage].cc3Opts[0] },
                            { val: 2, label: t[csmLanguage].cc3Opts[1] },
                            { val: 3, label: t[csmLanguage].cc3Opts[2] }
                          ].map(opt => (
                            <button
                              key={opt.val}
                              type="button"
                              onClick={() => setCsmCC3(opt.val)}
                              className={`text-left p-2.5 rounded-lg border text-xs font-semibold leading-relaxed transition-all ${
                                csmCC3 === opt.val
                                  ? 'bg-[#1B6535]/15 text-[#1B6535] border-[#1B6535] font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
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

                {/* 3. Service Quality Dimensions */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
                    {t[csmLanguage].sqdTitle}
                  </h3>
                  
                  <div className="space-y-4">
                    {[
                      { id: 0, label: t[csmLanguage].sqd0, desc: t[csmLanguage].sqd0D, val: csmSQD0, setVal: setCsmSQD0 },
                      { id: 2, label: t[csmLanguage].sqd2, desc: t[csmLanguage].sqd2D, val: csmSQD2, setVal: setCsmSQD2 },
                      { id: 3, label: t[csmLanguage].sqd3, desc: t[csmLanguage].sqd3D, val: csmSQD3, setVal: setCsmSQD3 },
                      { id: 4, label: t[csmLanguage].sqd4, desc: t[csmLanguage].sqd4D, val: csmSQD4, setVal: setCsmSQD4 },
                      { id: 5, label: t[csmLanguage].sqd5, desc: t[csmLanguage].sqd5D, val: csmSQD5, setVal: setCsmSQD5, showNa: true },
                      { id: 6, label: t[csmLanguage].sqd6, desc: t[csmLanguage].sqd6D, val: csmSQD6, setVal: setCsmSQD6 },
                      { id: 7, label: t[csmLanguage].sqd7, desc: t[csmLanguage].sqd7D, val: csmSQD7, setVal: setCsmSQD7 },
                      { id: 8, label: t[csmLanguage].sqd8, desc: t[csmLanguage].sqd8D, val: csmSQD8, setVal: setCsmSQD8 }
                    ].map(sqd => {
                      const ratingOptions = [
                        { rating: 1, emoji: "😠" },
                        { rating: 2, emoji: "🙁" },
                        { rating: 3, emoji: "😐" },
                        { rating: 4, emoji: "🙂" },
                        { rating: 5, emoji: "😍" }
                      ];

                      return (
                        <div key={sqd.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5">
                          <div>
                            <p className="text-[11px] font-black text-slate-800 uppercase leading-snug">{sqd.label}</p>
                            <p className="text-[10px] font-semibold text-slate-500 leading-tight mt-0.5">{sqd.desc}</p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-1">
                              {ratingOptions.map(opt => (
                                <button
                                  key={opt.rating}
                                  type="button"
                                  disabled={sqd.val === 0}
                                  onClick={() => sqd.setVal(opt.rating)}
                                  className={`flex flex-col items-center justify-center py-2.5 flex-1 rounded-xl border transition-all ${
                                    sqd.val === opt.rating
                                      ? 'bg-[#1B6535] text-white border-[#1B6535]'
                                      : 'bg-white text-slate-700 border-slate-200 disabled:opacity-20'
                                  }`}
                                >
                                  <span className="text-xl leading-none">{opt.emoji}</span>
                                  <span className="text-[8px] font-bold mt-1 leading-none">{opt.rating}</span>
                                </button>
                              ))}
                            </div>

                            {sqd.showNa && (
                              <button
                                type="button"
                                onClick={() => sqd.setVal(sqd.val === 0 ? 5 : 0)}
                                className={`px-2.5 py-3.5 rounded-xl border text-[9px] font-black uppercase transition-all shrink-0 ${
                                  sqd.val === 0
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white text-slate-650 border-slate-200'
                                }`}
                              >
                                {t[csmLanguage].na}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Comments */}
                <div className="space-y-1.5">
                  <label htmlFor="csmComments" className="text-[11px] font-black uppercase text-slate-700">
                    {t[csmLanguage].comments}
                  </label>
                  <textarea
                    id="csmComments"
                    rows={2}
                    placeholder={t[csmLanguage].commentsPlaceholder}
                    value={csmComments}
                    onChange={(e) => setCsmComments(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 transition-all"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    disabled={isSubmittingCsm || !csmAgeGroup || !csmClientType || csmCC1 === null}
                    onClick={() => submitCsmCheckout(false)}
                    className="w-full h-12 bg-gradient-to-r from-[#1B6535] to-[#247e43] text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all"
                  >
                    {isSubmittingCsm ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> {t[csmLanguage].submitting}
                      </>
                    ) : (
                      t[csmLanguage].submit
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isSubmittingCsm}
                    onClick={() => submitCsmCheckout(true)}
                    className="text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 py-2.5 rounded-xl"
                  >
                    {t[csmLanguage].skip}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ) : (
          /* MOBILE VISITOR SIGN IN FORM */
          <Card className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <ClipboardList className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-800">Sign In Form</CardTitle>
                  <CardDescription className="text-slate-500 text-[10px] font-bold uppercase leading-none mt-0.5">Please provide your details</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4 text-left">
                {/* Visitor Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="visitorName" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Your Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      id="visitorName"
                      type="text"
                      placeholder="e.g. Juan D. Dela Cruz"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      required
                      className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Sex */}
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Sex
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSex('Male')}
                      className={`h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-[0.98] ${
                        sex === 'Male'
                          ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md shadow-[#1B6535]/15'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('Female')}
                      className={`h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-[0.98] ${
                        sex === 'Female'
                          ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md shadow-[#1B6535]/15'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Female
                    </button>
                    <button
                      type="button"
                      onClick={() => setSex('LGBTQA+')}
                      className={`h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all active:scale-[0.98] ${
                        sex === 'LGBTQA+'
                          ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md shadow-[#1B6535]/15'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      LGBTQA+
                    </button>
                  </div>
                </div>

                {/* Purpose of Visit */}
                <div className="space-y-1.5">
                  {unitCsmSettingsDoc?.services && unitCsmSettingsDoc.services.length > 0 ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="purposeSelect" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        Purpose of Visit
                      </Label>
                      <div className="relative">
                        <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <select
                          id="purposeSelect"
                          value={selectedService}
                          onChange={(e) => {
                            setSelectedService(e.target.value);
                            if (e.target.value !== 'Others') {
                              setPurpose(e.target.value);
                            } else {
                              setPurpose('');
                            }
                          }}
                          required
                          className="w-full h-11 px-3 pl-9 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold text-xs uppercase"
                        >
                          <option value="">-- SELECT PURPOSE --</option>
                          {unitCsmSettingsDoc.services.map((svc: string) => (
                            <option key={svc} value={svc}>{svc.toUpperCase()}</option>
                          ))}
                          <option value="Others">OTHERS (PLEASE SPECIFY)</option>
                        </select>
                      </div>
                      
                      {selectedService === 'Others' && (
                        <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-2 duration-300">
                          <Label htmlFor="customPurpose" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                            Please specify your purpose
                          </Label>
                          <div className="relative">
                            <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <Input
                              id="customPurpose"
                              type="text"
                              placeholder="e.g. Document submission, Inquiry"
                              value={purpose}
                              onChange={(e) => setPurpose(e.target.value)}
                              required
                              className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-600"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label htmlFor="purpose" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                        Purpose of Visit
                      </Label>
                      <div className="relative">
                        <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="purpose"
                          type="text"
                          placeholder="e.g. Document submission, Inquiry"
                          value={purpose}
                          onChange={(e) => setPurpose(e.target.value)}
                          required
                          className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-600"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Looking For */}
                <div className="space-y-1.5">
                  <Label htmlFor="lookingForSelect" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                    Who are you looking for?
                  </Label>
                  <div className="relative">
                    <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    {activeEmployees && activeEmployees.length > 0 ? (
                      <div className="space-y-2 w-full">
                        <select
                          id="lookingForSelect"
                          value={selectedLookingFor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedLookingFor(val);
                            if (val !== 'Others') {
                              setLookingFor(val);
                            } else {
                              setLookingFor('');
                            }
                          }}
                          required
                          className="w-full h-11 px-3 pl-9 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600 font-bold text-xs uppercase"
                        >
                          <option value="">-- SELECT PERSONNEL --</option>
                          {activeEmployees.sort((a, b) => a.name.localeCompare(b.name)).map((emp: Employee) => (
                            <option key={emp.id} value={emp.name}>{emp.name.toUpperCase()} ({emp.type.toUpperCase()})</option>
                          ))}
                          <option value="Others">OTHERS (PLEASE SPECIFY)</option>
                        </select>

                        {selectedLookingFor === 'Others' && (
                          <div className="space-y-1.5 pt-2 animate-in slide-in-from-top-2 duration-300">
                            <Label htmlFor="customLookingFor" className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                              Please specify the person you are looking for
                            </Label>
                            <div className="relative">
                              <Users2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                              <Input
                                id="customLookingFor"
                                type="text"
                                placeholder="e.g. Sarah Jane Fallaria, Office Head"
                                value={lookingFor}
                                onChange={(e) => setLookingFor(e.target.value)}
                                required
                                className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-600 font-bold text-xs uppercase"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Input
                        id="lookingFor"
                        type="text"
                        placeholder="e.g. Office Head, Staff Name"
                        value={lookingFor}
                        onChange={(e) => setLookingFor(e.target.value)}
                        required
                        className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-1 focus-visible:ring-emerald-600"
                      />
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-11 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] text-white border border-[#D4AF37]/20 rounded-xl font-black uppercase tracking-widest text-xs shadow-md"
                  >
                    {isSubmitting ? 'Recording...' : 'Submit Entry'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer copyright */}
      <div className="w-full text-center z-10 border-t border-[#D4AF37]/10 pt-4 mt-auto">
        <p className="text-[8px] font-black uppercase tracking-widest text-[#D4AF37]/50">
          Romblon State University | Quality Assurance Office | Institutional Planning and Development Office (IPDO) | Center for Research in Artificial Intelligence and Information Technologies (CRAIITech)
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

export default function MobileVisitorLogbookPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-[#0d2a18] p-4 text-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
          <p className="text-sm font-bold uppercase tracking-widest text-[#D4AF37]">Loading Portal Context...</p>
        </div>
      </div>
    }>
      <MobileVisitorLogbookContent />
    </Suspense>
  );
}
