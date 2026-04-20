
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
  Pencil,
  AlertCircle,
  Eye,
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
  TrendingUp,
  Trophy,
  ShieldAlert,
  ListTodo,
  Printer,
  ChevronRight,
  XCircle,
  Settings,
  Building2,
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
  getDoc,
} from 'firebase/firestore';
import type { 
    Submission, 
    User as AppUser, 
    Unit, 
    Campus, 
    Cycle, 
    Risk, 
    ManagementReviewOutput, 
    AuditPlan, 
    QaAdvisory, 
    UnitMonitoringRecord,
    ProgramComplianceRecord,
    AuditFinding,
    CorrectiveActionRequest,
    AuditSchedule,
    Signatories,
    ISOClause
} from '@/lib/types';
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
import { format } from 'date-fns';
import { SubmissionAnalytics } from '@/components/dashboard/submission-analytics';
import { useRouter } from 'next/navigation';
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
import { cn, normalizeReportType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ComplianceHeatmap } from '@/components/dashboard/strategic/compliance-heatmap';
import { MaturityRadar } from '@/components/dashboard/strategic/maturity-radar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StrategicSwotAnalysis } from '@/components/submissions/strategic-swot-analysis';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccreditationRecommendationReport } from '@/components/programs/recommendation-print-template';
import { UnitAuditSchedule } from '@/components/dashboard/unit-audit-schedule';
import { AuditPrintTemplate } from '@/components/audit/audit-print-template';
import { useToast } from '@/hooks/use-toast';


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
  const { toast } = useToast();

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isGlobalAnnouncementVisible, setIsGlobalAnnouncementVisible] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedDetail, setSelectedDetail] = useState<{ unitId: string, campusId: string } | null>(null);

  const canViewCampusAnnouncements = userProfile?.campusId;

  // Identify Campus vs Unit Level for dashboard routing and querying
  const roleLower = userRole?.toLowerCase() || '';
  const isCampusLevel = isAdmin || isVp || roleLower.includes('campus director') || roleLower.includes('campus odimo');
  const isCampusSupervisor = isSupervisor && !isAdmin && isCampusLevel;

  // Fetch submissions based on role
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (!userProfile) return null;
    
    if (isCampusSupervisor) {
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
  }, [firestore, userProfile, isAdmin, isCampusSupervisor]);

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
  
   // Fetch risks based on role
  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRisksQuery = collection(firestore, 'risks');
    if (isAdmin) return baseRisksQuery;
    if (isCampusSupervisor) {
        if (userProfile.campusId) return query(baseRisksQuery, where('campusId', '==', userProfile.campusId));
        return null; 
    }
    if (userProfile.unitId && userProfile.campusId) {
        return query(baseRisksQuery, where('unitId', '==', userProfile.unitId), where('campusId', '==', userProfile.campusId));
    }
    return null; 
  }, [firestore, userProfile, isAdmin, isCampusSupervisor]);

  const { data: risks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  // Fetch monitoring records
  const monitoringQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'unitMonitoringRecords');
    if (isAdmin) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    
    // For Unit Level: Strictly filter by Unit AND Site to prevent cross-campus leakage
    return query(baseRef, 
        where('unitId', '==', userProfile.unitId),
        where('campusId', '==', userProfile.campusId)
    );
  }, [firestore, userProfile, isAdmin, isCampusSupervisor]);
  const { data: monitoringRecords } = useCollection<UnitMonitoringRecord>(monitoringQuery);

  // Fetch performance data
  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'programCompliances');
    return query(baseRef, where('academicYear', '==', selectedYear));
  }, [firestore, userProfile, selectedYear]);
  const { data: allCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const carQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'correctiveActionRequests');
    if (isAdmin) return baseRef;
    if (isCampusSupervisor) return query(baseRef, where('campusId', '==', userProfile.campusId));
    
    // For Unit Coordinators: Strictly bound to unit AND site
    return query(baseRef, 
        where('unitId', '==', userProfile.unitId),
        where('campusId', '==', userProfile.campusId)
    );
  }, [firestore, userProfile, isAdmin, isCampusSupervisor]);
  const { data: correctiveActionRequests } = useCollection<CorrectiveActionRequest>(carQuery);

  const findingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'auditFindings');
  }, [firestore, userProfile]);
  const { data: auditFindings } = useCollection<AuditFinding>(findingsQuery);

  const mrOutputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore, userProfile]);
  const { data: mrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'users');
    if (isCampusSupervisor && userProfile?.campusId) return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    if (userProfile) return query(collection(firestore, 'users'), where('id', '==', userProfile.id));
    return null;
  }, [firestore, isAdmin, isCampusSupervisor, userProfile]);

  const { data: allUsersData, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  const allUsersMap = useMemo(() => {
    const userMap = new Map<string, AppUser>();
    if (allUsersData) allUsersData.forEach(u => userMap.set(u.id, u));
    if (userProfile && !userMap.has(userProfile.id)) userMap.set(userProfile.id, userProfile);
    return userMap;
  }, [allUsersData, userProfile]);


  const allUnitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

   const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);
  
  const campusMap = useMemo(() => {
    const map = new Map<string, string>();
    campuses?.forEach(c => map.set(c.id, c.name));
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    allUnits?.forEach(u => map.set(u.id, u.name));
    return map;
  }, [allUnits]);

  const allCyclesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'cycles') : null, [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(allCyclesQuery);

  const advisoriesQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, 'qaAdvisories'), orderBy('releaseDate', 'desc'), limit(1)) : null), [firestore]);
  const { data: latestAdvisories } = useCollection<QaAdvisory>(advisoriesQuery);

  const latestAdvisory = useMemo(() => {
    if (!latestAdvisories || latestAdvisories.length === 0 || !userProfile) return null;
    const adv = latestAdvisories[0];
    const isAccessible = adv.scope === 'University-Wide' || adv.targetUnitId === userProfile.unitId || isAdmin;
    return isAccessible ? adv : null;
  }, [latestAdvisories, userProfile, isAdmin]);

  const isoClausesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'isoClauses') : null), [firestore]);
  const { data: isoClauses } = useCollection<ISOClause>(isoClausesQuery);

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  /**
   * IQA SCHEDULE FETCHING FOR DASHBOARD
   */
  const auditSchedulesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const baseRef = collection(firestore, 'auditSchedules');
    const activeStatuses = ['Scheduled', 'In Progress'];
    
    if (isAdmin) return query(baseRef, where('status', 'in', activeStatuses));
    
    // Campus-level oversight (Directors/ODIMOs) see all audits for their campus
    if (isCampusLevel && userProfile.campusId) {
        return query(baseRef, where('campusId', '==', userProfile.campusId), where('status', 'in', activeStatuses));
    }
    
    // Unit-level roles see audits specifically for their unit AND site context to prevent leakage
    if (userProfile.unitId && userProfile.campusId) {
        return query(baseRef, 
            where('targetId', '==', userProfile.unitId), 
            where('campusId', '==', userProfile.campusId),
            where('status', 'in', activeStatuses)
        );
    }
    
    return null;
  }, [firestore, userProfile, isAdmin, isCampusLevel, isUserLoading]);

  const { data: dashboardSchedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(auditSchedulesQuery);

  const sortedDashboardSchedules = useMemo(() => {
    if (!dashboardSchedules) return [];
    return [...dashboardSchedules].sort((a, b) => {
        const timeA = a.scheduledDate?.toMillis?.() || new Date(a.scheduledDate).getTime();
        const timeB = b.scheduledDate?.toMillis?.() || new Date(b.scheduledDate).getTime();
        return timeA - timeB;
    });
  }, [dashboardSchedules]);
  
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

  const schedulesQuery = useMemoFirebase(() => {
    if (!firestore || userRole !== 'Auditor' || !user) return null;
    return query(collection(firestore, 'auditSchedules'), where('auditorId', '==', user.uid));
  }, [firestore, userRole, user]);
  const { data: mySchedules } = useCollection<AuditSchedule>(schedulesQuery);

  const assignedRecommendations = useMemo(() => {
    if (!allCompliances || !userProfile?.unitId) return [];
    
    const results: any[] = [];
    allCompliances.forEach(record => {
        record.accreditationRecords?.forEach(milestone => {
            milestone.recommendations?.forEach(reco => {
                if (reco.assignedUnitIds?.includes(userProfile.unitId) && reco.status !== 'Closed') {
                    results.push({
                        programId: record.programId,
                        programName: allUnits?.find(u => u.id === record.programId)?.name || 'Academic Program',
                        level: milestone.level,
                        recommendation: reco
                    });
                }
            });
        });
    });
    return results;
  }, [allCompliances, userProfile?.unitId, allUnits]);

  const handlePrintAssignedRecos = () => {
    if (assignedRecommendations.length === 0 || !userProfile) return;

    try {
        const reportHtml = renderToStaticMarkup(
            <AccreditationRecommendationReport 
                items={assignedRecommendations.map((r: any) => ({
                    programName: r.programName,
                    abbreviation: '',
                    level: r.level,
                    recommendation: r.recommendation
                }))}
                unitMap={unitMap}
                scope="unit"
                year={selectedYear}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>Unit Accreditation Gaps Report</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet"><style>@media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } } body { font-family: serif; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest">Click to Print Unit Recommendations</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  const handlePrintAuditTemplate = async (schedule: AuditSchedule) => {
    if (!isoClauses || !firestore) return;
    const clausesInScope = isoClauses.filter(c => schedule.isoClausesToAudit.includes(c.id));
    
    // Fetch plan for leadAuditorName
    let leadAuditorName = '';
    try {
        const planSnap = await getDoc(doc(firestore, 'auditPlans', schedule.auditPlanId));
        if (planSnap.exists()) {
            leadAuditorName = planSnap.data()?.leadAuditorName || '';
        }
    } catch(e) {}

    try {
        const reportHtml = renderToStaticMarkup(
            <AuditPrintTemplate 
                schedule={schedule}
                findings={[]} 
                clauses={clausesInScope}
                signatories={signatories || undefined}
                leadAuditorName={leadAuditorName}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Evidence Log Template - ${schedule.targetName}</title>
                    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                    <style>
                        @media print { body { margin: 0; padding: 0; background: white; } .no-print { display: none !important; } }
                        body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
                    </style>
                </head>
                <body>
                    <div class="no-print mb-8 flex justify-center">
                        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">Print Blank Evidence Log</button>
                    </div>
                    <div id="print-content">${reportHtml}</div>
                </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (err) {
        console.error("Print error:", err);
    }
  };

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
    
    const yearSubmissions = submissions.filter((s) => s.year === selectedYear);

    if (isAdmin) {
      return {
        stat1: {
          title: 'Pending Approvals',
          value: submissions.filter((s) => s.statusId === 'submitted' && s.year === selectedYear).length,
          description: `Pending review for ${selectedYear}`,
          icon: <Clock className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Total Submissions',
          value: yearSubmissions.length,
          description: `Total logs for ${selectedYear}`,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat3: {
          title: 'Total Users',
          value: allUsersMap.size,
          description: `Institutional registry for ${selectedYear}`,
          icon: <Users className="h-6 w-6 text-primary" />,
        },
      };
    } else if (isCampusSupervisor) {
      const totalRequired = unitsInCampus.length * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;
      const approvedSubmissionsCount = new Set(
        yearSubmissions
            .filter(s => s.statusId === 'approved')
            .map(s => s.reportType + s.unitId + s.cycleId)
      ).size;

      return {
        stat1: {
          title: 'Verified Maturity',
          value: `${Math.round((approvedSubmissionsCount / (totalRequired || 1)) * 100)}%`,
          description: `${approvedSubmissionsCount} of ${totalRequired} approved`,
          icon: <CheckCircle className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Campus Activity',
          value: yearSubmissions.length,
          description: `Total uploads for ${selectedYear}`,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat3: {
          title: 'Campus Users',
          value: allUsersMap.size,
          description: `Registered personnel: ${selectedYear}`,
          icon: <Users className="h-6 w-6 text-primary" />,
        },
      };
    } else if (userRole === 'Auditor') {
        return {
            stat1: {
                title: 'My Audits',
                value: mySchedules?.length || 0,
                description: `Schedules for ${selectedYear}`,
                icon: <ClipboardCheck className="h-6 w-6 text-primary" />,
            },
            stat2: {
                title: 'Completed',
                value: mySchedules?.filter(s => s.status === 'Completed').length || 0,
                description: `Finalized reports: ${selectedYear}`,
                icon: <CheckCircle className="h-6 w-6 text-primary" />,
            },
            stat3: {
                title: 'In Progress',
                value: mySchedules?.filter(s => s.status === 'In Progress').length || 0,
                description: `Ongoing conduct: ${selectedYear}`,
                icon: <Clock className="h-6 w-6 text-primary" />,
            },
        };
    } else {
        const firstCycleApproved = yearSubmissions.filter(s => s.cycleId === 'first' && s.statusId === 'approved');
        const firstCycleRegistry = yearSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        const requiredFirstCycle = firstCycleRegistry?.riskRating === 'low' ? (TOTAL_REPORTS_PER_CYCLE - 1) : TOTAL_REPORTS_PER_CYCLE;

        const finalCycleApproved = yearSubmissions.filter(s => s.cycleId === 'final' && s.statusId === 'approved');
        const finalCycleRegistry = yearSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
        const requiredFinalCycle = finalCycleRegistry?.riskRating === 'low' ? (TOTAL_REPORTS_PER_CYCLE - 1) : TOTAL_REPORTS_PER_CYCLE;

        const firstCycleCount = new Set(firstCycleApproved.map(s => s.reportType)).size;
        const finalCycleCount = new Set(finalCycleApproved.map(s => s.reportType)).size;
        
        return {
            stat1: {
              title: '1st Cycle (Verified)',
              value: `${firstCycleCount} / ${requiredFirstCycle}`,
              description: `Approved docs for ${selectedYear}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat2: {
              title: 'Final Cycle (Verified)',
              value: `${finalCycleCount} / ${requiredFinalCycle}`,
              description: `Approved docs for ${selectedYear}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat3: {
              title: 'Overall Maturity',
              value: `${Math.round(((firstCycleCount + finalCycleCount) / (requiredFirstCycle + requiredFinalCycle)) * 100)}%`,
              description: `Verification index: ${selectedYear}`,
              icon: <TrendingUp className="h-6 w-6 text-primary" />,
            },
        };
    }
  }, [submissions, isCampusSupervisor, isAdmin, allUsersMap, userProfile, unitsInCampus, selectedYear, userRole, mySchedules]);

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
    
    const approvedCount = Array.from(statusMap.values()).filter(s => s.statusId === 'approved' && requiredReports.includes(s.reportType)).length;
    const progress = (approvedCount / requiredReports.length) * 100;
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between text-sm font-medium mb-1">
              <span>Verified Maturity ({cycle === 'first' ? 'First' : 'Final'} Cycle)</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
            <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-3">
                {submissionTypes.map((reportType) => {
                    const submission = statusMap.get(reportType);
                    const isSubmitted = !!submission;
                    const isNA = reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA;
                    return (
                    <div key={reportType} className={cn("flex items-center justify-between rounded-md border p-4", isNA && "opacity-50 bg-muted/50")}>
                        <div className="flex items-center gap-3">
                            {getIconForStatus(isNA ? 'n/a' : submission?.statusId)}
                            <span className="font-medium text-xs">{reportType}</span>
                        </div>
                        {isNA ? <Badge variant="secondary" className="text-[9px]">N/A</Badge> : isSubmitted ? <Badge variant={statusVariant[submission.statusId]} className="capitalize text-[9px]">{getStatusText(submission.statusId)}</Badge> : <Badge variant="outline" className="text-[9px]">Not Submitted</Badge>}
                    </div>
                    );
                })}
                </div>
            </ScrollArea>
        </div>
    );
  }

  const renderUnitUserHome = () => {
    const currentUnit = allUnits?.find(u => u.id === userProfile?.unitId);
    
    const openCars = correctiveActionRequests?.filter(c => c.status !== 'Closed') || [];
    const openDecisions = mrOutputs?.filter(o => 
        (o.status === 'Open' || o.status === 'On-going') && 
        o.assignments?.some(a => a.unitId === userProfile?.unitId)
    ) || [];

    return (
    <Tabs defaultValue="overview" className="space-y-4">
      <ScrollArea className="w-full">
        <TabsList className="flex md:inline-flex md:h-10 md:w-auto h-auto animate-tab-highlight rounded-md p-1 bg-muted whitespace-nowrap">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="actions">Submission Checklist</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
      </ScrollArea>
      
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
        
        <UnitAuditSchedule schedules={sortedDashboardSchedules} isLoading={isLoadingSchedules} />

        {(openCars.length > 0 || openDecisions.length > 0 || assignedRecommendations.length > 0) && (
            <Card className="border-destructive/20 bg-destructive/5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-black uppercase text-destructive flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Outstanding Quality Action Items
                    </CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Institutional findings requiring unit implementation for AY {selectedYear}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {openCars.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-destructive/10">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase">Corrective Actions</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">{openCars.length} Open Requests</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" asChild className="h-7 text-[9px] font-black uppercase bg-white border-destructive/20 text-destructive hover:bg-destructive/5">
                                <Link href="/qa-reports">Manage CARs</Link>
                            </Button>
                        </div>
                    )}
                    {openDecisions.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-primary/10">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                    <ListTodo className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase">MR Decisions</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">{openDecisions.length} Pending Actions</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" asChild className="h-7 text-[9px] font-black uppercase bg-white border-primary/20 text-primary hover:bg-primary/5">
                                <Link href="/qa-reports">View Decisions</Link>
                            </Button>
                        </div>
                    )}
                    {assignedRecommendations.length > 0 && (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-amber-200">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                    <Award className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-900 uppercase">Accreditation Gaps</p>
                                    <p className="text-[10px] text-muted-foreground font-medium">{assignedRecommendations.length} Assigned Recos</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={handlePrintAssignedRecos} className="h-7 text-[9px] font-black uppercase bg-white border-amber-200 text-amber-700 hover:bg-amber-50">
                                <Printer className="h-3 w-3 mr-1" /> Print Log
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
            {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
            {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
        </div>

        {!isLoading && currentUnit && (
            <StrategicSwotAnalysis 
                submissions={submissions?.filter(s => s.unitId === userProfile?.unitId && s.year === selectedYear) || []}
                risks={risks?.filter(r => r.unitId === userProfile?.unitId && r.year === selectedYear) || []}
                monitoringRecords={monitoringRecords?.filter(r => r.unitId === userProfile?.unitId) || []}
                programCompliances={allCompliances?.filter(c => c.unitId === userProfile?.unitId && c.academicYear === selectedYear) || []}
                auditFindings={auditFindings || []}
                correctiveActionRequests={correctiveActionRequests?.filter(car => car.unitId === userProfile?.unitId) || []}
                mrOutputs={mrOutputs?.filter(o => o.assignments?.some(a => a.unitId === userProfile?.unitId)) || []}
                scope="unit"
                name={currentUnit.name}
                selectedYear={selectedYear}
            />
        )}

         <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin} />
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
          <Card className="col-span-1 lg:col-span-4">
            <CardHeader>
              <CardTitle>Submissions Overview</CardTitle>
              <CardDescription>Your monthly submission trend for the last 12 months.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <Overview submissions={submissions} isLoading={isLoading} />
            </CardContent>
          </Card>
          <Card className="col-span-1 lg:col-span-3">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your last 10 submissions across {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} />
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3">
                <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        Displays the most recent document updates. Use this to track real-time progression of your unit's documentation cycle.
                    </p>
                </div>
            </CardFooter>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="actions" className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Verified Documentation Checklist</CardTitle><CardDescription>Only <strong>Approved</strong> documents contribute to your unit's compliance progress for {selectedYear}.</CardDescription></CardHeader>
          <CardContent>
              <Tabs defaultValue="first-cycle" className="space-y-4">
                 <TabsList className="animate-tab-highlight rounded-md p-1 bg-muted"><TabsTrigger value="first-cycle">First Cycle</TabsTrigger><TabsTrigger value="final-cycle">Final Cycle</TabsTrigger></TabsList>
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
            <div className="overflow-x-auto">
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
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );};

  const renderAuditorHome = () => (
    <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
            {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
            {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
        </div>
        <Card>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between border-b gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2"><ClipboardCheck className="text-primary" /> Active Audit Conduct</CardTitle>
                    <CardDescription>Your claimed and upcoming internal quality audit schedules.</CardDescription>
                </div>
                <Button onClick={() => router.push('/audit')} className="w-full md:w-auto">Manage Full Audit Hub</Button>
            </CardHeader>
            <CardContent className="pt-6">
                {mySchedules && mySchedules.length > 0 ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Auditee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {mySchedules.slice(0, 5).map(s => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-bold">{s.targetName}</TableCell>
                                        <TableCell>{format(s.scheduledDate.toDate(), 'PP')}</TableCell>
                                        <TableCell className="text-xs font-medium tabular-nums">
                                            {format(s.scheduledDate.toDate(), 'p')}
                                            {s.endScheduledDate && ` - ${format(s.endScheduledDate.toDate(), 'p')}`}
                                        </TableCell>
                                        <TableCell><Badge variant="secondary">{s.status}</Badge></TableCell>
                                        <TableCell className="text-right whitespace-nowrap space-x-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => handlePrintAuditTemplate(s)}
                                                className="h-8 text-[10px] font-black uppercase tracking-widest bg-white border-primary/20 text-primary"
                                            >
                                                <Printer className="h-3.5 w-3.5 mr-1.5" />
                                                Print Template
                                            </Button>
                                            <Button variant="default" size="sm" onClick={() => router.push(`/audit/${s.id}`)}>
                                                Conduct Audit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                        <p>No audit schedules claimed yet. Go to the IQA Hub to find available schedules.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );

  const renderSupervisorHome = () => (
    <Tabs defaultValue="overview" className="space-y-4">
        <ScrollArea className="w-full">
            <TabsList className="flex lg:inline-flex md:h-10 md:w-auto h-auto animate-tab-highlight rounded-md p-1 bg-muted whitespace-nowrap">
                <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
                <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
                <TabsTrigger value="users"><User className="mr-2 h-4 w-4" />Users</TabsTrigger>
                <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
            </TabsList>
        </ScrollArea>
      <TabsContent value="overview" className="space-y-4">
         <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-4 space-y-4">
                {unitsInCampus.length === 0 && !isLoading && (
                    <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>Campus Setup Required</AlertTitle><AlertDescription className="flex items-center justify-between gap-4"><span>Your campus does not have any units assigned. Please set up units to begin tracking submissions.</span><Button onClick={() => router.push('/settings')} size="sm">
                                <Settings className="mr-2 h-4 w-4" />Setup Units</Button></AlertDescription></Alert>
                )}
                
                <UnitAuditSchedule schedules={sortedDashboardSchedules} isLoading={isLoadingSchedules} />

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
                    {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
                    {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
                </div>
                
                {!isLoading && userProfile?.campusId && (
                    <StrategicSwotAnalysis 
                        submissions={submissions?.filter(s => s.campusId === userProfile.campusId && s.year === selectedYear) || []}
                        risks={risks?.filter(r => r.campusId === userProfile.campusId && r.year === selectedYear) || []}
                        monitoringRecords={monitoringRecords?.filter(r => r.campusId === userProfile.campusId) || []}
                        programCompliances={allCompliances?.filter(c => c.campusId === userProfile.campusId && c.academicYear === selectedYear) || []}
                        auditFindings={auditFindings || []} 
                        correctiveActionRequests={correctiveActionRequests?.filter(car => car.campusId === userProfile.campusId) || []}
                        mrOutputs={mrOutputs?.filter(o => o.assignments?.some(a => a.campusId === userProfile.campusId)) || []}
                        scope="campus"
                        name={campusMap.get(userProfile.campusId) || 'Campus'}
                        selectedYear={selectedYear}
                    />
                )}

                <Card><CardHeader><CardTitle>Submissions Overview</CardTitle><CardDescription>Monthly submissions from your campus.</CardDescription></CardHeader><CardContent className="pl-2"><Overview submissions={submissions} isLoading={isLoading} /></CardContent></Card>
                <ComplianceHeatmap units={unitsInCampus} submissions={submissions || []} selectedYear={selectedYear} />
            </div>
            <div className="lg:col-span-3 space-y-4">
                <div className="space-y-4">
                    <CompletedSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} />
                    <UnitsWithoutSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isAdmin={isAdmin} isCampusSupervisor={isCampusSupervisor} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
                </div>
                <Leaderboard allSubmissions={submissions} allUnits={allUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
                 <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>The latest submissions from your campus.</CardDescription></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} /></CardContent>
                <CardFooter className="bg-muted/5 border-t py-3">
                    <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[9px] text-muted-foreground italic leading-tight">
                            Real-time campus contribution log. High activity density indicates active document control and unit engagement.
                        </p>
                    </div>
                </CardFooter></Card>
                {selectedDetail && (<UnitSubmissionDetailCard unitId={selectedDetail.unitId} campusId={selectedDetail.campusId} allUnits={allUnits} allSubmissions={submissions} onClose={() => setSelectedDetail(null)} onViewSubmission={(id) => router.push(`/submissions/${id}`)} selectedYear={selectedYear} />)}
            </div>
        </div>
      </TabsContent>
       <TabsContent value="analytics" className="space-y-4">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin}/>
        <ComplianceHeatmap units={unitsInCampus} submissions={submissions || []} selectedYear={selectedYear} title="Institutional Gap Heatmap" />
        <CampusUnitOverview allUnits={allUnits} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} selectedYear={selectedYear} />
        <SubmissionAnalytics allSubmissions={submissions} allUnits={allUnits} isLoading={isLoading} isAdmin={isAdmin} userProfile={userProfile} selectedYear={selectedYear} />
      </TabsContent>
       <TabsContent value="users" className="space-y-4">
        {isCampusSupervisor && (<UnitUserOverview allUsers={Array.from(allUsersMap.values())} allUnits={allUnits} isLoading={isLoading} userProfile={userProfile} />)}
      </TabsContent>
       <TabsContent value="strategic" className="space-y-6">
        <MaturityRadar campuses={campuses || []} submissions={submissions || []} risks={risks || []} mrOutputs={mrOutputs || []} selectedYear={selectedYear} />
        <ComplianceOverTime allSubmissions={submissions} allCycles={allCycles} allUnits={unitsInCampus} />
        <RiskMatrix allRisks={risks} selectedYear={selectedYear} />
        <RiskFunnel allRisks={risks} selectedYear={selectedYear} />
        <CycleSubmissionBreakdown allSubmissions={submissions} selectedYear={selectedYear} />
      </TabsContent>
    </Tabs>
  );

  const renderAdminHome = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="flex md:inline-flex md:h-10 md:w-auto h-auto animate-tab-highlight rounded-md p-1 bg-muted whitespace-nowrap">
          <TabsTrigger value="overview"><LayoutDashboard className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4" />Analytics</TabsTrigger>
          <TabsTrigger value="strategic"><BrainCircuit className="mr-2 h-4 w-4" />Strategic</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        
        <UnitAuditSchedule schedules={sortedDashboardSchedules} isLoading={isLoadingSchedules} />

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading, (stats.stat1 as any).description)}
          {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading, (stats.stat2 as any).description)}
          {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading, (stats.stat3 as any).description)}
        </div>
        
        {!isLoading && (
            <StrategicSwotAnalysis 
                submissions={submissions?.filter(s => s.year === selectedYear) || []}
                risks={risks?.filter(r => r.year === selectedYear) || []}
                monitoringRecords={monitoringRecords || []}
                programCompliances={allCompliances?.filter(c => c.academicYear === selectedYear) || []}
                auditFindings={auditFindings || []} 
                correctiveActionRequests={correctiveActionRequests || []}
                mrOutputs={mrOutputs || []}
                scope="campus"
                name="University-Wide"
                selectedYear={selectedYear}
            />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-4 space-y-4">
                 <Card><CardHeader><CardTitle>Submissions Overview</CardTitle><CardDescription>Monthly submissions from all users.</CardDescription></CardHeader><CardContent className="pl-2"><Overview submissions={submissions} isLoading={isLoading} /></CardContent></Card>
                 <MaturityRadar campuses={campuses || []} submissions={submissions || []} risks={risks || []} mrOutputs={mrOutputs || []} selectedYear={selectedYear} />
            </div>
             <div className="lg:col-span-3 space-y-4">
                <IncompleteCampusSubmissions allSubmissions={submissions} allCampuses={campuses} allUnits={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} />
                <div className="grid grid-cols-1 gap-4">
                    <CompletedSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} />
                    <UnitsWithoutSubmissions allUnits={allUnits} allCampuses={campuses} allSubmissions={submissions} isLoading={isLoading} userProfile={userProfile} isAdmin={isAdmin} isCampusSupervisor={isCampusSupervisor} onUnitClick={(unitId, campusId) => setSelectedDetail({ unitId, campusId })} selectedYear={selectedYear} />
                </div>
                <Leaderboard allSubmissions={submissions} allUnits={allUnits} allCampuses={campuses} allCycles={allCycles} isLoading={isLoading} userProfile={userProfile} isCampusSupervisor={isCampusSupervisor} selectedYear={selectedYear} onYearChange={setSelectedYear} />
                 <Card><CardHeader><CardTitle>Recent Activity</CardTitle><CardDescription>The latest submissions from all users.</CardDescription></CardHeader><CardContent><RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} /></CardContent>
                 <CardFooter className="bg-muted/5 border-t py-3">
                    <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        <p className="text-[9px] text-muted-foreground italic leading-tight">
                            Institutional audit trail of latest evidence uploads. Use this to monitor university-wide documentation frequency.
                        </p>
                    </div>
                </CardFooter></Card>
            </div>
        </div>
        {selectedDetail && (<UnitSubmissionDetailCard unitId={selectedDetail.unitId} campusId={selectedDetail.campusId} allUnits={allUnits} allSubmissions={submissions} onClose={() => setSelectedDetail(null)} onViewSubmission={(id) => router.push(`/submissions/${id}`)} selectedYear={selectedYear} />)}
      </TabsContent>
      <TabsContent value="analytics" className="space-y-4">
        <SubmissionSchedule cycles={allCycles} isLoading={isLoadingCycles} />
        <RiskStatusOverview risks={risks} units={allUnits} isLoading={isLoading} selectedYear={selectedYear} onYearChange={setSelectedYear} isSupervisor={isSupervisor || isAdmin} />
        <ComplianceHeatmap units={allUnits || []} submissions={submissions || []} selectedYear={selectedYear} title="Institutional Parity Matrix" />
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
    if (isLoading) return (<div className="space-y-4"><div className="grid gap-4 grid-cols-1 md:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div><div className="grid gap-4 grid-cols-1 lg:grid-cols-7"><Skeleton className="col-span-4 h-80" /><Skeleton className="col-span-3 h-80" /></div></div>);
    if (isAdmin) return renderAdminHome();
    if (userRole === 'Auditor') return renderAuditorHome();
    if (isCampusSupervisor) return renderSupervisorHome();
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
           <div className="w-full sm:w-[150px] space-y-1">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 block sm:text-right">View Year</label>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="h-9 font-bold shadow-sm bg-white">
                        <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
        
        {showAnnouncements && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare />Communications Board</CardTitle><CardDescription>Important announcements from campus and system administrators.</CardDescription></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {globalAnnouncement && isGlobalAnnouncementVisible && (<Alert><Globe className="h-4 w-4" /> <AlertTitle>Global Announcement</AlertTitle><AlertDescription>{globalAnnouncement}</AlertDescription><AlertCloseButton onClick={() => setIsGlobalAnnouncementVisible(false)} /></Alert>)}
              {announcement && isAnnouncementVisible && (<Alert><Megaphone className="h-4 w-4" /><AlertTitle>Campus Announcement</AlertTitle><AlertDescription>{announcement}</AlertDescription><AlertCloseButton onClick={() => setIsAnnouncementVisible(false)} /></Alert>)}
            </CardContent>
          </Card>
        )}

        {!isLoading && latestAdvisory && (
            <Alert className="border-primary bg-primary/5 shadow-md animate-in slide-in-from-top-4 duration-500">
                <Megaphone className="h-5 w-5 text-primary" />
                <AlertTitle className="font-black uppercase tracking-tight text-primary">Latest QA Advisory: {latestAdvisory.subject}</AlertTitle>
                <AlertDescription className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                    <span className="text-sm font-medium text-slate-700">Official Directive {latestAdvisory.controlNumber} has been released.</span>
                    <Button size="sm" asChild className="h-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                        <Link href="/advisories">Open Advisory Vault</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        )}
      </div>
      {renderHomeContent()}
    </div>
  );
}
