
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
  Activity,
  ArrowRight,
  ChevronRight,
  ShieldAlert,
  AlertTriangle,
  Gavel,
  Target,
  Award
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
} from 'firebase/firestore';
import type {
  Submission,
  User as AppUser,
  Unit,
  Campus,
  Cycle,
  Risk,
  QaAdvisory,
  AuditSchedule,
  CorrectiveActionRequest,
  ManagementReviewOutput,
  ProgramComplianceRecord,
  AuditPlan,
  AuditFinding,
  ISOClause,
  Signatories
} from '@/lib/types';
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
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT, submissionTypes } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

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

export default function HomePage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor, isVp, isAuditor } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get('tab') || 'overview';

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isGlobalAnnouncementVisible, setIsGlobalAnnouncementVisible] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDetail, setSelectedDetail] = useState<{ unitId: string, campusId: string } | null>(null);

  const roleLower = userRole?.toLowerCase() || '';
  const isCampusLevel = isAdmin || isVp || roleLower.includes('campus director') || roleLower.includes('campus odimo');
  const isCampusSupervisor = isSupervisor && !isAdmin && isCampusLevel;

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'submissions');
    if (isAdmin) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isAdmin, isCampusSupervisor, isUserLoading]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissions = useMemo(() => {
    if (!rawSubmissions) return null;
    return rawSubmissions.map(s => {
      const date = s.submissionDate;
      return {
        ...s,
        reportType: normalizeReportType(s.reportType),
        submissionDate: date instanceof Timestamp ? date.toDate() : new Date(date)
      }
    });
  }, [rawSubmissions]);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'risks');
    if (isAdmin) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    return query(baseRef, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isAdmin, isCampusSupervisor, isUserLoading]);

  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const unitCarsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId || isAdmin) return null;
    return query(collection(firestore, 'correctiveActionRequests'), where('unitId', '==', userProfile.unitId));
  }, [firestore, userProfile, isAdmin]);
  const { data: unitCars } = useCollection<CorrectiveActionRequest>(unitCarsQuery);

  const unitMrOutputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId || isAdmin) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore, userProfile, isAdmin]);
  const { data: rawUnitMrOutputs } = useCollection<ManagementReviewOutput>(unitMrOutputsQuery);

  const unitMrOutputs = useMemo(() => {
    if (!rawUnitMrOutputs || !userProfile?.unitId) return [];
    return rawUnitMrOutputs.filter(o => o.assignments?.some(a => a.unitId === userProfile.unitId));
  }, [rawUnitMrOutputs, userProfile]);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId || isAdmin) return null;
    return query(collection(firestore, 'programCompliances'), where('unitId', '==', userProfile.unitId), where('academicYear', '==', selectedYear));
  }, [firestore, userProfile, isAdmin, selectedYear]);
  const { data: unitCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const unitRecommendations = useMemo(() => {
    if (!unitCompliances || !userProfile?.unitId) return [];
    const recs: any[] = [];
    unitCompliances.forEach(c => {
        c.accreditationRecords?.forEach(m => {
            m.recommendations?.forEach(reco => {
                if (reco.assignedUnitIds?.includes(userProfile.unitId)) {
                    recs.push({ ...reco, milestoneLevel: m.level, programId: c.programId });
                }
            });
        });
    });
    return recs;
  }, [unitCompliances, userProfile]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || (!isAdmin && !isCampusSupervisor)) return null;
    const baseRef = collection(firestore, 'users');
    if (isAdmin) return baseRef;
    return query(baseRef, where('campusId', '==', userProfile?.campusId));
  }, [firestore, isAdmin, isCampusSupervisor, userProfile]);

  const { data: allUsersData } = useCollection<AppUser>(usersQuery);

  const allUsersMap = useMemo(() => {
    const userMap = new Map<string, AppUser>();
    if (allUsersData) allUsersData.forEach(u => userMap.set(u.id, u));
    if (userProfile && !userMap.has(userProfile.id)) userMap.set(userProfile.id, userProfile);
    return userMap;
  }, [allUsersData, userProfile]);

  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(allUnitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore && user) ? collection(firestore, 'campuses') : null, [firestore, user]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const campusMap = useMemo(() => new Map(campuses?.map(c => [c.id, c.name])), [campuses]);

  const allCyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles } = useCollection<Cycle>(allCyclesQuery);

  const advisoriesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'qaAdvisories'), orderBy('releaseDate', 'desc'), limit(1)) : null), [firestore]);
  const { data: latestAdvisories } = useCollection<QaAdvisory>(advisoriesQuery);

  const latestAdvisory = useMemo(() => {
    if (!latestAdvisories || latestAdvisories.length === 0 || !userProfile) return null;
    const adv = latestAdvisories[0];
    const isAccessible = adv.scope === 'University-Wide' || adv.targetUnitId === userProfile.unitId || isAdmin;
    return isAccessible ? adv : null;
  }, [latestAdvisories, userProfile, isAdmin]);

  const auditSchedulesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'auditSchedules');
    if (isAdmin) return baseRef;
    if (isCampusLevel && userProfile.campusId) return query(baseRef, where('campusId', '==', userProfile.campusId));
    if (userProfile.unitId) return query(baseRef, where('targetId', '==', userProfile.unitId));
    return null;
  }, [firestore, userProfile, isAdmin, isCampusLevel, isUserLoading]);

  const { data: dashboardSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(auditSchedulesQuery);

  /**
   * ADDITIONAL AUDIT DATA FOR REPORTS
   */
  const auditPlansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: allAuditPlans } = useCollection<AuditPlan>(auditPlansQuery);

  const auditFindingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: allAuditFindings } = useCollection<AuditFinding>(auditFindingsQuery);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: allIsoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'signatories') : null), [firestore]);
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

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

  const stats = useMemo(() => {
    if (!submissions || !userProfile) return { stat1: { value: '0' }, stat2: { value: '0' }, stat3: { value: '0' } };
    const yearSubs = submissions.filter((s) => s.year === selectedYear);

    if (isAdmin) {
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
    } else {
      const approved = yearSubs.filter(s => s.statusId === 'approved');
      return {
        stat1: { title: 'Verified Compliance', value: `${approved.length} / ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`, icon: <ShieldCheck /> },
        stat2: { title: 'Quality Pulse', value: `${Math.round((approved.length / TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT) * 100)}%`, icon: <TrendingUp /> },
        stat3: { title: 'Pending Review', value: yearSubs.filter(s => s.statusId === 'submitted').length, icon: <Clock /> },
      };
    }
  }, [submissions, isAdmin, isCampusSupervisor, allUsersMap, selectedYear, userProfile]);

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
        <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 space-y-4 institutional-header">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Unit Workspace</h2><p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">AY {selectedYear} Quality Performance Overview</p></div>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
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
          <OverdueWarning allCycles={allCycles} submissions={submissions} isLoading={isLoadingSubmissions} />
          
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
          <Card className="shadow-lg"><CardHeader><CardTitle>Verification Roadmap</CardTitle><CardDescription>Real-time status of mandatory evidence logs.</CardDescription></CardHeader>
            <CardContent className="space-y-8">
              {renderChecklist('First', firstCycleMap)}
              <Separator />
              {renderChecklist('Final', finalCycleMap)}
              <Button asChild className="w-full h-12 font-black uppercase tracking-widest shadow-xl shadow-primary/20"><Link href="/submissions/new"><Pencil className="mr-2 h-4 w-4" /> Manage Submissions</Link></Button>
            </CardContent></Card>
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in duration-500">
          <Card className="shadow-md"><CardHeader><CardTitle>Institutional Archive</CardTitle><CardDescription>Audit trail for AY {selectedYear}.</CardDescription></CardHeader>
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
            </CardContent></Card>
        </TabsContent>
      </Tabs>
    );
  };

  const renderAdminHome = () => (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 space-y-4 institutional-header">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Executive Hub</h2><p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Institutional Oversight for AY {selectedYear}</p></div>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <UnitAuditSchedule
          schedules={dashboardSchedules}
          isLoading={isLoadingSchedules}
          isSupervisor={true}
          campusName="Institutional"
          plans={allAuditPlans || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          signatories={signatories || undefined}
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
            <Card className="shadow-md"><CardHeader><CardTitle>Submission Volume</CardTitle></CardHeader><CardContent><Overview submissions={submissions} isLoading={isLoadingSubmissions} /></CardContent></Card>
            <MaturityRadar campuses={campuses || []} submissions={submissions || []} risks={risks || []} mrOutputs={[]} selectedYear={selectedYear} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <IncompleteCampusSubmissions allSubmissions={submissions} allCampuses={campuses} allUnits={allUnits} isLoading={isLoadingSubmissions} selectedYear={selectedYear} onYearChange={setSelectedYear} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} />
            <Leaderboard allSubmissions={submissions} allUnits={allUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
            <Card className="shadow-md"><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoadingSubmissions} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-6">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingSubmissions} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoadingRisks} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={true} />
        <ComplianceHeatmap units={allUnits || []} submissions={submissions || []} selectedYear={selectedYear} title="Institutional Parity Matrix" />
      </TabsContent>
      <TabsContent value="strategic" className="space-y-6">
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={allUnits} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
      </TabsContent>
    </Tabs>
  );

  const renderSupervisorHome = () => (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 space-y-4 institutional-header">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div><h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Site Management</h2><p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Campus Oversight for AY {selectedYear}</p></div>
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[150px] h-9 bg-white font-bold shadow-sm"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="strategic">Strategic</TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      <TabsContent value="overview" className="space-y-6">
        <UnitAuditSchedule
          schedules={dashboardSchedules}
          isLoading={isLoadingSchedules}
          isSupervisor={true}
          campusName={campusMap.get(userProfile?.campusId || '')}
          plans={allAuditPlans || []}
          findings={allAuditFindings || []}
          isoClauses={allIsoClauses || []}
          units={allUnits || []}
          campuses={campuses || []}
          signatories={signatories || undefined}
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
            <ComplianceHeatmap units={allUnits?.filter(u => u.campusIds?.includes(userProfile?.campusId || '')) || []} submissions={submissions || []} selectedYear={selectedYear} />
          </div>
          <div className="lg:col-span-3 space-y-6">
            <CompletedSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoadingSubmissions} userProfile={userProfile} isCampusSupervisor={true} selectedYear={selectedYear} />
            <UnitsWithoutSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoadingSubmissions} userProfile={userProfile} isAdmin={false} isCampusSupervisor={true} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
            <Card className="shadow-md"><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoadingSubmissions} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
          </div>
        </div>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-6">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingSubmissions} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoadingRisks} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={true} />
        <SubmissionAnalytics allSubmissions={submissions} allUnits={allUnits} isLoading={isLoadingSubmissions} isAdmin={false} userProfile={userProfile} selectedYear={selectedYear} />
      </TabsContent>
      <TabsContent value="strategic" className="space-y-6">
        <MaturityRadar campuses={campuses || []} submissions={submissions || []} risks={risks || []} mrOutputs={[]} selectedYear={selectedYear} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
      </TabsContent>
    </Tabs>
  );

  const renderAuditorHome = () => (
    <div className="space-y-6">
      <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8 space-y-4 institutional-header">
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Auditor Workspace</h2>
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">Active Audit Itinerary for AY {selectedYear}</p>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {Object.entries(stats).map(([k, s]: any) => (
          <Card key={k} className="p-6 bg-white border-primary/10 shadow-md">
            <div className="flex justify-between items-start mb-2"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{s.title}</p><div className="text-primary">{s.icon}</div></div>
            <div className="text-3xl font-black tabular-nums text-slate-900">{s.value}</div>
          </Card>
        ))}
      </div>

      <UnitAuditSchedule
        schedules={dashboardSchedules}
        isLoading={isLoadingSchedules}
        campusName="My Assignments"
        plans={allAuditPlans || []}
        findings={allAuditFindings || []}
        isoClauses={allIsoClauses || []}
        units={allUnits || []}
        campuses={campuses || []}
        signatories={signatories || undefined}
      />

      <Card className="shadow-md overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase">Quick Access Tools</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <Button asChild variant="outline" className="h-16 font-black uppercase text-[10px] tracking-widest gap-2"><Link href="/audit"><ClipboardCheck className="h-5 w-5 text-primary" /> Enter Audit Conduct Hub</Link></Button>
          <Button asChild variant="outline" className="h-16 font-black uppercase text-[10px] tracking-widest gap-2"><Link href="/qa-reports?tab=car"><ShieldAlert className="h-5 w-5 text-rose-600" /> CAR Registry</Link></Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderHomeContent = () => {
    if (isAdmin) return renderAdminHome();
    if (userRole === 'Auditor') return renderAuditorHome();
    if (isCampusSupervisor) return renderSupervisorHome();
    return renderUnitUserHome();
  };

  if (isUserLoading || isLoadingSubmissions) {
    return (
      <div className="flex h-screen items-center justify-center p-4 bg-background/60 backdrop-blur-xl">
        <div className="flex flex-col items-center gap-4 text-center">
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

      {latestAdvisory && (
        <Alert className="border-primary bg-primary/5 shadow-md animate-in slide-in-from-top-4">
          <Megaphone className="h-5 w-5 text-primary" />
          <AlertTitle className="font-black uppercase tracking-tight text-primary">Latest QA Advisory: {latestAdvisory.subject}</AlertTitle>
          <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
            <span className="text-sm font-bold text-slate-700">Official Directive {latestAdvisory.controlNumber} has been released.</span>
            <Button size="sm" asChild className="h-8 text-[10px] font-black uppercase shadow-lg shadow-primary/20"><Link href="/advisories">Open Advisory Vault</Link></Button>
          </AlertDescription>
        </Alert>
      )}

      {renderHomeContent()}

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
