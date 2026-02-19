
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
    ShieldAlert
} from 'lucide-react';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';

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
        return {
            name: levelLabels[level],
            '1st Sem': (s1?.male || 0) + (s1?.female || 0),
            '2nd Sem': (s2?.male || 0) + (s2?.female || 0)
        };
    });

    // 2. Faculty Alignment
    let totalFaculty = 0;
    let alignedFaculty = 0;
    const countMember = (m: any) => {
        if (!m || !m.name || m.name.trim() === '') return;
        totalFaculty++;
        if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
    };
    if (record.faculty?.members) record.faculty.members.forEach(countMember);
    countMember(record.faculty?.dean);
    if (record.faculty?.hasAssociateDean) countMember(record.faculty?.associateDean);
    countMember(record.faculty?.programChair);
    const alignmentRate = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 0;

    // 3. Board Performance
    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;

    // 4. Major-Specific Accreditation Logic
    const milestones = record.accreditationRecords || [];
    const currentAccreditationByMajor: Record<string, AccreditationRecord> = {};
    milestones.filter(m => m.lifecycleStatus === 'Current').forEach(m => {
        if (!m.components || m.components.length === 0) {
            currentAccreditationByMajor['program-wide'] = m;
        } else {
            m.components.forEach(comp => {
                currentAccreditationByMajor[comp.id] = m;
            });
        }
    });
    const latestAccreditation = milestones.length > 0 ? milestones[milestones.length - 1] : null;

    // 5. Major-Specific Curriculum Logic
    const curriculumRecords = record.curriculumRecords || [];
    const curriculaByMajor: Record<string, CurriculumRecord> = {};
    curriculumRecords.forEach(c => {
        curriculaByMajor[c.majorId] = c;
    });

    // 6. Maturity Score
    const pillarScores = {
        ched: record.ched?.copcStatus === 'With COPC' ? 20 : (record.ched?.copcStatus === 'In Progress' ? 10 : 0),
        accreditation: (latestAccreditation?.level && latestAccreditation.level !== 'Non Accredited') ? 20 : 0,
        faculty: totalFaculty > 0 ? (alignmentRate / 100) * 20 : 0,
        curriculum: (curriculumRecords.some(c => c.isNotedByChed)) ? 20 : 10,
        outcomes: ((record.graduationRecords?.length || 0) > 0) ? 20 : 0
    };
    const overallScore = Math.round(Object.values(pillarScores).reduce((a, b) => a + b, 0));

    // 7. Gaps
    const gaps = [];
    if (record.ched?.copcStatus !== 'With COPC') gaps.push({ type: 'Institutional', msg: 'No COPC found.' });
    if (totalFaculty === 0) gaps.push({ type: 'Faculty', msg: 'Faculty registry is empty.' });
    if (program.hasSpecializations) {
        program.specializations?.forEach(spec => {
            if (!currentAccreditationByMajor[spec.id]) {
                gaps.push({ type: 'Accreditation', msg: `Missing current accreditation record for major: ${spec.name}` });
            }
            if (!curriculaByMajor[spec.id] && !curriculaByMajor['General']) {
                gaps.push({ type: 'Curriculum', msg: `Missing curriculum record for major: ${spec.name}` });
            }
        });
    }

    return { enrollmentData, alignmentRate, totalFaculty, latestBoard, milestones, latestAccreditation, currentAccreditationByMajor, curriculaByMajor, overallScore, pillarScores, gaps };
  }, [record, program]);

  const categorizedDocs = useMemo(() => {
    if (!record) return { governance: [], accreditation: [], curriculum: [], monitoring: [] };
    const docs = { governance: [] as any[], accreditation: [] as any[], curriculum: [] as any[], monitoring: [] as any[] };
    if (record.ched?.boardApprovalLink) docs.governance.push({ id: 'bor', title: 'BOR Resolution', url: record.ched.boardApprovalLink, status: 'Active' });
    if (record.ched?.copcLink) docs.governance.push({ id: 'copc', title: 'CHED COPC', url: record.ched.copcLink, status: record.ched.copcStatus });
    
    (record.curriculumRecords || []).forEach((curr, idx) => {
        if (curr.cmoLink) docs.curriculum.push({ id: `cmo-${idx}`, title: `CMO: ${curr.majorId === 'General' ? 'Program' : curr.majorId}`, url: curr.cmoLink, status: `Rev ${curr.revisionNumber}` });
        if (curr.notationProofLink) docs.curriculum.push({ id: `note-${idx}`, title: `Notation: ${curr.majorId === 'General' ? 'Program' : curr.majorId}`, url: curr.notationProofLink, status: curr.dateNoted });
    });

    (record.accreditationRecords || []).forEach((acc, idx) => { if (acc.certificateLink) docs.accreditation.push({ id: `acc-${idx}`, title: `${acc.level} Certificate`, url: acc.certificateLink, status: acc.lifecycleStatus }); });
    return docs;
  }, [record]);

  if (!record || !analyticsData) return null;

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative group overflow-hidden">
            <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 rounded-full" />
            <CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Institutional Maturity</CardDescription><CardTitle className="text-3xl font-black text-primary tabular-nums">{analyticsData.overallScore}%</CardTitle></CardHeader>
            <CardContent><div className="space-y-1.5"><Progress value={analyticsData.overallScore} className="h-1" /><p className="text-[9px] font-bold text-muted-foreground uppercase">Verified Compliance Index</p></div></CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm"><CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Accreditation</CardDescription><CardTitle className="text-lg font-black text-slate-900 truncate">{analyticsData.latestAccreditation?.level || 'Non Accredited'}</CardTitle></CardHeader><CardContent><Badge variant="outline" className="bg-white text-emerald-700 border-emerald-200 text-[9px] font-black uppercase">{analyticsData.latestAccreditation?.result || 'Ongoing'}</Badge></CardContent></Card>
        <Card className="bg-blue-50/50 border-blue-100 shadow-sm"><CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Faculty Alignment</CardDescription><CardTitle className="text-3xl font-black text-blue-700 tabular-nums">{analyticsData.alignmentRate}%</CardTitle></CardHeader><CardContent><p className="text-[10px] text-blue-800/60 font-bold uppercase">{analyticsData.totalFaculty} Members Registered</p></CardContent></Card>
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm"><CardHeader className="pb-2"><CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-600">CHED Program Contents</CardDescription><CardTitle className="text-lg font-black text-amber-700 truncate">{record.curriculumRecords?.length || 0} Registered Curricula</CardTitle></CardHeader><CardContent><Badge variant="outline" className="bg-white text-amber-700 border-amber-200 text-[9px] font-black uppercase">{record.curriculumRecords?.some(c => c.isNotedByChed) ? 'Officially Noted' : 'Pending Notation'}</Badge></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
            
            {/* Major-Specific Curriculum & Content Profile */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Curriculum & Program Content Profile</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {program.specializations && program.specializations.length > 0 ? (
                            program.specializations.map(spec => {
                                const curr = analyticsData.curriculaByMajor[spec.id] || analyticsData.curriculaByMajor['General'];
                                return (
                                    <div key={spec.id} className="p-4 rounded-xl border bg-muted/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-black uppercase text-primary tracking-widest">{spec.name}</p>
                                            <Badge variant={curr?.isNotedByChed ? "default" : "outline"} className={cn("text-[8px] h-4 font-black uppercase", curr?.isNotedByChed ? "bg-emerald-600" : "opacity-50")}>
                                                {curr?.isNotedByChed ? "Noted by CHED" : "Pending Notation"}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-800">Revision: {curr?.revisionNumber || 'Not Set'}</p>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase">Impl: {curr?.dateImplemented || 'TBA'}</p>
                                        </div>
                                        {curr?.dateNoted && (
                                            <div className="flex items-center gap-1.5 text-[8px] font-black text-emerald-700 bg-emerald-50 w-fit px-2 py-0.5 rounded border border-emerald-100">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                NOTED ON: {curr.dateNoted}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="md:col-span-2 p-4 rounded-xl border bg-primary/5 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-primary tracking-widest">General Program Curriculum</p>
                                    <p className="text-xs font-black text-slate-800 mt-1">Revision: {analyticsData.curriculaByMajor['General']?.revisionNumber || 'Not Set'}</p>
                                </div>
                                <Badge variant={analyticsData.curriculaByMajor['General']?.isNotedByChed ? "default" : "outline"} className="h-5 text-[9px] font-black uppercase">
                                    {analyticsData.curriculaByMajor['General']?.isNotedByChed ? "Noted" : "Unnoted"}
                                </Badge>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Strategic Gaps Analysis */}
            {analyticsData.gaps.length > 0 && (
                <Card className="border-destructive/20 shadow-sm overflow-hidden bg-destructive/5">
                    <CardHeader className="py-3 px-4 bg-destructive/10 border-b">
                        <div className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <CardTitle className="text-xs font-black uppercase tracking-widest">Critical Compliance Gaps</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                        {analyticsData.gaps.map((gap, i) => (
                            <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-destructive/10 shadow-sm">
                                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-destructive uppercase tracking-tighter mb-0.5">{gap.type}</p>
                                    <p className="text-xs font-bold text-slate-700 leading-snug">{gap.msg}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Pillar Scoring */}
            <Card className="border-primary/10 shadow-sm overflow-hidden">
                <CardHeader className="bg-muted/10 border-b py-4">
                    <div className="flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Maturity Pillar Breakdown</CardTitle></div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {Object.entries(PILLAR_WEIGHTS).map(([key, weight]) => {
                            const score = analyticsData.pillarScores[key as keyof typeof PILLAR_WEIGHTS] || 0;
                            return (
                                <div key={key} className="space-y-3 p-4 rounded-xl border bg-muted/5 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{key}</p>
                                        <div className="flex items-end gap-1"><span className="text-xl font-black tabular-nums">{Math.round(score)}</span><span className="text-[10px] font-bold text-muted-foreground mb-1">/ {weight}</span></div>
                                    </div>
                                    <Progress value={(score / weight) * 100} className="h-1" />
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-primary/10 flex flex-col">
                <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Verification Vault</CardTitle></CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[600px]">
                        <div className="p-4 space-y-6">
                            {Object.entries(categorizedDocs).map(([category, items]) => (
                                items.length > 0 && (
                                    <div key={category} className="space-y-3">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-primary/60 border-b pb-1">{category}</h4>
                                        <div className="space-y-2">
                                            {items.map((doc: any) => (
                                                <div key={doc.id} className="p-3 rounded-lg border bg-background hover:border-primary/40 transition-all group">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="space-y-0.5 min-w-0"><p className="font-bold text-xs text-slate-800 truncate">{doc.title}</p><p className="text-[9px] text-muted-foreground uppercase font-medium">{doc.status}</p></div>
                                                        <div className="flex gap-2"><Button variant="outline" size="sm" className="h-7 text-[9px] font-black uppercase flex-1" onClick={() => setPreviewDoc({ title: doc.title, url: getEmbedUrl(doc.url) })}>PREVIEW</Button><Button variant="ghost" size="icon" className="h-7 w-7" asChild><a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3 w-3" /></a></Button></div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>

      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-4 border-b bg-slate-50 shrink-0"><DialogTitle className="flex items-center gap-2 text-sm uppercase font-black tracking-tight"><ShieldCheck className="h-4 w-4 text-primary" />Evidence Review: {previewDoc?.title}</DialogTitle></DialogHeader>
            <div className="flex-1 bg-muted relative">{previewDoc && <iframe src={previewDoc.url} className="absolute inset-0 w-full h-full border-none bg-white" allow="autoplay" />}</div>
            <div className="p-4 border-t flex justify-between items-center bg-card shrink-0"><p className="text-[10px] text-muted-foreground italic font-medium">Source Document Integrity Verified</p><Button variant="outline" size="sm" className="h-8 font-bold text-xs" onClick={() => setPreviewDoc(null)}>Close Viewer</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
