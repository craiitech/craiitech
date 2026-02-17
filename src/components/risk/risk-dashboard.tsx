
'use client';

import { useMemo } from 'react';
import type { Risk } from '@/lib/types';
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
    ScatterChart,
    Scatter,
    ZAxis,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { ShieldAlert, TrendingUp, CheckCircle2, AlertTriangle, ShieldCheck, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskDashboardProps {
  risks: Risk[];
  isLoading: boolean;
  selectedYear: number;
}

const RATING_COLORS: Record<string, string> = {
  High: 'hsl(var(--destructive))',
  Medium: 'hsl(var(--chart-3))',
  Low: 'hsl(var(--chart-2))',
};

const STATUS_COLORS: Record<string, string> = {
  Open: 'hsl(var(--destructive))',
  'In Progress': 'hsl(var(--chart-1))',
  Closed: 'hsl(var(--chart-2))',
};

export function RiskDashboard({ risks, isLoading, selectedYear }: RiskDashboardProps) {
  
  const analytics = useMemo(() => {
    if (!risks) return null;

    const total = risks.length;
    const openCount = risks.filter(r => r.status === 'Open').length;
    const highRiskCount = risks.filter(r => r.preTreatment.rating === 'High' && r.status !== 'Closed').length;
    const opportunityCount = risks.filter(r => r.type === 'Opportunity').length;

    // 1. Priority Distribution
    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    risks.forEach(r => {
        priorityCounts[r.preTreatment.rating as keyof typeof priorityCounts]++;
    });
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

    // 2. Status Distribution
    const statusCounts: Record<string, number> = { Open: 0, 'In Progress': 0, Closed: 0 };
    risks.forEach(r => {
        statusCounts[r.status]++;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // 3. Risk Heatmap (Scatter)
    const heatmapData = risks.map(r => ({
        x: r.preTreatment.consequence,
        y: r.preTreatment.likelihood,
        z: r.preTreatment.magnitude,
        name: r.description,
        rating: r.preTreatment.rating,
        fill: RATING_COLORS[r.preTreatment.rating]
    }));

    return { total, openCount, highRiskCount, opportunityCount, priorityData, statusData, heatmapData };
  }, [risks]);

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
      <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <CardTitle>No Risk Data for {selectedYear}</CardTitle>
        <CardDescription>Log risks or opportunities to generate visual insights for this period.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{analytics.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Logged risks and opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-700">Open Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">{analytics.openCount}</div>
            <p className="text-[10px] text-red-600/70 mt-1">Requiring identification or action</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">High-Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{analytics.highRiskCount}</div>
            <p className="text-[10px] text-amber-600/70 mt-1">Active High-rated risk factors</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-700">Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{analytics.opportunityCount}</div>
            <p className="text-[10px] text-green-600/70 mt-1">Positive factors being enhanced</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Matrix Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle>Maturity Heatmap</CardTitle>
            </div>
            <CardDescription>Visualizing Likelihood vs. Consequence for active entries.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Consequence" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} />
                        <YAxis type="number" dataKey="y" name="Likelihood" unit="" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} />
                        <ZAxis type="number" dataKey="z" range={[100, 800]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                        <Scatter name="Risks" data={analytics.heatmapData} />
                    </ScatterChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-tighter mt-2">
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-red-500" /> High Risk</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> Medium Risk</div>
                <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> Low Risk</div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Register Status Profile</CardTitle>
            </div>
            <CardDescription>Breakdown of entries across the mitigation lifecycle.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={analytics.statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {analytics.statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cbd5e1'} />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-primary" />
              <CardTitle>Risk Rating Distribution</CardTitle>
            </div>
            <CardDescription>Volume of entries by calculated Magnitude (L x C).</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.priorityData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                            {analytics.priorityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={RATING_COLORS[entry.name]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
