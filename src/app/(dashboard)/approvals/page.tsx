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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import type { Submission, User as AppUser, Role } from '@/lib/types';
import { format } from 'date-fns';
import { Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ApprovalsPage() {
  const { user, userProfile } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore]
  );
  const { data: roles } = useCollection<Role>(rolesQuery);

  const userRole = useMemo(() => {
    if (!userProfile || !roles) return null;
    return roles.find((r) => r.id === userProfile.roleId)?.name;
  }, [userProfile, roles]);

  useEffect(() => {
    if (!firestore || !userRole || !userProfile) return;

    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        let submissionsQuery;
        const baseQuery = query(
          collection(firestore, 'submissions'),
          where('statusId', 'in', ['pending', 'submitted'])
        );

        if (userRole === 'Admin') {
          submissionsQuery = baseQuery;
        } else if (
          userRole === 'Campus Director' ||
          userRole === 'Campus ODIMO'
        ) {
          // Get all users from the same campus
          const campusUsersQuery = query(
            collection(firestore, 'users'),
            where('campusId', '==', userProfile.campusId)
          );
          const campusUsersSnapshot = await getDocs(campusUsersQuery);
          const campusUserIds = campusUsersSnapshot.docs.map((doc) => doc.id);

          if (campusUserIds.length > 0) {
            submissionsQuery = query(
              baseQuery,
              where('userId', 'in', campusUserIds)
            );
          } else {
            // No users in this campus, so no submissions to show
            setSubmissions([]);
            setIsLoading(false);
            return;
          }
        } else if (userRole === 'Unit ODIMO') {
          // Get all users from the same unit
           const unitUsersQuery = query(
            collection(firestore, 'users'),
            where('unitId', '==', userProfile.unitId)
          );
          const unitUsersSnapshot = await getDocs(unitUsersQuery);
          const unitUserIds = unitUsersSnapshot.docs.map((doc) => doc.id);
           if (unitUserIds.length > 0) {
            submissionsQuery = query(
              baseQuery,
              where('userId', 'in', unitUserIds)
            );
          } else {
            setSubmissions([]);
            setIsLoading(false);
            return;
          }
        }

        if (!submissionsQuery) {
            setSubmissions([]);
            setIsLoading(false);
            return;
        }

        const [submissionsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(submissionsQuery),
          getDocs(collection(firestore, 'users')),
        ]);

        const allUsers = usersSnapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as AppUser)
        );
        setUsers(allUsers);

        const fetchedSubmissions = submissionsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const submissionDate = data.submissionDate instanceof Timestamp ? data.submissionDate.toDate() : new Date(data.submissionDate);
            return {
                id: doc.id,
                ...data,
                submissionDate,
            } as Submission;
        });

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

  const handleUpdateStatus = async (submissionId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    const submissionRef = doc(firestore, 'submissions', submissionId);
    try {
      await updateDoc(submissionRef, { statusId: newStatus });
      toast({
        title: 'Success',
        description: `Submission has been ${newStatus}.`,
      });
      // Refresh list
      setSubmissions(submissions.filter(s => s.id !== submissionId));
    } catch (error) {
      console.error('Error updating submission status:', error);
      toast({
        title: 'Error',
        description: 'Could not update submission status.',
        variant: 'destructive',
      });
    }
  }

  const getUserName = (userId: string) => {
    return users.find(u => u.id === userId)?.firstName + ' ' + users.find(u => u.id === userId)?.lastName || 'Unknown User';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
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
                  <TableHead>Title</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.googleDriveLink.substring(0,30)}</TableCell>
                    <TableCell>{getUserName(submission.userId)}</TableCell>
                    <TableCell>
                      {format(new Date(submission.submissionDate), 'PP')}
                    </TableCell>
                    <TableCell>{submission.cycleId}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleUpdateStatus(submission.id, 'approved')}
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
                            onClick={() => handleUpdateStatus(submission.id, 'rejected')}
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
                          <Button variant="ghost" size="icon">
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
    </TooltipProvider>
  );
}
