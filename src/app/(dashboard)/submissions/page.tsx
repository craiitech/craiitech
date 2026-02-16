
'use client';

import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Building, School, User, ArrowUpDown, Search, FileText } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import type { Submission, Campus, Unit, User as AppUser } from '@/lib/types';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitSubmissionsView } from '@/components/submissions/unit-submissions-view';
import { CampusSubmissionsView } from '@/components/submissions/campus-submissions-view';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { submissionTypes } from './new/page';

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
  
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

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

  const usersQuery = useMemoFirebase(
    () => (firestore && (isAdmin || isSupervisor) ? collection(firestore, 'users') : null),
    [firestore, isAdmin, isSupervisor]
  );
  const { data: allUsers } = useCollection<AppUser>(usersQuery);

  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers?.forEach(u => map.set(u.id, `${u.firstName} ${u.lastName}`));
    return map;
  }, [allUsers]);

  const submissionsData = useMemo(() => {
    if (!rawSubmissions) return [];
    
    let filtered = [...rawSubmissions];

    if (reportTypeFilter !== 'all') {
        filtered = filtered.filter(s => s.reportType === reportTypeFilter);
    }

    if (yearFilter !== 'all') {
        filtered = filtered.filter(s => String(s.year) === yearFilter);
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(s => s.statusId === statusFilter);
    }

    return filtered.sort((a, b) => {
        const dateA = a.submissionDate instanceof Timestamp ? a.submissionDate.toMillis() : new Date(a.submissionDate).getTime();
        const dateB = b.submissionDate instanceof Timestamp ? b.submissionDate.toMillis() : new Date(b.submissionDate).getTime();
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [rawSubmissions, reportTypeFilter, yearFilter, statusFilter, sortOrder]);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'units') : null), [firestore, user]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

  const availableYears = useMemo(() => {
    if (!rawSubmissions) return [];
    const years = Array.from(new Set(rawSubmissions.map(s => String(s.year))));
    return years.sort((a,b) => b.localeCompare(a));
  }, [rawSubmissions]);

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
                <Button 
                  onClick={() => router.push('/submissions/new')}
                  className="animate-pulse shadow-lg shadow-primary/20"
                >
                  <PlusCircle className="mr-2 h-4 w-4" /> New Submission / Resubmission
                </Button>
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
                    <CardHeader className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Recent Submissions</CardTitle>
                            <CardDescription>A chronological list of all submitted reports.</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Report Type</label>
                                <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                                    <SelectTrigger className="w-[180px] h-8 text-xs">
                                        <SelectValue placeholder="All Reports" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Reports</SelectItem>
                                        {submissionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Year</label>
                                <Select value={yearFilter} onValueChange={setYearFilter}>
                                    <SelectTrigger className="w-[100px] h-8 text-xs">
                                        <SelectValue placeholder="All Years" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Years</SelectItem>
                                        {availableYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[150px] h-8 text-xs">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="submitted">Awaiting Approval</SelectItem>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground block">Order</label>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-xs gap-2"
                                    onClick={() => setSortOrder(sortOrder === 'recent' ? 'oldest' : 'recent')}
                                >
                                    <ArrowUpDown className="h-3 w-3" />
                                    {sortOrder === 'recent' ? 'Recent' : 'Oldest'}
                                </Button>
                            </div>
                        </div>
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
                                        <TableHead>Uploader</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissionsData.map((sub) => (
                                        <TableRow 
                                            key={sub.id} 
                                            className={cn("transition-colors", getYearRowColor(sub.year))}
                                        >
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm">{sub.reportType}</span>
                                                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-tighter">
                                                        {sub.cycleId} Cycle {sub.year} &bull; {sub.controlNumber}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="flex items-center gap-1 font-medium"><Building className="h-3 w-3" /> {sub.unitName}</span>
                                                    <span className="flex items-center gap-1 text-muted-foreground"><School className="h-3 w-3" /> {campusMap.get(sub.campusId) || '...'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3 w-3 text-muted-foreground" />
                                                    <span className="font-medium">{userMap.get(sub.userId) || '...'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1">
                                                    <CalendarIcon className="h-3 w-3 text-muted-foreground" /> 
                                                    {safeFormatDate(sub.submissionDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    className={cn(
                                                        "capitalize font-black text-[10px] px-2 py-0.5 shadow-sm border-none",
                                                        sub.statusId === 'approved' && "bg-emerald-600 text-white hover:bg-emerald-700",
                                                        sub.statusId === 'rejected' && "bg-rose-600 text-white hover:bg-rose-700",
                                                        sub.statusId === 'submitted' && "bg-amber-500 text-amber-950 hover:bg-amber-600",
                                                        sub.statusId === 'pending' && "bg-slate-500 text-white hover:bg-slate-600"
                                                    )}
                                                >
                                                    {sub.statusId === 'submitted' ? 'AWAITING APPROVAL' : sub.statusId.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2 whitespace-nowrap">
                                                <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    className="text-[10px] h-8 px-3 font-bold bg-primary shadow-sm"
                                                    onClick={() => router.push(`/submissions/${sub.id}`)}
                                                >
                                                    VIEW SUBMISSION
                                                </Button>
                                                {isAdmin && (
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        className="text-[10px] h-8 px-3 font-bold shadow-sm"
                                                        onClick={() => handleDeleteClick(sub)}
                                                    >
                                                        DELETE SUBMISSION
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
                                <p>No submissions found matching your filters.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            {isSupervisor && !isAdmin && <TabsContent value="by-unit"><UnitSubmissionsView allSubmissions={rawSubmissions} allUnits={units} userProfile={userProfile} isLoading={isLoadingSubmissions} /></TabsContent>}
            {isAdmin && <TabsContent value="by-campus"><CampusSubmissionsView allSubmissions={rawSubmissions} allCampuses={campuses} allUnits={units} isLoading={isLoadingSubmissions} isAdmin={isAdmin} onDeleteClick={handleDeleteClick} /></TabsContent>}
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
