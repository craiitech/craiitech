'use client';

import { useMemo } from 'react';
import type { UnitMonitoringRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, ClipboardCheck, TrendingUp, School, Building, User, Trophy, Zap, Target, BarChart3, Info } from 'lucide-react';

interface MonitoringAnalyticsProps {
  records: UnitMonitoringRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function MonitoringAnalytics({ records, campuses, units, isLoading, selectedYear }: MonitoringAnalyticsProps) {
  
  const analytics = useMemo(() => {
    if (!records || records.length === 0) return null;

    const campusMap = new Map(campuses.map(c => [c.id, c.name]));
    const unitMap = new Map(units.map(u => [u.id, u.name]));

    /**
     * Compliance Score calculation per visit.
     * Logic: Exclude "Not Applicable" from both numerator and denominator.
     * Score = Available / (Total Applicable Items)
     */
    const visitCompliance = records.map(record => {
        const applicableItems = record.observations.filter(o => o.status !== 'Not Applicable');
        const availableItems = applicableItems.filter(o => o.status === 'Available');
        const score = applicableItems.length > 0 ? (availableItems.length / applicableItems.length) * 100 : 0;
        return {
            unitId: record.unitId,
            campusId: record.campusId,
            officerInCharge: record.officerInCharge,
            visitDate: record.visitDate,
            score
        };
    });

    const averageCompliance = visitCompliance.reduce((acc, v) => acc + v.score, 0) / (visitCompliance.length || 1);

    const issueCounts: Record<string, number> = {};
    records.forEach(record => {
        record.observations.forEach(obs => {
            if (obs.status === 'Not Available' || obs.status === 'For Improvement' || obs.status === 'Needs Updating') {
                issueCounts[obs.item] = (issueCounts[obs.item] || 0) + 1;
            }
        });
    });

    const commonIssuesData = Object.entries(issueCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

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

    const unitPerformance: Record<string, { total: number, sum: number, campusId: string, oic: string }> = {};
    const sortedVisits = [...visitCompliance].sort((a, b) => b.visitDate.toMillis() - a.visitDate.toMillis());

    sortedVisits.forEach(v => {
        if (!unitPerformance[v.unitId]) {
            unitPerformance[v.unitId] = { total: 0, sum: 0, campusId: v.campusId, oic: v.officerInCharge || 'N/A' };
        }
        unitPerformance[v.unitId].total += 1;
        unitPerformance[v.unitId].sum += v.score;
    });

    const unitLeaderboard = Object.entries(unitPerformance).map(([id, data]) => ({
        id,
        name: unitMap.get(id) || 'Unknown Unit',
        campus: campusMap.get(data.campusId) || '...',
        oic: data.oic,
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
        </div>
    );
  }

  if (!analytics) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-medium">Insufficient Data for {selectedYear}</h3>
            <p className="text-sm text-muted-foreground">Analytics will appear here once monitoring records are logged.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Visits in {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-bold">{analytics.totalVisits}</div>
            </CardContent>
            <div className="p-3 bg-muted/10 border-t mt-auto">
                <p className="text-[9px] text-muted-foreground italic leading-tight">
                    <strong>Guidance:</strong> Quantifies the total volume of oversight activity conducted during the reporting period.
                </p>
            </div>
        </Card>
        <Card className="bg-green-50 border-green-100 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">Avg. Compliance</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-bold text-green-600">{Math.round(analytics.averageCompliance)}%</div>
            </CardContent>
            <div className="p-3 bg-green-100/20 border-t mt-auto">
                <p className="text-[9px] text-green-800/60 italic leading-tight">
                    <strong>Guidance:</strong> Represents the average operational quality score across all validated on-site visits.
                </p>
            </div>
        </Card>
        <Card className="bg-amber-50 border-amber-100 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Total Findings</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-bold text-amber-600">{analytics.criticalCount}</div>
            </CardContent>
            <div className="p-3 bg-amber-100/20 border-t mt-auto">
                <p className="text-[9px] text-amber-800/60 italic leading-tight">
                    <strong>Guidance:</strong> Aggregate count of identified deficiencies requiring administrative attention or updates.
                </p>
            </div>
        </Card>
        <Card className="bg-blue-50 border-blue-100 flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Top Unit</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-lg font-bold text-blue-600 truncate">
                    {analytics.unitLeaderboard[0]?.name}
                </div>
                <p className="text-[10px] text-blue-800/60 font-semibold uppercase mt-1">
                    {analytics.unitLeaderboard[0]?.campus}
                </p>
            </CardContent>
            <div className="p-3 bg-blue-100/20 border-t mt-auto">
                <p className="text-[9px] text-blue-800/60 italic leading-tight">
                    <strong>Guidance:</strong> Highlights the highest-performing entity based on objective on-site evidence logs.
                </p>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/10 border-b">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Top Findings & Gaps</CardTitle>
                </div>
                <Badge variant="destructive" className="h-6 px-3 font-black text-[10px] uppercase">
                    TOTAL GAPS: {analytics.criticalCount}
                </Badge>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.commonIssuesData} layout="vertical" margin={{ left: 40, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} width={120} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]}>
                                <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: '#991b1b' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/10 border-t mt-auto">
                <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                        <strong>Guidance for usage:</strong> Use this visualization to prioritize training and resource allocation. Frequent gaps across multiple units identify systemic weaknesses in quality standards or physical infrastructure.
                    </p>
                </div>
            </div>
        </Card>

        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between py-4 bg-muted/10 border-b">
                <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Comparison</CardTitle>
                </div>
                <Badge variant="secondary" className="h-6 px-3 font-black text-[10px] uppercase bg-primary text-white border-none">
                    {analytics.campusChartData.length} SITES MONITORED
                </Badge>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.campusChartData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} unit="%" axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={40}>
                                <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: '11px', fontWeight: '900', fill: '#1e3a8a' }} />
                                {analytics.campusChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/10 border-t mt-auto">
                <div className="flex items-start gap-3">
                    <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed font-medium italic">
                        <strong>Guidance for usage:</strong> Benchmarks site-level performance across the university. Large variances between campuses suggest a need for uniform adherence to the EOMS Manual and standardized facility maintenance.
                    </p>
                </div>
            </div>
        </Card>
      </div>

      <Card className="border-primary/10 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 border-b py-4">
            <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">Monitoring Excellence Leaderboard</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Top performing units based on verified physical and documentary compliance.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {analytics.unitLeaderboard.map((unit, index) => (
                    <div key={unit.id} className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-black text-primary">
                            {index + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-sm truncate">{unit.name}</p>
                                <Badge variant="outline" className="bg-green-50 text-green-700 h-5 text-[10px] font-black">{unit.rate}% Score</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                <span className="flex items-center gap-1"><School className="h-3 w-3" /> {unit.campus}</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3" /> OIC: {unit.oic}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Separator className="mb-4" />
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-blue-800 leading-relaxed font-medium italic">
                    <strong>Guidance for usage:</strong> This leaderboard promotes a culture of quality. Units appearing here consistently demonstrate mature operational processes, clean facilities (7S), and complete documentation on file.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
