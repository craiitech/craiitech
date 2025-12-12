
'use client';

import { PlusCircle } from 'lucide-react';
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, collectionGroup, getDocs } from 'firebase/firestore';
import type { Submission, User as AppUser, Role } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}


export default function SubmissionsPage() {
  const { user, userProfile, isAdmin } = useUser();
  const firestore = useFirestore();

  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [roles, setRoles] = useState<Record<string, Role>>({});

  const [isLoading, setIsLoading] = useState(true);

  // This will store the final list of submissions to display
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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
      
      const baseQuery = collectionGroup(firestore, 'submissions');

      if (userRole === 'Admin') {
        submissionsQuery = query(baseQuery, orderBy('submissionDate', 'desc'));
      } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
        submissionsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId), orderBy('submissionDate', 'desc'));
      } else if (userRole === 'Unit ODIMO') {
        submissionsQuery = query(baseQuery, where('unitId', '==', userProfile.unitId), orderBy('submissionDate', 'desc'));
      } else {
        // Regular employee
        submissionsQuery = query(collection(firestore, 'users', userProfile.id, 'submissions'), orderBy('submissionDate', 'desc'));
      }

      const snapshot = await getDocs(submissionsQuery);
      
      const fetchedSubmissions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          submissionDate: (data.submissionDate as any)?.toDate ? (data.submissionDate as any).toDate() : new Date(data.submissionDate),
        } as Submission;
      });

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

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            {isSupervisor ? 'A list of all submissions in your scope.' : 'Here\'s a list of your report submissions.'}
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
                <TableHead>Link</TableHead>
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
                  <TableCell className="font-medium max-w-xs truncate">
                    <a href={submission.googleDriveLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {submission.googleDriveLink}
                    </a>
                  </TableCell>
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
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
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
    </>
  );
}

    