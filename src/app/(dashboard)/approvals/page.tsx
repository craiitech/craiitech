
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import type { Submission, User as AppUser, Role, Comment } from '@/lib/types';
import { format } from 'date-fns';
import { Check, X, MessageSquare, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

export default function ApprovalsPage() {
  const { user, userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [isLoading, setIsLoading] = useState(true);

  // State for the feedback dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] =
    useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [dialogMode, setDialogMode] = useState<'reject' | 'view'>('view');
  
  const canApprove = userRole === 'Admin' || userRole === 'Unit ODIMO';


  // Effect to fetch submissions based on user role
  useEffect(() => {
    // Wait for the dependencies that are *always* required
    if (!firestore || !userRole) {
      return;
    }
    // Supervisors (non-admin) need to wait for their profile to get campus/unit IDs
    if (userRole !== 'Admin' && !userProfile) {
        return;
    }


    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        const submissionsCollection = collection(firestore, 'submissions');
        let baseQuery;

        // Admins and Unit ODIMOs see submissions needing unit-level approval.
        // Campus Directors and Campus ODIMOs see all submitted reports in their campus.
        if (userRole === 'Admin') {
          baseQuery = query(
            submissionsCollection,
            where('statusId', '==', 'submitted')
          );
        } else if (
          (userRole === 'Campus Director' || userRole === 'Campus ODIMO') &&
          userProfile?.campusId
        ) {
          baseQuery = query(
            submissionsCollection,
            where('campusId', '==', userProfile.campusId),
            where('statusId', '==', 'submitted')
          );
        } else if (userRole === 'Unit ODIMO' && userProfile?.unitId) {
          // This case is covered by campus-level for now, but could be specific if needed
          baseQuery = query(
            submissionsCollection,
            where('unitId', '==', userProfile.unitId),
            where('statusId', '==', 'submitted')
          );
        }

        if (!baseQuery) {
          setSubmissions([]);
          setIsLoading(false);
          return;
        }

        const submissionsSnapshot = await getDocs(baseQuery);
        let fetchedSubmissions = submissionsSnapshot.docs.map((doc) => {
          const data = doc.data();
          const submissionDateRaw = data.submissionDate;
          const submissionDate =
            submissionDateRaw instanceof Timestamp
              ? submissionDateRaw.toDate()
              : new Date(submissionDateRaw.seconds * 1000);
          return {
            id: doc.id,
            ...data,
            submissionDate,
          } as Submission;
        });
        
        // Filter out submissions made by the approver themselves, unless they are an admin
        if (userRole !== 'Admin' && userProfile) {
          fetchedSubmissions = fetchedSubmissions.filter(
            (s) => s.userId !== userProfile.id
          );
        }

        setSubmissions(fetchedSubmissions);

      } catch (error) {
        console.error('Error fetching submissions for approval:', error);
        toast({
          title: 'Error',
          description: 'Could not fetch submissions for approval.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();
  }, [firestore, userRole, userProfile, toast]);

  // Effect to fetch users for the loaded submissions
  useEffect(() => {
    if (!firestore || submissions.length === 0) return;

    const fetchUsers = async () => {
      const userIds = [...new Set(submissions.map((s) => s.userId))];
      const newUsers: Record<string, AppUser> = {};

      if (userIds.length > 0) {
        // Firestore 'in' query limit is 30. Chunk if necessary.
        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += 30) {
          chunks.push(userIds.slice(i, i + 30));
        }

        await Promise.all(
          chunks.map(async (chunk) => {
            const usersQuery = query(
              collection(firestore, 'users'),
              where('id', 'in', chunk)
            );
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach((doc) => {
              newUsers[doc.id] = { id: doc.id, ...doc.data() } as AppUser;
            });
          })
        );
      }

      setUsers((prevUsers) => ({ ...prevUsers, ...newUsers }));
    };

    fetchUsers();
  }, [firestore, submissions]);

  const handleApprove = async (
    submissionId: string
  ) => {
    if (!firestore) return;
    const submissionRef = doc(firestore, 'submissions', submissionId);
    try {
      await updateDoc(submissionRef, { statusId: 'approved' });
      toast({
        title: 'Success',
        description: `Submission has been approved.`,
      });
      setSubmissions(submissions.filter((s) => s.id !== submissionId));
    } catch (error) {
      console.error('Error approving submission:', error);
      toast({
        title: 'Error',
        description: 'Could not approve submission.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = (
    submission: Submission,
    mode: 'reject' | 'view'
  ) => {
    setCurrentSubmission(submission);
    // This logic handles both old string-based comments and new array-based comments for viewing
    if (mode === 'view') {
        const comments = submission.comments;
        if (Array.isArray(comments) && comments.length > 0) {
            setFeedback(comments[comments.length - 1]?.text || 'No comment text found.');
        } else if (typeof comments === 'string') { // Backwards compatibility
            setFeedback(comments);
        } else {
            setFeedback('');
        }
    } else {
        setFeedback(''); // Clear feedback for new rejection
    }
    setDialogMode(mode);
    setIsDialogOpen(true);
  };

  const handleRejectWithFeedback = async () => {
    if (!firestore || !currentSubmission || !feedback || !user || !userProfile) {
      toast({
        title: 'Error',
        description: 'Feedback cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingFeedback(true);
    const submissionRef = doc(firestore, 'submissions', currentSubmission.id);
    try {
      const newComment: Comment = {
        text: feedback,
        authorId: user.uid,
        authorName: userProfile.firstName + ' ' + userProfile.lastName,
        createdAt: serverTimestamp(),
        authorRole: userRole || 'User',
      };
      
      await updateDoc(submissionRef, {
        statusId: 'rejected',
        comments: arrayUnion(newComment),
      });
      toast({
        title: 'Success',
        description: `Submission has been rejected.`,
      });
      setSubmissions(
        submissions.filter((s) => s.id !== currentSubmission.id)
      );
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast({
        title: 'Error',
        description: 'Could not reject submission.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : 'Loading...';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Approvals</h2>
          <p className="text-muted-foreground">
            Review and act on submissions awaiting your approval.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>
              You have {submissions.length} submissions to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Link</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      <a
                        href={submission.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {submission.googleDriveLink}
                      </a>
                    </TableCell>
                    <TableCell>{getUserName(submission.userId)}</TableCell>
                    <TableCell>
                      {submission.submissionDate instanceof Date ? format(submission.submissionDate, 'PP') : 'Invalid Date'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {submission.cycleId}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/submissions/${submission.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      {canApprove && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-green-600 hover:text-green-700"
                                onClick={() =>
                                  handleApprove(
                                    submission.id
                                  )
                                }
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Approve</p>
                            </TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700"
                                onClick={() =>
                                  handleOpenDialog(submission, 'reject')
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Reject</p>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {submissions.length === 0 && !isLoading && (
              <div className="text-center py-10 text-muted-foreground">
                No submissions awaiting your approval.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'reject'
                ? 'Provide Feedback for Rejection'
                : 'View Submission Comments'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'reject'
                ? 'Please provide a reason for rejecting this submission. This feedback will be sent to the user.'
                : 'Viewing comments for the submission.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="feedback" className="text-right">
                Feedback
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="col-span-3"
                readOnly={dialogMode === 'view'}
                placeholder={
                  dialogMode === 'reject'
                    ? 'Type your feedback here...'
                    : 'No comments provided.'
                }
              />
            </div>
          </div>
          <DialogFooter>
            {dialogMode === 'reject' ? (
              <Button
                onClick={handleRejectWithFeedback}
                disabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Rejection
              </Button>
            ) : (
              <Button onClick={() => setIsDialogOpen(false)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
