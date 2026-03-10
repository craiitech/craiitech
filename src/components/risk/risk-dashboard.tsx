'use client';

import { useMemo } from 'react';
import type { Risk } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    ScatterChart,
    Scatter,
    ZAxis,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    ShieldAlert, 
    TrendingUp, 
    CheckCircle2, 
    ShieldCheck, 
    Activity, 
    Target, 
    Zap,
    BarChart3,
    Info,
    ArrowDownToLine
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskDashboardProps {
  risks: Risk[];
  isLoading: boolean;
  selectedYear: number;
}

const RATING_COLORS: Record<string, string> = {
  High: 'hsl(var(--destructive))',
  Medium: 'hsl(48 96% 53%)', // Amber
  Low: 'hsl(142 71% 45%)',   // Emerald
};

export function RiskDashboard({ risks, isLoading, selectedYear }: RiskDashboardProps) {
  
  const analytics = useMemo(() => {
    if (!risks || risks.length === 0) return null;

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

    // 2. Strategic Objective Impact (Academic Context)
    const objectiveCounts: Record<string, { name: string, risks: number, opportunities: number }> = {};
    risks.forEach(r => {
        const key = r.objective || 'General Institutional Ops';
        if (!objectiveCounts[key]) objectiveCounts[key] = { name: key, risks: 0, opportunities: 0 };
        if (r.type === 'Risk') objectiveCounts[key].risks++;
        else objectiveCounts[key].opportunities++;
    });
    const objectiveData = Object.values(objectiveCounts)
        .sort((a, b) => (b.risks + b.opportunities) - (a.risks + a.opportunities))
        .slice(0, 6);

    // 3. Treatment Effectiveness (Pre vs Post Reduction)
    const effectivenessData = risks
        .filter(r => r.status === 'Closed' || r.postTreatment?.magnitude)
        .slice(0, 10)
        .map(r => ({
            name: r.description.length > 20 ? r.description.substring(0, 20) + '...' : r.description,
            'Initial Magnitude': r.preTreatment.magnitude,
            'Residual Magnitude': r.postTreatment?.magnitude || 0
        }));

    // 4. Maturity Heatmap (Scatter)
    const heatmapData = risks.map(r => {
        let fill = RATING_COLORS[r.preTreatment.rating];
        if (r.type === 'Opportunity') {
            if (r.preTreatment.rating === 'High') fill = 'hsl(142 71% 45%)';
            if (r.preTreatment.rating === 'Low') fill = 'hsl(var(--destructive))';
        }
        return {
            x: r.preTreatment.consequence,
            y: r.preTreatment.likelihood,
            z: r.preTreatment.magnitude,
            name: r.description,
            rating: r.preTreatment.rating,
            fill: fill,
            type: r.type
        };
    });

    return { total, openCount, highRiskCount, opportunityCount, priorityData, objectiveData, effectivenessData, heatmapData };
  }, [risks]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            <Skeleton className="h-[400px] col-span-full rounded-xl" />
        </div>
    );
  }

  if (!analytics || analytics.total === 0) {
    return (
      <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <CardTitle className="text-xl font-black uppercase tracking-widest opacity-40">NO DATA YET!</CardTitle>
        <CardDescription className="max-w-xs mx-auto">Populate the registry with risks or opportunities to activate the Strategic Decision Support Dashboard.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategic Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums">{analytics.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Logged identifying factors</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Open Critical Risks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.openCount}</div>
            <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Awaiting mitigation closure</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">High-Priority Gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.highRiskCount}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Mandatory Action Plan Items</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Growth Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.opportunityCount}</div>
            <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Factors for institutional enhancement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. OBJECTIVE ALIGNMENT HEATMAP */}
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Objective Vulnerability</CardTitle>
            </div>
            <CardDescription className="text-xs">Which academic or administrative goals are most at risk?</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{
                risks: { label: 'Risks Identified', color: 'hsl(var(--destructive))' },
                opportunities: { label: 'Opportunities Identified', color: 'hsl(var(--chart-2))' }
            }} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.objectiveData} layout="vertical" margin={{ left: 20, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                        <Bar dataKey="risks" stackId="a" fill="hsl(var(--destructive))" radius={[0, 0, 0, 0]} barSize={12} />
                        <Bar dataKey="opportunities" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100 flex gap-3">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed font-medium">
                    <strong>Explanation:</strong> This chart aggregates entries by <strong>Process Objective</strong>. Long bars indicate goals that are either highly volatile (many risks) or have significant potential for growth (many opportunities).
                </p>
            </div>
          </CardContent>
        </Card>

        {/* 2. MATURITY HEATMAP (SCATTER) */}
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Impact Heatmap</CardTitle>
            </div>
            <CardDescription className="text-xs">Likelihood vs. Consequence distribution for baseline prioritization.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Consequence" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} label={{ value: 'Consequence', position: 'bottom', offset: -10, fontSize: 9, fontWeight: 'bold' }} />
                        <YAxis type="number" dataKey="y" name="Likelihood" domain={[0, 6]} ticks={[1,2,3,4,5]} fontSize={10} label={{ value: 'Likelihood', angle: -90, position: 'left', offset: 10, fontSize: 9, fontWeight: 'bold' }} />
                        <ZAxis type="number" dataKey="z" range={[100, 800]} />
                        <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} content={<ChartTooltipContent />} />
                        <Scatter name="Registry Entries" data={analytics.heatmapData} />
                    </ScatterChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="flex flex-col gap-3 mt-4">
                <div className="flex justify-center gap-4 text-[9px] font-black uppercase tracking-tighter border-t pt-3">
                    <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-red-500" /> Critical/High</div>
                    <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-500" /> Medium</div>
                    <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-green-500" /> Low/Tolerable</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex gap-3">
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">
                        <strong>Strategic Guide:</strong> Entries in the top-right quadrant represent "Catastrophic & Likely" factors. These require immediate budgetary or administrative intervention to protect institutional integrity.
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. TREATMENT EFFECTIVENESS INDEX */}
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Mitigation Effectiveness (Magnitude Reduction)</CardTitle>
            </div>
            <CardDescription className="text-xs">Measuring the ROI of Quality Improvements by comparing Pre-treatment vs. Residual magnitudes.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.effectivenessData.length > 0 ? (
                <>
                <ChartContainer config={{
                    'Initial Magnitude': { label: 'Initial (Pre-Treatment)', color: 'hsl(var(--muted-foreground))' },
                    'Residual Magnitude': { label: 'Residual (Post-Treatment)', color: 'hsl(142 71% 45%)' }
                }} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.effectivenessData} margin={{ bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 9, fontWeight: 600 }} />
                            <YAxis axisLine={false} tickLine={false} domain={[0, 25]} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '20px' }} />
                            <Bar dataKey="Initial Magnitude" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} barSize={20} />
                            <Bar dataKey="Residual Magnitude" fill="hsl(142 71% 45%)" radius={[2, 2, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 shadow-inner">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase text-emerald-800 tracking-tight">Efficiency Target</p>
                            <p className="text-[10px] text-emerald-700 leading-relaxed font-medium">
                                Successful mitigation is represented by a large gap between the grey and green bars. A small gap indicates the treatment was less effective at reducing likelihood or consequence.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/30 shadow-inner">
                        <BarChart3 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase text-blue-800 tracking-tight">Institutional Value</p>
                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                Use this data for Management Review (MR) to demonstrate how your unit has systematically reduced high-impact threats through EOMS implementation.
                            </p>
                        </div>
                    </div>
                </div>
                </>
            ) : (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-40 italic">
                    <Activity className="h-8 w-8 mb-2" />
                    <p className="text-xl font-black uppercase tracking-widest">NO DATA YET!</p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}