
'use client';

import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import type { Submission, User as AppUser, Campus, Unit } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

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
  const { isUserLoading } = useUser();

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
        {/* Left Column: Document Preview */}
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
