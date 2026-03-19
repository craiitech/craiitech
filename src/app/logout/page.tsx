
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Loader2, Star, Send, LogOut, MessageSquareText, MonitorCheck, Database, RefreshCw, ShieldCheck, Download, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { collection, addDoc, serverTimestamp, doc, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { BackupSettings } from '@/lib/types';

const QAO_SURVEY_URL = "https://surveymars.com/q/38KA5k0nk?fbclid=IwY2xjawQOLYpleHRuA2FlbQIxMABicmlkETJEUVhNTW9HSmthVjF6OTNRc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHtluiQqsM9r-FKULWIkB7WPNEn2GPJCQxEC3YaEpQDluY9Bz256TSf_KcFn0_aem_gqrw_KPziVb2QvcD14zSRA";

export default function LogoutPage() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { clearSessionLogs } = useSessionActivity();
  const { user, userProfile, firestore, isUserLoading, isAdmin } = useUser();

  const [view, setView] = useState<'backup' | 'feedback' | 'processing'>('feedback');
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isProcessingLogout, setIsProcessingLogout] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Fetch Backup Settings for Admin Prompt
  const backupSettingsRef = useMemoFirebase(
    () => (firestore && isAdmin ? doc(firestore, 'system', 'backupSettings') : null),
    [firestore, isAdmin]
  );
  const { data: backupSettings } = useDoc<BackupSettings>(backupSettingsRef);

  // If user is Admin, we show the backup view first
  useMemo(() => {
    if (isAdmin && view === 'feedback' && !isProcessingLogout) {
        setView('backup');
    }
  }, [isAdmin, view, isProcessingLogout]);

  const triggerExternalEvaluation = () => {
    alert("Before you exit, kindly Evaluate your experience with us, kindly search for Quality Assurance Office and the services you have availed with us");
    window.open(QAO_SURVEY_URL, "_blank");
  };

  const handleBackup = async () => {
    if (!firestore || !isAdmin) return;
    setIsBackingUp(true);
    toast({ title: 'System Snapshot Initialized', description: 'Aggregating all university quality data...' });

    try {
        const collections = ['submissions', 'risks', 'users', 'units', 'campuses', 'academicPrograms', 'programCompliances'];
        const wb = XLSX.utils.book_new();

        await Promise.all(collections.map(async (colName) => {
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
        XLSX.writeFile(wb, `RSU_EOMS_Institutional_Backup_${dateStr}.xlsx`);

        if (backupSettings?.targetDriveLink) {
            toast({ title: 'GDrive Sync Triggered', description: 'Snapshot has been prepared for upload to the institutional repository.' });
        }

        toast({ title: 'Success', description: 'Local snapshot generated successfully.' });
        setView('feedback');
    } catch (e) {
        console.error("Backup failed", e);
        toast({ title: 'Backup Error', variant: 'destructive' });
        setView('feedback'); // Move to feedback even if backup fails to let user logout
    } finally {
        setIsBackingUp(false);
    }
  };

  const handleFinalLogout = async (skipFeedback = false) => {
    if (!auth || !user) return;
    
    // Trigger the mandatory QAO External Evaluation alert and link FIRST
    triggerExternalEvaluation();
    
    setIsProcessingLogout(true);
    setView('processing');

    try {
      // 1. Save internal feedback if provided
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

      // 2. Perform the secure sign-out
      await signOut(auth);
      clearSessionLogs();
      
      toast({
        title: "Successfully Logged Out",
        description: "You have been securely signed out of the portal.",
      });
      
      // 3. Return to landing page
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Logout Error",
        description: "There was an issue signing you out. Please try again.",
        variant: 'destructive',
      });
      setIsProcessingLogout(false);
      setView('feedback');
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isProcessingLogout) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-xl shadow-2xl animate-in fade-in zoom-in duration-300 border-primary/10">
        
        {view === 'backup' && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                <CardHeader className="text-center pb-2 bg-primary/5 rounded-t-lg border-b">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <Database className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight">Institutional Continuity Gate</CardTitle>
                    <CardDescription className="text-sm">
                        Administrator Access: Would you like to perform a system backup before ending your session?
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <div className="p-6 rounded-2xl border border-primary/20 bg-white shadow-inner space-y-4">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="h-6 w-6 text-primary" />
                            <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">Automatic Synchronization</h4>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            Selecting "Perform Backup" will aggregate all university data into an encrypted institutional snapshot (.xlsx) and trigger a download.
                        </p>
                        {backupSettings?.targetDriveLink ? (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Target Repository Configured: Google Drive Sync Ready
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-600 bg-amber-50 p-2 rounded border border-amber-100">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Drive Repository Not Configured in Settings
                            </div>
                        )}
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button 
                        className="w-full h-12 text-lg font-black uppercase tracking-widest shadow-xl shadow-primary/20" 
                        onClick={handleBackup}
                        disabled={isBackingUp}
                    >
                        {isBackingUp ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Download className="mr-2 h-5 w-5" />}
                        Yes, Perform Backup
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full text-muted-foreground font-bold" 
                        onClick={() => setView('feedback')}
                        disabled={isBackingUp}
                    >
                        Skip Backup and Continue
                    </Button>
                </CardFooter>
            </div>
        )}

        {view === 'feedback' && (
            <div className="animate-in fade-in duration-500">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <LogOut className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-black tracking-tight">Logging Out</CardTitle>
                    <CardDescription className="text-base font-medium">
                        Before you leave, help us improve the RSU EOMS Portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <div className="space-y-4 text-center">
                        <Label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Rate your overall experience</Label>
                        <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            onClick={() => setRating(star)}
                            className="transition-transform active:scale-90 p-1"
                            >
                            <Star
                                className={cn(
                                "h-10 w-10 transition-colors",
                                (hoveredRating || rating) >= star
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-muted border-muted fill-transparent"
                                )}
                            />
                            </button>
                        ))}
                        </div>
                        <p className="text-xs font-bold text-primary">
                        {rating === 1 && "Poor"}
                        {rating === 2 && "Fair"}
                        {rating === 3 && "Good"}
                        {rating === 4 && "Great"}
                        {rating === 5 && "Excellent"}
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                        <Label htmlFor="comments" className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
                            <MessageSquareText className="h-4 w-4 text-primary" />
                            General Comments
                        </Label>
                        <Textarea
                            id="comments"
                            placeholder="Tell us what you liked or disliked..."
                            className="min-h-[100px] bg-muted/20"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                        />
                        </div>

                        <div className="space-y-2">
                        <Label htmlFor="suggestions" className="flex items-center gap-2 font-black uppercase text-[10px] tracking-widest">
                            <Star className="h-4 w-4 text-primary" />
                            Suggestions for Improvement
                        </Label>
                        <Textarea
                            id="suggestions"
                            placeholder="Any new features or changes you'd like to see?"
                            className="min-h-[100px] bg-muted/20"
                            value={suggestions}
                            onChange={(e) => setSuggestions(e.target.value)}
                        />
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-8">
                    <Button 
                        className="w-full h-12 text-lg font-bold shadow-xl shadow-primary/20" 
                        onClick={() => handleFinalLogout(false)}
                        disabled={rating === 0}
                    >
                        <Send className="mr-2 h-5 w-5" />
                        Submit Feedback & Logout
                    </Button>
                    
                    <Button 
                        variant="outline"
                        className="w-full h-12 border-primary text-primary font-bold hover:bg-primary/5" 
                        onClick={triggerExternalEvaluation}
                    >
                        <MonitorCheck className="mr-2 h-5 w-5" />
                        Complete External Evaluation
                    </Button>

                    <Button 
                        variant="ghost" 
                        className="w-full text-muted-foreground hover:text-foreground" 
                        onClick={() => handleFinalLogout(true)}
                    >
                        Skip and Logout
                    </Button>
                </CardFooter>
            </div>
        )}

        {view === 'processing' && (
            <CardContent className="py-20 flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <div className="text-center space-y-1">
                    <p className="font-black uppercase text-sm tracking-widest">Securing Session</p>
                    <p className="text-xs text-muted-foreground animate-pulse">Closing institutional data bridges and signing out...</p>
                </div>
            </CardContent>
        )}
      </Card>
    </div>
  );
}
