
'use client';

import { PlusCircle, MessageSquare, Eye, ArrowUpDown, Trash2, Loader2, Printer, FileDown, Download, AlertCircle, Library, Rows, Building2, Send, Edit, ShieldCheck } from 'lucide-react';
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
import { collection, query, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
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
import { SubmissionReport } from '@/components/submissions/submission-report';
import ReactDOMServer from 'react-dom/server';
import { cn } from '@/lib/utils';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline',
};

const submissionTypesList = [
  'All Submissions',
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan',
  'Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

type SortConfig = {
    key: keyof Submission | 'submitterName' | 'campusName' | 'comments';
    direction: 'ascending' | 'descending';
} | null;

const getGoogleDriveDownloadLink = (url: string) => {
    const fileId = url.match(/d\/([^/]+)/);
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId[1]}` : url;
};

export default function SubmissionsPage() {
  const { user, userProfile, isAdmin, isSupervisor, isMainCampusCoordinator, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [activeFilter, setActiveFilter] = useState('All Submissions');
  const [activeYearFilter, setActiveYearFilter] = useState('All Years');
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (isSupervisor && userProfile.campusId) {
      return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    return query(collection(firestore, 'submissions'), where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, isAdmin, isSupervisor, userProfile, isUserLoading]);

  const { data: submissionsData, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'units') : null), [firestore, user]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const handleDeleteClick = (submission: Submission) => {
    setDeletingSubmission(submission);
    setChallengeText(`delete-${Math.floor(1000 + Math.random() * 9000)}`);
    setConfirmationText('');
  }

  const handleConfirmDelete = async () => {
    if (!firestore || !deletingSubmission) return;
    setIsDeleting(true);
    try {
        await deleteDoc(doc(firestore, 'submissions', deletingSubmission.id));
        toast({ title: 'Submission Deleted', description: 'Record removed permanently.' });
    } catch (error) {
         toast({ title: 'Error', description: 'Could not delete submission.', variant: 'destructive' });
    } finally {
        setIsDeleting(false);
        setDeletingSubmission(null);
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
            <p className="text-muted-foreground">Manage unit compliance documentation.</p>
          </div>
          <div className="flex items-center space-x-2">
            {!isSupervisor && (
                <Button onClick={() => router.push('/submissions/new')}><PlusCircle className="mr-2 h-4 w-4" /> New Submission</Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="all-submissions" className="space-y-4">
            <TabsList>
                <TabsTrigger value="all-submissions">All Submissions</TabsTrigger>
                {isSupervisor && !isAdmin && <TabsTrigger value="by-unit">Unit Submissions</TabsTrigger>}
                {isAdmin && <TabsTrigger value="by-campus">Campus Submissions</TabsTrigger>}
            </TabsList>
            <TabsContent value="all-submissions">
                <Card>
                    <CardHeader><CardTitle>Unit Records</CardTitle></CardHeader>
                    <CardContent>
                        {isLoadingSubmissions ? <Loader2 className="animate-spin h-8 w-8 mx-auto" /> : (
                            <p className="text-sm text-muted-foreground">Please use the tabs or drill-down components to manage specific unit records.</p>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            {isSupervisor && !isAdmin && <TabsContent value="by-unit"><UnitSubmissionsView allSubmissions={submissionsData} allUnits={units} userProfile={userProfile} isLoading={isLoadingSubmissions} /></TabsContent>}
            {isAdmin && <TabsContent value="by-campus"><CampusSubmissionsView allSubmissions={submissionsData} allCampuses={campuses} allUnits={units} isLoading={isLoadingSubmissions} isAdmin={isAdmin} onDeleteClick={handleDeleteClick} /></TabsContent>}
        </Tabs>
      </div>

      <FeedbackDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} feedback={feedbackToShow} />
      
      <AlertDialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>Delete <strong>{deletingSubmission?.reportType}</strong>. Type <strong className="text-destructive">{challengeText}</strong> to confirm.</AlertDialogDescription>
            </AlertDialogHeader>
            <Input value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} placeholder={`Type "${challengeText}"`} />
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting || confirmationText !== challengeText} className="bg-destructive">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
