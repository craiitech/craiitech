'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, AccreditationRecord, CurriculumRecord, CorrectiveActionRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    Briefcase,
    CalendarDays,
    FileX,
    Hash,
    Zap,
    Scale,
    Printer,
    ListChecks,
    Check,
    Monitor
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Timestamp } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';

interface ProgramPerformanceViewProps {
  program: AcademicProgram;
  record: ProgramComplianceRecord | null;
  selectedYear: number;
  onResolveDeficiency?: (tab: string) => void;
}

const PILLAR_WEIGHTS = {
    ched: 20,
    accreditation: 20,
    faculty: 20,
    curriculum: 20,
    outcomes: 20
};

const COLORS: Record<string, string> = {
    'Aligned': 'hsl(142 71% 45%)',
    'Needs Correction': 'hsl(var(--destructive))',
    'Others': 'hsl(var(--chart-3))',
    'Approved': 'hsl(142 71% 45%)',
    'Awaiting Approval': 'hsl(var(--chart-1))',
    'Rejected': 'hsl(var(--chart-3))',
    'Missing': 'hsl(var(--muted-foreground))'
};

export function ProgramPerformanceView({ program, record, selectedYear, onResolveDeficiency }: ProgramPerformanceViewProps) {
  const { isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<any>(unitsQuery);
  const unitMap = useMemo(() => new Map(units?.map(u => [u.id, u.name])), [units]);

  const carQuery = useMemoFirebase(() => {
    if (!firestore || !record?.unitId || !record?.campusId) return null;
    return query(
        collection(firestore, 'correctiveActionRequests'), 
        where('unitId', '==', record.unitId),
        where('campusId', '==', record.campusId)
    );
  }, [firestore, record?.unitId, record?.campusId]);
  const { data: unitCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const analyticsData = useMemo(() => {
    if (!record) return null;

    // 1. Enrollment Dynamics (Multi-series Bar) - Aggregating all major-specific logs
    const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
    const levelLabels: Record<string, string> = { firstYear: '1st Yr', secondYear: '2nd Yr', thirdYear: '3rd Yr', fourthYear: '4th Yr' };

    const enrollmentRecords = record.enrollmentRecords || [];

    const enrollmentData = levels.map(level => {
        let totalSem1 = 0;
        let totalSem2 = 0;

        if (enrollmentRecords.length > 0) {
            enrollmentRecords.forEach(rec => {
                const s1 = rec.firstSemester?.[level];
                const s2 = rec.secondSemester?.[level];
                totalSem1 += (Number(s1?.male) || 0) + (Number(s1?.female) || 0);
                totalSem2 += (Number(s2?.male) || 0) + (Number(s2?.female) || 0);
            });
        } else {
            // Fallback to legacy single stats structure
            const s1 = record.stats.enrollment?.firstSemester?.[level];
            const s2 = record.stats.enrollment?.secondSemester?.[level];
            totalSem1 = (Number(s1?.male) || 0) + (Number(s1?.female) || 0);
            totalSem2 = (Number(s2?.male) || 0) + (Number(s2?.female) || 0);
        }

        return {
            name: levelLabels[level],
            '1st Sem': totalSem1,
            '2nd Sem': totalSem2
        };
    });

    // 2. Faculty Alignment Analysis
    let totalFaculty = 0;
    let alignedFaculty = 0;
    let othersFaculty = 0;
    const auditFacultyList: any[] = [];
    
    const checkAlignment = (m: any, roleLabel?: string) => {
        if (!m || !m.name || m.name.trim() === '') return;
        totalFaculty++;
        if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
        if (m.sex === 'Others (LGBTQI++)') othersFaculty++;
        
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
        { name: 'Aligned', value: alignedFaculty, fill: COLORS.Aligned },
        { name: 'Others', value: othersFaculty, fill: COLORS.Others },
        { name: 'Needs Correction', value: Math.max(0, totalFaculty - alignedFaculty - othersFaculty), fill: COLORS['Needs Correction'] }
    ].filter(d => d.value > 0);

    // 3. Outcomes
    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;
    
    const boardComparisonData = latestBoard ? [
        { name: 'School', rate: latestBoard.overallPassRate, fill: 'hsl(var(--primary))' },
        { name: 'National', rate: latestBoard.nationalPassingRate, fill: 'hsl(var(--muted-foreground))' }
    ] : [];

    // 4. Major-Specific Contexts
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
    const latestAccreditation = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];

    const curriculumRecords = record.curriculumRecords || [];
    const curriculaByMajor: Record<string, CurriculumRecord> = {};
    curriculumRecords.forEach(c => {
        curriculaByMajor[c.majorId] = c;
    });

    const now = new Date();
    const currentYearNum = now.getFullYear();

    // 5. Pillar Analysis
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

    // 6. Gaps
    const gaps = [];
    if (record.ched?.copcStatus !== 'With COPC') gaps.push({ type: 'Institutional Authority', msg: 'Program is operating without an active COPC.', priority: 'High', target: 'ched' });
    
    if (!program.isNewProgram) {
        if (program.hasSpecializations) {
            program.specializations?.forEach(spec => {
                const m = currentAccreditationByMajor[spec.id] || currentAccreditationByMajor['General'];
                if (!m || m.level === 'Non Accredited') {
                    gaps.push({ type: 'Academic Quality', msg: `Missing accreditation record for major: ${spec.name}`, priority: 'Medium', target: 'accreditation' });
                } else {
                    const yearMatch = m.statusValidityDate?.match(/\d{4}/);
                    const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                    if (dYear > 0 && dYear < currentYearNum) gaps.push({ type: 'Institutional Compliance', msg: `OVERDUE accreditation for ${spec.name}.`, priority: 'High', target: 'accreditation' });
                }
            });
        } else if (!latestAccreditation || latestAccreditation.level === 'Non Accredited') {
            gaps.push({ type: 'Academic Quality', msg: 'No active accreditation status recorded.', priority: 'Medium', target: 'accreditation' });
        }
    }

    const nextScheduleDate = program.isNewProgram ? 'NEW PROGRAM' : (latestAccreditation?.statusValidityDate || 'TBA');

    // 7. Collect Evidence Links
    const evidenceRegistry: { title: string, url: string, category: string }[] = [];
    if (record.ched?.copcLink) evidenceRegistry.push({ title: 'CHED COPC Certificate', url: record.ched.copcLink, category: 'Regulatory' });
    if (record.ched?.programCmoLink) evidenceRegistry.push({ title: 'CHED Memorandum Order (CMO)', url: record.ched.programCmoLink, category: 'Regulatory' });
    if (record.ched?.boardApprovalLink) evidenceRegistry.push({ title: 'Board Approval (BOR Resolution)', url: record.ched.boardApprovalLink, category: 'Governance' });
    if (record.ched?.majorBoardApprovals) {
        record.ched.majorBoardApprovals.forEach((a: any) => {
            if (a.link) evidenceRegistry.push({ title: `BOR Resolution: ${program.specializations?.find(s => s.id === a.majorId)?.name || 'Major'}`, url: a.link, category: 'Governance' });
        });
    }
    if (record.ched?.closureResolutionLink) evidenceRegistry.push({ title: 'Program Closure Authority', url: record.ched.closureResolutionLink, category: 'Regulatory' });
    
    milestones.forEach(m => {
        if (m.certificateLink) evidenceRegistry.push({ title: `${m.level} Accreditation Certificate`, url: m.certificateLink, category: 'Quality' });
    });

    curriculumRecords.forEach(c => {
        if (c.notationProofLink) evidenceRegistry.push({ title: `CHED Notation: ${program.specializations?.find(s => s.id === c.majorId)?.name || 'General'}`, url: c.notationProofLink, category: 'Curriculum' });
    });

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
        nextScheduleDate,
        overallScore, 
        pillarScores, 
        radarData,
        gaps,
        evidenceRegistry
    };
  }, [record, program]);

  if (!record || !analyticsData) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed rounded-2xl bg-muted/5">
            <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">No Data Recorded for AY {selectedYear}</h3>
            <p className="text-sm text-muted-foreground">Log program data in the compliance modules to activate decision support.</p>
        </div>
    );
  }

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DIGITAL EVIDENCE VAULT */}
          <Card className="border-primary/10 shadow-lg overflow-hidden flex flex-col">
              <CardHeader className="bg-primary/5 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                          <Monitor className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Digital Evidence Vault</CardTitle>
                      </div>
                      <Badge variant="outline" className="bg-white text-primary border-primary/20 h-5 px-2 font-black text-[9px] uppercase">
                          {analyticsData.evidenceRegistry.length} DOCUMENTS LINKED
                      </Badge>
                  </div>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-[400px]">
                      <div className="divide-y">
                          {analyticsData.evidenceRegistry.map((doc, idx) => (
                              <div key={idx} className="p-4 hover:bg-muted/20 transition-colors group">
                                  <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-4 min-w-0 flex-1">
                                          <div className={cn(
                                              "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                              doc.category === 'Regulatory' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                                              doc.category === 'Governance' ? "bg-indigo-50 border-indigo-100 text-indigo-600" :
                                              doc.category === 'Quality' ? "bg-amber-50 border-amber-100 text-amber-600" :
                                              "bg-blue-50 border-blue-100 text-blue-600"
                                          )}>
                                              <FileText className="h-5 w-5" />
                                          </div>
                                          <div className="min-w-0 space-y-1">
                                              <div className="flex items-center gap-2">
                                                  <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{doc.category}</span>
                                                  <Badge variant="secondary" className="h-3 text-[7px] font-black uppercase bg-emerald-100 text-emerald-700 border-none">
                                                      <Check className="h-2 w-2 mr-0.5" /> VERIFIED
                                                  </Badge>
                                              </div>
                                              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{doc.title}</p>
                                          </div>
                                      </div>
                                      <div className="flex gap-2">
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="h-8 text-[9px] font-black uppercase tracking-widest bg-white shadow-sm"
                                            onClick={() => setPreviewDoc({ title: doc.title, url: getEmbedUrl(doc.url) })}
                                          >
                                              <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                                          </Button>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" asChild>
                                              <a href={doc.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                                          </Button>
                                      </div>
                                  </div>
                              </div>
                          ))}
                          {analyticsData.evidenceRegistry.length === 0 && (
                              <div className="py-20 text-center opacity-20 flex flex-col items-center gap-2">
                                  <FileX className="h-10 w-10" />
                                  <p className="text-xs font-black uppercase tracking-widest">Vault is empty</p>
                                  <p className="text-[10px] max-w-[200px] italic">Upload certificates and resolutions in the compliance modules to populate this vault.</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-2 px-6">
                <p className="text-[9px] text-muted-foreground italic font-medium leading-relaxed">
                    Institutional evidence integrity is maintained via unit-managed Google Drive repositories.
                </p>
              </CardFooter>
          </Card>

          <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5">
              <CardHeader className="bg-destructive/10 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-destructive">
                          <ShieldAlert className="h-5 w-5 text-destructive" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Identified Strategic Quality Gaps</CardTitle>
                      </div>
                      <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase">SYSTEM ALERTS</Badge>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                      <div className="p-6 space-y-4">
                          {analyticsData.gaps.length > 0 ? (
                              analyticsData.gaps.map((gap, i) => (
                                  <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl border border-destructive/10 shadow-sm transition-all hover:border-destructive/30 group">
                                      <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                          <AlertTriangle className="h-5 w-5 text-destructive" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-2 mb-1">
                                              <p className="text-[10px] font-black text-destructive uppercase tracking-[0.1em]">{gap.type}</p>
                                              <Badge variant="outline" className="h-4 text-[8px] border-destructive/20 text-destructive font-black uppercase">{gap.priority}</Badge>
                                          </div>
                                          <p className="text-sm font-bold text-slate-800 leading-snug">{gap.msg}</p>
                                          <div className="mt-3">
                                              <Button variant="ghost" size="sm" onClick={() => onResolveDeficiency?.(gap.target)} className="h-6 text-[9px] font-black uppercase text-primary gap-1 p-0 px-2">
                                                  Resolve <ChevronRight className="h-3 w-3" />
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
                                  <h4 className="font-black text-slate-900 uppercase text-sm">Full Standard Compliance</h4>
                                  <p className="text-xs text-muted-foreground">All quality criteria verified for AY {selectedYear}.</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Maturity Index</CardDescription>
                <CardTitle className="text-3xl font-black text-primary tabular-nums">{analyticsData.overallScore}%</CardTitle>
            </CardHeader>
            <CardContent>
                <Progress value={analyticsData.overallScore} className="h-1" />
            </CardContent>
        </Card>
        
        <Card className="bg-emerald-50/50 border-emerald-100 shadow-sm">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Next Audit Milestone</CardDescription>
                <CardTitle className="text-lg font-black truncate uppercase text-slate-900">{analyticsData.nextScheduleDate}</CardTitle>
            </CardHeader>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 shadow-sm">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Faculty Alignment</CardDescription>
                <CardTitle className="text-3xl font-black text-blue-700 tabular-nums">{analyticsData.alignmentRate}%</CardTitle>
            </CardHeader>
        </Card>
        
        <Card className="bg-amber-50/50 border-amber-100 shadow-sm">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-amber-600">Sustainability Index</CardDescription>
                <CardTitle className="text-3xl font-black text-amber-700 tabular-nums">{record.stats.graduationCount || 0}</CardTitle>
            </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-primary/10 shadow-lg overflow-hidden">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Strategic Quality Radar</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="md:col-span-3 h-[300px]">
                        <ChartContainer config={{}} className="h-full w-full">
                            <ResponsiveContainer>
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.radarData}>
                                    <PolarGrid strokeOpacity={0.1} />
                                    <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                    <RechartsTooltip content={<ChartTooltipContent />} />
                                    <Radar name="Program Maturity" dataKey="score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                    <div className="md:col-span-2 flex flex-col justify-center space-y-4 pr-4">
                        {analyticsData.radarData.map((d, i) => (
                            <div key={i} className="space-y-1.5">
                                <div className="flex justify-between items-end">
                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{d.pillar}</span>
                                    <span className="text-xs font-black tabular-nums">{Math.round(d.score)}%</span>
                                </div>
                                <Progress value={d.score} className="h-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="lg:col-span-1 border-primary/10 shadow-lg overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Disaggregated Enrollment Dynamics</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analyticsData.enrollmentData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', paddingBottom: '10px' }} />
                            <Bar dataKey="1st Sem" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="2nd Sem" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <DialogTitle className="text-sm font-black uppercase tracking-tight">{previewDoc?.title}</DialogTitle>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Independent Document Verification Preview</p>
                    </div>
                    <Badge variant="secondary" className="h-5 text-[9px] font-bold">AY {selectedYear}</Badge>
                </div>
            </DialogHeader>
            <div className="flex-1 bg-muted relative group">
                {previewDoc && (
                    <iframe src={previewDoc.url} className="absolute inset-0 w-full h-full border-none bg-white z-10" allow="autoplay" />
                )}
            </div>
            <div className="p-4 border-t flex justify-between items-center bg-card shrink-0 px-8">
                <p className="text-[9px] text-muted-foreground italic font-medium">Digital Evidence Integrity Verified.</p>
                <Button variant="outline" size="sm" className="h-8 font-black text-[10px] uppercase tracking-widest" onClick={() => setPreviewDoc(null)}>Close Viewer</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
