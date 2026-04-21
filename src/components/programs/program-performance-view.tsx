'use client';

import { useMemo, useState } from 'react';
import type { 
    AcademicProgram, 
    ProgramComplianceRecord, 
    AccreditationRecord, 
    CurriculumRecord, 
    CorrectiveActionRequest, 
    ManagementReviewOutput, 
    AuditFinding,
    AccreditationRecommendation
} from '@/lib/types';
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
    Monitor,
    Eye,
    ClipboardCheck
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
import { doc, collection, query, where } from 'firebase/firestore';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';

interface ProgramPerformanceViewProps {
  program: AcademicProgram;
  record: ProgramComplianceRecord | null;
  selectedYear: number;
  onResolveDeficiency?: (tab: string) => void;
}

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

    let totalFaculty = 0;
    let alignedFaculty = 0;
    let othersFaculty = 0;
    
    const checkAlignment = (m: any) => {
        if (!m || !m.name || m.name.trim() === '') return;
        totalFaculty++;
        if (m.isAlignedWithCMO === 'Aligned') alignedFaculty++;
        if (m.sex === 'Others (LGBTQI++)') othersFaculty++;
    };

    checkAlignment(record.faculty?.dean);
    if (record.faculty?.hasAssociateDean) checkAlignment(record.faculty?.associateDean);
    checkAlignment(record.faculty?.programChair);
    if (record.faculty?.members) record.faculty.members.forEach(m => checkAlignment(m));
    
    const alignmentRate = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 0;
    const facultyPieData = [
        { name: 'Aligned', value: alignedFaculty, fill: COLORS.Aligned },
        { name: 'Others', value: othersFaculty, fill: COLORS.Others },
        { name: 'Unqualified', value: Math.max(0, totalFaculty - alignedFaculty - othersFaculty), fill: COLORS['Needs Correction'] }
    ].filter(d => d.value > 0);

    const latestBoard = record.boardPerformance && record.boardPerformance.length > 0 
        ? record.boardPerformance[record.boardPerformance.length - 1] 
        : null;
    
    const boardComparisonData = latestBoard ? [
        { name: 'School', rate: latestBoard.overallPassRate, fill: 'hsl(var(--primary))' },
        { name: 'National', rate: latestBoard.nationalPassingRate, fill: 'hsl(var(--muted-foreground))' }
    ] : [];

    const milestones = record.accreditationRecords || [];
    const latestAccreditation = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
    
    // Aggregating all recommendations from all current milestones
    const recommendations: (AccreditationRecommendation & { milestoneLevel: string })[] = [];
    milestones.forEach(m => {
        m.recommendations?.forEach(reco => {
            recommendations.push({ ...reco, milestoneLevel: m.level });
        });
    });

    const curriculumRecords = record.curriculumRecords || [];

    const pillarScores = {
        ched: record.ched?.copcStatus === 'With COPC' ? 20 : (record.ched?.copcStatus === 'In Progress' ? 10 : 0),
        accreditation: program.isNewProgram ? 20 : ((latestAccreditation?.level && latestAccreditation.level !== 'Non Accredited') ? 20 : 0),
        faculty: totalFaculty > 0 ? (alignmentRate / 100) * 20 : 0,
        curriculum: (curriculumRecords.some(c => c.isNotedByChed)) ? 20 : 10,
        outcomes: ((record.graduationRecords?.length || 0) > 0) ? 20 : 0
    };
    
    const radarData = [
        { pillar: 'Authority', score: (pillarScores.ched / 20) * 100 },
        { pillar: 'Accreditation', score: (pillarScores.accreditation / 20) * 100 },
        { pillar: 'Faculty', score: (pillarScores.faculty / 20) * 100 },
        { pillar: 'Curriculum', score: (pillarScores.curriculum / 20) * 100 },
        { pillar: 'Outcomes', score: (pillarScores.outcomes / 20) * 100 },
    ];

    const overallScore = Math.round(Object.values(pillarScores).reduce((a, b) => a + b, 0));

    const gaps = [];
    if (record.ched?.copcStatus !== 'With COPC') gaps.push({ type: 'Institutional Authority', msg: 'Program is operating without an active COPC.', priority: 'High', target: 'ched' });
    if (!latestAccreditation || latestAccreditation.level === 'Non Accredited') {
        if (!program.isNewProgram) gaps.push({ type: 'Academic Quality', msg: 'No active accreditation status recorded.', priority: 'Medium', target: 'accreditation' });
    }

    const evidenceRegistry: { title: string, url: string, category: string }[] = [];
    if (record.ched?.copcLink) evidenceRegistry.push({ title: 'CHED COPC Certificate', url: record.ched.copcLink, category: 'Regulatory' });
    if (record.ched?.programCmoLink) evidenceRegistry.push({ title: 'CHED Memorandum Order (CMO)', url: record.ched.programCmoLink, category: 'Regulatory' });
    if (record.ched?.boardApprovalLink) evidenceRegistry.push({ title: 'Board Approval (BOR Resolution)', url: record.ched.boardApprovalLink, category: 'Governance' });
    
    milestones.forEach(m => {
        if (m.certificateLink) evidenceRegistry.push({ title: `${m.level} Accreditation Certificate`, url: m.certificateLink, category: 'Quality' });
    });

    return { 
        enrollmentData, 
        alignmentRate, 
        totalFaculty, 
        facultyPieData,
        latestBoard, 
        boardComparisonData,
        milestones, 
        latestAccreditation, 
        recommendations,
        overallScore, 
        radarData,
        gaps,
        evidenceRegistry
    };
  }, [record, program]);

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  if (!record || !analyticsData) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center border border-dashed rounded-2xl bg-muted/5">
            <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
            <h3 className="text-lg font-bold">No Data Recorded for AY {selectedYear}</h3>
            <p className="text-sm text-muted-foreground">Log program data in the compliance modules to activate decision support.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* 1. EXECUTIVE PERFORMANCE SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="h-16 w-16 text-primary" /></div>
              <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Strategic Maturity Index</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center pt-8">
                  <ChartContainer config={{}} className="h-[280px] w-full">
                      <ResponsiveContainer>
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analyticsData.radarData}>
                              <PolarGrid strokeOpacity={0.2} />
                              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
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
                  <div className="text-center mt-4">
                      <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{analyticsData.overallScore}%</span>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Institutional Quality Score</p>
                  </div>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3">
                  <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                          <strong>Insight:</strong> Measures balance across 5 compliance pillars. A symmetrical radar indicates consistent quality assurance across all modules.
                      </p>
                  </div>
              </CardFooter>
          </Card>

          <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-primary/20 shadow-sm bg-primary/5">
                      <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Next Survey Milestone</CardTitle></CardHeader>
                      <CardContent>
                          <div className="flex items-center gap-3">
                              <Calendar className="h-8 w-8 text-primary opacity-20" />
                              <p className="text-2xl font-black text-slate-900 uppercase">
                                  {program.isNewProgram ? 'NEW PROGRAM' : (analyticsData.latestAccreditation?.statusValidityDate || 'TBA')}
                              </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 font-medium">Source: AACCUP Validity Ledger</p>
                      </CardContent>
                  </Card>
                  <Card className="border-emerald-200 shadow-sm bg-emerald-50/10">
                      <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Faculty Alignment</CardTitle></CardHeader>
                      <CardContent>
                          <div className="flex items-center gap-3">
                              <UserCheck className="h-8 w-8 text-emerald-600 opacity-20" />
                              <p className="text-3xl font-black text-emerald-600 tabular-nums">{analyticsData.alignmentRate}%</p>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-2 font-medium">Source: Verified Faculty Roster (CMO Check)</p>
                      </CardContent>
                  </Card>
              </div>

              <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5 flex-1">
                  <CardHeader className="bg-destructive/10 border-b py-4">
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-destructive">
                              <ShieldAlert className="h-5 w-5 text-destructive" />
                              <CardTitle className="text-sm font-black uppercase tracking-tight">Active Quality Gaps</CardTitle>
                          </div>
                          <Badge variant="destructive" className="h-5 text-[9px] font-black uppercase">SYSTEM ALERTS</Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="p-0">
                      <ScrollArea className="h-[200px]">
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
      </div>

      {/* 2. ANALYTICS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Enrollment Trend Chart */}
          <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Enrollment Velocity Trend</CardTitle>
                  </div>
                  <CardDescription className="text-xs">Headcount distribution across Year Levels for AY {selectedYear}.</CardDescription>
              </CardHeader>
              <CardContent className="pt-8 flex-1">
                  <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analyticsData.enrollmentData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                              <Bar dataKey="1st Sem" fill="hsl(var(--chart-1))" radius={[2, 2, 0, 0]} />
                              <Bar dataKey="2nd Sem" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3 px-6">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        <strong>Insight:</strong> Tracks population retention and growth. Disparities between semesters or years indicate potential high-risk attrition points.
                    </p>
                </div>
              </CardFooter>
          </Card>

          {/* Faculty & Outcomes Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="p-4 bg-muted/10 border-b"><CardTitle className="text-[10px] font-black uppercase text-center">Faculty Maturity Profile</CardTitle></CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                      <ChartContainer config={{}} className="h-[180px] w-[180px]">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Pie data={analyticsData.facultyPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={5} dataKey="value">
                                      {analyticsData.facultyPieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 text-center">
                          <p className="text-2xl font-black text-slate-800 tabular-nums">{analyticsData.totalFaculty}</p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Faculty Pool</p>
                      </div>
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-3">
                    <p className="text-[8px] text-center w-full text-muted-foreground italic">Percent Aligned with Program Standards (CMO)</p>
                  </CardFooter>
              </Card>

              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="p-4 bg-muted/10 border-b"><CardTitle className="text-[10px] font-black uppercase text-center">Board Performance Index</CardTitle></CardHeader>
                  <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                      {program.isBoardProgram && analyticsData.latestBoard ? (
                        <>
                          <ChartContainer config={{}} className="h-[180px] w-full">
                              <ResponsiveContainer>
                                  <BarChart data={analyticsData.boardComparisonData} margin={{ top: 20 }}>
                                      <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                      <YAxis domain={[0, 100]} hide />
                                      <RechartsTooltip content={<ChartTooltipContent />} />
                                      <Bar dataKey="rate" radius={[4, 4, 0, 0]} barSize={30}>
                                          {analyticsData.boardComparisonData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                          <LabelList dataKey="rate" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: '10px', fontWeight: '900' }} />
                                      </Bar>
                                  </BarChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                          <p className="text-[9px] font-black text-primary mt-4 uppercase">Latest Exam: {analyticsData.latestBoard.examDate}</p>
                        </>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-10 opacity-20 text-center">
                              <Gavel className="h-10 w-10 mb-2" />
                              <p className="text-[9px] font-black uppercase tracking-widest">N/A OR DATA PENDING</p>
                          </div>
                      )}
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-3">
                    <p className="text-[8px] text-center w-full text-muted-foreground italic">Source: PRC Official Board Results Ledger</p>
                  </CardFooter>
              </Card>
          </div>
      </div>

      {/* 3. ACCREDITATION RECOMMENDATIONS REGISTRY */}
      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2 text-primary">
                          <ListChecks className="h-5 w-5" />
                          <CardTitle className="text-lg font-black uppercase tracking-tight">Accreditor's Recommendations & Compliance Log</CardTitle>
                      </div>
                      <CardDescription className="text-xs">Consolidated registry of mandatory and enhancement requirements from all active milestones.</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white text-primary border-primary/20 h-6 px-4 font-black text-xs">
                      {analyticsData.recommendations.length} TOTAL ITEMS
                  </Badge>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-muted/30">
                          <TableRow>
                              <TableHead className="w-[120px] pl-8 text-[10px] font-black uppercase">Source Level</TableHead>
                              <TableHead className="w-[100px] text-[10px] font-black uppercase">Type</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Recommendation Text</TableHead>
                              <TableHead className="text-[10px] font-black uppercase">Accountable Units</TableHead>
                              <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Current Status</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {analyticsData.recommendations.map((reco, idx) => (
                              <TableRow key={reco.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell className="pl-8 py-5">
                                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[9px] h-5">{reco.milestoneLevel}</Badge>
                                  </TableCell>
                                  <TableCell>
                                      <Badge variant={reco.type === 'Mandatory' ? 'destructive' : 'secondary'} className="h-5 text-[8px] font-black uppercase">
                                          {reco.type}
                                      </Badge>
                                  </TableCell>
                                  <TableCell className="py-5">
                                      <p className="text-xs font-bold text-slate-800 leading-relaxed italic">"{reco.text}"</p>
                                      {reco.additionalInfo && (
                                          <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase">
                                              <Info className="h-3 w-3" /> Area: {reco.additionalInfo}
                                          </div>
                                      )}
                                  </TableCell>
                                  <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                          {(reco.assignedUnitIds || []).map(uid => (
                                              <Badge key={uid} variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 h-4 px-1.5 text-[8px] font-bold">
                                                  {unitMap.get(uid) || uid}
                                              </Badge>
                                          ))}
                                          {!reco.assignedUnitIds?.length && <span className="text-[9px] text-muted-foreground italic">Institutional</span>}
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-right pr-8">
                                      <Badge 
                                          className={cn(
                                              "h-6 px-3 text-[9px] font-black uppercase border-none shadow-sm",
                                              reco.status === 'Open' ? "bg-rose-600 text-white" : 
                                              reco.status === 'In Progress' ? "bg-amber-500 text-amber-950" : 
                                              "bg-emerald-600 text-white"
                                          )}
                                      >
                                          {reco.status}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                          {analyticsData.recommendations.length === 0 && (
                              <TableRow>
                                  <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                                      <div className="flex flex-col items-center gap-2 opacity-20">
                                          <ClipboardCheck className="h-10 w-10" />
                                          <p className="text-xs font-black uppercase tracking-widest">No recommendations recorded</p>
                                      </div>
                                  </TableCell>
                              </TableRow>
                          )}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-4 px-8">
              <div className="flex items-start gap-4">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-emerald-900">Compliance Standard: AACCUP/ISO Parity</p>
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                          This registry tracks the specific improvements mandated by external accreditors. Units identified in the "Accountable Units" column are responsible for submitting evidence logs of implementation through the relevant compliance modules.
                      </p>
                  </div>
              </div>
          </CardFooter>
      </Card>

      {/* 4. EVIDENCE VAULT */}
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
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-8 text-[9px] text-muted-foreground italic font-medium">
              Data Source: Integrated Digital Evidence Logs (Google Drive Cloud Storage).
          </CardFooter>
      </Card>

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
            <DialogHeader className="p-5 border-b bg-slate-50 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <DialogTitle className="text-sm font-black uppercase tracking-tight">{previewDoc?.title}</DialogTitle>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Document Verification Preview</p>
                    </div>
                    <Badge variant="secondary" className="h-5 text-[9px] font-bold">AY {selectedYear}</Badge>
                </div>
            </DialogHeader>
            <div className="flex-1 bg-muted relative group">
                {previewDoc && (
                    <iframe src={previewDoc.url} className="absolute inset-0 w-full h-full border-none bg-white z-10" allow="autoplay" title={previewDoc.title} />
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
