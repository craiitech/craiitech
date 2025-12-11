'use client';

import { redirect } from 'next/navigation';
import { useUser } from '@/firebase';
import TeamSwitcher from '@/components/dashboard/team-switcher';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
       <div className="flex flex-col">
        <div className="border-b">
          <div className="flex h-16 items-center px-4 md:px-8">
            <Logo className="h-6 w-6 mr-4" />
            <Skeleton className="h-8 w-[200px]" />
            <div className="mx-6 flex items-center space-x-4 lg:space-x-6">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-4">
                <Skeleton className="h-40 w-full" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                    <Skeleton className="col-span-4 h-80" />
                    <Skeleton className="col-span-3 h-80" />
                </div>
            </div>
        </div>
      </div>
    )
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="flex flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-8">
          <Logo className="h-6 w-6 mr-4" />
          <TeamSwitcher />
          <MainNav className="mx-6" user={user}/>
          <div className="ml-auto flex items-center space-x-4">
            <UserNav user={user}/>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        {children}
      </div>
    </div>
  );
}
