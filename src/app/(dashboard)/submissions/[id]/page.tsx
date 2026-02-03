'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { Submission, User as AppUser, Campus, Unit, Comment } from '@/lib/types';
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
import { Loader2, ArrowLeft, Check, X, Send, ShieldCheck, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { generateControlNumber } from '@/lib/utils';


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
  
  const [approverChecklist, setApproverChecklist] = useState<Record<string, boolean>>(
    approverChecklistItems.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
  );

  const handleChecklistChange = (id: string) => {
    setApproverChecklist(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  const isChecklistComplete = useMemo(() => Object.values(approverChecklist).every(Boolean), [approverChecklist]);
  const canReject = useMemo(() => !isChecklistComplete || feedback.trim() !== '', [isChecklistComplete, feedback]);


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

  const isLoading = isUserLoading || isLoadingSubmission || isLoadingSubmitter;
  
  const previewUrl = newLink || (submission?.googleDriveLink
    ? submission.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '');

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMMM d, yyyy, h:mm a');
    }
    // Fallback for string or other date representations
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
    if (!submissionDocRef) return;
    setIsSubmitting(true);

    const updateData: any = { statusId: 'approved' };
    
    if (feedback) {
        const newComment: Comment = {
            text: `(Approval Comment) ${feedback}`,
            authorId: user!.uid,
            authorName: userProfile!.firstName + ' ' + userProfile!.lastName,
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
      if (!submissionDocRef) return;
      
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
          authorId: user!.uid,
          authorName: userProfile!.firstName + ' ' + userProfile!.lastName,
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
    if (!submissionDocRef || !submission || !newLink) {
        toast({ title: 'Error', description: 'Missing required data to resubmit.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);

    const now = new Date();
    // Increment revision because we are resubmitting after a rejection
    const nextRevision = (submission.revision || 0) + 1;
    const nextControlNumber = generateControlNumber(submission.unitName, nextRevision, submission.reportType, now);

    try {
         const updateData: any = {
            googleDriveLink: newLink,
            statusId: 'submitted',
            submissionDate: now,
            userId: user!.uid,
            revision: nextRevision,
            controlNumber: nextControlNumber,
        };

        if (newComment) {
            const comment: Comment = {
                text: newComment,
                authorId: user!.uid,
                authorName: userProfile!.firstName + ' ' + userProfile!.lastName,
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
    return status === 'submitted' ? 'Awaiting Approval' : status;
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
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-primary/20">
            <CardHeader className="bg-muted/30">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-primary" />
                            Document Control Information
                        </CardTitle>
                        <CardDescription>ISO 21001:2018 QA Standard</CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-lg py-1 px-4">
                        Revision {String(submission.revision || 0).padStart(2, '0')}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Control Number</p>
                        <p className="font-mono text-base bg-muted p-2 rounded border border-primary/10">{submission.controlNumber}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Current Status</p>
                        <div className="flex items-center gap-2 h-10">
                            <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                                {getStatusText(submission.statusId)}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>{submission.reportType}</CardTitle>
                 <CardDescription>
                    Last updated on {getFormattedDate(submission.submissionDate)}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {previewUrl ? (
                    <div className="aspect-video w-full rounded-lg border bg-muted">
                        <iframe
                            src={previewUrl}
                            className="h-full w-full"
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
                        <CardTitle>Approver's Final Check</CardTitle>
                        <CardDescription>Please confirm the following before taking action.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {approverChecklistItems.map(item => (
                            <div key={item.id} className="flex items-center space-x-3">
                                <Checkbox
                                    id={`approver-${item.id}`}
                                    checked={approverChecklist[item.id]}
                                    onCheckedChange={() => handleChecklistChange(item.id)}
                                    disabled={isSubmitting}
                                />
                                <Label htmlFor={`approver-${item.id}`} className="text-sm font-normal leading-snug">
                                    {item.label}
                                </Label>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Take Action</CardTitle>
                        <CardDescription>
                            Provide additional comments below. Unchecked items from the list above will be automatically included in the rejection feedback.
                        </CardDescription>
                    </CardHeader>
                        <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="feedback">Additional Comments</Label>
                            <Textarea 
                                id="feedback"
                                placeholder="Provide any extra details or comments here..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                disabled={isSubmitting}
                            />
                        </div>
                        </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !canReject}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4"/>}
                            Reject
                        </Button>
                            <Button onClick={handleApprove} disabled={isSubmitting || !isChecklistComplete}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
                            Approve
                        </Button>
                    </CardFooter>
                </Card>
            </>
          )}

          {isSubmitter && submission.statusId === 'rejected' && (
             <Card className="border-destructive/50">
                <CardHeader className="bg-destructive/5">
                    <CardTitle className="flex items-center gap-2">
                        <History className="text-destructive" />
                        Resubmit Report (New Revision)
                    </CardTitle>
                    <CardDescription>Your submission was rejected. This resubmission will be logged as <strong>Revision {String((submission.revision || 0) + 1).padStart(2, '0')}</strong>.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4 pt-6">
                    <div>
                        <Label htmlFor="new-link">New Google Drive Link</Label>
                        <Input 
                            id="new-link"
                            placeholder="https://drive.google.com/..."
                            value={newLink}
                            onChange={(e) => setNewLink(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                     <div>
                        <Label htmlFor="new-comment">Add a Comment</Label>
                        <Textarea 
                            id="new-comment"
                            placeholder="Explain the changes you've made for this new revision..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                 </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleResubmit} disabled={isSubmitting || !newLink}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                        Submit Revision {String((submission.revision || 0) + 1).padStart(2, '0')}
                    </Button>
                </CardFooter>
             </Card>
          )}

        </div>

        {/* Right Column: Details & Comments */}
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                            {getStatusText(submission.statusId)}
                        </Badge>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Submitter:</span>
                        <span>{submitter ? `${submitter.firstName} ${submitter.lastName}` : <Loader2 className="h-4 w-4 animate-spin"/>}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Unit:</span>
                        <span>{submission.unitName}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Year:</span>
                        <span>{submission.year}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Cycle:</span>
                        <span className="capitalize">{submission.cycleId}</span>
                    </div>

                    {Array.isArray(submission.comments) && submission.comments.length > 0 && (
                        <>
                            <Separator className="my-4" />
                            <h3 className="font-semibold text-base">Conversation History</h3>
                            <div className="space-y-4">
                                {submission.comments.slice().sort((a,b) => (a.createdAt as Timestamp)?.toMillis() - (b.createdAt as Timestamp)?.toMillis()).map((comment, index) => (
                                <div key={index} className="flex gap-3">
                                    <Avatar className="h-8 w-8">
                                            <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-medium">{comment.authorName} <span className="text-xs text-muted-foreground">({comment.authorRole})</span></p>
                                                <p className="text-xs text-muted-foreground">{getFormattedDate(comment.createdAt)}</p>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{comment.text}</p>
                                        </div>
                                </div>
                                ))}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
