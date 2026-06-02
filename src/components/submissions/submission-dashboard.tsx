
'use client';

import { useMemo } from 'react';
import type { Submission, Cycle, Unit } from '@/lib/types';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    FileText, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    TrendingUp, 
    CalendarCheck, 
    CalendarOff, 
    FileWarning, 
    Info, 
    Activity, 
    Target,
    ShieldCheck,
    Zap,
    Trophy,
    RotateCw,
    Check,
    LayoutList,
    ChevronRight,
    Circle
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { isBefore, isAfter } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';
import { submissionTypes } from '@/lib/constants';

interface SubmissionDashboardProps {
  submissions: Submission[];
  cycles: Cycle[];
  allUnits: Unit[];
  isLoading: boolean;
  selectedYear: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'hsl(142 71% 45%)', // Green
  submitted: 'hsl(var(--chart-1))', // Primary
  rejected: 'hsl(var(--destructive))', // Red
};

const TIMELINESS_COLORS: Record<string, string> = {
  'On-Time': 'hsl(142 71% 45%)',
  'Late': 'hsl(var(--destructive))',
};

export function SubmissionDashboard({ submissions, cycles, allUnits, isLoading, selectedYear }: SubmissionDashboardProps) {
  const displayYear = selectedYear === 'all' ? 'All Recorded Years' : `AY ${selectedYear}`;

  const analytics = useMemo(() => {
    if (!submissions || !cycles || !allUnits) return null;

    const total = submissions.length;
    const approved = submissions.filter(s => s.statusId === 'approved').length;
    const pending = submissions.filter(s => s.statusId === 'submitted').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const statusCounts: Record<string, number> = {};
    submissions.forEach(s => {
      statusCounts[s.statusId] = (statusCounts[s.statusId] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ 
        name: name === 'submitted' ? 'Awaiting Approval' : name.charAt(0).toUpperCase() + name.slice(1), 
        value,
        statusId: name,
        fill: STATUS_COLORS[name] || '#cbd5e1'
    }));

    let onTimeCount = 0;
    let lateCount = 0;

    submissions.forEach(sub => {
        const matchingCycle = cycles.find(c => 
            c.name.toLowerCase() === sub.cycleId.toLowerCase() && 
            Number(c.year) === Number(sub.year)
        );

        if (matchingCycle && matchingCycle.endDate) {
            const getMs = (val: any) => {
                if (val instanceof Timestamp) return val.toMillis();
                if (val instanceof Date) return val.getTime();
                if (val?.seconds) return val.seconds * 1000;
                return new Date(val).getTime();
            };

            const subTime = getMs(sub.submissionDate);
            const deadlineTime = getMs(matchingCycle.endDate);

            if (subTime <= deadlineTime) {
                onTimeCount++;
            } else {
                lateCount++;
            }
        } else {
            onTimeCount++;
        }
    });

    const timelinessData = [
        { name: 'On-Time', value: onTimeCount, fill: TIMELINESS_COLORS['On-Time'] },
        { name: 'Late', value: lateCount, fill: TIMELINESS_COLORS['Late'] },
    ];

    const reportCounts: Record<string, number> = {};
    submissionTypes.forEach(type => reportCounts[type] = 0);
    submissions.forEach(s => {
        if (reportCounts[s.reportType] !== undefined) {
            reportCounts[s.reportType]++;
        }
    });
    const reportData = Object.entries(reportCounts).map(([name, total]) => ({ name, total }));

    const calculateMissingForCycle = (cycleId: 'first' | 'final') => {
        const cycleSubs = submissions.filter(s => s.cycleId === cycleId);
        
        return submissionTypes.map(type => {
            const submittedUnitIds = new Set(cycleSubs.filter(s => s.reportType === type).map(s => s.unitId));
            
            let exemptUnitIds = new Set<string>();
            if (type === 'Risk and Opportunity Action Plan') {
                cycleSubs.filter(s => s.reportType === 'Risk and Opportunity Registry' && s.riskRating === 'low').forEach(s => {
                    exemptUnitIds.add(s.unitId);
                });
            }

            const missingUnitsCount = allUnits.filter(u => !submittedUnitIds.has(u.id) && !exemptUnitIds.has(u.id)).length;
            const relevantTotal = Math.max(0, allUnits.length - exemptUnitIds.size);
            const percentage = relevantTotal > 0 ? Math.round(((relevantTotal - missingUnitsCount) / relevantTotal) * 100) : 100;

            // JOURNEY MAP LOGIC: BASE ON FINAL FILED, NOT JUST DRAFT
            const isApproved = cycleSubs.some(s => s.reportType === type && s.statusId === 'approved' && s.isDraft !== true);
            const isDraftCleared = cycleSubs.some(s => s.reportType === type && s.statusId === 'approved' && s.isDraft === true);

            return {
                type,
                missingCount: missingUnitsCount,
                percentage,
                isExempt: relevantTotal === 0,
                isApproved,
                isDraftCleared
            };
        });
    };

    const firstCycleMissing = calculateMissingForCycle('first');
    const finalCycleMissing = calculateMissingForCycle('final');

    const strengths = [];
    const timelinessRate = Math.round((onTimeCount / (total || 1)) * 100);
    
    if (timelinessRate >= 80) {
        strengths.push({
            title: "Process Discipline",
            desc: `${timelinessRate}% On-Time submission rate across the university sites.`,
            icon: <CalendarCheck className="h-4 w-4 text-emerald-600" />,
            tag: "PUNCTUALITY"
        });
    }

    if (approvalRate >= 70) {
        strengths.push({
            title: "Verification Velocity",
            desc: `${approvalRate}% of all logged evidence reached 'Approved' status within the audit cycle.`,
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            tag: "QUALITY"
        });
    }

    return { 
        total, 
        approvalRate, 
        pending, 
        statusData, 
        timelinessData, 
        reportData,
        firstCycleMissing,
        finalCycleMissing,
        strengths
    };
  }, [submissions, cycles, allUnits]);

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
        <CardTitle className="text-xl font-black uppercase tracking-widest opacity-40">Submission Data Pending</CardTitle>
        <CardDescription className="max-w-xs mx-auto">Visual analytics for {displayYear} will activate once units begin logging evidence through the portal.</CardDescription>
      </Card>
    );
  }

  const renderMissingCard = (title: string, data: any[]) => (
    <Card className="border-destructive/20 bg-destructive/5 shadow-sm overflow-hidden h-full flex flex-col">
        <CardHeader className="bg-destructive/10 border-b py-3">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
                <FileWarning className="h-3.5 w-3.5" />
                {title} ({displayYear})
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="h-[240px]">
                <div className="p-4 space-y-3">
                    {data.map((item, idx) => (
                        <div key={idx} className="space-y-1.5 p-2 rounded bg-white border border-destructive/5 shadow-sm group hover:border-destructive/30 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold text-slate-700 truncate leading-none group-hover:text-destructive transition-colors" title={item.type}>{item.type}</span>
                                <Badge variant={item.missingCount > 0 ? 'destructive' : 'default'} className="h-4 text-[8px] font-black py-0 px-1.5 border-none">
                                    {item.missingCount > 0 ? `${item.missingCount} GAPS` : 'PARITY REACHED'}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <Progress value={item.percentage} className="h-1 flex-1" />
                                <span className="text-[9px] font-black text-muted-foreground tabular-nums">{item.percentage}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-primary/10 overflow-hidden bg-primary/5">
        <CardHeader className="bg-primary/10 border-b py-4">
            <div className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Compliance Journey Map</CardTitle>
            </div>
            <CardDescription className="text-[10px]">Strategic roadmap based on <strong>Final Official Filings</strong> (Approved PDFs).</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {submissionTypes.map((type, idx) => {
                    const status1 = analytics.firstCycleMissing.find(m => m.type === type);
                    const status2 = analytics.finalCycleMissing.find(m => m.type === type);
                    
                    const isApproved = status1?.isApproved || status2?.isApproved;
                    const isDraftCleared = status1?.isDraftCleared || status2?.isDraftCleared;
                    
                    return (
                        <div key={idx} className={cn(
                            "flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-500",
                            isApproved ? "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-200" : 
                            isDraftCleared ? "bg-blue-50 border-blue-200 shadow-sm" :
                            "bg-muted/10 border-slate-100 grayscale opacity-40"
                        )}>
                            <div className={cn(
                                "h-10 w-10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm",
                                isApproved ? "bg-emerald-600 text-white" : 
                                isDraftCleared ? "bg-blue-600 text-white" :
                                "bg-slate-200 text-slate-500"
                            )}>
                                {isApproved ? <CheckCircle2 className="h-6 w-6" /> : 
                                 isDraftCleared ? <LayoutList className="h-5 w-5" /> :
                                 <Circle className="h-5 w-5" />}
                            </div>
                            <p className="text-[9px] font-black uppercase leading-tight">{type}</p>
                            {isApproved ? (
                                <Badge variant="secondary" className="h-3 text-[7px] font-black uppercase bg-emerald-50 text-emerald-700 border-none mt-2">
                                    OFFICIALLY FILED
                                </Badge>
                            ) : isDraftCleared ? (
                                <Badge variant="secondary" className="h-3 text-[7px] font-black uppercase bg-blue-100 text-blue-700 border-none mt-2">
                                    DRAFT CLEARED
                                </Badge>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-2 opacity-5"><FileText className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums tracking-tighter">{analytics.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Approval Maturity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums tracking-tighter">{analytics.approvalRate}%</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Audit Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums tracking-tighter">{analytics.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Timeliness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums tracking-tighter">
                {Math.round((analytics.timelinessData[0].value / (analytics.total || 1)) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-200 shadow-xl overflow-hidden bg-emerald-50/10 relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 opacity-50" />
          <CardHeader className="bg-emerald-50 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2 text-emerald-700">
                          <Zap className="h-5 w-5 text-emerald-600" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Maturity Strengths</CardTitle>
                      </div>
                      <CardDescription className="text-[10px] font-bold text-emerald-800/60 uppercase">High-performance metrics derived from verified evidence logs for {displayYear}.</CardDescription>
                  </div>
                  <Trophy className="h-10 w-10 text-emerald-600/10" />
              </div>
          </CardHeader>
          <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {analytics.strengths.length > 0 ? (
                      analytics.strengths.map((strength, idx) => (
                          <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-emerald-100 shadow-sm transition-all hover:scale-105 duration-300">
                              <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                          {strength.icon}
                                      </div>
                                      <span className="text-xs font-black text-slate-900 uppercase tracking-tighter">{strength.title}</span>
                                  </div>
                                  <Badge variant="outline" className="h-4 text-[7px] font-black border-emerald-200 text-emerald-700 uppercase">{strength.tag}</Badge>
                              </div>
                              <p className="text-[10px] text-slate-600 leading-relaxed font-medium italic">"{strength.desc}"</p>
                          </div>
                      ))
                  ) : (
                      <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-20">
                          <Activity className="h-8 w-8" />
                          <p className="text-[10px] font-black uppercase mt-2">Calibrating system strengths...</p>
                      </div>
                  )}
              </div>
          </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderMissingCard("Parity Gap Analysis: First Submission Cycle", analytics.firstCycleMissing)}
        {renderMissingCard("Parity Gap Analysis: Final Submission Cycle", analytics.finalCycleMissing)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Timeliness index</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <ChartContainer config={{}} className="h-[220px] w-[220px] shrink-0">
                    <ResponsiveContainer>
                        <PieChart>
                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={analytics.timelinessData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={85}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {analytics.timelinessData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Quality Maturity Lifecycle</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <PieChart>
                        <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie
                            data={analytics.statusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            dataKey="value"
                        >
                            {analytics.statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontStyle: 'bold', paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Documentation Density Profile</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{}} className="h-[350px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.reportData} layout="vertical" margin={{ left: 20, right: 40, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 8, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                            width={180}
                            axisLine={false}
                            tickLine={false}
                        />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
