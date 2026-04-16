
'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { CorrectiveActionRequest, ManagementReview, ManagementReviewOutput, QaAuditReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip as RechartsTooltip, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid,
    Legend,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    ClipboardCheck, 
    AlertTriangle, 
    CheckCircle2, 
    TrendingUp, 
    ShieldAlert, 
    Activity,
    FileText,
    CalendarCheck,
    ListTodo,
    Info,
    Zap,
    Target,
    ShieldCheck,
    Gavel,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

const CAR_STATUS_COLORS: Record<string, string> = {
  Open: 'hsl(var(--destructive))',
  'In Progress': 'hsl(48 96% 53%)',
  Closed: 'hsl(142 71% 45%)',
};

const FINDING_COLORS: Record<string, string> = {
  NC: 'hsl(var(--destructive))',
  OFI: 'hsl(var(--chart-3))',
};

type InsightItem = {
    title: string;
    description: string;
    tag: string;
    priority?: 'High' | 'Medium' | 'Low';
};

export function QaAnalyticsTab() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();

  const isInstitutionalViewer = isAdmin || userRole === 'Auditor';

  const carQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'correctiveActionRequests');
    if (isInstitutionalViewer) return baseRef;
    
    if (userProfile.unitId) {
        return query(baseRef, 
            where('unitId', '==', userProfile.unitId),
            where('campusId', '==', userProfile.campusId)
        );
    }
    
    return query(baseRef, where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isInstitutionalViewer]);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const mrQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: mrs } = useCollection<ManagementReview>(mrQuery);

  const mrOutputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore, userProfile]);
  const { data: rawMrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'qaAuditReports');
    if (isInstitutionalViewer) return baseRef;
    return query(baseRef, where('campusIds', 'array-contains', userProfile.campusId));
  }, [firestore, userProfile, isInstitutionalViewer]);
  const { data: auditReports } = useCollection<QaAuditReport>(reportsQuery);

  const analytics = useMemo(() => {
    if (!cars || !rawMrOutputs || !mrs || !auditReports || !userProfile) return null;

    const outputs = isInstitutionalViewer 
        ? rawMrOutputs 
        : rawMrOutputs.filter(o => o.assignments?.some(a => a.unitId === userProfile.unitId || a.campusId === userProfile.campusId));

    const carStatusCounts: Record<string, number> = { Open: 0, 'In Progress': 0, Closed: 0 };
    cars.forEach(car => {
      if (carStatusCounts[car.status] !== undefined) {
        carStatusCounts[car.status]++;
      }
    });
    const carStatusData = Object.entries(carStatusCounts).map(([name, value]) => ({ 
        name: name, 
        value,
        statusId: name
    })).filter(d => d.value >= 0);

    const findingCounts = { NC: 0, OFI: 0 };
    cars.forEach(car => {
      if (findingCounts[car.natureOfFinding] !== undefined) {
        findingCounts[car.natureOfFinding]++;
      }
    });
    const findingData = Object.entries(findingCounts).map(([name, value]) => ({ name, value }));

    const mrYearMap = new Map<string, number>();
    mrs.forEach(mr => {
        const date = mr.startDate instanceof Timestamp ? mr.startDate.toDate() : new Date(mr.startDate);
        mrYearMap.set(mr.id, date.getFullYear());
    });

    const yearlyDecisionStats: Record<number, { year: number, Open: number, 'On-going': number, Closed: number }> = {};
    outputs.forEach(output => {
        const year = mrYearMap.get(output.mrId) || new Date().getFullYear();
        if (!yearlyDecisionStats[year]) {
            yearlyDecisionStats[year] = { year, Open: 0, 'On-going': 0, Closed: 0 };
        }
        if (output.status === 'Open') yearlyDecisionStats[year].Open++;
        else if (output.status === 'On-going') yearlyDecisionStats[year]['On-going']++;
        else if (output.status === 'Closed') yearlyDecisionStats[year].Closed++;
    });

    const decisionTrendData = Object.values(yearlyDecisionStats).sort((a, b) => a.year - b.year);

    const closedOutputs = outputs.filter(o => o.status === 'Closed').length;
    const mrResolutionRate = outputs.length > 0 ? Math.round((closedOutputs / outputs.length) * 100) : 0;

    const strengths: InsightItem[] = [];
    const gaps: InsightItem[] = [];

    if (auditReports.length > 0) {
        strengths.push({ 
            title: isInstitutionalViewer ? 'Audit Registry Maturity' : 'Site Transparency', 
            description: `Maintaining a vault of ${auditReports.length} verified ${isInstitutionalViewer ? 'institutional' : 'local'} audit records.`,
            tag: '[ISO 9.2]'
        });
    }

    const carClosureRate = cars.length > 0 ? (carStatusCounts.Closed / cars.length) : 1;
    if (carClosureRate >= 0.75 && cars.length > 0) {
        strengths.push({
            title: 'Corrective Velocity',
            description: 'Demonstrating high efficiency in resolving and closing identified non-conformities.',
            tag: '[ISO 10.2]'
        });
    }

    const verificationCount = cars.filter(c => c.needsVerification).length;
    if (verificationCount > 0) {
        gaps.push({
            title: 'Verification Queue Backlog',
            description: `There are ${verificationCount} unit responses awaiting official institutional verification.`,
            tag: '[Process Delay]',
            priority: 'Medium'
        });
    }

    if (mrResolutionRate > 70 && outputs.length > 0) {
        strengths.push({
            title: 'Strategic Decision Fulfillment',
            description: 'Successful implementation of the majority of actionable decisions from top management.',
            tag: '[ISO 9.3]'
        });
    }

    const openNCs = cars.filter(c => c.status !== 'Closed' && c.natureOfFinding === 'NC').length;
    if (openNCs > 0) {
        gaps.push({
            title: 'Outstanding Non-Conformances',
            description: `${openNCs} critical gaps in the standard remain unresolved and require priority action.`,
            tag: '[Correction Pending]',
            priority: 'High'
        });
    }

    return {
      totalCars: cars.length,
      openCars: carStatusCounts.Open,
      progressCars: carStatusCounts['In Progress'],
      closedCars: carStatusCounts.Closed,
      totalAudits: auditReports.length,
      totalMrSessions: mrs.length,
      totalDecisions: outputs.length,
      mrResolutionRate,
      carStatusData,
      findingData,
      decisionTrendData,
      strengths,
      gaps
    };
  }, [cars, rawMrOutputs, mrs, auditReports, userProfile, isInstitutionalViewer]);

  if (isLoadingCars) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        <Skeleton className="h-[400px] col-span-full" />
      </div>
    );
  }

  if (!analytics || (analytics.totalCars === 0 && analytics.totalAudits === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-bold">Institutional Quality Dashboard</h3>
        <p className="text-sm text-muted-foreground">Analytics will synchronize once reports, MR sessions, or CARs are registered in the system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border rounded-2xl shadow-lg bg-background overflow-hidden">
          <div className="flex flex-col">
              <div className="bg-emerald-50 px-6 py-3 border-b flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Institutional Strength Registry</span>
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
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Priority Areas for Improvement</span>
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
                          <p className="text-[10px] font-black uppercase mt-2">No Gaps Detected</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Issued CARs</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.totalCars}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Institutional Registry</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Open Gaps</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.openCars}</div>
            <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase tracking-tighter">Awaiting Initial Action</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.progressCars}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Unit Treatment Stage</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.totalCars > 0 ? Math.round((analytics.closedCars / analytics.totalCars) * 100) : 0}%</div>
            <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase tracking-tighter">Effectiveness Score</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">MR Resolution</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.mrResolutionRate}%</div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Decision Fulfillment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Implementation Trends by Review Year</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {analytics.totalDecisions > 0 ? (
                <ChartContainer config={{
                    Open: { label: 'Open', color: 'hsl(var(--destructive))' },
                    'On-going': { label: 'On-going', color: 'hsl(48 96% 53%)' },
                    Closed: { label: 'Closed', color: 'hsl(142 71% 45%)' }
                }} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.decisionTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                            <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" barSize={40}>
                                <LabelList dataKey="Open" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                            </Bar>
                            <Bar dataKey="On-going" stackId="a" fill="hsl(48 96% 53%)" barSize={40}>
                                <LabelList dataKey="On-going" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--amber-950))' }} />
                            </Bar>
                            <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} barSize={40}>
                                <LabelList dataKey="Closed" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <ListTodo className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No decision outputs logged yet</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">CAR Lifecycle Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {analytics.totalCars > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={analytics.carStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {analytics.carStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CAR_STATUS_COLORS[entry.statusId] || '#cbd5e1'} />
                                ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontStyle: 'bold', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <ShieldAlert className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No active CARs to visualize</p>
                </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Gaps vs. OFIs</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {analytics.totalCars > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.findingData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                                <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--foreground))' }} />
                                {analytics.findingData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={FINDING_COLORS[entry.name]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="h-[250px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <TrendingUp className="h-10 w-10 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-widest">No finding data available</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

