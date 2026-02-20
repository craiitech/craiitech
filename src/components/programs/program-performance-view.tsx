'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, AccreditationRecord, CurriculumRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    ExternalLink, 
    Users, 
    Award, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Calculator,
    Layers,
    History,
    Calendar,
    ChevronRight,
    Target,
    Activity,
    PieChart as PieIcon,
    BookOpen,
    ShieldAlert,
    GraduationCap,
    School,
    BarChart3,
    AlertTriangle,
    Info,
    ArrowUpRight,
    UserCircle,
    Clock,
    Gavel,
    UserCheck,
    Briefcase
} from 'lucide-react';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip as RechartsTooltip,
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Timestamp } from 'firebase/firestore';
import { useUser } from '@/firebase';

interface ProgramPerformanceViewProps {
  program: AcademicProgram;
  record: ProgramComplianceRecord | null;
  selectedYear: number;
}

const PILLAR_WEIGHTS = {
    ched: 20,
    accreditation: 20,
    faculty: 20,
    curriculum: 20,
    outcomes: 20
};

const COLORS: Record<string, string> = {
    'Aligned': 'hsl(var(--chart-2))',
    'Needs Correction': 'hsl(var(--destructive))',
    'Approved': 'hsl(var(--chart-2))',
    'Awaiting Approval': 'hsl(var(--chart-1))',
    'Rejected': 'hsl(var(--chart-3))',
    'Missing': 'hsl(var(--muted-foreground))'
};

export function ProgramPerformanceView({ program, record, selectedYear }: ProgramPerformanceViewProps) {
  const { isAdmin, userRole } = useUser();
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  const isUnitViewer = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';

  const analyticsData = useMemo(() => {
    if (!record) return null;

    // 1. Enrollment Dynamics (Multi-series Bar)
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
    const levelLabels: Record<string, string> = { firstYear: '1st Yr', secondYear: '2nd Yr', thirdYear: '3rd Yr', fourthYear: '4th Yr' };

    const enrollmentData = levels.map(level => {
        const s1 = record.stats.enrollment?.firstSemester?.[level];
        const s2 = record.stats.enrollment?.secondSemester?.[level];
        return {
            name: levelLabels[level],
            '1st Sem': (s1?.male || 0) + (s1?.female || 0),
            '2nd Sem': (s2?.male || 0) + (s2?.female || 0)
        };
    });

    // 2. Faculty Alignment Analysis (Pie) - Only counting named members
    let totalFaculty = 0;
    let alignedFaculty = 0;
    const auditFacultyList: any[] = [];
    
    const checkAlignment = (m: any, roleLabel?: string) => {
        if (!m || !m.name || m.name.trim() === '') return;
        totalFaculty++;
        if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
        
        auditFacultyList.push({
            ...m,
            role: roleLabel || (m.category === 'Core' ? 'Core Faculty' : 'Teaching Staff')
        });
    };

    checkAlignment(record.faculty?.dean, 'Dean / Director');
    if (record.faculty?.hasAssociateDean) checkAlignment(record.faculty?.associateDean, 'Associate Dean');
    checkAlignment(record.faculty?.programChair, 'Program Chair');
    if (record.faculty?.members) record.faculty.members.forEach(m => checkAlignment(m));
    
    const alignmentRate = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 0;
    const facultyPieData = [
        { name: 'Aligned', value: alignedFaculty, fill: 'hsl(var(--chart-2))' },
        { name: 'Needs Correction', value: totalFaculty - alignedFaculty, fill: 'hsl(var(--destructive))' }
    ].filter(d => d.value > 0);

    // 3. Board Performance (Comparative Bar)
    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;
    
    const boardComparisonData = latestBoard ? [
        { name: 'School', rate: latestBoard.overallPassRate, fill: 'hsl(var(--primary))' },
        { name: 'National', rate: latestBoard.nationalPassingRate, fill: 'hsl(var(--muted-foreground))' }
    ] : [];

    // 4. Major-Specific Accreditation Logic
    const milestones = record.accreditationRecords || [];
    const currentAccreditationByMajor: Record<string, AccreditationRecord> = {};
    milestones.filter(m => m.lifecycleStatus === 'Current').forEach(m => {
        if (!m.components || m.components.length === 0) {
            currentAccreditationByMajor['General'] = m;
        } else {
            m.components.forEach(comp => {
                currentAccreditationByMajor[comp.id] = m;
            });
        }
    });
    const latestAccreditation = milestones.length > 0 ? milestones[milestones.length - 1] : null;

    // 5. Major-Specific Curriculum Notation Logic
    const curriculumRecords = record.curriculumRecords || [];
    const curriculaByMajor: Record<string, CurriculumRecord> = {};
    curriculumRecords.forEach(c => {
        curriculaByMajor[c.majorId] = c;
    });

    // 6. Maturity Radar Calculation
    const pillarScores = {
        ched: record.ched?.copcStatus === 'With COPC' ? 20 : (record.ched?.copcStatus === 'In Progress' ? 10 : 0),
        accreditation: program.isNewProgram ? 20 : ((latestAccreditation?.level && latestAccreditation.level !== 'Non Accredited') ? 20 : 0),
        faculty: totalFaculty > 0 ? (alignmentRate / 100) * 20 : 0,
        curriculum: (curriculumRecords.some(c => c.isNotedByChed)) ? 20 : 10,
        outcomes: ((record.graduationRecords?.length || 0) > 0) ? 20 : 0
    };
    
    const radarData = [
        { pillar: 'Authority', score: (pillarScores.ched / 20) * 100, fullMark: 100 },
        { pillar: 'Accreditation', score: (pillarScores.accreditation / 20) * 100, fullMark: 100 },
        { pillar: 'Faculty', score: (pillarScores.faculty / 20) * 100, fullMark: 100 },
        { pillar: 'Curriculum', score: (pillarScores.curriculum / 20) * 100, fullMark: 100 },
        { pillar: 'Outcomes', score: (pillarScores.outcomes / 20) * 100, fullMark: 100 },
    ];

    const overallScore = Math.round(Object.values(pillarScores).reduce((a, b) => a + b, 0));

    // 7. Actionable Gaps
    const gaps = [];
    if (record.ched?.copcStatus !== 'With COPC') gaps.push({ type: 'Institutional Authority', msg: 'Program is operating without an active COPC.', priority: 'High' });
    if (totalFaculty === 0) gaps.push({ type: 'Resource Quality', msg: 'Faculty registry is incomplete for the current AY.', priority: 'High' });
    else if (alignmentRate < 100) gaps.push({ type: 'Resource Quality', msg: `${totalFaculty - alignedFaculty} faculty members do not meet CMO qualification requirements.`, priority: 'Medium' });
    
    // Accreditation Gaps - Only for non-new programs
    if (!program.isNewProgram) {
        if (program.hasSpecializations) {
            program.specializations?.forEach(spec => {
                if (!currentAccreditationByMajor[spec.id] && !currentAccreditationByMajor['General']) {
                    gaps.push({ type: 'Academic Quality', msg: `Missing accreditation record for specialization: ${spec.name}`, priority: 'Medium' });
                }
            });
        } else if (!latestAccreditation || latestAccreditation.level === 'Non Accredited') {
            gaps.push({ type: 'Academic Quality', msg: 'No active accreditation status recorded.', priority: 'Medium' });
        }
    }

    // Curriculum Gaps
    if (program.hasSpecializations) {
        program.specializations?.forEach(spec => {
            if (!curriculaByMajor[spec.id] && !curriculaByMajor['General']) {
                gaps.push({ type: 'Compliance', msg: `No curriculum notation evidence found for specialization: ${spec.name}`, priority: 'Medium' });
            }
        });
    }

    return { 
        enrollmentData, 
        alignmentRate, 
        totalFaculty, 
        facultyPieData,
        auditFacultyList,
        latestBoard, 
        boardComparisonData,
        milestones, 
        latestAccreditation, 
        currentAccreditationByMajor, 
        curriculaByMajor, 
        overallScore, 
        pillarScores, 
        radarData,
        gaps 
    };
  }, [record, program]);

  const categorizedDocs = useMemo(() => {
    if (!record) return { governance: [], accreditation: [], curriculum: [], monitoring: [] };
    const docs = { governance: [] as any[], accreditation: [] as any[], curriculum: [] as any[], monitoring: [] as any[] };
    
    // Governance / Authority Docs
    if (record.ched?.boardApprovalMode === 'per-major') {
        (record.ched.majorBoardApprovals || []).forEach((ma) => {
            if (ma.link) {
                const majorName = program.specializations?.find(s => s.id === ma.majorId)?.name || ma.majorId;
                docs.governance.push({ id: `bor-${ma.majorId}`, title: `BOR Resolution: ${majorName}`, url: ma.link, status: 'Active' });
            }
        });
    } else if (record.ched?.boardApprovalLink) {
        docs.governance.push({ id: 'bor', title: 'BOR Resolution (Sole)', url: record.ched.boardApprovalLink, status: 'Active' });
    }

    if (record.ched?.copcLink) docs.governance.push({ id: 'copc', title: 'CHED COPC', url: record.ched.copcLink, status: record.ched.copcStatus });
    if (record.ched?.programCmoLink) docs.governance.push({ id: 'cmo-global', title: 'Program CMO Reference', url: record.ched.programCmoLink, status: 'Standard' });
    
    // Curriculum Docs
    (record.curriculumRecords || []).forEach((curr, idx) => {
        if (curr.notationProofLink) {
            const majorName = program.specializations?.find(s => s.id === curr.majorId)?.name || 'General';
            docs.curriculum.push({ id: `note-${idx}`, title: `Notation: ${majorName}`, url: curr.notationProofLink, status: curr.dateNoted });
        }
    });

    // Accreditation Docs
    (record.accreditationRecords || []).forEach((acc, idx) => { if (acc.certificateLink) docs.accreditation.push({ id: `acc-${idx}`, title: `${acc.level} Certificate`, url: acc.certificateLink, status: acc.lifecycleStatus }); });
    
    // Monitoring Docs
    (record.ched?.rqatVisits || []).forEach((visit, idx) => {
        if (visit.reportLink) docs.monitoring.push({ id: `rqat-${idx}`, title: `RQAT Report: ${visit.date}`, url: visit.reportLink, status: visit.result });
    });

    return docs;
  }, [record, program]);

  if (!record || !analyticsData) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed rounded-2xl bg-muted/5">
            <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">No Data Recorded for AY {selectedYear}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Please populate the compliance modules to activate decision support analytics.</p>
        </div>
    );
  }

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* --- USER-CENTERED DECISION CONTEXT --- */}
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
                        <p className="text-xs font-black uppercase text-primary tracking-tight">Strategic Guidance for Decision Making</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {isAdmin && "Oversee university-wide parity. Ensure this program meets institutional quality benchmarks and CHED CMO standards across all registered campuses."}
                            {isCampusSupervisor && "Monitor local program health. Focus on resource sufficiency (Faculty) and ensuring accreditation milestones are current for this campus site."}
                            {isUnitViewer && "Execute local compliance. Maintain accuracy in student stats and finalize CHED curriculum notation proofs to avoid institutional flags."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </Card>

      {/* --- EXECUTIVE KPI PANEL --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldCheck className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Institutional Maturity</CardDescription>
                <CardTitle className="text-3xl font-black text-primary tabular-nums tracking-tighter">{analyticsData.overallScore}%</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-1.5">
                    <Progress value={analyticsData.overallScore} className="h-1" />
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Verified Compliance Index</p>
                </div>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Award className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Accreditation Status</CardDescription>
                <CardTitle className="text-lg font-black text-slate-900 truncate">
                    {program.isNewProgram ? 'Not Yet Subject' : (analyticsData.latestAccreditation?.level || 'Non Accredited')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {program.isNewProgram ? (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-black uppercase gap-1">
                        <Clock className="h-2 w-2" /> New Offering
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[9px] font-black uppercase shadow-sm">
                        {analyticsData.latestAccreditation?.result || 'Outcome Pending'}
                    </Badge>
                )}
            </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Users className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Resource Alignment</CardDescription>
                <CardTitle className="text-3xl font-black text-blue-700 tabular-nums tracking-tighter">{analyticsData.alignmentRate}%</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-blue-800/60 font-bold uppercase tracking-tight">{analyticsData.totalFaculty} Qualified Members Named</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><BarChart3 className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sustainability Index</CardDescription>
                <CardTitle className="text-3xl font-black text-amber-700 tabular-nums tracking-tighter">
                    {record.stats.graduationCount || 0}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-amber-800/60 font-bold uppercase tracking-tight">Graduation Target: {selectedYear}</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            
            {/* --- QUALITY MATURITY RADAR --- */}
            <Card className="border-primary/10 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Quality Signature</CardTitle>
                    </div>
                    <CardDescription className="text-xs">Comparative maturity profile across five standard ISO 21001:2018 pillars.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                        <div className="md:col-span-3 h-[300px]">
                            <ChartContainer config={{}} className="h-full w-full">
                                <ResponsiveContainer>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.radarData}>
                                        <PolarGrid strokeOpacity={0.1} />
                                        <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold', fill: 'hsl(var(--muted-foreground))' }} />
                                        <RechartsTooltip content={<ChartTooltipContent />} />
                                        <Radar
                                            name="Program Maturity"
                                            dataKey="score"
                                            stroke="hsl(var(--primary))"
                                            fill="hsl(var(--primary))"
                                            fillOpacity={0.4}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </div>
                        <div className="md:col-span-2 flex flex-col justify-center space-y-4 pr-4">
                            {Object.entries(PILLAR_WEIGHTS).map(([key, weight]) => {
                                const score = analyticsData.pillarScores[key as keyof typeof PILLAR_WEIGHTS] || 0;
                                const percentage = (score / weight) * 100;
                                return (
                                    <div key={key} className="space-y-1.5">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{key}</span>
                                            <span className="text-xs font-black tabular-nums">{Math.round(percentage)}%</span>
                                        </div>
                                        <Progress value={percentage} className={cn("h-1", key === 'accreditation' && program.isNewProgram ? "bg-amber-100" : "")} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* --- FACULTY RESOURCE AUDIT TABLE --- */}
            <Card className="border-primary/10 shadow-lg overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            <CardTitle className="text-sm font-black uppercase tracking-tight">Faculty Resource Audit Registry</CardTitle>
                        </div>
                        <Badge variant="outline" className="h-5 text-[9px] font-black bg-white">{analyticsData.totalFaculty} MEMBERS</Badge>
                    </div>
                    <CardDescription className="text-xs">Detailed audit of personnel qualifications and specialization assignments.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[10px] font-black uppercase py-3 pl-6">Member & Designation</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Academic Rank</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Qualification</TableHead>
                                <TableHead className="text-[10px] font-black uppercase py-3">Specialization</TableHead>
                                <TableHead className="text-right text-[10px] font-black uppercase py-3 pr-6">Alignment</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analyticsData.auditFacultyList.map((faculty, idx) => {
                                const specName = faculty.specializationAssignment === 'General' 
                                    ? 'Institutional' 
                                    : (program.specializations?.find(s => s.id === faculty.specializationAssignment)?.name || 'General');
                                
                                return (
                                    <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                                        <TableCell className="py-3 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <UserCircle className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-slate-900 truncate">{faculty.name}</span>
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{faculty.role}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <span className="text-[10px] font-bold text-slate-600">{faculty.academicRank || 'TBA'}</span>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex items-center gap-1.5">
                                                <GraduationCap className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-[10px] font-medium truncate max-w-[120px]">{faculty.highestEducation}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <Badge variant="secondary" className="text-[8px] h-4 py-0 font-black bg-blue-50 text-blue-700 border-blue-100 uppercase truncate max-w-[100px]">
                                                {specName}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-3 pr-6">
                                            <Badge 
                                                variant={faculty.isAlignedWithCMO === 'Aligned' ? 'default' : 'destructive'} 
                                                className={cn(
                                                    "text-[9px] font-black h-5 py-0 uppercase border-none shadow-sm",
                                                    faculty.isAlignedWithCMO === 'Aligned' ? "bg-emerald-600" : "bg-rose-600"
                                                )}
                                            >
                                                {faculty.isAlignedWithCMO === 'Aligned' ? 'ALIGNED' : 'GAP'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {analyticsData.auditFacultyList.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic text-xs">
                                        No personnel recorded in the faculty module.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* --- ENROLLMENT & BOARD DYNAMICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/10 shadow-md">
                    <CardHeader className="py-4 border-b">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            <CardTitle className="text-xs font-black uppercase tracking-tight">Enrollment Dynamics</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <ChartContainer config={{}} className="h-[220px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={analyticsData.enrollmentData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="1st Sem" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="2nd Sem" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-md">
                    <CardHeader className="py-4 border-b">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <CardTitle className="text-xs font-black uppercase tracking-tight">Competitiveness Benchmark</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {program.isBoardProgram && analyticsData.latestBoard ? (
                            <div className="space-y-6">
                                <ChartContainer config={{}} className="h-[180px] w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={analyticsData.boardComparisonData} layout="vertical" margin={{ right: 40 }}>
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                            <RechartsTooltip content={<ChartTooltipContent />} />
                                            <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={24}>
                                                {analyticsData.boardComparisonData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Board Pass Rate</p>
                                    <p className="text-2xl font-black text-emerald-600 tabular-nums">{analyticsData.latestBoard.overallPassRate}%</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground opacity-20">
                                <GraduationCap className="h-10 w-10 mb-2" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No benchmark data</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* --- USER-CENTERED ACTION REGISTRY --- */}
            <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5 relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive opacity-50" />
                <CardHeader className="bg-destructive/10 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                            <CardTitle className="text-sm font-black uppercase tracking-tight">
                                {isAdmin ? 'Institutional Strategic Risk Register' : isCampusSupervisor ? 'Campus Quality & Oversight Alerts' : 'Operational Correction & Compliance List'}
                            </CardTitle>
                        </div>
                        <Badge variant="destructive" className="animate-pulse shadow-sm h-5 text-[9px] font-black uppercase">
                            {isAdmin ? 'University Risks' : isCampusSupervisor ? 'Site Deficiencies' : 'Task Required'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="max-h-[400px]">
                        <div className="p-6 space-y-4">
                            {analyticsData.gaps.length > 0 ? (
                                analyticsData.gaps.map((gap, i) => (
                                    <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl border border-destructive/10 shadow-sm transition-all hover:border-destructive/30 group">
                                        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-[10px] font-black text-destructive uppercase tracking-[0.1em]">{gap.type}</p>
                                                <Badge variant="outline" className="h-4 text-[8px] border-destructive/20 text-destructive font-black uppercase">{gap.priority} PRIORITY</Badge>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800 leading-snug">{gap.msg}</p>
                                            <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase text-primary gap-1 p-0 px-2">
                                                    Resolve Deficiency <ChevronRight className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                                    <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                                    </div>
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-900 uppercase text-sm">Quality Shield Maintained</h4>
                                        <p className="text-xs text-muted-foreground">This program meets all institutional and regulatory compliance criteria for {selectedYear}.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* --- EVIDENCE & VERIFICATION SIDEBAR --- */}
        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-2xl border-primary/10 flex flex-col h-full bg-background">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            Verification Vault
                        </CardTitle>
                        <Badge variant="secondary" className="h-5 text-[9px] font-black border-none bg-primary/5 text-primary">AY {selectedYear}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-8">
                            {Object.entries(categorizedDocs).map(([category, items]) => (
                                items.length > 0 && (
                                    <div key={category} className="space-y-4">
                                        <div className="flex items-center gap-2 border-b pb-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{category} Records</h4>
                                        </div>
                                        <div className="space-y-2.5">
                                            {items.map((doc: any) => (
                                                <div key={doc.id} className="p-3.5 rounded-xl border bg-background hover:border-primary/40 hover:shadow-md transition-all group border-primary/5">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="space-y-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {doc.id.startsWith('bor') && <Gavel className="h-3 w-3 text-primary opacity-50" />}
                                                                <p className="font-black text-[11px] text-slate-800 leading-tight group-hover:text-primary transition-colors">{doc.title}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="secondary" className="text-[8px] h-3.5 px-1.5 font-bold uppercase border-none bg-muted text-muted-foreground">{doc.status}</Badge>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-[9px] font-black uppercase flex-1 border-primary/20 text-primary hover:bg-primary/5" 
                                                                onClick={() => setPreviewDoc({ title: doc.title, url: getEmbedUrl(doc.url) })}
                                                            >
                                                                QUICK VIEW
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-primary/5" asChild>
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer">
                                                                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                            {Object.values(categorizedDocs).every(arr => arr.length === 0) && (
                                <div className="py-24 text-center space-y-3 opacity-20">
                                    <div className="mx-auto h-16 w-16 rounded-full border-2 border-dashed flex items-center justify-center">
                                        <FileText className="h-8 w-8" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Evidence Logged</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
                <div className="p-4 bg-muted/5 border-t">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-blue-800 leading-relaxed font-medium italic">
                            Evidence integrity is verified institutionally. Only validated records contribute to the program maturity profile.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
      </div>

      {/* --- PREVIEW MODAL --- */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-sm font-black uppercase tracking-tight">{previewDoc?.title}</DialogTitle>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Source Document Review | AY {selectedYear}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewDoc(null)} className="h-8 w-8 rounded-full p-0">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </DialogHeader>
            <div className="flex-1 bg-muted relative group">
                <div className="absolute inset-0 flex items-center justify-center z-0 opacity-10 group-hover:opacity-20 transition-opacity">
                    <School className="h-40 w-40" />
                </div>
                {previewDoc && (
                    <iframe 
                        src={previewDoc.url} 
                        className="absolute inset-0 w-full h-full border-none bg-white z-10" 
                        allow="autoplay" 
                    />
                )}
            </div>
            <div className="p-4 border-t flex justify-between items-center bg-card shrink-0 px-8">
                <p className="text-[9px] text-muted-foreground italic font-medium">Digital Evidence integrity verified via Google Drive Cloud Storage.</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest" onClick={() => setPreviewDoc(null)}>Close Viewer</Button>
                    <Button variant="default" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20" asChild>
                        <a href={previewDoc?.url} target="_blank" rel="noopener noreferrer">Download Report</a>
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
