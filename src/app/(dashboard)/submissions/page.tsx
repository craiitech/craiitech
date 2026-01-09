
'use client';

import { PlusCircle, MessageSquare, Eye, ArrowUpDown, Trash2, Loader2, Printer, FileDown, Download, AlertCircle, Library, Rows, Building2 } from 'lucide-react';
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
import { collection, query, Timestamp, where, doc, deleteDoc, getDocs } from 'firebase/firestore';
import type { Submission, User as AppUser, Campus, Cycle, Unit } from '@/lib/types';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitSubmissionsView } from '@/components/submissions/unit-submissions-view';
import { CampusSubmissionsView } from '@/components/submissions/campus-submissions-view';


const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline',
    'awaiting approval': 'outline',
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
    usersMap, 
    campusMap,
    onEyeClick, 
    onViewFeedbackClick,
    onDeleteClick,
    sortConfig,
    requestSort,
    cycles,
}: { 
    submissions: Submission[], 
    isSupervisor: boolean, 
    isAdmin: boolean,
    usersMap: Map<string, AppUser>, 
    campusMap: Map<string, string>,
    onEyeClick: (submissionId: string) => void, 
    onViewFeedbackClick: (comments: any) => void,
    onDeleteClick: (submission: Submission) => void,
    sortConfig: SortConfig,
    requestSort: (key: keyof Submission | 'submitterName' | 'campusName') => void,
    cycles: Map<string, Cycle>
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
    
    const isLate = (submission: Submission): boolean => {
      const cycle = cycles.get(submission.cycleId);
      if (!cycle || !cycle.endDate) {
        return false;
      }
      const deadline = cycle.endDate instanceof Timestamp ? cycle.endDate.toDate() : new Date(cycle.endDate);
      const submissionDate = submission.submissionDate instanceof Timestamp ? submission.submissionDate.toDate() : new Date(submission.submissionDate);
      return submissionDate > deadline;
    }

    const getStatusText = (status: string) => {
      return status === 'submitted' ? 'Awaiting Approval' : status;
    }


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
                  {isAdmin && <TableCell>{campusMap.get(submission.campusId) ?? '...'}</TableCell>}
                  <TableCell className="font-medium">{submission.reportType}</TableCell>
                   {isSupervisor && <TableCell>{`${usersMap.get(submission.userId)?.firstName || ''} ${usersMap.get(submission.userId)?.lastName || ''}`}</TableCell>}
                  <TableCell>{submission.unitName}</TableCell>
                  <TableCell>{submission.year}</TableCell>
                  <TableCell className="capitalize">{submission.cycleId}</TableCell>
                  <TableCell>
                    {submission.submissionDate instanceof Date ? format(submission.submissionDate, 'MMMM d, yyyy') : 'Invalid Date'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Badge variant={statusVariant[submission.statusId] ?? 'secondary'} className="capitalize">
                          {getStatusText(submission.statusId)}
                        </Badge>
                        {isLate(submission) && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Submitted after deadline</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
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
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={getGoogleDriveDownloadLink(submission.googleDriveLink)} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                  <span className="sr-only">Download File</span>
                                </Link>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Download File</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDeleteClick(submission)}>
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Submission</span>
                              </Button>
                            </TooltipTrigger>
                             <TooltipContent>
                              <p>Delete Submission</p>
                            </TooltipContent>
                          </Tooltip>
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
  const { userProfile, isAdmin, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { logSessionActivity } = useSessionActivity();
  
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    if (isAdmin) {
        return collection(firestore, 'users');
    }
    if (isSupervisor) {
        if (!userProfile.campusId) return null;
        return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    }
    // For single user view, we only need their own user object
    return query(collection(firestore, 'users'), where('id', '==', userProfile.id));
  }, [firestore, isAdmin, isSupervisor, userProfile]);
  
  const { data: users, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (isSupervisor && userProfile?.campusId) {
      return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    if (userProfile) {
      return query(collection(firestore, 'submissions'), where('userId', '==', userProfile.id));
    }
    return null;
  }, [firestore, isAdmin, isSupervisor, userProfile]);

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);


  // Effect to fetch user data based on loaded submissions
  useEffect(() => {
    if (!submissionsData || !firestore || !isSupervisor) return;

    const fetchUsers = async () => {
      const userIds = [...new Set(submissionsData.map(s => s.userId))];
      if (userIds.length === 0) return;

      const newUsersMap = new Map<string, AppUser>();
      // Firestore 'in' query is limited to 30 elements. We might need to batch this.
      const batchSize = 30;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batchIds = userIds.slice(i, i + batchSize);
        if (batchIds.length > 0) {
          const q = query(collection(firestore, 'users'), where('id', 'in', batchIds));
          const userSnap = await getDocs(q);
          userSnap.forEach(doc => {
            newUsersMap.set(doc.id, { ...doc.data() as AppUser, id: doc.id });
          });
        }
      }
    };

    fetchUsers();
  }, [submissionsData, firestore, isSupervisor]);

  const isLoading = isLoadingSubmissions || isLoadingCampuses || isLoadingCycles || isLoadingUnits || isLoadingUsers;

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('All Submissions');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'submissionDate', direction: 'descending'});
  const [activeTab, setActiveTab] = useState('all-submissions');

  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const usersMap = useMemo(() => {
      const map = new Map<string, AppUser>();
      if (users) {
          users.forEach(u => map.set(u.id, u));
      }
      return map;
  }, [users]);
  
  const campusMap = useMemo(() => {
      const map = new Map<string, string>();
      if (campuses) {
          campuses.forEach(c => map.set(c.id, c.name));
      }
      return map;
  }, [campuses]);

  const submissions = useMemo(() => {
    if (!submissionsData) return [];
    return submissionsData.map(s => ({
        ...s,
        submissionDate: s.submissionDate instanceof Timestamp ? s.submissionDate.toDate() : new Date(s.submissionDate)
    }));
  }, [submissionsData]);

  
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
  
  const cycleMap = useMemo(() => {
    if (!cycles) return new Map<string, Cycle>();
    return new Map(cycles.map(c => [c.id, c]));
  }, [cycles]);


  const sortedSubmissions = useMemo(() => {
    let sortableItems = [...submissions];
    if (activeFilter !== 'All Submissions') {
      sortableItems = sortableItems.filter(s => s.reportType === activeFilter);
    }

    if (sortConfig !== null) {
        sortableItems.sort((a, b) => {
            let aValue: any, bValue: any;

            if (sortConfig.key === 'submitterName') {
                const userA = usersMap.get(a.userId);
                aValue = userA ? `${userA.firstName} ${userA.lastName}` : '';
                const userB = usersMap.get(b.userId);
                bValue = userB ? `${userB.firstName} ${userB.lastName}` : '';
            } else if (sortConfig.key === 'campusName') {
                aValue = campusMap.get(a.campusId) ?? '';
                bValue = campusMap.get(b.campusId) ?? '';
            } else {
                aValue = a[sortConfig.key as keyof Submission];
                bValue = b[sortConfig.key as keyof Submission];
            }
            
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
  }, [submissions, activeFilter, sortConfig, usersMap, campusMap]);

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
            baseData['Campus'] = campusMap.get(s.campusId);
        }
        if (isSupervisor) {
            const user = usersMap.get(s.userId);
            baseData['Submitter'] = user ? `${user.firstName} ${user.lastName}` : '';
        }
        return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Submissions');
    XLSX.writeFile(workbook, 'submissions-export.xlsx');
  };

  const canSubmit = !isSupervisor || userRole === 'Unit ODIMO';


  return (
    <>
    <TooltipProvider>
      <div className="space-y-2">
        <div className="flex items-start justify-between print:hidden">
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
            {canSubmit && (
              <>
                <Button variant="outline" asChild>
                    <Link href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank">
                        <Download className="mr-2 h-4 w-4" />
                        Download Templates
                    </Link>
                </Button>
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
                                Prepare all required EOMS documents (Updated SWOT, Updated Need and Expectation, Operational Plan, Objectives Monitoring, Risk and Opportunities and Risk and Opportunity Action Plans) in PDF Format (using Complete Staff Work) in your EOMS Folder on your RSU Google Drive or Official Unit Google Drive.
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
              </>
            )}
          </div>
        </div>
      </div>
      
       <div className="hidden print:block text-center mb-4">
          <h1 className="text-2xl font-bold">Submissions Report</h1>
          <p className="text-muted-foreground">Generated on: {new Date().toLocaleDateString()}</p>
      </div>

       <Tabs defaultValue="all-submissions" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="print:hidden">
            <TabsTrigger value="all-submissions">
              <Rows className="mr-2 h-4 w-4" />
              All Submissions
            </TabsTrigger>
            {isSupervisor && !isAdmin && (
              <TabsTrigger value="by-unit">
                <Library className="mr-2 h-4 w-4" />
                Unit Submissions
              </TabsTrigger>
            )}
             {isAdmin && (
              <TabsTrigger value="by-campus">
                <Building2 className="mr-2 h-4 w-4" />
                Campus Submissions
              </TabsTrigger>
            )}
        </TabsList>
        <TabsContent value="all-submissions" className="printable-area" data-state={activeTab === 'all-submissions' ? 'active' : 'inactive'}>
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
                {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : (
                        <SubmissionsTable 
                            submissions={sortedSubmissions}
                            isSupervisor={isSupervisor ?? false}
                            isAdmin={isAdmin ?? false}
                            usersMap={usersMap}
                            campusMap={campusMap}
                            onEyeClick={handleEyeClick}
                            onViewFeedbackClick={handleViewFeedback}
                            onDeleteClick={handleDeleteClick}
                            sortConfig={sortConfig}
                            requestSort={requestSort}
                            cycles={cycleMap}
                        />
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        {isSupervisor && !isAdmin && (
            <TabsContent value="by-unit" className="printable-area" data-state={activeTab === 'by-unit' ? 'active' : 'inactive'}>
                <UnitSubmissionsView
                    allSubmissions={submissions}
                    allUnits={units}
                    userProfile={userProfile}
                    isLoading={isLoading}
                />
            </TabsContent>
        )}
        {isAdmin && (
            <TabsContent value="by-campus" className="printable-area" data-state={activeTab === 'by-campus' ? 'active' : 'inactive'}>
                <CampusSubmissionsView
                    allSubmissions={submissions}
                    allCampuses={campuses}
                    allUnits={units}
                    isLoading={isLoading}
                />
            </TabsContent>
        )}
      </Tabs>

      </TooltipProvider>
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
