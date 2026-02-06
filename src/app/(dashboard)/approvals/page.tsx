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
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useUser, useFirestore } from '@/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  Query,
} from 'firebase/firestore';
import { useState, useEffect } from 'react';
import type { Submission, User as AppUser } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2, ClipboardCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function ApprovalsPage() {
  const { userProfile, isUserLoading, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, AppUser>>({});

  const canApprove = isAdmin || userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president');

  useEffect(() => {
    if (isUserLoading || !firestore || !userProfile) {
        setIsLoading(false);
        return;
    }

    const fetchSubmissions = async () => {
        setIsLoading(true);
        let submissionsQuery: Query | null = null;
        const baseQuery = query(collection(firestore, 'submissions'), where('statusId', '==', 'submitted'));

        if (isAdmin) {
            submissionsQuery = baseQuery;
        } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
            submissionsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId));
        } else if (userRole?.toLowerCase().includes('vice president')) {
            // VPs see submissions from all campuses they are assigned to (simplified for MVP to just their campus if set)
            submissionsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId));
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
            setSubmissions([]);
        }

        setIsLoading(false);
    };

    fetchSubmissions();
    
  }, [firestore, userRole, userProfile, isAdmin, isUserLoading, toast]);


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
            Review and act on submissions awaiting your approval. Quick actions have been disabled to ensure full checklist verification.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
            <CardDescription>
              You have {submissions.length} submissions to evaluate. Please click "Evaluate Submission" to check the document and complete the verification checklist.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium max-w-xs truncate">
                      {submission.reportType}
                    </TableCell>
                    <TableCell>{getUserName(submission.userId)}</TableCell>
                    <TableCell>
                      {submission.submissionDate instanceof Date ? format(submission.submissionDate, 'PP') : 'Invalid Date'}
                    </TableCell>
                    <TableCell className="capitalize">
                      {submission.cycleId}
                    </TableCell>
                    <TableCell>{submission.year}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => router.push(`/submissions/${submission.id}`)}
                      >
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Evaluate Submission
                      </Button>
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
