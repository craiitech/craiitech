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
import { collection, query, where, doc, getDocs, collectionGroup } from 'firebase/firestore';
import type { Submission, User as AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DashboardPage() {
  const { user, userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();

  const [userCount, setUserCount] = useState(0);

  // Determine user role and scope from the denormalized role name in userProfile
  const userRoleName = isAdmin ? 'Admin' : userProfile?.role;
  
  const isCampusSupervisor =
    userRoleName === 'Campus Director' ||
    userRoleName === 'Campus ODIMO';
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
    return query(collection(firestore, 'submissions'), where('userId', '==', userProfile.id));
  }, [firestore, userProfile, isAdmin, isCampusSupervisor, isUnitSupervisor]);

  const { data: submissions, isLoading: isLoadingSubmissions } =
    useCollection<Submission>(submissionsQuery);

  // Fetch user count for admins and campus supervisors
  useEffect(() => {
    if (!firestore || (!isAdmin && !isCampusSupervisor) || (isCampusSupervisor && !userProfile)) {
        setUserCount(0);
        return;
    };

    const fetchUserCount = async () => {
        let countQuery;
        if (isAdmin) {
            // Firestore does not have a native count of all documents in a collection on the client-side.
            // A full read is expensive. For this purpose, we'll use getDocs and get the size.
            // For very large collections, a cloud function to maintain a counter would be better.
            countQuery = collection(firestore, 'users');
        } else if (isCampusSupervisor && userProfile?.campusId) {
            countQuery = query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
        }
        
        if (countQuery) {
            const snapshot = await getDocs(countQuery);
            setUserCount(snapshot.size);
        }
    };
    
    fetchUserCount();

  }, [firestore, isAdmin, isCampusSupervisor, userProfile]);

  const campusSettingsDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.campusId || !canViewAnnouncements) return null;
    return doc(firestore, 'campusSettings', userProfile.campusId);
  }, [firestore, userProfile?.campusId, canViewAnnouncements]);

  const { data: campusSetting, isLoading: isLoadingSettings } =
    useDoc(campusSettingsDocRef);

  const announcement = campusSetting?.announcement;

  const isLoading = isUserLoading || isLoadingSubmissions || (canViewAnnouncements && isLoadingSettings);

  const stats = useMemo(() => {
    const defaultStats = {
      stat1: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat2: { title: 'Loading...', value: '...', icon: <Clock /> },
      stat3: { title: 'Loading...', value: '...', icon: <Clock /> },
    };

    if (!submissions) return defaultStats;

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
      return {
        stat1: {
          title: 'Campus Pending',
          value: submissions.filter((s) => s.statusId === 'submitted').length,
          icon: <Clock className="h-4 w-4 text-muted-foreground" />,
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
                value: submissions.filter(s => s.statusId === 'submitted').length,
                icon: <Clock className="h-4 w-4 text-muted-foreground" />
            },
             stat2: {
                title: 'Unit Submissions',
                value: submissions.length,
                icon: <FileText className="h-4 w-4 text-muted-foreground" />
            },
             stat3: {
                title: 'Approved',
                value: submissions.filter(s => s.statusId === 'approved').length,
                icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />
            }
        }
    } else {
      // Regular user stats
      return {
        stat1: {
          title: 'My Submissions',
          value: submissions.length,
          icon: <FileText className="h-4 w-4 text-muted-foreground" />,
        },
        stat2: {
          title: 'Approved',
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
  }, [submissions, isSupervisor, isAdmin, isCampusSupervisor, isUnitSupervisor, userCount]);

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
