'use client';

import { useMemo } from 'react';
import type { Risk } from '@/lib/types';
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
    ScatterChart,
    Scatter,
    ZAxis,
    Legend,
    LabelList
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
    ArrowDownToLine,
    ArrowUpToLine,
    ListChecks
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

    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    risks.forEach(r => {
        priorityCounts[r.preTreatment.rating as keyof typeof priorityCounts]++;
    });
    const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

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

    /**
     * NEW: REDUCTION CLOSURE ANALYTICS
     * Measures the delta between initial risk and remaining risk after treatment.
     */
    const closureEfficiencyData = risks
        .filter(r => r.status === 'Closed' && r.postTreatment)
        .slice(0, 10)
        .map(r => ({
            name: r.description.length > 20 ? r.description.substring(0, 20) + '...' : r.description,
            'Initial': r.preTreatment.magnitude,
            'Residual': r.postTreatment?.magnitude || 0
        }));

    /**
     * NEW: RISK VS OPPORTUNITY RATIO
     */
    const ratioData = [
        { name: 'Risks', value: risks.filter(r => r.type === 'Risk').length, fill: 'hsl(var(--destructive))' },
        { name: 'Opportunities', value: risks.filter(r => r.type === 'Opportunity').length, fill: 'hsl(142 71% 45%)' }
    ];

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

    return { total, openCount, highRiskCount, opportunityCount, priorityData, objectiveData, closureEfficiencyData, heatmapData, ratioData };
  }, [risks]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
            <Skeleton className="h-[400px] col-span-full rounded-xl" />
        </div>
    );
  }

  if (!analytics || analytics.total === 0) return null;

  return (
    <div className="space-y-6">
      {/* 1. KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategic Entries</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary tabular-nums">{analytics.total}</div><p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Logged factors</p></CardContent></Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Open Critical Risks</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.openCount}</div><p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Closure Pending</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">High-Priority Gaps</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.highRiskCount}</div><p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Mandatory Plans</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Growth Gain Ratio</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.opportunityCount}</div><p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Strategic Opps</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Objective Vulnerability</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1"><ChartContainer config={{ risks: { label: 'Risks', color: 'hsl(var(--destructive))' }, opportunities: { label: 'Opportunities', color: 'hsl(var(--chart-2))' } }} className="h-[300px] w-full"><ResponsiveContainer><BarChart data={analytics.objectiveData} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} /><RechartsTooltip content={<ChartTooltipContent />} /><Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} /><Bar dataKey="risks" stackId="a" fill="hsl(var(--destructive))" /><Bar dataKey="opportunities" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></ChartContainer></CardContent>
        </Card>

        {/* NEW: RISK VS OPPORTUNITY PROFILE */}
        <Card className="shadow-md border-primary/10 flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Balance Profile</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Ratio of perceived threats vs. growth opportunities for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 flex-1 flex flex-col items-center justify-center">
                <ChartContainer config={{}} className="h-[250px] w-[250px]">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie data={analytics.ratioData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label>
                                {analytics.ratioData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      {/* NEW: TREATMENT CLOSURE PERFORMANCE */}
      <Card className="shadow-lg border-emerald-100 bg-emerald-50/10 overflow-hidden">
          <CardHeader className="bg-emerald-50 border-b py-4">
              <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-emerald-800">Verified Risk Reduction Profile (Closed Items)</CardTitle>
              </div>
              <CardDescription className="text-[10px] font-bold text-emerald-700/60 uppercase">Measurement of Initial vs. Residual Magnitude after verified treatment.</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
              {analytics.closureEfficiencyData.length > 0 ? (
                  <ChartContainer config={{}} className="h-[350px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analytics.closureEfficiencyData} margin={{ bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 9, fontWeight: 700 }} />
                              <YAxis domain={[0, 25]} axisLine={false} tickLine={false} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                              <Bar dataKey="Initial" fill="hsl(var(--muted))" radius={[2, 2, 0, 0]} barSize={20} />
                              <Bar dataKey="Residual" fill="hsl(142 71% 45%)" radius={[2, 2, 0, 0]} barSize={20}>
                                  <LabelList dataKey="Residual" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(142 71% 45%)' }} />
                              </Bar>
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              ) : (
                  <div className="py-20 text-center opacity-20 flex flex-col items-center gap-3">
                      <Activity className="h-10 w-10" />
                      <p className="text-xs font-black uppercase">Awaiting Verified Closures</p>
                  </div>
              )}
          </CardContent>
          <CardFooter className="bg-white/50 border-t py-3 px-6">
              <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-800 leading-relaxed font-medium italic">
                      <strong>ISO 6.1 Performance Indicator:</strong> Successful risk treatment is demonstrated by a significant delta between Initial and Residual magnitudes. A residual score of 1-4 (Low) is the institutional target for all treated risks.
                  </p>
              </div>
          </CardFooter>
      </Card>
    </div>
  );
}
