
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
  collectionGroup,
} from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import type { Submission, User as AppUser, Role } from '@/lib/types';
import { format } from 'date-fns';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type AggregatedSubmission = Submission & {
  originalPath: string;
};

export default function ApprovalsPage() {
  const { userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<AggregatedSubmission[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [roles, setRoles] = useState<Record<string, Role>>({});

  // State for the feedback dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] =
    useState<AggregatedSubmission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [dialogMode, setDialogMode] = useState<'reject' | 'view'>('view');

  useEffect(() => {
    if (!firestore) return;

    const fetchPrereqs = async () => {
      const [usersSnapshot, rolesSnapshot] = await Promise.all([
        getDocs(collection(firestore, 'users')),
        getDocs(collection(firestore, 'roles')),
      ]);

      setUsers(
        Object.fromEntries(
          usersSnapshot.docs.map((d) => [
            d.id,
            { id: d.id, ...d.data() } as AppUser,
          ])
        )
      );
      setRoles(
        Object.fromEntries(
          rolesSnapshot.docs.map((d) => [
            d.id,
            { id: d.id, ...d.data() } as Role,
          ])
        )
      );
    };

    fetchPrereqs();
  }, [firestore]);

  const userRole = useMemo(() => {
    if (!userProfile || !Object.keys(roles).length) return null;
    return roles[userProfile.roleId]?.name;
  }, [userProfile, roles]);

  useEffect(() => {
    if (!firestore || !userRole || !userProfile || !Object.keys(users).length)
      return;

    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        let submissionsQuery;

        const baseQuery = query(
          collectionGroup(firestore, 'submissions'),
          where('statusId', 'in', ['submitted'])
        );

        if (userRole === 'Admin') {
          submissionsQuery = baseQuery;
        } else if (
          userRole === 'Campus Director' ||
          userRole === 'Campus ODIMO'
        ) {
          submissionsQuery = query(
            baseQuery,
            where('campusId', '==', userProfile.campusId)
          );
        } else if (userRole === 'Unit ODIMO') {
          submissionsQuery = query(
            baseQuery,
            where('unitId', '==', userProfile.unitId)
          );
        }

        if (!submissionsQuery) {
          setSubmissions([]);
          setIsLoading(false);
          return;
        }

        const submissionsSnapshot = await getDocs(submissionsQuery);

        const fetchedSubmissions = submissionsSnapshot.docs
          .map((doc) => {
            const data = doc.data();
            const submissionDate =
              data.submissionDate instanceof Timestamp
                ? data.submissionDate.toDate()
                : new Date(data.submissionDate.seconds * 1000);
            return {
              id: doc.id,
              ...data,
              submissionDate,
              originalPath: doc.ref.path,
            } as AggregatedSubmission;
          })
          .filter((s) => s.userId !== userProfile.id); // Filter out user's own submissions

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
  }, [firestore, userRole, userProfile, toast, users]);

  const handleApprove = async (submissionPath: string, submissionId: string) => {
    if (!firestore) return;
    const submissionRef = doc(firestore, submissionPath);
    try {
      await updateDoc(submissionRef, { statusId: 'approved', comments: '' });
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
    submission: AggregatedSubmission,
    mode: 'reject' | 'view'
  ) => {
    setCurrentSubmission(submission);
    setFeedback(mode === 'view' ? submission.comments || '' : '');
    setDialogMode(mode);
    setIsDialogOpen(true);
  };
  
  const handleRejectWithFeedback = async () => {
    if (!firestore || !currentSubmission || !feedback) {
        toast({ title: 'Error', description: 'Feedback cannot be empty.', variant: 'destructive'});
        return;
    };

    setIsSubmittingFeedback(true);
    const submissionRef = doc(firestore, currentSubmission.originalPath);
    try {
      await updateDoc(submissionRef, { statusId: 'rejected', comments: feedback });
      toast({
        title: 'Success',
        description: `Submission has been rejected.`,
      });
      setSubmissions(submissions.filter(s => s.id !== currentSubmission.id));
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
  }


  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
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
                      {format(new Date(submission.submissionDate), 'PP')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {submission.cycleId}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() =>
                              handleApprove(
                                submission.originalPath,
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
                            onClick={() => handleOpenDialog(submission, 'reject')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Reject</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenDialog(submission, 'view')}
                          >
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>View Comments</p>
                        </TooltipContent>
                      </Tooltip>
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
                {dialogMode === 'reject' ? 'Provide Feedback for Rejection' : 'View Submission Comments'}
            </DialogTitle>
            <DialogDescription>
             {dialogMode === 'reject' ? 'Please provide a reason for rejecting this submission. This feedback will be sent to the user.' : 'Viewing comments for the submission.'}
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
                placeholder={dialogMode === 'reject' ? 'Type your feedback here...' : 'No comments provided.'}
              />
            </div>
          </div>
          <DialogFooter>
            {dialogMode === 'reject' ? (
                <Button onClick={handleRejectWithFeedback} disabled={isSubmittingFeedback}>
                    {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

    