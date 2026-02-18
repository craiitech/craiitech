'use client';

import { useMemo } from 'react';
import type { ManagementReview, ManagementReviewOutput, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    Pie
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
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
    Target
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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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

    // 1. Overall Resolution Stats
    const total = outputs.length;
    const closed = outputs.filter(o => o.status === 'Closed').length;
    const pending = outputs.filter(o => o.status === 'Submit for Closure Verification').length;
    const ongoing = outputs.filter(o => o.status === 'On-going').length;
    const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    // 2. Lifecycle Trend (by Year)
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

    // 3. Accountability Breakdown (by Campus)
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

    // 4. Initiator Engagement
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
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Decision Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">Tasks identified in MR</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Resolution Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.resolutionRate}%</div>
            <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tighter">Closure effectiveness</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Verification Hub</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.pending}</div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Awaiting Admin validation</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Implementation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.ongoing}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">Active units taking action</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lifecycle Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Implementation Velocity</CardTitle>
            </div>
            <CardDescription className="text-xs">Decision maturity comparison across review sessions by year.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
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
                        <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" barSize={40} />
                        <Bar dataKey="On-going" stackId="a" fill="hsl(48 96% 53%)" barSize={40} />
                        <Bar dataKey="Pending Verification" stackId="a" fill="hsl(var(--chart-1))" barSize={40} />
                        <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Accountability Matrix Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Accountability Distribution</CardTitle>
            </div>
            <CardDescription className="text-xs">Total assigned decisions currently being implemented per site.</CardDescription>
          </CardHeader>
          <CardContent>
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
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Initiator Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Top Decision Initiators</CardTitle>
            </div>
            <CardDescription className="text-xs">Offices or roles generating the most actionable improvements.</CardDescription>
          </CardHeader>
          <CardContent>
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
        </Card>
      </div>
    </div>
  );
}