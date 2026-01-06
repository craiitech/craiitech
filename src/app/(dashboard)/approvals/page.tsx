
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
  arrayUnion,
  getDoc,
  Query,
} from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import type { Submission, User as AppUser, Role, Comment, Unit } from '@/lib/types';
import { format } from 'date-fns';
import { Check, X, MessageSquare, Loader2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { useSessionActivity } from '@/lib/activity-log-provider';

export default function ApprovalsPage() {
  const { user, userProfile, isSupervisor, userRole, isVp, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const { logSessionActivity } = useSessionActivity();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, AppUser>>({});

  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSubmission, setCurrentSubmission] =
    useState<Submission | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  
  const canApprove = isSupervisor;

  useEffect(() => {
    if (!firestore || !userRole || !userProfile || isLoadingUnits) {
        setIsLoading(false); // Ensure loading stops if prerequisites aren't met
        return;
    }

    const fetchSubmissions = async () => {
        setIsLoading(true);
        let submissionsQuery: Query | null = null;
        const baseQuery = query(collection(firestore, 'submissions'), where('statusId', '==', 'submitted'));

        if (isAdmin) {
            submissionsQuery = baseQuery;
        } else if (isVp) {
            if (allUnits && allUnits.length > 0) {
                const vpUnitIds = allUnits.filter(u => u.vicePresidentId === userProfile.id).map(u => u.id);
                if (vpUnitIds.length > 0) {
                    submissionsQuery = query(baseQuery, where('unitId', 'in', vpUnitIds));
                } else {
                    // VP has no units assigned, so no submissions to see.
                    setSubmissions([]);
                    setIsLoading(false);
                    return;
                }
            } else {
                 // allUnits is not ready yet, wait for the next render.
                setIsLoading(false);
                return;
            }
        } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
            submissionsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId));
        } else if (userRole === 'Unit ODIMO') {
            submissionsQuery = query(baseQuery, where('unitId', '==', userProfile.unitId));
        }
        

        if (submissionsQuery) {
            try {
                const snapshot = await getDocs(submissionsQuery);
                let fetchedSubmissions = snapshot.docs.map(doc => {
                    const data = doc.data() as Submission;
                    const submissionDate = data.submissionDate instanceof Timestamp
                        ? data.submissionDate.toDate()
                        : new Date((data.submissionDate as any)?.seconds * 1000);
                    return { ...data, id: doc.id, submissionDate };
                });

                // Supervisors should not see their own submissions in the approval queue
                fetchedSubmissions = fetchedSubmissions.filter(s => s.userId !== userProfile.id);
                
                setSubmissions(fetchedSubmissions);
            } catch(e) {
                console.error("Failed to fetch submissions:", e);
                toast({ title: "Error", description: "Could not fetch approval queue.", variant: "destructive"});
            }
        } else {
            // If no query was built (e.g., user has no approval role), the list is empty.
            setSubmissions([]);
        }

        setIsLoading(false);
    };

    fetchSubmissions();
    
  }, [firestore, userRole, userProfile, isAdmin, isVp, allUnits, isLoadingUnits]);


  useEffect(() => {
    if (!firestore || !submissions || submissions.length === 0) return;

    const fetchUsers = async () => {
      const userIds = [...new Set(submissions.map((s) => s.userId))];
      const newUsers: Record<string, AppUser> = {};

      if (userIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < userIds.length; i += 30) {
          chunks.push(userIds.slice(i, i + 30));
        }

        await Promise.all(
          chunks.map(async (chunk) => {
            if (chunk.length === 0) return;
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
    submission: Submission
  ) => {
    if (!firestore || !userProfile) return;
    const submissionRef = doc(firestore, 'submissions', submission.id);
    try {
      await updateDoc(submissionRef, { statusId: 'approved' });
      toast({
        title: 'Success',
        description: `Submission has been approved.`,
      });
       logSessionActivity(`Approved submission: ${submission.reportType}`, {
        action: 'approve_submission',
        details: { submissionId: submission.id },
      });
      // Refresh the list by filtering out the approved one
      setSubmissions(prev => prev.filter(s => s.id !== submission.id));
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
  ) => {
    setCurrentSubmission(submission);
    setFeedback(''); 
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
        createdAt: new Date(),
        authorRole: userRole || 'User',
      };
      
      await updateDoc(submissionRef, {
        statusId: 'rejected',
        comments: arrayUnion(newComment),
      });

      logSessionActivity(`Rejected submission: ${currentSubmission.reportType}`, {
        action: 'reject_submission',
        details: { submissionId: currentSubmission.id },
      });

      toast({
        title: 'Success',
        description: `Submission has been rejected.`,
      });
      setIsDialogOpen(false);
      setSubmissions(prev => prev.filter(s => s.id !== currentSubmission.id));
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

  if (isLoading || isLoadingUnits) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!canApprove) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    )
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
                        {submission.reportType}
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
                                    submission
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
                                  handleOpenDialog(submission)
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
            <DialogTitle>Provide Feedback for Rejection</DialogTitle>
            <DialogDescription>
                Please provide a reason for rejecting this submission. This feedback will be sent to the user.
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
                placeholder="Type your feedback here..."
              />
            </div>
          </div>
          <DialogFooter>
              <Button
                onClick={handleRejectWithFeedback}
                disabled={isSubmittingFeedback}
              >
                {isSubmittingFeedback && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Submit Rejection
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
