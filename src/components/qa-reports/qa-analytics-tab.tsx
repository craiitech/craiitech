'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { CorrectiveActionRequest, ManagementReview, ManagementReviewOutput, QaAuditReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
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
    ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

const CAR_STATUS_COLORS: Record<string, string> = {
  Open: 'hsl(var(--destructive))',
  'In Progress': 'hsl(var(--chart-1))',
  Closed: 'hsl(var(--chart-2))',
};

const FINDING_COLORS: Record<string, string> = {
  NC: 'hsl(var(--destructive))',
  OFI: 'hsl(var(--chart-3))',
};

const DECISION_STATUS_COLORS: Record<string, string> = {
  Open: 'hsl(var(--destructive))',
  'On-going': 'hsl(48 96% 53%)', // Yellow
  Closed: 'hsl(142 71% 45%)',   // Green
};

export function QaAnalyticsTab() {
  const firestore = useFirestore();

  const carQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'correctiveActionRequests') : null), [firestore]);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const mrQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: mrs } = useCollection<ManagementReview>(mrQuery);

  const mrOutputsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviewOutputs') : null), [firestore]);
  const { data: mrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const reportsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'qaAuditReports') : null), [firestore]);
  const { data: auditReports } = useCollection<QaAuditReport>(reportsQuery);

  const analytics = useMemo(() => {
    if (!cars || !mrOutputs || !mrs || !auditReports) return null;

    // 1. CAR Status Distribution
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

    // 2. Finding Nature (NC vs OFI)
    const findingCounts = { NC: 0, OFI: 0 };
    cars.forEach(car => {
      if (findingCounts[car.natureOfFinding] !== undefined) {
        findingCounts[car.natureOfFinding]++;
      }
    });
    const findingData = Object.entries(findingCounts).map(([name, value]) => ({ name, value }));

    // 3. CAR Sources
    const sourceCounts: Record<string, number> = {};
    cars.forEach(car => {
      sourceCounts[car.source] = (sourceCounts[car.source] || 0) + 1;
    });
    const sourceData = Object.entries(sourceCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

    // 4. MR Output Status & Year Mapping
    const mrYearMap = new Map<string, number>();
    mrs.forEach(mr => {
        const date = mr.startDate instanceof Timestamp ? mr.startDate.toDate() : new Date(mr.startDate);
        mrYearMap.set(mr.id, date.getFullYear());
    });

    const yearlyDecisionStats: Record<number, { year: number, Open: number, 'On-going': number, Closed: number }> = {};
    
    mrOutputs.forEach(output => {
        const year = mrYearMap.get(output.mrId) || new Date().getFullYear();
        if (!yearlyDecisionStats[year]) {
            yearlyDecisionStats[year] = { year, Open: 0, 'On-going': 0, Closed: 0 };
        }
        if (output.status === 'Open') yearlyDecisionStats[year].Open++;
        else if (output.status === 'On-going') yearlyDecisionStats[year]['On-going']++;
        else if (output.status === 'Closed') yearlyDecisionStats[year].Closed++;
    });

    const decisionTrendData = Object.values(yearlyDecisionStats).sort((a, b) => a.year - b.year);

    const closedOutputs = mrOutputs.filter(o => o.status === 'Closed').length;
    const mrResolutionRate = mrOutputs.length > 0 ? Math.round((closedOutputs / mrOutputs.length) * 100) : 0;

    return {
      totalCars: cars.length,
      openCars: carStatusCounts.Open,
      closedCars: carStatusCounts.Closed,
      totalAudits: auditReports.length,
      totalMrSessions: mrs.length,
      totalDecisions: mrOutputs.length,
      mrResolutionRate,
      carStatusData,
      findingData,
      sourceData,
      decisionTrendData
    };
  }, [cars, mrOutputs, mrs, auditReports]);

  const hasData = useMemo(() => {
    if (!analytics) return false;
    return analytics.totalCars > 0 || analytics.totalAudits > 0 || analytics.totalMrSessions > 0;
  }, [analytics]);

  if (isLoadingCars) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        <Skeleton className="h-[400px] col-span-full" />
      </div>
    );
  }

  if (!analytics || !hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-bold">Institutional Quality Dashboard</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Analytics will synchronize once reports, MR sessions, or CARs are registered in the system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active CARs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.openCars}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Institutional Action items</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">CAR Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums">
                {analytics.totalCars > 0 ? Math.round((analytics.closedCars / analytics.totalCars) * 100) : 0}%
            </div>
            <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tighter">Correction Effectiveness</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><FileText className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Audit Density</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.totalAudits}</div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Total Formal Reports</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><ListTodo className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">Decision Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-indigo-600 tabular-nums">{analytics.mrResolutionRate}%</div>
            <p className="text-[9px] font-bold text-indigo-600/70 mt-1 uppercase tracking-tighter">MR Action Closure Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><CalendarCheck className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">MR Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.totalMrSessions}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Review Sessions Logged</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MR Decision Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Decision Implementation Trends by Review Year</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium">Tracking the progression of Management Review outputs across academic cycles.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.totalDecisions > 0 ? (
                <ChartContainer config={{
                    Open: { label: 'Open', color: 'hsl(var(--destructive))' },
                    'On-going': { label: 'On-going', color: 'hsl(48 96% 53%)' },
                    Closed: { label: 'Closed', color: 'hsl(142 71% 45%)' }
                }} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.decisionTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                            <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="On-going" stackId="a" fill="hsl(48 96% 53%)" radius={[0, 0, 0, 0]} barSize={40} />
                            <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} barSize={40} />
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

        {/* CAR Lifecycle Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">CAR Lifecycle Profile</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium">Real-time resolution status of issued requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.totalCars > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={analytics.carStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {analytics.carStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={CAR_STATUS_COLORS[entry.statusId] || '#cbd5e1'} />
                                ))}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
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

        {/* Nature of Findings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Gaps vs. OFIs</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium">Non-Conformance volume compared to strategic improvements.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.totalCars > 0 ? (
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.findingData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
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
