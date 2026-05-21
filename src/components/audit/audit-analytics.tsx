
'use client';

import { useMemo, useState } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Unit, Campus, User, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '../ui/badge';
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
    Pie, 
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis 
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
    PieChart as PieIcon,
    CalendarDays,
    ArrowUpDown,
    FileSignature
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuditorAssignmentsPrintTemplate } from './auditor-assignments-print-template';
import { AuditorSchedulePrintTemplate } from './auditor-schedule-print-template';
import { UnitSchedulePrintTemplate } from './unit-schedule-print-template';
import { AuditReceivingPrintTemplate } from './audit-receiving-print-template';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

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
    NA: 'hsl(var(--muted-foreground))'
};

export function AuditAnalytics({ plans, schedules, findings, isoClauses, units, campuses, users, isLoading, selectedYear }: AuditAnalyticsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const campusMap = useMemo(() => {
    const map = new Map(campuses.map(c => [c.id, c.name]));
    map.set('university-wide', 'Institutional');
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => {
    return new Map(units.map(u => [u.id, u.name]));
  }, [units]);

  const analytics = useMemo(() => {
    if (!schedules.length) return null;

    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    const yearSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    const scheduleIds = new Set(yearSchedules.map(s => s.id));
    const yearFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    const leadAuditorName = yearPlans.length > 0 ? yearPlans[0].leadAuditorName : undefined;
    const activePlan = yearPlans.length > 0 ? yearPlans[0] : null;

    const counts = { Compliance: 0, OFI: 0, NC: 0, NA: 0 };
    yearFindings.forEach(f => {
        if (f.type === 'Compliance') counts.Compliance++;
        else if (f.type === 'Observation for Improvement') counts.OFI++;
        else if (f.type === 'Non-Conformance') counts.NC++;
        else if (f.type === 'Not Applicable') counts.NA++;
    });
    
    const findingsData = [
        { name: 'Compliance', value: counts.Compliance, fill: COLORS.Compliance },
        { name: 'OFI', value: counts.OFI, fill: COLORS.OFI },
        { name: 'Non-Conformance', value: counts.NC, fill: COLORS.NC },
        { name: 'Not Applicable', value: counts.NA, fill: COLORS.NA },
    ].filter(d => d.value > 0);

    const clauseStats: Record<string, number> = {};
    yearFindings.forEach(f => {
        if (f.type !== 'Not Applicable') {
            clauseStats[f.isoClause] = (clauseStats[f.isoClause] || 0) + 1;
        }
    });
    const clauseData = Object.entries(clauseStats)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const findingsByCategory: Record<string, { name: string, NC: number, OFI: number, Compliance: number }> = {
        'Management Processes': { name: 'Management', NC: 0, OFI: 0, Compliance: 0 },
        'Operation Processes': { name: 'Operations', NC: 0, OFI: 0, Compliance: 0 },
        'Support Processes': { name: 'Support', NC: 0, OFI: 0, Compliance: 0 }
    };

    yearFindings.forEach(f => {
        if (f.type === 'Not Applicable') return; // Skip N/A in maturity bars
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

    const unitResults: Record<string, { total: number, nc: number, score: number }> = {};
    
    yearSchedules.forEach(s => {
        const unitFindings = yearFindings.filter(f => f.auditScheduleId === s.id && f.type !== 'Not Applicable');
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
        leadAuditorName,
        activePlan,
        totalSchedules: yearSchedules.length,
        completedSchedules: yearSchedules.filter(s => s.status === 'Completed').length,
        yearSchedules
    };
  }, [plans, schedules, findings, units, users, campuses, selectedYear, campusMap, unitMap]);

  const handlePrintAssignments = () => {
    if (!analytics?.auditorData.length) {
        toast({ title: "No Assignments", description: "There are no active auditor assignments for the selected year.", variant: "destructive" });
        return;
    }
    try {
        const reportHtml = renderToStaticMarkup(
            <AuditorAssignmentsPrintTemplate 
                auditorData={analytics.auditorData as any[]}
                year={selectedYear}
                qaoDirector={signatories?.qaoDirector}
                leadAuditorName={analytics.leadAuditorName}
            />
        );
        triggerPrint(reportHtml, `Auditor_Assignments_AY${selectedYear}`);
    } catch (e) { console.error(e); }
  };

  const handlePrintReceivingForm = () => {
    if (!analytics?.auditorData.length) {
        toast({ title: "No Assignments", description: "There are no active auditors found for this year.", variant: "destructive" });
        return;
    }
    try {
        const auditorsList = analytics.auditorData.map(a => ({
            name: a.name,
            campuses: Array.from(new Set(a.assignments.map(asgn => asgn.campus)))
        }));

        const reportHtml = renderToStaticMarkup(
            <AuditReceivingPrintTemplate 
                auditors={auditorsList}
                year={selectedYear}
            />
        );
        triggerPrint(reportHtml, `Audit_Checklist_Receiving_Form_AY${selectedYear}`);
    } catch (e) { console.error(e); }
  };

  const handlePrintAuditorSchedule = () => {
    if (!analytics?.yearSchedules.length) {
        toast({ title: "No Schedule", description: "There are no sessions scheduled for the selected year.", variant: "destructive" });
        return;
    }
    try {
        const reportHtml = renderToStaticMarkup(
            <AuditorSchedulePrintTemplate 
                plan={analytics.activePlan || undefined}
                schedules={analytics.yearSchedules}
                campusMap={campusMap}
                signatories={signatories || undefined}
            />
        );
        triggerPrint(reportHtml, `IQA_Auditor_Schedule_AY${selectedYear}`);
    } catch (e) { console.error(e); }
  };

  const handlePrintUnitSchedule = () => {
    if (!analytics?.yearSchedules.length) {
        toast({ title: "No Schedule", description: "There are no sessions scheduled for the selected year.", variant: "destructive" });
        return;
    }
    try {
        const reportHtml = renderToStaticMarkup(
            <UnitSchedulePrintTemplate 
                plan={analytics.activePlan || undefined}
                schedules={analytics.yearSchedules}
                campusMap={campusMap}
                signatories={signatories || undefined}
            />
        );
        triggerPrint(reportHtml, `IQA_Unit_Schedule_AY${selectedYear}`);
    } catch (e) { console.error(e); }
  };

  const triggerPrint = (html: string, title: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
            <html>
            <head>
                <title>${title}</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                    @page { 
                        size: 8.5in 13in !important; 
                        margin: 0.5in !important; 
                    }
                    @media print { 
                        body { margin: 0 !important; padding: 0 !important; background: white; -webkit-print-color-adjust: exact; } 
                        .no-print { display: none !important; } 
                        .print-page-break { page-break-after: always; }
                    }
                    body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; font-size: 12pt; }
                </style>
            </head>
            <body>
                <div class="no-print mb-8 flex justify-center">
                    <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Click to Print Report</button>
                </div>
                <div id="print-content" style="padding: 0.1in;">
                    ${html}
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
  };

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
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
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Finding Lifecycle</CardTitle>
              </div>
          </CardHeader>
          <CardContent className="pt-8 flex-1 flex flex-col items-center justify-center">
              <ChartContainer config={{}} className="h-[280px] w-full">
                  <ResponsiveContainer>
                      <PieChart>
                          <Pie data={analytics.findingsData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                              {analytics.findingsData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                          </Pie>
                          <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                          <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                      </PieChart>
                  </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Process Maturity Findings Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of gaps across Management, Operations, and Support.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{
                    NC: { label: 'Non-Conformance', color: COLORS.NC },
                    OFI: { label: 'OFI', color: COLORS.OFI },
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
        </Card>

        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Auditor Productivity & Completion Rate</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-8 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.auditorData.slice(0, 10)}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="completed" name="Completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={30}>
                                <LabelList dataKey="completed" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#1B6535' }} />
                            </Bar>
                            <Bar dataKey="count" name="Assigned" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <p className="text-[9px] text-muted-foreground italic text-center w-full">Tracking workload distribution and session finalization per auditor.</p>
            </CardFooter>
        </Card>

        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Top Finding Gaps by ISO Clause</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-8 flex-1">
            <ChartContainer config={{}} className="h-[350px] w-full">
              <ResponsiveContainer>
                <BarChart data={analytics.clauseData} layout="vertical" margin={{ left: 20, right: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="id" type="category" tick={{ fontSize: 10, fontWeight: 900 }} width={40} axisLine={false} tickLine={false} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} barSize={14}>
                        <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--destructive))' }} />
                    </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-lg border-primary/10 overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-destructive">Unit Finding Hotspots</CardTitle>
                </div>
                <CardDescription className="text-xs">Offices with open non-conformances requiring attention.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="pl-6 text-[10px] font-black uppercase">Unit / Office</TableHead>
                              <TableHead className="text-center text-[10px] font-black uppercase">Open NCs</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {analytics.hotspots.map((h, i) => (
                              <TableRow key={i}>
                                  <TableCell className="pl-6 font-bold text-xs uppercase">{h.name}</TableCell>
                                  <TableCell className="text-center"><Badge variant="destructive" className="h-5 font-black">{h.nc} NC</Badge></TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </CardContent>
          </Card>

          <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Auditor Assignment Registry</CardTitle></div>
                      <CardDescription className="text-xs">Timeline per auditor for AY {selectedYear}.</CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button onClick={handlePrintUnitSchedule} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm">
                        <Printer className="h-4 w-4" /> Unit Sched.
                    </Button>
                    <Button onClick={handlePrintAuditorSchedule} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-indigo-200 text-indigo-700 gap-2 shadow-sm">
                        <CalendarDays className="h-4 w-4" /> Auditor Sched.
                    </Button>
                    <Button onClick={handlePrintReceivingForm} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-emerald-50 border-emerald-200 text-emerald-700 gap-2 shadow-sm">
                        <FileSignature className="h-4 w-4" /> Receiving Form
                    </Button>
                    <Button onClick={handlePrintAssignments} size="sm" variant="outline" className="h-9 px-4 font-black uppercase text-[10px] tracking-widest bg-white border-primary/20 text-primary gap-2 shadow-sm">
                        <Printer className="h-4 w-4" /> Assignments
                    </Button>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                      <div className="divide-y">
                          {analytics.auditorData.map((auditor, aIdx) => (
                              <div key={aIdx} className="p-4 hover:bg-muted/10 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-tight">{auditor.name}</h4>
                                    <Badge variant="secondary" className="h-4 text-[8px] font-black">{auditor.count} ASSIGNMENTS</Badge>
                                  </div>
                                  <div className="pl-4 mt-2 text-[10px] text-muted-foreground italic truncate">{auditor.assignments.map(a => a.unitName).join(', ')}</div>
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>

      <div className="p-4 bg-muted/5 border rounded-xl">
        <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                <strong>Administrative Guide:</strong> This dashboard provides institutional oversight of the Internal Quality Audit framework. Use the "Print Assignments" registry to issue official notices to the audit team. Non-conformance hotspots should be prioritized for Corrective Action Request (CAR) issuance in the main QA module.
            </p>
        </div>
      </div>
    </div>
  );
}
