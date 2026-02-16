'use client';

import { PlusCircle, Eye, Trash2, Loader2, Download, FileText, Calendar as CalendarIcon, Building, School } from 'lucide-react';
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
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Submission, Campus, Unit } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitSubmissionsView } from '@/components/submissions/unit-submissions-view';
import { CampusSubmissionsView } from '@/components/submissions/campus-submissions-view';
import { format } from 'date-fns';
import Link from 'next/link';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    approved: 'default',
    pending: 'secondary',
    rejected: 'destructive',
    submitted: 'outline'
};

const getGoogleDriveDownloadLink = (url: string) => {
    const fileId = url.match(/d\/([^/]+)/);
    if (fileId && fileId[1]) {
        return `https://drive.google.com/uc?export=download&id=${fileId[1]}`;
    }
    return url;
};

const safeFormatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
        const d = date instanceof Timestamp ? date.toDate() : new Date(date);
        if (isNaN(d.getTime())) return 'Invalid Date';
        return format(d, 'PP');
    } catch (e) {
        return 'Invalid Date';
    }
};

export default function SubmissionsPage() {
  const { user, userProfile, isAdmin, isSupervisor, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
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

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissionsData = useMemo(() => {
    if (!rawSubmissions) return [];
    return [...rawSubmissions].sort((a, b) => {
        const dateA = a.submissionDate instanceof Timestamp ? a.submissionDate.toMillis() : new Date(a.submissionDate).getTime();
        const dateB = b.submissionDate instanceof Timestamp ? b.submissionDate.toMillis() : new Date(b.submissionDate).getTime();
        return dateB - dateA;
    });
  }, [rawSubmissions]);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'units') : null), [firestore, user]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

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
                    <CardHeader>
                        <CardTitle>Recent Submissions</CardTitle>
                        <CardDescription>A chronological list of all submitted reports.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoadingSubmissions ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="animate-spin h-8 w-8" />
                            </div>
                        ) : submissionsData.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Report Type</TableHead>
                                        <TableHead>Unit / Campus</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissionsData.map((sub) => (
                                        <TableRow key={sub.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{sub.reportType}</span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">{sub.cycleId} Cycle {sub.year}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {sub.unitName}</span>
                                                    <span className="flex items-center gap-1 text-muted-foreground"><School className="h-3 w-3" /> {campusMap.get(sub.campusId) || '...'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3 text-muted-foreground" /> 
                                                    {safeFormatDate(sub.submissionDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusVariant[sub.statusId] || 'secondary'} className="capitalize">
                                                    {sub.statusId === 'submitted' ? 'Awaiting Approval' : sub.statusId}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-1">
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`/submissions/${sub.id}`)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {isAdmin && (
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(sub)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2 border border-dashed rounded-lg">
                                <FileText className="h-12 w-12 opacity-10" />
                                <p>No submissions found.</p>
                            </div>
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
            <div className="py-2">
                <Input value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} placeholder={`Type "${challengeText}"`} />
            </div>
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
