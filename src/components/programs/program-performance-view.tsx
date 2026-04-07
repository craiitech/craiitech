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
    ListChecks
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
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Separator } from '../ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccreditationRecommendationReport } from './recommendation-print-template';

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

  /**
   * COMPLIANCE HISTORY FETCHING
   * Strictly scoped to the academic unit AND campus site.
   */
  const carQuery = useMemoFirebase(() => {
    if (!firestore || !record?.unitId || !record?.campusId) return null;
    return query(
        collection(firestore, 'correctiveActionRequests'), 
        where('unitId', '==', record.unitId),
        where('campusId', '==', record.campusId)
    );
  }, [firestore, record?.unitId, record?.campusId]);
  const { data: unitCars } = useCollection<CorrectiveActionRequest>(carQuery);

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

    // 2. Faculty Alignment Analysis (Pie)
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

    // 3. Board Performance
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
    const latestAccreditation = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];

    const now = new Date();
    const currentYear = now.getFullYear();
    
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
    if (record.ched?.copcStatus !== 'With COPC') {
        gaps.push({ type: 'Institutional Authority', msg: 'Program is operating without an active COPC.', priority: 'High', target: 'ched' });
    }
    
    if (!program.isNewProgram) {
        if (program.hasSpecializations) {
            program.specializations?.forEach(spec => {
                const m = currentAccreditationByMajor[spec.id] || currentAccreditationByMajor['General'];
                if (!m || m.level === 'Non Accredited') {
                    gaps.push({ type: 'Academic Quality', msg: `Missing accreditation record for specialization: ${spec.name}`, priority: 'Medium', target: 'accreditation' });
                } else {
                    const yearMatch = m.statusValidityDate?.match(/\d{4}/);
                    const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                    if (dYear > 0 && dYear < currentYear) {
                        gaps.push({ 
                            type: 'Institutional Compliance', 
                            msg: `OVERDUE accreditation for ${spec.name} (Validity expired: ${m.statusValidityDate}).`, 
                            priority: 'High', 
                            target: 'accreditation' 
                        });
                    }
                }
            });
        } else if (!latestAccreditation || latestAccreditation.level === 'Non Accredited') {
            gaps.push({ type: 'Academic Quality', msg: 'No active accreditation status recorded.', priority: 'Medium', target: 'accreditation' });
        } else {
            const yearMatch = latestAccreditation.statusValidityDate?.match(/\d{4}/);
            const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
            if (dYear > 0 && dYear < currentYear) {
                gaps.push({ 
                    type: 'Institutional Compliance', 
                    msg: `Program accreditation is OVERDUE (Expired: ${latestAccreditation.statusValidityDate}).`, 
                    priority: 'High', 
                    target: 'accreditation' 
                });
            }
        }
    }

    if (totalFaculty === 0) {
        gaps.push({ type: 'Resource Quality', msg: 'Faculty registry is incomplete for the current AY.', priority: 'High', target: 'faculty' });
    } else if (alignmentRate < 100) {
        gaps.push({ type: 'Resource Quality', msg: `${totalFaculty - alignedFaculty} faculty members do not meet CMO qualification requirements.`, priority: 'Medium', target: 'faculty' });
    }
    
    if (program.hasSpecializations) {
        program.specializations?.forEach(spec => {
            if (!curriculaByMajor[spec.id] && !curriculaByMajor['General']) {
                gaps.push({ type: 'Compliance', msg: `No curriculum notation evidence found for specialization: ${spec.name}`, priority: 'Medium', target: 'curriculum' });
            }
        });
    }

    if (program.isBoardProgram) {
        if (!record.boardPerformance || record.boardPerformance.length === 0) {
            gaps.push({ type: 'Professional Outcomes', msg: 'Mandatory Board Licensure Performance results are missing.', priority: 'High', target: 'outcomes' });
        }
    }

    if (!record.graduationRecords || record.graduationRecords.length === 0) {
        gaps.push({ type: 'Institutional Data', msg: 'Graduation outcome registry is empty.', priority: 'Medium', target: 'outcomes' });
    }

    const nextScheduleDate = program.isNewProgram ? 'NEW PROGRAM' : (latestAccreditation?.statusValidityDate || 'TBA');

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
        gaps 
    };
  }, [record, program]);

  const handlePrintReco = () => {
    if (!record || !analyticsData) return;

    try {
        const flatRecos = (record.accreditationRecords || []).flatMap(milestone => {
            return (milestone.recommendations || []).map(reco => ({
                programName: program.name,
                abbreviation: program.abbreviation,
                level: milestone.level,
                surveyDate: milestone.dateOfSurvey,
                recommendation: reco
            }));
        });

        const reportHtml = renderToStaticMarkup(
            <AccreditationRecommendationReport 
                items={flatRecos}
                unitMap={unitMap}
                scope="program"
                year={selectedYear}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>Accreditation Recommendations - ${program.abbreviation}</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } } body { font-family: serif; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest">Print Recommendations Report</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (e) {
        console.error(e);
    }
  };

  const categorizedDocs = useMemo(() => {
    if (!record) return { governance: [], accreditation: [], curriculum: [], monitoring: [] };
    const docs = { governance: [] as any[], accreditation: [] as any[], curriculum: [] as any[], monitoring: [] as any[] };
    
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
    
    if (!program.isActive && record.ched?.closureResolutionLink) {
        docs.governance.push({ 
            id: 'bor-closure', 
            title: 'BOR Resolution for Closure', 
            url: record.ched.closureResolutionLink, 
            status: record.ched.closureApprovalDate || 'Approved' 
        });
    }

    (record.curriculumRecords || []).forEach((curr, idx) => {
        if (curr.notationProofLink) {
            const majorName = program.specializations?.find(s => s.id === curr.majorId)?.name || 'General';
            docs.curriculum.push({ id: `note-${idx}`, title: `Notation: ${majorName}`, url: curr.notationProofLink, status: curr.dateNoted });
        }
    });

    (record.accreditationRecords || []).forEach((acc, idx) => { if (acc.certificateLink) docs.accreditation.push({ id: `acc-${idx}`, title: `${acc.level} Certificate`, url: acc.certificateLink, status: acc.lifecycleStatus }); });
    
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
            <p className="text-sm text-muted-foreground max-sm">Please populate the compliance modules to activate decision support analytics.</p>
        </div>
    );
  }

  const getEmbedUrl = (url: string) => url.replace('/view', '/preview').replace('?usp=sharing', '');

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {!program.isActive && (
          <Card className="border-destructive bg-destructive/10 shadow-lg overflow-hidden animate-in zoom-in duration-500">
              <div className="flex flex-col md:flex-row">
                  <div className="p-6 bg-destructive text-white flex flex-col items-center justify-center text-center md:w-64 shrink-0">
                      <FileX className="h-12 w-12 mb-3" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Terminal Authority</p>
                      <p className="font-black text-lg leading-tight mt-1">SUBJECT FOR CLOSURE</p>
                  </div>
                  <div className="p-6 flex-1 bg-white">
                      <div className="space-y-4">
                          <div className="flex items-center gap-2">
                              <Gavel className="h-5 w-5 text-destructive" />
                              <h3 className="font-black text-sm uppercase text-slate-900 tracking-tight">Board Referendum for Program Closure</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Official Approval Date</p>
                                  <p className="text-lg font-black text-slate-800">
                                      {record.ched?.closureApprovalDate ? format(new Date(record.ched.closureApprovalDate), 'MMMM dd, yyyy') : 'PENDING'}
                                  </p>
                              </div>
                              <div className="space-y-1">
                                  <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">BOR-Referendum No.</p>
                                  <div className="flex items-center gap-2">
                                      <Hash className="h-4 w-4 text-primary" />
                                      <p className="text-lg font-black text-primary font-mono">
                                          {record.ched?.closureReferendumNumber || 'NOT RECORDED'}
                                      </p>
                                  </div>
                              </div>
                              <div className="flex items-end">
                                  {record.ched?.closureResolutionLink ? (
                                      <Button 
                                          variant="destructive" 
                                          className="w-full font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20 h-10"
                                          onClick={() => setPreviewDoc({ title: 'BOR Closure Resolution', url: getEmbedUrl(record.ched!.closureResolutionLink!) })}
                                      >
                                          <ExternalLink className="h-4 w-4 mr-2" />
                                          View Resolution
                                      </Button>
                                  ) : (
                                      <div className="w-full p-2 rounded bg-muted/50 border border-dashed flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground uppercase italic">
                                          <Info className="h-3.5 w-3.5" />
                                          Evidence link missing
                                      </div>
                                  )}
                              </div>
                          </div>
                          <Separator />
                          <p className="text-[11px] text-muted-foreground font-medium italic leading-relaxed">
                              This program has been officially designated for terminal closure by the University Board of Regents.
                          </p>
                      </div>
                  </div>
              </div>
          </Card>
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-primary/10 shadow-lg overflow-hidden flex flex-col">
              <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                      <ListChecks className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Recommendations Registry</CardTitle>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePrintReco} className="h-8 text-[9px] font-black bg-white shadow-sm gap-1.5">
                      <Printer className="h-3.5 w-3.5" /> PRINT ACTIONS
                  </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-[400px]">
                      <div className="divide-y">
                          {(record.accreditationRecords || []).flatMap(milestone => 
                              (milestone.recommendations || []).map((reco, rIdx) => (
                                  <div key={`${milestone.id}-${rIdx}`} className="p-4 hover:bg-muted/20 transition-colors">
                                      <div className="flex items-start gap-4">
                                          <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-1", reco.type === 'Mandatory' ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600")}>
                                              {reco.type === 'Mandatory' ? <ShieldAlert className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-2">
                                              <div className="flex items-center justify-between">
                                                  <Badge variant="secondary" className="h-4 text-[8px] font-black uppercase">{milestone.level} &bull; {reco.type}</Badge>
                                                  <Badge className={cn("h-4 text-[8px] font-black uppercase", reco.status === 'Closed' ? "bg-emerald-600" : "bg-amber-50")}>{reco.status}</Badge>
                                              </div>
                                              <p className="text-xs font-bold text-slate-800 leading-relaxed italic">"{reco.text}"</p>
                                              <div className="flex flex-wrap gap-1.5">
                                                  {reco.assignedUnitIds?.map(uid => (
                                                      <Badge key={uid} variant="outline" className="h-4 text-[7px] font-black border-primary/20 text-primary bg-primary/5 uppercase">
                                                          {unitMap.get(uid) || uid}
                                                      </Badge>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              ))
                          )}
                          {!(record.accreditationRecords?.some(m => m.recommendations?.length)) && (
                              <div className="py-20 text-center opacity-20">
                                  <Activity className="h-10 w-10 mx-auto" />
                                  <p className="text-[10px] font-black uppercase mt-2">Registry is Empty</p>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>

          <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive opacity-50" />
              <CardHeader className="bg-destructive/10 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-destructive">
                          <ShieldAlert className="h-5 w-5 text-destructive" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Strategic Risk Registry</CardTitle>
                      </div>
                      <Badge variant="destructive" className="animate-pulse shadow-sm h-5 text-[9px] font-black uppercase">SYSTEM ALERTS</Badge>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
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
                                          <div className="mt-3 flex items-center gap-2">
                                              <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                onClick={() => onResolveDeficiency?.(gap.target)}
                                                className="h-6 text-[9px] font-black uppercase text-primary gap-1 p-0 px-2 hover:bg-primary/5"
                                              >
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
                                      <p className="text-xs text-muted-foreground">This program meets all institutional compliance criteria for {selectedYear}.</p>
                                  </div>
                              </div>
                          )}
                      </div>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>

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
            <div className="absolute top-0 right-0 p-2 opacity-5"><CalendarDays className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Next Accreditation Schedule</CardDescription>
                <CardTitle className={cn("text-lg font-black truncate uppercase text-slate-900", program.isNewProgram && "text-amber-600")}>
                    {analyticsData.nextScheduleDate}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Badge variant="outline" className={cn("bg-white text-[9px] font-black uppercase shadow-sm", program.isNewProgram ? "text-amber-700 border-amber-200" : "text-emerald-700 border-emerald-200")}>
                    {program.isNewProgram ? 'NEW PROGRAM OFFERING' : 'VALIDATED SCHEDULE'}
                </Badge>
            </CardContent>
        </Card>

        <Card className="bg-blue-50/50 border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Users className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-600">Resource Alignment</CardDescription>
                <CardTitle className="text-3xl font-black text-blue-700 tabular-nums tracking-tighter">{analyticsData.alignmentRate}%</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-[10px] text-blue-800/60 font-bold uppercase tracking-tight">{analyticsData.totalFaculty} Personnel Registered</p>
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
                            <TableRow>
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
                                        No personnel recorded.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-1">
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
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
      </div>

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
                </div>
            </DialogHeader>
            <div className="flex-1 bg-muted relative group">
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
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
