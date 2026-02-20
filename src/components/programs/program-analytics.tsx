
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
import { Skeleton } from '../ui/skeleton';
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
    LayoutList,
    ShieldCheck,
    Info,
    UserCircle,
    FileWarning,
    Briefcase,
    LayoutGrid,
    Search,
    Clock,
    BarChart3,
    CalendarDays,
    AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { useUser } from '@/firebase';
import { ScrollArea } from '../ui/scroll-area';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ProgramAnalytics({ programs, compliances, campuses, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const { userRole, isAdmin } = useUser();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  const isUnitViewer = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    // 1. Accreditation Level Summary
    const accreditationMap: Record<string, number> = {
        'Level IV Re-accredited': 0, 'Level IV Accredited': 0,
        'Level III Re-accredited': 0, 'Level III Accredited': 0,
        'Level II Re-accredited': 0, 'Level II Accredited': 0,
        'Level I Re-accredited': 0, 'Level I Accredited': 0,
        'PSV': 0, 'Non Accredited': 0, 'Not Yet Subject': 0
    };
    
    programs.forEach(p => {
        if (p.isNewProgram) {
            accreditationMap['Not Yet Subject']++;
            return;
        }

        const record = compliances.find(c => c.programId === p.id);
        if (!record || !record.accreditationRecords || record.accreditationRecords.length === 0) {
            accreditationMap['Non Accredited']++;
            return;
        }

        const milestones = record.accreditationRecords;
        const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        
        let level = latest?.level || 'Non Accredited';
        if (level.includes('Preliminary Survey Visit')) level = 'PSV';
        
        if (accreditationMap[level] !== undefined) {
            accreditationMap[level]++;
        } else {
            accreditationMap['Non Accredited']++;
        }
    });

    const accreditationSummary = Object.entries(accreditationMap)
        .filter(([_, count]) => count > 0)
        .map(([level, count]) => ({
            level,
            count,
            percentage: Math.round((count / programs.length) * 100)
        })).sort((a, b) => b.count - a.count);

    // 2. COPC Percentage Summary
    const copcWith = compliances.filter(c => c.ched?.copcStatus === 'With COPC').length;
    const copcPercentage = Math.round((copcWith / programs.length) * 100);

    // 3. Faculty Rank Distribution
    const rankMap: Record<string, number> = {};
    compliances.forEach(c => {
        const allFaculty = [
            c.faculty?.dean,
            c.faculty?.associateDean,
            c.faculty?.programChair,
            ...(c.faculty?.members || [])
        ].filter(f => f && f.name && f.name.trim() !== '');

        allFaculty.forEach(f => {
            const rank = f.academicRank || 'Unspecified';
            rankMap[rank] = (rankMap[rank] || 0) + 1;
        });
    });
    const facultyRankSummary = Object.entries(rankMap).map(([rank, count]) => ({ rank, count }))
        .sort((a, b) => b.count - a.count);

    // 4. Campus Performance Aggregation
    const campusPerformanceData = campuses.map(campus => {
        const campusPrograms = programs.filter(p => p.campusId === campus.id);
        const total = campusPrograms.length;
        
        if (total === 0) return null;

        let accreditedCount = 0;
        let copcCount = 0;

        campusPrograms.forEach(p => {
            const record = compliances.find(c => c.programId === p.id);
            if (record) {
                if (record.ched?.copcStatus === 'With COPC') copcCount++;

                if (!p.isNewProgram) {
                    const milestones = record.accreditationRecords || [];
                    const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                    if (current && current.level !== 'Non Accredited' && current.level !== 'Preliminary Survey Visit (PSV)') {
                        accreditedCount++;
                    }
                }
            }
        });

        const campusCopcPercentage = total > 0 ? Math.round((copcCount / total) * 100) : 0;
        const campusAccreditedPercentage = total > 0 ? Math.round((accreditedCount / total) * 100) : 0;

        return {
            id: campus.id,
            name: campus.name,
            offeringCount: total,
            accreditedCount,
            accreditedPercentage: campusAccreditedPercentage,
            copcCount,
            copcPercentage: campusCopcPercentage
        };
    }).filter(Boolean).sort((a: any, b: any) => b.offeringCount - a.offeringCount);

    // 5. Missing Document Audit
    const missingDocs: { programName: string, campusName: string, items: string[] }[] = [];
    programs.forEach(p => {
        const record = compliances.find(c => c.programId === p.id);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const items: string[] = [];

        if (!record) {
            items.push(`Full AY ${selectedYear} Compliance Data`);
        } else {
            if (record.ched?.copcStatus !== 'With COPC') items.push("COPC Certificate");
            if (!record.ched?.programCmoLink) items.push("Official CMO Link");
            
            if (!p.isNewProgram) {
                if (!record.accreditationRecords || record.accreditationRecords.length === 0) items.push("Accreditation Milestone");
            }
            
            if (!record.faculty?.members || record.faculty.members.length === 0) items.push("Faculty Staffing List");
            if (!record.graduationRecords || record.graduationRecords.length === 0) items.push("Graduation Outcome Data");
        }

        if (items.length > 0) {
            missingDocs.push({ programName: p.name, campusName, items });
        }
    });

    // 6. Accreditation Roadmap Calculation
    const now = new Date();
    const currentYear = now.getFullYear();

    const roadmapData = programs.map(p => {
        const record = compliances.find(c => c.programId === p.id);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        
        if (!record || !record.accreditationRecords || record.accreditationRecords.length === 0) {
            return {
                id: p.id,
                name: p.name,
                campusName,
                level: p.isNewProgram ? 'Not Yet Subject' : 'Non Accredited',
                validityText: 'No schedule logged',
                status: 'Unscheduled'
            };
        }

        const latest = record.accreditationRecords.find(m => m.lifecycleStatus === 'Current') || record.accreditationRecords[record.accreditationRecords.length - 1];
        
        // Automated Warning: Try to parse year from validity text
        const yearMatch = latest.statusValidityDate?.match(/\d{4}/);
        const detectedYear = yearMatch ? parseInt(yearMatch[0]) : 0;

        let status = 'Scheduled';
        if (detectedYear > 0) {
            if (detectedYear < currentYear) {
                status = 'Overdue';
            } else if (detectedYear === currentYear) {
                status = 'Upcoming';
            }
        } else {
            status = 'Unscheduled';
        }

        return {
            id: p.id,
            name: p.name,
            campusName,
            level: latest.level, 
            validityText: latest.statusValidityDate || 'No schedule set',
            status
        };
    })
    .filter(item => item.level !== 'Not Yet Subject')
    .sort((a, b) => {
        if (a.status === 'Overdue' && b.status !== 'Overdue') return -1;
        if (b.status === 'Overdue' && a.status !== 'Overdue') return 1;
        return a.name.localeCompare(b.name);
    });

    return { 
        accreditationSummary, 
        copcPercentage, 
        facultyRankSummary, 
        campusPerformanceData,
        missingDocs,
        roadmapData,
        totalPrograms: programs.length, 
        monitoredCount: compliances.length 
    };
  }, [programs, compliances, campusMap, selectedYear, campuses]);

  const complianceTableData = useMemo(() => {
    return programs.map(program => {
        const record = compliances.find(c => c.programId === program.id);
        const campusName = campusMap.get(program.campusId) || 'Unknown';

        let score = 0;
        let accreditationDisplay = program.isNewProgram ? 'Not Yet Subject' : 'Not Accredited';

        if (record) {
            if (record.ched?.copcStatus === 'With COPC') score += 20;
            else if (record.ched?.copcStatus === 'In Progress') score += 10;

            const milestones = record.accreditationRecords || [];
            
            if (program.hasSpecializations && program.specializations) {
                const majorResults = program.specializations.map(spec => {
                    const milestone = milestones.find(m => m.lifecycleStatus === 'Current' && m.components?.some(c => c.id === spec.id));
                    if (milestone) return `${spec.name}: ${milestone.level}`;
                    return program.isNewProgram ? `${spec.name}: Not Yet Subject` : `${spec.name}: Non Accredited`;
                });
                accreditationDisplay = majorResults.join('; ');
                
                if (program.isNewProgram) score += 20;
                else if (milestones.some(m => m.level !== 'Non Accredited')) score += 20;
            } else {
                const latest = milestones.length > 0 ? milestones[milestones.length - 1] : null;
                if (latest?.level && latest.level !== 'Non Accredited') {
                    score += 20;
                    accreditationDisplay = latest.level;
                } else if (program.isNewProgram) {
                    score += 20;
                }
            }

            const hasFaculty = (record.faculty?.members?.length || 0) > 0 || (record.faculty?.dean?.name && record.faculty.dean.name.trim() !== '');
            if (hasFaculty) score += 20;
            
            if (record.ched?.programCmoLink) score += 20;
            if (record.graduationRecords && record.graduationRecords.length > 0) score += 20;
        }

        return {
            id: program.id,
            name: program.name,
            campusName,
            copc: record?.ched?.copcStatus || 'No COPC',
            accreditation: accreditationDisplay,
            compliancePercentage: Math.round(score),
            isNew: program.isNewProgram
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
      <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center">
            <div className="p-6 flex items-center gap-4 bg-primary text-white md:w-72 shrink-0">
                <UserCircle className="h-10 w-10 opacity-80" />
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70">User Perspective</p>
                    <p className="font-bold text-sm">{isAdmin ? 'Institutional Admin' : isCampusSupervisor ? 'Campus Director' : 'Unit Coordinator'}</p>
                </div>
            </div>
            <div className="p-6 flex-1 bg-white/50 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                        <p className="text-xs font-black uppercase text-primary tracking-tight">Strategic Decision Support Hub</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {isAdmin && "University-wide overview focused on quality parity. Monitor cross-campus metrics to identify systemic accreditation gaps or regulatory non-compliances."}
                            {isCampusSupervisor && "Site-specific monitoring. Focus on the compliance scores of academic units within your campus to ensure resource sufficiency and accreditation health."}
                            {isUnitViewer && "Unit-level operations. Track your program's verified status against institutional targets. Ensure all evidence documents are updated for audit cycles."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><LayoutGrid className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Programs Offered</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-black text-primary tabular-nums">{analytics?.totalPrograms}</div></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">COPC Rate</CardTitle>
            </CardHeader>
            <CardContent><div className="text-3xl font-black text-green-600 tabular-nums">{analytics?.copcPercentage}%</div></CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldCheck className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Accredited (Min L1)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-amber-600 tabular-nums">
                    {analytics?.accreditationSummary.filter(s => s.level.includes('Level')).reduce((acc, curr) => acc + curr.count, 0)}
                </div>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Briefcase className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Faculty Baseline</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-blue-600 tabular-nums">
                    {analytics?.facultyRankSummary.reduce((a, b) => a + b.count, 0)}
                </div>
            </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Performance Matrix</CardTitle>
            </div>
            <CardDescription className="text-xs">Institutional parity overview across university campuses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Site / Campus</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3"># of Program Offering</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3"># of Accredited Programs</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">COPC Compliance</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.campusPerformanceData.map((campus: any) => (
                            <TableRow key={campus.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-3 pl-6">
                                    <div className="flex items-center gap-2">
                                        <School className="h-4 w-4 text-primary opacity-60" />
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{campus.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge variant="outline" className="font-black text-slate-600 border-slate-200">{campus.offeringCount}</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <span className="text-xs font-black text-primary">{campus.accreditedCount} / {campus.offeringCount} ({campus.accreditedPercentage}%)</span>
                                        <div className="w-16"><Progress value={campus.accreditedPercentage} className="h-1" /></div>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs font-black text-emerald-600">{campus.copcCount} ({campus.copcPercentage}%)</span>
                                        <div className="w-16"><Progress value={campus.copcPercentage} className="h-1" /></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg border-primary/10 overflow-hidden">
        <CardHeader className="bg-primary/5 border-b py-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Accreditation Roadmap</CardTitle>
                </div>
                <Badge variant="outline" className="bg-white border-primary/20 text-primary font-black text-[9px] uppercase">Strategic Timeline</Badge>
            </div>
            <CardDescription className="text-xs">Timeline of target survey dates across all sites to facilitate audit planning and budgetary decisions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Campus / Site</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3">Academic Program</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3">Current Level</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3 text-center">Next Target Schedule</TableHead>
                            <TableHead className="font-black text-[10px] uppercase py-3 text-right pr-6">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.roadmapData.map((item: any) => (
                            <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-3 pl-6">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                        <School className="h-3 w-3 opacity-40" />
                                        {item.campusName}
                                    </div>
                                </TableCell>
                                <TableCell className="py-3">
                                    <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                </TableCell>
                                <TableCell className="py-3">
                                    <Badge variant="secondary" className="bg-muted text-[10px] font-medium border-none">{item.level}</Badge>
                                </TableCell>
                                <TableCell className="text-center py-3">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-primary tabular-nums uppercase">{item.validityText}</span>
                                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter">Planned Horizon</span>
                                    </div>
                                </TableCell>
                                <TableCell className="py-3 text-right pr-6">
                                    <Badge 
                                        className={cn(
                                            "text-[9px] font-black uppercase h-5 px-2 border-none shadow-sm",
                                            item.status === 'Overdue' ? "bg-rose-600 text-white animate-pulse" : 
                                            item.status === 'Upcoming' ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                                        )}
                                    >
                                        {item.status === 'Overdue' && <AlertTriangle className="h-2 w-2 mr-1" />}
                                        {item.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md border-primary/10">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Registry</CardTitle>
                </div>
                <CardDescription className="text-xs">Summary of program status across the accreditation lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase">Level</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase">Total Programs</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Percentage</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.accreditationSummary.map((item) => (
                            <TableRow key={item.level}>
                                <TableCell className="text-xs font-bold text-slate-700 py-3">
                                    <div className="flex items-center gap-2">
                                        {item.level === 'Not Yet Subject' ? <Clock className="h-3 w-3 text-amber-500" /> : <ShieldCheck className="h-3 w-3 text-primary" />}
                                        {item.level}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center font-black tabular-nums text-primary">{item.count}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-[10px] font-black">{item.percentage}%</span>
                                        <div className="w-16"><Progress value={item.percentage} className={cn("h-1", item.level === 'Not Yet Subject' ? "bg-amber-100" : "")} /></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card className="shadow-md border-primary/10">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Faculty Resource Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Academic rank distribution across monitored offerings.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="text-[10px] font-black uppercase">Academic Rank</TableHead>
                            <TableHead className="text-right text-[10px] font-black uppercase pr-6">Number of Faculty</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.facultyRankSummary.map((item) => (
                            <TableRow key={item.rank}>
                                <TableCell className="text-xs font-bold text-slate-700 py-3">{item.rank}</TableCell>
                                <TableCell className="text-right pr-6">
                                    <Badge variant="outline" className="font-black text-primary tabular-nums h-6 px-3">{item.count}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                        {analytics?.facultyRankSummary.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground italic text-xs">No faculty data available for this period.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden">
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <LayoutList className="h-5 w-5 text-primary" />
                    Maturity Matrix
                </CardTitle>
                <CardDescription className="text-xs font-medium">Compliance performance for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase py-3">Site</TableHead>
                                <TableHead className="font-black text-[10px] uppercase py-3">Program Offering</TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase py-3">COPC</TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">Maturity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {complianceTableData.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-2"><div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase"><School className="h-3 w-3 opacity-50" />{row.campusName}</div></TableCell>
                                    <TableCell className="py-2">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-black text-slate-900 tracking-tight">{row.name}</span>
                                            {row.isNew && <span className="text-[8px] font-black text-amber-600 uppercase tracking-tighter">New Program Offering</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center py-2">{getCopcBadge(row.copc)}</TableCell>
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

        <Card className="shadow-md border-destructive/30 bg-destructive/5 overflow-hidden">
            <CardHeader className="bg-destructive/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5 text-destructive" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-destructive">Institutional Gaps</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold text-destructive/70">Missing or unsubmitted evidence required for parity.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                    <div className="divide-y divide-destructive/10">
                        {analytics?.missingDocs.map((doc, idx) => (
                            <div key={idx} className="p-4 space-y-2 hover:bg-white/50 transition-colors">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-slate-900 leading-tight truncate" title={doc.programName}>{doc.programName}</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{doc.campusName}</p>
                                    </div>
                                    <Badge variant="destructive" className="h-4 text-[8px] font-black px-1.5">{doc.items.length} GAPS</Badge>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {doc.items.map(item => (
                                        <Badge key={item} variant="outline" className="text-[8px] h-4 py-0 border-destructive/20 text-destructive bg-white">{item}</Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {analytics?.missingDocs.length === 0 && (
                            <div className="py-24 text-center px-6">
                                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto opacity-20 mb-3" />
                                <p className="text-xs font-black uppercase text-slate-400">All Requirements Met</p>
                                <p className="text-[10px] text-muted-foreground mt-1">No missing documentation detected across all active academic offerings.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
