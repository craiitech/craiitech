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
    Cell,
    PieChart,
    Pie 
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
    Award, 
    TrendingUp, 
    Activity, 
    School, 
    CheckCircle2,
    XCircle,
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

    const accreditationCounts: Record<string, number> = {};
    compliances.forEach(c => {
      const records = c.accreditationRecords || [];
      const latest = records.length > 0 ? records[records.length - 1] : null;
      const level = latest?.level || 'Not Accredited';
      accreditationCounts[level] = (accreditationCounts[level] || 0) + 1;
    });
    
    const accreditationData = Object.entries(accreditationCounts).map(([name, value]) => ({ name, value }));

    const copcCounts = {
        'With COPC': compliances.filter(c => c.ched?.copcStatus === 'With COPC').length,
        'No COPC': programs.length - compliances.filter(c => c.ched?.copcStatus === 'With COPC').length,
        'In Progress': compliances.filter(c => c.ched?.copcStatus === 'In Progress').length,
    };
    const copcData = Object.entries(copcCounts).map(([name, value]) => ({ name, value }));

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

    return { accreditationData, copcData, boardPerformanceData, campusChartData, totalPrograms: programs.length, monitoredCount: compliances.length };
  }, [programs, compliances, campusMap, selectedYear]);

  const complianceTableData = useMemo(() => {
    return programs.map(program => {
        const record = compliances.find(c => c.programId === program.id);
        const campusName = campusMap.get(program.campusId) || 'Unknown';

        let score = 0;
        let accreditationDisplay = 'Not Accredited';

        if (record) {
            if (record.ched?.copcStatus === 'With COPC') score += 20;
            else if (record.ched?.copcStatus === 'In Progress') score += 10;

            const milestones = record.accreditationRecords || [];
            
            // LOGIC: Map accreditation to results by major
            if (program.hasSpecializations && program.specializations) {
                const majorResults = program.specializations.map(spec => {
                    const milestone = milestones.find(m => m.lifecycleStatus === 'Current' && m.components?.some(c => c.id === spec.id));
                    return milestone ? `${spec.name}: ${milestone.result || milestone.level}` : `${spec.name}: Non Accredited`;
                });
                accreditationDisplay = majorResults.join('; ');
                if (milestones.some(m => m.level !== 'Non Accredited')) score += 20;
            } else {
                const latest = milestones.length > 0 ? milestones[milestones.length - 1] : null;
                if (latest?.level && latest.level !== 'Non Accredited') {
                    score += 20;
                    accreditationDisplay = latest.result || latest.level;
                }
            }

            if (record.faculty?.members?.length > 0) score += 20;
            if (record.curriculum?.cmoLink && record.curriculum?.isNotedByChed) score += 20;
            if (record.graduationRecords?.length > 0) score += 20;
        }

        return {
            id: program.id,
            name: program.name,
            campusName,
            copc: record?.ched?.copcStatus || 'No COPC',
            accreditation: accreditationDisplay,
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

  const getCopcBadge = (status: string) => {
    switch (status) {
        case 'With COPC': return <Badge className="bg-emerald-600 text-white border-none h-5 text-[9px] font-black uppercase">Yes</Badge>;
        case 'In Progress': return <Badge variant="outline" className="text-amber-600 border-amber-200 h-5 text-[9px] font-black uppercase bg-amber-50">On Process</Badge>;
        default: return <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase border-none">No</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Offerings Registered</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{analytics?.totalPrograms}</div></CardContent></Card>
        <Card className="bg-green-50 border-green-100"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">Monitoring Coverage</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-green-600">{analytics?.monitoredCount}</div></CardContent></Card>
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2 font-black uppercase tracking-tight"><LayoutList className="h-5 w-5 text-primary" />Institutional Compliance Summary</CardTitle>
                    <CardDescription className="text-xs">Maturity view across all degree programs and majors for {selectedYear}.</CardDescription>
                </div>
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
                            <TableHead className="font-black text-[10px] uppercase py-3">Accreditation Result (by Major)</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3">Contents Noted</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">Score</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {complianceTableData.map((row) => (
                            <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-2"><div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 uppercase"><School className="h-3 w-3 opacity-50" />{row.campusName}</div></TableCell>
                                <TableCell className="py-2"><span className="text-xs font-black text-slate-900 tracking-tight">{row.name}</span></TableCell>
                                <TableCell className="text-center py-2">{getCopcBadge(row.copc)}</TableCell>
                                <TableCell className="py-2">
                                    <div className="flex items-center gap-2">
                                        <Award className="h-3.5 w-3.5 text-primary opacity-40 shrink-0" />
                                        <span className="text-[10px] font-bold text-slate-700 leading-snug">{row.accreditation}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center py-2">{row.contentNoted === 'Yes' ? <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" /> : <XCircle className="h-4 w-4 text-rose-300 mx-auto" />}</TableCell>
                                <TableCell className="text-right py-2 pr-6">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black tabular-nums">{row.compliancePercentage}%</span>
                                        <div className="w-16"><Progress value={row.compliancePercentage} className="h-1" /></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
