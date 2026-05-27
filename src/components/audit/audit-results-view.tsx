
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
    Check,
    Lock,
    WifiOff,
    Building2,
    Edit,
    Trash2,
    Save
} from 'lucide-react';
import { Timestamp, collection, doc, query, where, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { CARPrintTemplate } from '../qa-reports/car-print-template';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const isOnline = useNetworkStatus();
  
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('nc-manager');
  
  // EDIT FINDING STATES
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

  const filteredUnits = useMemo(() => {
    if (campusFilter === 'all') return units;
    return units.filter(u => u.campusIds?.includes(campusFilter));
  }, [units, campusFilter]);

  const isNetworkLocked = typeof window !== 'undefined' && localStorage.getItem('rsu_eoms_net_disabled') === 'true';

  const kpis = useMemo(() => {
    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    
    let filteredSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
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

    const totalFindings = filteredFindings.length;
    const ncCount = filteredFindings.filter(f => f.type === 'Non-Conformance').length;
    const ofiCount = filteredFindings.filter(f => f.type === 'Observation for Improvement').length;
    const carsIssued = cars.filter(car => filteredFindings.some(f => f.id === car.findingId)).length;
    const closureRate = ncCount > 0 ? Math.round((carsIssued / ncCount) * 100) : 100;

    const complianceRate = totalFindings > 0 
        ? Math.round((filteredFindings.filter(f => f.type === 'Compliance').length / (totalFindings - filteredFindings.filter(f => f.type === 'Not Applicable').length || 1)) * 100) 
        : 0;

    return { totalFindings, ncCount, ofiCount, complianceRate, closureRate, activePlan: yearPlans[0], yearSchedules: filteredSchedules, yearFindings: filteredFindings };
  }, [plans, schedules, findings, cars, selectedYear, campusFilter, unitFilter, searchTerm]);

  const commendableRegistry = useMemo(() => {
      return kpis.yearSchedules.filter(s => s.summaryCommendable && s.summaryCommendable.trim() !== '');
  }, [kpis.yearSchedules]);

  const ofiRegistry = useMemo(() => {
      return kpis.yearSchedules.filter(s => s.summaryOFI && s.summaryOFI.trim() !== '');
  }, [kpis.yearSchedules]);

  const ncRegistry = useMemo(() => {
    return kpis.yearFindings
        .filter(f => f.type === 'Non-Conformance')
        .map(finding => {
            const schedule = kpis.yearSchedules.find(s => s.id === finding.auditScheduleId);
            const linkedCar = cars.find(car => car.findingId === finding.id);
            return { finding, schedule, linkedCar, isIssued: !!linkedCar };
        });
  }, [kpis, cars]);

  const handleRestrictedAction = (name: string) => {
    toast({
        variant: "destructive",
        title: "Action Restricted",
        description: `${name} is disabled in the offline workspace to ensure document integrity. Please sync with the university network to proceed.`,
    });
  };

  const handleNavigateToIssueCar = (item: any) => {
    if (!isOnline || isNetworkLocked) {
        handleRestrictedAction("Issuing new Corrective Action Requests");
        return;
    }
    const { finding } = item;
    const params = new URLSearchParams();
    params.set('tab', 'car');
    params.set('action', 'new');
    params.set('findingId', finding.id);
    params.set('scheduleId', finding.auditScheduleId);
    router.push(`/qa-reports?${params.toString()}`);
  };

  const handlePrintConsolidated = () => {
    if (!isOnline || isNetworkLocked) {
        handleRestrictedAction("Generating institutional reports");
        return;
    }
    if (!kpis?.activePlan || !isoClauses) return;
    setIsProcessingReport(true);
    try {
        const resolvedSiteName = unitFilter !== 'all' 
            ? (unitMap.get(unitFilter) || 'SPECIFIC UNIT')
            : (campusFilter === 'all' ? 'UNIVERSITY-WIDE' : (campusMap.get(campusFilter) || 'CAMPUS SITE'));

        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={kpis.activePlan} 
                schedules={kpis.yearSchedules} 
                findings={kpis.yearFindings} 
                clauses={isoClauses} 
                units={units} 
                campuses={campuses} 
                signatories={signatories || undefined} 
                campusName={resolvedSiteName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Audit Report - ${resolvedSiteName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
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

  /**
   * ADMIN EDIT FINDING LOGIC
   */
  const handleOpenEditFinding = (finding: AuditFinding) => {
      setEditingFinding(finding);
      setEditFindingText(finding.ncStatement || finding.description);
  };

  const handleSaveFindingUpdate = async () => {
    if (!firestore || !editingFinding) return;
    setIsSavingFinding(true);
    try {
        const findingRef = doc(firestore, 'auditFindings', editingFinding.id);
        const updateData: any = {
            updatedAt: serverTimestamp(),
        };

        if (editingFinding.type === 'Non-Conformance') {
            updateData.ncStatement = editFindingText;
            updateData.description = editFindingText;
        } else {
            updateData.description = editFindingText;
        }

        await updateDoc(findingRef, updateData);
        toast({ title: 'Finding Updated', description: 'Institutional audit log has been revised.' });
        setEditingFinding(null);
    } catch (e) {
        toast({ title: 'Update Failed', variant: 'destructive' });
    } finally {
        setIsSavingFinding(false);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
      if (!firestore || !window.confirm('Are you absolutely sure you want to DELETE this finding? This action is restricted to the original author.')) return;
      try {
          await deleteDoc(doc(firestore, 'auditFindings', findingId));
          toast({ title: 'Finding Removed', description: 'Entry has been purged from the registry.' });
      } catch (e) {
          toast({ title: 'Delete Failed', description: 'You may not have authorization to delete this record.', variant: 'destructive' });
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm flex flex-col"><CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Compliance index</CardTitle></CardHeader><CardContent className="px-6 pb-5"><div className="text-3xl font-black text-primary tabular-nums">{kpis?.complianceRate}%</div></CardContent></Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm flex flex-col"><CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-rose-700">Critical Gaps (NC)</CardTitle></CardHeader><CardContent className="px-6 pb-5"><div className="text-3xl font-black text-rose-600 tabular-nums">{kpis?.ncCount}</div></CardContent></Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm flex flex-col"><CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-amber-700">OFI Observations</CardTitle></CardHeader><CardContent className="px-6 pb-5"><div className="text-3xl font-black text-amber-600 tabular-nums">{kpis?.ofiCount}</div></CardContent></Card>
        <Card className="bg-indigo-50 border-indigo-100 shadow-sm flex flex-col"><CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-indigo-700">CAR Transition</CardTitle></CardHeader><CardContent className="px-6 pb-5"><div className="text-3xl font-black text-indigo-600 tabular-nums">{kpis?.closureRate}%</div></CardContent></Card>
      </div>

      <Card className="border-primary/10 shadow-sm bg-muted/10">
        <CardContent className="p-4 space-y-4">
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search finding by auditee or auditor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-11 shadow-sm bg-white border-primary/10 font-medium" /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><School className="h-2.5 w-2.5" /> Campus / Site</label><Select value={campusFilter} onValueChange={(v) => { setCampusFilter(v); setUnitFilter('all'); }}><SelectTrigger className="h-10 bg-white font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Institutional View (All)</SelectItem>{campuses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-muted-foreground ml-1 flex items-center gap-1.5"><Building className="h-2.5 w-2.5" /> Unit / Office</label><Select value={unitFilter} onValueChange={setUnitFilter} disabled={campusFilter === 'all' && !isAdmin}><SelectTrigger className="h-10 bg-white font-bold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Units in Campus</SelectItem>{filteredUnits.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="flex gap-2">
                    <Button onClick={handlePrintConsolidated} className="flex-1 h-10 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                        {isProcessingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Printer className="h-4 w-4 mr-1.5" />}
                        {campusFilter === 'all' ? 'Print System-Wide Report' : `Print ${campusMap.get(campusFilter)} Report`}
                    </Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted p-1 border shadow-sm w-fit h-10">
              <TabsTrigger value="commendable" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Commendable (P)
              </TabsTrigger>
              <TabsTrigger value="ofi" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" /> Opportunities (OFI)
              </TabsTrigger>
              <TabsTrigger value="non-conformance" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
                  <ShieldAlert className="h-3.5 w-3.5" /> Non-Conformance (NC)
              </TabsTrigger>
          </TabsList>

          <TabsContent value="commendable" className="animate-in fade-in duration-500">
              <Card className="shadow-md border-primary/10 overflow-hidden">
                  <CardHeader className="bg-emerald-50 border-b py-4">
                      <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Commendable Practices Registry</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/30">
                              <TableRow><TableHead className="pl-8 py-3 text-[10px] font-black uppercase">Source Unit</TableHead><TableHead className="text-[10px] font-black uppercase">Auditor Commendation</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                              {commendableRegistry.map(s => (
                                  <TableRow key={s.id} className="hover:bg-emerald-50/20">
                                      <TableCell className="pl-8 py-5 font-bold text-xs uppercase w-[250px]">{s.targetName}</TableCell>
                                      <TableCell className="py-5"><p className="text-sm text-slate-700 italic leading-relaxed">"{s.summaryCommendable}"</p></TableCell>
                                  </TableRow>
                              ))}
                              {commendableRegistry.length === 0 && <TableRow><TableCell colSpan={2} className="h-40 text-center opacity-20"><Activity className="h-10 w-10 mx-auto" /><p className="text-[10px] font-black uppercase">No commendable findings logged</p></TableCell></TableRow>}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="ofi" className="animate-in fade-in duration-500">
              <Card className="shadow-md border-primary/10 overflow-hidden">
                  <CardHeader className="bg-amber-50 border-b py-4">
                      <div className="flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-amber-600" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight text-amber-900">Institutional Opportunities for Improvement</CardTitle>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/30">
                              <TableRow><TableHead className="pl-8 py-3 text-[10px] font-black uppercase">Source Unit</TableHead><TableHead className="text-[10px] font-black uppercase">OFI Finding / Recommendation</TableHead></TableRow>
                          </TableHeader>
                          <TableBody>
                              {ofiRegistry.map(s => (
                                  <TableRow key={s.id} className="hover:bg-amber-50/20">
                                      <TableCell className="pl-8 py-5 font-bold text-xs uppercase w-[250px]">{s.targetName}</TableCell>
                                      <TableCell className="py-5"><p className="text-sm text-slate-700 italic leading-relaxed">"{s.summaryOFI}"</p></TableCell>
                                  </TableRow>
                              ))}
                              {ofiRegistry.length === 0 && <TableRow><TableCell colSpan={2} className="h-40 text-center opacity-20"><Target className="h-10 w-10 mx-auto" /><p className="text-[10px] font-black uppercase">No OFIs recorded</p></TableCell></TableRow>}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="non-conformance" className="animate-in fade-in duration-500">
              <Card className="shadow-lg border-rose-200 overflow-hidden">
                  <CardHeader className="bg-rose-50 border-b py-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-rose-600" />
                            <CardTitle className="text-sm font-black uppercase tracking-tight text-rose-900">Institutional Non-Conformance (NC) Registry</CardTitle>
                          </div>
                          <Badge variant="destructive" className="h-5 text-[9px] font-black">{ncRegistry.length} GAPS</Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <Table>
                          <TableHeader className="bg-muted/30">
                              <TableRow>
                                  <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Unit & Auditor</TableHead>
                                  <TableHead className="text-[10px] font-black uppercase">NC Statement</TableHead>
                                  <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase">CAR Bridge</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {ncRegistry.map(item => (
                                  <TableRow key={item.finding.id} className="hover:bg-rose-50/20 transition-colors group">
                                      <TableCell className="pl-8 py-5">
                                          <div className="space-y-1">
                                              <p className="font-black text-sm text-slate-900 leading-tight uppercase group-hover:text-primary transition-colors">{item.schedule?.targetName}</p>
                                              <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase"><User className="h-3 w-3" />{item.schedule?.auditorName}</div>
                                          </div>
                                      </TableCell>
                                      <TableCell className="max-w-md py-5">
                                          <div className="space-y-2">
                                              <Badge className="bg-rose-600 text-white border-none h-4 px-1.5 text-[8px] font-black">Clause {item.finding.isoClause}</Badge>
                                              <p className="text-xs font-bold text-slate-800 leading-relaxed italic line-clamp-2">"{item.finding.ncStatement || item.finding.description}"</p>
                                          </div>
                                      </TableCell>
                                      <TableCell className="text-center">
                                          {item.linkedCar ? (
                                              <Badge className="bg-emerald-600 text-white font-black text-[9px] h-5 px-2">CAR {item.linkedCar.carNumber}</Badge>
                                          ) : <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 h-5 text-[9px] font-black uppercase">PENDING</Badge>}
                                      </TableCell>
                                      <TableCell className="text-right pr-8">
                                          <div className="flex items-center justify-end gap-2">
                                            {isAdmin && (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="h-8 text-[9px] font-black uppercase tracking-widest bg-white border-primary/20 text-primary shadow-sm"
                                                    onClick={() => handleOpenEditFinding(item.finding)}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" /> EDIT STMT
                                                </Button>
                                            )}
                                            {item.finding.authorId === user?.uid && (
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteFinding(item.finding.id)}
                                                    title="Purge Finding"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {item.isIssued ? (
                                                <Button variant="outline" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5" onClick={() => router.push('/qa-reports?tab=car')}><Target className="h-3.5 w-3.5" /> View CAR</Button>
                                            ) : (
                                                <Button size="sm" onClick={() => handleNavigateToIssueCar(item)} className="h-8 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 shadow-md gap-1.5"><Gavel className="h-3.5 w-3.5" /> Issue CAR</Button>
                                            )}
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              ))}
                              {ncRegistry.length === 0 && <TableRow><TableCell colSpan={4} className="h-40 text-center opacity-20"><CheckCircle2 className="h-10 w-10 mx-auto" /><p className="text-[10px] font-black uppercase">Registry Clean</p></TableCell></TableRow>}
                          </TableBody>
                      </Table>
                  </CardContent>
              </Card>
          </TabsContent>
      </Tabs>

      {/* --- EDIT FINDING DIALOG (ADMIN OVERRIDE) --- */}
      <Dialog open={!!editingFinding} onOpenChange={(open) => !open && setEditingFinding(null)}>
        <DialogContent className="sm:max-w-xl border-primary/20 shadow-2xl overflow-hidden p-0">
            <DialogHeader className="p-6 border-b bg-slate-50 shrink-0">
                <div className="flex items-center gap-2 text-primary mb-1">
                    <Edit className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Institutional Oversight Override</span>
                </div>
                <DialogTitle>Refine Finding Statement</DialogTitle>
                <DialogDescription className="text-xs">Adjust the descriptive finding for Clause {editingFinding?.isoClause} to improve professional quality.</DialogDescription>
            </DialogHeader>
            <div className="p-8 space-y-6">
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Finding Content (Audit Log)</Label>
                    <Textarea 
                        value={editFindingText}
                        onChange={(e) => setEditFindingText(e.target.value)}
                        rows={8}
                        className="text-xs font-medium leading-relaxed italic bg-slate-50 border-primary/10 shadow-inner"
                        placeholder="Refine the audit statement..."
                    />
                </div>
                <Alert className="bg-primary/5 border-primary/20">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-[10px] font-black uppercase text-primary">Registry Integrity Note</AlertTitle>
                    <AlertDescription className="text-[10px] leading-tight font-medium text-slate-600">
                        Editing the statement will update the permanent audit log and any consolidated reports. The original author remains credited in the system metadata.
                    </AlertDescription>
                </Alert>
            </div>
            <DialogFooter className="p-6 border-t bg-slate-50 shrink-0 gap-2 sm:gap-0">
                <Button variant="ghost" className="font-bold text-[10px] uppercase tracking-widest" onClick={() => setEditingFinding(null)}>Discard</Button>
                <Button 
                    onClick={handleSaveFindingUpdate} 
                    disabled={isSavingFinding || !editFindingText.trim()}
                    className="min-w-[160px] shadow-xl shadow-primary/20 font-black uppercase text-[10px] h-11"
                >
                    {isSavingFinding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Commit Changes
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
