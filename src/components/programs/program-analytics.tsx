
'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell 
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { 
    ShieldCheck, 
    Award, 
    GraduationCap, 
    TrendingUp, 
    Activity, 
    School, 
    FileCheck,
    CheckCircle2,
    XCircle,
    Clock,
    LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ProgramAnalytics({ programs, compliances, campuses, isLoading, selectedYear }: ProgramAnalyticsProps) {
  
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    // 1. Accreditation Maturity Distribution (Taking the latest record for each program)
    const accreditationCounts: Record<string, number> = {};
    compliances.forEach(c => {
      const records = c.accreditationRecords || [];
      const latest = records.length > 0 ? records[records.length - 1] : null;
      const level = latest?.level || 'Not Accredited';
      accreditationCounts[level] = (accreditationCounts[level] || 0) + 1;
    });
    
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
        if (c.faculty?.dean?.isAlignedWithCMO === 'Aligned') { totalFaculty++; alignedFaculty++; } else if (c.faculty?.dean) { totalFaculty++; }
        if (c.faculty?.programChair?.isAlignedWithCMO === 'Aligned') { totalFaculty++; alignedFaculty++; } else if (c.faculty?.programChair) { totalFaculty++; }
    });

    const facultyAlignmentRate = totalFaculty > 0 ? (alignedFaculty / totalFaculty) * 100 : 0;

    // 4. Board Performance Aggregation
    const boardPrograms = compliances.filter(c => c.boardPerformance && c.boardPerformance.length > 0);
    const averagePassRate = boardPrograms.length > 0 
        ? boardPrograms.reduce((acc, c) => acc + (c.boardPerformance?.[c.boardPerformance.length - 1]?.overallPassRate || 0), 0) / boardPrograms.length 
        : 0;
    
    const nationalAvgRate = boardPrograms.length > 0
        ? boardPrograms.reduce((acc, c) => acc + (c.boardPerformance?.[c.boardPerformance.length - 1]?.nationalPassingRate || 0), 0) / boardPrograms.length
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
  }, [programs, compliances, campusMap, selectedYear]);

  const complianceTableData = useMemo(() => {
    return programs.map(program => {
        const record = compliances.find(c => c.programId === program.id);
        const campusName = campusMap.get(program.campusId) || 'Unknown';

        let score = 0;
        const weights = {
            copc: 20,
            accreditation: 20,
            faculty: 20,
            curriculum: 20,
            outcomes: 20
        };

        let currentLevel = 'Not Accredited';

        if (record) {
            // COPC Score
            if (record.ched?.copcStatus === 'With COPC') score += weights.copc;
            else if (record.ched?.copcStatus === 'In Progress') score += (weights.copc / 2);

            // Accreditation Score
            const milestone = record.accreditationRecords?.length ? record.accreditationRecords[record.accreditationRecords.length - 1] : null;
            if (milestone?.level && milestone.level !== 'Non Accredited') {
                score += weights.accreditation;
                currentLevel = milestone.level;
            }

            // Faculty Score
            let totalF = (record.faculty?.members?.length || 0) + 2;
            let alignedF = record.faculty?.members?.filter(m => m.isAlignedWithCMO === 'Aligned').length || 0;
            if (record.faculty?.dean?.isAlignedWithCMO === 'Aligned') alignedF++;
            if (record.faculty?.programChair?.isAlignedWithCMO === 'Aligned') alignedF++;
            const fRate = totalF > 0 ? (alignedF / totalF) : 0;
            score += (fRate * weights.faculty);

            // Curriculum Score
            if (record.curriculum?.cmoLink && record.curriculum?.isNotedByChed) score += weights.curriculum;
            else if (record.curriculum?.cmoLink || record.curriculum?.isNotedByChed) score += (weights.curriculum / 2);

            // Outcomes Score
            if ((record.graduationRecords?.length || 0) > 0 || (record.tracerRecords?.length || 0) > 0) score += weights.outcomes;
        }

        return {
            id: program.id,
            name: program.name,
            campusName,
            copc: record?.ched?.copcStatus || 'No COPC',
            accreditation: currentLevel,
            contentNoted: record?.ched?.contentNoted ? 'Yes' : 'No',
            compliancePercentage: Math.round(score)
        };
    }).sort((a, b) => a.campusName.localeCompare(b.campusName) || a.name.localeCompare(b.name));
  }, [programs, compliances, campusMap]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[350px] w-full" />)}
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

  const getCopcBadge = (status: string) => {
    switch (status) {
        case 'With COPC': return <Badge className="bg-emerald-600 text-white border-none h-5 text-[9px] font-black uppercase">Yes</Badge>;
        case 'In Progress': return <Badge variant="outline" className="text-amber-600 border-amber-200 h-5 text-[9px] font-black uppercase bg-amber-50">On Process</Badge>;
        default: return <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase border-none">No</Badge>;
    }
  };

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

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight">
                        <LayoutList className="h-5 w-5 text-primary" />
                        Institutional Compliance Summary
                    </CardTitle>
                    <CardDescription className="text-xs">Consolidated maturity view of all registered degree programs for {selectedYear}.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-white font-black text-[10px] uppercase">Registry View</Badge>
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-black text-[10px] uppercase py-3 min-w-[150px]">Site / Campus</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3 min-w-[250px]">Program Offered</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3">COPC</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3">Accreditation Level</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3">Contents Noted</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6 min-w-[140px]">Maturity Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complianceTableData.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase">
                                        <School className="h-3 w-3 opacity-50" />
                                        {row.campusName}
                                    </div>
                                </TableCell>
                                <TableCell className="py-2">
                                    <span className="text-xs font-black text-slate-900 tracking-tight">{row.name}</span>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    {getCopcBadge(row.copc)}
                                </TableCell>
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-3.5 w-3.5 text-primary opacity-40" />
                                        <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{row.accreditation}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-2">
                                    {row.contentNoted === 'Yes' ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-rose-300 mx-auto" />
                                    )}
                                </TableCell>
                                <TableCell className="text-right py-2 pr-6">
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black tabular-nums">{row.compliancePercentage}%</span>
                                            <div className="w-16">
                                                <Progress value={row.compliancePercentage} className="h-1" />
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-bold uppercase text-muted-foreground opacity-60">Verified Maturity</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle>Accreditation Maturity</CardTitle>
                </div>
                <CardDescription>Distribution of academic programs by latest accreditation achievement.</CardDescription>
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
      </div>
    </div>
  );
}
