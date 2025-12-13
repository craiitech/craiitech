
'use client';

import { PlusCircle, MessageSquare, Eye, ArrowUpDown } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import type { Submission, User as AppUser, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { FeedbackDialog } from '@/components/dashboard/feedback-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};

const submissionTypes = [
  'All Submissions',
  'Operational Plans',
  'Objectives Monitoring',
  'Risk and Opportunity Registry Form',
  'Risk and Opportunity Action Plan',
  'Updated Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

type SortConfig = {
    key: keyof Submission | 'submitterName' | 'campusName';
    direction: 'ascending' | 'descending';
} | null;


const SubmissionsTable = ({ 
    submissions, 
    isSupervisor,
    isAdmin,
    getUserName, 
    getCampusName,
    onEyeClick, 
    onViewFeedbackClick,
    sortConfig,
    requestSort
}: { 
    submissions: Submission[], 
    isSupervisor: boolean, 
    isAdmin: boolean,
    getUserName: (userId: string) => string, 
    getCampusName: (campusId: string) => string,
    onEyeClick: (submissionId: string) => void, 
    onViewFeedbackClick: (comments: any) => void,
    sortConfig: SortConfig,
    requestSort: (key: keyof Submission | 'submitterName' | 'campusName') => void
 }) => {
    if (submissions.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                No submissions found for this category.
            </div>
        );
    }

    const getSortIndicator = (key: keyof Submission | 'submitterName' | 'campusName') => {
      if (!sortConfig || sortConfig.key !== key) {
        return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
      }
      return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
    };

    return (
        <Table>
            <TableHeader>
              <TableRow>
                 {isAdmin && (
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('campusName')}>
                            Campus
                            {getSortIndicator('campusName')}
                        </Button>
                    </TableHead>
                )}
                <TableHead>
                   <Button variant="ghost" onClick={() => requestSort('reportType')}>
                        Report Type
                        {getSortIndicator('reportType')}
                    </Button>
                </TableHead>
                {isSupervisor && (
                    <TableHead>
                        <Button variant="ghost" onClick={() => requestSort('submitterName')}>
                            Submitter
                            {getSortIndicator('submitterName')}
                        </Button>
                    </TableHead>
                )}
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('unitName')}>
                        Unit
                        {getSortIndicator('unitName')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('year')}>
                        Year
                        {getSortIndicator('year')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('cycleId')}>
                        Cycle
                        {getSortIndicator('cycleId')}
                    </Button>
                </TableHead>
                <TableHead>
                    <Button variant="ghost" onClick={() => requestSort('submissionDate')}>
                        Submitted At
                        {getSortIndicator('submissionDate')}
                    </Button>
                </TableHead>
                <TableHead>
                     <Button variant="ghost" onClick={() => requestSort('statusId')}>
                        Status
                        {getSortIndicator('statusId')}
                    </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((submission) => (
                <TableRow key={submission.id}>
                  {isAdmin && <TableCell>{getCampusName(submission.campusId)}</TableCell>}
                  <TableCell className="font-medium">{submission.reportType}</TableCell>
                   {isSupervisor && <TableCell>{getUserName(submission.userId)}</TableCell>}
                  <TableCell>{submission.unitName}</TableCell>
                  <TableCell>{submission.year}</TableCell>
                  <TableCell className="capitalize">{submission.cycleId}</TableCell>
                  <TableCell>
                    {submission.submissionDate instanceof Date ? format(submission.submissionDate, 'MMMM d, yyyy') : 'Invalid Date'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                      {submission.statusId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                     {submission.statusId === 'rejected' && submission.comments && (
                        <Button variant="ghost" size="icon" onClick={() => onViewFeedbackClick(submission.comments)}>
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">View Feedback</span>
                        </Button>
                     )}
                    <Button variant="ghost" size="icon" onClick={() => onEyeClick(submission.id)}>
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View Details</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
    );
}


export default function SubmissionsPage() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);


  const [isLoading, setIsLoading] = useState(true);

  // This will store the final list of submissions to display
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  
  // State for feedback dialog
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All Submissions');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'submissionDate', direction: 'descending'});

  const isSupervisor = useMemo(() => {
    if (!userRole) return false;
    return ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole);
  }, [userRole]);


  useEffect(() => {
    // Wait until firestore and the user's role and profile are available.
    if (!firestore || !userRole || !userProfile) {
        if (!isSupervisor && firestore && userProfile) {
            // continue for regular users
        } else {
             return;
        }
    }

    const fetchSubmissions = async () => {
      setIsLoading(true);
      try {
        let submissionsQuery;
      
        const submissionsCollection = collection(firestore, 'submissions');

        if (userRole === 'Admin') {
            submissionsQuery = query(submissionsCollection);
        } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
            // Query without orderBy to avoid needing a composite index
            submissionsQuery = query(submissionsCollection, where('campusId', '==', userProfile.campusId));
        } else if (userRole === 'Unit ODIMO') {
            // Query without orderBy to avoid needing a composite index
            submissionsQuery = query(submissionsCollection, where('unitId', '==', userProfile.unitId));
        } else {
            // Regular employee - query only for their own submissions
            submissionsQuery = query(submissionsCollection, where('userId', '==', userProfile.id));
        }

        const snapshot = await getDocs(submissionsQuery);
      
        let fetchedSubmissions = snapshot.docs.map(doc => {
            const data = doc.data();
            const submissionDateRaw = data.submissionDate;
            // Ensure submissionDate is a JS Date object
            const submissionDate =
            submissionDateRaw instanceof Timestamp
                ? submissionDateRaw.toDate()
                : new Date(submissionDateRaw?.seconds * 1000);
            return {
            ...data,
            id: doc.id,
            submissionDate: submissionDate,
            } as Submission;
        });

        // If supervisor, fetch needed user data for display
        if (isSupervisor) {
            const userIds = [...new Set(fetchedSubmissions.map(s => s.userId))];
            // Fetch all users at once if admin, otherwise fetch only needed users for supervisors
            if (isAdmin && Object.keys(users).length === 0) { // fetch all only once
                const usersQuery = query(collection(firestore, 'users'));
                const usersSnapshot = await getDocs(usersQuery);
                setUsers(Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as AppUser])));
            } else if (!isAdmin && userIds.length > 0) {
                const newUsersToFetch = userIds.filter(id => !users[id]);
                if (newUsersToFetch.length > 0) {
                    const usersQuery = query(collection(firestore, 'users'), where('id', 'in', newUsersToFetch));
                    const usersSnapshot = await getDocs(usersQuery);
                    setUsers(prevUsers => ({
                        ...prevUsers,
                        ...Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as AppUser]))
                    }));
                }
            }
        }
      
        setSubmissions(fetchedSubmissions);

      } catch (error) {
        console.error("Failed to fetch submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubmissions();

  }, [firestore, userRole, userProfile, isAdmin, isSupervisor]);

  const getUserName = (userId: string) => {
    const user = users[userId];
    return user ? `${user.firstName} ${user.lastName}` : '...';
  };
   const getCampusName = (campusId: string) => {
    const campus = campuses?.find(c => c.id === campusId);
    return campus ? campus.name : '...';
  }
  
  const handleViewFeedback = (comments: any) => {
    if(Array.isArray(comments) && comments.length > 0) {
        setFeedbackToShow(comments[comments.length-1]?.text || 'No feedback provided');
    } else if (typeof comments === 'string') { // Backwards compatibility
        setFeedbackToShow(comments);
    } else {
        setFeedbackToShow('No feedback provided.');
    }
    setIsFeedbackDialogOpen(true);
  }
  
  const handleEyeClick = (submissionId: string) => {
      router.push(`/submissions/${submissionId}`);
  }

  const requestSort = (key: keyof Submission | 'submitterName' | 'campusName') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const sortedSubmissions = useMemo(() => {
    let sortableItems = [...submissions];
    if (activeFilter !== 'All Submissions') {
      sortableItems = sortableItems.filter(s => s.reportType === activeFilter);
    }

    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue, bValue;

            if (sortConfig.key === 'submitterName') {
                aValue = getUserName(a.userId);
                bValue = getUserName(b.userId);
            } else if (sortConfig.key === 'campusName') {
                aValue = getCampusName(a.campusId);
                bValue = getCampusName(b.campusId);
            }
            else {
                aValue = a[sortConfig.key as keyof Submission];
                bValue = b[sortConfig.key as keyof Submission];
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }

    return sortableItems;
  }, [submissions, activeFilter, sortConfig, users, campuses]);


  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            {isSupervisor ? 'A list of all submissions in your scope.' : "Here's a list of your report submissions."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {!isSupervisor && (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Submission
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Submission Instructions</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <ul className="list-disc space-y-2 pl-5 text-sm">
                        <li>
                            Prepare all required EOMS documents as a single PDF file (using Complete Staff Work format) in your RSU Google Drive.
                        </li>
                        <li>
                            Ensure the document is saved on your unit's Google Drive using your RSU email and that sharing is set to "anyone with the link can view."
                        </li>
                        <li>
                            The submission must be verified and approved by the QA Office.
                        </li>
                        <li>
                            You may receive comments if the submission is invalid or incorrect.
                        </li>
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => router.push('/submissions/new')}>
                    Continue
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className='mb-4 md:mb-0'>
                <CardTitle>{isSupervisor ? 'All Submissions' : 'My Submissions'}</CardTitle>
                <CardDescription>
                    {isSupervisor ? 'A history of all reports submitted by users in your campus/unit.' : 'A history of all reports you have submitted.'}
                </CardDescription>
            </div>
            <div className="w-full md:w-auto">
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-full md:w-[280px]">
                  <SelectValue placeholder="Filter by report type..." />
                </SelectTrigger>
                <SelectContent>
                  {submissionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
           {isLoading || (isAdmin && isLoadingCampuses) ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : (
                <SubmissionsTable 
                    submissions={sortedSubmissions}
                    isSupervisor={isSupervisor}
                    isAdmin={isAdmin}
                    getUserName={getUserName}
                    getCampusName={getCampusName}
                    onEyeClick={handleEyeClick}
                    onViewFeedbackClick={handleViewFeedback}
                    sortConfig={sortConfig}
                    requestSort={requestSort}
                />
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
