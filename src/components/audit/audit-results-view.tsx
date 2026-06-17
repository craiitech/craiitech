'use client';

import { useState, useMemo } from 'react';
import type { 
    AuditPlan, 
    AuditSchedule, 
    AuditFinding, 
    Unit, 
    Campus, 
    CorrectiveActionRequest,
    Signatories,
    ISOClause,
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    AlertTriangle, 
    CheckCircle2, 
    Printer, 
    TrendingUp, 
    Info, 
    ShieldAlert, 
    Target,
    Zap,
    Search,
    Gavel,
    History,
    ShieldCheck,
    Loader2,
    User,
    Building,
    School,
    Filter,
    Activity,
    ClipboardCheck,
    Star,
    Layers,
    Edit,
    Trash2,
    Save,
    Calendar,
    Clock
} from 'lucide-react';
import { Timestamp, collection, doc, query, where, updateDoc, serverTimestamp, deleteDoc } from '@/firebase/firestore-wrapper';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn, parseDate } from '@/lib/utils';
import { format } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface AuditResultsViewProps {
  selectedYear: number;
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  units: Unit[];
  campuses: Campus[];
  cars: CorrectiveActionRequest[];
  isLoading: boolean;
}

export function AuditResultsView({ 
    selectedYear, 
    plans, 
    schedules, 
    findings, 
    units, 
    campuses, 
    cars,
    isLoading 
}: AuditResultsViewProps) {
  const firestore = useFirestore();
  const { user, userProfile, isAdmin } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('non-conformance');
  
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null);
  const [editFindingText, setEditFindingText] = useState('');
  const [isSavingFinding, setIsSavingFinding] = useState(false);

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const kpis = useMemo(() => {
    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    let filteredSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    if (!isAdmin) {
        filteredSchedules = filteredSchedules.filter(s => s.auditorId === user?.uid);
    }
    if (campusFilter !== 'all') filteredSchedules = filteredSchedules.filter(s => s.campusId === campusFilter);
    if (unitFilter !== 'all') filteredSchedules = filteredSchedules.filter(s => s.targetId === unitFilter);
    if (searchTerm) {
        const low = searchTerm.toLowerCase();
        filteredSchedules = filteredSchedules.filter(s => 
            s.targetName.toLowerCase().includes(low) || 
            (s.auditorName || '').toLowerCase().includes(low)
        );
    }
    const scheduleIds = new Set(filteredSchedules.map(s => s.id));
    const filteredFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));
    const ncCount = filteredFindings.filter(f => f.type === 'Non-Conformance').length;
    const ofiCount = filteredFindings.filter(f => f.type === 'Observation for Improvement').length;
    return { ncCount, ofiCount, yearSchedules: filteredSchedules, yearFindings: filteredFindings, activePlan: yearPlans[0] };
  }, [plans, schedules, findings, selectedYear, campusFilter, unitFilter, searchTerm, isAdmin, user?.uid]);

  const handleNavigateToIssueCar = (item: any) => {
    const params = new URLSearchParams();
    params.set('tab', 'car');
    params.set('action', 'new');
    params.set('findingId', item.finding.id);
    params.set('scheduleId', item.finding.auditScheduleId);
    router.push(`/qa-reports?${params.toString()}`);
  };

  const handlePrintConsolidated = () => {
    if (!kpis?.activePlan || !isoClauses) return;
    setIsProcessingReport(true);
    try {
        // When a specific campus is selected, use its name; for a specific unit, use unit name.
        // When "all" campuses are selected, use perCampus mode to render a separate section per campus.
        const isAllCampuses = campusFilter === 'all' && unitFilter === 'all';
        const cName = unitFilter !== 'all'
            ? (unitMap.get(unitFilter) || 'UNIT')
            : (campusFilter !== 'all' ? (campusMap.get(campusFilter) || 'UNIVERSITY-WIDE') : 'UNIVERSITY-WIDE');

        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={kpis.activePlan} 
                schedules={kpis.yearSchedules} 
                findings={kpis.yearFindings} 
                clauses={isoClauses} 
                units={units} 
                campuses={campuses} 
                signatories={signatories || undefined} 
                campusName={isAllCampuses ? undefined : cName}
                perCampus={isAllCampuses}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Audit Report - ${cName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .break-before-page { page-break-before: always; } }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); } finally { setIsProcessingReport(false); }
  };

  const handlePrintByUnit = () => {
    if (!kpis?.activePlan || !isoClauses) return;
    setIsProcessingReport(true);
    try {
        const yearPlans = plans.filter(p => p.year === selectedYear);
        const planIds = new Set(yearPlans.map(p => p.id));
        
        let printSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
        if (!isAdmin) {
            printSchedules = printSchedules.filter(s => s.auditorId === user?.uid);
        }
        if (unitFilter !== 'all') {
            printSchedules = printSchedules.filter(s => s.targetId === unitFilter);
        }
        if (searchTerm) {
            const low = searchTerm.toLowerCase();
            printSchedules = printSchedules.filter(s => 
                s.targetName.toLowerCase().includes(low) || 
                (s.auditorName || '').toLowerCase().includes(low)
            );
        }

        const scheduleIds = new Set(printSchedules.map(s => s.id));
        const printFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

        const uName = unitFilter !== 'all' 
            ? (unitMap.get(unitFilter) || 'UNIT')
            : 'ALL UNITS';

        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={kpis.activePlan} 
                schedules={printSchedules} 
                findings={printFindings} 
                clauses={isoClauses} 
                units={units} 
                campuses={campuses} 
                signatories={signatories || undefined} 
                campusName={uName}
                byUnit={true}
                unitFilter={unitFilter}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>IQA Report by Unit - ${uName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } .break-before-page { page-break-before: always; } }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) { console.error(err); } finally { setIsProcessingReport(false); }
  };

  const handleSaveFindingUpdate = async () => {
    if (!firestore || !editingFinding) return;
    setIsSavingFinding(true);
    try {
        await updateDoc(doc(firestore, 'auditFindings', editingFinding.id), { 
            description: editFindingText, 
            ncStatement: editFindingText, 
            updatedAt: serverTimestamp() 
        });
        toast({ title: 'Finding Updated' });
        setEditingFinding(null);
    } catch (e) { toast({ title: 'Update Failed', variant: 'destructive' }); } finally { setIsSavingFinding(false); }
  };

  const handleDeleteFinding = async (id: string, authorId: string) => {
    if (!firestore || !window.confirm('Are you sure you want to remove this verified finding?')) return;
    if (!isAdmin && user?.uid !== authorId) {
        toast({ title: "Access Restricted", description: "You can only delete findings that you authored.", variant: "destructive" });
        return;
    }
    try {
        await deleteDoc(doc(firestore, 'auditFindings', id));
        toast({ title: 'Finding Removed' });
    } catch (e) { toast({ title: 'Delete Failed', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-sm bg-muted/10">
        <CardContent className="p-4 space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search findings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11 bg-white border-primary/10" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><School className="h-2.5 w-2.5" /> Campus / Site</label>
                    <Select value={campusFilter} onValueChange={(v) => { setCampusFilter(v); setUnitFilter('all'); }}>
                        <SelectTrigger className="h-10 bg-white font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Institutional View (All)</SelectItem>
                            {campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Building className="h-2.5 w-2.5" /> Unit / Office</label>
                    <Select value={unitFilter} onValueChange={setUnitFilter} disabled={campusFilter === 'all' && !isAdmin}>
                        <SelectTrigger className="h-10 bg-white font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Units in Campus</SelectItem>
                            {units.filter(u => campusFilter === 'all' || u.campusIds?.includes(campusFilter)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-2">
                    <Button onClick={handlePrintConsolidated} className="flex-1 font-black uppercase text-[10px] h-10 shadow-lg shadow-primary/20">
                        {isProcessingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Printer className="h-4 w-4 mr-1.5" />} 
                        {campusFilter === 'all' ? 'Print IQA Report' : `Print ${campusMap.get(campusFilter)} Report`}
                    </Button>
                    <Button onClick={handlePrintByUnit} variant="outline" className="flex-1 h-10 font-black uppercase text-[10px] border-primary/20 text-primary bg-white hover:bg-slate-50 shadow-sm gap-1.5">
                        {isProcessingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Printer className="h-4 w-4 mr-1.5" />}
                        Print IQA Report by Unit
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10">
              <TabsTrigger value="commendable" className="gap-2 text-[10px] font-black uppercase px-6 h-8"><Star className="h-3.5 w-3.5 text-amber-500" /> Commendable (P)</TabsTrigger>
              <TabsTrigger value="compliance" className="gap-2 text-[10px] font-black uppercase px-6 h-8 data-[state=active]:bg-emerald-600 data-[state=active]:text-white"><ClipboardCheck className="h-3.5 w-3.5" /> Compliance (C)</TabsTrigger>
              <TabsTrigger value="ofi" className="gap-2 text-[10px] font-black uppercase px-6 h-8 data-[state=active]:bg-amber-600 data-[state=active]:text-white"><TrendingUp className="h-3.5 w-3.5" /> Opportunities for Improvement (OFI)</TabsTrigger>
              <TabsTrigger value="non-conformance" className="gap-2 text-[10px] font-black uppercase px-6 h-8 data-[state=active]:bg-rose-600 data-[state=active]:text-white"><ShieldAlert className="h-3.5 w-3.5" /> Non-Conformance (NC)</TabsTrigger>
          </TabsList>

          <TabsContent value="non-conformance" className="animate-in fade-in duration-500">
              <Card className="shadow-lg border-rose-200 overflow-hidden">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Unit / Campus / Auditee</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Audit Date & Time</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">NC Statement</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {kpis.yearFindings
                            .filter(f => f.type === 'Non-Conformance')
                            .sort((a, b) => {
                                const schedA = kpis.yearSchedules.find(s => s.id === a.auditScheduleId);
                                const schedB = kpis.yearSchedules.find(s => s.id === b.auditScheduleId);
                                if (!schedA || !schedB) return 0;
                                return parseDate(schedA.scheduledDate).getTime() - parseDate(schedB.scheduledDate).getTime();
                            })
                            .map(finding => {
                               const schedule = kpis.yearSchedules.find(s => s.id === finding.auditScheduleId);
                               const campusName = schedule ? (campusMap.get(schedule.campusId) || 'Institutional') : 'Institutional';
                               const auditeeName = schedule ? (schedule.auditeeHeadName || schedule.officerInCharge || 'Unit Head') : 'Unit Head';
                               return (
                                  <TableRow key={finding.id} className="hover:bg-rose-50/20 group">
                                      <TableCell className="pl-8 py-5">
                                          <p className="font-black text-sm uppercase">{schedule?.targetName}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{campusName}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Auditee: {auditeeName}</p>
                                      </TableCell>
                                      <TableCell className="py-5 font-bold text-xs uppercase text-slate-700">
                                          {schedule?.scheduledDate ? (
                                              <div className="space-y-1">
                                                  <div className="flex items-center gap-1.5">
                                                      <Calendar className="h-3.5 w-3.5 text-[#1B6535]" />
                                                      <span>{format(parseDate(schedule.scheduledDate), 'PPP')}</span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                                      <Clock className="h-3 w-3" />
                                                      <span>{format(parseDate(schedule.scheduledDate), 'p')}</span>
                                                  </div>
                                              </div>
                                          ) : (
                                              <span className="text-muted-foreground italic">N/A</span>
                                          )}
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <Badge className="bg-rose-600 text-white h-4 px-1.5 text-[8px] font-black mb-2">Clause {finding.isoClause}</Badge>
                                          <p className="text-xs font-bold italic">"{finding.ncStatement || finding.description}"</p>
                                      </TableCell>
                                      <TableCell className="text-right pr-8">
                                          <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all">
                                              {isAdmin && (
                                                  <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase bg-white border-primary/20 text-primary" onClick={() => { setEditingFinding(finding); setEditFindingText(finding.ncStatement || finding.description); }}>
                                                      <Edit className="h-3 w-3 mr-1" /> EDIT STMT
                                                  </Button>
                                              )}
                                              <Button size="sm" onClick={() => handleNavigateToIssueCar({ finding })} className="h-8 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 shadow-md">
                                                  <Gavel className="h-3.5 w-3.5 mr-1.5" /> ISSUE CAR
                                              </Button>
                                              {(isAdmin || user?.uid === finding.authorId) && (
                                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteFinding(finding.id, finding.authorId)}>
                                                      <Trash2 className="h-3.5 w-3.5" />
                                                  </Button>
                                              )}
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                          {kpis.yearFindings.filter(f => f.type === 'Non-Conformance').length === 0 && (
                              <TableRow><TableCell colSpan={3} className="h-40 text-center opacity-20"><Activity className="h-10 w-10 mx-auto" /><p className="text-[10px] font-black uppercase tracking-widest">No verified NCs in this scope</p></TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </Card>
          </TabsContent>

          <TabsContent value="compliance" className="animate-in fade-in duration-500">
              <Card className="shadow-lg border-emerald-200 overflow-hidden">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Unit / Campus / Auditee</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">ISO Clause</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Compliance Description</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Evidence Logged</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {kpis.yearFindings.filter(f => f.type === 'Compliance').map(finding => {
                              const schedule = kpis.yearSchedules.find(s => s.id === finding.auditScheduleId);
                              const campusName = schedule ? (campusMap.get(schedule.campusId) || 'Institutional') : 'Institutional';
                              const auditeeName = schedule ? (schedule.auditeeHeadName || schedule.officerInCharge || 'Unit Head') : 'Unit Head';
                              return (
                                  <TableRow key={finding.id} className="hover:bg-emerald-50/10 transition-colors">
                                      <TableCell className="pl-8 py-5">
                                          <p className="font-black text-sm uppercase">{schedule?.targetName}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{campusName}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Auditee: {auditeeName}</p>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <Badge variant="secondary" className="text-[9px] font-black uppercase">Clause {finding.isoClause}</Badge>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <p className="text-xs font-medium text-slate-700 leading-relaxed">"{finding.description}"</p>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <p className="text-xs font-medium text-slate-500 italic leading-relaxed">{finding.evidence || 'No evidence logged.'}</p>
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                          {kpis.yearFindings.filter(f => f.type === 'Compliance').length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-40 text-center opacity-20">
                                      <ClipboardCheck className="h-10 w-10 mx-auto" />
                                      <p className="text-[10px] font-black uppercase tracking-widest mt-2">No verified compliances in this scope</p>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </Card>
          </TabsContent>

          <TabsContent value="ofi" className="animate-in fade-in duration-500">
              <Card className="shadow-lg border-amber-200 overflow-hidden">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Unit / Campus / Auditee</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">ISO Clause</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">OFI Description</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Evidence Logged</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {kpis.yearFindings.filter(f => f.type === 'Observation for Improvement').map(finding => {
                              const schedule = kpis.yearSchedules.find(s => s.id === finding.auditScheduleId);
                              const campusName = schedule ? (campusMap.get(schedule.campusId) || 'Institutional') : 'Institutional';
                              const auditeeName = schedule ? (schedule.auditeeHeadName || schedule.officerInCharge || 'Unit Head') : 'Unit Head';
                              return (
                                  <TableRow key={finding.id} className="hover:bg-amber-50/10 transition-colors">
                                      <TableCell className="pl-8 py-5">
                                          <p className="font-black text-sm uppercase">{schedule?.targetName}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{campusName}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Auditee: {auditeeName}</p>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <Badge variant="secondary" className="text-[9px] font-black uppercase">Clause {finding.isoClause}</Badge>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <p className="text-xs font-medium text-slate-700 leading-relaxed">"{finding.description}"</p>
                                      </TableCell>
                                      <TableCell className="py-5">
                                          <p className="text-xs font-medium text-slate-500 italic leading-relaxed">{finding.evidence || 'No evidence logged.'}</p>
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                          {kpis.yearFindings.filter(f => f.type === 'Observation for Improvement').length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-40 text-center opacity-20">
                                      <TrendingUp className="h-10 w-10 mx-auto" />
                                      <p className="text-[10px] font-black uppercase tracking-widest mt-2">No verified OFIs in this scope</p>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </Card>
          </TabsContent>

          <TabsContent value="commendable" className="animate-in fade-in duration-500">
              <Card className="shadow-md border-primary/10 overflow-hidden">
                   <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-8 py-3 text-[10px] font-black uppercase">Unit / Campus / Auditee</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Positive Observations</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {kpis.yearSchedules.filter(s => s.summaryCommendable).map(s => {
                              const campusName = campusMap.get(s.campusId) || 'Institutional';
                              const auditeeName = s.auditeeHeadName || s.officerInCharge || 'Unit Head';
                              return (
                                  <TableRow key={s.id} className="hover:bg-emerald-50/20 transition-colors">
                                      <TableCell className="pl-8 py-5 w-[250px]">
                                          <p className="font-black text-sm uppercase">{s.targetName}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{campusName}</p>
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">Auditee: {auditeeName}</p>
                                      </TableCell>
                                      <TableCell className="py-5"><p className="text-sm text-slate-700 italic leading-relaxed">"{s.summaryCommendable}"</p></TableCell>
                                  </TableRow>
                              );
                          })}
                          {kpis.yearSchedules.filter(s => s.summaryCommendable).length === 0 && (
                              <TableRow><TableCell colSpan={2} className="h-40 text-center opacity-20"><Star className="h-10 w-10 mx-auto" /><p className="text-[10px] font-black uppercase">No positive findings recorded</p></TableCell></TableRow>
                          )}
                      </TableBody>
                  </Table>
              </Card>
          </TabsContent>
      </Tabs>

      <Dialog open={!!editingFinding} onOpenChange={() => setEditingFinding(null)}>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader><DialogTitle className="font-black uppercase tracking-tight">Refine Audit Statement</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Label className="text-[10px] font-black uppercase text-slate-500">Statement Description</Label>
                <Textarea value={editFindingText} onChange={(e) => setEditFindingText(e.target.value)} rows={6} className="bg-slate-50 italic text-xs leading-relaxed" />
                <Alert className="bg-primary/5 border-primary/20"><ShieldCheck className="h-4 w-4 text-primary" /><AlertTitle className="text-[10px] font-black uppercase text-primary">System Override</AlertTitle><AlertDescription className="text-[10px] italic">Updates will be synchronized across all official institutional reports.</AlertDescription></Alert>
            </div>
            <DialogFooter><Button variant="ghost" onClick={() => setEditingFinding(null)} className="font-bold text-xs uppercase">Cancel</Button><Button onClick={handleSaveFindingUpdate} disabled={isSavingFinding} className="font-black uppercase text-xs shadow-lg">{isSavingFinding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save & Refine</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
