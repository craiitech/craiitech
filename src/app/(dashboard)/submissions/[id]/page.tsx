
'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { Submission, User as AppUser, Campus, Comment } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft, Check, X, Send, History, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Checkbox } from '@/components/ui/checkbox';
import { generateControlNumber } from '@/lib/utils';
import { getOfficialServerTime } from '@/lib/actions';
import { cn } from '@/lib/utils';


const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  submitted: 'outline',
  'awaiting approval': 'outline',
};

const approverChecklistItems = [
    { id: 'viewable', label: 'Is the document viewable and accessible?', rejectionReason: 'Document link is not viewable or accessible. Please check sharing settings.' },
    { id: 'correctDocument', label: 'Is this the correct document for the specified report type?', rejectionReason: 'The submitted document is not the correct one for this report type.' },
    { id: 'correctYear', label: 'Is the year specified in the document correct?', rejectionReason: 'The year in the document is incorrect.' },
    { id: 'correctCycle', label: 'Is the submission cycle (First/Final) correct in the document?', rejectionReason: 'The submission cycle in the document is incorrect.' },
    { id: 'correctContents', label: 'Are the contents of the document complete, accurate, and aligned with objectives?', rejectionReason: 'The document contents are incomplete, inaccurate, or not aligned with cycle objectives.' },
    { id: 'signaturesPresent', label: 'Are all required signatures present and valid?', rejectionReason: 'Required signatures are missing or invalid.' },
];


const LoadingSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-10 w-64" />
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="md:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="aspect-video w-full rounded-lg bg-muted" />
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for resubmission form
  const [newLink, setNewLink] = useState('');
  const [newComment, setNewComment] = useState('');
  
  const [approverChecklist, setApproverChecklist] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize checklist with false for all items
    const initialState: Record<string, boolean> = {};
    approverChecklistItems.forEach(item => {
        initialState[item.id] = false;
    });
    setApproverChecklist(initialState);
  }, []);

  const handleChecklistChange = (id: string) => {
    setApproverChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const isChecklistComplete = useMemo(() => {
    if (Object.keys(approverChecklist).length === 0) return false;
    return approverChecklistItems.every(item => approverChecklist[item.id] === true);
  }, [approverChecklist]);

  const canReject = useMemo(() => {
    // Can reject if checklist is incomplete OR feedback is provided
    return !isChecklistComplete || feedback.trim() !== '';
  }, [isChecklistComplete, feedback]);


  const submissionId = Array.isArray(id) ? id[0] : id;

  const submissionDocRef = useMemoFirebase(
    () => (firestore && submissionId ? doc(firestore, 'submissions', submissionId) : null),
    [firestore, submissionId]
  );
  const { data: submission, isLoading: isLoadingSubmission } = useDoc<Submission>(submissionDocRef);

  const submitterDocRef = useMemoFirebase(
    () => (firestore && submission ? doc(firestore, 'users', submission.userId) : null),
    [firestore, submission]
  );
  const { data: submitter, isLoading: isLoadingSubmitter } = useDoc<AppUser>(submitterDocRef);

  const campusDocRef = useMemoFirebase(
    () => (firestore && submission?.campusId ? doc(firestore, 'campuses', submission.campusId) : null),
    [firestore, submission?.campusId]
  );
  const { data: campus, isLoading: isLoadingCampus } = useDoc<Campus>(campusDocRef);

  const isLoading = isUserLoading || isLoadingSubmission || isLoadingSubmitter || isLoadingCampus;
  
  const previewUrl = newLink || (submission?.googleDriveLink
    ? submission.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '');

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMMM d, yyyy, h:mm a');
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return format(d, 'MMMM d, yyyy, h:mm a');
    }
    return 'Invalid Date';
  };
  
  const isApprover = 
    submission &&
    userProfile && 
    submission.userId !== userProfile.id &&
    isSupervisor;
  
  const isSubmitter = user && submission && user.uid === submission.userId;

  const handleApprove = async () => {
    if (!submissionDocRef || !user || !userProfile) return;
    setIsSubmitting(true);

    const updateData: any = { statusId: 'approved' };
    
    if (feedback) {
        const newComment: Comment = {
            text: `(Approval Comment) ${feedback}`,
            authorId: user.uid,
            authorName: userProfile.firstName + ' ' + userProfile.lastName,
            createdAt: new Date(),
            authorRole: userRole || 'User'
        }
        updateData.comments = arrayUnion(newComment);
    }
    
    updateDoc(submissionDocRef, updateData)
        .then(() => {
            toast({ title: 'Success', description: 'Submission has been approved.' });
            if (isSupervisor) {
                router.push('/approvals');
            } else {
                router.push('/submissions');
            }
        })
        .catch(error => {
            console.error('Error approving submission', error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: submissionDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  }

  const handleReject = async () => {
      if (!submissionDocRef || !user || !userProfile) return;
      
      const uncheckedReasons = approverChecklistItems
        .filter(item => !approverChecklist[item.id])
        .map(item => `* ${item.rejectionReason}`);

      if (uncheckedReasons.length === 0 && !feedback.trim()) {
        toast({ title: 'Error', description: 'To reject, please uncheck an item or provide manual feedback.', variant: 'destructive'});
        return;
      };

      setIsSubmitting(true);

      let rejectionComment = '';
      if (uncheckedReasons.length > 0) {
        rejectionComment += `**Rejection based on:**\n${uncheckedReasons.join('\n')}`;
      }

      if (feedback.trim()) {
        if (rejectionComment) {
            rejectionComment += `\n\n**Additional Comments:**\n${feedback.trim()}`;
        } else {
            rejectionComment = feedback.trim();
        }
      }
      
      const newComment: Comment = {
          text: rejectionComment,
          authorId: user.uid,
          authorName: userProfile.firstName + ' ' + userProfile.lastName,
          createdAt: new Date(),
          authorRole: userRole || 'User'
      }
      const updateData = {
          statusId: 'rejected', 
          comments: arrayUnion(newComment)
      };
      updateDoc(submissionDocRef, updateData)
        .then(() => {
          toast({ title: 'Success', description: 'Submission has been rejected.' });
          setFeedback('');
           if (isSupervisor) {
                router.push('/approvals');
            }
        })
        .catch(error => {
           console.error('Error rejecting submission', error);
           errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: submissionDocRef.path,
                operation: 'update',
                requestResourceData: updateData
            }));
        })
        .finally(() => {
            setIsSubmitting(false);
        });
  }
  
  const handleResubmit = async () => {
    if (!submissionDocRef || !submission || !newLink || !user || !userProfile) {
        toast({ title: 'Error', description: 'Missing required data to resubmit.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);

    try {
        const officialTime = await getOfficialServerTime();
        const phDate = new Date(officialTime.iso);

        const nextRevision = (submission.revision || 0) + 1;
        const nextControlNumber = generateControlNumber(submission.unitName, nextRevision, submission.reportType, phDate);

         const updateData: any = {
            googleDriveLink: newLink,
            statusId: 'submitted',
            submissionDate: serverTimestamp(),
            userId: user.uid,
            revision: nextRevision,
            controlNumber: nextControlNumber,
        };

        if (newComment) {
            const comment: Comment = {
                text: newComment,
                authorId: user.uid,
                authorName: userProfile.firstName + ' ' + userProfile.lastName,
                createdAt: new Date(),
                authorRole: userRole || 'User'
            };
            updateData.comments = arrayUnion(comment);
        }
        
        await updateDoc(submissionDocRef, updateData);

        toast({ title: 'Success', description: `Resubmitted as Revision ${String(nextRevision).padStart(2, '0')}.` });
        router.push('/submissions');

    } catch (error) {
        console.error('Error resubmitting:', error);
        toast({ title: 'Error', description: 'Could not resubmit.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const getStatusText = (status: string) => {
    if (!status) return 'UNKNOWN';
    return status === 'submitted' ? 'AWAITING APPROVAL' : status.toUpperCase();
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!submission) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold">Submission Not Found</h2>
        <p className="text-muted-foreground">
          The submission you are looking for does not exist or you do not have permission to view it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/submissions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Submissions
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Submission Details</h2>
            <p className="text-muted-foreground">
              Viewing details for report: {submission.reportType}
            </p>
          </div>
       </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Document Preview & Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Unified Metadata Header with Emphasized Values - Responsive Stacking */}
          <div className="rounded-lg border bg-muted/5 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-8">
                {/* Identification & Control */}
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Control Number</p>
                    <p className="font-mono text-xs font-bold text-primary truncate" title={submission.controlNumber}>{submission.controlNumber}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Status</p>
                    <p className={cn(
                        "text-sm font-black uppercase tracking-tight",
                        submission.statusId === 'submitted' ? "text-amber-600 animate-pulse" : 
                        submission.statusId === 'approved' ? "text-emerald-600" : "text-destructive"
                    )}>
                        {getStatusText(submission.statusId)}
                    </p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Revision</p>
                    <Badge variant="outline" className="font-mono font-bold bg-background">
                        Rev {String(submission.revision || 0).padStart(2, '0')}
                    </Badge>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Submitter</p>
                    <p className="text-sm font-bold text-foreground truncate">{submitter ? `${submitter.firstName} ${submitter.lastName}` : '...'}</p>
                </div>

                {/* Scoping & Period */}
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Campus</p>
                    <p className="text-sm font-bold text-foreground truncate" title={campus?.name}>{campus ? campus.name : '...'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Unit</p>
                    <p className="text-sm font-bold text-foreground truncate" title={submission.unitName}>{submission.unitName}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Year</p>
                    <p className="text-sm font-bold text-foreground">{submission.year}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest leading-none">Cycle</p>
                    <p className="text-sm font-bold text-foreground capitalize">{submission.cycleId} Cycle</p>
                </div>
            </div>
          </div>

          <Card>
            <CardHeader className="py-4 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {submission.reportType}
                </CardTitle>
                 <CardDescription className="text-xs">
                    Last updated: {getFormattedDate(submission.submissionDate)}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {previewUrl ? (
                    <div className="aspect-video w-full rounded-lg border bg-muted shadow-inner">
                        <iframe
                            src={previewUrl}
                            className="h-full w-full rounded-lg"
                            allow="autoplay"
                        ></iframe>
                    </div>
                ) : (
                    <div className="aspect-video w-full rounded-lg border bg-muted flex items-center justify-center">
                        <p className="text-muted-foreground">No preview available.</p>
                    </div>
                )}
            </CardContent>
          </Card>
          
          {isApprover && submission.statusId === 'submitted' && (
             <>
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-primary" />
                            Approver's Compliance Checklist
                        </CardTitle>
                        <CardDescription>Please verify and confirm the following criteria before taking action.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {approverChecklistItems.map(item => (
                            <div key={item.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
                                <Checkbox
                                    id={`approver-${item.id}`}
                                    checked={approverChecklist[item.id] || false}
                                    onCheckedChange={() => handleChecklistChange(item.id)}
                                    disabled={isSubmitting}
                                    className="mt-1"
                                />
                                <Label htmlFor={`approver-${item.id}`} className="text-sm font-normal leading-relaxed cursor-pointer">
                                    {item.label}
                                </Label>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Final Determination</CardTitle>
                        <CardDescription>
                            Provide context or constructive feedback for the unit coordinator.
                        </CardDescription>
                    </CardHeader>
                        <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="feedback">Official Comments</Label>
                            <Textarea 
                                id="feedback"
                                placeholder="Enter approval notes or rejection findings here..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                disabled={isSubmitting}
                                className="min-h-[120px]"
                            />
                        </div>
                        </CardContent>
                    <CardFooter className="flex justify-end gap-3 pt-2">
                        <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !canReject}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4"/>}
                            Reject Submission
                        </Button>
                            <Button onClick={handleApprove} disabled={isSubmitting || !isChecklistComplete} className="shadow-lg shadow-primary/20">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
                            Approve Record
                        </Button>
                    </CardFooter>
                </Card>
            </>
          )}

          {isSubmitter && submission.statusId === 'rejected' && (
             <Card className="border-destructive/50 shadow-lg">
                <CardHeader className="bg-destructive/5 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <History className="text-destructive" />
                        Resubmit Report (Process Correction)
                    </CardTitle>
                    <CardDescription>This resubmission will automatically increment the document to <strong>Revision {String((submission.revision || 0) + 1).padStart(2, '0')}</strong>.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 pt-6">
                    <div>
                        <Label htmlFor="new-link">Corrected Google Drive Link</Label>
                        <Input 
                            id="new-link"
                            placeholder="https://drive.google.com/..."
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            disabled={isSubmitting}
                            className="focus:ring-primary"
                        />
                    </div>
                     <div>
                        <Label htmlFor="new-comment">Summary of Corrections</Label>
                        <Textarea 
                            id="new-comment"
                            placeholder="Briefly describe the corrective actions taken in this revision..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                 </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                    <Button onClick={handleResubmit} disabled={isSubmitting || !newLink} className="min-w-[200px]">
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                        Submit Corrected Revision
                    </Button>
                </CardFooter>
             </Card>
          )}

        </div>

        {/* Right Column: Comments & History */}
        <div className="space-y-4">
            <Card className="shadow-md">
                <CardHeader className="border-b">
                    <CardTitle className="text-md">Conversation History</CardTitle>
                    <CardDescription className="text-[10px] uppercase font-bold tracking-widest">Official audit trail</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    {Array.isArray(submission.comments) && submission.comments.length > 0 ? (
                        <div className="space-y-6">
                            {submission.comments.slice().sort((a,b) => (a.createdAt as Timestamp)?.toMillis() - (b.createdAt as Timestamp)?.toMillis()).map((comment, index) => (
                            <div key={index} className="flex gap-3">
                                <Avatar className="h-8 w-8 shrink-0">
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{comment.authorName.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center gap-2">
                                            <p className="text-xs font-bold truncate">{comment.authorName}</p>
                                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">{getFormattedDate(comment.createdAt)}</p>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic mb-1">({comment.authorRole})</p>
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed bg-muted/20 p-3 rounded-md border border-dashed">
                                            {comment.text}
                                        </p>
                                    </div>
                            </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                            <History className="h-8 w-8 opacity-10" />
                            <p className="text-xs">No comments logged for this submission.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
