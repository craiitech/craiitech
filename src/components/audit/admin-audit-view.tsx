
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { PlusCircle, Loader2, Database, LayoutList, BarChart3, ListChecks, Filter, Copy, FileText, ClipboardCheck, Printer } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, deleteDoc } from 'firebase/firestore';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { AuditPlan, Campus, User, Unit, AuditSchedule, ISOClause, AuditFinding, CorrectiveActionRequest, Signatories } from '@/lib/types';
import { AuditPlanDialog } from './audit-plan-dialog';
import { AuditScheduleDialog } from './audit-schedule-dialog';
import { AuditPlanCloneDialog } from './audit-plan-clone-dialog';
import { AuditPlanList } from './audit-plan-list';
import { AuditAnalytics } from './audit-analytics';
import { AuditResultsView } from './audit-results-view';
import { AuditPrintTemplate } from './audit-print-template';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { seedIsoClausesClient } from '@/lib/iso-seeder';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { format } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

const currentYear = new Date().getFullYear();
const yearsList = Array.from({ length: 5 }, (_, i) => currentYear - i);

export function AdminAuditView() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get('tab') || 'analytics';

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [editingPlan, setEditingPlan] = useState<AuditPlan | null>(null);
  const [isPlanDialogOpenState, setIsPlanDialogOpenState] = useState(false);

  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedPlanForScheduling, setSelectedPlanForScheduling] = useState<AuditPlan | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<AuditSchedule | null>(null);

  const [cloningPlan, setCloningPlan] = useState<AuditPlan | null>(null);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);

  const [deletingPlan, setDeletingPlan] = useState<AuditPlan | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<AuditSchedule | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isSeeding, setIsSeeding] = useState(false);

  // Data Fetching
  const auditPlansQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditPlans')) : null), [firestore]);
  const { data: auditPlans, isLoading: isLoadingPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const schedulesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'auditSchedules')) : null), [firestore]);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  
  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const usersQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'users') : null), [firestore]);
  const { data: users, isLoading: isLoadingUsers } = useCollection<User>(usersQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses, isLoading: isLoadingClauses } = useCollection<ISOClause>(isoClausesQuery);

  const carsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'correctiveActionRequests') : null), [firestore]);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carsQuery);
  
  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const [reportCampusFilter, setReportCampusFilter] = useState<string>('all');
  const [reportUnitFilter, setReportUnitFilter] = useState<string>('all');

  const completedSchedules = useMemo(() => {
    if (!schedules || !auditPlans) return [];
    return schedules.filter(s => {
      if (s.status !== 'Completed') return false;
      
      const parentPlan = auditPlans.find(p => p.id === s.auditPlanId);
      if (!parentPlan || parentPlan.year !== selectedYear) return false;

      const matchCampus = reportCampusFilter === 'all' || s.campusId === reportCampusFilter;
      const matchUnit = reportUnitFilter === 'all' || s.targetId === reportUnitFilter;
      return matchCampus && matchUnit;
    });
  }, [schedules, auditPlans, selectedYear, reportCampusFilter, reportUnitFilter]);

  const overallCompletedCount = useMemo(() => {
    if (!schedules || !auditPlans) return 0;
    const planIds = new Set(auditPlans.filter(p => p.year === selectedYear).map(p => p.id));
    return schedules.filter(s => planIds.has(s.auditPlanId) && s.status === 'Completed').length;
  }, [schedules, auditPlans, selectedYear]);

  const overallTotalCount = useMemo(() => {
    if (!schedules || !auditPlans) return 0;
    const planIds = new Set(auditPlans.filter(p => p.year === selectedYear).map(p => p.id));
    return schedules.filter(s => planIds.has(s.auditPlanId)).length;
  }, [schedules, auditPlans, selectedYear]);

  const hasEvidence = (scheduleId: string) => {
    const hasFindings = findings?.some(f => f.auditScheduleId === scheduleId) || false;
    const schedule = schedules?.find(s => s.id === scheduleId);
    const hasSummary = schedule ? !!(schedule.summaryCommendable || schedule.summaryCompliance || schedule.summaryOFI || schedule.summaryNC) : false;
    return hasFindings || hasSummary;
  };

  const handlePrintIndividualTemplate = (schedule: AuditSchedule, withData: boolean = false) => {
    if (withData && !hasEvidence(schedule.id)) {
        toast({
            variant: "destructive",
            title: "No Evidence Logged",
            description: "Print failed: This unit has not been audited yet. No evidence logs are available to print.",
        });
        return;
    }

    const clausesInScope = isoClauses?.filter(c => schedule.isoClausesToAudit?.includes(c.id)) || [];
    const parentPlan = auditPlans?.find(p => p.id === schedule.auditPlanId);
    const campusName = campuses?.find(c => c.id === schedule.campusId)?.name || 'Institutional';
    
    const scheduleFindings = withData 
        ? findings?.filter(f => f.auditScheduleId === schedule.id) || []
        : [];

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={scheduleFindings}
                clauses={clausesInScope}
                signatories={signatories || undefined}
                leadAuditorName={parentPlan?.leadAuditorName}
                campusName={campusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Evidence Log - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print ${withData ? 'Evidence Log' : 'Blank Template'}</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

  const handlePrintIndividualReport = (schedule: AuditSchedule) => {
    if (!hasEvidence(schedule.id)) {
        toast({
            variant: "destructive",
            title: "No Evidence Logged",
            description: "Print failed: This unit has not been audited yet. No audit report can be generated.",
        });
        return;
    }

    const parentPlan = auditPlans?.find(p => p.id === schedule.auditPlanId);
    if (!parentPlan) {
        toast({
            variant: "destructive",
            title: "Plan Not Found",
            description: "Print failed: Parent audit plan for this schedule could not be resolved.",
        });
        return;
    }

    const scheduleFindings = findings?.filter(f => f.auditScheduleId === schedule.id) || [];
    const campusName = campuses?.find(c => c.id === schedule.campusId)?.name || 'Institutional';

    try {
        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={parentPlan}
                schedules={[schedule]}
                findings={scheduleFindings}
                clauses={isoClauses || []}
                units={units || []}
                campuses={campuses || []}
                signatories={signatories || undefined}
                campusName={campusName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Audit Report - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { 
                            size: 8.5in 13in !important; 
                            margin: 0.5in !important; 
                        }
                        @media print { 
                            body { margin: 0 !important; padding: 0 !important; background: white; width: 100% !important; -webkit-print-color-adjust: exact; } 
                            .no-print { display: none !important; }
                            table { page-break-inside: auto; width: 100% !important; border-collapse: collapse; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                        }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print report error:", err);
    }
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setIsPlanDialogOpenState(true);
  };

  const handleEditPlan = (plan: AuditPlan) => {
    setEditingPlan(plan);
    setIsPlanDialogOpenState(true);
  };

  const handleScheduleAudit = (plan: AuditPlan) => {
    setSelectedPlanForScheduling(plan);
    setEditingSchedule(null);
    setIsScheduleDialogOpen(true);
  };

  const handleEditSchedule = (plan: AuditPlan, schedule: AuditSchedule) => {
    setSelectedPlanForScheduling(plan);
    setEditingSchedule(schedule);
    setIsScheduleDialogOpen(true);
  };

  const handleClonePlan = (plan: AuditPlan) => {
    setCloningPlan(plan);
    setIsCloneDialogOpen(true);
  };

  const handleDeletePlan = async () => {
    if (!firestore || !deletingPlan) return;
    setIsProcessing(true);
    try {
        await deleteDoc(doc(firestore, 'auditPlans', deletingPlan.id));
        toast({ title: 'Plan Removed', description: 'Institutional audit plan has been deleted.' });
        setDeletingPlan(null);
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete plan.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!firestore || !deletingSchedule) return;
    setIsProcessing(true);
    try {
        await deleteDoc(doc(firestore, 'auditSchedules', deletingSchedule.id));
        toast({ title: 'Entry Removed', description: 'Itinerary entry has been deleted.' });
        setDeletingSchedule(null);
    } catch (e) {
        toast({ title: 'Error', description: 'Could not delete entry.', variant: 'destructive' });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleSeedClauses = async () => {
    if (!firestore) return;
    setIsSeeding(true);
    try {
        const result = await seedIsoClausesClient(firestore);
        toast({
            title: 'Seeding Complete',
            description: result.message,
        });
    } catch(error) {
         toast({
            title: 'Seeding Failed',
            description: 'Please trigger the seeding again.',
            variant: 'destructive',
        });
    } finally {
        setIsSeeding(false);
    }
  }
  
  const isLoading = isLoadingPlans || isLoadingCampuses || isLoadingUsers || isLoadingUnits || isLoadingSchedules || isLoadingClauses || isLoadingFindings || isLoadingCars;

  return (
    <div className="space-y-6">
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        {/* Sticky Header and Tabs */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 border-b space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <LayoutList className="h-6 w-6 text-primary" />
                    IQA Strategic Planning
                </h2>
                <p className="text-muted-foreground font-medium">Analyze results and manage the institutional audit itinerary.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 flex items-center gap-1">
                            <Filter className="h-2.5 w-2.5" /> Audit Cycle Year
                        </label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[140px] h-9 bg-white font-bold shadow-sm">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent modal={false}>
                                {yearsList.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleNewPlan} disabled={isLoadingClauses && !isoClauses} className="h-9 mt-5 shadow-lg shadow-primary/20 font-black uppercase text-[10px] tracking-widest">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Audit Plan
                    </Button>
                </div>
            </div>

            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10 animate-tab-highlight rounded-md">
                    <TabsTrigger value="analytics" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <BarChart3 className="h-3.5 w-3.5" /> Audit Intelligence
                    </TabsTrigger>
                    <TabsTrigger value="registry" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <ListChecks className="h-3.5 w-3.5" /> Itinerary Management
                    </TabsTrigger>
                    <TabsTrigger value="results" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                        <ClipboardCheck className="h-3.5 w-3.5" /> Audit Results & CAR Bridge
                    </TabsTrigger>
                    <TabsTrigger value="reporting" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                        <Printer className="h-3.5 w-3.5" /> Audit Reporting
                    </TabsTrigger>
                </TabsList>
            </ScrollArea>
        </div>

        {!isLoadingClauses && (!isoClauses || isoClauses.length === 0) && (
            <Alert className="border-amber-200 bg-amber-50">
                <Database className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 font-bold">Standard Clauses Missing</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-amber-700 mt-2">
                    <span>The ISO 21001:2018 Clause database is empty. This is required for auditing.</span>
                    <Button variant="outline" size="sm" onClick={handleSeedClauses} disabled={isSeeding} className="bg-white">
                        {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Database className="mr-2 h-4 w-4"/>}
                        Seed Clauses
                    </Button>
                </AlertDescription>
            </Alert>
        )}

        <TabsContent value="analytics" className="animate-in fade-in duration-500">
            <AuditAnalytics 
                plans={auditPlans || []}
                schedules={schedules || []}
                findings={findings || []}
                isoClauses={isoClauses || []}
                units={units || []}
                campuses={campuses || []}
                users={users || []}
                isLoading={isLoading}
                selectedYear={selectedYear}
            />
        </TabsContent>

        <TabsContent value="registry" className="animate-in fade-in duration-500">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-widest">University Internal Quality Audit (IQA) Registry</CardTitle>
                        <Badge variant="outline" className="h-5 text-[10px] font-black bg-white uppercase">AY {selectedYear} Session Log</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center h-64 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Registry...</p>
                        </div>
                    ) : (
                        <AuditPlanList 
                            plans={auditPlans?.filter(p => p.year === selectedYear) || []}
                            schedules={schedules || []}
                            findings={findings || []}
                            isoClauses={isoClauses || []}
                            campuses={campuses || []}
                            users={users || []}
                            units={units || []}
                            onEditPlan={handleEditPlan}
                            onDeletePlan={setDeletingPlan}
                            onScheduleAudit={handleScheduleAudit}
                            onEditSchedule={handleEditSchedule}
                            onDeleteSchedule={setDeletingSchedule}
                            onClonePlan={handleClonePlan}
                        />
                    )}
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="results" className="animate-in fade-in duration-500">
            <AuditResultsView 
                selectedYear={selectedYear}
                plans={auditPlans || []}
                schedules={schedules || []}
                findings={findings || []}
                units={units || []}
                campuses={campuses || []}
                cars={cars || []}
                isLoading={isLoading}
            />
        </TabsContent>

        <TabsContent value="reporting" className="animate-in fade-in duration-500">
            <Card className="shadow-md border-primary/10 overflow-hidden">
                <CardHeader className="bg-primary/5 border-b py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-black uppercase text-primary tracking-wide flex flex-wrap items-center gap-2">
                                <span>University Wide Evidence Log Printing & University Wide Printing of IQA Report</span>
                                <Badge className="bg-primary text-white border-none font-black text-xs uppercase px-2.5 py-0.5 select-none">
                                    {overallCompletedCount} / {overallTotalCount} Completed
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest text-primary/70 mt-1">
                                Access and print completed Internal Quality Audit reports and evidence logs institutional-wide.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="h-5 text-[10px] font-black bg-white uppercase">AY {selectedYear} Archive</Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {/* Filters Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10 items-center justify-between">
                        <div className="text-[10px] font-black uppercase text-primary tracking-wider flex items-center gap-2">
                            <Filter className="h-4 w-4 text-primary" />
                            Filter Completed Audits
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            {/* Campus Filter */}
                            <div className="w-full sm:w-[200px]">
                                <Select value={reportCampusFilter} onValueChange={(val) => {
                                    setReportCampusFilter(val);
                                    setReportUnitFilter('all'); // Reset unit filter on campus change
                                }}>
                                    <SelectTrigger className="h-9 text-[10px] font-black uppercase tracking-wider bg-white border-primary/20 text-primary shadow-xs">
                                        <SelectValue placeholder="All Campuses" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-primary">All Campuses</SelectItem>
                                        {campuses?.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="text-[10px] font-bold uppercase tracking-wider text-primary">{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Unit Filter */}
                            <div className="w-full sm:w-[250px]">
                                <Select value={reportUnitFilter} onValueChange={setReportUnitFilter}>
                                    <SelectTrigger className="h-9 text-[10px] font-black uppercase tracking-wider bg-white border-primary/20 text-primary shadow-xs">
                                        <SelectValue placeholder="All Units" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-primary/20">
                                        <SelectItem value="all" className="text-[10px] font-bold uppercase tracking-wider text-primary">All Units</SelectItem>
                                        {units?.filter(u => reportCampusFilter === 'all' || u.campusIds?.includes(reportCampusFilter)).map(u => (
                                            <SelectItem key={u.id} value={u.id} className="text-[10px] font-bold uppercase tracking-wider text-primary">{u.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Completed Audits Table */}
                    {isLoading ? (
                        <div className="flex flex-col justify-center items-center h-64 gap-2">
                            <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Reports...</p>
                        </div>
                    ) : completedSchedules.length === 0 ? (
                        <div className="py-20 text-center opacity-30 flex flex-col items-center gap-2 bg-white/50 border rounded-xl">
                            <ClipboardCheck className="h-10 w-10 text-primary" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">No completed IQAs match the filters for AY {selectedYear}</p>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/40">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-black uppercase pl-6 py-4">Unit Name</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Campus/Site</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Auditor</TableHead>
                                        <TableHead className="text-[10px] font-black uppercase">Auditee</TableHead>
                                        <TableHead className="text-center text-[10px] font-black uppercase pr-6">Printing Options</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {completedSchedules.map(schedule => {
                                        const auditorUser = users?.find(u => u.id === schedule.auditorId);
                                        const auditorName = auditorUser ? `${auditorUser.firstName} ${auditorUser.lastName}` : schedule.auditorName || 'Assigned Auditor';
                                        const auditeeName = schedule.auditeeHeadName || schedule.officerInCharge || 'Unit Head';
                                        const campusName = campuses?.find(c => c.id === schedule.campusId)?.name || 'Institutional';

                                        return (
                                            <TableRow key={schedule.id} className="hover:bg-muted/10 transition-colors">
                                                <TableCell className="pl-6 py-4">
                                                    <span className="font-bold text-xs text-slate-800 uppercase">{schedule.targetName}</span>
                                                    <p className="text-[9px] font-mono text-muted-foreground uppercase mt-0.5">ID: {schedule.id}</p>
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-600 uppercase">{campusName}</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-600 uppercase">{auditorName}</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-600 uppercase">{auditeeName}</TableCell>
                                                <TableCell className="text-center pr-6">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handlePrintIndividualTemplate(schedule, true)}
                                                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50 gap-1.5 shadow-xs"
                                                            title="University Wide Evidence Log Printing"
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                            Evidence Log
                                                        </Button>
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => handlePrintIndividualReport(schedule)}
                                                            className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5 shadow-xs"
                                                            title="University Wide IQA Report Printing"
                                                        >
                                                            <FileText className="h-3.5 w-3.5" />
                                                            IQA Report
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AuditPlanDialog isOpen={isPlanDialogOpenState} onOpenChange={setIsPlanDialogOpenState} plan={editingPlan} campuses={campuses || []} />
      
      {isScheduleDialogOpen && selectedPlanForScheduling && (
        <AuditScheduleDialog
            isOpen={isScheduleDialogOpen}
            onOpenChange={setIsScheduleDialogOpen}
            plan={selectedPlanForScheduling}
            schedule={editingSchedule}
            allSchedules={schedules || []}
            auditors={users?.filter(u => u.role === 'Auditor') || []}
            allUnits={units || []}
            topManagement={users?.filter(u => u.role?.toLowerCase().includes('president') || u.role?.toLowerCase().includes('director')) || []}
        />
      )}

      {cloningPlan && (
          <AuditPlanCloneDialog
            isOpen={isCloneDialogOpen}
            onOpenChange={setIsCloneDialogOpen}
            sourcePlan={cloningPlan}
            sourceSchedules={schedules?.filter(s => s.auditPlanId === cloningPlan.id) || []}
            campuses={campuses || []}
          />
      )}

      {/* Delete Plan Confirm */}
      <AlertDialog open={!!deletingPlan} onOpenChange={(open) => !open && setDeletingPlan(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the institutional plan <strong>"{deletingPlan?.title}"</strong>. 
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeletePlan} className="bg-destructive text-white" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Confirm Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Schedule Confirm */}
      <AlertDialog open={!!deletingSchedule} onOpenChange={(open) => !open && setDeletingSchedule(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Delete Itinerary Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                    You are about to delete the audit session for <strong>{deletingSchedule?.targetName}</strong>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Abort</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteSchedule} className="bg-destructive text-white" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Delete Session
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
