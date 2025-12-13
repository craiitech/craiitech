
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
import { Input } from '@/components/ui/input';
import { UnitUserOverview } from '@/components/dashboard/unit-user-overview';
import { IncompleteCampusSubmissions } from '@/components/dashboard/incomplete-campus-submissions';
import { CompletedSubmissions } from '@/components/dashboard/completed-submissions';

export const submissionTypes = [
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

export default function HomePage() {
  const { user, userProfile, isAdmin, isUserLoading, userRole } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [isAnnouncementVisible, setIsAnnouncementVisible] = useState(true);
  const [isGlobalAnnouncementVisible, setIsGlobalAnnouncementVisible] = useState(true);

  const isCampusSupervisor =
    userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  
  const canViewAnnouncements = userProfile?.campusId;

  // Fetch submissions based on role
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    if (isAdmin) return collection(firestore, 'submissions');
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

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const submissions = useMemo(() => {
    if (!rawSubmissions) return null;
    return rawSubmissions.map(s => {
      const date = s.submissionDate;
      return {
        ...s,
        submissionDate: date instanceof Timestamp ? date.toDate() : new Date(date)
      }
    });
  }, [rawSubmissions]);

  // Fetch users based on role
  const usersQuery = useMemoFirebase(() => {
      if (!firestore) return null;
      if (isAdmin) return collection(firestore, 'users');
      if (isCampusSupervisor && userProfile?.campusId) {
          return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
      }
      return null; // Regular users don't need to fetch other users.
  }, [firestore, isAdmin, isCampusSupervisor, userProfile]);

  const { data: allUsersData, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);

  const allUsersMap = useMemo(() => {
    const userMap = new Map<string, AppUser>();
    if (allUsersData) {
        allUsersData.forEach(u => userMap.set(u.id, u));
    }
    // For regular users, add their own profile to the map
    if (userProfile && !isCampusSupervisor && !isAdmin) {
        userMap.set(userProfile.id, userProfile);
    }
    return userMap;
  }, [allUsersData, userProfile, isCampusSupervisor, isAdmin]);


  const allUnitsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'units');
  }, [firestore]);

  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(allUnitsQuery);

   const allCampusesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'campuses');
  }, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(allCampusesQuery);
  

  const campusSettingsDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId || !canViewAnnouncements)
      return null;
    return doc(firestore, 'campusSettings', userProfile.campusId);
  }, [firestore, userProfile?.campusId, canViewAnnouncements]);

  const { data: campusSetting, isLoading: isLoadingSettings } =
    useDoc(campusSettingsDocRef);

  const globalAnnouncementDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'campusSettings', 'global');
  }, [firestore]);
  
  const { data: globalSetting, isLoading: isLoadingGlobalSettings } = useDoc(globalAnnouncementDocRef);


  const announcement = campusSetting?.announcement;
  const globalAnnouncement = globalSetting?.announcement;
  
  useEffect(() => { setIsAnnouncementVisible(true); }, [announcement]);
  useEffect(() => { setIsGlobalAnnouncementVisible(true); }, [globalAnnouncement]);

  
  const unitsInCampus = useMemo(() => {
      if (!allUnits || !userProfile?.campusId) return [];
      return allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));
  }, [allUnits, userProfile]);


  const isLoading =
    isUserLoading ||
    isLoadingSubmissions ||
    (canViewAnnouncements && isLoadingSettings) ||
    isLoadingUnits ||
    isLoadingCampuses ||
    isLoadingGlobalSettings ||
    ((isAdmin || isCampusSupervisor) && isLoadingUsers);


  const stats = useMemo(() => {
    const defaultStats = {
      stat1: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat2: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat3: { title: 'Loading...', value: '...', icon: <Clock /> },
    };

    if (!submissions || !userProfile) return defaultStats;
    
    const userCount = allUsersMap.size;
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
      const totalRequired = unitsInCampus.length * TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT;
      const uniqueSubmissionsCount = new Set(currentYearSubmissions.map(s => s.reportType + s.unitId)).size;

      return {
        stat1: {
          title: 'Required Submissions',
          value: `${uniqueSubmissionsCount} of ${totalRequired}`,
          description: `Across ${unitsInCampus.length} units`,
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
  }, [submissions, isCampusSupervisor, isAdmin, allUsersMap, userProfile, unitsInCampus]);

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
  
  const sortedSubmissions = useMemo(() => {
    if (!submissions) return [];
    return [...submissions].sort((a,b) => {
        const dateA = a.submissionDate instanceof Date ? a.submissionDate.getTime() : 0;
        const dateB = b.submissionDate instanceof Date ? b.submissionDate.getTime() : 0;
        return dateB - dateA;
    });
  }, [submissions]);
  
  const campusMap = useMemo(() => {
    if (!allCampuses) return new Map<string, string>();
    return new Map(allCampuses.map(c => [c.id, c.name]));
  }, [allCampuses]);

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
                          getIconForStatus(submission.statusId)
                        ) : (
                          <XCircle className="h-6 w-6 text-muted-foreground" />
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

  const renderUnitCoordinatorHome = () => (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="actions">Submission Checklist</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
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
              <RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} />
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
      <TabsContent value="history">
        <Card>
          <CardHeader>
            <CardTitle>Submission History</CardTitle>
            <CardDescription>A log of all your past submissions and their status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={4}><Skeleton className="h-5 w-full"/></TableCell>
                    </TableRow>
                  ))
                ) : sortedSubmissions.length > 0 ? (
                  sortedSubmissions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="font-medium">{s.reportType}</div>
                        <div className="text-xs text-muted-foreground capitalize">{s.cycleId} Cycle {s.year}</div>
                      </TableCell>
                      <TableCell>{s.submissionDate instanceof Date ? format(s.submissionDate, 'PPp') : 'Invalid Date'}</TableCell>
                      <TableCell><Badge variant={statusVariant[s.statusId]}>{s.statusId}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => router.push(`/submissions/${s.id}`)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No submissions yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );

  const renderSupervisorHome = () => (
     <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="users">Users</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="space-y-4">
         {unitsInCampus.length === 0 && !isLoading && (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Campus Setup Required</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                    <span>Your campus does not have any units assigned. Please set up units to begin tracking submissions.</span>
                    <Button onClick={() => router.push('/settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        Setup Units
                    </Button>
                </AlertDescription>
            </Alert>
         )}
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
              <RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <CompletedSubmissions 
                allUnits={allUnits}
                allCampuses={allCampuses}
                allSubmissions={submissions}
                isLoading={isLoading}
                userProfile={userProfile}
                isCampusSupervisor={isCampusSupervisor}
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
        </div>
         <CampusUnitOverview 
            allUnits={allUnits}
            allSubmissions={submissions}
            isLoading={isLoading}
            userProfile={userProfile}
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
       <TabsContent value="users" className="space-y-4">
        <UnitUserOverview
          allUsers={Array.from(allUsersMap.values())}
          allUnits={allUnits}
          isLoading={isLoading}
          userProfile={userProfile}
        />
      </TabsContent>
    </Tabs>
  );

  const renderAdminHome = () => (
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
              <RecentActivity submissions={submissions} isLoading={isLoading} users={allUsersMap} userProfile={userProfile} />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <CompletedSubmissions 
                allUnits={allUnits}
                allCampuses={allCampuses}
                allSubmissions={submissions}
                isLoading={isLoading}
                userProfile={userProfile}
                isCampusSupervisor={isCampusSupervisor}
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
        </div>
         <IncompleteCampusSubmissions
            allSubmissions={submissions}
            allCampuses={allCampuses}
            allUnits={allUnits}
            isLoading={isLoading}
         />
      </TabsContent>
      <TabsContent value="approvals" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Approval Queue</CardTitle>
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
                  <TableHead>Campus</TableHead>
                  <TableHead>Submitted At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center h-24">
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
                        {allUsersMap.get(submission.userId)?.firstName}{' '}
                        {allUsersMap.get(submission.userId)?.lastName}
                      </TableCell>
                      <TableCell>{submission.unitName}</TableCell>
                      <TableCell>{campusMap.get(submission.campusId)}</TableCell>
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
                    <TableCell colSpan={6} className="text-center h-24">
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

  const renderHomeContent = () => {
    if (isLoading) {
         return (
             <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                    <Skeleton className="h-28"/>
                    <Skeleton className="h-28"/>
                    <Skeleton className="h-28"/>
                </div>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Skeleton className="col-span-4 h-80" />
                    <Skeleton className="col-span-3 h-80" />
                </div>
            </div>
         )
    }
    if (isAdmin) return renderAdminHome();
    if (isCampusSupervisor) return renderSupervisorHome();
    return renderUnitCoordinatorHome();
  };

  return (
    <div className="space-y-4">
       <div className="flex flex-col gap-4">
        <div className='flex justify-between items-start'>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Home</h2>
            <p className="text-muted-foreground">
              Welcome back, {userProfile?.firstName}! Here's your overview.
            </p>
          </div>
        </div>
         <div className='flex flex-col gap-2'>
            {globalAnnouncement && isGlobalAnnouncementVisible && !isLoading && (
                <Alert>
                    <Globe className="h-4 w-4" />
                    <AlertTitle>Global Announcement</AlertTitle>
                    <AlertDescription>{globalAnnouncement}</AlertDescription>
                    <AlertCloseButton onClick={() => setIsGlobalAnnouncementVisible(false)} />
                </Alert>
            )}
            {announcement && isAnnouncementVisible && !isLoading && (
                <Alert>
                    <Megaphone className="h-4 w-4" />
                    <AlertTitle>Campus Announcement</AlertTitle>
                    <AlertDescription>{announcement}</AlertDescription>
                    <AlertCloseButton onClick={() => setIsAnnouncementVisible(false)} />
                </Alert>
            )}
         </div>
      </div>


      {renderHomeContent()}
    </div>
  );
}
