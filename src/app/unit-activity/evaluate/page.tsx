'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from '@/firebase/firestore-wrapper';
import { Star, ArrowRight, Home, CheckCircle2, Loader2, Sparkles, User, MessageSquare, Phone, Lock, Building2, Calendar, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { AttendanceActivity } from '@/lib/types';
import { cn } from '@/lib/utils';

function StarRating({ 
  value, 
  onChange, 
  label 
}: { 
  value: number; 
  onChange: (val: number) => void; 
  label: string;
}) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">{label}</Label>
      <div className="flex gap-2 items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="transition-all hover:scale-125 focus:outline-none"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHoverVal(star)}
            onMouseLeave={() => setHoverVal(null)}
          >
            <Star
              className={cn(
                "h-8 w-8 cursor-pointer transition-colors duration-150",
                (hoverVal !== null ? star <= hoverVal : star <= value)
                  ? "fill-amber-400 text-amber-400 drop-shadow-md"
                  : "text-slate-300 hover:text-amber-200"
              )}
            />
          </button>
        ))}
        <span className="ml-2 text-xs font-black uppercase text-amber-600 tracking-widest bg-amber-50 px-2.5 py-1 rounded-lg">
          {value === 5 ? 'Excellent' : value === 4 ? 'Very Satisfactory' : value === 3 ? 'Satisfactory' : value === 2 ? 'Fair' : value === 1 ? 'Poor' : 'Rate'}
        </span>
      </div>
    </div>
  );
}

function EvaluationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { toast } = useToast();

  const activityId = searchParams.get('activityId');
  const [activity, setActivity] = useState<AttendanceActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [office, setOffice] = useState('');
  const [position, setPosition] = useState('');
  const [ratingObjectives, setRatingObjectives] = useState(0);
  const [ratingSpeaker, setRatingSpeaker] = useState(0);
  const [ratingTopic, setRatingTopic] = useState(0); // Speaker/Topic relevance sub-criteria
  const [ratingPerfQuality, setRatingPerfQuality] = useState(0);
  const [ratingPerfTimeliness, setRatingPerfTimeliness] = useState(0);
  const [ratingPerfStaff, setRatingPerfStaff] = useState(0);
  const [ratingVenue, setRatingVenue] = useState(0);
  const [ratingFacility, setRatingFacility] = useState(0);
  const [ratingFood, setRatingFood] = useState(0);
  const [ratingMaterials, setRatingMaterials] = useState(0);
  const [ratingOverall, setRatingOverall] = useState(0);
  
  // Per-category qualitative comments
  const [commentsObjectives, setCommentsObjectives] = useState('');
  const [commentsSpeaker, setCommentsSpeaker] = useState('');
  const [commentsPerfQuality, setCommentsPerfQuality] = useState('');
  const [commentsPerfTimeliness, setCommentsPerfTimeliness] = useState('');
  const [commentsPerfStaff, setCommentsPerfStaff] = useState('');
  const [commentsVenue, setCommentsVenue] = useState('');
  const [commentsFacility, setCommentsFacility] = useState('');
  const [commentsFood, setCommentsFood] = useState('');
  const [commentsMaterials, setCommentsMaterials] = useState('');
  const [commentsOverall, setCommentsOverall] = useState('');
  const [comments, setComments] = useState('');
  const [pinInput, setPinInput] = useState('');

  // 4 Consolidated Open-ended answers (fused from original 7)
  // Q1: Takeaways + Most Valuable
  // Q2: Expectations + Feelings
  // Q3: Missed Opportunities
  // Q4: Change + Recommendations
  const [ansTakeaways, setAnsTakeaways] = useState('');
  const [ansExpectations, setAnsExpectations] = useState('');
  const [ansMissed, setAnsMissed] = useState('');
  const [ansSuggestions, setAnsSuggestions] = useState('');

  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinCooldownUntil, setPinCooldownUntil] = useState(0);

  const strategy = activity?.evaluationStrategy;
  const focusList = strategy?.feedbackFocus || ['perfQuality', 'perfTimeliness', 'perfStaff', 'venue', 'facility', 'food', 'materials', 'overall'];
  const isPinRequired = strategy?.requirePin === true;
  const activePin = strategy?.pinCode || '';
  const evalFormMode = strategy?.formMode || 'open';
  const isPinLocked = pinCooldownUntil > Date.now();

  // Load saved binding info from device to pre-fill demographic fields
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Compute device fingerprint (same logic as attendance-app)
    const getFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return `UA-${window.navigator.userAgent.length}-${window.screen.width}`;
      ctx.textBaseline = 'top';
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('RSU_Attendance_Lock_1.0', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('RSU_Attendance_Lock_1.0', 4, 17);
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
    if (!firestore || !fp) return;

    // Try to fetch saved binding data to pre-fill demographic fields
    import('firebase/firestore').then(({ doc: fbDoc, getDoc: fbGetDoc }) => {
      fbGetDoc(fbDoc(firestore, 'attendanceDeviceBindings', fp)).then(snap => {
        if (snap.exists()) {
          const data = snap.data() as any;
          if (data.userName && !name) setName(data.userName);
          if (data.unitName && !office) setOffice(data.unitName);
        }
      }).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore]);

  useEffect(() => {
    async function fetchActivity() {
      if (!firestore || !activityId) {
        setIsLoading(false);
        return;
      }
      try {
        const docRef = doc(firestore, 'unitActivities', activityId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setActivity({ id: docSnap.id, ...docSnap.data() } as AttendanceActivity);
        }
      } catch (err) {
        console.error('Error fetching activity details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchActivity();
  }, [firestore, activityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !activityId) return;

    // Strict Mode Identity Check
    if (evalFormMode === 'strict' && (!name.trim() || !office.trim() || !position.trim())) {
      toast({
        title: 'Fields Required',
        description: 'Please provide your Name, Office, and Position details to submit this evaluation.',
        variant: 'destructive',
      });
      return;
    }

    // Dynamic Category Ratings Validation
    const validationFailed = focusList.some(cat => {
      if (cat === 'perfQuality' && ratingPerfQuality === 0) return true;
      if (cat === 'perfTimeliness' && ratingPerfTimeliness === 0) return true;
      if (cat === 'perfStaff' && ratingPerfStaff === 0) return true;
      if (cat === 'venue' && ratingVenue === 0) return true;
      if (cat === 'facility' && ratingFacility === 0) return true;
      if (cat === 'food' && ratingFood === 0) return true;
      if (cat === 'materials' && ratingMaterials === 0) return true;
      if (cat === 'overall' && ratingOverall === 0) return true;
      if (cat === 'objectives' && ratingObjectives === 0) return true;
      if (cat === 'speaker' && (ratingSpeaker === 0 || ratingTopic === 0)) return true;
      return false;
    });

    if (validationFailed) {
      toast({
        title: 'Evaluation Incomplete',
        description: 'Please provide star ratings for all active categories before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (isPinRequired) {
      if (isPinLocked) {
        const waitSeconds = Math.ceil((pinCooldownUntil - Date.now()) / 1000);
        toast({
          title: 'Too Many Attempts',
          description: `Please wait ${waitSeconds}s before trying again.`,
          variant: 'destructive'
        });
        return;
      }
      if (pinInput.trim() !== activePin) {
        const newAttempts = pinAttempts + 1;
        setPinAttempts(newAttempts);
        if (newAttempts >= 5) {
          const cooldown = Date.now() + 30000;
          setPinCooldownUntil(cooldown);
          setPinAttempts(0);
          toast({
            title: 'PIN Locked',
            description: 'Too many incorrect attempts. Please wait 30 seconds.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Security PIN Mismatch',
            description: `Incorrect PIN (${newAttempts}/5 attempts).`,
            variant: 'destructive'
          });
        }
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const evaluationData: any = {
        activityId,
        participantName: name.trim() || 'Anonymous',
        participantOffice: office.trim() || 'Not Provided',
        participantPosition: position.trim() || 'Not Provided',
        comments: comments.trim(),
        submittedAt: serverTimestamp(),
      };

      if (focusList.includes('perfQuality')) {
        evaluationData.ratingPerfQuality = ratingPerfQuality;
        evaluationData.commentsPerfQuality = commentsPerfQuality.trim();
      }
      if (focusList.includes('perfTimeliness')) {
        evaluationData.ratingPerfTimeliness = ratingPerfTimeliness;
        evaluationData.commentsPerfTimeliness = commentsPerfTimeliness.trim();
      }
      if (focusList.includes('perfStaff')) {
        evaluationData.ratingPerfStaff = ratingPerfStaff;
        evaluationData.commentsPerfStaff = commentsPerfStaff.trim();
      }
      if (focusList.includes('venue')) {
        evaluationData.ratingVenue = ratingVenue;
        evaluationData.commentsVenue = commentsVenue.trim();
      }
      if (focusList.includes('facility')) {
        evaluationData.ratingFacility = ratingFacility;
        evaluationData.commentsFacility = commentsFacility.trim();
      }
      if (focusList.includes('food')) {
        evaluationData.ratingFood = ratingFood;
        evaluationData.commentsFood = commentsFood.trim();
      }
      if (focusList.includes('materials')) {
        evaluationData.ratingMaterials = ratingMaterials;
        evaluationData.commentsMaterials = commentsMaterials.trim();
      }
      if (focusList.includes('overall')) {
        evaluationData.ratingOverall = ratingOverall;
        evaluationData.commentsOverall = commentsOverall.trim();
      }
      if (focusList.includes('objectives')) {
        evaluationData.ratingObjectives = ratingObjectives;
        evaluationData.commentsObjectives = commentsObjectives.trim();
      }
      if (focusList.includes('speaker')) {
        evaluationData.ratingSpeaker = ratingSpeaker;
        evaluationData.ratingTopic = ratingTopic;
        evaluationData.commentsSpeaker = commentsSpeaker.trim();
      }

      // 4 consolidated open-ended answers
      evaluationData.ansTakeaways = ansTakeaways.trim();       // Q1: Takeaways + Most Valuable
      evaluationData.ansExpectations = ansExpectations.trim(); // Q2: Expectations + Feelings
      evaluationData.ansMissed = ansMissed.trim();             // Q3: Missed Opportunities
      evaluationData.ansSuggestions = ansSuggestions.trim();   // Q4: Change + Recommendations

      await addDoc(collection(firestore, 'unitActivityEvaluations'), evaluationData);
      setSubmitted(true);
      toast({
        title: 'Feedback Registered',
        description: 'Thank you for your valuable feedback!',
      });
    } catch (err) {
      console.error('Error submitting evaluation:', err);
      toast({
        title: 'Submission Failed',
        description: 'Could not record your evaluation. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-xl bg-white/95 backdrop-blur shadow-2xl border-none p-8 flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Loading Evaluation Profile...</p>
      </Card>
    );
  }

  if (!activityId) {
    return (
      <Card className="w-full max-w-xl bg-white/95 backdrop-blur shadow-2xl border-none p-8 text-center space-y-6">
        <div className="h-16 w-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <Star className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Invalid Evaluation Link</CardTitle>
        <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
          No Activity reference code was found in the URL. Please re-scan the QR code displayed at the registration booth.
        </p>
        <Button asChild className="w-full h-12">
          <Link href="/">
            <Home className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="w-full max-w-xl bg-white/95 backdrop-blur shadow-2xl border-none p-8 text-center space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div className="space-y-2">
          <CardTitle className="text-3xl font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Feedback Submitted!</CardTitle>
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Thank you for participating</p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto mt-2 italic">
            "Your feedback is highly valued and helps us continuously refine and sustain our QMS operational guidelines and educational quality standards."
          </p>
        </div>
        <div className="border-t pt-6 space-y-4">
          <div className="flex gap-2">
            <Button asChild variant="outline" className="flex-1 h-12 bg-white">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" /> Home
              </Link>
            </Button>
            <Button 
              className="flex-1 h-12"
              onClick={() => {
                setName('');
                setOffice('');
                setPosition('');
                setRatingObjectives(0);
                setRatingSpeaker(0);
                setRatingTopic(0);
                setRatingPerfQuality(0);
                setRatingPerfTimeliness(0);
                setRatingPerfStaff(0);
                setRatingVenue(0);
                setRatingFacility(0);
                setRatingFood(0);
                setRatingMaterials(0);
                setRatingOverall(0);
                setCommentsObjectives('');
                setCommentsSpeaker('');
                setCommentsPerfQuality('');
                setCommentsPerfTimeliness('');
                setCommentsPerfStaff('');
                setCommentsVenue('');
                setCommentsFacility('');
                setCommentsFood('');
                setCommentsMaterials('');
                setCommentsOverall('');
                setComments('');
                setPinInput('');
                setAnsTakeaways('');
                setAnsExpectations('');
                setAnsMissed('');
                setAnsSuggestions('');
                setSubmitted(false);
              }}
            >
              Evaluate Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl bg-white/95 backdrop-blur shadow-2xl border-none animate-in fade-in zoom-in duration-500">
      <CardHeader className="text-center pb-6 border-b">
        <div className="mx-auto bg-amber-50 h-16 w-16 rounded-full flex items-center justify-center mb-4 text-amber-500 border border-amber-200">
          <Sparkles className="h-8 w-8" />
        </div>
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">Activity Evaluation</CardTitle>
        {activity && (
          <div className="mt-3 mx-auto max-w-sm">
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              <Calendar className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-black text-amber-800 uppercase tracking-tight leading-tight">{activity.name}</span>
            </div>
          </div>
        )}
        <CardDescription className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-2">
          {activity ? 'Please rate your experience with this activity' : 'Unit Activity Feedback Portal'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">
                  Demographic Details {evalFormMode === 'strict' ? '(Required)' : '(Optional)'}
                </h4>
                {(name || office) && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Auto-filled from your attendance profile
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {evalFormMode === 'strict' 
                  ? 'Identity verification is active for this event feedback.' 
                  : 'Feel free to leave blank if you wish to remain completely anonymous.'}
              </p>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="h-3 w-3" /> Name (First Name, M.I., Last Name) {evalFormMode === 'strict' && <span className="text-rose-500">*</span>}
                </Label>
                <Input
                  id="name"
                  placeholder="e.g. John D. Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs h-10 font-bold"
                  required={evalFormMode === 'strict'}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="office" className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" /> Office {evalFormMode === 'strict' && <span className="text-rose-500">*</span>}
                  </Label>
                  <Input
                    id="office"
                    placeholder="e.g. Registrar Office"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                    className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs h-10 font-bold"
                    required={evalFormMode === 'strict'}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <User className="h-3 w-3" /> Position {evalFormMode === 'strict' && <span className="text-rose-500">*</span>}
                  </Label>
                  <Input
                    id="position"
                    placeholder="e.g. Administrative Officer"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs h-10 font-bold"
                    required={evalFormMode === 'strict'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Structured Rating Questions */}
          <div className="space-y-5">
            {focusList.includes('perfQuality') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingPerfQuality} 
                  onChange={setRatingPerfQuality} 
                  label="Quality of Delivery of Service" 
                />
                <Input
                  placeholder="Additional feedback about quality of delivery of service..."
                  value={commentsPerfQuality}
                  onChange={(e) => setCommentsPerfQuality(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('perfTimeliness') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingPerfTimeliness} 
                  onChange={setRatingPerfTimeliness} 
                  label="Timeliness of Service" 
                />
                <Input
                  placeholder="Additional feedback about timeliness of service..."
                  value={commentsPerfTimeliness}
                  onChange={(e) => setCommentsPerfTimeliness(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('perfStaff') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingPerfStaff} 
                  onChange={setRatingPerfStaff} 
                  label="Staff Behavior" 
                />
                <Input
                  placeholder="Additional feedback about staff behavior..."
                  value={commentsPerfStaff}
                  onChange={(e) => setCommentsPerfStaff(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('venue') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingVenue} 
                  onChange={setRatingVenue} 
                  label="Venue" 
                />
                <Input
                  placeholder="Additional feedback about the venue..."
                  value={commentsVenue}
                  onChange={(e) => setCommentsVenue(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('facility') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingFacility} 
                  onChange={setRatingFacility} 
                  label="Facility" 
                />
                <Input
                  placeholder="Additional feedback about event facilities..."
                  value={commentsFacility}
                  onChange={(e) => setCommentsFacility(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('food') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingFood} 
                  onChange={setRatingFood} 
                  label="Food" 
                />
                <Input
                  placeholder="Additional feedback about the food/meals served..."
                  value={commentsFood}
                  onChange={(e) => setCommentsFood(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('materials') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingMaterials} 
                  onChange={setRatingMaterials} 
                  label="Material" 
                />
                <Input
                  placeholder="Additional feedback about reference files or digital materials..."
                  value={commentsMaterials}
                  onChange={(e) => setCommentsMaterials(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('overall') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingOverall} 
                  onChange={setRatingOverall} 
                  label="Overall satisfaction with the activity" 
                />
                <Input
                  placeholder="Additional feedback about your overall experience..."
                  value={commentsOverall}
                  onChange={(e) => setCommentsOverall(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {/* Legacy Category Support */}
            {focusList.includes('objectives') && (
              <div className="space-y-2 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <StarRating 
                  value={ratingObjectives} 
                  onChange={setRatingObjectives} 
                  label="Objectives Met" 
                />
                <Input
                  placeholder="Additional feedback about the event objectives..."
                  value={commentsObjectives}
                  onChange={(e) => setCommentsObjectives(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}

            {focusList.includes('speaker') && (
              <div className="space-y-4 p-3.5 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="space-y-3">
                  <StarRating 
                    value={ratingSpeaker} 
                    onChange={setRatingSpeaker} 
                    label="Speaker & Facilitator Delivery" 
                  />
                  <StarRating 
                    value={ratingTopic} 
                    onChange={setRatingTopic} 
                    label="Topic Relevance & Presentation Content" 
                  />
                </div>
                <Input
                  placeholder="Additional feedback about the speaker or the topic..."
                  value={commentsSpeaker}
                  onChange={(e) => setCommentsSpeaker(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 text-xs h-9"
                />
              </div>
            )}
          </div>

          {/* Qualitative Open-Ended Feedback Section */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 tracking-wider">Qualitative Feedback (Optional)</h4>
            
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="q1" className="text-xs font-bold text-slate-600 dark:text-slate-400">1. What was your single biggest takeaway or most valuable part of this activity, and why?</Label>
                <Textarea
                  id="q1"
                  placeholder="Type your takeaway and what you found most valuable here..."
                  value={ansTakeaways}
                  onChange={(e) => setAnsTakeaways(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q2" className="text-xs font-bold text-slate-600 dark:text-slate-400">2. Did this activity meet your expectations and how did it make you feel? Why or why not?</Label>
                <Textarea
                  id="q2"
                  placeholder="Type your expectations review and reflections here..."
                  value={ansExpectations}
                  onChange={(e) => setAnsExpectations(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q3" className="text-xs font-bold text-slate-600 dark:text-slate-400">3. Was there a specific topic or activity you wish had been included?</Label>
                <Textarea
                  id="q3"
                  placeholder="Type missed topics or suggestions here..."
                  value={ansMissed}
                  onChange={(e) => setAnsMissed(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs min-h-[60px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="q4" className="text-xs font-bold text-slate-600 dark:text-slate-400">4. If you could change one thing, or what suggestions do you have to make our next activity even better?</Label>
                <Textarea
                  id="q4"
                  placeholder="Type changes or recommendations here..."
                  value={ansSuggestions}
                  onChange={(e) => setAnsSuggestions(e.target.value)}
                  className="bg-white border-slate-200 dark:border-slate-700 shadow-sm text-xs min-h-[60px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comments" className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> General Comments & Suggestions
            </Label>
            <Textarea
              id="comments"
              placeholder="Any other comments or feedback about the event..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 shadow-inner text-xs min-h-[80px]"
            />
          </div>

          {isPinRequired && (
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 animate-in fade-in duration-300">
              <Label htmlFor="pin" className="text-xs font-black uppercase text-amber-700 flex items-center gap-1.5">
                {isPinLocked ? <ShieldAlert className="h-3.5 w-3.5 text-rose-500 animate-pulse" /> : <Lock className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
                {isPinLocked ? 'PIN Locked — Wait to Retry' : 'Security Verification PIN'}
              </Label>
              <Input
                id="pin"
                type="text"
                maxLength={4}
                placeholder={isPinLocked ? 'Locked' : 'Enter 4-digit Event PIN'}
                value={pinInput}
                disabled={isPinLocked}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className={`bg-white border-amber-300 shadow-sm text-center font-mono font-bold tracking-widest text-lg h-10 w-full max-w-[200px] mx-auto block ${isPinLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <p className="text-[10px] text-center text-amber-600/80 font-bold uppercase tracking-wider leading-relaxed">
                {isPinLocked
                  ? `Too many incorrect attempts. Cooldown: ${Math.ceil((pinCooldownUntil - Date.now()) / 1000)}s`
                  : 'Please get the active PIN code from the main kiosk screen at the venue to submit.'}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 pt-4 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting || (isPinRequired && isPinLocked)} 
            className="w-full h-12 font-black uppercase tracking-wider shadow-lg shadow-primary/20 text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
              </>
            ) : (
              <>
                Submit Evaluation Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
          <Button variant="ghost" asChild className="text-slate-400 hover:text-slate-900 dark:text-slate-100 text-xs">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" /> Back to Home
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function PublicActivityEvaluationPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* RSU Branded Background */}
      <div className="fixed inset-0 -z-10 h-full w-full">
        <Image
          src="/rsulogo.png"
          alt="RSU Background"
          fill
          priority
          className="object-cover opacity-15"
        />
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-[6px]" />
      </div>

      <Suspense fallback={
        <Card className="w-full max-w-xl bg-white/95 backdrop-blur shadow-2xl border-none p-8 flex flex-col items-center justify-center min-h-[300px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Synchronizing Portal...</p>
        </Card>
      }>
        <EvaluationForm />
      </Suspense>
    </div>
  );
}
