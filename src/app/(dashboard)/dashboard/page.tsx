
'use client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Overview } from '@/components/dashboard/overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import {
  FileText,
  CheckCircle,
  Clock,
  Users,
  Megaphone,
} from 'lucide-react';
import {
  useUser,
  useFirestore,
  useCollection,
  useMemoFirebase,
  useDoc,
} from '@/firebase';
import { collection, query, where, collectionGroup } from 'firebase/firestore';
import type { Submission } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type AggregatedSubmission = Submission & { originalPath: string };

export default function DashboardPage() {
  const { user, userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();

  const isSupervisor =
    userProfile?.role === 'Admin' ||
    userProfile?.role === 'Campus Director' ||
    userProfile?.role === 'Campus ODIMO' ||
    userProfile?.role === 'Unit ODIMO';

  // Memoize the query based on the user's role
  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;

    if (isSupervisor) {
      const baseQuery = collectionGroup(firestore, 'submissions');
      if (isAdmin) {
        return baseQuery; // Admin gets all submissions
      }
      if (
        userProfile.role === 'Campus Director' ||
        userProfile.role === 'Campus ODIMO'
      ) {
        return query(baseQuery, where('campusId', '==', userProfile.campusId));
      }
      if (userProfile.role === 'Unit ODIMO') {
        return query(baseQuery, where('unitId', '==', userProfile.unitId));
      }
    }
    // Default to regular user's own submissions
    return collection(firestore, 'users', userProfile.id, 'submissions');
  }, [firestore, userProfile, isSupervisor, isAdmin]);

  const { data: submissions, isLoading: isLoadingSubmissions } =
    useCollection<AggregatedSubmission>(submissionsQuery);

  const campusSettingsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId) return null;
    return query(
      collection(firestore, 'campusSettings'),
      where('id', '==', userProfile.campusId)
    );
  }, [firestore, userProfile?.campusId]);

  const { data: campusSettings, isLoading: isLoadingSettings } =
    useCollection(campusSettingsQuery);

  const announcement = campusSettings?.[0]?.announcement;
  
  const isLoading = isUserLoading || isLoadingSubmissions || isLoadingSettings;

  const stats = useMemo(() => {
    if (!submissions) {
      return {
        stat1: { title: 'Loading...', value: '...', icon: <Clock /> },
        stat2: { title: 'Loading...', value: '...', icon: <Clock /> },
        stat3: { title: 'Loading...', value: '...', icon: <Clock /> },
      };
    }

    if (isSupervisor) {
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
          title: 'Approved Submissions',
          value: submissions.filter((s) => s.statusId === 'approved').length,
          icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
        },
      };
    } else {
      // Regular user stats
      return {
        stat1: {
          title: 'Total Submissions',
          value: submissions.length,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Approved Submissions',
          value: submissions.filter((s) => s.statusId === 'approved').length,
          icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
        },
        stat3: {
          title: 'Pending/Rejected',
          value: submissions.filter((s) =>
            ['submitted', 'rejected'].includes(s.statusId)
          ).length,
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
        },
      };
    }
  }, [submissions, isSupervisor]);

  const renderCard = (
    title: string,
    value: string | number,
    icon: React.ReactNode,
    isLoading: boolean
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
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      {announcement && !isLoading && (
        <Alert>
          <Megaphone className="h-4 w-4" />
          <AlertTitle>Campus Announcement</AlertTitle>
          <AlertDescription>{announcement}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {renderCard(stats.stat1.title, stats.stat1.value, stats.stat1.icon, isLoading)}
        {renderCard(stats.stat2.title, stats.stat2.value, stats.stat2.icon, isLoading)}
        {renderCard(stats.stat3.title, stats.stat3.value, stats.stat3.icon, isLoading)}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Submissions Overview</CardTitle>
             <CardDescription>
              {isSupervisor ? 'Monthly submissions from your scope.' : 'Your monthly submission trend.'}
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
              {isSupervisor ? 'The latest submissions from your scope.' : 'Your last 5 submissions.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecentActivity submissions={submissions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
