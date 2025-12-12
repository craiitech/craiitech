
'use client';

import { redirect, usePathname } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo } from 'react';
import type { Campus, Unit } from '@/lib/types';
import { collection } from 'firebase/firestore';

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

  // If services aren't available yet, show a loading skeleton and stop rendering further.
  // This is the main gate to prevent premature data fetches.
  if (!firebaseState.areServicesAvailable) {
    return <LoadingSkeleton />;
  }

  // Destructure the rest of the state only after we know services are available.
  const { user, userProfile, isUserLoading, isAdmin, userRole, firestore } = firebaseState;
  
  const isStillLoading = isUserLoading;

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const userLocation = useMemo(() => {
    if (!userProfile || !campuses || !units) return '';
    const campusName = campuses.find(c => c.id === userProfile.campusId)?.name;
    const unitName = units.find(u => u.id === userProfile.unitId)?.name;
    let locationString = '';
    if (campusName) {
        locationString += ` / ${campusName}`;
    }
    if (unitName) {
        locationString += ` / ${unitName}`;
    }
    return locationString;
  }, [userProfile, campuses, units]);

  useEffect(() => {
    if (isStillLoading) return; // Don't do anything while loading

    if (!user) {
      redirect('/login');
      return;
    }

    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') {
      return; // Allow users to be on these pages
    }

    if (userProfile && !isAdmin) {
      let isProfileIncomplete = !userProfile.campusId || !userProfile.roleId;

      const campusLevelRoles = ['Campus Director', 'Campus ODIMO'];
      const isCampusLevelUser = userRole ? campusLevelRoles.includes(userRole) : false;

      // Unit ID is not required for campus level users
      if (!isCampusLevelUser) {
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
  }, [user, userProfile, isStillLoading, pathname, userRole, isAdmin]);


  if (isStillLoading) {
    return <LoadingSkeleton />;
  }

  // If we have a user but they are about to be redirected, show a minimal layout
  if (!user || (user && !userProfile && !isAdmin && pathname !== '/complete-registration')) {
     return <div className="flex h-screen w-screen items-center justify-center"><Skeleton className="h-16 w-16" /></div>;
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader>
          <Button variant="ghost" className="h-8 w-full justify-start gap-2 px-2">
            <Logo className="size-5" />
            <span className="text-lg font-semibold">RSU EOMS</span>
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b px-4 lg:px-8">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <div className="hidden md:block font-semibold text-sm">
              {userRole ? `${userRole} Dashboard` : 'Dashboard'}
              {!isAdmin && userLocation && <span className="text-muted-foreground">{userLocation}</span>}
            </div>
          </div>
          <UserNav user={user} />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
