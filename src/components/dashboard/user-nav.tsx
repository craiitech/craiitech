
'use client';

import { LogOut, Bell, User as UserIcon, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User as AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { useUser } from '@/firebase';

interface UserNavProps {
    user: FirebaseAuthUser | null;
    userProfile: AppUser | null;
    notificationCount: number;
}

export function UserNav({ user, userProfile, notificationCount }: UserNavProps) {
  const router = useRouter();
  const { logSessionActivity } = useSessionActivity();
  const { userRole, isSupervisor } = useUser();
  
  const handleLogout = () => {
    if (user && userProfile && userRole) {
      logSessionActivity('User logged out from user nav', {
        action: 'user_logout',
        details: { method: 'manual' },
      });
    }
    router.push('/logout');
  };
  
  const handleNotificationClick = () => {
    if (isSupervisor) {
      router.push('/approvals');
    } else {
      router.push('/submissions');
    }
  }
  
  const canViewSettings = userRole === 'Admin' || userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  if (!user || !userProfile) {
    return null;
  }

  const { firstName, lastName, email, avatar } = userProfile;
  const fallback = `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`;

  return (
    <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full" onClick={handleNotificationClick}>
            <Bell className="h-5 w-5"/>
            {notificationCount > 0 && (
                <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notificationCount}
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                </span>
            )}
        </Button>
        <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
                <AvatarImage src={avatar} alt={`@${firstName}`} />
                <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{firstName} {lastName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                {email}
                </p>
            </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
            <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
            </DropdownMenuItem>
            {canViewSettings && (
              <DropdownMenuItem asChild>
                  <Link href="/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                  </Link>
              </DropdownMenuItem>
            )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
        </DropdownMenu>
    </div>
  );
}
