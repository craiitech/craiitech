
'use client';

import { PlusCircle, MessageSquare, Eye, ArrowUpDown, Trash2, Loader2, Printer, FileDown, Download } from 'lucide-react';
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
import { collection, query, getDocs, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import type { Submission, User as AppUser, Campus } from '@/lib/types';
import { format } from 'date-fns';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import * as XLSX from 'xlsx';


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

const getGoogleDriveDownloadLink = (url: string) => {
    const fileId = url.match(/d\/([^/]+)/);
    if (fileId && fileId[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileId[1]}`;
    }
    // Fallback for different URL format or if regex fails
    return url;
};

const SubmissionsTable = ({ 
    submissions, 
    isSupervisor,
    isAdmin,
    getUserName, 
    getCampusName,
    onEyeClick, 
    onViewFeedbackClick,
    onDeleteClick,
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
    onDeleteClick: (submission: Submission) => void,
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
                    {isAdmin && (
                        <>
                        <a href={getGoogleDriveDownloadLink(submission.googleDriveLink)} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon">
                                <Download className="h-4 w-4" />
                                <span className="sr-only">Download File</span>
                            </Button>
                        </a>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteClick(submission)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Submission</span>
                        </Button>
                        </>
                    )}
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
  const { toast } = useToast();
  const { logSessionActivity } = useSessionActivity();

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

  // State for delete dialog
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const isSupervisor = useMemo(() => {
    if (!userRole) return false;
    return ['Admin', 'Campus Director', 'Campus ODIMO', 'Unit ODIMO'].includes(userRole);
  }, [userRole]);


  useEffect(() => {
    if (!firestore || !userRole || !userProfile) {
        return;
    }
    
    const fetchSupervisorData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch relevant users first
            let usersQuery;
            const usersCollection = collection(firestore, 'users');

            if (userRole === 'Admin') {
                usersQuery = query(usersCollection);
            } else if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
                usersQuery = query(usersCollection, where('campusId', '==', userProfile.campusId));
            } else if (userRole === 'Unit ODIMO') {
                usersQuery = query(usersCollection, where('unitId', '==', userProfile.unitId));
            }

            if (!usersQuery) {
                 setIsLoading(false);
                 return;
            }

            const usersSnapshot = await getDocs(usersQuery);
            const fetchedUsers = Object.fromEntries(usersSnapshot.docs.map(doc => [doc.id, doc.data() as AppUser]));
            setUsers(fetchedUsers);

            // 2. Fetch submissions for those users
            const userIds = Object.keys(fetchedUsers);
            if (userIds.length === 0) {
                setSubmissions([]);
                setIsLoading(false);
                return;
            }

            const submissionsCollection = collection(firestore, 'submissions');
            const submissionsPromises = [];
            // Firestore 'in' query limit is 30
            for (let i = 0; i < userIds.length; i += 30) {
                const chunk = userIds.slice(i, i + 30);
                submissionsPromises.push(getDocs(query(submissionsCollection, where('userId', 'in', chunk))));
            }
            
            const submissionsSnapshots = await Promise.all(submissionsPromises);
            const allSubmissions = submissionsSnapshots.flatMap(snap => snap.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    submissionDate: (data.submissionDate as Timestamp).toDate(),
                } as Submission;
            }));

            setSubmissions(allSubmissions);

        } catch (error) {
            console.error("Failed to fetch supervisor data:", error);
            toast({ title: 'Error', description: 'Could not load data.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    };
    
    const fetchUserData = async () => {
        setIsLoading(true);
        try {
             const submissionsCollection = collection(firestore, 'submissions');
             const submissionsQuery = query(submissionsCollection, where('userId', '==', userProfile.id));
             const snapshot = await getDocs(submissionsQuery);
             const fetchedSubmissions = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    id: doc.id,
                    submissionDate: (data.submissionDate as Timestamp).toDate(),
                } as Submission;
            });
            setSubmissions(fetchedSubmissions);
        } catch (error) {
             console.error("Failed to fetch user submissions:", error);
             toast({ title: 'Error', description: 'Could not load your submissions.', variant: 'destructive'});
        } finally {
            setIsLoading(false);
        }
    }

    if (isSupervisor) {
      fetchSupervisorData();
    } else {
      fetchUserData();
    }

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

  const handleDeleteClick = (submission: Submission) => {
    setDeletingSubmission(submission);
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setChallengeText(`delete-${randomId}`);
    setConfirmationText('');
  }

  const handleConfirmDelete = async () => {
    if (!firestore || !deletingSubmission) return;

    setIsDeleting(true);
    try {
        const submissionRef = doc(firestore, 'submissions', deletingSubmission.id);
        await deleteDoc(submissionRef);
        
        setSubmissions(prev => prev.filter(s => s.id !== deletingSubmission.id));
        logSessionActivity(`Deleted submission: ${deletingSubmission.reportType} (ID: ${deletingSubmission.id})`, {
          action: 'delete_submission',
          details: { submissionId: deletingSubmission.id },
        });

        toast({
            title: 'Submission Deleted',
            description: 'The submission has been permanently removed.'
        });
    } catch (error) {
         console.error('Error deleting submission:', error);
         toast({
            title: 'Error',
            description: 'Could not delete the submission.',
            variant: 'destructive'
         });
    } finally {
        setIsDeleting(false);
        setDeletingSubmission(null);
    }
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
            
            // Handle date sorting
            if (aValue instanceof Date && bValue instanceof Date) {
                 if (aValue.getTime() < bValue.getTime()) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue.getTime() > bValue.getTime()) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
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

  const handlePrint = () => {
    window.print();
  };

  const handleExportToExcel = () => {
    const dataToExport = sortedSubmissions.map(s => {
        const baseData: any = {
            'Report Type': s.reportType,
            'Unit': s.unitName,
            'Year': s.year,
            'Cycle': s.cycleId,
            'Submitted At': format(s.submissionDate, 'yyyy-MM-dd HH:mm'),
            'Status': s.statusId,
            'Link': s.googleDriveLink,
        };

        if (isAdmin) {
            baseData['Campus'] = getCampusName(s.campusId);
        }
        if (isSupervisor) {
            baseData['Submitter'] = getUserName(s.userId);
        }
        return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    XLSX.writeFile(workbook, 'submissions-export.xlsx');
  };


  return (
    <>
      <div className="flex items-start justify-between space-y-2 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
          <p className="text-muted-foreground">
            {isSupervisor ? 'A list of all submissions in your scope.' : "Here's a list of your report submissions."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print Report
            </Button>
            <Button variant="outline" onClick={handleExportToExcel}>
                <FileDown className="mr-2 h-4 w-4" />
                Export to Excel
            </Button>
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
      <div className="hidden print:block text-center mb-4">
          <h1 className="text-2xl font-bold">Submissions Report</h1>
          <p className="text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
      </div>
      <Card>
        <CardHeader className="print:hidden">
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
                    onDeleteClick={handleDeleteClick}
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
      <AlertDialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the submission for <strong>{deletingSubmission?.reportType}</strong> from <strong>{deletingSubmission?.unitName}</strong>.
                    <br/><br/>
                    Please type <strong className="text-destructive">{challengeText}</strong> to confirm.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={`Type "${challengeText}" to confirm`}
                className="bg-muted"
            />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleConfirmDelete} 
                    disabled={isDeleting || confirmationText !== challengeText}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete Submission
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
