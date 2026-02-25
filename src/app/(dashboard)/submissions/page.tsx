'use client';

import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Building, School, User, ArrowUpDown, Search, FileText, BarChart3, List, Filter } from 'lucide-react';
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
import type { Submission, Campus, Unit, User as AppUser, Cycle } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useState, useMemo, useEffect } from 'react';
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
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnitSubmissionsView } from '@/components/submissions/unit-submissions-view';
import { CampusSubmissionsView } from '@/components/submissions/campus-submissions-view';
import { SubmissionDashboard } from '@/components/submissions/submission-dashboard';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { submissionTypes } from './new/page';

/**
 * Returns a Tailwind class string for row background based on the submission year.
 */
const getYearRowColor = (year: number, cycle: string) => {
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
  const { user, userProfile, isAdmin, isAuditor, isSupervisor, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    // Institutional View: Admins and Auditors see everything.
    if (isAdmin || isAuditor) return collection(firestore, 'submissions');
    
    if (isSupervisor && userProfile.campusId) {
      return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    return query(collection(firestore, 'submissions'), where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, isAdmin, isAuditor, isSupervisor, userProfile, isUserLoading]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore && (isAdmin || isSupervisor || isAuditor) ? collection(firestore, 'users') : null),
    [firestore, isAdmin, isSupervisor, isAuditor]
  );
  const { data: allUsers } = useCollection<AppUser>(usersQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers?.forEach(u => map.set(u.id, `${u.firstName} ${u.lastName}`));
    return map;
  }, [allUsers]);

  const filteredUnitsList = useMemo(() => {
    if (!allUnits) return [];
    if (campusFilter === 'all') return allUnits;
    return allUnits.filter(u => u.campusIds?.includes(campusFilter));
  }, [allUnits, campusFilter]);

  const availableYears = useMemo(() => {
    if (!rawSubmissions) return [new Date().getFullYear().toString()];
    const years = Array.from(new Set(rawSubmissions.map(s => String(s.year))));
    if (years.length === 0) return [new Date().getFullYear().toString()];
    return years.sort((a,b) => b.localeCompare(a));
  }, [rawSubmissions]);

  // Handle campus filter change
  useEffect(() => {
    setUnitFilter('all');
  }, [campusFilter]);

  // Initial campus lock for supervisors
  useEffect(() => {
    if (isSupervisor && !isAdmin && userProfile?.campusId) {
        setCampusFilter(userProfile.campusId);
    }
  }, [isSupervisor, isAdmin, userProfile?.campusId]);

  // Data specifically for the Dashboard visuals (Reactive to site filters)
  const dashboardSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    let filtered = [...rawSubmissions];
    if (yearFilter !== 'all') filtered = filtered.filter(s => String(s.year) === yearFilter);
    if (campusFilter !== 'all') filtered = filtered.filter(s => s.campusId === campusFilter);
    if (unitFilter !== 'all') filtered = filtered.filter(s => s.unitId === unitFilter);
    return filtered;
  }, [rawSubmissions, yearFilter, campusFilter, unitFilter]);

  const dashboardUnits = useMemo(() => {
    if (!allUnits) return [];
    let filtered = [...allUnits];
    if (campusFilter !== 'all') filtered = filtered.filter(u => u.campusIds?.includes(campusFilter));
    if (unitFilter !== 'all') filtered = filtered.filter(u => u.id === unitFilter);
    return filtered;
  }, [allUnits, campusFilter, unitFilter]);

  // Data for the table (Filtered by all active filters)
  const tableSubmissionsData = useMemo(() => {
    if (!rawSubmissions) return [];
    
    let filtered = [...rawSubmissions];

    if (yearFilter !== 'all') {
        filtered = filtered.filter(s => String(s.year) === yearFilter);
    }

    if (campusFilter !== 'all') {
        filtered = filtered.filter(s => s.campusId === campusFilter);
    }

    if (unitFilter !== 'all') {
        filtered = filtered.filter(s => s.unitId === unitFilter);
    }

    if (reportTypeFilter !== 'all') {
        filtered = filtered.filter(s => s.reportType === reportTypeFilter);
    }

    if (statusFilter !== 'all') {
        filtered = filtered.filter(s => s.statusId === statusFilter);
    }

    return filtered.sort((a, b) => {
        const dateA = a.submissionDate instanceof Timestamp ? a.submissionDate.toMillis() : new Date(a.submissionDate).getTime();
        const dateB = b.submissionDate instanceof Timestamp ? b.submissionDate.toMillis() : new Date(b.submissionDate).getTime();
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [rawSubmissions, reportTypeFilter, yearFilter, statusFilter, campusFilter, unitFilter, sortOrder]);

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

  const isInstitutionalViewer = isAdmin || isAuditor;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Submissions Hub</h2>
            <p className="text-muted-foreground">Manage unit compliance documentation and track overall performance across university sites.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block">View Year</label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[140px] h-9 bg-card font-semibold shadow-sm">
                        <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                        <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {availableYears.map(y => <SelectItem key={y} value={y}>AY {y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            {!isSupervisor && !isAuditor && (
                <div className="pt-5">
                    <Button 
                        onClick={() => router.push('/submissions/new')}
                        className="shadow-lg shadow-primary/20 h-9 font-bold uppercase text-[10px] tracking-widest"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> New Submission
                    </Button>
                </div>
            )}
          </div>
        </div>

        {/* Global Filter Bar */}
        <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <School className="h-2.5 w-2.5" /> Campus Site Filter
                    </label>
                    <Select 
                        value={campusFilter} 
                        onValueChange={setCampusFilter}
                        disabled={!isInstitutionalViewer}
                    >
                        <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue placeholder="All Campuses" />
                        </SelectTrigger>
                        <SelectContent>
                            {isInstitutionalViewer && <SelectItem value="all">All Campuses</SelectItem>}
                            {campuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Building className="h-2.5 w-2.5" /> Unit / Office Filter
                    </label>
                    <Select 
                        value={unitFilter} 
                        onValueChange={setUnitFilter}
                        disabled={campusFilter === 'all' && isInstitutionalViewer}
                    >
                        <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue placeholder="All Units" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Units</SelectItem>
                            {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <FileText className="h-2.5 w-2.5" /> Report Type
                    </label>
                    <Select value={reportTypeFilter} onValueChange={setReportTypeFilter}>
                        <SelectTrigger className="h-9 text-xs bg-white">
                            <SelectValue placeholder="All Reports" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Reports</SelectItem>
                            {submissionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                        <Filter className="h-2.5 w-2.5" /> Status
                    </label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-xs bg-white">
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
            </CardContent>
        </Card>

        <Tabs defaultValue="visual-insights" className="space-y-4">
            <TabsList className="bg-muted/50 p-1 border">
                <TabsTrigger value="visual-insights" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                    <BarChart3 className="h-4 w-4" /> Visual Insights
                </TabsTrigger>
                <TabsTrigger value="all-submissions" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                    <List className="h-4 w-4" /> Detailed Log
                </TabsTrigger>
                {isSupervisor && !isAdmin && <TabsTrigger value="by-unit" className="data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">Unit Explorer</TabsTrigger>}
                {(isAdmin || isAuditor) && <TabsTrigger value="by-campus" className="data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">Site Matrix</TabsTrigger>}
            </TabsList>

            <TabsContent value="visual-insights" className="animate-in fade-in duration-500">
                <SubmissionDashboard 
                    submissions={dashboardSubmissions}
                    cycles={cycles || []}
                    allUnits={dashboardUnits}
                    isLoading={isLoadingSubmissions || isLoadingCycles || isLoadingUnits}
                />
            </TabsContent>

            <TabsContent value="all-submissions" className="animate-in fade-in duration-500">
                <Card className="shadow-md border-primary/10 overflow-hidden">
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b bg-muted/5">
                        <div className="space-y-1">
                            <CardTitle className="text-lg uppercase font-black tracking-tight">Submission Audit Log</CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">
                                Displaying {tableSubmissionsData.length} records matching the current filters.
                            </CardDescription>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 bg-white"
                            onClick={() => setSortOrder(sortOrder === 'recent' ? 'oldest' : 'recent')}
                        >
                            <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                            Sort: {sortOrder === 'recent' ? 'Recent First' : 'Oldest First'}
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoadingSubmissions ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
                            </div>
                        ) : tableSubmissionsData.length > 0 ? (
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-bold uppercase text-[10px] pl-6 py-3">Report & Control Info</TableHead>
                                        <TableHead className="font-bold uppercase text-[10px] py-3">Origin Unit / Office</TableHead>
                                        <TableHead className="font-bold uppercase text-[10px] py-3">Uploader</TableHead>
                                        <TableHead className="font-bold uppercase text-[10px] py-3">Submission Date</TableHead>
                                        <TableHead className="font-bold uppercase text-[10px] py-3">Status</TableHead>
                                        <TableHead className="text-right font-bold uppercase text-[10px] py-3 pr-6">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableSubmissionsData.map((sub) => (
                                        <TableRow 
                                            key={sub.id} 
                                            className={cn("transition-colors group", getYearRowColor(sub.year, sub.cycleId))}
                                        >
                                            <TableCell className="pl-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-slate-900">{sub.reportType}</span>
                                                    <span className="text-[9px] text-muted-foreground font-mono uppercase tracking-tighter mt-0.5">
                                                        {sub.cycleId} Cycle {sub.year} &bull; {sub.controlNumber}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="flex items-center gap-1 font-bold text-slate-700"><Building className="h-3 w-3 text-primary/60" /> {sub.unitName}</span>
                                                    <span className="flex items-center gap-1 text-muted-foreground text-[10px] font-medium uppercase tracking-tighter"><School className="h-3 w-3" /> {campusMap.get(sub.campusId) || '...'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-2">
                                                    <User className="h-3.5 w-3.5 text-muted-foreground opacity-40" />
                                                    <span className="font-bold text-slate-600">{userMap.get(sub.userId) || '...'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                <div className="flex items-center gap-1 font-bold text-slate-500">
                                                    <CalendarIcon className="h-3 w-3 opacity-50" /> 
                                                    {safeFormatDate(sub.submissionDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge 
                                                    className={cn(
                                                        "capitalize font-black text-[9px] px-2 py-0.5 shadow-sm border-none",
                                                        sub.statusId === 'approved' && "bg-emerald-600 text-white",
                                                        sub.statusId === 'rejected' && "bg-rose-600 text-white",
                                                        sub.statusId === 'submitted' && "bg-amber-500 text-amber-950",
                                                        sub.statusId === 'pending' && "bg-slate-500 text-white"
                                                    )}
                                                >
                                                    {sub.statusId === 'submitted' ? 'AWAITING APPROVAL' : (sub.statusId?.toUpperCase() || 'UNKNOWN')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 space-x-2 whitespace-nowrap">
                                                <Button 
                                                    variant="default" 
                                                    size="sm" 
                                                    className="text-[10px] h-8 px-4 font-black uppercase tracking-widest bg-primary shadow-sm"
                                                    onClick={() => router.push(`/submissions/${sub.id}`)}
                                                >
                                                    VIEW
                                                </Button>
                                                {isAdmin && (
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteClick(sub)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="py-24 text-center text-muted-foreground flex flex-col items-center gap-3 border-t border-dashed bg-muted/5">
                                <FileText className="h-12 w-12 opacity-10" />
                                <p className="font-bold text-xs uppercase tracking-widest">No matching records</p>
                                <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => { setCampusFilter('all'); setUnitFilter('all'); setReportTypeFilter('all'); setStatusFilter('all'); }}>
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            
            {isSupervisor && !isAdmin && (
                <TabsContent value="by-unit" className="animate-in fade-in duration-500">
                    <UnitSubmissionsView 
                        allSubmissions={dashboardSubmissions} 
                        allUnits={allUnits} 
                        userProfile={userProfile} 
                        isLoading={isLoadingSubmissions} 
                    />
                </TabsContent>
            )}
            
            {(isAdmin || isAuditor) && (
                <TabsContent value="by-campus" className="animate-in fade-in duration-500">
                    <CampusSubmissionsView 
                        allSubmissions={dashboardSubmissions} 
                        allCampuses={campuses} 
                        allUnits={allUnits} 
                        isLoading={isLoadingSubmissions} 
                        isAdmin={isAdmin} 
                        onDeleteClick={handleDeleteClick} 
                    />
                </TabsContent>
            )}
        </Tabs>
      </div>

      <FeedbackDialog isOpen={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} feedback={feedbackToShow} />
      
      <AlertDialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
                <AlertDialogDescription>You are about to delete <strong>{deletingSubmission?.reportType}</strong>. This action is irreversible. Type <strong className="text-destructive">{challengeText}</strong> to proceed.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
                <Input value={confirmationText} onChange={(e) => setConfirmationText(e.target.value)} placeholder={`Type "${challengeText}"`} />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting || confirmationText !== challengeText} className="bg-destructive">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Record
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
