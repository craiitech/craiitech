
'use client';

import { redirect, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import TeamSwitcher from '@/components/dashboard/team-switcher';
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
import { collection } from 'firebase/firestore';
import type { Role } from '@/lib/types';
import { useMemo } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, isUserLoading, isAdmin } = useUser();
  const pathname = usePathname();
  const firestore = useFirestore();

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore]
  );
  const { data: roles } = useCollection<Role>(rolesQuery);

  const userRole = useMemo(() => {
    if (!userProfile || !roles) return null;
    return roles.find((r) => r.id === userProfile.roleId)?.name;
  }, [userProfile, roles]);

  if (isUserLoading) {
    return (
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
  }

  if (!user) {
    return redirect('/login');
  }

  // If user is on one of these pages, let them stay to avoid redirect loops.
  if (pathname === '/complete-registration' || pathname === '/awaiting-verification') {
    return <>{children}</>;
  }
  
  // For non-admin users, enforce profile completion and verification.
  if (!isAdmin) {
    const isCampusLevelRole = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
    const isProfileIncomplete = !userProfile || !userProfile.campusId || !userProfile.roleId || (!isCampusLevelRole && !userProfile.unitId);

    if (isProfileIncomplete) {
       return redirect('/complete-registration');
    } else if (!userProfile.verified) {
      return redirect('/awaiting-verification');
    }
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
            <TeamSwitcher />
          </div>
          <UserNav user={user} />
        </header>
        <main className="p-4 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
