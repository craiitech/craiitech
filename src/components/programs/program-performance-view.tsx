'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, ProgramFacultyMember, AccreditationRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
    FileText, 
    ExternalLink, 
    BarChart3, 
    Users, 
    Award, 
    ShieldCheck, 
    TrendingUp, 
    CheckCircle2, 
    AlertCircle,
    Calculator,
    Layers,
    UserCheck,
    History,
    Calendar,
    ChevronRight,
    MapPin,
    Target,
    Gavel,
    FileWarning,
    Activity,
    ArrowUpRight,
    PieChart as PieIcon,
    UserCircle2
} from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Cell,
    LineChart,
    Line,
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Timestamp } from 'firebase/firestore';

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

export function ProgramPerformanceView({ program, record, selectedYear }: ProgramPerformanceViewProps) {
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const analyticsData = useMemo(() => {
    if (!record) return null;

    // 1. Enrollment Chart Data
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
    const levelLabels: Record<string, string> = { firstYear: '1st Yr', secondYear: '2nd Yr', thirdYear: '3rd Yr', fourthYear: '4th Yr' };

    const enrollmentData = levels.map(level => {
        const s1 = record.stats.enrollment?.firstSemester?.[level];
        const s2 = record.stats.enrollment?.secondSemester?.[level];
        const sSummer = record.stats.enrollment?.midYearTerm?.[level];
        return {
            name: levelLabels[level],
            '1st Sem': (s1?.male || 0) + (s1?.female || 0),
            '2nd Sem': (s2?.male || 0) + (s2?.female || 0),
            'Mid-Year': (sSummer?.male || 0) + (sSummer?.female || 0)
        };
    });

    // 2. Graduation & Employment Trends
    const successTrends = (record.graduationRecords || []).map(g => ({
        period: `${g.semester} ${g.year}`,
        graduates: g.count,
        employment: record.tracerRecords?.find(t => t.year === g.year && t.semester === g.semester)?.employmentRate || 0
    })).sort((a, b) => a.period.localeCompare(b.period));

    // 3. Faculty Alignment & Specialization Stats
    let totalFaculty = 0;
    let alignedFaculty = 0;
    if (record.faculty?.members) {
        record.faculty.members.forEach(m => {
            totalFaculty++;
            if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
        });
    }
    if (record.faculty?.dean) { 
        totalFaculty++; 
        if (record.faculty.dean.isAlignedWithCMO === 'Aligned') alignedFaculty++; 
    }
    if (record.faculty?.programChair) { 
        totalFaculty++; 
        if (record.faculty.programChair.isAlignedWithCMO === 'Aligned') alignedFaculty++; 
    }

    const alignmentRate = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 0;

    const facultyPerSpec: Record<string, ProgramFacultyMember[]> = { 'General': [] };
    if (program.specializations) {
        program.specializations.forEach(s => {
            facultyPerSpec[s.id] = [];
        });
    }
    
    record.faculty?.members?.forEach(m => {
        const specId = m.specializationAssignment || 'General';
        if (facultyPerSpec[specId]) {
            facultyPerSpec[specId].push(m);
        } else {
            facultyPerSpec['General'].push(m);
        }
    });

    // 4. Board Performance
    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;

    // 5. Accreditation & Gaps
    const milestones = record.accreditationRecords || [];
    const latestAccreditation = milestones.length > 0 ? milestones[milestones.length - 1] : null;

    // 6. Maturity Score Calculation (Pillars)
    const pillarScores = {
        ched: record.ched?.copcStatus === 'With COPC' ? 20 : (record.ched?.copcStatus === 'In Progress' ? 10 : 0),
        accreditation: (latestAccreditation?.level && latestAccreditation.level !== 'Non Accredited') ? 20 : 0,
        faculty: (alignmentRate / 100) * 20,
        curriculum: record.curriculum?.cmoLink && record.curriculum?.isNotedByChed ? 20 : (record.curriculum?.cmoLink || record.curriculum?.isNotedByChed ? 10 : 0),
        outcomes: ((record.graduationRecords?.length || 0) > 0 || (record.tracerRecords?.length || 0) > 0) ? 20 : 0
    };

    const overallScore = Math.round(Object.values(pillarScores).reduce((a, b) => a + b, 0));

    // 7. Gap Identification
    const gaps = [];
    if (record.ched?.copcStatus !== 'With COPC') gaps.push({ type: 'Institutional', msg: 'Missing Certificate of Program Compliance (COPC).' });
    if (!record.ched?.boardApprovalLink) gaps.push({ type: 'Governance', msg: 'Missing Board of Regents (BOR) Resolution link.' });
    if (!latestAccreditation || latestAccreditation.level === 'Non Accredited') gaps.push({ type: 'Accreditation', msg: 'Program is currently Non-Accredited.' });
    if (alignmentRate < 100) gaps.push({ type: 'Faculty', msg: `Faculty alignment is at ${alignmentRate}%. ${totalFaculty - alignedFaculty} member(s) do not meet CMO qualifications.` });
    if (!record.curriculum?.isNotedByChed) gaps.push({ type: 'Curriculum', msg: 'Curriculum revision not yet noted by CHED.' });
    if (!record.graduationRecords?.length) gaps.push({ type: 'Outcomes', msg: 'No graduation outcome records for this year.' });

    return { 
        enrollmentData, 
        successTrends, 
        alignmentRate, 
        totalFaculty, 
        alignedFaculty,
        latestBoard, 
        facultyPerSpec, 
        milestones, 
        latestAccreditation,
        overallScore,
        pillarScores,
        gaps
    };
  }, [record, program]);

  const categorizedDocs = useMemo(() => {
    if (!record) return { governance: [], accreditation: [], curriculum: [], monitoring: [] };
    
    const docs = {
        governance: [] as any[],
        accreditation: [] as any[],
        curriculum: [] as any[],
        monitoring: [] as any[]
    };

    if (record.ched?.boardApprovalLink) docs.governance.push({ id: 'bor', title: 'BOR Resolution', url: record.ched.boardApprovalLink, status: 'Active' });
    if (record.ched?.copcLink) docs.governance.push({ id: 'copc', title: 'CHED COPC', url: record.ched.copcLink, status: record.ched.copcStatus });
    
    if (record.curriculum?.cmoLink) docs.curriculum.push({ id: 'cmo', title: 'Program CMO', url: record.curriculum.cmoLink, status: `Rev ${record.curriculum.revisionNumber || '0'}` });
    
    (record.accreditationRecords || []).forEach((acc, idx) => {
        if (acc.certificateLink) docs.accreditation.push({ id: `acc-${idx}`, title: `${acc.level} Certificate`, url: acc.certificateLink, status: acc.lifecycleStatus || 'Verified' });
    });

    if (record.ched?.contentNotedLinks) {
        record.ched.contentNotedLinks.forEach((link, idx) => {
            if (link.url) docs.curriculum.push({ id: `noted-${idx}`, title: `Notation Proof ${idx + 1}`, url: link.url, status: link.dateNoted ? `Noted: ${link.dateNoted}` : 'Acknowledged' });
        });
    }

    if (record.ched?.rqatVisits) {
        record.ched.rqatVisits.forEach((visit, idx) => {
            if (visit.reportLink) docs.monitoring.push({ id: `rqat-${idx}`, title: `RQAT Report (${visit.date || 'TBA'})`, url: visit.reportLink, status: visit.result });
        });
    }

    return docs;
  }, [record]);

  if (!record) return null;

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. EXECUTIVE KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden relative group transition-all hover:shadow-md">
            <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 rounded-full transition-transform group-hover:scale-150" />
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Institutional Maturity</CardDescription>
                <CardTitle className="text-3xl font-black text-primary tabular-nums">{analyticsData?.overallScore}%</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-1.5">
                    <Progress value={analyticsData?.overallScore} className="h-1" />
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Verified Compliance Index</p>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm group transition-all hover:shadow-md">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Accreditation Milestone</CardDescription>
                <CardTitle className="text-lg font-black text-slate-900 truncate">
                    {analyticsData?.latestAccreditation?.level || 'Non Accredited'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">
                    {analyticsData?.latestAccreditation?.lifecycleStatus || 'TBA'}
                </Badge>
            </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 shadow-sm group transition-all hover:shadow-md">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Faculty Alignment</CardDescription>
                <CardTitle className="text-3xl font-black text-blue-700 tabular-nums">
                    {analyticsData?.alignmentRate}%
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-blue-800/60 font-bold uppercase">{analyticsData?.totalFaculty} Members Registered</p>
            </CardContent>
        </Card>

        <Card className="bg-amber-50/50 border-amber-100 shadow-sm group transition-all hover:shadow-md">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-600">Board Performance</CardDescription>
                <CardTitle className="text-3xl font-black text-amber-700 tabular-nums">
                    {analyticsData?.latestBoard?.overallPassRate || '0'}%
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-amber-800/60 font-bold uppercase">Latest Exam Result</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            
            {/* 2. STRATEGIC GAP ANALYSIS */}
            <Card className="border-destructive/20 shadow-md overflow-hidden">
                <CardHeader className="bg-destructive/5 border-b py-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2 text-destructive">
                                <FileWarning className="h-4 w-4" />
                                Strategic Quality Gaps
                            </CardTitle>
                            <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Immediate action items for Academic Year {selectedYear}.</CardDescription>
                        </div>
                        <Badge variant="destructive" className="h-5 text-[9px] font-black animate-pulse">
                            {analyticsData?.gaps.length || 0} FINDINGS
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y">
                        {analyticsData?.gaps.map((gap, idx) => (
                            <div key={idx} className="p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors">
                                <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black uppercase text-destructive tracking-tighter">{gap.type}</p>
                                    <p className="text-xs font-bold text-slate-700 leading-snug">{gap.msg}</p>
                                </div>
                            </div>
                        ))}
                        {analyticsData?.gaps.length === 0 && (
                            <div className="p-10 text-center space-y-2">
                                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-20" />
                                <p className="text-xs font-bold text-muted-foreground uppercase">Program Fully Compliant</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 3. MATURITY BREAKDOWN PILLARS */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Compliance Pillar Scoring</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {Object.entries(PILLAR_WEIGHTS).map(([key, weight]) => {
                            const score = analyticsData?.pillarScores[key as keyof typeof PILLAR_WEIGHTS] || 0;
                            return (
                                <div key={key} className="space-y-3 p-4 rounded-xl border bg-muted/5 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{key}</p>
                                        <div className="flex items-end gap-1">
                                            <span className="text-xl font-black tabular-nums">{Math.round(score)}</span>
                                            <span className="text-[10px] font-bold text-muted-foreground mb-1">/ {weight}</span>
                                        </div>
                                    </div>
                                    <Progress value={(score / weight) * 100} className="h-1" />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* 4. FACULTY ALIGNMENT & QUALIFICATION PROFILE */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Faculty Alignment &amp; Qualification Profile</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Alignment Stats */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">CMO Alignment Index</p>
                                    <p className="text-3xl font-black text-primary tabular-nums">{analyticsData?.alignmentRate}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Total Staffing</p>
                                    <p className="text-xl font-black text-slate-700 tabular-nums">{analyticsData?.totalFaculty}</p>
                                </div>
                            </div>
                            <Progress value={analyticsData?.alignmentRate} className="h-2" />
                            
                            <div className="grid grid-cols-1 gap-2 mt-4">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                        <span className="text-[10px] font-bold uppercase text-green-700">Aligned with Standard</span>
                                    </div>
                                    <span className="text-sm font-black text-green-700 tabular-nums">
                                        {analyticsData?.alignedFaculty}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 border border-rose-100">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-rose-600" />
                                        <span className="text-[10px] font-bold uppercase text-rose-700">Alignment Gaps</span>
                                    </div>
                                    <span className="text-sm font-black text-rose-700 tabular-nums">
                                        {(analyticsData?.totalFaculty || 0) - (analyticsData?.alignedFaculty || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Specialization Distribution */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Layers className="h-3 w-3" /> Specialization Coverage Audit
                            </h4>
                            <div className="space-y-2">
                                {program.hasSpecializations ? (
                                    program.specializations?.map(spec => {
                                        const members = analyticsData?.facultyPerSpec[spec.id] || [];
                                        const aligned = members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                                        return (
                                            <div key={spec.id} className="p-3 rounded-lg border bg-muted/5 flex items-center justify-between group hover:bg-muted/10 transition-colors">
                                                <div className="space-y-0.5 min-w-0">
                                                    <p className="text-[10px] font-bold uppercase text-slate-700 truncate" title={spec.name}>{spec.name}</p>
                                                    <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Pool: {members.length} member(s)</p>
                                                </div>
                                                <Badge 
                                                    variant={aligned > 0 ? "outline" : "destructive"} 
                                                    className={cn(
                                                        "h-5 text-[8px] font-black uppercase",
                                                        aligned > 0 ? "bg-green-50 text-green-700 border-green-200" : ""
                                                    )}
                                                >
                                                    {aligned > 0 ? `${aligned} ALIGNED` : "GAP DETECTED"}
                                                </Badge>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-8 text-center border border-dashed rounded-lg bg-muted/5">
                                        <UserCircle2 className="h-6 w-6 mx-auto text-muted-foreground opacity-20 mb-2" />
                                        <p className="text-[10px] text-muted-foreground italic">Standard Program: Faculty assigned to core instructional areas.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 5. ENROLLMENT & OUTCOMES ANALYTICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="shadow-sm border-primary/5">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Enrollment Analysis</CardTitle>
                            <Users className="h-4 w-4 text-primary/40" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{ 
                            '1st Sem': { label: '1st Sem', color: 'hsl(var(--chart-1))' },
                            '2nd Sem': { label: '2nd Sem', color: 'hsl(var(--chart-2))' }
                        }} className="h-[200px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={analyticsData?.enrollmentData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                    <YAxis hide />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="1st Sem" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="2nd Sem" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-primary/5">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Employment Trends</CardTitle>
                            <TrendingUp className="h-4 w-4 text-emerald-500/40" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={{}} className="h-[200px] w-full">
                            <ResponsiveContainer>
                                <LineChart data={analyticsData?.successTrends}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                    <XAxis dataKey="period" hide />
                                    <YAxis domain={[0, 100]} hide />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Line type="monotone" dataKey="employment" name="Rate" stroke="hsl(var(--chart-2))" strokeWidth={3} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>

            {/* 6. ACCREDITATION TIMELINE */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Lifecycle</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="max-h-[300px]">
                        <div className="divide-y">
                            {analyticsData?.milestones.map((m, idx) => (
                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">{idx + 1}</div>
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-black uppercase text-slate-900 leading-none">{m.level}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">{m.result || 'Ongoing Survey'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <Badge variant="outline" className="h-5 text-[9px] font-black border-primary/20 text-primary uppercase">{m.lifecycleStatus}</Badge>
                                        <p className="text-[9px] text-muted-foreground mt-1 uppercase font-bold tabular-nums tracking-tighter">Survey: {m.dateOfSurvey || 'TBA'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

        {/* 7. RIGHT SIDEBAR: DOCUMENTS & BOARD PERFORMANCE */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* BOARD PERFORMANCE SCORECARD */}
            {program.isBoardProgram && analyticsData?.latestBoard && (
                <Card className="border-primary/30 bg-primary/5 shadow-md overflow-hidden">
                    <CardHeader className="bg-primary border-b py-4">
                        <CardTitle className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Board Benchmarking
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-[9px] font-black uppercase text-primary/60 tracking-widest">Institutional Rate</p>
                                <p className="text-4xl font-black text-primary tabular-nums tracking-tighter">{analyticsData.latestBoard.overallPassRate}%</p>
                            </div>
                            <div className="h-12 w-12 rounded-full border-4 border-primary/20 flex items-center justify-center">
                                <ArrowUpRight className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span>Program Passing Rate</span>
                                    <span>{analyticsData.latestBoard.overallPassRate}%</span>
                                </div>
                                <Progress value={analyticsData.latestBoard.overallPassRate} className="h-1.5" />
                            </div>
                            <div className="space-y-1.5 opacity-60">
                                <div className="flex justify-between text-[10px] font-bold uppercase">
                                    <span>National Average</span>
                                    <span>{analyticsData.latestBoard.nationalPassingRate}%</span>
                                </div>
                                <Progress value={analyticsData.latestBoard.nationalPassingRate} className="h-1.5 bg-muted" />
                            </div>
                        </div>
                        <div className="pt-4 border-t border-primary/10 flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase">
                            <span>Exam: {analyticsData.latestBoard.examDate}</span>
                            <Badge variant="secondary" className="bg-primary/10 text-primary h-4 text-[8px] font-black border-none">LATEST</Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* DOCUMENT VAULT CATEGORIZED */}
            <Card className="shadow-lg border-primary/10 flex flex-col">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Verification Vault
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <div className="p-4 space-y-6">
                            {Object.entries(categorizedDocs).map(([category, items]) => {
                                if (items.length === 0) return null;
                                return (
                                    <div key={category} className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60 border-b pb-1">{category}</h4>
                                        <div className="space-y-2">
                                            {items.map((doc: any) => (
                                                <div key={doc.id} className="p-3 rounded-lg border bg-background hover:border-primary/40 hover:shadow-sm transition-all group">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="space-y-0.5 min-w-0">
                                                            <p className="font-bold text-xs text-slate-800 truncate">{doc.title}</p>
                                                            <p className="text-[9px] text-muted-foreground uppercase font-medium">{doc.status}</p>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="h-7 text-[9px] font-black uppercase flex-1 border-primary/20 text-primary group-hover:bg-primary group-hover:text-white transition-colors"
                                                                onClick={() => setPreviewDoc({ title: doc.title, url: getEmbedUrl(doc.url) })}
                                                            >
                                                                VIEW PREVIEW
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                                <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {Object.values(categorizedDocs).every(arr => arr.length === 0) && (
                                <div className="py-20 text-center space-y-2 opacity-20">
                                    <FileText className="h-12 w-12 mx-auto" />
                                    <p className="text-xs font-bold uppercase">No Evidence Found</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>

      {/* DOCUMENT PREVIEW DIALOG */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
                <DialogTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Evidence Review: {previewDoc?.title}
                </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-muted relative">
                {previewDoc && (
                    <iframe src={previewDoc.url} className="absolute inset-0 w-full h-full border-none bg-white" allow="autoplay" />
                )}
            </div>
            <div className="p-4 border-t flex justify-between items-center bg-card shrink-0">
                <p className="text-[10px] text-muted-foreground italic font-medium">Source Document Integrity Verified &bull; Official RSU QAO Portal</p>
                <Button variant="outline" size="sm" className="h-8 font-bold text-xs" onClick={() => setPreviewDoc(null)}>Close Viewer</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
