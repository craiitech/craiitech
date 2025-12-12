
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
import type { Submission, User as AppUser, Unit, Campus } from '@/lib/types';
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
import { Input } from '@/components/ui/input';

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

  const userRoleName = userRole;

  const isCampusSupervisor =
    userRoleName === 'Campus Director' || userRoleName === 'Campus ODIMO';
  
  const canViewAnnouncements = userProfile?.campusId;

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
    
    return query(
      collection(firestore, 'submissions'),
      where('userId', '==', userProfile.id)
    );
  }, [firestore, userProfile, isAdmin, isCampusSupervisor]);

  const { data: submissions, isLoading: isLoadingSubmissions } =
    useCollection<Submission>(submissionsQuery);

  const allUnitsQuery = useMemoFirebase(() => {
    if (!firestore || (!isAdmin && !isCampusSupervisor)) return null;
    return collection(firestore, 'units');
  }, [firestore, isAdmin, isCampusSupervisor]);

  const { data: allUnits, isLoading: isLoadingUnits } =
    useCollection<Unit>(allUnitsQuery);

   const allCampusesQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return collection(firestore, 'campuses');
  }, [firestore, isAdmin]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(allCampusesQuery);


  useEffect(() => {
    if (!firestore) return;
    
    if (!isAdmin && !isCampusSupervisor && !userProfile) {
        return;
    }

    const fetchUsers = async () => {
        let usersQuery;
        if (isAdmin) {
            usersQuery = collection(firestore, 'users');
        } else if (isCampusSupervisor && userProfile?.campusId) {
            usersQuery = query(
                collection(firestore, 'users'),
                where('campusId', '==', userProfile.campusId)
            );
        }

        if (usersQuery) {
            const snapshot = await getDocs(usersQuery);
            setUserCount(snapshot.size);
            const usersData: Record<string, AppUser> = {};
            snapshot.forEach((doc) => {
                usersData[doc.id] = { id: doc.id, ...doc.data() } as AppUser;
            });
            setAllUsers(usersData);
        } else if (userProfile) { // Case for a regular user
             setAllUsers({ [userProfile.id]: userProfile });
             setUserCount(1);
        } else {
             setUserCount(0);
             setAllUsers({});
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
    ((isAdmin || isCampusSupervisor) && (isLoadingUnits || isLoadingCampuses));


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
          icon: <Clock className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Total Submissions',
          value: submissions.length,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat3: {
          title: 'Total Users',
          value: userCount,
          icon: <Users className="h-6 w-6 text-primary" />,
        },
      };
    } else if (isCampusSupervisor) {
      const unitsInCampus = allUnits
        ? allUnits.filter((u) => u.campusId === userProfile.campusId).length
        : 0;
      const totalRequired = unitsInCampus * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;
      const uniqueSubmissionsCount = new Set(currentYearSubmissions.map(s => s.reportType + s.unitId)).size;


      return {
        stat1: {
          title: 'Required Submissions',
          value: `${uniqueSubmissionsCount} of ${totalRequired}`,
          description: `Across ${unitsInCampus} units`,
          icon: <FileText className="h-6 w-6 text-primary" />,
        },
        stat2: {
          title: 'Campus Submissions',
          value: currentYearSubmissions.length,
          description: `Total for your campus this year`,
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
              title: 'First Cycle',
              value: `${firstCycleCount} of ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`,
              description: `Submissions for ${new Date().getFullYear()}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat2: {
              title: 'Final Cycle',
              value: `${finalCycleCount} of ${TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}`,
              description: `Submissions for ${new Date().getFullYear()}`,
              icon: <FileText className="h-6 w-6 text-primary" />,
            },
            stat3: {
              title: 'Total Approved',
              value: submissions.filter((s) => s.statusId === 'approved').length,
              description: 'All your approved submissions',
              icon: <CheckCircle className="h-6 w-6 text-primary" />,
            },
        };
    }
  }, [submissions, isCampusSupervisor, isAdmin, userCount, userProfile, allUnits]);

  const { firstCycleStatusMap, finalCycleStatusMap } = useMemo(() => {
    const emptyResult = {
        firstCycleStatusMap: new Map<string, Submission>(),
        finalCycleStatusMap: new Map<string, Submission>(),
    };
    if (!submissions) {
      return emptyResult;
    }
    const currentYearSubmissions = submissions.filter(
      (s) => s.year === new Date().getFullYear()
    );

    const firstCycleMap = new Map(
      currentYearSubmissions
        .filter(s => s.cycleId === 'first')
        .map((s) => [s.reportType, s])
    );
     const finalCycleMap = new Map(
      currentYearSubmissions
        .filter(s => s.cycleId === 'final')
        .map((s) => [s.reportType, s])
    );

    return {
      firstCycleStatusMap: firstCycleMap,
      finalCycleStatusMap: finalCycleMap,
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
      <CardHeader className="pb-2">
        <div className='flex justify-between items-start'>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </div>
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
  
  const renderSubmissionChecklist = (cycle: 'first' | 'final', statusMap: Map<string, Submission>) => {
    const cycleSubmissions = Array.from(statusMap.values());
    const uniqueSubmissions = new Set(cycleSubmissions.map((s) => s.reportType));
    const progress = (uniqueSubmissions.size / submissionTypes.length) * 100;
    
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
                return (
                  <div key={reportType} className="flex items-center justify-between rounded-md border p-4">
                      <div className="flex items-center gap-3">
                         {isSubmitted ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-destructive" />
                        )}
                        <span className="font-medium">{reportType}</span>
                      </div>
                      {isSubmitted ? (
                         <Badge
                            variant={statusVariant[submission.statusId]}
                            className="capitalize"
                        >
                            {submission.statusId}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not Submitted</Badge>
                      )}
                  </div>
                );
              })}
            </div>
        </div>
    );
  }

  const renderUnitCoordinatorDashboard = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="actions">Submission Actions</TabsTrigger>
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
            <CardTitle>Submission Status</CardTitle>
            <CardDescription>
              Checklist for all required submissions for{' '}
              {new Date().getFullYear()}.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Tabs defaultValue="first-cycle" className="space-y-4">
                 <TabsList>
                    <TabsTrigger value="first-cycle">First Cycle</TabsTrigger>
                    <TabsTrigger value="final-cycle">Final Cycle</TabsTrigger>
                </TabsList>
                <TabsContent value="first-cycle">
                    {renderSubmissionChecklist('first', firstCycleStatusMap)}
                </TabsContent>
                <TabsContent value="final-cycle">
                    {renderSubmissionChecklist('final', finalCycleStatusMap)}
                </TabsContent>
              </Tabs>
             <Button asChild className="w-full mt-6">
                <Link href="/submissions/new">
                    <Pencil className="mr-2 h-4 w-4" />
                    Manage Submissions
                </Link>
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderSupervisorDashboard = () => (
     <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                Monthly submissions from your campus.
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
                The latest submissions from your campus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity submissions={submissions} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
         <CampusUnitOverview 
            allUnits={allUnits}
            allSubmissions={submissions}
            isLoading={isLoading}
            userProfile={userProfile}
         />
        <UnitsWithoutSubmissions
          allUnits={allUnits}
          allCampuses={allCampuses}
          allSubmissions={submissions}
          isLoading={isLoading}
          userProfile={userProfile}
          isAdmin={isAdmin}
          isCampusSupervisor={isCampusSupervisor}
        />
      </TabsContent>
       <TabsContent value="analytics" className="space-y-4">
        <SubmissionAnalytics
          allSubmissions={submissions}
          allUnits={allUnits}
          isLoading={isLoading}
          isAdmin={isAdmin}
          userProfile={userProfile}
        />
      </TabsContent>
    </Tabs>
  );

  const renderAdminDashboard = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="approvals">Approvals Queue</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                Monthly submissions from all users.
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
                The latest submissions from all users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RecentActivity submissions={submissions} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>
         <UnitsWithoutSubmissions
          allUnits={allUnits}
          allCampuses={allCampuses}
          allSubmissions={submissions}
          isLoading={isLoading}
          userProfile={userProfile}
          isAdmin={isAdmin}
          isCampusSupervisor={isCampusSupervisor}
        />
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
                        {submission.submissionDate instanceof Date ? format(submission.submissionDate, 'PP') : 'Invalid Date'}
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
          isAdmin={isAdmin}
          userProfile={userProfile}
        />
      </TabsContent>
    </Tabs>
  );

  const renderDashboardContent = () => {
    if (isAdmin) return renderAdminDashboard();
    if (isCampusSupervisor) return renderSupervisorDashboard();
    return renderUnitCoordinatorDashboard();
  };

  return (
    <div className="space-y-4">
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
