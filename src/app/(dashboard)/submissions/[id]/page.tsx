
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
import { Loader2, ArrowLeft, Check, X, Send } from 'lucide-react';
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


const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  submitted: 'outline',
};

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
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);

export default function SubmissionDetailPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const { user, userProfile, isAdmin, isUserLoading, userRole } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for resubmission form
  const [newLink, setNewLink] = useState('');
  const [newComment, setNewComment] = useState('');


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
    () => (firestore && submission ? doc(firestore, 'campuses', submission.campusId) : null),
    [firestore, submission]
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
    // Fallback for string or other date representations
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return format(d, 'MMMM d, yyyy, h:mm a');
    }
    return 'Invalid Date';
  };

  const canApprove = useMemo(() => {
      if (!userRole) return false;
      return ['Admin', 'Campus ODIMO', 'Campus Director'].includes(userRole);
  }, [userRole]);
  
  const isApprover = 
    submission &&
    userProfile && 
    submission.userId !== userProfile.id &&
    canApprove;
  
  const isSubmitter = user && submission && user.uid === submission.userId;

  const handleApprove = async () => {
    if (!submissionDocRef) return;
    setIsSubmitting(true);
    const updateData = { statusId: 'approved' };
    updateDoc(submissionDocRef, updateData)
        .then(() => {
            toast({ title: 'Success', description: 'Submission has been approved.' });
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
      if (!submissionDocRef || !feedback) {
        toast({ title: 'Error', description: 'Feedback is required to reject.', variant: 'destructive'});
        return;
      };
      setIsSubmitting(true);
      const newComment: Comment = {
          text: feedback,
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
    if (!submissionDocRef || !newLink) {
        toast({ title: 'Error', description: 'A new Google Drive link is required to resubmit.', variant: 'destructive' });
        return;
    }
    setIsSubmitting(true);
    try {
         const updateData: any = {
            googleDriveLink: newLink,
            statusId: 'submitted',
            submissionDate: new Date()
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

        toast({ title: 'Success', description: 'Submission has been resubmitted.' });
        setNewLink('');
        setNewComment('');

    } catch (error) {
        console.error('Error resubmitting:', error);
        toast({ title: 'Error', description: 'Could not resubmit.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  };

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
             <Card>
                <CardHeader>
                    <CardTitle>Take Action</CardTitle>
                    <CardDescription>Approve or reject this submission.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="feedback">Feedback for Rejection</Label>
                        <Textarea 
                            id="feedback"
                            placeholder="Provide clear reasons for rejection..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                 </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !feedback}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4"/>}
                        Reject
                    </Button>
                     <Button onClick={handleApprove} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4"/>}
                        Approve
                    </Button>
                </CardFooter>
             </Card>
          )}

          {isSubmitter && submission.statusId === 'rejected' && (
             <Card>
                <CardHeader>
                    <CardTitle>Resubmit Report</CardTitle>
                    <CardDescription>Your submission was rejected. Please update the link and add comments if necessary.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
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
                            placeholder="Explain the changes you've made..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            disabled={isSubmitting}
                        />
                    </div>
                 </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button onClick={handleResubmit} disabled={isSubmitting || !newLink}>
                         {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4"/>}
                        Resubmit
                    </Button>
                </CardFooter>
             </Card>
          )}

        </div>

        {/* Right Column: Details */}
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                            {submission.statusId}
                        </Badge>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Submitter:</span>
                        <span>{submitter ? `${submitter.firstName} ${submitter.lastName}` : <Loader2 className="h-4 w-4 animate-spin"/>}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Campus:</span>
                        <span>{campus?.name ?? <Loader2 className="h-4 w-4 animate-spin"/>}</span>
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
                </CardContent>
            </Card>

            {Array.isArray(submission.comments) && submission.comments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Conversation History</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
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
                                    <p className="text-sm text-muted-foreground mt-1">{comment.text}</p>
                                </div>
                           </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
