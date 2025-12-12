
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
import { collection, query, orderBy, where, collectionGroup } from 'firebase/firestore';
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

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<Record<string, AppUser>>({});

  const rolesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roles') : null, [firestore]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: usersData, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  useEffect(() => {
    if (usersData) {
      setUsers(Object.fromEntries(usersData.map(u => [u.id, u])));
    }
  }, [usersData]);

  const userRole = useMemo(() => {
    if (isAdmin) return 'Admin';
    if (!userProfile || !roles) return null;
    return roles.find(r => r.id === userProfile.roleId)?.name;
  }, [isAdmin, userProfile, roles]);


  useEffect(() => {
    if (!firestore || !userRole || !userProfile) return;

    setIsLoading(true);
    let subsQuery;
    const baseQuery = collectionGroup(firestore, 'submissions');

    if (userRole === 'Admin') {
      subsQuery = query(baseQuery, orderBy('submissionDate', 'desc'));
    } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
      subsQuery = query(baseQuery, where('campusId', '==', userProfile.campusId), orderBy('submissionDate', 'desc'));
    } else if (userRole === 'Unit ODIMO') {
       subsQuery = query(baseQuery, where('unitId', '==', userProfile.unitId), orderBy('submissionDate', 'desc'));
    } else {
      // Regular user sees their own submissions
      subsQuery = query(collection(firestore, 'users', userProfile.id, 'submissions'), orderBy('submissionDate', 'desc'));
    }

    const unsubscribe = collection(firestore, 'submissions');

    const unsub = useCollection.prototype.constructor(subsQuery, (snapshot: any) => {
        const fetchedSubmissions = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            submissionDate: doc.data().submissionDate?.toDate() ?? new Date(),
        }));
        setSubmissions(fetchedSubmissions);
        setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching submissions:", error);
        setIsLoading(false);
    });

    return () => {
        if (typeof unsub === 'function') {
            unsub();
        }
    };

  }, [firestore, userRole, userProfile, isAdmin]);
  
  const pageIsLoading = isLoading || isLoadingRoles || isLoadingUsers;

  const isSupervisor = ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole ?? '');

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
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
          <Button asChild>
            <Link href="/submissions/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Submission
            </Link>
          </Button>
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
          {pageIsLoading ? (
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
          {!pageIsLoading && submissions?.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              You have not made any submissions yet.
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
