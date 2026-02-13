'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Award, GraduationCap, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ProgramAnalytics({ programs, compliances, campuses, isLoading, selectedYear }: ProgramAnalyticsProps) {
  
  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const campusMap = new Map(campuses.map(c => [c.id, c.name]));

    // 1. Accreditation Maturity Distribution
    const accreditationCounts: Record<string, number> = {};
    compliances.forEach(c => {
      const level = c.accreditation?.level || 'Not Accredited';
      accreditationCounts[level] = (accreditationCounts[level] || 0) + 1;
    });
    
    // Fill in missing active programs that have no compliance record yet
    const programsWithRecords = new Set(compliances.map(c => c.programId));
    const noRecordCount = programs.filter(p => !programsWithRecords.has(p.id)).length;
    if (noRecordCount > 0) {
        accreditationCounts['Not Monitored'] = (accreditationCounts['Not Monitored'] || 0) + noRecordCount;
    }

    const accreditationData = Object.entries(accreditationCounts).map(([name, value]) => ({ name, value }));

    // 2. CHED COPC Status
    const copcCounts = {
        'With COPC': compliances.filter(c => c.ched?.copcStatus === 'With COPC').length,
        'No COPC': compliances.filter(c => c.ched?.copcStatus === 'No COPC').length + noRecordCount,
        'In Progress': compliances.filter(c => c.ched?.copcStatus === 'In Progress').length,
    };
    const copcData = Object.entries(copcCounts).map(([name, value]) => ({ name, value }));

    // 3. Faculty Alignment Index
    let totalFaculty = 0;
    let alignedFaculty = 0;
    compliances.forEach(c => {
        if (c.faculty?.members) {
            c.faculty.members.forEach(m => {
                totalFaculty++;
                if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
            });
        }
        // Also check Dean and Chair
        if (c.faculty?.dean?.isAlignedWithCMO === 'Aligned') { totalFaculty++; alignedFaculty++; } else if (c.faculty?.dean) { totalFaculty++; }
        if (c.faculty?.programChair?.isAlignedWithCMO === 'Aligned') { totalFaculty++; alignedFaculty++; } else if (c.faculty?.programChair) { totalFaculty++; }
    });

    const facultyAlignmentRate = totalFaculty > 0 ? (alignedFaculty / totalFaculty) * 100 : 0;

    // 4. Board Performance Aggregation
    const boardPrograms = compliances.filter(c => c.boardPerformance && c.boardPerformance.overallPassRate > 0);
    const averagePassRate = boardPrograms.length > 0 
        ? boardPrograms.reduce((acc, c) => acc + (c.boardPerformance?.overallPassRate || 0), 0) / boardPrograms.length 
        : 0;
    
    const nationalAvgRate = boardPrograms.length > 0
        ? boardPrograms.reduce((acc, c) => acc + (c.boardPerformance?.nationalPassingRate || 0), 0) / boardPrograms.length
        : 0;

    const boardPerformanceData = [
        { name: 'University Average', rate: parseFloat(averagePassRate.toFixed(2)) },
        { name: 'National Average', rate: parseFloat(nationalAvgRate.toFixed(2)) }
    ];

    // 5. Campus Compliance Comparison
    const campusPerf: Record<string, { total: number, copc: number }> = {};
    programs.forEach(p => {
        if (!campusPerf[p.campusId]) campusPerf[p.campusId] = { total: 0, copc: 0 };
        campusPerf[p.campusId].total++;
        const record = compliances.find(c => c.programId === p.id);
        if (record?.ched?.copcStatus === 'With COPC') campusPerf[p.campusId].copc++;
    });

    const campusChartData = Object.entries(campusPerf).map(([id, data]) => ({
        name: campusMap.get(id) || '...',
        rate: Math.round((data.copc / data.total) * 100)
    })).sort((a, b) => b.rate - a.rate);

    return {
        accreditationData,
        copcData,
        facultyAlignmentRate,
        boardPerformanceData,
        campusChartData,
        totalPrograms: programs.length,
        monitoredCount: compliances.length
    };
  }, [programs, compliances, campuses, selectedYear]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
            <Skeleton className="h-[350px] w-full" />
        </div>
    );
  }

  if (!analytics) {
    return (
        <div className="flex flex-col items-center justify-center h-64 text-center border rounded-lg border-dashed">
            <TrendingUp className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-medium">No Program Data Available</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Register programs and encode compliance records to view university-wide analytics.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Offerings Registered</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold">{analytics.totalPrograms}</div>
                <p className="text-[10px] text-muted-foreground mt-1">Total academic degree programs</p>
            </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">Faculty Alignment</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-600">{Math.round(analytics.facultyAlignmentRate)}%</div>
                <p className="text-[10px] text-green-600/70 mt-1">Faculty meeting CMO qualifications</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Monitoring Coverage</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-amber-600">{analytics.monitoredCount}</div>
                <p className="text-[10px] text-amber-600/70 mt-1">Programs with records for {selectedYear}</p>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100">
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">COPC Rate</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                    {Math.round((analytics.copcData.find(d => d.name === 'With COPC')?.value || 0) / (analytics.totalPrograms || 1) * 100)}%
                </div>
                <p className="text-[10px] text-blue-600/70 mt-1">University-wide COPC compliance</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accreditation Maturity Chart */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle>Accreditation Maturity</CardTitle>
                </div>
                <CardDescription>Distribution of academic programs by accreditation level.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent />} />
                            <Pie
                                data={analytics.accreditationData}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                                {analytics.accreditationData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* Board Performance Chart */}
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <CardTitle>Board Performance Benchmark</CardTitle>
                </div>
                <CardDescription>Comparison of RSU's average passing rate vs. national averages.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.boardPerformanceData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis domain={[0, 100]} unit="%" />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} label={{ position: 'top', formatter: (v: number) => `${v}%` }} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* Campus Compliance Comparison */}
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle>COPC Compliance by Campus</CardTitle>
                </div>
                <CardDescription>Percentage of degree programs with active COPC certification per site.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.campusChartData} layout="vertical" margin={{ left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" domain={[0, 100]} unit="%" />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="rate" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v: number) => `${v}%` }} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
