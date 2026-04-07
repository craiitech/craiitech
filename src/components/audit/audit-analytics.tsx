'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Unit, Campus, User, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    Legend, 
    ResponsiveContainer, 
    Cell,
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { 
    Trophy, 
    AlertTriangle, 
    CheckCircle2, 
    Activity, 
    ShieldCheck, 
    Target, 
    Zap, 
    Info, 
    BarChart3,
    ClipboardCheck,
    Search,
    UserCheck,
    TrendingUp,
    ShieldAlert,
    Users,
    LayoutList,
    Briefcase,
    CalendarCheck,
    Scale,
    HandHeart,
    Printer,
    Clock,
    ChevronRight,
    Building2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditorAssignmentsPrintTemplate } from './auditor-assignments-print-template';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface AuditAnalyticsProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  isoClauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  users: User[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = {
    Compliance: 'hsl(142 71% 45%)',
    OFI: 'hsl(48 96% 53%)',
    NC: 'hsl(var(--destructive))',
};

type SWOTItem = {
    title: string;
    description: string;
    tag: string;
    priority?: 'High' | 'Medium' | 'Low';
    category?: string;
};

export function AuditAnalytics({ plans, schedules, findings, isoClauses, units, campuses, users, isLoading, selectedYear }: AuditAnalyticsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const analytics = useMemo(() => {
    if (!schedules.length) return null;

    const campusMap = new Map(campuses.map(c => [c.id, c.name]));
    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    const yearSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    const scheduleIds = new Set(yearSchedules.map(s => s.id));
    const yearFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    // Get Lead Auditor Name from the first available plan of the year
    const leadAuditorName = yearPlans.length > 0 ? yearPlans[0].leadAuditorName : undefined;

    // 1. Findings Distribution
    const counts = { Compliance: 0, OFI: 0, NC: 0 };
    yearFindings.forEach(f => {
        if (f.type === 'Compliance') counts.Compliance++;
        else if (f.type === 'Observation for Improvement') counts.OFI++;
        else if (f.type === 'Non-Conformance') counts.NC++;
    });
    const findingsData = [
        { name: 'Compliance', value: counts.Compliance, fill: COLORS.Compliance },
        { name: 'OFI', value: counts.OFI, fill: COLORS.OFI },
        { name: 'Non-Conformance', value: counts.NC, fill: COLORS.NC },
    ].filter(d => d.value > 0);

    // 2. Clause Coverage
    const clauseStats: Record<string, number> = {};
    yearFindings.forEach(f => {
        clauseStats[f.isoClause] = (clauseStats[f.isoClause] || 0) + 1;
    });
    const clauseData = Object.entries(clauseStats)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // 3. Auditor Workload & Sex Distribution
    const auditorWorkload: Record<string, { name: string, count: number, completed: number, assignments: any[] }> = {};
    const uniqueAuditorIds = new Set<string>();

    yearSchedules.forEach(s => {
        if (!s.auditorId) return;
        uniqueAuditorIds.add(s.auditorId);
        if (!auditorWorkload[s.auditorId]) {
            auditorWorkload[s.auditorId] = { name: s.auditorName || 'TBA', count: 0, completed: 0, assignments: [] };
        }
        auditorWorkload[s.auditorId].count++;
        if (s.status === 'Completed') auditorWorkload[s.auditorId].completed++;
        
        auditorWorkload[s.auditorId].assignments.push({
            unitName: s.targetName,
            date: s.scheduledDate,
            startTime: s.scheduledDate,
            endTime: s.endScheduledDate,
            status: s.status,
            procedure: s.procedureDescription,
            campus: campusMap.get(s.campusId) || 'Institutional'
        });
    });
    const auditorData = Object.values(auditorWorkload).sort((a, b) => b.count - a.count);

    // Auditor Sex Distribution Calculation
    const auditorSexCounts = { Male: 0, Female: 0, Others: 0 };
    uniqueAuditorIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user?.sex === 'Male') auditorSexCounts.Male++;
        else if (user?.sex === 'Female') auditorSexCounts.Female++;
        else if (user?.sex === 'Others (LGBTQI++)') auditorSexCounts.Others++;
    });

    // 4. Unit Performance
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const unitResults: Record<string, { total: number, nc: number, score: number }> = {};
    
    yearSchedules.forEach(s => {
        const unitFindings = yearFindings.filter(f => f.auditScheduleId === s.id);
        if (unitFindings.length === 0) return;

        const c = unitFindings.filter(f => f.type === 'Compliance').length;
        const total = unitFindings.length;
        const nc = unitFindings.filter(f => f.type === 'Non-Conformance').length;
        
        if (!unitResults[s.targetId]) {
            unitResults[s.targetId] = { total: 0, nc: 0, score: 0 };
        }
        unitResults[s.targetId].total += total;
        unitResults[s.targetId].nc += nc;
        unitResults[s.targetId].score = Math.round((c / (total || 1)) * 100);
    });

    const strengths: SWOTItem[] = [];
    const gaps: SWOTItem[] = [];

    // Deriving Strengths
    if (yearSchedules.length > 0) {
        const avgUnitScore = Object.values(unitResults).reduce((acc, curr) => acc + curr.score, 0) / (Object.keys(unitResults).length || 1);
        if (avgUnitScore >= 80) {
            strengths.push({ title: 'Positive Standard Conformity', description: `Institutional compliance mean reached ${Math.round(avgUnitScore)}% across ${Object.keys(unitResults).length} monitored units.`, tag: 'ISO 10.2', category: 'Audit' });
        }
        if (yearSchedules.filter(s => s.status === 'Completed').length / yearSchedules.length > 0.7) {
            strengths.push({ title: 'High Itinerary Fulfillment', description: 'Strong velocity in completing scheduled audit sessions according to plan.', tag: 'Efficiency', category: 'Operations' });
        }
    }

    // Deriving Gaps
    if (counts.NC > 5) {
        gaps.push({ title: 'Systemic Non-Compliance', description: `High volume of critical gaps (${counts.NC}) identified across standard clauses.`, tag: 'Risk Alert', priority: 'High', category: 'Audit' });
    }
    const unassignedCount = yearSchedules.filter(s => !s.auditorId).length;
    if (unassignedCount > 0) {
        gaps.push({ title: 'Resource Allocation Gap', description: `${unassignedCount} itinerary sessions are currently unassigned to any auditor.`, tag: 'Provisioning', priority: 'Medium', category: 'Operations' });
    }
    const overtaxedAuditor = auditorData.find(a => a.count > 10);
    if (overtaxedAuditor) {
        gaps.push({ title: 'Auditor Capacity Warning', description: `Individual workloads are peaking (Lead: ${overtaxedAuditor.name} with ${overtaxedAuditor.count} sessions).`, tag: 'Burnout Risk', priority: 'Medium', category: 'Operations' });
    }

    const unitExemplars = Object.entries(unitResults)
        .filter(([_, data]) => data.score >= 90)
        .map(([id, data]) => ({
            name: unitMap.get(id) || 'Unknown Unit',
            score: data.score,
            nc: data.nc
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const hotspots = Object.entries(unitResults)
        .filter(([_, data]) => data.nc > 0)
        .map(([id, data]) => ({
            name: unitMap.get(id) || 'Unknown Unit',
            nc: data.nc
        }))
        .sort((a, b) => b.nc - a.nc);

    return { 
        totalFindings: yearFindings.length, 
        counts, 
        findingsData, 
        clauseData, 
        unitExemplars, 
        hotspots,
        auditorData,
        auditorSexCounts,
        strengths,
        gaps,
        leadAuditorName,
        totalSchedules: yearSchedules.length,
        completedSchedules: yearSchedules.filter(s => s.status === 'Completed').length
    };
  }, [plans, schedules, findings, units, users, campuses, selectedYear]);

  const handlePrintAssignments = () => {
    if (!analytics?.auditorData.length) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditorAssignmentsPrintTemplate 
                auditorData={analytics.auditorData as any[]}
                year={selectedYear}
                qaoDirector={signatories?.qaoDirector}
                leadAuditorName={analytics.leadAuditorName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                <head>
                    <title>Auditor Assignments - AY ${selectedYear}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { 
                            body { margin: 0; padding: 0; background: white; } 
                            .no-print { display: none !important; }
                            .print-page-break { page-break-after: always; }
                        }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Assignment Report</button>
                    </div>
                    <div id="print-content">
                        ${reportHtml}
                    </div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error(e);
        toast({ title: "Print Failed", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            <Skeleton className="h-[400px] col-span-full rounded-2xl" />
        </div>
    );
  }

  if (!analytics) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
            <BarChart3 className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-widest">Analytics Context Pending</h3>
            <p className="text-sm max-w-xs mt-2">Provision sessions and record findings for AY {selectedYear} to activate visual decision support.</p>
        </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. EXECUTIVE PERFORMANCE MONITOR */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Itinerary Density</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-primary tabular-nums">{analytics.totalSchedules}</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Total Scheduled Sessions</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><LayoutList className="h-12 w-12" /></div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Audit Completion</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.completedSchedules}</div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Finalized Evidence Logs</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><CheckCircle2 className="h-12 w-12 text-emerald-600" /></div>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Audit Engagement</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.auditorData.length}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Active Internal Auditors</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><Users className="h-12 w-12 text-blue-600" /></div>
        </Card>

        <Card className="bg-purple-50 border-purple-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-700">Auditor Sex Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-purple-600 tabular-nums">
                    {analytics.auditorSexCounts.Male}M / {analytics.auditorSexCounts.Female}F
                </div>
                <p className="text-[9px] font-bold text-purple-600/70 mt-1 uppercase">
                    {analytics.auditorSexCounts.Others > 0 ? `+ ${analytics.auditorSexCounts.Others} Others (LGBTQI++)` : 'GAD Compliant Pool'}
                </p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><HandHeart className="h-12 w-12 text-purple-600" /></div>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Critical Findings</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.counts.NC}</div>
                <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Open Non-Conformances</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><ShieldAlert className="h-12 w-12 text-rose-600" /></div>
        </Card>
      </div>

      {/* 2. STRATEGIC AUDIT SWOT */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border rounded-2xl shadow-lg bg-background overflow-hidden">
          <div className="flex flex-col">
              <div className="bg-emerald-50 px-6 py-3 border-b flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Audit Strengths</span>
              </div>
              <div className="p-6 space-y-4">
                  {analytics.strengths.length > 0 ? (
                      analytics.strengths.map((item, idx) => (
                          <div key={idx} className="space-y-1.5 group">
                              <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{item.title}</span>
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{item.description}"</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-[10px] text-muted-foreground italic opacity-50 py-10 text-center">Calibrating institutional strengths...</p>
                  )}
              </div>
          </div>

          <div className="flex flex-col">
              <div className="bg-rose-50 px-6 py-3 border-b flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Identified Gaps & Vulnerabilities</span>
              </div>
              <div className="p-6 space-y-4">
                  {analytics.gaps.length > 0 ? (
                      analytics.gaps.map((item, idx) => (
                          <div key={idx} className="space-y-1.5 group">
                              <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      {item.priority === 'High' && <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Critical</Badge>}
                                      <Badge className="bg-rose-100 text-rose-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                                  </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{item.description}"</p>
                          </div>
                      ))
                  ) : (
                      <div className="py-10 flex flex-col items-center justify-center opacity-20">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                          <p className="text-[10px] font-black uppercase mt-2">No Strategic Gaps Detected</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* 3. AUDITOR TEAM DETAILED ASSIGNMENTS */}
      <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                  <div className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Auditor Detailed Assignment Registry</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Drill down into specific unit assignments and timelines per auditor for AY {selectedYear}.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Button onClick={handlePrintAssignments} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm">
                      <Printer className="h-4 w-4" />
                      Print Assignments
                  </Button>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                      {analytics.auditorData.map((auditor, aIdx) => (
                          <div key={aIdx} className="p-6 space-y-4 hover:bg-muted/10 transition-colors group">
                              <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-black text-primary">
                                          {auditor.name.charAt(0)}
                                      </div>
                                      <div>
                                          <h4 className="font-black text-slate-900 uppercase">{auditor.name}</h4>
                                          <div className="flex items-center gap-2 mt-0.5">
                                              <Badge variant="secondary" className="h-4 px-1.5 text-[8px] font-black uppercase border-none bg-primary/5 text-primary">
                                                  {auditor.count} SESSIONS
                                              </Badge>
                                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                                  {Math.round((auditor.completed / auditor.count) * 100)}% COMPLETE
                                              </span>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className="pl-12 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                  {auditor.assignments.map((asg, sIdx) => {
                                      const date = asg.date instanceof Timestamp ? asg.date.toDate() : new Date(asg.date);
                                      return (
                                          <div key={sIdx} className="p-3 rounded-xl border bg-white shadow-sm flex flex-col gap-2 group-hover:border-primary/20 transition-all">
                                              <div className="flex items-center justify-between gap-2 border-b pb-2">
                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                      <Building2 className="h-3 w-3 text-primary/60" />
                                                      <span className="text-[10px] font-black text-slate-800 uppercase truncate" title={asg.unitName}>{asg.unitName}</span>
                                                  </div>
                                                  <Badge className={cn(
                                                      "h-4 text-[7px] font-black uppercase border-none shrink-0",
                                                      asg.status === 'Completed' ? "bg-emerald-600" : "bg-amber-50"
                                                  )}>
                                                      {asg.status}
                                                  </Badge>
                                              </div>
                                              <div className="space-y-1">
                                                  <div className="flex items-center gap-1 text-[9px] font-bold text-muted-foreground uppercase">
                                                      <Clock className="h-3 w-3" />
                                                      {format(date, 'MMM dd')} &bull; {format(date, 'hh:mm a')}
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 italic line-clamp-2 leading-relaxed">
                                                      {asg.procedure}
                                                  </p>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-6">
              <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                      <strong>Deployment Oversight:</strong> This registry provides institutional visibility into auditor workloads. Ensure that no single auditor is over-leveraged to maintain the depth and integrity of evidence logs.
                  </p>
              </div>
          </CardFooter>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. FINDINGS DISTRIBUTION CHART */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Standard Verification Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of audit findings across the university for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center">
                <ChartContainer config={{}} className="h-[280px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie 
                                data={analytics.findingsData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={90} 
                                paddingAngle={5} 
                                dataKey="value"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {analytics.findingsData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/5 border-t">
                <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                        <strong>Strategic Guideline:</strong> A higher "Compliance" percentage indicates institutional stability. OFIs and NCs provide the "Pulse" for the Continual Improvement cycle mandated by ISO 21001 Clause 10.2.
                    </p>
                </div>
            </div>
        </Card>

        {/* 5. CLAUSE COVERAGE CHART */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Clause Audit Density</CardTitle>
                </div>
                <CardDescription className="text-xs">Top 10 standard requirements prioritized in recent Evidence Logs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{}} className="h-[280px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.clauseData} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="id" type="category" tick={{ fontSize: 10, fontWeight: 900 }} width={40} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14}>
                                <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/5 border-t">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic font-medium">
                        <strong>Auditor Focus:</strong> This chart highlights which ISO clauses are receiving the most scrutiny. High density in specific clauses (e.g., 7.5 or 8.5) signifies institutional focus on those operational pillars.
                    </p>
                </div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. AUDIT STRENGTHS (TOP PERFORMERS) */}
        <Card className="shadow-md border-emerald-100 bg-emerald-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-emerald-50 border-b py-4">
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-emerald-800">Unit Quality Exemplars</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold text-emerald-700/70 uppercase">Units demonstrating 90%+ compliance in recent Evidence Logs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="space-y-3">
                    {analytics.unitExemplars.length > 0 ? (
                        analytics.unitExemplars.map((unit, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-100 shadow-sm transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">{idx + 1}</div>
                                    <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[180px]">{unit.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="h-5 border-emerald-200 text-emerald-700 font-black text-[10px]">{unit.score}% COMPLIANCE</Badge>
                                    {unit.nc === 0 && <Badge className="bg-emerald-600 text-white border-none h-5 text-[8px] font-black uppercase">ZERO NC</Badge>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center opacity-30 italic text-xs">Awaiting verified high-performance records.</div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* 7. AUDIT HOTSPOTS (UNITS WITH NCS) */}
        <Card className="shadow-md border-rose-100 bg-rose-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-rose-50 border-b py-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-rose-800">Unit Finding Hotspots</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold text-rose-700/70 uppercase">Priority areas identified with outstanding Non-Conformances.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="space-y-3">
                    {analytics.hotspots.length > 0 ? (
                        analytics.hotspots.map((unit, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border-rose-100 shadow-sm transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                                    <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[180px]">{unit.name}</span>
                                </div>
                                <Badge variant="destructive" className="h-5 font-black text-[10px] uppercase shadow-none">{unit.nc} OPEN NCs</Badge>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 flex flex-col items-center justify-center gap-2 opacity-30">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            <p className="text-[10px] font-black uppercase mt-2">Zero Open Non-Conformances</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight text-primary">Strategic Strength Reporting Guide</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 border-b pb-1">Utilization in Management Review</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Strengths identified here should be presented during <strong>Management Reviews (MR)</strong> to identify best practices. Programs listed as "Elite" or "Compliant" can serve as peer-mentors for other units within the university.
                    </p>
                </div>
                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-800 border-b pb-1">External Audit Preparation</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        During <strong>External Quality Audits (EQA)</strong> or <strong>AACCUP Surveys</strong>, these metrics serve as objective evidence of the university's commitment to Clause 10.3 (Opportunities for Improvement) of the ISO 21001 standard.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
