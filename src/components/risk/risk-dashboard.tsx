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
import { Timestamp } from '@/firebase/firestore-wrapper';

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

    const now = new Date();
    const highActive = risks.filter(r => r.type === 'Risk' && r.status !== 'Closed' && r.preTreatment.rating === 'High').length;
    const mediumActive = risks.filter(r => r.type === 'Risk' && r.status !== 'Closed' && r.preTreatment.rating === 'Medium').length;
    const lowActive = risks.filter(r => r.type === 'Risk' && r.status !== 'Closed' && r.preTreatment.rating === 'Low').length;
    const weightedScore = (highActive * 3) + (mediumActive * 2) + (lowActive * 1);

    const watchlist = risks
        .filter(r => r.type === 'Risk' && r.preTreatment.rating === 'Low' && r.escalationTrigger)
        .slice(0, 5);

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

    const overdueCount = risks
        .filter(r => r.status !== 'Closed' && r.targetDate && (r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate)) < now)
        .length;

    return { total, openCount, highRiskCount, opportunityCount, priorityData, objectiveData, closureEfficiencyData, ratioData, upcomingDeadlines, weightedScore, watchlist, overdueCount };
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
        <Card className="bg-violet-50 border-violet-100 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-700">Weighted Exposure</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-violet-700 tabular-nums">{analytics.weightedScore}</div>
                <p className="text-[7.5px] font-bold text-violet-500 uppercase tracking-tighter mt-1">High (3pt) + Med (2pt) + Low (1pt)</p>
            </CardContent>
        </Card>
        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-700">Open Critical Risks</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-rose-600 tabular-nums">{analytics.openCount}</div>
                <p className="text-[7.5px] font-bold text-rose-400 uppercase tracking-tighter mt-1">Staged in Active analysis</p>
            </CardContent>
        </Card>
        <Card className={cn(
            "border shadow-sm relative overflow-hidden transition-all duration-500",
            analytics.overdueCount > 0 ? "bg-red-50 border-red-200 animate-pulse-slow" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
        )}>
            <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className={cn("text-[9px] font-black uppercase tracking-[0.15em]", analytics.overdueCount > 0 ? "text-red-700" : "text-slate-600 dark:text-slate-400")}>Overdue Actions</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
                <div className={cn("text-2xl font-black tabular-nums", analytics.overdueCount > 0 ? "text-red-600" : "text-slate-500")}>{analytics.overdueCount}</div>
                <p className={cn("text-[7.5px] font-bold uppercase tracking-tighter mt-1", analytics.overdueCount > 0 ? "text-red-500" : "text-slate-400")}>Stalled past target date</p>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Growth Gain Ratio</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-emerald-600 tabular-nums">{analytics.opportunityCount}</div>
                <p className="text-[7.5px] font-bold text-emerald-500 uppercase tracking-tighter mt-1">Opportunities logged</p>
            </CardContent>
        </Card>
        <Card className="bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-1.5 pt-3 px-4">
                <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-700 dark:text-slate-300">Total Entries</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
                <div className="text-2xl font-black text-slate-700 dark:text-slate-300 tabular-nums">{analytics.total}</div>
                <p className="text-[7.5px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Strategic scope count</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col w-full">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Objective Vulnerability</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1"><ChartContainer config={{ risks: { label: 'Risks', color: 'hsl(var(--destructive))' }, opportunities: { label: 'Opportunities', color: 'hsl(var(--chart-2))' } }} className="h-[300px] w-full"><ResponsiveContainer><BarChart data={analytics.objectiveData} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} /><RechartsTooltip content={<ChartTooltipContent />} /><Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} /><Bar dataKey="risks" stackId="a" fill="hsl(var(--destructive))" /><Bar dataKey="opportunities" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></ChartContainer></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={r.description}>{r.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase bg-primary/5 text-primary border-none">{r.responsiblePersonName || 'No Lead'}</Badge>
                                    <span className="text-[9px] text-muted-foreground font-bold">{format(r.date, 'MMM dd, yyyy')}</span>
                                </div>
                            </div>
                            <div className="ml-4 text-right">
                                <Badge className={cn(
                                    "h-5 text-[9px] font-black uppercase",
                                    r.daysLeft < 0 ? "bg-rose-600 text-white animate-pulse" : r.daysLeft < 7 ? "bg-amber-500 text-white animate-pulse" : "bg-blue-600 text-white"
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

        {/* Low-Risk Watchlist Feed */}
        <Card className="shadow-md border-blue-100 bg-blue-50/5 flex flex-col">
            <CardHeader className="bg-blue-50/20 border-b py-4">
                <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-blue-800">Low-Risk Vigilance Feed</CardTitle>
                </div>
                <CardDescription className="text-[10px]">Monitoring triggers to prevent low risks from escalating.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <div className="divide-y">
                    {analytics.watchlist.map((r, idx) => (
                        <div key={idx} className="p-4 space-y-2 hover:bg-blue-50/10 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block max-w-[200px]" title={r.description}>{r.description}</span>
                                <Badge variant="outline" className="h-4 text-[7px] font-black bg-blue-50 border-blue-200 text-blue-700 uppercase tracking-tighter shrink-0">
                                    Watch: {r.reviewInterval === '6-months' ? '6 Mo' : 'Annual'}
                                </Badge>
                            </div>
                            <div className="p-2 bg-white rounded border border-blue-100 text-[9px] leading-relaxed italic text-blue-800">
                                <strong>Escalation Trigger:</strong> "{r.escalationTrigger || 'No trigger defined'}"
                            </div>
                        </div>
                    ))}
                    {analytics.watchlist.length === 0 && (
                        <div className="py-20 text-center opacity-25">
                            <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-600" />
                            <p className="text-[10px] font-black uppercase text-emerald-800">Vigilance Clear - No triggers set</p>
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
