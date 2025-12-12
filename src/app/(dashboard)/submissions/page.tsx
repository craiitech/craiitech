
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
import { collection, query, orderBy } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
}


export default function SubmissionsPage() {
  const { user } = useUser();
  const firestore = useFirestore();

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'users', user.uid, 'submissions'), orderBy('submissionDate', 'desc'));
  }, [firestore, user]);

  const { data: submissions, isLoading } = useCollection<Submission>(submissionsQuery);

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            Here&apos;s a list of your report submissions.
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
          <CardTitle>My Submissions</CardTitle>
          <CardDescription>
            A history of all reports you have submitted.
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
                <TableHead>Link</TableHead>
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
                  <TableCell className="font-medium max-w-xs truncate">
                    <a href={submission.googleDriveLink} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {submission.googleDriveLink}
                    </a>
                  </TableCell>
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

    