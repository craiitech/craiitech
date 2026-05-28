
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
import { collection, addDoc, serverTimestamp, doc, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BackupSettings } from '@/lib/types';
import { Iso25010Form } from '@/components/evaluation/iso-25010-form';
import { Badge } from '@/components/ui/badge';

const QAO_SURVEY_URL = "https://surveymars.com/q/38KA5k0nk?fbclid=IwY2xjawQOLYpleHRuA2FlbQIxMABicmlkETJEUVhNTW9HSmthVjF6OTNRc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHtluiQqsM9r-FKULWIkB7WPNEn2GPJCQxEC3YaEpQDluY9Bz256TSf_KcFn0_aem_gqrw_KPziVb2QvcD14zSRA";

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();
  const { user, userProfile, firestore, isUserLoading, isAdmin, isAuditor } = useUser();

  // Initial view determination
  const [view, setView] = useState<'evaluation' | 'backup' | 'feedback' | 'processing'>('feedback');
  const [hasShownInitialPrompt, setHasShownInitialPrompt] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<string>('');

  // Fetch Backup Settings for Admin Prompt
  const backupSettingsRef = useMemoFirebase(
    () => (firestore && isAdmin ? doc(firestore, 'system', 'backupSettings') : null),
    [firestore, isAdmin]
  );
  const { data: backupSettings } = useDoc<BackupSettings>(backupSettingsRef);

  // Evaluation Status Check
  const evaluationQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'softwareEvaluations'), where('userId', '==', user.uid));
  }, [firestore, user]);
  const { data: userEvaluations, isLoading: isLoadingEval } = useCollection(evaluationQuery);

  const isEvaluationComplete = useMemo(() => {
    if (isAdmin) return true; // Admins are exempt from the logout evaluation prompt
    if (isLoadingEval) return true; 
    return userEvaluations && userEvaluations.length > 0;
  }, [userEvaluations, isLoadingEval, isAdmin]);

  // Initial Logic Flow
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

  const triggerExternalEvaluation = () => {
    alert("Before you exit, kindly Evaluate your experience with us, kindly search for Quality Assurance Office and the services you have availed with us");
    window.open(QAO_SURVEY_URL, "_blank");
  };

  const handleBackup = async () => {
    if (!firestore || !isAdmin) return;
    setIsBackingUp(true);
    setBackupStatus('Aggregating institutional data...');
    
    try {
        const collectionsToBackup = [
            'submissions', 'risks', 'unitMonitoringRecords', 'auditPlans', 'auditSchedules', 
            'auditFindings', 'correctiveActionRequests', 'managementReviewOutputs',
            'academicPrograms', 'programCompliances', 'users', 'units', 'campuses', 
            'qaAdvisories', 'procedureManuals', 'eomsPolicyManuals'
        ];
        const wb = XLSX.utils.book_new();

        await Promise.all(collectionsToBackup.map(async (colName) => {
            const snap = await getDocs(collection(firestore, colName));
            const data = snap.docs.map(d => {
                const docData = d.data();
                const processed: any = { id: d.id };
                for (const [key, value] of Object.entries(docData)) {
                    if (value instanceof Timestamp) processed[key] = value.toDate().toISOString();
                    else if (typeof value === 'object' && value !== null) processed[key] = JSON.stringify(value);
                    else processed[key] = value;
                }
                return processed;
            });
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), colName.substring(0, 31));
        }));

        const dateStr = format(new Date(), 'yyyy-MM-dd_HHmm');
        const fileName = `RSU_EOMS_Full_Institutional_Backup_${dateStr}.xlsx`;

        if (backupSettings?.targetDriveLink) {
            window.open(backupSettings.targetDriveLink, '_blank');
        }

        XLSX.writeFile(wb, fileName);
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
    triggerExternalEvaluation();
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
                    <CardTitle className="text-2xl font-black uppercase text-slate-900">Final Quality Audit</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
                        Participation required for session closure.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-8 space-y-6 text-center">
                    <p className="text-sm font-medium text-slate-600 leading-relaxed font-sans">
                        To maintain our **ISO 21001:2018 Certification**, we require all stakeholders to evaluate the portal maturity index. Please complete the assessment before signing out.
                    </p>
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3 text-left">
                        <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-800 font-medium font-sans">
                            Your feedback directly impacts the institutional roadmap for system improvements.
                        </p>
                    </div>
                </CardContent>
                <CardFooter className="p-8 pt-0 flex flex-col gap-3">
                    <Button 
                        size="lg"
                        className="w-full h-14 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                        onClick={() => setIsFormOpen(true)}
                    >
                        Start ISO 25010 Audit
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                    <Button variant="ghost" className="w-full text-slate-400 font-bold" onClick={() => setView(isAdmin ? 'backup' : 'feedback')}>
                        I will evaluate next time
                    </Button>
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
                    <p className="text-sm text-slate-600 font-medium leading-relaxed font-sans text-center">Administrator detected. Perform a full system backup before ending this session?</p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button className="w-full h-12 text-lg font-black uppercase" onClick={handleBackup} disabled={isBackingUp}>
                        {isBackingUp ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />} Yes, Perform Backup
                    </Button>
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
                    <Button className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => handleFinalLogout(false)} disabled={rating === 0}>
                        <Send className="mr-2 h-5 w-5" /> Submit & Logout
                    </Button>
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
      
      {isFormOpen && (
          <Iso25010Form 
            isOpen={isFormOpen} 
            onOpenChange={(open) => {
                setIsFormOpen(open);
                if (!open) setView(isAdmin ? 'backup' : 'feedback');
            }} 
          />
      )}
    </div>
  );
}
