
'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import type { Submission, User as AppUser, Campus, Unit } from '@/lib/types';
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
import { Loader2, ArrowLeft, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

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
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
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
  const { userProfile, isAdmin, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  
  const previewUrl = submission?.googleDriveLink
    ? submission.googleDriveLink.replace('/view', '/preview').replace('?usp=sharing', '')
    : '';

  const getFormattedDate = (date: any) => {
    if (!date) return '';
    if (date instanceof Timestamp) {
      return format(date.toDate(), 'MMMM d, yyyy');
    }
    // Fallback for string or other date representations
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      return format(d, 'MMMM d, yyyy');
    }
    return 'Invalid Date';
  };

  const userRole = isAdmin ? 'Admin' : userProfile?.role;
  const isApprover = 
    submission &&
    userProfile && 
    submission.userId !== userProfile.id &&
    (
        isAdmin ||
        (userRole === 'Campus Director' && userProfile.campusId === submission.campusId) ||
        (userRole === 'Campus ODIMO' && userProfile.campusId === submission.campusId) ||
        (userRole === 'Unit ODIMO' && userProfile.unitId === submission.unitId)
    );

  const handleApprove = async () => {
    if (!submissionDocRef) return;
    setIsSubmitting(true);
    try {
        await updateDoc(submissionDocRef, { statusId: 'approved', comments: '' });
        toast({ title: 'Success', description: 'Submission has been approved.' });
        // The page will automatically re-render with the new status due to useDoc
    } catch (error) {
        console.error('Error approving submission', error);
        toast({ title: 'Error', description: 'Could not approve submission.', variant: 'destructive'});
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleReject = async () => {
      if (!submissionDocRef || !feedback) {
        toast({ title: 'Error', description: 'Feedback is required to reject.', variant: 'destructive'});
        return;
      };
      setIsSubmitting(true);
      try {
          await updateDoc(submissionDocRef, { statusId: 'rejected', comments: feedback });
          toast({ title: 'Success', description: 'Submission has been rejected.' });
      } catch (error) {
          console.error('Error rejecting submission', error);
          toast({ title: 'Error', description: 'Could not reject submission.', variant: 'destructive'});
      } finally {
          setIsSubmitting(false);
      }
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
          <Button variant="outline" size="icon" asChild>
            <Link href="/submissions"><ArrowLeft className="h-4 w-4" /></Link>
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
                    Submitted on {getFormattedDate(submission.submissionDate)}
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

            {(submission.comments) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Approver Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">{submission.comments}</p>
                    </CardContent>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
