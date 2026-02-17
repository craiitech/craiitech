
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  Megaphone,
  Circle,
  Pencil,
  FilePlus,
  AlertCircle,
  Eye,
  Search,
  Bell,
  Heart,
  XCircle,
  History,
  Settings,
  Globe,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  BarChart,
  User,
  LayoutDashboard,
  BrainCircuit,
  Info,
  ClipboardCheck,
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
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import type { Submission, User as AppUser, Unit, Campus, Cycle, Risk, UnitMonitoringRecord } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle, AlertCloseButton } from '@/components/ui/alert';
import { UnitsWithoutSubmissions } from '@/components/dashboard/units-without-submissions';
import { CampusUnitOverview } from '@/components/dashboard/campus-unit-overview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, isAfter } from 'date-fns';
import { SubmissionAnalytics } from '@/components/dashboard/submission-analytics';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { UnitUserOverview } from '@/components/dashboard/unit-user-overview';
import { IncompleteCampusSubmissions } from '@/components/dashboard/incomplete-campus-submissions';
import { CompletedSubmissions } from '@/components/dashboard/completed-submissions';
import { NonCompliantUnits } from '@/components/dashboard/non-compliant-units';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { SubmissionSchedule } from '@/components/dashboard/submission-schedule';
import { RiskStatusOverview } from '@/components/dashboard/risk-status-overview';
import { OverdueWarning } from '@/components/dashboard/overdue-warning';
import { UnitSubmissionDetailCard } from '@/components/dashboard/unit-submission-detail-card';
import { Leaderboard } from '@/components/dashboard/leaderboard';
import { ComplianceOverTime } from '@/components/dashboard/strategic/compliance-over-time';
import { RiskMatrix } from '@/components/dashboard/strategic/risk-matrix';
import { RiskFunnel } from '@/components/dashboard/strategic/risk-funnel';
import { CycleSubmissionBreakdown } from '@/components/dashboard/strategic/cycle-submission-breakdown';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export const TOTAL_REPORTS_PER_CYCLE = 6;
export const TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT = TOTAL_REPORTS_PER_CYCLE * 2; 


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
  const { user, userProfile, isAdmin, isUserLoading, userRole, isSupervisor, isVp } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isGlobalAnnouncementVisible, setIsGlobalAnnouncementVisible] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDetail, setSelectedDetail] = useState<{ unitId: string, campusId: string } | null>(null);

  const canViewCampusAnnouncements = userProfile?.campusId;

  // Fetch submissions based on role
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (!userProfile) return null;
    if (isSupervisor) {
      if (userProfile.campusId) {
        return query(
          collection(firestore, 'submissions'),
          where('campusId', '==', userProfile.campusId)
        );
      }
      return null;
    }
    return query(
      collection(firestore, 'submissions'),
      where('unitId', '==', userProfile.unitId),
      where('campusId', '==', userProfile.campusId)
    );
  }, [firestore, userProfile, isAdmin, isSupervisor]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissions = useMemo(() => {
    if (!rawSubmissions) return null;
    return rawSubmissions.map(s => {
      const date = s.submissionDate;
      let rType = String(s.reportType || '').trim();
      const lowerType = rType.toLowerCase();
      
      if (lowerType.includes('risk and opportunity registry')) rType = 'Risk and Opportunity Registry';
      else if (lowerType.includes('operational plan')) rType = 'Operational Plan';
      else if (lowerType.includes('objectives monitoring')) rType = 'Quality Objectives Monitoring';
      else if (lowerType.includes('needs and expectation')) rType = 'Needs and Expectation of Interested Parties';
      else if (lowerType.includes('swot')) rType = 'SWOT Analysis';
      else if (lowerType.includes('action plan') && lowerType.includes('risk')) rType = 'Risk and Opportunity Action Plan';

      return {
        ...s,
        reportType: rType,
        submissionDate: date instanceof Timestamp ? date.toDate() : new Date(date)
      }
    });
  }, [rawSubmissions]);
  
   // Fetch risks based on role
  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRisksQuery = collection(firestore, 'risks');
    if (isAdmin) return baseRisksQuery;
    if (isSupervisor) {
        if (userProfile.campusId) return query(baseRisksQuery, where('campusId', '==', userProfile.campusId));
        return null; 
    }
    if (userProfile.unitId && userProfile.campusId) {
        return query(baseRisksQuery, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
    }
    return null; 
  }, [firestore, userProfile, isAdmin, isSupervisor]);

  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  // Fetch users based on role
  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'users');
    if (isSupervisor && userProfile?.campusId) return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    if (userProfile) return query(collection(firestore, 'users'), where('id', '==', userProfile.id));
    return null;
  }, [firestore, isAdmin, isSupervisor, userProfile]);

  const { data: allUsersData, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  const allUsersMap = useMemo(() => {
    const userMap = new Map<string, AppUser>();
    if (allUsersData) allUsersData.forEach(u => userMap.set(u.id, u));
    if (userProfile && !userMap.has(userProfile.id)) userMap.set(userProfile.id, userProfile);
    return userMap;
  }, [allUsersData, userProfile]);


  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

   const allCampusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(allCampusesQuery);
  
  const allCyclesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'cycles') : null, [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(allCyclesQuery);
  
  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    const uniqueYears = [...new Set(allCycles.map(c => c.year))].sort((a, b) => b - a);
    if (uniqueYears.length === 0) return [new Date().getFullYear()];
    if (!uniqueYears.includes(new Date().getFullYear())) uniqueYears.unshift(new Date().getFullYear());
    return uniqueYears;
  }, [allCycles]);

  useEffect(() => {
    if (years.length > 0 && !years.includes(selectedYear)) setSelectedYear(years[0]);
  }, [years, selectedYear]);

  const campusSettingsDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId || !canViewCampusAnnouncements) return null;
    return doc(firestore, 'campusSettings', userProfile.campusId);
  }, [firestore, userProfile?.campusId, canViewCampusAnnouncements]);

  const { data: campusSetting, isLoading: isLoadingSettings } = useDoc(campusSettingsDocRef);

  const globalAnnouncementDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'campusSettings', 'global');
  }, [firestore, user]);
  
  const { data: globalSetting, isLoading: isLoadingGlobalSettings } = useDoc(globalAnnouncementDocRef);

  const announcement = campusSetting?.announcement;
  const globalAnnouncement = globalSetting?.announcement;
  
  useEffect(() => {
    if (announcement || globalAnnouncement) {
      const timer = setTimeout(() => {
        setIsAnnouncementVisible(false);
        setIsGlobalAnnouncementVisible(false);
      }, 80000); 
      return () => clearTimeout(timer);
    }
  }, [announcement, globalAnnouncement]);

  
  const unitsInCampus = useMemo(() => {
      if (!allUnits || !userProfile?.campusId) return [];
      return allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
  }, [allUnits, userProfile]);

    const isCampusSupervisor = isSupervisor && !isAdmin;

  const isLoading =
    isUserLoading ||
    isLoadingSubmissions ||
    (canViewCampusAnnouncements && isLoadingSettings) ||
    isLoadingUnits ||
    isLoadingCampuses ||
    isLoadingGlobalSettings ||
    isLoadingCycles ||
    isLoadingRisks ||
    isLoadingUsers;


  const stats = useMemo(() => {
    const defaultStats = {
      stat1: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat2: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat3: { title: 'Loading...', value: '...', icon: <Clock /> },
    };

    if (!submissions || !userProfile) return defaultStats;
    
    const userCount = allUsersMap.size;
    const yearSubmissions = submissions.filter((s) => s.year === selectedYear);

    if (isAdmin) {
      return {
        stat1: {
          title: 'Pending Approvals',
          value: submissions.filter((s) => s.statusId === 'submitted' && s.year === selectedYear).length,
          icon: <Clock className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Total Submissions',
          value: yearSubmissions.length,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat3: {
          title: 'Total Users',
          value: userCount,
          icon: <Users className="h-6 w-6 text-primary" />,
        },
      };
    } else if (isSupervisor) {
      const totalRequired = unitsInCampus.length * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;
      const uniqueSubmissionsCount = new Set(yearSubmissions.map(s => s.reportType + s.unitId + s.cycleId)).size;

      return {
        stat1: {
          title: 'Required Submissions',
          value: `${uniqueSubmissionsCount} of ${totalRequired}`,
          description: `Across ${unitsInCampus.length} units in ${selectedYear}`,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Campus Submissions',
          value: yearSubmissions.length,
          description: `Total for your campus in ${selectedYear}`,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat3: {
          title: 'Campus Users',
          value: userCount,
          description: `Users in your campus`,
          icon: <Users className="h-6 w-6 text-primary" />,
        },
      };
    } else {
        const firstCycleSubmissions = yearSubmissions.filter(s => s.cycleId === 'first');
        const firstCycleRegistry = firstCycleSubmissions.find(s => s.reportType === 'Risk and Opportunity Registry');
        const requiredFirstCycle = firstCycleRegistry?.riskRating === 'low' ? (TOTAL_REPORTS_PER_CYCLE - 1) : TOTAL_REPORTS_PER_CYCLE;

        const finalCycleSubmissions = yearSubmissions.filter(s => s.cycleId === 'final');
        const finalCycleRegistry = finalCycleSubmissions.find(s => s.reportType === 'Risk and Opportunity Registry');
        const requiredFinalCycle = finalCycleRegistry?.riskRating === 'low' ? (TOTAL_REPORTS_PER_CYCLE - 1) : TOTAL_REPORTS_PER_CYCLE;

        const firstCycleCount = new Set(firstCycleSubmissions.map(s => s.reportType)).size;
        const finalCycleCount = new Set(finalCycleSubmissions.map(s => s.reportType)).size;
        
        return {
            stat1: {
              title: 'First Cycle',
              value: `${firstCycleCount} of ${requiredFirstCycle}`,
              description: `Submissions for ${selectedYear}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat2: {
              title: 'Final Cycle',
              value: `${finalCycleCount} of ${requiredFinalCycle}`,
              description: `Submissions for ${selectedYear}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat3: {
              title: 'Total Approved',
              value: yearSubmissions.filter((s) => s.statusId === 'approved').length,
              description: `Approved in ${selectedYear}`,
              icon: <CheckCircle className="h-6 w-6 text-primary" />,
            },
        };
    }
  }, [submissions, isSupervisor, isAdmin, allUsersMap, userProfile, unitsInCampus, selectedYear]);

  const { firstCycleStatusMap, finalCycleStatusMap } = useMemo(() => {
    const emptyResult = { firstCycleStatusMap: new Map<string, Submission>(), finalCycleStatusMap: new Map<string, Submission>() };
    if (!submissions) return emptyResult;
    const yearSubmissions = submissions.filter((s) => s.year === selectedYear);
    const firstCycleMap = new Map(yearSubmissions.filter(s => s.cycleId === 'first').map((s) => [s.reportType, s]));
    const finalCycleMap = new Map(yearSubmissions.filter(s => s.cycleId === 'final').map((s) => [s.reportType, s]));
    return { firstCycleStatusMap: firstCycleMap, finalCycleStatusMap: finalCycleMap };
  }, [submissions, selectedYear]);

  const sortedSubmissions = useMemo(() => {
    if (!submissions) return [];
    return [...submissions].filter(s => s.year === selectedYear).sort((a,b) => {
        const dateA = a.submissionDate instanceof Date ? a.submissionDate.getTime() : 0;
        const dateB = b.submissionDate instanceof Date ? b.submissionDate.getTime() : 0;
        return dateB - dateA;
    });
  }, [submissions, selectedYear]);
  
  const noRisksLogged = useMemo(() => {
    const isUnitUser = userRole === 'Unit Coordinator' || userRole === 'Unit ODIMO';
    if (!isUnitUser || !risks) return false;
    const yearRisks = risks.filter(r => r.year === selectedYear);
    return yearRisks.length === 0;
  }, [risks, userRole, selectedYear]);
  
  const getStatusText = (status: string) => {
    return status === 'submitted' ? 'Awaiting Approval' : status;
  }

  const renderCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    isLoading: boolean,
    description?: string
  ) => (
    <Card>
      <CardHeader className="pb-2">
        <div className='flex justify-between items-start'>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );

  const getIconForStatus = (status?: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'submitted': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <XCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };
  
  const renderSubmissionChecklist = (cycle: 'first' | 'final', statusMap: Map<string, Submission>) => {
    const registryFormSubmission = statusMap.get('Risk and Opportunity Registry');
    const isActionPlanNA = registryFormSubmission?.riskRating === 'low';
    const requiredReports = isActionPlanNA ? submissionTypes.filter(t => t !== 'Risk and Opportunity Action Plan') : submissionTypes;
    const submittedCount = Array.from(statusMap.keys()).filter(type => requiredReports.includes(type)).length;
    const progress = (submittedCount / requiredReports.length) * 100;
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>Overall Progress ({cycle === 'first' ? 'First' : 'Final'} Cycle)</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <div className="space-y-3">
              {submissionTypes.map((reportType) => {
                const submission = statusMap.get(reportType);
                const isSubmitted = !!submission;
                const isNA = reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA;
                return (
                  <div key={reportType} className={cn("flex items-center justify-between rounded-md border p-4", isNA && "opacity-50 bg-muted/50")}>
                      <div className="flex items-center gap-3">
                         {getIconForStatus(isNA ? 'n/a' : submission?.statusId)}
                        <span className="font-medium">{reportType}</span>
                      </div>
                      {isNA ? <Badge variant="secondary">N/A</Badge> : isSubmitted ? <Badge variant={statusVariant[submission.statusId]} className="capitalize">{getStatusText(submission.statusId)}</Badge> : <Badge variant="outline">Not Submitted</Badge>}
                  </div>
                );
              })}
            </div>
        </div>
    );
  }

  const renderUnitUserHome = () => {
    return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid grid-cols-2 md:inline-flex md:h-10 md:w-auto h-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        {userRole === 'Unit ODIMO' && <TabsTrigger value="approvals">Approvals</TabsTrigger>}
        <TabsTrigger value="actions">Submission Checklist</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-4">
        {noRisksLogged && !isLoading && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Action Required: Risk Register</AlertTitle>
            <AlertDescription>
              Your unit has not logged any risks or opportunities for {selectedYear}. It is critical to populate the{' '}
              <Link href="/risk-register" className="font-semibold underline">Risk Register</Link>
              {' '}to ensure compliance.
            </AlertDescription>
          </Alert>
        )}
        <OverdueWarning allCycles={allCycles} submissions={submissions} isLoading={isLoading} />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
            {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
            {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
        </div>

         <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin} />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Submissions Overview</CardTitle>
              <CardDescription>Your monthly submission trend for the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <Overview submissions={submissions} isLoading={isLoading} />
            </CardContent>
          </Card>
          <Card className="col-span-4 lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your last 5 submissions.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {userRole === 'Unit ODIMO' && (
        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Unit Approvals</CardTitle><CardDescription>Submissions from your unit awaiting your evaluation.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Submitter</TableHead><TableHead>Report</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {submissions?.filter(s => s.statusId === 'submitted' && s.userId !== userProfile?.id && s.year === selectedYear).map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{allUsersMap.get(submission.userId)?.firstName} {allUsersMap.get(submission.userId)?.lastName}</TableCell>
                      <TableCell>{submission.reportType}</TableCell>
                      <TableCell>{format(submission.submissionDate, 'PP')}</TableCell>
                      <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => router.push(`/submissions/${submission.id}`)}><ClipboardCheck className="mr-2 h-4 w-4" /> Evaluate Submission</Button></TableCell>
                    </TableRow>
                  ))}
                  {submissions?.filter(s => s.statusId === 'submitted' && s.userId !== userProfile?.id && s.year === selectedYear).length === 0 && (
                    <TableRow><TableCell colSpan={4} className="h-24 text-center">No submissions pending evaluation for {selectedYear}.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      <TabsContent value="actions" className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Submission Status</CardTitle><CardDescription>Checklist for all required submissions for {selectedYear}.</CardDescription></CardHeader>
          <CardContent>
              <Tabs defaultValue="first-cycle" className="space-y-4">
                 <TabsList><TabsTrigger value="first-cycle">First Cycle</TabsTrigger><TabsTrigger value="final-cycle">Final Cycle</TabsTrigger></TabsList>
                <TabsContent value="first-cycle">{renderSubmissionChecklist('first', firstCycleStatusMap)}</TabsContent>
                <TabsContent value="final-cycle">{renderSubmissionChecklist('final', finalCycleStatusMap)}</TabsContent>
              </Tabs>
             <Button asChild className="w-full mt-6"><Link href="/submissions/new"><Pencil className="mr-2 h-4 w-4" />Manage Submissions</Link></Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="history">
        <Card>
          <CardHeader><CardTitle>Submission History</CardTitle><CardDescription>A log of all your past submissions and their status for {selectedYear}.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? ([...Array(5)].map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-5 w-full"/></TableCell></TableRow>))) : sortedSubmissions && sortedSubmissions.length > 0 ? (sortedSubmissions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><div className="font-medium">{s.reportType}</div><div className="text-xs text-muted-foreground capitalize">{s.cycleId} Cycle {s.year}</div></TableCell>
                      <TableCell>{s.submissionDate instanceof Date ? format(s.submissionDate, 'PPp') : 'Invalid Date'}</TableCell>
                      <TableCell><Badge variant={statusVariant[s.statusId]}>{getStatusText(s.statusId)}</Badge></TableCell>
                      <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => router.push(`/submissions/${s.id}`)}><Eye className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))) : (<TableRow><TableCell colSpan={4} className="h-24 text-center">No submissions yet for {selectedYear}.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );};

  const renderSupervisorHome = () => (
    <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 lg:inline-flex lg:h-10 lg:w-auto h-auto">
            <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
            <TabsTrigger value="users"><User className="mr-2 h-4 w-4" />Users</TabsTrigger>
            <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
        </TabsList>
      <TabsContent value="overview" className="space-y-4">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-4 space-y-4">
                {unitsInCampus.length === 0 && !isLoading && (
                    <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Campus Setup Required</AlertTitle><AlertDescription className="flex items-center justify-between"><span>Your campus does not have any units assigned. Please set up units to begin tracking submissions.</span><Button onClick={() => router.push('/settings')}><Settings className="mr-2 h-4 w-4" />Setup Units</Button></AlertDescription></Alert>
                )}
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
                    {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
                    {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <CompletedSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isSupervisor} selectedYear={selectedYear} />
                    <UnitsWithoutSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isAdmin={isAdmin} isCampusSupervisor={isSupervisor} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
                </div>
                <Card className="col-span-4"><CardHeader><CardTitle>Submissions Overview</CardTitle><CardDescription>Monthly submissions from your campus.</CardDescription></CardHeader><CardContent className="pl-2"><Overview submissions={submissions} isLoading={isLoading} /></CardContent></Card>
            </div>
            <div className="lg:col-span-3 space-y-4">
                <Leaderboard allSubmissions={submissions} allUnits={allUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
                 <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>The latest submissions from your campus.</CardDescription></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
                {selectedDetail && (<UnitSubmissionDetailCard unitId={selectedDetail.unitId} campusId={selectedDetail.campusId} allUnits={allUnits} allSubmissions={submissions} onClose={() => setSelectedDetail(null)} onViewSubmission={(id) => router.push(`/submissions/${id}`)} selectedYear={selectedYear} />)}
            </div>
        </div>
      </TabsContent>
       <TabsContent value="analytics" className="space-y-4">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin}/>
        <CampusUnitOverview allUnits={allUnits} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} selectedYear={selectedYear} />
        <SubmissionAnalytics allSubmissions={submissions} allUnits={allUnits} isLoading={isLoading} isAdmin={isAdmin} userProfile={userProfile} selectedYear={selectedYear} />
      </TabsContent>
       <TabsContent value="users" className="space-y-4">
        {isSupervisor && (<UnitUserOverview allUsers={Array.from(allUsersMap.values())} allUnits={allUnits} isLoading={isLoading} userProfile={userProfile} />)}
      </TabsContent>
       <TabsContent value="strategic" className="space-y-6">
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={unitsInCampus} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
        <CycleSubmissionBreakdown allSubmissions={submissions} selectedYear={selectedYear} />
      </TabsContent>
    </Tabs>
  );

  const renderAdminHome = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid grid-cols-3 md:inline-flex md:h-10 md:w-auto h-auto">
        <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
        <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
        <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
          {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
          {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
                 <IncompleteCampusSubmissions allSubmissions={submissions} allCampuses={campuses} allUnits={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} />
                <div className="grid gap-4 md:grid-cols-2">
                    <CompletedSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} />
                    <UnitsWithoutSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isAdmin={isAdmin} isCampusSupervisor={isCampusSupervisor} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
                </div>
            </div>
             <div className="lg:col-span-1 space-y-4">
                <Leaderboard allSubmissions={submissions} allUnits={allUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
                <Card><CardHeader><CardTitle>Submissions Overview</CardTitle><CardDescription>Monthly submissions from all users.</CardDescription></CardHeader><CardContent className="pl-2"><Overview submissions={submissions} isLoading={isLoading} /></CardContent></Card>
                 <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>The latest submissions from all users.</CardDescription></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} /></CardContent></Card>
            </div>
        </div>
        {selectedDetail && (<UnitSubmissionDetailCard unitId={selectedDetail.unitId} campusId={selectedDetail.campusId} allUnits={allUnits} allSubmissions={submissions} onClose={() => setSelectedDetail(null)} onViewSubmission={(id) => router.push(`/submissions/${id}`)} selectedYear={selectedYear} />)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-4">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin} />
        <NonCompliantUnits allCycles={allCycles} allSubmissions={submissions} allUnits={allUnits} userProfile={userProfile} isLoading={isLoading} selectedYear={selectedYear}/>
        <SubmissionAnalytics allSubmissions={submissions} allUnits={allUnits} isLoading={isLoading} isAdmin={isAdmin} userProfile={userProfile} selectedYear={selectedYear} />
      </TabsContent>
      <TabsContent value="strategic" className="space-y-6">
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={allUnits} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
        <CycleSubmissionBreakdown allSubmissions={submissions} selectedYear={selectedYear} />
      </TabsContent>
    </Tabs>
  );

  const renderHomeContent = () => {
    if (isLoading) return (<div className="space-y-4"><div className="grid gap-4 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"><Skeleton className="col-span-4 h-80" /><Skeleton className="col-span-3 h-80" /></div></div>);
    if (isAdmin) return renderAdminHome();
    if (isSupervisor) return renderSupervisorHome();
    return renderUnitUserHome();
  };
  
  const showAnnouncements = !isLoading && ((globalAnnouncement && isGlobalAnnouncementVisible) || (announcement && isAnnouncementVisible));

  return (
    <div className="space-y-4">
       <div className="flex flex-col gap-4">
        <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Home</h2>
            <p className="text-muted-foreground">Welcome back, {userProfile?.firstName}! Here's your overview for {selectedYear}.</p>
          </div>
           <div className="w-full sm:w-[150px]"><Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}><SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger><SelectContent>{years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
        </div>
        
        {showAnnouncements && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare />Communications Board</CardTitle><CardDescription>Important announcements from campus and system administrators.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {globalAnnouncement && isGlobalAnnouncementVisible && (<Alert><Globe className="h-4 w-4" /><AlertTitle>Global Announcement</AlertTitle><AlertDescription>{globalAnnouncement}</AlertDescription><AlertCloseButton onClick={() => setIsGlobalAnnouncementVisible(false)} /></Alert>)}
              {announcement && isAnnouncementVisible && (<Alert><Megaphone className="h-4 w-4" /><AlertTitle>Campus Announcement</AlertTitle><AlertDescription>{announcement}</AlertDescription><AlertCloseButton onClick={() => setIsAnnouncementVisible(false)} /></Alert>)}
            </CardContent>
          </Card>
        )}
      </div>
      {renderHomeContent()}
    </div>
  );
}
