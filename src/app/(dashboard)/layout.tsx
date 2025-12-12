
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
  SidebarFooter
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Button } from '@/components/ui/button';
import { useEffect, useMemo } from 'react';
import type { Campus, Unit } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';

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
    let locationString = campusName || '';
    if (unitName && userRole !== 'Campus Director' && userRole !== 'Campus ODIMO') {
        locationString += ` / ${unitName}`;
    }
    return locationString;
  }, [userProfile, campuses, units, userRole]);

  useEffect(() => {
    if (isStillLoading) return;

    if (!user) {
      redirect('/login');
      return;
    }

    if (pathname === '/complete-registration' || pathname === '/awaiting-verification') {
      return;
    }

    if (userProfile && !isAdmin) {
      const campusLevelRoles = ['Campus Director', 'Campus ODIMO'];
      const isCampusLevelUser = userRole ? campusLevelRoles.some(r => userRole.toLowerCase() === r.toLowerCase()) : false;

      const isProfileIncomplete = !userProfile.campusId || !userProfile.roleId || (!isCampusLevelUser && !userProfile.unitId);

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

  if (!user || (user && !userProfile && !isAdmin && pathname !== '/complete-registration')) {
     return <div className="flex h-screen w-screen items-center justify-center"><Skeleton className="h-16 w-16" /></div>;
  }

  return (
    <SidebarProvider>
      <Sidebar variant="sidebar" collapsible="icon">
        <SidebarHeader className="items-center justify-center text-center p-4">
           <Avatar className="h-20 w-20">
              <AvatarImage src={userProfile?.avatar} alt={userProfile?.firstName} />
              <AvatarFallback className="text-2xl">
                {userProfile?.firstName?.charAt(0)}
                {userProfile?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="mt-2 text-center">
                <p className="font-semibold text-lg">{userProfile?.firstName} {userProfile?.lastName}</p>
                 <p className="text-xs text-sidebar-primary font-medium">{userRole}</p>
                 {userLocation && (
                    <div className="flex items-center justify-center gap-1 text-xs text-sidebar-foreground/70 mt-1">
                        <Building2 className="h-3 w-3"/>
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
        <header className="flex h-16 items-center justify-between border-b px-4 lg:px-8 bg-card">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-semibold text-lg capitalize">{pathname.split('/').pop()}</h1>
          </div>
          <UserNav user={user} />
        </header>
        <main className="p-4 lg:p-8 bg-background/90">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
