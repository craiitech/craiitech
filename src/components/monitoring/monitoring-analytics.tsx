'use client';

import { useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, ClipboardCheck, TrendingUp, School } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitoringAnalyticsProps {
  records: UnitMonitoringRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function MonitoringAnalytics({ records, campuses, units, isLoading }: MonitoringAnalyticsProps) {
  
  const analytics = useMemo(() => {
    if (!records || records.length === 0) return null;

    // 1. Compliance Score calculation (Average % of "Available" items)
    const visitCompliance = records.map(record => {
        const applicableItems = record.observations.filter(o => o.status !== 'Not Applicable');
        const availableItems = applicableItems.filter(o => o.status === 'Available');
        const score = applicableItems.length > 0 ? (availableItems.length / applicableItems.length) * 100 : 0;
        return {
            unitId: record.unitId,
            campusId: record.campusId,
            score
        };
    });

    const averageCompliance = visitCompliance.reduce((acc, v) => acc + v.score, 0) / visitCompliance.length;

    // 2. Common Issues (Items marked "Not Available" or "For Improvement")
    const issueCounts: Record<string, number> = {};
    records.forEach(record => {
        record.observations.forEach(obs => {
            if (obs.status === 'Not Available' || obs.status === 'For Improvement') {
                issueCounts[obs.item] = (issueCounts[obs.item] || 0) + 1;
            }
        });
    });

    const commonIssuesData = Object.entries(issueCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // 3. Performance by Campus
    const campusMap = new Map(campuses.map(c => [c.id, c.name]));
    const campusPerformance: Record<string, { total: number, sum: number }> = {};
    
    visitCompliance.forEach(v => {
        if (!campusPerformance[v.campusId]) {
            campusPerformance[v.campusId] = { total: 0, sum: 0 };
        }
        campusPerformance[v.campusId].total += 1;
        campusPerformance[v.campusId].sum += v.score;
    });

    const campusChartData = Object.entries(campusPerformance).map(([id, data]) => ({
        name: campusMap.get(id) || 'Unknown',
        rate: Math.round(data.sum / data.total)
    })).sort((a, b) => b.rate - a.rate);

    // 4. Unit Leaderboard
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const unitPerformance: Record<string, { total: number, sum: number, campusId: string }> = {};

    visitCompliance.forEach(v => {
        if (!unitPerformance[v.unitId]) {
            unitPerformance[v.unitId] = { total: 0, sum: 0, campusId: v.campusId };
        }
        unitPerformance[v.unitId].total += 1;
        unitPerformance[v.unitId].sum += v.score;
    });

    const unitLeaderboard = Object.entries(unitPerformance).map(([id, data]) => ({
        id,
        name: unitMap.get(id) || 'Unknown Unit',
        campus: campusMap.get(data.campusId) || '...',
        rate: Math.round(data.sum / data.total)
    })).sort((a, b) => b.rate - a.rate).slice(0, 10);

    return {
        averageCompliance,
        commonIssuesData,
        campusChartData,
        unitLeaderboard,
        totalVisits: records.length,
        criticalCount: Object.values(issueCounts).reduce((a, b) => a + b, 0)
    };
  }, [records, campuses, units]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  if (!analytics) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-medium">Insufficient Monitoring Data</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Analytics will be available once visit records have been logged in the system.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Total Visits</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{analytics.totalVisits}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Official monitored sites recorded</p>
            </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">Compliance Rate</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-600">{Math.round(analytics.averageCompliance)}%</div>
                <p className="text-[10px] text-green-600/70 mt-1">Average items "Available" across sites</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Total Findings</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-amber-600">{analytics.criticalCount}</div>
                <p className="text-[10px] text-amber-600/70 mt-1">Items requiring improvement or missing</p>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Top Performer</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-lg font-bold text-blue-600 truncate">{analytics.unitLeaderboard[0]?.name}</div>
                <p className="text-[10px] text-blue-600/70 mt-1">{analytics.unitLeaderboard[0]?.rate}% Compliance Score</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Issues Chart */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <CardTitle>Top Compliance Gaps</CardTitle>
                </div>
                <CardDescription>Most frequent items marked as "Not Available" or "For Improvement".</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.commonIssuesData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                tick={{ fontSize: 10 }} 
                                width={120} 
                            />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* Campus Performance Chart */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    <CardTitle>Campus Compliance Comparison</CardTitle>
                </div>
                <CardDescription>Average performance score (%) per campus site.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.campusChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                                {analytics.campusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* Performance Leaderboard */}
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle>Unit Performance Leaderboard</CardTitle>
                </div>
                <CardDescription>Top 10 units based on their latest monitoring results.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analytics.unitLeaderboard.map((unit, index) => (
                        <div key={unit.id} className="flex items-center justify-between border p-3 rounded-lg bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    #{index + 1}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold truncate max-w-[180px]">{unit.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{unit.campus}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <Badge variant={unit.rate >= 80 ? 'default' : 'secondary'} className={cn(unit.rate >= 80 && "bg-green-500 hover:bg-green-600")}>
                                    {unit.rate}% Score
                                </Badge>
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
