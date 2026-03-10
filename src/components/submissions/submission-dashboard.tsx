'use client';

import { useMemo } from 'react';
import type { Submission, Cycle, Unit } from '@/lib/types';
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
    Legend 
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
    ShieldCheck
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { isBefore, isAfter } from 'date-fns';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';

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

    // 1. KPI Stats
    const total = submissions.length;
    const approved = submissions.filter(s => s.statusId === 'approved').length;
    const pending = submissions.filter(s => s.statusId === 'submitted').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // 2. Status Distribution
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

    // 3. Timeliness (On-Time vs Late)
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

    // 4. Report Type Distribution
    const reportCounts: Record<string, number> = {};
    submissionTypes.forEach(type => reportCounts[type] = 0);
    submissions.forEach(s => {
        if (reportCounts[s.reportType] !== undefined) {
            reportCounts[s.reportType]++;
        }
    });
    const reportData = Object.entries(reportCounts).map(([name, total]) => ({ name, total }));

    // 5. Missing Document Calculations (Institutional Parity)
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

            return {
                type,
                missingCount: missingUnitsCount,
                percentage,
                isExempt: relevantTotal === 0
            };
        });
    };

    const firstCycleMissing = calculateMissingForCycle('first');
    const finalCycleMissing = calculateMissingForCycle('final');

    return { 
        total, 
        approvalRate, 
        pending, 
        statusData, 
        timelinessData, 
        reportData,
        firstCycleMissing,
        finalCycleMissing
    };
  }, [submissions, cycles, allUnits]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
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
            <div className="p-3 bg-white border-t mt-auto">
                <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                    <strong>Guide:</strong> Low percentage indicate critical documentation gaps that prevent institutional parity for this cycle.
                </p>
            </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><FileText className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Volume Registry - {displayYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums tracking-tighter">{analytics.total}</div>
            <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Total evidence logs</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Approval Maturity - {displayYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums tracking-tighter">{analytics.approvalRate}%</div>
            <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase">Verified quality index</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><Clock className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Audit Queue - {displayYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums tracking-tighter">{analytics.pending}</div>
            <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Items for evaluation</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-5"><TrendingUp className="h-12 w-12" /></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Responsiveness - {displayYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums tracking-tighter">
                {Math.round((analytics.timelinessData[0].value / (analytics.total || 1)) * 100)}%
            </div>
            <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Pre-deadline fulfillment</p>
          </CardContent>
        </Card>
      </div>

      {/* Institutional Gaps Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderMissingCard("Parity Gap Analysis: First Submission Cycle", analytics.firstCycleMissing)}
        {renderMissingCard("Parity Gap Analysis: Final Submission Cycle", analytics.finalCycleMissing)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 1. COMPLIANCE TIMELINESS CHART */}
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Timeliness index</CardTitle>
            </div>
            <CardDescription className="text-xs">Relationship between actual submission date and official cycle deadlines for {displayYear}.</CardDescription>
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
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="flex-1 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black uppercase text-slate-800 tracking-tight">Data Legend</p>
                            <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                                <strong>On-Time:</strong> Documents fulfilled before or on the set deadline.<br/>
                                <strong>Late:</strong> Submissions logged after the official cycle closure. High "Late" counts indicate bottlenecks in document preparation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. MATURITY LIFECYCLE CHART */}
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Quality Maturity Lifecycle</CardTitle>
            </div>
            <CardDescription className="text-xs">Real-time distribution of evidence status across the university scope for {displayYear}.</CardDescription>
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
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingTop: '20px' }} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex gap-3">
                <Target className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-800 leading-relaxed font-medium italic">
                    <strong>Institutional Guide:</strong> The "Approved" segment represents verified evidence suitable for audit. A large "Awaiting" segment suggests evaluator capacity issues.
                </p>
            </div>
          </CardContent>
        </Card>

        {/* 3. DOCUMENTATION DENSITY CHART */}
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Documentation Density Profile - {displayYear}</CardTitle>
            </div>
            <CardDescription className="text-xs">Distribution of logged evidence across the 6 core ISO 21001:2018 report types.</CardDescription>
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
                            tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                            width={180}
                            axisLine={false}
                            tickLine={false}
                        />
                        <RechartsTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 border-t">
                <div className="space-y-1.5">
                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">Analytics Objective</p>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                        Identify if specific document types (e.g., SWOT vs Action Plans) are being neglected. Uneven bars indicate procedural friction in specific EOMS phases.
                    </p>
                </div>
                <div className="space-y-1.5 border-l pl-6 border-slate-200">
                    <p className="text-[10px] font-black uppercase text-slate-800 tracking-widest">Action Legend</p>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">Count of Submitted Revisions per Document Type</span>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
