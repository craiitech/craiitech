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
    LayoutGrid,
    Briefcase,
    CalendarCheck,
    Scale,
    HandHeart,
    Printer,
    Clock,
    ChevronRight,
    Building2,
    LayoutList as LayoutListIcon,
    PieChart as PieIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditorAssignmentsPrintTemplate } from './auditor-assignments-print-template';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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

    const leadAuditorName = yearPlans.length > 0 ? yearPlans[0].leadAuditorName : undefined;

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

    const clauseStats: Record<string, number> = {};
    yearFindings.forEach(f => {
        clauseStats[f.isoClause] = (clauseStats[f.isoClause] || 0) + 1;
    });
    const clauseData = Object.entries(clauseStats)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    /**
     * NEW: FINDINGS BY PROCESS CATEGORY
     * Measures which part of the organization (Management, Operations, Support) has the most gaps.
     */
    const findingsByCategory: Record<string, { name: string, NC: number, OFI: number, Compliance: number }> = {
        'Management Processes': { name: 'Management', NC: 0, OFI: 0, Compliance: 0 },
        'Operation Processes': { name: 'Operations', NC: 0, OFI: 0, Compliance: 0 },
        'Support Processes': { name: 'Support', NC: 0, OFI: 0, Compliance: 0 }
    };

    yearFindings.forEach(f => {
        const schedule = yearSchedules.find(s => s.id === f.auditScheduleId);
        const cat = schedule?.processCategory || 'Operation Processes';
        if (findingsByCategory[cat]) {
            if (f.type === 'Non-Conformance') findingsByCategory[cat].NC++;
            else if (f.type === 'Observation for Improvement') findingsByCategory[cat].OFI++;
            else findingsByCategory[cat].Compliance++;
        }
    });

    const categoryFindingsData = Object.values(findingsByCategory);

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

    const auditorSexCounts = { Male: 0, Female: 0, Others: 0 };
    uniqueAuditorIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user?.sex === 'Male') auditorSexCounts.Male++;
        else if (user?.sex === 'Female') auditorSexCounts.Female++;
        else if (user?.sex === 'Others (LGBTQI++)') auditorSexCounts.Others++;
    });

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

    if (yearSchedules.length > 0) {
        const avgUnitScore = Object.values(unitResults).reduce((acc, curr) => acc + curr.score, 0) / (Object.keys(unitResults).length || 1);
        if (avgUnitScore >= 80) {
            strengths.push({ title: 'Positive Standard Conformity', description: `Institutional compliance mean reached ${Math.round(avgUnitScore)}% across ${Object.keys(unitResults).length} monitored units.`, tag: 'ISO 10.2', category: 'Audit' });
        }
    }

    if (counts.NC > 5) {
        gaps.push({ title: 'Systemic Non-Compliance', description: `High volume of critical gaps (${counts.NC}) identified across standard clauses.`, tag: 'Risk Alert', priority: 'High', category: 'Audit' });
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
        categoryFindingsData,
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
                    <style>@media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } }</style>
                </head>
                <body>${reportHtml}</body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            <Skeleton className="h-[400px] col-span-full rounded-2xl" />
        </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm flex flex-col min-h-[110px]">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Itinerary Density</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-primary tabular-nums">{analytics.totalSchedules}</div><p className="text-[9px] font-bold text-muted-foreground uppercase">Scheduled Sessions</p></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm flex flex-col min-h-[110px]">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-emerald-700">Audit Completion</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.completedSchedules}</div><p className="text-[9px] font-bold text-emerald-600/70 uppercase">Finalized Logs</p></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm flex flex-col min-h-[110px]">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-blue-700">Audit Engagement</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.auditorData.length}</div><p className="text-[9px] font-bold text-blue-600/70 uppercase">Active Auditors</p></CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100 shadow-sm flex flex-col min-h-[110px]">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-purple-700">Auditor Sex Balance</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-purple-600 tabular-nums">{analytics.auditorSexCounts.Male}M / {analytics.auditorSexCounts.Female}F</div><p className="text-[9px] font-bold text-purple-600/70 uppercase">Team Pool</p></CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm flex flex-col min-h-[110px]">
            <CardHeader className="pb-2 pt-5 px-6"><CardTitle className="text-[10px] font-black uppercase text-rose-700">Critical Gaps</CardTitle></CardHeader>
            <CardContent className="px-6 pb-5"><div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.counts.NC}</div><p className="text-[9px] font-bold text-rose-600/70 uppercase">Open NC Findings</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* NEW: PROCESS CATEGORY DISTRIBUTION */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Process Maturity Findings Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of NCs and OFIs across Management, Operations, and Support.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{
                    NC: { label: 'Non-Conformance', color: COLORS.NC },
                    OFI: { label: 'Opportunity for Improvement', color: COLORS.OFI },
                    Compliance: { label: 'Compliance', color: COLORS.Compliance }
                }} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.categoryFindingsData} margin={{ right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'black' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                            <Bar dataKey="NC" stackId="a" fill={COLORS.NC} />
                            <Bar dataKey="OFI" stackId="a" fill={COLORS.OFI} />
                            <Bar dataKey="Compliance" stackId="a" fill={COLORS.Compliance} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                        <strong>Strategic Guide:</strong> Helps identify systemic weaknesses. High NC volume in "Management Processes" indicates top-level policy gaps, while "Operations" gaps impact direct service delivery.
                    </p>
                </div>
            </CardFooter>
        </Card>

        {/* CLAUSE COVERAGE CHART */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2"><Search className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Clause Audit Density</CardTitle></div>
                <CardDescription className="text-xs">Top 10 standard requirements prioritized in recent Evidence Logs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.clauseData} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <XAxis type="number" hide /><YAxis dataKey="id" type="category" tick={{ fontSize: 10, fontWeight: 900 }} width={40} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14}><LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                    <strong>Insight:</strong> Highlights the ISO clauses receiving the most auditor attention.
                </p>
            </CardFooter>
        </Card>
      </div>

      {/* ROR/Assignments/SWOT remains the same (as per "DO NOT REMOVE" instruction) */}
      <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                  <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Auditor Detailed Assignment Registry</CardTitle></div>
                  <CardDescription className="text-xs">Timeline per auditor for AY {selectedYear}.</CardDescription>
              </div>
              <Button onClick={handlePrintAssignments} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2">
                  <Printer className="h-4 w-4" /> Print Assignments
              </Button>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                  <div className="divide-y">
                      {analytics.auditorData.map((auditor, aIdx) => (
                          <div key={aIdx} className="p-6 hover:bg-muted/10 transition-colors">
                              <h4 className="font-black text-slate-900 uppercase tracking-tight">{auditor.name} ({auditor.count} Assignments)</h4>
                              <div className="pl-4 mt-2 text-[10px] text-muted-foreground">{auditor.assignments.map(a => a.unitName).join(', ')}</div>
                          </div>
                      ))}
                  </div>
              </ScrollArea>
          </CardContent>
      </Card>
    </div>
  );
}
