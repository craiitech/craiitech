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
    ListChecks,
    Clock,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

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

    const closureEfficiencyData = risks
        .filter(r => r.status === 'Closed' && r.postTreatment)
        .slice(0, 10)
        .map(r => ({
            name: r.description.length > 20 ? r.description.substring(0, 20) + '...' : r.description,
            'Initial': r.preTreatment.magnitude,
            'Residual': r.postTreatment?.magnitude || 0
        }));

    const ratioData = [
        { name: 'Risks', value: risks.filter(r => r.type === 'Risk').length, fill: 'hsl(var(--destructive))' },
        { name: 'Opportunities', value: risks.filter(r => r.type === 'Opportunity').length, fill: 'hsl(142 71% 45%)' }
    ];

    const now = new Date();
    const upcomingDeadlines = risks
        .filter(r => r.status !== 'Closed' && r.targetDate)
        .map(r => {
            const date = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
            return {
                ...r,
                date,
                daysLeft: differenceInDays(date, now)
            };
        })
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 5);

    return { total, openCount, highRiskCount, opportunityCount, priorityData, objectiveData, closureEfficiencyData, ratioData, upcomingDeadlines };
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
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Strategic Entries</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary tabular-nums">{analytics.total}</div></CardContent></Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Open Critical Risks</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.openCount}</div></CardContent></Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">High-Priority Gaps</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.highRiskCount}</div></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden"><CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Growth Gain Ratio</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.opportunityCount}</div></CardContent></Card>
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

        {/* NEW: Risk Treatment Deadline Countdown */}
        <Card className="shadow-md border-primary/10 flex flex-col">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Treatment Deadline Registry</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Monitoring approaching mitigation targets.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <div className="divide-y">
                    {analytics.upcomingDeadlines.map((r, idx) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 truncate" title={r.description}>{r.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase bg-primary/5 text-primary border-none">{r.responsiblePersonName || 'No Lead'}</Badge>
                                    <span className="text-[9px] text-muted-foreground font-bold">{format(r.date, 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                            <div className="ml-4 text-right">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase",
                                    r.daysLeft < 7 ? "bg-rose-600 text-white animate-pulse" : "bg-blue-600 text-white"
                                )}>
                                    {r.daysLeft < 0 ? 'OVERDUE' : `${r.daysLeft} DAYS LEFT`}
                                </Badge>
                            </div>
                        </div>
                    ))}
                    {analytics.upcomingDeadlines.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                            <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase">No active deadlines</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-emerald-100 bg-emerald-50/10 overflow-hidden">
          <CardHeader className="bg-emerald-50 border-b py-4">
              <div className="flex items-center gap-2">
                  <ArrowDownToLine className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-emerald-800">Verified Risk Reduction Profile</CardTitle>
              </div>
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
              ) : null}
          </CardContent>
      </Card>
    </div>
  );
}
