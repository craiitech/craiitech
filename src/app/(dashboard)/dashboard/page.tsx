
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { cn, isCycleActive } from '@/lib/utils';
import { Overview } from '@/components/dashboard/overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  Megaphone,
  ShieldCheck,
  BarChart,
  LayoutDashboard,
  BrainCircuit,
  ClipboardCheck,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Pencil,
  Globe,
  Briefcase,
  Home as HomeIcon,
  Circle,
  Calendar,
  Activity,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Gavel,
  Target,
  Award,
  GraduationCap,
  ListChecks,
  Zap,
  TriangleAlert,
  Plus,
  Trash2,
  ExternalLink
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import {
  collection,
  query,
  where,
  doc,
  Timestamp,
  orderBy,
  limit,
  updateDoc,
} from '@/firebase/firestore-wrapper';
import { Progress } from '@/components/ui/progress';
import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle, AlertCloseButton } from '@/components/ui/alert';
import { UnitsWithoutSubmissions } from '@/components/dashboard/units-without-submissions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { SubmissionAnalytics } from '@/components/dashboard/submission-analytics';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { IncompleteCampusSubmissions } from '@/components/dashboard/incomplete-campus-submissions';
import { CompletedSubmissions } from '@/components/dashboard/completed-submissions';
import { SubmissionSchedule } from '@/components/dashboard/submission-schedule';
import { RiskStatusOverview } from '@/components/dashboard/risk-status-overview';
import { OverdueWarning } from '@/components/dashboard/overdue-warning';
import { UnitSubmissionDetailCard } from '@/components/dashboard/unit-submission-detail-card';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { ComplianceOverTime } from '@/components/dashboard/strategic/compliance-over-time';
import { RiskMatrix } from '@/components/dashboard/strategic/risk-matrix';
import { RiskFunnel } from '@/components/dashboard/strategic/risk-funnel';
import { normalizeReportType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplianceHeatmap } from '@/components/dashboard/strategic/compliance-heatmap';
import { MaturityRadar } from '@/components/dashboard/strategic/maturity-radar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UnitAuditSchedule } from '@/components/dashboard/unit-audit-schedule';
import { UnitActionCenter } from '@/components/dashboard/unit-action-center';
import { ExecutiveOverview } from '@/components/dashboard/executive-overview';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT, submissionTypes } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';
import { AuditorOfflineManager } from '@/components/audit/auditor-offline-manager';
import { AuditorPortfolioDialog } from '@/components/dashboard/auditor-portfolio-dialog';
import { useToast } from '@/hooks/use-toast';
import { AuditAnalytics } from '@/components/audit/audit-analytics';
import { AuditResultsView } from '@/components/audit/audit-results-view';
import { ChedProgramsTab } from '@/components/dashboard/executive/ched-programs-tab';
import { RiskOpportunityTab } from '@/components/dashboard/executive/risk-opportunity-tab';
import { CorrectiveActionsTab } from '@/components/dashboard/executive/corrective-actions-tab';
import { ActionableDecisionsTab } from '@/components/dashboard/executive/actionable-decisions-tab';
import { ScheduleTab } from '@/components/dashboard/executive/schedule-tab';
import type {
  Submission,
  User as AppUser,
  Unit,
  Campus,
  Cycle,
  Risk,
  AuditSchedule,
  CorrectiveActionRequest,
  ManagementReviewOutput,
  ProgramComplianceRecord,
  AuditPlan,
  AuditFinding,
  ISOClause,
  Signatories,
  AcademicProgram
} from '@/lib/types';

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  submitted: 'outline',
  'awaiting approval': 'outline',
};

interface EomsScoreResult {
  score: number;
  grade: string;
  label: string;
  color: string;
  breakdown: {
    submissions: number;
    audits: number;
    cars: number;
    risks: number;
    ched: number;
    accreditation: number;
  };
}

function calculateEomsScore(
  scope: 'university' | 'campus' | 'unit',
  scopeId: string | undefined,
  data: {
    submissions: Submission[] | null;
    risks: Risk[] | null;
    cars: CorrectiveActionRequest[] | null;
    allCompliances: ProgramComplianceRecord[] | null;
    academicPrograms: AcademicProgram[] | null;
    schedules: AuditSchedule[] | null;
    units: Unit[] | null;
    campuses: Campus[] | null;
    selectedYear: number;
    cycles?: Cycle[] | null;
  }
): EomsScoreResult {
  const { submissions = [], risks = [], cars = [], allCompliances = [], academicPrograms = [], schedules = [], units = [], campuses = [], selectedYear, cycles = [] } = data;

  // Filter collections by scope
  let scopedSubmissions = submissions || [];
  let scopedRisks = risks || [];
  let scopedCars = cars || [];
  let scopedCompliances = allCompliances || [];
  let scopedPrograms = academicPrograms || [];
  let scopedSchedules = schedules || [];
  let scopedUnits = units || [];

  if (scope === 'campus' && scopeId) {
    scopedSubmissions = scopedSubmissions.filter(s => s.campusId === scopeId);
    scopedRisks = scopedRisks.filter(r => r.campusId === scopeId);
    scopedCars = scopedCars.filter(c => c.campusId === scopeId);
    scopedCompliances = scopedCompliances.filter(c => c.campusId === scopeId);
    scopedPrograms = scopedPrograms.filter(p => p.campusId === scopeId);
    scopedSchedules = scopedSchedules.filter(s => s.campusId === scopeId);
    scopedUnits = scopedUnits.filter(u => u.campusIds?.includes(scopeId));
  } else if (scope === 'unit' && scopeId) {
    scopedSubmissions = scopedSubmissions.filter(s => s.unitId === scopeId);
    scopedRisks = scopedRisks.filter(r => r.unitId === scopeId);
    scopedCars = scopedCars.filter(c => c.unitId === scopeId);
    scopedCompliances = scopedCompliances.filter(c => c.unitId === scopeId || c.programId === scopeId);
    scopedPrograms = scopedPrograms.filter(p => p.id === scopeId);
    scopedSchedules = scopedSchedules.filter(s => s.targetId === scopeId);
    scopedUnits = scopedUnits.filter(u => u.id === scopeId);
  }

  const isIqaUnit = scope === 'unit' && scopedUnits.some(u => u.name?.toLowerCase() === 'internal quality audit' || u.name?.toLowerCase() === 'iqa');
  const isSubmissionActive = !isIqaUnit;

  // 1. SUBMISSION COMPLIANCE RATE
  const approvedSubs = scopedSubmissions.filter(s => Number(s.year) === Number(selectedYear) && s.statusId === 'approved');
  const nonIqaUnitsForExpected = scopedUnits.filter(u => u.name?.toLowerCase() !== 'internal quality audit' && u.name?.toLowerCase() !== 'iqa');
  
  const isFirstActive = isCycleActive('first', selectedYear, cycles);
  const isFinalActive = isCycleActive('final', selectedYear, cycles);
  let expectedCycles = 0;
  if (isFirstActive) expectedCycles += 1;
  if (isFinalActive) expectedCycles += 1;

  const expectedSubs = scope === 'unit' ? (isIqaUnit ? 0 : expectedCycles) : (nonIqaUnitsForExpected.length || 1) * expectedCycles;
  const submissionRate = expectedSubs > 0 ? Math.min(100, Math.round((approvedSubs.length / expectedSubs) * 100)) : 0;

  // 2. IQA PROGRESS RATE
  const yearSchedules = scopedSchedules.filter(s => {
    if (!s.scheduledDate) return false;
    const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
    return date.getFullYear() === selectedYear;
  });
  const completedAudits = yearSchedules.filter(s => s.status === 'Completed');
  const iqaProgressRate = yearSchedules.length > 0 ? Math.round((completedAudits.length / yearSchedules.length) * 100) : 0;

  // 3. CORRECTIVE ACTION REQUEST (CAR) CLOSURE RATE
  const yearCars = scopedCars.filter(c => {
    if (!c.createdAt) return true;
    const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
    return date.getFullYear() === selectedYear;
  });
  const closedCars = yearCars.filter(c => c.status === 'Closed');
  const carResolutionRate = yearCars.length > 0 ? Math.round((closedCars.length / yearCars.length) * 100) : 0;

  // 4. ACCREDITATION GAPS RESOLUTION RATE
  const recs = scopedCompliances.reduce((acc: any[], c) => {
    c.accreditationRecords?.forEach(ar => {
      ar.recommendations?.forEach(rec => {
        acc.push(rec);
      });
    });
    return acc;
  }, []);
  const closedRecs = recs.filter(r => r.status === 'Closed');
  const accreditationRate = recs.length > 0 ? Math.round((closedRecs.length / recs.length) * 100) : 0;

  // 5. CHED COPC RATE
  const copcCompliant = scopedCompliances.filter(c => c.ched?.copcStatus === 'With COPC');
  const totalPrograms = scopedPrograms.length;
  const chedRate = totalPrograms > 0 ? Math.round((copcCompliant.length / totalPrograms) * 100) : 0;

  // 6. RISK MITIGATION RATE
  const yearRisks = scopedRisks.filter(r => r.year === selectedYear);
  const mitigatedRisks = yearRisks.filter(r => r.status === 'Closed' || r.preTreatment?.rating === 'low' || r.postTreatment?.rating === 'low');
  const riskRate = yearRisks.length > 0 ? Math.round((mitigatedRisks.length / yearRisks.length) * 100) : 0;

  // Weighted average
  const metrics = [
    { value: submissionRate, weight: 0.25, active: isSubmissionActive },
    { value: iqaProgressRate, weight: 0.20, active: yearSchedules.length > 0 },
    { value: carResolutionRate, weight: 0.20, active: yearCars.length > 0 },
    { value: riskRate, weight: 0.15, active: yearRisks.length > 0 },
    { value: chedRate, weight: 0.10, active: totalPrograms > 0 },
    { value: accreditationRate, weight: 0.10, active: recs.length > 0 },
  ];

  const activeMetrics = metrics.filter(m => m.active);
  const totalWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
  const score = totalWeight > 0 
    ? Math.round(activeMetrics.reduce((sum, m) => sum + (m.value * m.weight), 0) / totalWeight) 
    : 0;

  // Letter Grade & Status Details
  let grade = 'F';
  let label = 'Critical Non-compliance';
  let color = 'bg-rose-600 border-rose-700 text-white';

  if (score >= 95) {
    grade = 'A+';
    label = 'Outstanding Institutional Excellence';
    color = 'bg-emerald-600 border-emerald-700 text-white';
  } else if (score >= 88) {
    grade = 'A';
    label = 'Mature EOMS Alignment';
    color = 'bg-emerald-500 border-emerald-600 text-white';
  } else if (score >= 80) {
    grade = 'A-';
    label = 'Highly Compliant QMS';
    color = 'bg-teal-600 border-teal-700 text-white';
  } else if (score >= 70) {
    grade = 'B+';
    label = 'Good Standing';
    color = 'bg-blue-600 border-blue-700 text-white';
  } else if (score >= 60) {
    grade = 'B';
    label = 'Satisfactory Compliance';
    color = 'bg-blue-500 border-blue-600 text-white';
  } else if (score >= 50) {
    grade = 'B-';
    label = 'Passable Standing';
    color = 'bg-amber-600 border-amber-700 text-white';
  } else if (score >= 40) {
    grade = 'C';
    label = 'Needs Immediate Review';
    color = 'bg-amber-500 border-amber-600 text-white';
  }

  return {
    score,
    grade,
    label,
    color,
    breakdown: {
      submissions: submissionRate,
      audits: iqaProgressRate,
      cars: carResolutionRate,
      risks: riskRate,
      ched: chedRate,
      accreditation: accreditationRate
    }
  };
}

const HeaderRatings = ({ universityRating, scopedRating, scopedRatingType }: { 
  universityRating: EomsScoreResult; 
  scopedRating: EomsScoreResult | null; 
  scopedRatingType?: string; 
}) => {
  const getTextColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-600 dark:text-emerald-400';
    if (grade.startsWith('B+')) return 'text-teal-600 dark:text-teal-400';
    if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
    if (grade.startsWith('B-') || grade.startsWith('C')) return 'text-amber-600 dark:text-amber-500';
    return 'text-rose-600 dark:text-rose-500';
  };

  const getBorderColorClass = (grade: string) => {
    if (grade.startsWith('A')) return 'border-emerald-200 hover:border-emerald-300';
    if (grade.startsWith('B+')) return 'border-teal-200 hover:border-teal-300';
    if (grade.startsWith('B')) return 'border-blue-200 hover:border-blue-300';
    return 'border-amber-200 hover:border-amber-300';
  };

  const getScopedIconColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-indigo-600 dark:text-indigo-400';
    if (grade.startsWith('B+')) return 'text-purple-600 dark:text-purple-400';
    if (grade.startsWith('B')) return 'text-blue-600 dark:text-blue-400';
    return 'text-amber-600 dark:text-amber-500';
  };

  const getScopedBorderColorClass = (grade: string) => {
    if (grade.startsWith('A')) return 'border-indigo-200 hover:border-indigo-300';
    if (grade.startsWith('B+')) return 'border-purple-200 hover:border-purple-300';
    if (grade.startsWith('B')) return 'border-blue-200 hover:border-blue-300';
    return 'border-amber-200 hover:border-amber-300';
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-3">
        {/* University Rating */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex flex-col items-end px-4 py-2 rounded-xl border cursor-help shadow-sm transition-all hover:scale-105 duration-200 bg-white",
              getBorderColorClass(universityRating.grade)
            )}>
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">University Rating</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <Award className={cn("h-5 w-5 shrink-0", getTextColor(universityRating.grade))} />
                <span className={cn("text-2xl font-black tracking-tight leading-none tabular-nums", getTextColor(universityRating.grade))}>
                  {universityRating.score}%
                </span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-slate-900 border-slate-950 text-white p-4 rounded-xl shadow-xl w-72 z-50">
            <div className="space-y-2">
              <div className="border-b border-white/10 pb-1.5">
                <h5 className="font-black text-[10px] uppercase text-emerald-400">University Quality Rating</h5>
                <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{universityRating.label}</p>
              </div>
              <div className="space-y-1.5 text-[9px] font-bold uppercase tracking-wider">
                <div className="flex justify-between"><span>Submissions:</span><span className="font-black text-emerald-400">{universityRating.breakdown.submissions}%</span></div>
                <div className="flex justify-between"><span>IQA Audits:</span><span className="font-black text-emerald-400">{universityRating.breakdown.audits}%</span></div>
                <div className="flex justify-between"><span>CAR Resolution:</span><span className="font-black text-emerald-400">{universityRating.breakdown.cars}%</span></div>
                <div className="flex justify-between"><span>Risk Treatment:</span><span className="font-black text-emerald-400">{universityRating.breakdown.risks}%</span></div>
                <div className="flex justify-between"><span>CHED Programs:</span><span className="font-black text-emerald-400">{universityRating.breakdown.ched}%</span></div>
                <div className="flex justify-between"><span>Accreditation Gaps:</span><span className="font-black text-emerald-400">{universityRating.breakdown.accreditation}%</span></div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Scoped Rating (Unit or Site) */}
        {scopedRating && scopedRatingType && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex flex-col items-end px-4 py-2 rounded-xl border cursor-help shadow-sm transition-all hover:scale-105 duration-200 bg-white",
                getScopedBorderColorClass(scopedRating.grade)
              )}>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground leading-none">{scopedRatingType} Rating</span>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <TrendingUp className={cn("h-5 w-5 shrink-0", getScopedIconColor(scopedRating.grade))} />
                  <span className={cn("text-2xl font-black tracking-tight leading-none tabular-nums", getScopedIconColor(scopedRating.grade))}>
                    {scopedRating.score}%
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-slate-900 border-slate-950 text-white p-4 rounded-xl shadow-xl w-72 z-50">
              <div className="space-y-2">
                <div className="border-b border-white/10 pb-1.5">
                  <h5 className="font-black text-[10px] uppercase text-indigo-400">{scopedRatingType} EOMS Rating</h5>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-0.5">{scopedRating.label}</p>
                </div>
                <div className="space-y-1.5 text-[9px] font-bold uppercase tracking-wider">
                  <div className="flex justify-between"><span>Submissions:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.submissions}%</span></div>
                  {scopedRating.breakdown.audits > 0 && <div className="flex justify-between"><span>IQA Audits:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.audits}%</span></div>}
                  {scopedRating.breakdown.cars > 0 && <div className="flex justify-between"><span>CAR Resolution:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.cars}%</span></div>}
                  {scopedRating.breakdown.risks > 0 && <div className="flex justify-between"><span>Risk Treatment:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.risks}%</span></div>}
                  {scopedRating.breakdown.ched > 0 && <div className="flex justify-between"><span>CHED Programs:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.ched}%</span></div>}
                  {scopedRating.breakdown.accreditation > 0 && <div className="flex justify-between"><span>Accreditation Gaps:</span><span className="font-black text-indigo-400">{scopedRating.breakdown.accreditation}%</span></div>}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

const FullScreenLoader = () => (
    <div className="flex h-screen w-full items-center justify-center p-4 bg-background/60 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in duration-700">
            <div className="relative h-20 w-20 rounded-3xl bg-white shadow-2xl border border-primary/10 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="space-y-1">
                <h2 className="text-xl font-black uppercase tracking-[0.3em] text-primary">Synchronizing Institutional Data</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Accessing RSU Quality Management System Cloud Registry...</p>
            </div>
        </div>
    </div>
);

export default function HomePage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor, isVp, isAuditor } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleAddPortfolio = async (values: any) => {
    if (!firestore || !userProfile) return;
    const userRef = doc(firestore, 'users', userProfile.id);
    const currentPortfolios = userProfile.portfolios || [];
    const newItem = {
      id: Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(),
      title: values.title,
      googleDriveLink: values.googleDriveLink,
      dateAcquired: values.dateAcquired,
    };
    const updatedPortfolios = [...currentPortfolios, newItem];
    try {
      await updateDoc(userRef, { portfolios: updatedPortfolios });
      toast({
        title: "Portfolio item added",
        description: `Successfully added "${values.title}" to your portfolio.`,
      });
    } catch (error) {
      console.error('Error adding portfolio item:', error);
      toast({
        title: "Error adding item",
        description: "Failed to save portfolio item to your profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePortfolio = async (itemId: string) => {
    if (!firestore || !userProfile) return;
    const userRef = doc(firestore, 'users', userProfile.id);
    const currentPortfolios = userProfile.portfolios || [];
    const updatedPortfolios = currentPortfolios.filter(item => item.id !== itemId);
    try {
      await updateDoc(userRef, { portfolios: updatedPortfolios });
      toast({
        title: "Portfolio item deleted",
        description: "The portfolio item has been removed.",
      });
    } catch (error) {
      console.error('Error deleting portfolio item:', error);
      toast({
        title: "Error deleting item",
        description: "Failed to delete portfolio item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const currentTab = searchParams.get('tab') || 'overview';

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isGlobalAnnouncementVisible, setIsGlobalAnnouncementVisible] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDetail, setSelectedDetail] = useState<{ unitId: string, campusId: string } | null>(null);
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);

  const roleLower = userRole?.toLowerCase() || '';
  const isPresident = roleLower.includes('president') && !roleLower.includes('vice');
  const isUniversityExecutive = isAdmin || isVp || isPresident || roleLower.includes('quality management') || roleLower.includes('qms') || roleLower.includes('qao');
  
  const isCampusLevel = roleLower.includes('campus director') || roleLower.includes('campus odimo');
  const isCampusSupervisor = isSupervisor && !isUniversityExecutive && isCampusLevel;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(allUnitsQuery);

  const isIqaUser = useMemo(() => {
    return userRole === 'Auditor' || allUnits?.find(u => u.id === userProfile?.unitId)?.name?.toLowerCase() === 'internal quality audit';
  }, [userRole, allUnits, userProfile]);

  const nonIqaUnits = useMemo(() => {
    if (!allUnits) return [];
    return allUnits.filter(u => u.name?.toLowerCase() !== 'internal quality audit' && u.name?.toLowerCase() !== 'iqa');
  }, [allUnits]);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'submissions');
    if (isUniversityExecutive) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isUniversityExecutive, isCampusSupervisor, isUserLoading]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissions = useMemo(() => {
    if (!rawSubmissions) return null;
    return rawSubmissions.map(s => {
      const date = s.submissionDate;
      return {
        ...s,
        year: Number(s.year),
        reportType: normalizeReportType(s.reportType),
        submissionDate: date instanceof Timestamp ? date.toDate() : new Date(date)
      }
    });
  }, [rawSubmissions]);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'risks');
    if (isUniversityExecutive) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isUniversityExecutive, isCampusSupervisor, isUserLoading]);

  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const carsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'correctiveActionRequests');
    if (isUniversityExecutive) return baseRef;
    if (isCampusSupervisor && userProfile.campusId) {
      return query(baseRef, where('campusId', '==', userProfile.campusId));
    }
    if (userProfile.unitId && userProfile.campusId) {
      return query(baseRef, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, userProfile, isUniversityExecutive, isCampusSupervisor, isUserLoading]);
  const { data: dashboardCars } = useCollection<CorrectiveActionRequest>(carsQuery);
  const allCars = dashboardCars;
  const unitCars = dashboardCars;

  const mrOutputsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore]);
  const { data: mrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const unitMrOutputs = useMemo(() => {
    if (!mrOutputs || !userProfile?.unitId) return [];
    return mrOutputs.filter(o => o.assignments?.some((a: any) => a.unitId === userProfile.unitId));
  }, [mrOutputs, userProfile]);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !selectedYear) return null;
    return query(collection(firestore, 'programCompliances'), where('academicYear', '==', selectedYear));
  }, [firestore, selectedYear]);
  const { data: allCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const unitCompliances = useMemo(() => {
    if (!allCompliances || !userProfile?.unitId) return [];
    return allCompliances.filter(c => (c as any).unitId === userProfile.unitId || c.programId === userProfile.unitId);
  }, [allCompliances, userProfile]);

  const unitRecommendations = useMemo(() => {
    if (!allCompliances || !userProfile?.unitId) return [];
    const recs: any[] = [];
    allCompliances.forEach(c => {
        c.accreditationRecords?.forEach(m => {
            m.recommendations?.forEach(reco => {
                if (reco.assignedUnitIds?.includes(userProfile.unitId)) {
                    recs.push({ ...reco, milestoneLevel: m.level, programId: c.programId });
                }
            });
        });
    });
    return recs;
  }, [allCompliances, userProfile]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const baseRef = collection(firestore, 'users');
    if (isUniversityExecutive || isIqaUser) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile?.campusId));
    return null;
  }, [firestore, isUniversityExecutive, isCampusSupervisor, userProfile, isIqaUser]);

  const { data: allUsersData } = useCollection<AppUser>(usersQuery);

  const allUsersMap = useMemo(() => {
    const userMap = new Map<string, AppUser>();
    if (allUsersData) allUsersData.forEach(u => userMap.set(u.id, u));
    if (userProfile && !userMap.has(userProfile.id)) userMap.set(userProfile.id, userProfile);
    return userMap;
  }, [allUsersData, userProfile]);

  const auditors = useMemo(() => {
    if (!allUsersData) return [];
    return allUsersData.filter(u => u.role?.toLowerCase() === 'auditor' || u.roleId?.toLowerCase() === 'auditor');
  }, [allUsersData]);

  const getAuditorPerformance = (auditorId: string) => {
    const auditorSchedules = dashboardSchedules?.filter(s => {
      if (!s.scheduledDate) return false;
      const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
      return date.getFullYear() === selectedYear && s.auditorId === auditorId;
    }) || [];

    const assignedCount = auditorSchedules.length;
    const completedCount = auditorSchedules.filter(s => s.status === 'Completed').length;

    let totalClauses = 0;
    let auditedClauses = 0;

    auditorSchedules.forEach(s => {
      if (!s.isoClausesToAudit) return;
      totalClauses += s.isoClausesToAudit.length;
      
      const scheduleFindings = allAuditFindings?.filter(f => f.auditScheduleId === s.id) || [];
      const findingClauses = new Set(scheduleFindings.map(f => f.isoClause));
      
      s.isoClausesToAudit.forEach(clause => {
        if (findingClauses.has(clause)) {
          auditedClauses++;
        }
      });
    });

    const utilizationRate = totalClauses > 0 ? Math.round((auditedClauses / totalClauses) * 100) : 0;
    const findingsLoggedCount = allAuditFindings?.filter(f => f.authorId === auditorId).length || 0;

    return {
      assignedCount,
      completedCount,
      utilizationRate,
      findingsLoggedCount,
      totalClauses,
      auditedClauses
    };
  };

  const campusMrOutputs = useMemo(() => {
    if (!mrOutputs || !userProfile?.campusId || !allUnits) return [];
    const campusUnitIds = new Set(allUnits.filter(u => u.campusIds?.includes(userProfile.campusId)).map(u => u.id));
    return mrOutputs.filter(o => o.assignments?.some((a: any) => campusUnitIds.has(a.unitId)));
  }, [mrOutputs, userProfile?.campusId, allUnits]);

  const academicProgramsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'academicPrograms') : null), [firestore]);
  const { data: academicPrograms } = useCollection<AcademicProgram>(academicProgramsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'campuses') : null, [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

  const filteredAcademicPrograms = useMemo(() => {
    if (!academicPrograms) return [];
    if (isUniversityExecutive) return academicPrograms;
    if (isCampusSupervisor && userProfile?.campusId) {
      return academicPrograms.filter(p => p.campusId === userProfile.campusId);
    }
    if (userProfile?.unitId) {
      return academicPrograms.filter(p => p.id === userProfile.unitId);
    }
    return [];
  }, [academicPrograms, isUniversityExecutive, isCampusSupervisor, userProfile]);

  const filteredCompliances = useMemo(() => {
    if (!allCompliances) return [];
    if (isUniversityExecutive) return allCompliances;
    if (isCampusSupervisor && userProfile?.campusId) {
      return allCompliances.filter(c => c.campusId === userProfile.campusId);
    }
    if (userProfile?.unitId) {
      return allCompliances.filter(c => c.programId === userProfile.unitId || c.unitId === userProfile.unitId);
    }
    return [];
  }, [allCompliances, isUniversityExecutive, isCampusSupervisor, userProfile]);

  const allCyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles } = useCollection<Cycle>(allCyclesQuery);



  const auditSchedulesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'auditSchedules');
    if (isUniversityExecutive || isIqaUser) return baseRef;
    if (isCampusLevel && userProfile.campusId) return query(baseRef, where('campusId', '==', userProfile.campusId));
    if (userProfile.unitId) return query(baseRef, where('targetId', '==', userProfile.unitId));
    return null;
  }, [firestore, userProfile, isUniversityExecutive, isCampusLevel, isUserLoading, isIqaUser]);

  const { data: dashboardSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(auditSchedulesQuery);

  const sortedMySchedules = useMemo(() => {
    if (!dashboardSchedules) return [];
    const mySchedules = dashboardSchedules.filter(s => {
      if (!s.scheduledDate) return false;
      const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
      return date.getFullYear() === selectedYear && s.auditorId === userProfile?.id;
    });
    return [...mySchedules].sort((a, b) => {
      const aDate = a.scheduledDate?.toDate ? a.scheduledDate.toDate() : new Date(a.scheduledDate);
      const bDate = b.scheduledDate?.toDate ? b.scheduledDate.toDate() : new Date(b.scheduledDate);
      return aDate.getTime() - bDate.getTime();
    });
  }, [dashboardSchedules, selectedYear, userProfile]);

  const assignedRecommendations = useMemo(() => {
    if (!allCompliances || !userProfile) return [];
    
    const results: any[] = [];
    allCompliances.forEach(record => {
        const officialCurrentMilestone = record.accreditationRecords?.find(m => m.lifecycleStatus === 'Current');
        const certificateLink = officialCurrentMilestone?.certificateLink;

        record.accreditationRecords?.forEach(milestone => {
            milestone.recommendations?.forEach(reco => {
                if (reco.status === 'Closed') return;

                let isRelevant = false;
                if (isUniversityExecutive) {
                    isRelevant = true;
                } else if (isCampusSupervisor) {
                    isRelevant = reco.assignedUnitIds?.some(uid => {
                        const unit = allUnits?.find(u => u.id === uid);
                        return unit?.campusIds?.includes(userProfile.campusId);
                    });
                } else {
                    isRelevant = reco.assignedUnitIds?.includes(userProfile.unitId);
                }

                if (isRelevant) {
                    const prog = academicPrograms?.find(p => p.id === record.programId);
                    results.push({
                        programId: record.programId,
                        programName: allUnits?.find(u => u.id === record.programId)?.name || 'Academic Program',
                        campusId: record.campusId,
                        level: milestone.level,
                        recommendation: reco,
                        certificateLink: certificateLink,
                        college: prog?.collegeId || '',
                        campus: campusMap.get(record.campusId) || 'Main'
                    });
                }
            });
        });
    });
    return results;
  }, [allCompliances, userProfile, allUnits, isUniversityExecutive, isCampusSupervisor, academicPrograms, campusMap]);

  const auditPlansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: allAuditPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const auditFindingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: allAuditFindings } = useCollection<AuditFinding>(auditFindingsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: allIsoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  // Admin-level CARs are loaded dynamically in the unified carsQuery above

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const yrSet = new Set<number>();
    for (let i = -2; i < 6; i++) yrSet.add(current - i);
    allCycles?.forEach(c => yrSet.add(Number(c.year)));
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [allCycles]);

  const campusSettingsRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId) return null;
    return doc(firestore, 'campusSettings', userProfile.campusId);
  }, [firestore, userProfile?.campusId]);
  const { data: campusSetting } = useDoc(campusSettingsRef);

  const globalSettingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'campusSettings', 'global') : null), [firestore]);
  const { data: globalSetting } = useDoc(globalSettingsRef);

  // EOMS Quality Score Calculations
  const eomsData = useMemo(() => ({
    submissions,
    risks,
    cars: allCars,
    allCompliances,
    academicPrograms,
    schedules: dashboardSchedules,
    units: allUnits,
    campuses,
    selectedYear,
    cycles: allCycles
  }), [submissions, risks, allCars, allCompliances, academicPrograms, dashboardSchedules, allUnits, campuses, selectedYear, allCycles]);

  const universityRating = useMemo(() => calculateEomsScore('university', undefined, eomsData), [eomsData]);

  const supervisorRating = useMemo(() => {
    if (!isCampusSupervisor || !userProfile?.campusId) return null;
    return calculateEomsScore('campus', userProfile.campusId, eomsData);
  }, [isCampusSupervisor, userProfile?.campusId, eomsData]);

  const unitRating = useMemo(() => {
    if (isUniversityExecutive || isCampusSupervisor || !userProfile?.unitId) return null;
    return calculateEomsScore('unit', userProfile.unitId, eomsData);
  }, [isUniversityExecutive, isCampusSupervisor, userProfile?.unitId, eomsData]);

  // Synchronize the computed university rating to public settings if admin
  useEffect(() => {
    if (isAdmin && firestore && universityRating) {
      const docRef = doc(firestore, 'campusSettings', 'global');
      // Update university rating in public settings so non-admin users can access the global rating
      updateDoc(docRef, {
        universityRating: {
          score: universityRating.score,
          grade: universityRating.grade,
          label: universityRating.label,
          color: universityRating.color,
          breakdown: universityRating.breakdown,
        }
      }).catch(err => console.error("Error writing university rating to Firestore:", err));
    }
  }, [isAdmin, firestore, universityRating]);

  const activeUniversityRating = useMemo(() => {
    if (!isUniversityExecutive && (globalSetting as any)?.universityRating) {
      return (globalSetting as any).universityRating as EomsScoreResult;
    }
    return universityRating;
  }, [isUniversityExecutive, globalSetting, universityRating]);

  const stats = useMemo(() => {
    if (!submissions || !userProfile) return { stat1: { value: '0' }, stat2: { value: '0' }, stat3: { value: '0' } };
    const yearSubs = submissions.filter((s) => s.year === selectedYear);

    if (isUniversityExecutive) {
      return {
        stat1: { title: 'Pending Review', value: yearSubs.filter(s => s.statusId === 'submitted').length, icon: <Clock /> },
        stat2: { title: 'Registry Volume', value: yearSubs.length, icon: <FileText /> },
        stat3: { title: 'Active Users', value: allUsersMap.size, icon: <Users /> },
      };
    } else if (isCampusSupervisor) {
      return {
        stat1: { title: 'Campus Maturity', value: `${Math.round((yearSubs.filter(s => s.statusId === 'approved').length / (yearSubs.length || 1)) * 100)}%`, icon: <CheckCircle /> },
        stat2: { title: 'Site Submissions', value: yearSubs.length, icon: <FileText /> },
        stat3: { title: 'Site Users', value: allUsersMap.size, icon: <Users /> },
      };
    } else if (userRole === 'Auditor') {
      const mySchedules = dashboardSchedules || [];
      const yearSchedules = mySchedules.filter(s => {
        if (!s.scheduledDate) return false;
        const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
        return date.getFullYear() === selectedYear;
      });
      return {
        stat1: { title: 'My Audits', value: yearSchedules.length, icon: <ClipboardCheck className="h-5 w-5 text-primary" /> },
        stat2: { title: 'Completed', value: yearSchedules.filter(s => s.status === 'Completed').length, icon: <CheckCircle className="h-5 w-5 text-emerald-600" /> },
        stat3: { title: 'In Progress', value: yearSchedules.filter(s => s.status === 'In Progress').length, icon: <Clock className="h-5 w-5 text-amber-500" /> },
      };
    } else {
      const approved = yearSubs.filter(s => s.statusId === 'approved');
      return {
        stat1: { title: 'Verified Compliance', value: `${approved.length} / ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`, icon: <ShieldCheck /> },
        stat2: { title: 'Quality Pulse', value: `${Math.round((approved.length / TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT) * 100)}%`, icon: <TrendingUp /> },
        stat3: { title: 'Pending Review', value: yearSubs.filter(s => s.statusId === 'submitted').length, icon: <Clock /> },
      };
    }
  }, [submissions, isUniversityExecutive, isCampusSupervisor, allUsersMap, selectedYear, userProfile, userRole, dashboardSchedules]);

  const renderUnitUserHome = () => {
    const yearSubs = submissions?.filter(s => s.year === selectedYear) || [];
    const firstCycleMap = new Map(yearSubs.filter(s => s.cycleId === 'first').map(s => [s.reportType, s]));
    const finalCycleMap = new Map(yearSubs.filter(s => s.cycleId === 'final').map(s => [s.reportType, s]));

    const renderChecklist = (cycle: string, statusMap: Map<string, Submission>) => {
      const registry = statusMap.get('Risk and Opportunity Registry');
      const isActionPlanNA = registry?.riskRating === 'low';
      const required = isActionPlanNA ? submissionTypes.filter(t => t !== 'Risk and Opportunity Action Plan') : submissionTypes;
      const approved = Array.from(statusMap.values()).filter(s => s.statusId === 'approved' && required.includes(s.reportType)).length;
      const progress = (approved / required.length) * 100;

      return (
        <div className="space-y-4">
          <div className="flex justify-between text-[10px] font-black uppercase text-primary">
            <span>{cycle} Cycle Verification</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {submissionTypes.map(type => {
              const sub = statusMap.get(type);
              const isNA = type === 'Risk and Opportunity Action Plan' && isActionPlanNA;
              return (
                <div key={type} className={cn("flex items-center justify-between p-3 rounded-xl border bg-white shadow-sm", isNA && "opacity-40 grayscale")}>
                  <div className="flex items-center gap-3">
                    {isNA ? <CheckCircle className="h-4 w-4 text-slate-300" /> : sub?.statusId === 'approved' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : sub?.statusId === 'submitted' ? <Clock className="h-4 w-4 text-amber-500" /> : <Circle className="h-4 w-4 text-slate-200" />}
                    <span className="text-[10px] font-bold text-slate-700 uppercase leading-tight truncate max-w-[150px]">{type}</span>
                  </div>
                  {isNA ? <Badge variant="secondary" className="h-4 text-[7px]">N/A</Badge> : sub && <Badge variant={statusVariant[sub.statusId]} className="h-4 text-[7px] font-black uppercase">{sub.statusId}</Badge>}
                </div>
              )
            })}
          </div>
        </div>
      );
    };

    return (
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 space-y-4 institutional-header">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Unit Workspace</h2>
              <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">AY {selectedYear} Quality Performance Overview</p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <HeaderRatings universityRating={activeUniversityRating} scopedRating={unitRating} scopedRatingType="Unit" />
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <ScrollArea className="w-full">
            <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="actions">Maturity Checklist</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
          </ScrollArea>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {!isIqaUser && <OverdueWarning allCycles={allCycles} submissions={submissions} isLoading={isLoadingSubmissions} />}
          
          <ExecutiveOverview
            submissions={submissions}
            risks={risks}
            cars={allCars}
            allCompliances={allCompliances}
            academicPrograms={academicPrograms}
            schedules={dashboardSchedules}
            units={allUnits}
            campuses={campuses}
            selectedYear={selectedYear}
            scope="unit"
            scopeId={userProfile?.unitId}
          />
          
          <UnitActionCenter 
             risks={risks}
             unitCars={unitCars}
             unitMrOutputs={unitMrOutputs}
             unitRecommendations={unitRecommendations}
             dashboardSchedules={dashboardSchedules}
             plans={allAuditPlans || []}
             findings={allAuditFindings || []}
             isoClauses={allIsoClauses || []}
             campuses={campuses || []}
             units={allUnits || []}
             signatories={signatories || undefined}
             isLoading={isLoadingRisks || isLoadingSchedules}
             unitName={allUnits?.find(u => u.id === userProfile?.unitId)?.name || 'Department'}
          />

          <UnitAuditSchedule
            schedules={dashboardSchedules}
            isLoading={isLoadingSchedules || isLoadingSubmissions}
            isSupervisor={false}
            campusName={campusMap.get(userProfile?.campusId || '')}
            plans={allAuditPlans || []}
            findings={allAuditFindings || []}
            isoClauses={allIsoClauses || []}
            units={allUnits || []}
            campuses={campuses || []}
            signatories={signatories || undefined}
            recommendations={assignedRecommendations}
            selectedYear={selectedYear}
            academicPrograms={filteredAcademicPrograms}
            risks={risks || []}
            cars={allCars || []}
            allCompliances={filteredCompliances}
            submissions={submissions || []}
            showDecisionSupport={true}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(stats).map(([k, s]: any) => (
              <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
                <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
                <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
            <Card className="lg:col-span-4 shadow-md"><CardHeader><CardTitle>Submission Trend</CardTitle></CardHeader><CardContent><Overview submissions={submissions} isLoading={isLoadingSubmissions} /></CardContent></Card>
            <Card className="lg:col-span-3 shadow-md"><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoadingSubmissions} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="actions" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader><CardTitle>Verification Roadmap</CardTitle><CardDescription>Real-time status of mandatory evidence logs.</CardDescription></CardHeader>
            <CardContent className="space-y-8">
              {renderChecklist('First', firstCycleMap)}
              <Separator />
              {renderChecklist('Final', finalCycleMap)}
              <Button asChild className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20"><Link href="/submissions/new"><Pencil className="mr-2 h-4 w-4" /> Manage Submissions</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in duration-500">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Institutional Archive</CardTitle><CardDescription>Audit trail for AY {selectedYear}.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow><TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Report Type</TableHead><TableHead className="text-[10px] font-black uppercase">Date</TableHead><TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase">Action</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {yearSubs.sort((a, b) => (b.submissionDate?.getTime?.() || 0) - (a.submissionDate?.getTime?.() || 0)).map(s => (
                    <TableRow key={s.id} className="hover:bg-muted/20">
                      <TableCell className="pl-8 py-4"><span className="font-bold text-xs uppercase">{s.reportType}</span><p className="text-[9px] font-mono text-muted-foreground uppercase">{s.cycleId} Cycle & bull; {s.controlNumber}</p></TableCell>
                      <TableCell className="text-xs font-medium text-slate-600 tabular-nums">{s.submissionDate ? format(s.submissionDate, 'MM/dd/yy') : '--'}</TableCell>
                      <TableCell className="text-center"><Badge variant={statusVariant[s.statusId]} className="text-[8px] font-black uppercase">{s.statusId}</Badge></TableCell>
                      <TableCell className="text-right pr-8"><Button variant="ghost" size="sm" asChild className="h-7 text-[9px] font-black uppercase"><Link href={`/submissions/${s.id}`}>View</Link></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  };

  const renderAdminHome = () => (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 space-y-4 institutional-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Executive Hub</h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Institutional Oversight for AY {selectedYear}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <HeaderRatings universityRating={activeUniversityRating} scopedRating={null} />
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="schedule"><Calendar className="mr-2 h-4 w-4" />Schedule Today | Upcoming</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
            <TabsTrigger value="ched-programs"><GraduationCap className="mr-2 h-4 w-4" />CHED Programs</TabsTrigger>
            <TabsTrigger value="risk-opportunity"><TriangleAlert className="mr-2 h-4 w-4" />Risk & Opportunity</TabsTrigger>
            <TabsTrigger value="corrective-actions"><ListChecks className="mr-2 h-4 w-4" />Corrective Actions</TabsTrigger>
            <TabsTrigger value="actionable-decisions"><Zap className="mr-2 h-4 w-4" />Actionable Decisions</TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <ExecutiveOverview
          submissions={submissions}
          risks={risks}
          cars={allCars}
          allCompliances={allCompliances}
          academicPrograms={academicPrograms}
          schedules={dashboardSchedules}
          units={allUnits}
          campuses={campuses}
          selectedYear={selectedYear}
        />

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4">
            <UnitAuditSchedule
              schedules={dashboardSchedules}
              isLoading={isLoadingSchedules || isLoadingSubmissions}
              isAdmin={true}
              isSupervisor={true}
              campusName="Institutional"
              plans={allAuditPlans || []}
              findings={allAuditFindings || []}
              isoClauses={allIsoClauses || []}
              units={allUnits || []}
              campuses={campuses || []}
              signatories={signatories || undefined}
              recommendations={assignedRecommendations}
              selectedYear={selectedYear}
              academicPrograms={filteredAcademicPrograms}
              risks={risks || []}
              cars={allCars || []}
              allCompliances={filteredCompliances}
              submissions={submissions || []}
              showDecisionSupport={false}
            />
          </div>
          <div className="lg:col-span-3">
            <Card className="shadow-md h-full overflow-hidden flex flex-col">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900">Recent System Activity</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">Real-time audit log stream</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1">
                <RecentActivity submissions={submissions} isLoading={isLoadingSubmissions} users={allUsersMap} userProfile={userProfile} />
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="schedule" className="space-y-6">
        <ScheduleTab
          schedules={dashboardSchedules || []}
          risks={risks || []}
          cars={allCars || []}
          allCompliances={allCompliances || []}
          academicPrograms={academicPrograms || []}
          campuses={campuses || []}
          allUnits={allUnits || []}
          cycles={allCycles || []}
          mrOutputs={mrOutputs || []}
          selectedYear={selectedYear}
        />
      </TabsContent>
      <TabsContent value="analytics" className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {Object.entries(stats).map(([k, s]: any) => (
            <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
              <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
              <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-md"><CardHeader><CardTitle>Submission Volume</CardTitle></CardHeader><CardContent><Overview submissions={submissions} isLoading={isLoadingSubmissions} /></CardContent></Card>
            <SubmissionSchedule cycles={allCycles} isLoading={isLoadingSubmissions} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <IncompleteCampusSubmissions allSubmissions={submissions} allCampuses={campuses} allUnits={nonIqaUnits} isLoading={isLoadingSubmissions} selectedYear={selectedYear} onYearChange={setSelectedYear} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} />
            <Leaderboard allSubmissions={submissions} allUnits={nonIqaUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
        </div>

        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoadingRisks} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={true} />
        <ComplianceHeatmap units={nonIqaUnits || []} submissions={submissions || []} selectedYear={selectedYear} title="Institutional Parity Matrix" />
      </TabsContent>
      <TabsContent value="strategic" className="space-y-6">
        <MaturityRadar campuses={campuses || []} submissions={submissions || []} risks={risks || []} mrOutputs={[]} selectedYear={selectedYear} />
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={nonIqaUnits} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
      </TabsContent>

      <TabsContent value="ched-programs" className="space-y-6">
        <ChedProgramsTab
          academicPrograms={academicPrograms || []}
          allCompliances={allCompliances || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="risk-opportunity" className="space-y-6">
        <RiskOpportunityTab
          risks={risks || []}
          allUnits={allUnits || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="corrective-actions" className="space-y-6">
        <CorrectiveActionsTab
          cars={allCars || []}
          allUnits={allUnits || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="actionable-decisions" className="space-y-6">
        <ActionableDecisionsTab
          risks={risks || []}
          cars={allCars || []}
          allCompliances={allCompliances || []}
          academicPrograms={academicPrograms || []}
          auditSchedules={dashboardSchedules || []}
          submissions={submissions || []}
          campuses={campuses || []}
          allUnits={allUnits || []}
          selectedYear={selectedYear}
        />
      </TabsContent>
    </Tabs>
  );

  const renderSupervisorHome = () => (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 space-y-4 institutional-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Site Management</h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Campus Oversight for AY {selectedYear}</p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <HeaderRatings universityRating={activeUniversityRating} scopedRating={supervisorRating} scopedRatingType="Site" />
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="schedule"><Calendar className="mr-2 h-4 w-4" />Schedule Today | Upcoming</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
            <TabsTrigger value="ched-programs"><GraduationCap className="mr-2 h-4 w-4" />CHED Programs</TabsTrigger>
            <TabsTrigger value="risk-opportunity"><TriangleAlert className="mr-2 h-4 w-4" />Risk & Opportunity</TabsTrigger>
            <TabsTrigger value="corrective-actions"><ListChecks className="mr-2 h-4 w-4" />Corrective Actions</TabsTrigger>
            <TabsTrigger value="actionable-decisions"><Zap className="mr-2 h-4 w-4" />Actionable Decisions</TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <ExecutiveOverview
          submissions={submissions}
          risks={risks}
          cars={allCars}
          allCompliances={allCompliances}
          academicPrograms={academicPrograms}
          schedules={dashboardSchedules}
          units={allUnits}
          campuses={campuses}
          selectedYear={selectedYear}
          scope="campus"
          scopeId={userProfile?.campusId}
        />
        <UnitAuditSchedule
          schedules={dashboardSchedules}
          isLoading={isLoadingSchedules || isLoadingSubmissions}
          isSupervisor={true}
          campusName={campusMap.get(userProfile?.campusId || '')}
          plans={allAuditPlans || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          signatories={signatories || undefined}
          recommendations={assignedRecommendations}
          selectedYear={selectedYear}
          academicPrograms={filteredAcademicPrograms}
          risks={risks || []}
          cars={allCars || []}
          allCompliances={filteredCompliances}
          submissions={submissions || []}
          showDecisionSupport={true}
        />
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {Object.entries(stats).map(([k, s]: any) => (
            <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
              <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
              <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-md"><CardHeader><CardTitle>Campus Progress</CardTitle></CardHeader><CardContent><Overview submissions={submissions} isLoading={isLoadingSubmissions} /></CardContent></Card>
            <ComplianceHeatmap units={nonIqaUnits?.filter(u => u.campusIds?.includes(userProfile?.campusId || '')) || []} submissions={submissions || []} selectedYear={selectedYear} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <CompletedSubmissions allUnits={nonIqaUnits} allCampuses={campuses} allSubmissions={submissions} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={true} selectedYear={selectedYear} />
            <UnitsWithoutSubmissions allUnits={nonIqaUnits} allCampuses={campuses} allSubmissions={submissions} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isAdmin={false} isCampusSupervisor={true} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
            <Card className="shadow-md"><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoadingSubmissions} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="schedule" className="space-y-6">
        <ScheduleTab
          schedules={dashboardSchedules || []}
          risks={risks || []}
          cars={allCars || []}
          allCompliances={filteredCompliances || []}
          academicPrograms={filteredAcademicPrograms || []}
          campuses={campuses || []}
          allUnits={allUnits || []}
          cycles={allCycles || []}
          mrOutputs={campusMrOutputs || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {Object.entries(stats).map(([k, s]: any) => (
            <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
              <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
              <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <Card className="shadow-md"><CardHeader><CardTitle>Campus Progress</CardTitle></CardHeader><CardContent><Overview submissions={submissions} isLoading={isLoadingSubmissions} /></CardContent></Card>
            <SubmissionSchedule cycles={allCycles} isLoading={isLoadingSubmissions} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <CompletedSubmissions allUnits={nonIqaUnits} allCampuses={campuses} allSubmissions={submissions} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={true} selectedYear={selectedYear} />
            <UnitsWithoutSubmissions allUnits={nonIqaUnits} allCampuses={campuses} allSubmissions={submissions} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isAdmin={false} isCampusSupervisor={true} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
            <Leaderboard allSubmissions={submissions} allUnits={nonIqaUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
          </div>
        </div>
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoadingRisks} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={true} />
        <SubmissionAnalytics allSubmissions={submissions} allUnits={nonIqaUnits} isLoading={isLoadingSubmissions} isAdmin={false} userProfile={userProfile} selectedYear={selectedYear} />
        <ComplianceHeatmap units={nonIqaUnits?.filter(u => u.campusIds?.includes(userProfile?.campusId || '')) || []} submissions={submissions || []} selectedYear={selectedYear} />
      </TabsContent>

      <TabsContent value="strategic" className="space-y-6">
        <MaturityRadar campuses={campuses?.filter(c => c.id === userProfile?.campusId) || []} submissions={submissions || []} risks={risks || []} mrOutputs={campusMrOutputs || []} selectedYear={selectedYear} />
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={nonIqaUnits} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
      </TabsContent>

      <TabsContent value="ched-programs" className="space-y-6">
        <ChedProgramsTab
          academicPrograms={filteredAcademicPrograms || []}
          allCompliances={filteredCompliances || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="risk-opportunity" className="space-y-6">
        <RiskOpportunityTab
          risks={risks || []}
          allUnits={allUnits || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="corrective-actions" className="space-y-6">
        <CorrectiveActionsTab
          cars={allCars || []}
          allUnits={allUnits || []}
          campuses={campuses || []}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="actionable-decisions" className="space-y-6">
        <ActionableDecisionsTab
          risks={risks || []}
          cars={allCars || []}
          allCompliances={filteredCompliances || []}
          academicPrograms={filteredAcademicPrograms || []}
          auditSchedules={dashboardSchedules || []}
          submissions={submissions || []}
          campuses={campuses || []}
          allUnits={allUnits || []}
          selectedYear={selectedYear}
        />
      </TabsContent>
    </Tabs>
  );

  const renderAuditorHome = () => (
    <Tabs defaultValue="audit" className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 institutional-header">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Auditor Workspace</h2>
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mt-1">Active Audit Itinerary for AY {selectedYear}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/audit"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 shadow-sm text-primary"
            >
              <ClipboardCheck className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Conduct IQA</span>
            </Link>
            <Link
              href="/qa-reports?tab=car"
              className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50/70 hover:border-rose-300 transition-all duration-200 shadow-sm text-rose-600"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Manage CARs</span>
            </Link>
          </div>
        </div>
        <ScrollArea className="w-full mt-4">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="audit"><ClipboardCheck className="mr-2 h-4 w-4" />Audit Focus</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />IQA Analytics</TabsTrigger>
            <TabsTrigger value="results"><ListChecks className="mr-2 h-4 w-4" />Audit Results & Findings</TabsTrigger>
            <TabsTrigger value="portfolio"><Briefcase className="mr-2 h-4 w-4" />Portfolio & Performance</TabsTrigger>
            <TabsTrigger value="unit-compliance"><HomeIcon className="mr-2 h-4 w-4" />Unit Self-Compliance</TabsTrigger>
            <TabsTrigger value="quality-score"><Award className="mr-2 h-4 w-4" />University EOMS Quality Score</TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      <TabsContent value="audit" className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {Object.entries(stats).map(([k, s]: any) => (
            <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
              <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
              <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
            </Card>
          ))}
        </div>

        <AuditorOfflineManager />

        <UnitAuditSchedule
          schedules={sortedMySchedules}
          isLoading={isLoadingSchedules}
          campusName="My Assignments"
          plans={allAuditPlans || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          signatories={signatories || undefined}
          academicPrograms={academicPrograms || []}
        />
      </TabsContent>

      <TabsContent value="portfolio" className="space-y-6 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-md border-primary/10 bg-white animate-in fade-in slide-in-from-bottom duration-300">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <CardTitle className="text-sm font-black uppercase tracking-tight text-[#1B6535]">
                  Audit Performance Metrics
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                  My evaluation statistics for AY {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-500">Checklist Utilization Rate</span>
                    <span className="text-[#1B6535] text-xs">
                      {getAuditorPerformance(userProfile?.id || '').utilizationRate}%
                    </span>
                  </div>
                  <Progress 
                    value={getAuditorPerformance(userProfile?.id || '').utilizationRate} 
                    className="h-2 bg-slate-100"
                  />
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                    {getAuditorPerformance(userProfile?.id || '').auditedClauses} of {getAuditorPerformance(userProfile?.id || '').totalClauses} scheduled ISO clauses audited
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Assigned Audits
                    </span>
                    <div className="flex items-center gap-1.5">
                      <ClipboardCheck className="h-4 w-4 text-[#1B6535]" />
                      <span className="text-xl font-black text-slate-800 tabular-nums">
                        {getAuditorPerformance(userProfile?.id || '').assignedCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Completed Audits
                    </span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-xl font-black text-slate-800 tabular-nums">
                        {getAuditorPerformance(userProfile?.id || '').completedCount}
                      </span>
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 col-span-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Findings Logged
                    </span>
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-4 w-4 text-amber-500" />
                      <span className="text-xl font-black text-slate-800 tabular-nums">
                        {getAuditorPerformance(userProfile?.id || '').findingsLoggedCount}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="shadow-md border-primary/10 bg-white animate-in fade-in slide-in-from-bottom duration-300 delay-100">
              <CardHeader className="bg-primary/5 pb-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-tight text-[#1B6535]">
                    Professional Portfolio & Qualifications
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                    Certificates of training, seminar attendances, and competence evidence
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsPortfolioDialogOpen(true)}
                  size="sm"
                  className="h-8 rounded-xl font-black text-[10px] uppercase tracking-wider px-3"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Portfolio
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {!userProfile?.portfolios || userProfile.portfolios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center">
                    <Award className="h-10 w-10 text-slate-300 stroke-[1.5] mb-3" />
                    <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      No credentials registered
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">
                      Upload your EOMS certificates, ISO training, and seminars to demonstrate competency.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="pl-6 py-3 text-[9px] font-black uppercase tracking-wider">Title</TableHead>
                        <TableHead className="py-3 text-[9px] font-black uppercase tracking-wider">Date Acquired</TableHead>
                        <TableHead className="text-right pr-6 py-3 text-[9px] font-black uppercase tracking-wider">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userProfile.portfolios.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="pl-6 py-4">
                            <span className="font-bold text-xs text-slate-800 uppercase block">
                              {item.title}
                            </span>
                          </TableCell>
                          <TableCell className="py-4 text-xs font-medium text-slate-500 tabular-nums">
                            {format(new Date(item.dateAcquired), 'MMMM dd, yyyy')}
                          </TableCell>
                          <TableCell className="text-right pr-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-slate-500 border-slate-200 hover:text-slate-800"
                                asChild
                              >
                                <a 
                                  href={item.googleDriveLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7 rounded-lg text-rose-600 border-rose-100 hover:bg-rose-50/50 hover:border-rose-200"
                                onClick={() => handleDeletePortfolio(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="analytics" className="space-y-6 animate-in fade-in duration-500">
        <AuditAnalytics 
          plans={allAuditPlans || []}
          schedules={dashboardSchedules || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          users={allUsersData || []}
          isLoading={isLoadingSchedules}
          selectedYear={selectedYear}
        />
      </TabsContent>

      <TabsContent value="results" className="space-y-6 animate-in fade-in duration-500">
        <AuditResultsView 
          selectedYear={selectedYear}
          plans={allAuditPlans || []}
          schedules={dashboardSchedules || []}
          findings={allAuditFindings || []}
          units={allUnits || []}
          campuses={campuses || []}
          cars={allCars || []}
          isLoading={isLoadingSchedules}
        />
      </TabsContent>

      <TabsContent value="unit-compliance" className="space-y-6 animate-in fade-in duration-500">
        <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 mb-6">
          <h3 className="font-black text-sm text-[#1B6535] uppercase flex items-center gap-2">
            <ClipboardCheck className="h-4.5 w-4.5" /> Unit Self-Audit Compliance
          </h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
            Manage submissions, risk registry, and corrective actions for the Internal Quality Audit office itself
          </p>
        </div>
        
        <UnitActionCenter 
           risks={risks}
           unitCars={unitCars}
           unitMrOutputs={unitMrOutputs}
           unitRecommendations={unitRecommendations}
           dashboardSchedules={dashboardSchedules}
           plans={allAuditPlans || []}
           findings={allAuditFindings || []}
           isoClauses={allIsoClauses || []}
           campuses={campuses || []}
           units={allUnits || []}
           signatories={signatories || undefined}
           isLoading={isLoadingRisks || isLoadingSchedules}
           unitName={allUnits?.find(u => u.id === userProfile?.unitId)?.name || 'Internal Quality Audit'}
        />

        <UnitAuditSchedule
          schedules={dashboardSchedules}
          isLoading={isLoadingSchedules || isLoadingSubmissions}
          isSupervisor={false}
          campusName={campusMap.get(userProfile?.campusId || '')}
          plans={allAuditPlans || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          signatories={signatories || undefined}
          recommendations={assignedRecommendations}
          selectedYear={selectedYear}
          academicPrograms={filteredAcademicPrograms}
          risks={risks || []}
          cars={allCars || []}
          allCompliances={filteredCompliances}
          submissions={submissions || []}
          showDecisionSupport={true}
        />
      </TabsContent>

      <TabsContent value="quality-score" className="space-y-6 animate-in fade-in duration-500">
        <ExecutiveOverview
          submissions={submissions}
          risks={risks}
          cars={allCars}
          allCompliances={allCompliances}
          academicPrograms={academicPrograms}
          schedules={dashboardSchedules}
          units={allUnits}
          campuses={campuses}
          selectedYear={selectedYear}
          scope="university"
        />
      </TabsContent>
    </Tabs>
  );

  const renderHomeContent = () => {
    if (isUniversityExecutive) return renderAdminHome();
    if (isIqaUser) return renderAuditorHome();
    if (isCampusSupervisor) return renderSupervisorHome();
    return renderUnitUserHome();
  };

  if (isUserLoading || isLoadingSubmissions) {
    return <FullScreenLoader />;
  }

  return (
    <div className="space-y-6">
      {(campusSetting?.announcement || globalSetting?.announcement) && (
        <div className="space-y-4">
          {globalSetting?.announcement && isGlobalAnnouncementVisible && (
            <Alert className="border-indigo-200 bg-indigo-50/50 shadow-md">
              <Globe className="h-4 w-4 text-indigo-600" />
              <AlertTitle className="font-black uppercase text-[10px] tracking-widest text-indigo-700">Global Directive</AlertTitle>
              <AlertDescription className="text-sm font-medium">{globalSetting.announcement}</AlertDescription>
              <AlertCloseButton onClick={() => setIsGlobalAnnouncementVisible(false)} />
            </Alert>
          )}
          {campusSetting?.announcement && isAnnouncementVisible && (
            <Alert className="border-primary/20 bg-primary/5 shadow-md">
              <Megaphone className="h-4 w-4 text-primary" />
              <AlertTitle className="font-black uppercase text-[10px] tracking-widest text-primary">Campus Announcement</AlertTitle>
              <AlertDescription className="text-sm font-medium">{campusSetting.announcement}</AlertDescription>
              <AlertCloseButton onClick={() => setIsAnnouncementVisible(false)} />
            </Alert>
          )}
        </div>
      )}



      {renderHomeContent()}

      <AuditorPortfolioDialog
        open={isPortfolioDialogOpen}
        onOpenChange={setIsPortfolioDialogOpen}
        onSave={handleAddPortfolio}
      />

      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <UnitSubmissionDetailCard
            unitId={selectedDetail.unitId}
            campusId={selectedDetail.campusId}
            allUnits={allUnits}
            allSubmissions={submissions}
            onClose={() => setSelectedDetail(null)}
            onViewSubmission={(id) => router.push(`/submissions/${id}`)}
            selectedYear={selectedYear}
          />
        </div>
      )}
    </div>
  );
}
