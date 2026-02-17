
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
    CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CAR_STATUS_COLORS: Record<string, string> = {
  Open: 'hsl(var(--destructive))',
  'In Progress': 'hsl(var(--chart-1))',
  Closed: 'hsl(var(--chart-2))',
};

const FINDING_COLORS: Record<string, string> = {
  NC: 'hsl(var(--destructive))',
  OFI: 'hsl(var(--chart-3))',
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

    // 4. MR Output Status
    const outputStatusCounts: Record<string, number> = { Open: 0, 'On-going': 0, Closed: 0 };
    mrOutputs.forEach(o => {
      if (outputStatusCounts[o.status] !== undefined) {
        outputStatusCounts[o.status]++;
      }
    });
    const outputData = Object.entries(outputStatusCounts).map(([name, value]) => ({ name, value }));

    return {
      totalCars: cars.length,
      openCars: carStatusCounts.Open,
      closedCars: carStatusCounts.Closed,
      totalAudits: auditReports.length,
      totalMrSessions: mrs.length,
      mrActionRate: mrOutputs.length > 0 ? Math.round((outputStatusCounts.Closed / mrOutputs.length) * 100) : 0,
      carStatusData,
      findingData,
      sourceData,
      outputData
    };
  }, [cars, mrOutputs, mrs, auditReports]);

  // Determine if there is ANY data across all modules
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active CARs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.openCars}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Requiring Institutional Action</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-green-700">Audit Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600 tabular-nums">
                {analytics.totalCars > 0 ? Math.round((analytics.closedCars / analytics.totalCars) * 100) : 0}%
            </div>
            <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase tracking-tighter">CAR Closure Effectiveness Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><FileText className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Audit Density</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.totalAudits}</div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Total Formal IQA/EQA Reports</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><CalendarCheck className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">MR Execution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.totalMrSessions}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Management Review Cycles</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CAR Lifecycle Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">CAR Lifecycle Status</CardTitle>
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

        {/* Sources of CARs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Origin of Compliance Issues</CardTitle>
            </div>
            <CardDescription className="text-xs font-medium">Identifying primary channels generating corrective requests.</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.totalCars > 0 ? (
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.sourceData} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="name" 
                                type="category" 
                                tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                                width={160}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={16} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            ) : (
                <div className="h-[100px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                    <p className="text-xs font-bold uppercase tracking-widest">Awaiting source identification data</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
