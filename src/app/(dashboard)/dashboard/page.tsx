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
} from 'firebase/firestore';
import type { Submission, User as AppUser, Unit } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

const submissionTypes = [
  'Operational Plans',
  'Objectives Monitoring',
  'Risk and Opportunity Registry Form',
  'Risk and Opportunity Action Plan',
  'Updated Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

export const TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT = 6;

const statusVariant: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  approved: 'default',
  pending: 'secondary',
  rejected: 'destructive',
  submitted: 'outline',
};

export default function DashboardPage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [userCount, setUserCount] = useState(0);
  const [allUsers, setAllUsers] = useState<Record<string, AppUser>>({});

  // Determine user role and scope from the denormalized role name in userProfile
  const userRoleName = userRole;

  const isCampusSupervisor =
    userRoleName === 'Campus Director' || userRoleName === 'Campus ODIMO';
  const isUnitSupervisor = userRoleName === 'Unit ODIMO';
  const isSupervisor = isAdmin || isCampusSupervisor || isUnitSupervisor;
  const canViewAnnouncements = userProfile?.campusId;

  // Memoize the submissions query based on the user's role
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;

    if (isAdmin) {
      return collection(firestore, 'submissions');
    }

    if (!userProfile) return null;

    if (isCampusSupervisor) {
      return query(
        collection(firestore, 'submissions'),
        where('campusId', '==', userProfile.campusId)
      );
    }
    if (isUnitSupervisor) {
      return query(
        collection(firestore, 'submissions'),
        where('unitId', '==', userProfile.unitId)
      );
    }
    // Default to regular user's own submissions
    return query(
      collection(firestore, 'submissions'),
      where('userId', '==', userProfile.id)
    );
  }, [firestore, userProfile, isAdmin, isCampusSupervisor, isUnitSupervisor]);

  const { data: submissions, isLoading: isLoadingSubmissions } =
    useCollection<Submission>(submissionsQuery);

  const allUnitsQuery = useMemoFirebase(() => {
    if (!firestore || !isSupervisor) return null;
    return collection(firestore, 'units');
  }, [firestore, isSupervisor]);

  const { data: allUnits, isLoading: isLoadingUnits } =
    useCollection<Unit>(allUnitsQuery);

  // Fetch user count and all users for admins
  useEffect(() => {
    if (!firestore || (!isAdmin && !isCampusSupervisor)) {
      setUserCount(0);
      return;
    }

    const fetchUsers = async () => {
      let countQuery;
      if (isAdmin) {
        countQuery = collection(firestore, 'users');
      } else if (isCampusSupervisor && userProfile?.campusId) {
        countQuery = query(
          collection(firestore, 'users'),
          where('campusId', '==', userProfile.campusId)
        );
      }

      if (countQuery) {
        const snapshot = await getDocs(countQuery);
        setUserCount(snapshot.size);
        if (isAdmin) {
          const usersData: Record<string, AppUser> = {};
          snapshot.forEach((doc) => {
            usersData[doc.id] = { id: doc.id, ...doc.data() } as AppUser;
          });
          setAllUsers(usersData);
        }
      }
    };

    fetchUsers();
  }, [firestore, isAdmin, isCampusSupervisor, userProfile]);

  const campusSettingsDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId || !canViewAnnouncements)
      return null;
    return doc(firestore, 'campusSettings', userProfile.campusId);
  }, [firestore, userProfile?.campusId, canViewAnnouncements]);

  const { data: campusSetting, isLoading: isLoadingSettings } =
    useDoc(campusSettingsDocRef);

  const announcement = campusSetting?.announcement;

  const isLoading =
    isUserLoading ||
    isLoadingSubmissions ||
    (canViewAnnouncements && isLoadingSettings) ||
    (isSupervisor && isLoadingUnits);

  const stats = useMemo(() => {
    const defaultStats = {
      stat1: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat2: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat3: { title: 'Loading...', value: '...', icon: <Clock /> },
    };

    if (!submissions || !userProfile) return defaultStats;

    const currentYearSubmissions = submissions.filter(
      (s) => s.year === new Date().getFullYear()
    );

    if (isAdmin) {
      return {
        stat1: {
          title: 'Pending Approvals',
          value: submissions.filter((s) => s.statusId === 'submitted').length,
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Total Submissions',
          value: submissions.length,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat3: {
          title: 'Total Users',
          value: userCount,
          icon: <Users className="h-4 w-4 text-muted-foreground" />,
        },
      };
    } else if (isCampusSupervisor) {
      const unitsInCampus = allUnits
        ? allUnits.filter((u) => u.campusId === userProfile.campusId).length
        : 0;
      const totalRequired = unitsInCampus * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;

      return {
        stat1: {
          title: 'Required Submissions',
          value: `${currentYearSubmissions.length} of ${totalRequired}`,
          description: `Across ${unitsInCampus} units`,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Campus Submissions',
          value: submissions.length,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat3: {
          title: 'Campus Users',
          value: userCount,
          icon: <Users className="h-4 w-4 text-muted-foreground" />,
        },
      };
    } else if (isUnitSupervisor) {
      return {
        stat1: {
          title: 'Unit Pending',
          value: submissions.filter((s) => s.statusId === 'submitted').length,
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Unit Submissions',
          value: submissions.length,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat3: {
          title: 'Approved',
          value: submissions.filter((s) => s.statusId === 'approved').length,
          icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
        },
      };
    } else {
      // Regular user stats
      const uniqueFirstCycle = new Set(
        currentYearSubmissions
          .filter((s) => s.cycleId === 'first')
          .map((s) => s.reportType)
      );
      const uniqueFinalCycle = new Set(
        currentYearSubmissions
          .filter((s) => s.cycleId === 'final')
          .map((s) => s.reportType)
      );

      const firstCycleCount = uniqueFirstCycle.size;
      const finalCycleCount = uniqueFinalCycle.size;

      return {
        stat1: {
          title: 'Required Submissions',
          value: `${firstCycleCount} of ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`,
          description: `First Cycle - ${new Date().getFullYear()}`,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Required Submissions',
          value: `${finalCycleCount} of ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`,
          description: `Final Cycle - ${new Date().getFullYear()}`,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat3: {
          title: 'Total Approved',
          value: submissions.filter((s) => s.statusId === 'approved').length,
          icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
        },
      };
    }
  }, [submissions, isSupervisor, isAdmin, isCampusSupervisor, isUnitSupervisor, userCount, userProfile, allUnits]);

  const { submissionStatusMap, submissionProgress } = useMemo(() => {
    if (!submissions) {
      return {
        submissionStatusMap: new Map<string, Submission>(),
        submissionProgress: 0,
      };
    }
    const currentYearSubmissions = submissions.filter(
      (s) => s.year === new Date().getFullYear()
    );
    const statusMap = new Map(
      currentYearSubmissions.map((s) => [s.reportType, s])
    );

    const uniqueSubmissions = new Set(
      currentYearSubmissions.map((s) => s.reportType)
    );
    const progress =
      (uniqueSubmissions.size / submissionTypes.length) * 100;

    return {
      submissionStatusMap: statusMap,
      submissionProgress: progress,
    };
  }, [submissions]);

  const approvalQueue = useMemo(() => {
    if (!submissions) return [];
    return submissions.filter((s) => s.statusId === 'submitted');
  }, [submissions]);

  const renderCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    isLoading: boolean,
    description?: string
  ) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );

  const getIconForStatus = (status?: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const renderUnitCoordinatorDashboard = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="actions">Submission Actions</TabsTrigger>
        <TabsTrigger value="analytics" disabled>
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {renderCard(
            stats.stat1.title,
            stats.stat1.value,
            stats.stat1.icon,
            isLoading,
            (stats.stat1 as any).description
          )}
          {renderCard(
            stats.stat2.title,
            stats.stat2.value,
            stats.stat2.icon,
            isLoading,
            (stats.stat2 as any).description
          )}
          {renderCard(
            stats.stat3.title,
            stats.stat3.value,
            stats.stat3.icon,
            isLoading,
            (stats.stat3 as any).description
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Submissions Overview</CardTitle>
              <CardDescription>
                Your monthly submission trend for the last 12 months.
              </CardDescription>
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
              <RecentActivity submissions={submissions} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="actions" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tactical Submission Dashboard</CardTitle>
            <CardDescription>
              Quick actions for all required submissions for{' '}
              {new Date().getFullYear()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex justify-between text-sm font-medium mb-1">
                <span>Overall Progress</span>
                <span>{Math.round(submissionProgress)}%</span>
              </div>
              <Progress value={submissionProgress} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {submissionTypes.map((reportType) => {
                const submission = submissionStatusMap.get(reportType);
                const status = submission?.statusId || 'Not Submitted';
                return (
                  <Card key={reportType}>
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                      <CardTitle className="text-base font-medium">
                        {reportType}
                      </CardTitle>
                      {getIconForStatus(submission?.statusId)}
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant={
                          submission ? statusVariant[status] : 'outline'
                        }
                        className="capitalize"
                      >
                        {status}
                      </Badge>
                      {submission && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Cycle: {submission.cycleId}
                        </p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button asChild className="w-full">
                        <Link href="/submissions/new">
                          {submission ? (
                            <Pencil className="mr-2 h-4 w-4" />
                          ) : (
                            <FilePlus className="mr-2 h-4 w-4" />
                          )}
                          {submission
                            ? 'Update Submission'
                            : 'Add Submission'}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderSupervisorDashboard = () => (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {renderCard(
          stats.stat1.title,
          stats.stat1.value,
          stats.stat1.icon,
          isLoading,
          (stats.stat1 as any).description
        )}
        {renderCard(
          stats.stat2.title,
          stats.stat2.value,
          stats.stat2.icon,
          isLoading,
          (stats.stat2 as any).description
        )}
        {renderCard(
          stats.stat3.title,
          stats.stat3.value,
          stats.stat3.icon,
          isLoading,
          (stats.stat3 as any).description
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Submissions Overview</CardTitle>
            <CardDescription>
              {isSupervisor
                ? 'Monthly submissions from your scope.'
                : 'Your monthly submission trend.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <Overview submissions={submissions} isLoading={isLoading} />
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              {isSupervisor
                ? 'The latest submissions from your scope.'
                : 'Your last 5 submissions.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity submissions={submissions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>

      {isCampusSupervisor && (
         <CampusUnitOverview 
            allUnits={allUnits}
            allSubmissions={submissions}
            isLoading={isLoading}
            userProfile={userProfile}
         />
      )}

      {isSupervisor && (
        <UnitsWithoutSubmissions
          allUnits={allUnits}
          allSubmissions={submissions}
          isLoading={isLoading}
          userProfile={userProfile}
          isAdmin={isAdmin}
          isCampusSupervisor={isCampusSupervisor}
        />
      )}
    </>
  );

  const renderAdminDashboard = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="approvals">Approvals Queue</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
        {renderSupervisorDashboard()}
      </TabsContent>
      <TabsContent value="approvals" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Tactical Dashboard</CardTitle>
            <CardDescription>
              Submissions awaiting your approval. Click to view and take
              action.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Type</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : approvalQueue.length > 0 ? (
                  approvalQueue.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">
                        {submission.reportType}
                      </TableCell>
                      <TableCell>
                        {allUsers[submission.userId]?.firstName}{' '}
                        {allUsers[submission.userId]?.lastName}
                      </TableCell>
                      <TableCell>{submission.unitName}</TableCell>
                      <TableCell>
                        {format(new Date(submission.submissionDate), 'PP')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/submissions/${submission.id}`)
                          }
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      The approval queue is empty.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="analytics" className="space-y-4">
        <SubmissionAnalytics
          allSubmissions={submissions}
          allUnits={allUnits}
          isLoading={isLoading}
        />
      </TabsContent>
    </Tabs>
  );

  const renderDashboardContent = () => {
    if (isAdmin) return renderAdminDashboard();
    if (isSupervisor) return renderSupervisorDashboard();
    return renderUnitCoordinatorDashboard();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        {!isSupervisor && (
          <Button asChild>
            <Link href="/submissions/new">
              <FilePlus className="mr-2 h-4 w-4" />
              Submit EOMS Document
            </Link>
          </Button>
        )}
      </div>

      {announcement && !isLoading && (
        <Alert>
          <Megaphone className="h-4 w-4" />
          <AlertTitle>Campus Announcement</AlertTitle>
          <AlertDescription>{announcement}</AlertDescription>
        </Alert>
      )}

      {renderDashboardContent()}
    </div>
  );
}
