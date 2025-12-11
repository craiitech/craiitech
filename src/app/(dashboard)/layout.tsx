import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import TeamSwitcher from '@/components/dashboard/team-switcher';
import { MainNav } from '@/components/dashboard/main-nav';
import { UserNav } from '@/components/dashboard/user-nav';
import { Logo } from '@/components/logo';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

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
