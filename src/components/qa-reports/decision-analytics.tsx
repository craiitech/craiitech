'use client';

import { useMemo } from 'react';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    ListTodo, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle, 
    Clock, 
    Building2, 
    ShieldCheck, 
    Activity,
    Target,
    Info,
    Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

interface DecisionAnalyticsProps {
  outputs: ManagementReviewOutput[];
  reviews: ManagementReview[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Open': 'hsl(var(--destructive))',
  'On-going': 'hsl(48 96% 53%)', // Yellow
  'Submit for Closure Verification': 'hsl(var(--chart-1))',
  'Closed': 'hsl(142 71% 45%)',   // Green
};

export function DecisionAnalytics({ outputs, reviews, campuses, units, isLoading, selectedYear }: DecisionAnalyticsProps) {
  
  const analytics = useMemo(() => {
    if (!outputs || !reviews) return null;

    const campusMap = new Map(campuses.map(c => [c.id, c.name]));
    campusMap.set('university-wide', 'Institutional');

    const mrYearMap = new Map<string, string>();
    reviews.forEach(r => {
        const date = r.startDate instanceof Timestamp ? r.startDate.toDate() : new Date(r.startDate);
        mrYearMap.set(r.id, date.getFullYear().toString());
    });

    const total = outputs.length;
    const closed = outputs.filter(o => o.status === 'Closed').length;
    const pending = outputs.filter(o => o.status === 'Submit for Closure Verification').length;
    const ongoing = outputs.filter(o => o.status === 'On-going').length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    const yearlyStats: Record<string, any> = {};
    outputs.forEach(o => {
        const year = mrYearMap.get(o.mrId) || 'TBA';
        if (!yearlyStats[year]) {
            yearlyStats[year] = { year, Open: 0, 'On-going': 0, 'Pending Verification': 0, Closed: 0 };
        }
        if (o.status === 'Open') yearlyStats[year].Open++;
        else if (o.status === 'On-going') yearlyStats[year]['On-going']++;
        else if (o.status === 'Submit for Closure Verification') yearlyStats[year]['Pending Verification']++;
        else if (o.status === 'Closed') yearlyStats[year].Closed++;
    });
    const trendData = Object.values(yearlyStats).sort((a, b) => a.year.localeCompare(b.year));

    const campusStats: Record<string, number> = {};
    outputs.forEach(o => {
        const uniqueCampuses = new Set(o.assignments?.map(a => a.campusId) || []);
        uniqueCampuses.forEach(cid => {
            const name = campusMap.get(cid) || 'Other';
            campusStats[name] = (campusStats[name] || 0) + 1;
        });
    });
    const campusData = Object.entries(campusStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    const initiatorCounts: Record<string, number> = {};
    outputs.forEach(o => {
        initiatorCounts[o.initiator] = (initiatorCounts[o.initiator] || 0) + 1;
    });
    const initiatorData = Object.entries(initiatorCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return { total, closed, pending, ongoing, resolutionRate, trendData, campusData, initiatorData };
  }, [outputs, reviews, campuses, units]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
            <Skeleton className="h-[400px] col-span-full" />
        </div>
    );
  }

  if (!analytics || analytics.total === 0) {
    return (
      <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <CardTitle>Decision Hub: Data Pending</CardTitle>
        <CardDescription className="max-w-xs mx-auto mt-2">
            No actionable decisions have been logged for {selectedYear === 'all' ? 'any session' : `year ${selectedYear}`}.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Decision Volume {selectedYear !== 'all' ? `(${selectedYear})` : '(All Time)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Tasks identified in MR</p>
          </CardContent>
          <div className="p-2 bg-muted/10 border-t mt-auto">
            <p className="text-[8px] text-muted-foreground italic leading-tight">
                <strong>Guide:</strong> Measures the institutional output of management review sessions in terms of tangible tasks.
            </p>
          </div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Index</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.resolutionRate}%</div>
            <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tighter">
                {analytics.closed} of {analytics.total} decisions closed
            </p>
          </CardContent>
          <div className="p-2 bg-emerald-100/20 border-t mt-auto">
            <p className="text-[8px] text-emerald-800/60 italic leading-tight">
                <strong>Guide:</strong> Reflects the university's ability to successfully execute and verify management decisions.
            </p>
          </div>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Verification Hub</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.pending}</div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter flex items-center justify-between">
                <span>Awaiting Admin validation</span>
            </p>
          </CardContent>
          <div className="p-2 bg-blue-100/20 border-t mt-auto">
            <p className="text-[8px] text-blue-800/60 italic leading-tight">
                <strong>Guide:</strong> Total decisions submitted by units that are currently undergoing institutional review.
            </p>
          </div>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Implementation</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.ongoing}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Active units taking action</p>
          </CardContent>
          <div className="p-2 bg-amber-100/20 border-t mt-auto">
            <p className="text-[8px] text-amber-800/60 italic leading-tight">
                <strong>Guide:</strong> Real-time count of decisions currently in the "On-going" phase of execution.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Trend Chart */}
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Implementation Velocity</CardTitle>
            </div>
            <CardDescription className="text-xs">Decision maturity comparison across review sessions by year.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <ChartContainer config={{
                'Open': { label: 'Open', color: 'hsl(var(--destructive))' },
                'On-going': { label: 'On-going', color: 'hsl(48 96% 53%)' },
                'Pending Verification': { label: 'Pending Verification', color: 'hsl(var(--chart-1))' },
                'Closed': { label: 'Closed', color: 'hsl(142 71% 45%)' }
            }} className="h-[350px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                        <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" barSize={40}>
                            <LabelList dataKey="Open" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                        </Bar>
                        <Bar dataKey="On-going" stackId="a" fill="hsl(48 96% 53%)" barSize={40}>
                            <LabelList dataKey="On-going" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--amber-950))' }} />
                        </Bar>
                        <Bar dataKey="Pending Verification" stackId="a" fill="hsl(var(--chart-1))" barSize={40}>
                            <LabelList dataKey="Pending Verification" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                        </Bar>
                        <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} barSize={40}>
                            <LabelList dataKey="Closed" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <div className="p-4 bg-muted/5 border-t">
            <div className="flex items-start gap-3">
                <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Guidance for use:</strong> This trend chart benchmarks the speed of decision closure. A healthy system shows decreasing segments of "Open" items as they move through the lifecycle into the verified "Closed" status.
                </p>
            </div>
          </div>
        </Card>

        {/* Accountability Matrix Chart */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Accountability Distribution</CardTitle>
            </div>
            <CardDescription className="text-xs">Total assigned decisions currently being implemented per site.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.campusData} layout="vertical" margin={{ left: 20, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                            width={140}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12}>
                            <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
          <div className="p-4 bg-muted/5 border-t">
            <div className="flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Guidance for use:</strong> Highlights which campuses are most impacted by Management Review decisions. Use this to identify sites that may require additional administrative support or follow-up oversight.
                </p>
            </div>
          </div>
        </Card>

        {/* Initiator Analysis */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Decision Initiation Volume</CardTitle>
            </div>
            <CardDescription className="text-xs">Offices or roles generating the most actionable improvements.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <div className="space-y-4 pt-2">
                {analytics.initiatorData.map((item, idx) => (
                    <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 truncate max-w-[200px]">{item.name}</span>
                            <span className="font-black text-primary tabular-nums">{item.value} Actions</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary transition-all duration-1000"
                                style={{ width: `${(item.value / analytics.total) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
          </CardContent>
          <div className="p-4 bg-muted/5 border-t">
            <div className="flex items-start gap-3">
                <Activity className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                    <strong>Guidance for use:</strong> Recognizes proactive leadership in identified improvement areas. Units appearing consistently as initiators demonstrate high engagement with the ISO Quality Management System.
                </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
