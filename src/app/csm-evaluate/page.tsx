'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc, Timestamp, doc } from '@/firebase/firestore-wrapper';
import type { Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, User, HelpCircle, Users2, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';

function CsmEvaluateContent() {
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

  const [isAuthenticating, setIsAuthenticating] = useState(true);

  const [csmLanguage, setCsmLanguage] = useState<'EN' | 'FIL'>('EN');
  const [csmSubmitted, setCsmSubmitted] = useState(false);

  const [visitorName, setVisitorName] = useState('');
  const [sex, setSex] = useState('');
  const [purpose, setPurpose] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [csmAgeGroup, setCsmAgeGroup] = useState('');
  const [csmClientType, setCsmClientType] = useState('');
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
  const [csmComments, setCsmComments] = useState('');
  const [isSubmittingCsm, setIsSubmittingCsm] = useState(false);

  useEffect(() => {
    if (firebaseState.areServicesAvailable) {
      const { auth } = firebaseState;
      if (!auth.currentUser) {
        setIsAuthenticating(true);
        signInAnonymously(auth)
          .then(() => setIsAuthenticating(false))
          .catch(() => setIsAuthenticating(false));
      } else {
        setIsAuthenticating(false);
      }
    }
  }, [firebaseState]);

  const t: Record<'EN' | 'FIL', any> = {
    EN: {
      pageTitle: 'Client Satisfaction Measurement (CSM)',
      pageDesc: 'Help us improve our service!',
      name: 'Your Full Name',
      namePlaceholder: 'e.g. Juan D. Dela Cruz',
      sex: 'Sex',
      purpose: 'Purpose of Visit',
      purposePlaceholder: 'e.g. Document submission, Inquiry',
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
      submit: "Submit Feedback",
      submitting: "Submitting...",
      incompleteTitle: "Incomplete Survey",
      incompleteDesc: "Please answer all required fields.",
      thankYouTitle: "Thank You, {name}!",
      thankYouDesc: "We appreciate your feedback!",
      thankYouMessage: "Your satisfaction rating helps us continuously improve our services.",
      required: "Required"
    },
    FIL: {
      pageTitle: 'Pagsukat ng Kasiyahan ng Kliyente (CSM)',
      pageDesc: 'Tulungan kaming mapabuti ang aming serbisyo!',
      name: 'Iyong Buong Pangalan',
      namePlaceholder: 'Hal. Juan D. Dela Cruz',
      sex: 'Kasarian',
      purpose: 'Layunin ng Pagbisita',
      purposePlaceholder: 'Hal. Pagsusumite ng dokumento, Pagtatanong',
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
      submit: "Isumite ang Feedback",
      submitting: "Ipinapadala...",
      incompleteTitle: "Hindi Kumpletong Survey",
      incompleteDesc: "Mangyaring sagutin ang lahat ng kinakailangang field.",
      thankYouTitle: "Maraming Salamat, {name}!",
      thankYouDesc: "Pinahahalagahan namin ang iyong feedback!",
      thankYouMessage: "Ang iyong rating sa kasiyahan ay nagtutulong sa amin na patuloy na mapabuti ang aming mga serbisyo.",
      required: "Kinakailangan"
    }
  };

  const getBlinkingField = () => {
    if (!visitorName.trim()) return 'name';
    if (!sex) return 'sex';
    if (!csmAgeGroup) return 'ageGroup';
    if (!csmClientType) return 'clientType';
    if (csmCC1 === null) return 'cc1';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC2 === null) return 'cc2';
    if ((csmCC1 === 1 || csmCC1 === 3) && csmCC3 === null) return 'cc3';
    return null;
  };

  const submitCsm = async () => {
    if (!firebaseState.areServicesAvailable) return;
    const { firestore } = firebaseState;

    if (!visitorName.trim() || !sex || !csmAgeGroup || !csmClientType || csmCC1 === null) {
      toast({
        title: t[csmLanguage].incompleteTitle,
        description: t[csmLanguage].incompleteDesc,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingCsm(true);
    try {
      const csmPayload = {
        visitorLogId: 'online',
        visitorName: visitorName.trim(),
        sex: sex,
        ageGroup: csmAgeGroup,
        clientType: csmClientType,
        campusId: campusId,
        unitId: unitId,
        unitName: decodeURIComponent(unitName),
        purpose: selectedService || purpose || 'Online CSM',
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
        source: 'online',
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(firestore, 'csmResponses'), csmPayload);

      setCsmSubmitted(true);
      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your valuable feedback!',
      });
    } catch (err) {
      console.error('CSM submission error:', err);
      toast({
        title: 'Submission Failed',
        description: 'Unable to submit feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingCsm(false);
    }
  };

  if (isAuthenticating) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative h-16 w-16 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-[#D4AF37]">Loading CSM Evaluation...</p>
        </div>
      </div>
    );
  }

  if (csmSubmitted) {
    return (
      <div className="min-h-screen w-full bg-[#0d2a18] flex items-center justify-center p-4">
        <div className="bg-white border border-[#D4AF37]/30 shadow-2xl rounded-3xl p-8 max-w-lg w-full text-center space-y-6 animate-in zoom-in-95 duration-300">
          <div className="mx-auto relative flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-3xl font-black uppercase tracking-tight text-[#1B6535]">
              {t[csmLanguage].thankYouTitle.replace('{name}', visitorName)}
            </h3>
            <p className="text-xs font-black text-[#D4AF37] uppercase tracking-[0.2em]">
              {t[csmLanguage].thankYouDesc}
            </p>
          </div>
          <p className="text-base font-semibold text-slate-600 leading-relaxed">
            {t[csmLanguage].thankYouMessage}
          </p>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            {decodeURIComponent(unitName)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0d2a18] bg-radial-gradient p-4 md:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-[#D4AF37]/20 rounded-3xl p-6 text-center space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Image src="/rsulogo.png" alt="RSU Logo" width={80} height={80} className="object-contain shrink-0 animate-pulse-glow" />
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white text-center flex-1 leading-tight">
              {t[csmLanguage].pageTitle}
            </h1>
            <Image src="/ISOlogo.jpg" alt="ISO Logo" width={216} height={80} className="object-contain shrink-0 animate-pulse-glow" style={{ objectPosition: 'center' }} />
          </div>
          <p className="text-sm font-bold text-emerald-400 uppercase tracking-widest">
            {decodeURIComponent(unitName)}
          </p>
          <p className="text-xs text-slate-300 font-medium">
            {t[csmLanguage].pageDesc}
          </p>
          {/* Language Toggle */}
          <div className="flex justify-center">
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-slate-700/50">
              <button
                type="button"
                onClick={() => setCsmLanguage('EN')}
                className={`px-5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  csmLanguage === 'EN'
                    ? 'bg-white text-[#1B6535] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setCsmLanguage('FIL')}
                className={`px-5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  csmLanguage === 'FIL'
                    ? 'bg-white text-[#1B6535] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tagalog
              </button>
            </div>
          </div>
        </div>

        {/* Survey Form */}
        <div className="bg-white border border-[#D4AF37]/20 shadow-2xl rounded-3xl p-6 md:p-8 space-y-6">
          {/* Visitor Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
              Visitor Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  {t[csmLanguage].name} <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder={t[csmLanguage].namePlaceholder}
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                  {t[csmLanguage].sex} <span className="text-rose-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {['Male', 'Female', 'LGBTQA+'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSex(opt)}
                      className={`h-11 rounded-xl font-bold text-xs uppercase tracking-widest border transition-all ${
                        sex === opt
                          ? 'bg-[#1B6535] text-white border-[#1B6535]'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                {t[csmLanguage].purpose}
              </Label>
              <div className="relative">
                <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                {unitCsmSettingsDoc?.services && unitCsmSettingsDoc.services.length > 0 ? (
                  <select
                    value={selectedService}
                    onChange={(e) => {
                      setSelectedService(e.target.value);
                      if (e.target.value !== 'Others') setPurpose(e.target.value);
                      else setPurpose('');
                    }}
                    className="w-full h-12 px-3 pl-11 bg-slate-50 border border-slate-200 text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-bold text-xs uppercase"
                  >
                    <option value="">-- SELECT SERVICE --</option>
                    {unitCsmSettingsDoc.services.map((svc: string) => (
                      <option key={svc} value={svc}>{svc.toUpperCase()}</option>
                    ))}
                    <option value="Others">OTHERS</option>
                  </select>
                ) : (
                  <Input
                    type="text"
                    placeholder={t[csmLanguage].purposePlaceholder}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600"
                  />
                )}
              </div>
              {selectedService === 'Others' && (
                <Input
                  type="text"
                  placeholder={t[csmLanguage].purposePlaceholder}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="h-12 bg-slate-50 border-slate-200 text-slate-900 rounded-xl focus-visible:ring-2 focus-visible:ring-emerald-600"
                />
              )}
            </div>
          </div>

          {/* Profile Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
              {t[csmLanguage].profile}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                getBlinkingField() === 'ageGroup' ? 'animate-blink-border' : 'border-transparent'
              }`}>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  {t[csmLanguage].ageGroup} <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Below 20', '20-34', '35-49', '50-64', '65 and above'].map(age => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => setCsmAgeGroup(age)}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${
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

              <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                getBlinkingField() === 'clientType' ? 'animate-blink-border' : 'border-transparent'
              }`}>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                  {t[csmLanguage].clientType} <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Student', 'Parents', 'Government Employees', 'Internal Employees', 'Citizens', 'Others'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCsmClientType(type)}
                      className={`px-4 py-2 rounded-xl border text-sm font-bold uppercase tracking-wide transition-all ${
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
          </div>

          {/* Citizen's Charter */}
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
              {t[csmLanguage].charter}
            </h3>

            <div className={`space-y-2 p-4 rounded-2xl border transition-all ${
              getBlinkingField() === 'cc1' ? 'animate-blink-border' : 'border-transparent'
            }`}>
              <p className="text-sm font-black text-slate-800">
                {t[csmLanguage].cc1Q} <span className="text-rose-500">*</span>
              </p>
              <div className="grid grid-cols-1 gap-2">
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
                    className={`text-left p-3.5 rounded-xl border text-sm font-bold transition-all ${
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

            {(csmCC1 === 1 || csmCC1 === 3) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                  getBlinkingField() === 'cc2' ? 'animate-blink-border' : 'border-transparent'
                }`}>
                  <p className="text-sm font-black text-slate-800">
                    {t[csmLanguage].cc2Q} <span className="text-rose-500">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
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
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
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

                <div className={`space-y-2 p-3 rounded-2xl border transition-all ${
                  getBlinkingField() === 'cc3' ? 'animate-blink-border' : 'border-transparent'
                }`}>
                  <p className="text-sm font-black text-slate-800">
                    {t[csmLanguage].cc3Q} <span className="text-rose-500">*</span>
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      { val: 1, label: t[csmLanguage].cc3Opts[0] },
                      { val: 2, label: t[csmLanguage].cc3Opts[1] },
                      { val: 3, label: t[csmLanguage].cc3Opts[2] }
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setCsmCC3(opt.val)}
                        className={`text-left px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
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
            <h3 className="text-sm font-black uppercase text-[#D4AF37] tracking-wider border-b pb-1">
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
                  { rating: 1, emoji: "😠", label: csmLanguage === 'EN' ? "Strongly Disagree" : "Lubos na Sumasalungat" },
                  { rating: 2, emoji: "🙁", label: csmLanguage === 'EN' ? "Disagree" : "Sumasalungat" },
                  { rating: 3, emoji: "😐", label: csmLanguage === 'EN' ? "Neutral" : "Walang Pinapanigan" },
                  { rating: 4, emoji: "🙂", label: csmLanguage === 'EN' ? "Agree" : "Sumasang-ayon" },
                  { rating: 5, emoji: "😍", label: csmLanguage === 'EN' ? "Strongly Agree" : "Lubos na Sumasang-ayon" }
                ];

                return (
                  <div key={sqd.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div>
                      <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{sqd.label}</p>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{sqd.desc}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 sm:gap-2.5">
                        {ratingOptions.map(opt => (
                          <button
                            key={opt.rating}
                            type="button"
                            disabled={sqd.val === 0}
                            onClick={() => sqd.setVal(opt.rating)}
                            className={`flex flex-col items-center justify-center h-14 w-14 sm:h-16 sm:w-16 rounded-2xl border transition-all active:scale-95 ${
                              sqd.val === opt.rating
                                ? 'bg-[#1B6535] text-white border-[#1B6535] shadow-md scale-105'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 disabled:opacity-30'
                            }`}
                            title={opt.label}
                          >
                            <span className="text-2xl sm:text-3xl leading-none">{opt.emoji}</span>
                            <span className="text-[8px] font-black uppercase mt-1 leading-none">{opt.rating}</span>
                          </button>
                        ))}
                      </div>

                      {sqd.showNa && (
                        <button
                          type="button"
                          onClick={() => sqd.setVal(sqd.val === 0 ? 5 : 0)}
                          className={`px-3 h-14 sm:h-16 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                            sqd.val === 0
                              ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
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
          <div className="space-y-2">
            <label htmlFor="csmComments" className="text-xs font-black uppercase tracking-wider text-slate-700">
              {t[csmLanguage].comments}
            </label>
            <textarea
              id="csmComments"
              rows={3}
              placeholder={t[csmLanguage].commentsPlaceholder}
              value={csmComments}
              onChange={(e) => setCsmComments(e.target.value)}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            />
          </div>

          {/* Submit */}
          <div className="border-t pt-4">
            <Button
              type="button"
              disabled={isSubmittingCsm}
              onClick={submitCsm}
              className="w-full h-14 bg-gradient-to-r from-[#1B6535] to-[#247e43] hover:from-[#1B6535] hover:to-[#1a5d31] text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg"
            >
              {isSubmittingCsm ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t[csmLanguage].submitting}</>
              ) : (
                t[csmLanguage].submit
              )}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#D4AF37]/50">
            Romblon State University | Client Satisfaction Monitoring
          </p>
        </div>
      </div>

      <style jsx global>{`
        .bg-radial-gradient {
          background-image: radial-gradient(circle at center, #0e301b 0%, #08170e 100%);
        }
        @keyframes border-blink {
          0%, 100% { border-color: #D4AF37; box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.4); }
          50% { border-color: #e2e8f0; box-shadow: 0 0 0 4px transparent; }
        }
        .animate-blink-border {
          animation: border-blink 1.2s infinite;
          border-width: 2px !important;
          border-style: solid !important;
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 4px rgba(212, 175, 55, 0.2)); }
          50% { opacity: 1; filter: drop-shadow(0 0 12px rgba(212, 175, 55, 0.5)); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function CsmEvaluatePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#0d2a18]">
        <div className="relative h-16 w-16 rounded-full border-4 border-[#D4AF37] border-t-transparent animate-spin" />
      </div>
    }>
      <CsmEvaluateContent />
    </Suspense>
  );
}
