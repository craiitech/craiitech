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
import { cn } from '@/lib/utils';

/**
 * Returns a Tailwind class string for row background based on the submission year.
 */
const getYearRowColor = (year: number) => {
  const colors: Record<number, string> = {
    2024: 'bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20',
    2025: 'bg-green-50/50 hover:bg-green-100/50 dark:bg-green-900/10 dark:hover:bg-green-900/20',
    2026: 'bg-amber-50/50 hover:bg-amber-100/50 dark:bg-amber-900/10 dark:hover:bg-amber-900/20',
    2027: 'bg-purple-50/50 hover:bg-purple-100/50 dark:bg-purple-900/10 dark:hover:bg-purple-900/20',
    2028: 'bg-rose-50/50 hover:bg-rose-100/50 dark:bg-rose-900/10 dark:hover:bg-rose-900/20',
  };
  return colors[year] || 'bg-slate-50/50 hover:bg-slate-100/50 dark:bg-slate-900/10 dark:hover:bg-slate-900/20';
};

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

        if (isAdmin) {
            submissionsQuery = query(
                collection(firestore, 'submissions'), 
                where('statusId', '==', 'submitted')
            );
        } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO' || userRole?.toLowerCase().includes('vice president')) {
            submissionsQuery = query(
                collection(firestore, 'submissions'), 
                where('statusId', '==', 'submitted'),
                where('campusId', '==', userProfile.campusId)
            );
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
            Review and act on submissions awaiting your approval. Rows are color-coded by year for easier categorization.
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
                  <TableRow 
                    key={submission.id}
                    className={cn("transition-colors", getYearRowColor(submission.year))}
                  >
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
                    <TableCell>
                      <Badge variant="outline" className="bg-background/50 font-bold">
                        {submission.year}
                      </Badge>
                    </TableCell>
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