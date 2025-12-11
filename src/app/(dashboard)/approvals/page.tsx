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
} from '@/firebase';
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

  useEffect(() => {
    if (!firestore) return;
    
    const fetchPrereqs = async () => {
        const [usersSnapshot, rolesSnapshot] = await Promise.all([
          getDocs(collection(firestore, 'users')),
          getDocs(collection(firestore, 'roles')),
        ]);

        setUsers(Object.fromEntries(usersSnapshot.docs.map(d => [d.id, {id: d.id, ...d.data()} as AppUser])));
        setRoles(Object.fromEntries(rolesSnapshot.docs.map(d => [d.id, {id: d.id, ...d.data()} as Role])));
    };

    fetchPrereqs();
  }, [firestore]);

  const userRole = useMemo(() => {
    if (!userProfile || !Object.keys(roles).length) return null;
    return roles[userProfile.roleId]?.name;
  }, [userProfile, roles]);

  useEffect(() => {
    if (!firestore || !userRole || !userProfile || !Object.keys(users).length) return;

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
        } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
            submissionsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId));
        } else if (userRole === 'Unit ODIMO') {
            submissionsQuery = query(baseQuery, where('unitId', '==', userProfile.unitId));
        }

        if (!submissionsQuery) {
            setSubmissions([]);
            setIsLoading(false);
            return;
        }

        const submissionsSnapshot = await getDocs(submissionsQuery);

        const fetchedSubmissions = submissionsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const submissionDate = data.submissionDate instanceof Timestamp ? data.submissionDate.toDate() : new Date(data.submissionDate.seconds * 1000);
            return {
                id: doc.id,
                ...data,
                submissionDate,
                originalPath: doc.ref.path,
            } as AggregatedSubmission;
        }).filter(s => s.userId !== userProfile.id); // Filter out user's own submissions

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

  const handleUpdateStatus = async (submissionPath: string, submissionId: string, newStatus: 'approved' | 'rejected') => {
    if (!firestore) return;
    const submissionRef = doc(firestore, submissionPath);
    try {
      await updateDoc(submissionRef, { statusId: newStatus });
      toast({
        title: 'Success',
        description: `Submission has been ${newStatus}.`,
      });
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
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
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
                        <a href={submission.googleDriveLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                         {submission.googleDriveLink}
                        </a>
                    </TableCell>
                    <TableCell>{getUserName(submission.userId)}</TableCell>
                    <TableCell>
                      {format(new Date(submission.submissionDate), 'PP')}
                    </TableCell>
                    <TableCell className="capitalize">{submission.cycleId}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleUpdateStatus(submission.originalPath, submission.id, 'approved')}
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
                            onClick={() => handleUpdateStatus(submission.originalPath, submission.id, 'rejected')}
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
