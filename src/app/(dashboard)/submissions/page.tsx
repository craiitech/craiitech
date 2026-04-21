
'use client';

import { PlusCircle, Trash2, Loader2, Calendar as CalendarIcon, Building, School, User, ArrowUpDown, Search, FileText, BarChart3, List, Filter, Download, ShieldCheck, XCircle, CheckCircle2, ChevronRight, LayoutList } from 'lucide-react';
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
import type { Submission, Campus, Unit, User as AppUser, Cycle, Risk } from '@/lib/types';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { cn, normalizeReportType } from '@/lib/utils';
import { submissionTypes } from './new/page';
import Link from 'next/link';

const getYearCycleRowColor = (year: number, cycle: string) => {
  const isFinal = cycle.toLowerCase() === 'final';
  const colors: Record<number, { first: string, final: string }> = {
    2024: { 
      first: 'bg-blue-50/20 hover:bg-blue-100/40 dark:bg-blue-900/5 dark:hover:bg-blue-900/10', 
      final: 'bg-blue-100/40 hover:bg-blue-200/50 dark:bg-blue-900/20 dark:hover:bg-blue-900/30' 
    },
    2025: { 
      first: 'bg-green-50/20 hover:bg-green-100/40 dark:bg-green-900/5 dark:hover:bg-green-900/10', 
      final: 'bg-green-100/40 hover:bg-blue-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
    2026: { 
      first: 'bg-amber-50/20 hover:bg-amber-100/40 dark:bg-amber-900/5 dark:hover:bg-amber-900/10', 
      final: 'bg-amber-100/40 hover:bg-amber-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
    2027: { 
      first: 'bg-purple-50/20 hover:bg-purple-100/40 dark:bg-purple-900/5 dark:hover:bg-purple-900/10', 
      final: 'bg-purple-100/40 hover:bg-blue-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
    2028: { 
      first: 'bg-rose-50/20 hover:bg-rose-100/40 dark:bg-rose-900/5 dark:hover:bg-rose-900/10', 
      final: 'bg-rose-100/40 hover:bg-rose-200/50 dark:bg-green-900/20 dark:hover:bg-green-900/30' 
    },
  };
  
  const yearColor = colors[year] || { 
    first: 'bg-slate-50/20 hover:bg-slate-100/40 dark:bg-slate-900/5 dark:hover:bg-slate-900/10', 
    final: 'bg-slate-100/40 hover:bg-slate-200/50 dark:bg-slate-900/20 dark:hover:bg-slate-900/30' 
  };
  
  return isFinal ? yearColor.final : yearColor.first;
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
  const { user, userProfile, isAdmin, isAuditor, isSupervisor, isVp, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDetailedTab, setActiveDetailedTab] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'draft' | 'final'>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');

  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackToShow, setFeedbackToShow] = useState('');
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const isInstitutionalViewer = isAdmin || isAuditor || isVp;

  useEffect(() => {
    if (userProfile && !isUserLoading) {
        if (!isInstitutionalViewer) {
            setCampusFilter(userProfile.campusId);
            if (!isSupervisor || userRole === 'Unit ODIMO') {
                setUnitFilter(userProfile.unitId);
            }
        }
    }
  }, [userProfile, isInstitutionalViewer, isSupervisor, userRole, isUserLoading]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    if (isInstitutionalViewer) return collection(firestore, 'submissions');
    if (isSupervisor && userRole !== 'Unit ODIMO' && userProfile.campusId) {
      return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    return query(collection(firestore, 'submissions'), 
        where('unitId', '==', userProfile.unitId), 
        where('campusId', '==', userProfile.campusId)
    );
  }, [firestore, isInstitutionalViewer, isSupervisor, userRole, userProfile, isUserLoading]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    if (isInstitutionalViewer) return collection(firestore, 'risks');
    if (isSupervisor && userRole !== 'Unit ODIMO' && userProfile.campusId) {
      return query(collection(firestore, 'risks'), where('campusId', '==', userProfile.campusId));
    }
    return query(collection(firestore, 'risks'), where('unitId', '==', userProfile.unitId));
  }, [firestore, isInstitutionalViewer, isSupervisor, userRole, userProfile, isUserLoading]);

  const { data: allRisks } = useCollection<Risk>(risksQuery);

  const normalizedSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    return rawSubmissions.map(s => ({
        ...s,
        reportType: normalizeReportType(s.reportType)
    }));
  }, [rawSubmissions]);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore && (isInstitutionalViewer || isSupervisor) ? collection(firestore, 'users') : null),
    [firestore, isInstitutionalViewer, isSupervisor]
  );
  const { data: allUsers } = useCollection<AppUser>(usersQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'units') : null),
    [firestore]
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore && user ? collection(firestore, 'campuses') : null), [firestore, user]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

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
    if (!normalizedSubmissions) return [new Date().getFullYear().toString()];
    const years = Array.from(new Set(normalizedSubmissions.map(s => String(s.year))));
    if (years.length === 0) return [new Date().getFullYear().toString()];
    return years.sort((a,b) => b.localeCompare(a));
  }, [normalizedSubmissions]);

  useEffect(() => {
    if (isInstitutionalViewer) setUnitFilter('all');
  }, [campusFilter, isInstitutionalViewer]);

  const dashboardSubmissions = useMemo(() => {
    if (!normalizedSubmissions) return [];
    let filtered = [...normalizedSubmissions];
    if (yearFilter !== 'all') filtered = filtered.filter(s => String(s.year) === yearFilter);
    if (campusFilter !== 'all') filtered = filtered.filter(s => s.campusId === campusFilter);
    if (unitFilter !== 'all') filtered = filtered.filter(s => s.unitId === unitFilter);
    return filtered;
  }, [normalizedSubmissions, yearFilter, campusFilter, unitFilter]);

  const dashboardUnits = useMemo(() => {
    if (!allUnits || !userProfile) return [];
    let filtered = [...allUnits];
    if (!isInstitutionalViewer) {
        if (isSupervisor && userRole !== 'Unit ODIMO') {
            filtered = filtered.filter(u => u.campusIds?.includes(userProfile.campusId));
        } else {
            filtered = filtered.filter(u => u.id === userProfile.unitId);
        }
    }
    if (campusFilter !== 'all') filtered = filtered.filter(u => u.campusIds?.includes(campusFilter));
    if (unitFilter !== 'all') filtered = filtered.filter(u => u.id === unitFilter);
    return filtered;
  }, [allUnits, isInstitutionalViewer, isSupervisor, userRole, userProfile, campusFilter, unitFilter]);

  const tableSubmissionsData = useMemo(() => {
    if (!normalizedSubmissions) return [];
    let filtered = [...normalizedSubmissions];

    // Search Logic
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter(s => 
            s.reportType.toLowerCase().includes(lowerSearch) ||
            (s.unitName || '').toLowerCase().includes(lowerSearch) ||
            s.controlNumber.toLowerCase().includes(lowerSearch) ||
            (userMap.get(s.userId) || '').toLowerCase().includes(lowerSearch)
        );
    }

    if (yearFilter !== 'all') filtered = filtered.filter(s => String(s.year) === yearFilter);
    if (campusFilter !== 'all') filtered = filtered.filter(s => s.campusId === campusFilter);
    if (unitFilter !== 'all') filtered = filtered.filter(s => s.unitId === unitFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(s => s.statusId === statusFilter);
    
    // Draft vs Final Filtering
    if (modeFilter === 'draft') filtered = filtered.filter(s => s.isDraft === true);
    if (modeFilter === 'final') filtered = filtered.filter(s => s.isDraft === false || s.isDraft === undefined);
    
    // Internal Tab Filtering
    if (activeDetailedTab !== 'all') {
        filtered = filtered.filter(s => s.reportType === activeDetailedTab);
    }

    return filtered.sort((a, b) => {
        const dateA = a.submissionDate instanceof Timestamp ? a.submissionDate.toMillis() : new Date(a.submissionDate).getTime();
        const dateB = b.submissionDate instanceof Timestamp ? b.submissionDate.toMillis() : new Date(b.submissionDate).getTime();
        return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [normalizedSubmissions, activeDetailedTab, yearFilter, statusFilter, campusFilter, unitFilter, sortOrder, modeFilter, searchTerm, userMap]);

  const isRiskRegistered = (unitId: string, year: number) => {
    if (!allRisks) return false;
    return allRisks.some(r => r.unitId === unitId && r.year === year);
  };

  const onDeleteClick = (submission: Submission) => {
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

  const reportSelectedYear = yearFilter === 'all' ? new Date().getFullYear().toString() : yearFilter;
  const canSubmit = !isAuditor && (!isSupervisor || userRole === 'Unit ODIMO');

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase">EOMS SUBMISSION HUB</h2>
            <p className="text-muted-foreground">Manage unit compliance documentation and track overall performance.</p>
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
            
            <div className="flex items-center gap-2 pt-5">
                <Button 
                    variant="outline"
                    className="h-9 font-bold uppercase text-[10px] tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                    asChild
                >
                    <a href="https://drive.google.com/drive/folders/1xabubTGa7ddu05VxiL9zhX6uge_kisN1?usp=drive_link" target="_blank" rel="noopener noreferrer">
                        <Download className="mr-2 h-4 w-4" /> Download Templates
                    </a>
                </Button>
                {canSubmit && (
                    <Button 
                        onClick={() => router.push('/submissions/new')}
                        className="shadow-lg shadow-primary/20 h-9 font-bold uppercase text-[10px] tracking-widest"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> New Submission
                    </Button>
                )}
            </div>
          </div>
        </div>

        <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by document type, unit, or control number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-11 shadow-sm bg-white border-primary/10 font-medium"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <School className="h-2.5 w-2.5" /> Campus Site
                        </label>
                        <Select value={campusFilter} onValueChange={setCampusFilter} disabled={!isInstitutionalViewer}>
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
                            <Building className="h-2.5 w-2.5" /> Unit / Office
                        </label>
                        <Select value={unitFilter} onValueChange={setUnitFilter} disabled={!isInstitutionalViewer && (!isSupervisor || userRole === 'Unit ODIMO')}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="All Units" />
                            </SelectTrigger>
                            <SelectContent>
                                {(isInstitutionalViewer || isSupervisor) && <SelectItem value="all">All Units</SelectItem>}
                                {filteredUnitsList.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <Filter className="h-2.5 w-2.5" /> Workflow Status
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

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                            <LayoutList className="h-2.5 w-2.5" /> Document Version
                        </label>
                        <Select value={modeFilter} onValueChange={(val: any) => setModeFilter(val)}>
                            <SelectTrigger className="h-9 text-xs bg-white">
                                <SelectValue placeholder="All Versions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All (Drafts & Finals)</SelectItem>
                                <SelectItem value="draft">Drafts Only</SelectItem>
                                <SelectItem value="final">Final Records Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Tabs defaultValue="visual-insights" className="space-y-4">
            <ScrollArea className="w-full">
                <TabsList className="flex md:inline-flex bg-muted/50 p-1 border animate-tab-highlight rounded-md whitespace-nowrap">
                    <TabsTrigger value="visual-insights" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                        <BarChart3 className="h-4 w-4" /> Visual Insights
                    </TabsTrigger>
                    <TabsTrigger value="all-submissions" className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">
                        <List className="h-4 w-4" /> Detailed Audit Log
                    </TabsTrigger>
                    {!isInstitutionalViewer && <TabsTrigger value="by-unit" className="data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">Unit Status</TabsTrigger>}
                    {isInstitutionalViewer && <TabsTrigger value="by-campus" className="data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6">Site Matrix</TabsTrigger>}
                </TabsList>
            </ScrollArea>

            <TabsContent value="visual-insights" className="animate-in fade-in duration-500">
                <SubmissionDashboard 
                    submissions={dashboardSubmissions}
                    cycles={cycles || []}
                    allUnits={dashboardUnits}
                    isLoading={isLoadingSubmissions || isLoadingCycles || isLoadingUnits}
                    selectedYear={yearFilter}
                />
            </TabsContent>

            <TabsContent value="all-submissions" className="animate-in fade-in duration-500 space-y-4">
                <Tabs value={activeDetailedTab} onValueChange={setActiveDetailedTab} className="w-full">
                    <ScrollArea className="w-full">
                        <TabsList className="bg-muted/30 p-1 border h-auto flex whitespace-nowrap animate-tab-highlight rounded-md">
                            <TabsTrigger value="all" className="text-[9px] font-black uppercase px-4 py-2">All Documents</TabsTrigger>
                            {submissionTypes.map((type) => (
                                <TabsTrigger 
                                    key={type} 
                                    value={type} 
                                    className="text-[9px] font-black uppercase px-4 py-2"
                                >
                                    {type.replace('Needs and Expectation of Interested Parties', 'Interested Parties')}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </ScrollArea>

                    <TabsContent value={activeDetailedTab} className="mt-4">
                        <Card className="shadow-md border-primary/10 overflow-hidden">
                            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b bg-muted/5">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg uppercase font-black tracking-tight text-slate-900">
                                        {activeDetailedTab === 'all' ? 'Submission Audit Log' : activeDetailedTab}
                                    </CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                        Displaying {tableSubmissionsData.length} records matching selection.
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
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader className="bg-muted/30">
                                                <TableRow className="hover:bg-transparent">
                                                    <TableHead className="font-bold uppercase text-[10px] pl-6 py-3 text-slate-900">Report & Control Info</TableHead>
                                                    <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900">Origin Unit / Office</TableHead>
                                                    <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900">Uploader</TableHead>
                                                    <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900">Submission Date</TableHead>
                                                    <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900">Status</TableHead>
                                                    <TableHead className="text-right font-bold uppercase text-[10px] py-3 pr-6 text-slate-900">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tableSubmissionsData.map((sub) => {
                                                    const isRor = sub.reportType === 'Risk and Opportunity Registry';
                                                    const registered = isRor && isRiskRegistered(sub.unitId, sub.year);
                                                    
                                                    return (
                                                        <TableRow 
                                                            key={sub.id} 
                                                            className={cn("transition-colors group", getYearCycleRowColor(sub.year, sub.cycleId))}
                                                        >
                                                            <TableCell className="pl-6 py-4">
                                                                <div className="flex flex-col gap-1.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-sm text-black">{sub.reportType}</span>
                                                                        {sub.isDraft && (
                                                                            <Badge className="bg-blue-600 text-white border-none h-4 px-1.5 font-black text-[8px] gap-1 shadow-sm">
                                                                                <LayoutList className="h-2.5 w-2.5" /> DRAFT
                                                                            </Badge>
                                                                        )}
                                                                        {isRor && (
                                                                            <Tooltip>
                                                                                <TooltipTrigger asChild>
                                                                                    <div>
                                                                                        {registered ? (
                                                                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-4 px-1.5 font-black text-[8px] gap-1 animate-in zoom-in duration-300">
                                                                                                <CheckCircle2 className="h-2.5 w-2.5" /> LOG
                                                                                            </Badge>
                                                                                        ) : (
                                                                                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 h-4 px-1.5 font-black text-[8px] gap-1">
                                                                                                <XCircle className="h-2.5 w-2.5" /> X
                                                                                            </Badge>
                                                                                        )}
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent>
                                                                                    <p className="text-xs font-bold">
                                                                                        {registered 
                                                                                            ? "Entries present in digital register" 
                                                                                            : "No digital entries logged for this unit/year"}
                                                                                    </p>
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[9px] text-slate-600 font-mono uppercase tracking-tighter">
                                                                        {sub.cycleId} Cycle {sub.year} &bull; {sub.controlNumber}
                                                                    </span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex flex-col text-xs">
                                                                    <span className="flex items-center gap-1 font-bold text-black"><Building className="h-3 w-3 text-primary/60" /> {sub.unitName}</span>
                                                                    <span className="flex items-center gap-1 text-slate-600 text-[10px] font-medium uppercase tracking-tighter"><School className="h-3 w-3" /> {campusMap.get(sub.campusId) || '...'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-3.5 w-3.5 text-slate-600 opacity-40" />
                                                                    <span className="font-bold text-black">{userMap.get(sub.userId) || '...'}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                <div className="flex items-center gap-1 font-bold text-black">
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
                                                                        sub.statusId === 'submitted' && "bg-amber-50 text-amber-950",
                                                                        sub.statusId === 'pending' && "bg-slate-50 text-white"
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
                                                                        onClick={() => onDeleteClick(sub)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="py-24 text-center text-muted-foreground flex flex-col items-center gap-3 border-t border-dashed bg-muted/5">
                                        <FileText className="h-12 w-12 opacity-10" />
                                        <p className="font-bold text-xs uppercase tracking-widest">No matching records</p>
                                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => setActiveDetailedTab('all')}>
                                            View all categories
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </TabsContent>
            
            {!isInstitutionalViewer && (
                <TabsContent value="by-unit" className="animate-in fade-in duration-500">
                    <UnitSubmissionsView 
                        allSubmissions={normalizedSubmissions} 
                        allUnits={allUnits} 
                        allCampuses={campuses}
                        userProfile={userProfile} 
                        isLoading={isLoadingSubmissions}
                        selectedYear={reportSelectedYear}
                    />
                </TabsContent>
            )}
            
            {isInstitutionalViewer && (
                <TabsContent value="by-campus" className="animate-in fade-in duration-500">
                    <CampusSubmissionsView 
                        allSubmissions={normalizedSubmissions} 
                        allCampuses={campuses} 
                        allUnits={allUnits} 
                        isLoading={isLoadingSubmissions} 
                        isAdmin={isAdmin} 
                        onDeleteClick={onDeleteClick}
                        selectedYear={reportSelectedYear}
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
