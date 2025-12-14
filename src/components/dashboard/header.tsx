
'use client';

import { usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { UserNav } from '@/components/dashboard/user-nav';
import { SidebarTrigger } from '@/components/ui/sidebar';

interface HeaderProps {
    notificationCount: number;
}


export function Header({ notificationCount }: HeaderProps) {
  const firebaseState = useFirebase();
  const pathname = usePathname();

  const { user, userProfile } = firebaseState;

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Home';
    const lastSegment = path.split('/').pop();
    if (!lastSegment) return '';
    // Handle UUIDs in path
    if (lastSegment.match(/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i)) {
      const segments = path.split('/');
      const parentSegment = segments[segments.length - 2];
      return parentSegment ? parentSegment.charAt(0).toUpperCase() + parentSegment.slice(1, -1) + ' Detail' : 'Detail';
    }
    // A simple way to capitalize the first letter
    return lastSegment ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) : '';
  }


  return (
    <header className="flex h-16 items-center justify-between border-b px-4 lg:px-8 bg-card">
        <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="font-semibold text-lg">{getPageTitle(pathname)}</h1>
        </div>
        <UserNav user={user} userProfile={userProfile} notificationCount={notificationCount} />
    </header>
  );
}
