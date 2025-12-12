
'use client';

import { PlusCircle, MessageSquare, Eye } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Submission, User as AppUser, Role } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}


export default function SubmissionsPage() {
  const { user, userProfile, isAdmin } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [roles, setRoles] = useState<Record<string, Role>>({});

  const [isLoading, setIsLoading] = useState(true);

  // This will store the final list of submissions to display
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // State for feedback dialog
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');


  useEffect(() => {
    if (!firestore) return;

    // Pre-fetch roles and users for supervisors
    const fetchPrereqs = async () => {
      const rolesQuery = query(collection(firestore, 'roles'));
      const rolesSnapshot = await getDocs(rolesQuery);
      setRoles(Object.fromEntries(rolesSnapshot.docs.map(doc => [doc.id, doc.data() as Role])));

      // Only admins should fetch all users. Other supervisors will see their scope.
      if (isAdmin) {
        const usersQuery = query(collection(firestore, 'users'));
        const usersSnapshot = await getDocs(usersQuery);
        setUsers(Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as AppUser])));
      }
    };
    fetchPrereqs();
  }, [firestore, isAdmin]);

  const userRole = useMemo(() => {
    if (isAdmin) return 'Admin';
    if (!userProfile || Object.keys(roles).length === 0) return null;
    return roles[userProfile.roleId]?.name;
  }, [isAdmin, userProfile, roles]);

  useEffect(() => {
    if (!firestore || !userRole || !userProfile) return;

    const fetchSubmissions = async () => {
      setIsLoading(true);
      let submissionsQuery;
      
      const submissionsCollection = collection(firestore, 'submissions');

      if (userRole === 'Admin') {
        submissionsQuery = query(submissionsCollection, orderBy('submissionDate', 'desc'));
      } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
        submissionsQuery = query(submissionsCollection, where('campusId', '==', userProfile.campusId), orderBy('submissionDate', 'desc'));
      } else if (userRole === 'Unit ODIMO') {
        submissionsQuery = query(submissionsCollection, where('unitId', '==', userProfile.unitId), orderBy('submissionDate', 'desc'));
      } else {
        // Regular employee - remove order by to prevent index error
        submissionsQuery = query(submissionsCollection, where('userId', '==', userProfile.id));
      }

      const snapshot = await getDocs(submissionsQuery);
      
      let fetchedSubmissions = snapshot.docs.map(doc => {
        const data = doc.data();
        const submissionDateRaw = data.submissionDate;
        const submissionDate =
          submissionDateRaw instanceof Timestamp
            ? submissionDateRaw.toDate()
            : new Date(submissionDateRaw.seconds * 1000);
        return {
          ...data,
          id: doc.id,
          submissionDate: submissionDate,
        } as Submission;
      });

      // Sort client-side for non-supervisors
      if (!['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole)) {
        fetchedSubmissions.sort((a, b) => b.submissionDate.getTime() - a.submissionDate.getTime());
      }

      // If supervisor, fetch needed user data for display
      const isSupervisor = ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole);
      if (isSupervisor && !isAdmin) { // Admins already have all users
         const userIds = [...new Set(fetchedSubmissions.map(s => s.userId))];
         if (userIds.length > 0) {
           const usersQuery = query(collection(firestore, 'users'), where('id', 'in', userIds));
           const usersSnapshot = await getDocs(usersQuery);
           setUsers(prevUsers => ({
             ...prevUsers,
             ...Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as AppUser]))
           }));
         }
      }
      
      setSubmissions(fetchedSubmissions);
      setIsLoading(false);
    };

    fetchSubmissions();

  }, [firestore, userRole, userProfile, isAdmin]);

  
  const isSupervisor = ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole ?? '');

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : '...';
  };
  
  const handleViewFeedback = (comments: string) => {
    setFeedbackToShow(comments);
    setIsFeedbackDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            {isSupervisor ? 'A list of all submissions in your scope.' : 'Here\\'s a list of your report submissions.'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isSupervisor && (
             <Button asChild>
                <Link href="/submissions/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Submission
                </Link>
            </Button>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{isSupervisor ? 'All Submissions' : 'My Submissions'}</CardTitle>
          <CardDescription>
            {isSupervisor ? 'A history of all reports submitted by users in your campus/unit.' : 'A history of all reports you have submitted.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Type</TableHead>
                {isSupervisor && <TableHead>Submitter</TableHead>}
                <TableHead>Unit</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions?.map((submission) => (
                <TableRow key={submission.id}>
                  <TableCell className="font-medium">{submission.reportType}</TableCell>
                   {isSupervisor && <TableCell>{getUserName(submission.userId)}</TableCell>}
                  <TableCell>{submission.unitName}</TableCell>
                  <TableCell>{submission.year}</TableCell>
                  <TableCell className="capitalize">{submission.cycleId}</TableCell>
                  <TableCell>
                    {format(new Date(submission.submissionDate), 'MMMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                      {submission.statusId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                     {submission.statusId === 'rejected' && submission.comments && (
                        <Button variant="ghost" size="icon" onClick={() => handleViewFeedback(submission.comments!)}>
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">View Feedback</span>
                        </Button>
                     )}
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/submissions/${submission.id}`)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
          {!isLoading && submissions?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              You have not made any submissions yet.
            </div>
          )}
        </CardContent>
      </Card>
      <FeedbackDialog 
        isOpen={isFeedbackDialogOpen}
        onOpenChange={setIsFeedbackDialogOpen}
        feedback={feedbackToShow}
      />
    </>
  );
}

