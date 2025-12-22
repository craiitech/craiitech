
'use client';

import { redirect, usePathname } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useEffect, useMemo } from 'react';
import type { Campus, Unit, Submission } from '@/lib/types';
import { collection, query, where, Query } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';
import { ActivityLogProvider } from '@/lib/activity-log-provider';
import { Header } from '@/components/dashboard/header';
import { Chatbot } from '@/components/dashboard/chatbot';

const LoadingSkeleton = () => (
  <div className="flex items-start">
    <div className="w-64 border-r h-screen p-4 flex-col gap-4 hidden md:flex">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    </div>
    <main className="flex-1 p-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-80" />
          <Skeleton className="col-span-3 h-80" />
        </div>
      </div>
    </main>
  </div>
);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const firebaseState = useFirebase();
  const pathname = usePathname();
  const { user, userProfile, isUserLoading, isAdmin, userRole, firestore, isSupervisor } = useUser();

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // This logic is now outside the hook, ensuring hook calls are stable.
  const getNotificationQuery = (): Query | null => {
    if (!firestore || !userProfile || !userRole) return null;
    const submissionsCollection = collection(firestore, 'submissions');

    if (isSupervisor) {
      if (userRole === 'Admin') return query(submissionsCollection, where('statusId', '==', 'submitted'));
      if (userRole === 'Campus Director' || userRole === 'Campus ODIMO') {
        if (!userProfile.campusId) return null;
        return query(submissionsCollection, where('campusId', '==', userProfile.campusId), where('statusId', '==', 'submitted'));
      }
      if (userRole === 'Unit ODIMO') {
        if (!userProfile.unitId) return null;
        return query(submissionsCollection, where('unitId', '==', userProfile.unitId), where('statusId', '==', 'submitted'));
      }
    }

    // Employees get notifications for rejected submissions
    return query(submissionsCollection, where('userId', '==', userProfile.id), where('statusId', '==', 'rejected'));
  }

  // The hook now receives a stable value or null.
  const notificationQuery = useMemoFirebase(() => getNotificationQuery(), [firestore, userProfile, userRole, isSupervisor]);

  const { data: notifications } = useCollection<Submission>(notificationQuery);

  const notificationCount = useMemo(() => {
    if (!notifications || !userProfile) return 0;
    if (isSupervisor) return notifications.filter(s => s.userId !== userProfile.id).length;
    return notifications.length;
  }, [notifications, isSupervisor, userProfile]);

  const userLocation = useMemo(() => {
    if (!userProfile || !campuses || !units) return '';
    const campusName = campuses.find(c => c.id === userProfile.campusId)?.name;
    const unitName = units.find(u => u.id === userProfile.unitId)?.name;
    let location = campusName || '';
    if (unitName && !isSupervisor) location += ` / ${unitName}`;
    return location;
  }, [userProfile, campuses, units, isSupervisor]);

  useEffect(() => {
    if (isUserLoading) return;
    if (!user) return redirect('/login');
    if (isAdmin) return;
    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') return;

    if (userProfile) {
      const isVP = userRole?.toLowerCase().includes('vice president');
      const isCampusLevelUser = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
      let incomplete = false;

      if (isVP || isCampusLevelUser) incomplete = !userProfile.campusId || !userProfile.roleId;
      else incomplete = !userProfile.campusId || !userProfile.roleId || !userProfile.unitId;

      if (incomplete) return redirect('/complete-registration');
      if (!userProfile.verified) return redirect('/awaiting-verification');
    }
  }, [user, userProfile, isUserLoading, pathname, isAdmin, userRole]);

  if (!firebaseState.areServicesAvailable || isUserLoading) return <LoadingSkeleton />;

  if (!user || (!userProfile && !isAdmin && pathname !== '/complete-registration' && pathname !== '/awaiting-verification')) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Skeleton className="h-16 w-16" />
      </div>
    );
  }

  return (
    <ActivityLogProvider>
      <SidebarProvider>
        <Sidebar variant="sidebar" collapsible="icon">
          <SidebarHeader className="items-center justify-center text-center p-4">
            {userProfile?.avatar && (
              <Avatar className="h-20 w-20">
                <AvatarImage src={userProfile.avatar} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                <AvatarFallback>
                  {userProfile.firstName?.charAt(0)}
                  {userProfile.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="mt-2 text-center">
              <p className="font-semibold text-lg">{userProfile?.firstName} {userProfile?.lastName}</p>
              <p className="text-sm text-sidebar-primary font-medium">{userRole}</p>
              {userLocation && (
                <div className="flex items-center justify-center gap-1 text-sm text-sidebar-foreground/80 mt-1">
                  <Building2 className="h-4 w-4" />
                  <span>{userLocation}</span>
                </div>
              )}
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarNav />
          </SidebarContent>
        </Sidebar>
        <SidebarInset>
          <Header notificationCount={notificationCount} />
          <main className="p-4 lg:p-8 bg-background/90">{children}</main>
          <Chatbot />
        </SidebarInset>
      </SidebarProvider>
    </ActivityLogProvider>
  );
}
