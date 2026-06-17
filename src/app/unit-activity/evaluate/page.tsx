'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFirestore } from '@/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Star, ArrowRight, Home, CheckCircle2, Loader2, Sparkles, User, MessageSquare, Phone } from 'lucide-react';
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
      <Label className="text-sm font-bold text-slate-800 tracking-tight">{label}</Label>
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
          {value === 5 ? 'Excellent' : value === 4 ? 'Very Good' : value === 3 ? 'Good' : value === 2 ? 'Fair' : value === 1 ? 'Poor' : 'Rate'}
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
  const [contact, setContact] = useState('');
  const [ratingObjectives, setRatingObjectives] = useState(0);
  const [ratingSpeaker, setRatingSpeaker] = useState(0);
  const [ratingVenue, setRatingVenue] = useState(0);
  const [ratingOverall, setRatingOverall] = useState(0);
  const [comments, setComments] = useState('');

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

    if (ratingObjectives === 0 || ratingSpeaker === 0 || ratingVenue === 0 || ratingOverall === 0) {
      toast({
        title: 'Evaluation Incomplete',
        description: 'Please provide star ratings for all categories before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const evaluationData = {
        activityId,
        participantName: name.trim() || 'Anonymous',
        participantContact: contact.trim() || 'Not Provided',
        ratingObjectives,
        ratingSpeaker,
        ratingVenue,
        ratingOverall,
        comments: comments.trim(),
        submittedAt: serverTimestamp(),
      };

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
        <CardTitle className="text-2xl font-black text-slate-800 uppercase tracking-tight">Invalid Evaluation Link</CardTitle>
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
          <CardTitle className="text-3xl font-black text-slate-800 uppercase tracking-tight">Feedback Submitted!</CardTitle>
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
                setContact('');
                setRatingObjectives(0);
                setRatingSpeaker(0);
                setRatingVenue(0);
                setRatingOverall(0);
                setComments('');
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
        <CardTitle className="text-2xl font-black tracking-tight text-slate-900 uppercase">Activity Evaluation</CardTitle>
        <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">
          {activity ? activity.name : 'Unit Activity Feedback Portal'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Demographic Details (Optional)</h4>
              <p className="text-[10px] text-slate-400">Feel free to leave blank if you wish to remain completely anonymous.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><User className="h-3 w-3" /> Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white border-slate-200 shadow-sm text-xs h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact" className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone className="h-3 w-3" /> Contact No.</Label>
                <Input
                  id="contact"
                  placeholder="e.g. 09123456789"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="bg-white border-slate-200 shadow-sm text-xs h-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <StarRating 
              value={ratingObjectives} 
              onChange={setRatingObjectives} 
              label="1. Objectives Met" 
            />
            <StarRating 
              value={ratingSpeaker} 
              onChange={setRatingSpeaker} 
              label="2. Speaker & Facilitator Delivery" 
            />
            <StarRating 
              value={ratingVenue} 
              onChange={setRatingVenue} 
              label="3. Venue and Organization Quality" 
            />
            <StarRating 
              value={ratingOverall} 
              onChange={setRatingOverall} 
              label="4. Overall Satisfaction" 
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comments" className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Comments & Suggestions
            </Label>
            <Textarea
              id="comments"
              placeholder="What did you like about the activity? How can we improve it next time?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="bg-slate-50/50 border-slate-200 shadow-inner text-xs min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-8 pt-4 border-t">
          <Button 
            type="submit" 
            disabled={isSubmitting} 
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
          <Button variant="ghost" asChild className="text-slate-400 hover:text-slate-900 text-xs">
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
