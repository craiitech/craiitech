'use client';

import { redirect, usePathname } from 'next/navigation';
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
  const { user, userProfile, isUserLoading } = useUser();
  const pathname = usePathname();
  
  const isLoading = isUserLoading;

  if (isLoading) {
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

  // If user is loaded and there's a profile
  if (userProfile) {
     // If user profile is not complete, redirect to campus registration
    if (!userProfile.campusId || !userProfile.unitId || !userProfile.roleId) {
        if (pathname !== '/register/campus') {
             redirect('/register/campus');
        }
        // If they are on the campus page, let them be
    } else if (!userProfile.verified) {
        // If profile is complete but not verified, send to awaiting verification
        if (pathname !== '/awaiting-verification') {
            redirect('/awaiting-verification');
        }
    }
  } else if(user && !isUserLoading) {
      // This case can happen briefly if the user is authenticated but the firestore doc is still loading
      // Or if the user doc doesn't exist for some reason after registration.
      // A redirect to /register/campus is a safe bet.
       if (pathname !== '/register/campus' && pathname !== '/awaiting-verification') {
         redirect('/register/campus');
       }
  }

  return (
    <div className="flex flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4 md:px-8">
          <Logo className="h-6 w-6 mr-4" />
          <TeamSwitcher />
          <MainNav className="mx-6" />
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
