'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, Star, Send, LogOut, MessageSquareText, MonitorCheck, Database, RefreshCw, ShieldCheck, Download, AlertTriangle, ExternalLink, ChevronRight, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { collection, addDoc, serverTimestamp, doc, getDocs, Timestamp, query, where } from '@/firebase/firestore-wrapper';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BackupSettings, SoftwareEvaluation } from '@/lib/types';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import { Badge } from '@/components/ui/badge';

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();
  const { user, userProfile, firestore, isUserLoading, isAdmin } = useUser();

  const [view, setView] = useState<'evaluation' | 'backup' | 'feedback' | 'processing'>('feedback');
  const [hasShownInitialPrompt, setHasShownInitialPrompt] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const backupSettingsRef = useMemoFirebase(
    () => (firestore && isAdmin ? doc(firestore, 'system', 'backupSettings') : null),
    [firestore, isAdmin]
  );
  const { data: backupSettings } = useDoc<BackupSettings>(backupSettingsRef);

  const evaluationQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'softwareEvaluations'), where('userId', '==', user.uid));
  }, [firestore, user]);
  const { data: userEvaluations, isLoading: isLoadingEval } = useCollection<SoftwareEvaluation>(evaluationQuery);

  const isEvaluationComplete = useMemo(() => {
    if (isAdmin) return true;
    if (isLoadingEval) return true; 
    return userEvaluations && userEvaluations.length > 0;
  }, [userEvaluations, isLoadingEval, isAdmin]);

  useEffect(() => {
    if (isUserLoading || isLoadingEval || hasShownInitialPrompt || isProcessingLogout) return;

    if (!isEvaluationComplete) {
        setView('evaluation');
    } else if (isAdmin) {
        setView('backup');
    } else {
        setView('feedback');
    }
    setHasShownInitialPrompt(true);
  }, [isEvaluationComplete, isAdmin, isUserLoading, isLoadingEval, hasShownInitialPrompt, isProcessingLogout]);

  const handleBackup = async () => {
    if (!firestore || !isAdmin) return;
    setIsBackingUp(true);
    
    try {
        const collectionsToBackup = ['submissions', 'risks', 'unitMonitoringRecords', 'auditPlans', 'users', 'units'];
        const wb = XLSX.utils.book_new();

        await Promise.all(collectionsToBackup.map(async (colName) => {
            const snap = await getDocs(collection(firestore, colName));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), colName.substring(0, 31));
        }));

        XLSX.writeFile(wb, `RSU_EOMS_Backup_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
        toast({ title: 'Backup Successful' });
        setView('feedback');
    } catch (e) {
        toast({ title: 'Backup Error', variant: 'destructive' });
        setView('feedback');
    } finally {
        setIsBackingUp(false);
    }
  };

  const handleFinalLogout = async (skipFeedback = false) => {
    if (!auth || !user) return;
    setIsProcessingLogout(true);
    setView('processing');

    try {
      if (!skipFeedback && rating > 0 && firestore) {
        await addDoc(collection(firestore, 'appFeedbacks'), {
          userId: user.uid,
          userName: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : 'Anonymous',
          rating,
          comments,
          suggestions,
          timestamp: serverTimestamp(),
        });
      }
      await signOut(auth);
      clearSessionLogs();
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('rsu_eoms_announcement_spoken_session');
        } catch {}
      }
      router.push('/');
    } catch (error) {
      setIsProcessingLogout(false);
      setView('feedback');
    }
  };

  if (isUserLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300 border-primary/10 overflow-hidden">
        
        {view === 'evaluation' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <CardHeader className="text-center pb-8 border-b bg-primary/5">
                    <div className="mx-auto bg-white p-3 rounded-2xl shadow-xl border border-primary/10 w-fit mb-4">
                        <MonitorCheck className="h-10 w-10 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase text-slate-900 dark:text-slate-100">Final Quality Audit</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">Participation required for session closure.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-center">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                        To maintain our **ISO 21001:2018 Certification**, we require all stakeholders to evaluate the portal maturity index. Please complete the assessment before signing out.
                    </p>
                </CardContent>
                <CardFooter className="p-8 pt-0 flex flex-col gap-3">
                    <Button size="lg" className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" onClick={() => setIsFormOpen(true)}>Start ISO 25010 Audit <ChevronRight className="ml-2 h-5 w-5" /></Button>
                    <Button variant="ghost" className="w-full text-slate-400 font-bold" onClick={() => setView(isAdmin ? 'backup' : 'feedback')}>I will evaluate next time</Button>
                </CardFooter>
            </div>
        )}

        {view === 'backup' && (
            <div className="animate-in fade-in duration-500">
                <CardHeader className="text-center pb-2 bg-primary/5 border-b">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4"><Database className="h-8 w-8 text-primary" /></div>
                    <CardTitle className="text-2xl font-black uppercase">Institutional Redundancy</CardTitle>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed font-sans text-center">Administrator detected. Perform a full system backup before ending this session?</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button className="w-full h-12 text-lg font-black uppercase" onClick={handleBackup} disabled={isBackingUp}>{isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Yes, Perform Backup</Button>
                    <Button variant="ghost" className="w-full text-muted-foreground font-bold" onClick={() => setView('feedback')} disabled={isBackingUp}>Skip</Button>
                </CardFooter>
            </div>
        )}

        {view === 'feedback' && (
            <div className="animate-in fade-in duration-500">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4"><LogOut className="h-8 w-8 text-primary" /></div>
                    <CardTitle className="text-3xl font-black">Logging Out</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-4 text-center">
                        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Rate your experience</Label>
                        <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform active:scale-90 p-1">
                                <Star className={cn("h-10 w-10", (hoveredRating || rating) >= star ? "fill-yellow-400 text-yellow-400" : "text-muted border-muted fill-transparent")} />
                            </button>
                        ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> Comments</Label>
                        <Textarea placeholder="Tell us what you liked..." value={comments} onChange={(e) => setComments(e.target.value)} />
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => handleFinalLogout()} disabled={rating === 0}><Send className="mr-2 h-5 w-5" /> Submit & Logout</Button>
                    <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => handleFinalLogout(true)}>Skip and Logout</Button>
                </CardFooter>
            </div>
        )}

        {view === 'processing' && (
            <CardContent className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="font-black uppercase text-sm tracking-widest">Securing Session...</p>
            </CardContent>
        )}
      </Card>
      
      <Iso25010Form isOpen={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setView(isAdmin ? 'backup' : 'feedback'); }} />
    </div>
  );
}
