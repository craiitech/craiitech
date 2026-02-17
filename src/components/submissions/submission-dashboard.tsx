
'use client';

import { useMemo } from 'react';
import type { Submission, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Clock, AlertCircle, TrendingUp, CalendarCheck, CalendarOff } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { isBefore, isAfter } from 'date-fns';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';

interface SubmissionDashboardProps {
  submissions: Submission[];
  cycles: Cycle[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'hsl(var(--chart-2))',
  submitted: 'hsl(var(--chart-1))',
  rejected: 'hsl(var(--chart-3))',
};

const TIMELINESS_COLORS: Record<string, string> = {
  'On-Time': 'hsl(var(--chart-2))',
  'Late': 'hsl(var(--chart-3))',
};

export function SubmissionDashboard({ submissions, cycles, isLoading }: SubmissionDashboardProps) {
  const analytics = useMemo(() => {
    if (!submissions || !cycles) return null;

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
        statusId: name
    }));

    // 3. Timeliness (On-Time vs Late)
    let onTimeCount = 0;
    let lateCount = 0;

    submissions.forEach(sub => {
        // FIX: Match cycle by name and year, not the unique doc ID which contains the year suffix
        const matchingCycle = cycles.find(c => 
            c.name.toLowerCase() === sub.cycleId.toLowerCase() && 
            Number(c.year) === Number(sub.year)
        );

        if (matchingCycle && matchingCycle.endDate) {
            // Robust Date extraction for comparison
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
            // Default to on-time if no cycle/deadline is defined for that specific year/cycle
            onTimeCount++;
        }
    });

    const timelinessData = [
        { name: 'On-Time', value: onTimeCount },
        { name: 'Late', value: lateCount },
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

    return { total, approvalRate, pending, statusData, timelinessData, reportData };
  }, [submissions, cycles]);

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
      <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center">
        <FileText className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <CardTitle>No Visual Data Yet</CardTitle>
        <CardDescription>Visual analytics will appear here once submissions are recorded for this scope.</CardDescription>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary">{analytics.total}</div>
            <p className="text-[10px] text-muted-foreground mt-1">Uploaded documents in current view</p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-green-700">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-green-600">{analytics.approvalRate}%</div>
            <p className="text-[10px] text-green-600/70 mt-1">Percentage of approved reports</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700">Pending Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600">{analytics.pending}</div>
            <p className="text-[10px] text-amber-600/70 mt-1">Waiting for approver action</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-700">Timeliness Index</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600">
                {Math.round((analytics.timelinessData[0].value / (analytics.total || 1)) * 100)}%
            </div>
            <p className="text-[10px] text-blue-600/70 mt-1">Submissions made before deadline</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeliness Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>On-Time vs Late Submissions</CardTitle>
            </div>
            <CardDescription>Analysis of submissions against official cycle deadlines.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 items-center">
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie
                                data={analytics.timelinessData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {analytics.timelinessData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={TIMELINESS_COLORS[entry.name]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50/30">
                        <div className="flex items-center gap-2">
                            <CalendarCheck className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-bold">On-Time</span>
                        </div>
                        <span className="text-lg font-black text-green-600">{analytics.timelinessData[0].value}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50/30">
                        <div className="flex items-center gap-2">
                            <CalendarOff className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-bold">Late</span>
                        </div>
                        <span className="text-lg font-black text-red-600">{analytics.timelinessData[1].value}</span>
                    </div>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Submission Status Profile</CardTitle>
            </div>
            <CardDescription>Breakdown of current lifecycle status across all documents.</CardDescription>
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
                            outerRadius={80}
                            label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                            dataKey="value"
                        >
                            {analytics.statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.statusId] || '#cbd5e1'} />
                            ))}
                        </Pie>
                        <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Report Coverage Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Report Type Volume</CardTitle>
            </div>
            <CardDescription>Submission density per core EOMS document type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
                <ResponsiveContainer>
                    <BarChart data={analytics.reportData} layout="vertical" margin={{ left: 40, right: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            tick={{ fontSize: 10, fontWeight: 600 }} 
                            width={150}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
