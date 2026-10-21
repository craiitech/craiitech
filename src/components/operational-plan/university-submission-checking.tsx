'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, deleteDoc, Timestamp } from '@/firebase/firestore-wrapper';
import type { Submission, Campus, Unit, User as AppUser, Cycle, Risk } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import {
  ArrowUpDown,
  BarChart3,
  Building,
  Calendar as CalendarIcon,
  CheckCircle2,
  FileText,
  Filter,
  Info,
  LayoutList,
  List,
  Loader2,
  RefreshCw,
  Search,
  School,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, normalizeReportType } from '@/lib/utils';
import { submissionTypes } from '@/lib/constants';
import { SubmissionDashboard } from '@/components/submissions/submission-dashboard';
import { backfillDigitalPlanSubmissions } from '@/lib/digital-submission-sync';
import { useToast } from '@/hooks/use-toast';

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

export function UniversitySubmissionChecking() {
  const { user, isAdmin, userRole, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeDetailedTab, setActiveDetailedTab] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<'all' | 'draft' | 'final' | 'needs_entry'>('all');
  const [cycleFilter, setCycleFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest'>('recent');
  const [deletingSubmission, setDeletingSubmission] = useState<Submission | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [challengeText, setChallengeText] = useState('');

  const submissionsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'submissions') : null),
    [firestore, user],
  );
  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'units') : null),
    [firestore, user],
  );
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'campuses') : null),
    [firestore, user],
  );
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const usersQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'users') : null),
    [firestore, user],
  );
  const { data: allUsers } = useCollection<AppUser>(usersQuery);

  const cyclesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'cycles') : null),
    [firestore, user],
  );
  const { data: cycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    const currentYear = Number(yearFilter) || new Date().getFullYear();
    return query(collection(firestore, 'risks'), where('year', '==', currentYear));
  }, [firestore, user, yearFilter]);
  const { data: allRisks } = useCollection<Risk>(risksQuery);

  const campusMap = useMemo(() => new Map(campuses?.map((c) => [c.id, c.name])), [campuses]);
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    allUsers?.forEach((u) => map.set(u.id, `${u.firstName} ${u.lastName}`));
    return map;
  }, [allUsers]);

  const normalizedSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    return rawSubmissions.map((s) => ({ ...s, reportType: normalizeReportType(s.reportType) }));
  }, [rawSubmissions]);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(normalizedSubmissions.map((s) => String(s.year))));
    if (years.length === 0) return [new Date().getFullYear().toString()];
    return years.sort((a, b) => b.localeCompare(a));
  }, [normalizedSubmissions]);

  const availableCyclesForYear = useMemo(() => {
    if (!cycles || yearFilter === 'all') return [];
    const year = parseInt(yearFilter);
    return cycles.filter((c) => c.year === year).map((c) => c.name);
  }, [cycles, yearFilter]);

  const filteredUnitsList = useMemo(() => {
    if (!allUnits) return [];
    if (campusFilter === 'all') return allUnits;
    return allUnits.filter((u) => u.campusIds?.includes(campusFilter));
  }, [allUnits, campusFilter]);

  const dashboardSubmissions = useMemo(() => {
    let filtered = [...normalizedSubmissions];
    if (yearFilter !== 'all') filtered = filtered.filter((s) => String(s.year) === yearFilter);
    if (campusFilter !== 'all') filtered = filtered.filter((s) => s.campusId === campusFilter);
    if (unitFilter !== 'all') filtered = filtered.filter((s) => s.unitId === unitFilter);
    return filtered;
  }, [normalizedSubmissions, yearFilter, campusFilter, unitFilter]);

  const dashboardUnits = useMemo(() => {
    if (!allUnits) return [];
    let filtered = [...allUnits];
    if (campusFilter !== 'all') filtered = filtered.filter((u) => u.campusIds?.includes(campusFilter));
    if (unitFilter !== 'all') filtered = filtered.filter((u) => u.id === unitFilter);
    return filtered;
  }, [allUnits, campusFilter, unitFilter]);

  const tableSubmissionsData = useMemo(() => {
    let filtered = [...normalizedSubmissions];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.reportType.toLowerCase().includes(lowerSearch) ||
          (s.unitName || '').toLowerCase().includes(lowerSearch) ||
          (s.controlNumber || '').toLowerCase().includes(lowerSearch) ||
          (userMap.get(s.userId) || '').toLowerCase().includes(lowerSearch),
      );
    }

    if (yearFilter !== 'all') filtered = filtered.filter((s) => String(s.year) === yearFilter);
    if (campusFilter !== 'all') filtered = filtered.filter((s) => s.campusId === campusFilter);
    if (unitFilter !== 'all') filtered = filtered.filter((s) => s.unitId === unitFilter);
    if (statusFilter !== 'all') filtered = filtered.filter((s) => s.statusId === statusFilter);
    if (cycleFilter !== 'all') filtered = filtered.filter((s) => s.cycleId === cycleFilter);

    if (modeFilter === 'draft') filtered = filtered.filter((s) => s.isDraft === true);
    if (modeFilter === 'final') filtered = filtered.filter((s) => s.isDraft === false || s.isDraft === undefined);
    if (modeFilter === 'needs_entry') filtered = filtered.filter((s) => s.submissionNeedsEntry === true);

    if (activeDetailedTab !== 'all') {
      filtered = filtered.filter((s) => s.reportType === activeDetailedTab);
    }

    return filtered.sort((a, b) => {
      const dateA =
        a.submissionDate instanceof Timestamp ? a.submissionDate.toMillis() : new Date(a.submissionDate).getTime();
      const dateB =
        b.submissionDate instanceof Timestamp ? b.submissionDate.toMillis() : new Date(b.submissionDate).getTime();
      return sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });
  }, [
    normalizedSubmissions,
    activeDetailedTab,
    yearFilter,
    statusFilter,
    campusFilter,
    unitFilter,
    cycleFilter,
    sortOrder,
    modeFilter,
    searchTerm,
    userMap,
  ]);

  const isRiskRegistered = (unitId: string, year: number) => {
    if (!allRisks) return false;
    return allRisks.some((r) => r.unitId === unitId && r.year === year);
  };

  const getStatusText = (sub: Submission) => {
    if (sub.statusId === 'submitted') return 'AWAITING APPROVAL';
    if (sub.statusId === 'approved' && sub.isDraft) return 'DRAFT CLEARED';
    return sub.statusId?.toUpperCase() || 'UNKNOWN';
  };

  const onDeleteClick = (submission: Submission) => {
    setDeletingSubmission(submission);
    setChallengeText(`delete-${Math.floor(1000 + Math.random() * 9000)}`);
    setConfirmationText('');
  };

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
  };

  const handleBackfill = async () => {
    if (!firestore) return;
    setIsBackfilling(true);
    try {
      const result = await backfillDigitalPlanSubmissions(firestore, {
        id: user?.uid,
        name: user?.displayName || 'Administrator',
        role: userRole || 'Admin',
      });
      toast({
        title: 'Backfill Complete',
        description: `Scanned ${result.plans} digital documents. Created ${result.created} and updated ${result.updated} submission records.`,
      });
    } catch (error) {
      toast({
        title: 'Backfill Failed',
        description: 'Could not synchronize digital documents into submissions.',
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <TooltipProvider>
      <Tabs defaultValue="visual-insights" className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <ScrollArea className="w-full md:w-auto">
            <TabsList className="flex md:inline-flex bg-muted/50 p-1 border rounded-md whitespace-nowrap min-w-max w-max">
              <TabsTrigger
                value="visual-insights"
                className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6 h-8"
              >
                <BarChart3 className="h-4 w-4" /> Visual Insights
              </TabsTrigger>
              <TabsTrigger
                value="detailed-audit-log"
                className="gap-2 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest px-6 h-8"
              >
                <List className="h-4 w-4" /> Detailed Audit Log
              </TabsTrigger>
            </TabsList>
          </ScrollArea>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2 text-[10px] font-black uppercase tracking-widest"
                onClick={handleBackfill}
                disabled={isBackfilling}
              >
                {isBackfilling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-primary" />
                )}
                Backfill Digital Docs
              </Button>
            )}
            <label className="text-[10px] font-bold uppercase text-muted-foreground">View Year</label>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-card font-semibold shadow-sm">
                <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50" />
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((y) => (
                  <SelectItem key={y} value={y}>
                    AY {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="visual-insights" className="animate-in fade-in duration-500">
          <SubmissionDashboard
            submissions={dashboardSubmissions}
            cycles={cycles || []}
            allUnits={dashboardUnits}
            allUsers={allUsers || []}
            isLoading={isLoadingSubmissions || isLoadingCycles || isLoadingUnits || isLoadingCampuses || isUserLoading}
            selectedYear={yearFilter}
          />
        </TabsContent>

        <TabsContent value="detailed-audit-log" className="animate-in fade-in duration-500 space-y-4">
          <Card className="border-primary/10 shadow-sm bg-muted/10">
            <CardContent className="p-4 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by report type, document control no., or submitter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <School className="h-2.5 w-2.5" /> Campus Site
                  </label>
                  <Select value={campusFilter} onValueChange={setCampusFilter}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {campuses?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <Building className="h-2.5 w-2.5" /> Unit / Office
                  </label>
                  <Select value={unitFilter} onValueChange={setUnitFilter}>
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Units</SelectItem>
                      {filteredUnitsList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
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
                      <SelectItem value="all">All (Drafts &amp; Finals)</SelectItem>
                      <SelectItem value="draft">Drafts Only</SelectItem>
                      <SelectItem value="final">Final Records Only</SelectItem>
                      <SelectItem value="needs_entry">Needs Data Entry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 flex items-center gap-1.5">
                    <CalendarIcon className="h-2.5 w-2.5" /> Submission Cycle
                  </label>
                  <Select
                    value={cycleFilter}
                    onValueChange={setCycleFilter}
                    disabled={yearFilter === 'all' || availableCyclesForYear.length === 0}
                  >
                    <SelectTrigger className="h-9 text-xs bg-white">
                      <SelectValue placeholder="All Cycles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cycles</SelectItem>
                      {availableCyclesForYear.includes('first') && <SelectItem value="first">First Cycle</SelectItem>}
                      {availableCyclesForYear.includes('final') && <SelectItem value="final">Final Cycle</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeDetailedTab} onValueChange={setActiveDetailedTab} className="w-full">
            <ScrollArea className="w-full">
              <TabsList className="bg-muted/30 p-1 border h-auto flex whitespace-nowrap rounded-md w-max min-w-max">
                <TabsTrigger value="all" className="text-[9px] font-black uppercase px-4 py-2">
                  All Documents
                </TabsTrigger>
                {submissionTypes.map((type) => (
                  <TabsTrigger key={type} value={type} className="text-[9px] font-black uppercase px-4 py-2">
                    {type.replace('Needs and Expectation of Interested Parties', 'Interested Parties')}
                  </TabsTrigger>
                ))}
              </TabsList>
            </ScrollArea>

            <TabsContent value={activeDetailedTab} className="mt-4">
              <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b bg-muted/5">
                  <div className="space-y-1">
                    <CardTitle className="text-lg uppercase font-black tracking-tight text-slate-900 dark:text-slate-100">
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
                            <TableHead className="font-bold uppercase text-[10px] pl-6 py-3 text-slate-900 dark:text-slate-100">
                              Report &amp; Control Info
                            </TableHead>
                            <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900 dark:text-slate-100">
                              Origin Unit / Office
                            </TableHead>
                            <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900 dark:text-slate-100">
                              Uploader
                            </TableHead>
                            <TableHead className="font-bold uppercase text-[10px] py-3 text-slate-900 dark:text-slate-100">
                              Submission Date
                            </TableHead>
                            <TableHead className="text-center font-bold uppercase text-[10px] py-3 text-slate-900 dark:text-slate-100">
                              Status &amp; Guidance
                            </TableHead>
                            <TableHead className="text-right font-bold uppercase text-[10px] py-3 pr-6 text-slate-900 dark:text-slate-100">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableSubmissionsData.map((sub) => {
                            const isRor = sub.reportType === 'Risk and Opportunity Registry';
                            const registered = isRor && isRiskRegistered(sub.unitId, sub.year);

                            return (
                              <TableRow key={sub.id} className="transition-colors group">
                                <TableCell className="pl-6 py-4">
                                  <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-sm text-black dark:text-white">
                                        {sub.reportType}
                                      </span>
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
                                                <Badge
                                                  variant="outline"
                                                  className="bg-emerald-50 text-emerald-700 border-emerald-200 h-4 px-1.5 font-black text-[8px] gap-1"
                                                >
                                                  <CheckCircle2 className="h-2.5 w-2.5" /> LOG
                                                </Badge>
                                              ) : (
                                                <Badge
                                                  variant="outline"
                                                  className="bg-rose-50 text-rose-700 border-rose-200 h-4 px-1.5 font-black text-[8px] gap-1"
                                                >
                                                  <XCircle className="h-2.5 w-2.5" /> X
                                                </Badge>
                                              )}
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p className="text-xs font-bold">
                                              {registered
                                                ? 'Entries present in digital register'
                                                : 'No digital entries logged for this unit/year'}
                                            </p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                    <span className="text-[9px] text-slate-600 dark:text-slate-400 font-mono uppercase tracking-tighter">
                                      {sub.cycleId} Cycle {sub.year} &bull; {sub.controlNumber}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col text-xs">
                                    <span className="flex items-center gap-1 font-bold text-black dark:text-white">
                                      <Building className="h-3 w-3 text-primary/60" /> {sub.unitName}
                                    </span>
                                    <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 text-[10px] font-medium uppercase tracking-tighter">
                                      <School className="h-3 w-3" /> {campusMap.get(sub.campusId) || '...'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 opacity-40" />
                                    <span className="font-bold text-black dark:text-white">
                                      {userMap.get(sub.userId) || '...'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div className="flex items-center gap-1 font-bold text-black dark:text-white">
                                    <CalendarIcon className="h-3 w-3 opacity-50" />
                                    {safeFormatDate(sub.submissionDate)}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge
                                      className={cn(
                                        'capitalize font-black text-[9px] px-2 py-0.5 shadow-sm border-none',
                                        sub.statusId === 'approved' && 'bg-emerald-600 text-white',
                                        sub.statusId === 'rejected' && 'bg-rose-600 text-white',
                                        sub.statusId === 'submitted' && 'bg-amber-50 text-amber-950',
                                        sub.statusId === 'pending' && 'bg-slate-50 dark:bg-slate-800/50 text-white',
                                      )}
                                    >
                                      {getStatusText(sub)}
                                    </Badge>
                                    {sub.submissionNeedsEntry && (
                                      <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 text-[8px] font-black uppercase tracking-wider">
                                        Needs Entry
                                      </Badge>
                                    )}
                                    {sub.dataEntryCompleted && (
                                      <Badge className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 text-[8px] font-black uppercase tracking-wider">
                                        Data Encoded
                                      </Badge>
                                    )}
                                    {sub.comments && sub.comments.length > 0 ? (
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-1 cursor-help group/remark">
                                            <Info className="h-3 w-3 text-primary/60 group-hover/remark:text-primary transition-colors" />
                                            <span className="text-[8px] font-bold text-muted-foreground italic truncate max-w-[120px]">
                                              {sub.comments[sub.comments.length - 1].text}
                                            </span>
                                          </div>
                                        </TooltipTrigger>
                                        <TooltipContent className="w-80 p-0 overflow-hidden shadow-2xl border-primary/20">
                                          <div className="bg-primary/5 p-2 border-b">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-primary">
                                              Conversation History
                                            </p>
                                          </div>
                                          <ScrollArea className="max-h-[300px]">
                                            <div className="p-3 space-y-4">
                                              {sub.comments
                                                .slice()
                                                .sort((a, b) => {
                                                  const dateA =
                                                    a.createdAt instanceof Date
                                                      ? a.createdAt.getTime()
                                                      : (a.createdAt as any)?.toDate?.()?.getTime() || 0;
                                                  const dateB =
                                                    b.createdAt instanceof Date
                                                      ? b.createdAt.getTime()
                                                      : (b.createdAt as any)?.toDate?.()?.getTime() || 0;
                                                  return dateB - dateA;
                                                })
                                                .map((c, i) => (
                                                  <div key={i} className="space-y-1">
                                                    <div className="flex justify-between text-[8px] font-black uppercase text-muted-foreground">
                                                      <span>
                                                        {c.authorName} ({c.authorRole})
                                                      </span>
                                                      <span>{safeFormatDate(c.createdAt)}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 italic">
                                                      &quot;{c.text}&quot;
                                                    </p>
                                                  </div>
                                                ))}
                                            </div>
                                          </ScrollArea>
                                        </TooltipContent>
                                      </Tooltip>
                                    ) : (
                                      <span className="text-[8px] font-bold text-muted-foreground/30 uppercase tracking-tighter">
                                        No remarks
                                      </span>
                                    )}
                                  </div>
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
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] font-bold"
                        onClick={() => setActiveDetailedTab('all')}
                      >
                        View all categories
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deletingSubmission} onOpenChange={() => setDeletingSubmission(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanent Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to delete <strong>{deletingSubmission?.reportType}</strong>. This action is irreversible.
              Type <strong className="text-destructive">{challengeText}</strong> to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={`Type "${challengeText}"`}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-bold text-[10px] uppercase">Abort</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting || confirmationText !== challengeText}
              className="bg-destructive"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Delete Record
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
