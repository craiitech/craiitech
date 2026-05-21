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
    ManagementReviewOutput
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    ClipboardCheck, 
    FileText, 
    AlertTriangle, 
    CheckCircle2, 
    Printer, 
    TrendingUp, 
    Info, 
    ShieldAlert, 
    Target,
    Zap,
    ChevronRight,
    Search,
    Gavel,
    History,
    ShieldCheck,
    Loader2,
    User,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp, collection, doc, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsolidatedAuditReportTemplate } from './consolidated-audit-report-template';
import { useFirestore, useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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
  const { userProfile, isAdmin, userRole } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  
  const [isProcessingReport, setIsProcessingReport] = useState(false);

  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  /**
   * KPI CALCULATIONS
   */
  const kpis = useMemo(() => {
    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    const yearSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    const scheduleIds = new Set(yearSchedules.map(s => s.id));
    const yearFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    const totalFindings = yearFindings.length;
    const ncCount = yearFindings.filter(f => f.type === 'Non-Conformance').length;
    const ofiCount = yearFindings.filter(f => f.type === 'Observation for Improvement').length;
    
    // Resolution Tracking: How many findings have linked CARs?
    const carsIssued = cars.filter(car => car.findingId).length;
    const closureRate = ncCount > 0 ? Math.round((carsIssued / ncCount) * 100) : 100;

    const complianceRate = totalFindings > 0 
        ? Math.round((yearFindings.filter(f => f.type === 'Compliance').length / (totalFindings - yearFindings.filter(f => f.type === 'Not Applicable').length || 1)) * 100) 
        : 0;

    return { totalFindings, ncCount, ofiCount, complianceRate, closureRate, activePlan: yearPlans[0], yearSchedules, yearFindings };
  }, [plans, schedules, findings, cars, selectedYear]);

  /**
   * NC REGISTRY MAPPING
   */
  const ncRegistry = useMemo(() => {
    if (!kpis) return [];
    
    return kpis.yearFindings
        .filter(f => f.type === 'Non-Conformance')
        .map(finding => {
            const schedule = kpis.yearSchedules.find(s => s.id === finding.auditScheduleId);
            const linkedCar = cars.find(car => car.findingId === finding.id);
            
            return {
                finding,
                schedule,
                linkedCar,
                isIssued: !!linkedCar
            };
        })
        .sort((a, b) => {
            const timeA = a.finding.createdAt instanceof Timestamp ? a.finding.createdAt.toMillis() : new Date(a.finding.createdAt).getTime();
            const timeB = b.finding.createdAt instanceof Timestamp ? b.finding.createdAt.toMillis() : new Date(b.finding.createdAt).getTime();
            return timeB - timeA;
        });
  }, [kpis, cars]);

  /**
   * NAVIGATION BRIDGE
   * Instead of background creation, we navigate to the CAR module with parameters
   */
  const handleNavigateToIssueCar = (item: any) => {
    const { finding, schedule } = item;
    
    const params = new URLSearchParams();
    params.set('tab', 'car');
    params.set('action', 'new');
    params.set('findingId', finding.id);
    params.set('scheduleId', finding.auditScheduleId);
    
    // Explicitly navigate to the CAR registry with "New" mode enabled
    router.push(`/qa-reports?${params.toString()}`);
  };

  const handlePrintConsolidated = () => {
    if (!kpis?.activePlan || !isoClauses) return;
    setIsProcessingReport(true);
    try {
        const reportHtml = renderToStaticMarkup(
            <ConsolidatedAuditReportTemplate 
                plan={kpis.activePlan} 
                schedules={kpis.yearSchedules} 
                findings={kpis.yearFindings} 
                clauses={isoClauses} 
                units={units} 
                campuses={campuses} 
                signatories={signatories || undefined} 
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Consolidated Audit Report - AY ${selectedYear}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                        @media print { body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
                        body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Institutional Report</button>
                    </div>
                    <div id="print-content" style="padding: 0.1in;">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsProcessingReport(false);
    }
  };

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* KPI LAYER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm flex flex-col">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Compliance index</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5">
                <div className="text-3xl font-black text-primary tabular-nums">{kpis?.complianceRate}%</div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Verified Standard Adherence</p>
            </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-rose-700">Critical Gaps (NC)</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5">
                <div className="text-3xl font-black text-rose-600 tabular-nums">{kpis?.ncCount}</div>
                <p className="text-[9px] font-bold text-rose-600/70 uppercase">Immediate Action Required</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-amber-700">Improvement Potentials</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{kpis?.ofiCount}</div>
                <p className="text-[9px] font-bold text-amber-600/70 uppercase">OFI Findings Logged</p>
            </CardContent>
        </Card>
        <Card className="bg-indigo-50 border-indigo-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-indigo-700">Bridge Efficiency</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5">
                <div className="text-3xl font-black text-indigo-600 tabular-nums">{kpis?.closureRate}%</div>
                <p className="text-[9px] font-bold text-indigo-600/70 uppercase">NC to CAR Conversion Rate</p>
            </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
            <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Non-Conformance Management Workspace</h3>
            <p className="text-xs text-muted-foreground font-medium">Convert verified audit findings into actionable Corrective Action Requests.</p>
        </div>
        <Button 
            onClick={handlePrintConsolidated} 
            disabled={isProcessingReport || !kpis?.yearSchedules.length}
            className="h-10 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20"
        >
            {isProcessingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <FileText className="h-4 w-4 mr-1.5" />}
            Generate Institutional IQA Report
        </Button>
      </div>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Active Audit Findings Registry (Non-Conformances Only)</CardTitle>
                  </div>
                  <Badge variant="destructive" className="h-5 text-[9px] font-black">{ncRegistry.length} GAPS DETECTED</Badge>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader className="bg-muted/30 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Source Unit & Auditor</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Standard Finding (Statement of NC)</TableHead>
                              <TableHead className="text-center text-[10px] font-black uppercase">Linked CAR</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Workflow Bridge</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {ncRegistry.map(item => (
                              <TableRow key={item.finding.id} className="hover:bg-muted/20 transition-colors group">
                                  <TableCell className="pl-8 py-5">
                                      <div className="space-y-1">
                                          <p className="font-black text-sm text-slate-900 leading-tight uppercase group-hover:text-primary transition-colors">{item.schedule?.targetName}</p>
                                          <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase">
                                              <User className="h-3 w-3" />
                                              {item.schedule?.auditorName}
                                          </div>
                                          <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-primary/20 bg-primary/5 text-primary">
                                              {campusMap.get(item.schedule?.campusId || '')}
                                          </Badge>
                                      </div>
                                  </TableCell>
                                  <TableCell className="max-w-md py-5">
                                      <div className="space-y-2">
                                          <Badge className="bg-rose-600 text-white border-none h-4 px-1.5 text-[8px] font-black">ISO Clause {item.finding.isoClause}</Badge>
                                          <p className="text-xs font-bold text-slate-800 leading-relaxed italic">"{item.finding.ncStatement || item.finding.description}"</p>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                      {item.linkedCar ? (
                                          <div className="flex flex-col items-center gap-1">
                                              <Badge className="bg-emerald-600 text-white font-black text-[9px] h-5 px-2">CAR {item.linkedCar.carNumber}</Badge>
                                              <span className="text-[8px] font-bold text-muted-foreground uppercase">{item.linkedCar.status}</span>
                                          </div>
                                      ) : (
                                          <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 h-5 text-[9px] font-black uppercase">PENDING CAR</Badge>
                                      )}
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                      {item.isIssued ? (
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-[9px] font-black uppercase tracking-widest bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                                            onClick={() => router.push('/qa-reports?tab=car')}
                                          >
                                              <Target className="h-3.5 w-3.5" /> View Linked CAR
                                          </Button>
                                      ) : (
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleNavigateToIssueCar(item)}
                                            className="h-8 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-700 shadow-md gap-1.5"
                                          >
                                              <Gavel className="h-3.5 w-3.5" />
                                              Issue CAR Now
                                          </Button>
                                      )}
                                  </TableCell>
                              </TableRow>
                          ))}
                          {ncRegistry.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={4} className="h-40 text-center opacity-20">
                                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
                                      <p className="text-[10px] font-black uppercase tracking-widest">Registry Clean: No NC findings to manage</p>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4 px-8">
                <div className="flex items-start gap-4">
                    <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                        <strong>Protocol Hub:</strong> As mandated by ISO 21001:2018 Clause 10.1, all Non-Conformances must result in a formal Corrective Action Request. Use this bridge to ensure every audit gap is traceable to its resolution lifecycle in the QA module.
                    </p>
                </div>
          </CardFooter>
      </Card>
    </div>
  );
}
