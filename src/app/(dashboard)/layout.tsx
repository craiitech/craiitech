
'use client';

import { redirect, usePathname } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { UserNav } from '@/components/dashboard/user-nav';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { useEffect, useMemo } from 'react';
import type { Campus, Unit, Submission } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
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


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const firebaseState = useFirebase();
  const pathname = usePathname();


  if (!firebaseState.areServicesAvailable) {
    return <LoadingSkeleton />;
  }

  const { user, userProfile, isUserLoading, isAdmin, userRole, firestore, isSupervisor } = firebaseState;
  
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  // Fetch relevant submissions for notifications
   const notificationQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !userRole) return null;

    const submissionsCollection = collection(firestore, 'submissions');
    
    // Supervisors get notifications for pending approvals
    if (userRole === 'Admin') {
      return query(submissionsCollection, where('statusId', '==', 'submitted'));
    }
    if (isSupervisor && userRole !== 'Admin') {
      if (!userProfile.campusId) return null; // Wait for campusId
      return query(submissionsCollection, where('campusId', '==', userProfile.campusId), where('statusId', '==', 'submitted'));
    }
    // Employees get notifications for rejected submissions
    return query(submissionsCollection, where('userId', '==', userProfile.id), where('statusId', '==', 'rejected'));
  }, [firestore, userProfile, userRole, isSupervisor]);

  const { data: notifications, isLoading: isLoadingNotifications } = useCollection<Submission>(notificationQuery);

  const notificationCount = useMemo(() => {
      if (!notifications) return 0;
      if (isSupervisor) {
          // Filter out submissions made by the approver themselves
          return notifications.filter(s => s.userId !== userProfile?.id).length;
      }
      return notifications.length;
  }, [notifications, isSupervisor, userProfile]);



  const userLocation = useMemo(() => {
    if (!userProfile || !campuses || !units) return '';
    const campusName = campuses?.find(c => c.id === userProfile.campusId)?.name;
    const unitName = units?.find(u => u.id === userProfile.unitId)?.name;
    let locationString = campusName || '';
    if (unitName && !isSupervisor) {
        locationString += ` / ${unitName}`;
    }
    return locationString;
  }, [userProfile, campuses, units, isSupervisor]);

  useEffect(() => {
    // Wait until the initial loading is complete
    if (isUserLoading) {
      return;
    }

    // If loading is finished and there is no user, redirect to login
    if (!user) {
      redirect('/login');
      return;
    }
    
    // If the user is an admin, do not perform any other checks.
    // An admin account is always considered complete.
    if (isAdmin) {
      return;
    }

    // The user is logged in, now check for profile completeness.
    // Don't run these checks on special pages.
    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') {
      return;
    }
    
    if (userProfile) {
      let isProfileIncomplete = !userProfile.campusId || !userProfile.roleId;

      // Only require unitId if the user is not a supervisor role
      if (!isSupervisor) {
        isProfileIncomplete = isProfileIncomplete || !userProfile.unitId;
      }

      if (isProfileIncomplete) {
        redirect('/complete-registration');
        return;
      }
      
      if (!userProfile.verified) {
        redirect('/awaiting-verification');
        return;
      }
    }
  }, [user, userProfile, isUserLoading, pathname, isAdmin, isSupervisor]);


  if (isUserLoading) {
    return <LoadingSkeleton />;
  }

  if (!user || (user && !userProfile && !isAdmin && pathname !== '/complete-registration' && pathname !== '/awaiting-verification')) {
     return <div className="flex h-screen w-screen items-center justify-center"><Skeleton className="h-16 w-16" /></div>;
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
                          <Building2 className="h-4 w-4"/>
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
