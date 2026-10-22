'use client';

import { NotificationInbox } from '@/components/dashboard/notification-inbox';
import {
  LogOut,
  Bell,
  User as UserIcon,
  Settings,
  Accessibility,
  Sun,
  Moon,
  Tv,
  ExternalLink,
  Building2,
  ChevronDown,
  Check,
} from 'lucide-react';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import type { User as AppUser } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { useUser } from '@/firebase';
import { useTheme } from '@/context/theme-provider';

interface UserNavProps {
  user: FirebaseAuthUser | null;
  userProfile: AppUser | null;
  notificationCount: number;
  totalNotificationsCount?: number;
  notificationsList?: any[];
}

export function UserNav({
  user,
  userProfile,
  notificationCount,
  totalNotificationsCount = 0,
  notificationsList = [],
}: UserNavProps) {
  const router = useRouter();
  const { logSessionActivity } = useSessionActivity();
  const { userRole, isSupervisor, isAdmin, isVp, assignments, activeAssignment, setActiveAssignmentId } = useUser();
  const { theme, toggleTheme } = useTheme();

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
  };

  const canViewSettings = userRole === 'Admin' || userRole === 'Campus Director';

  const roleLower = (userRole || userProfile?.role || '').toLowerCase();
  const unitLower = (userProfile?.unitName || '').toLowerCase();

  const isPresident = roleLower.includes('president') || unitLower.includes('president');
  const isVicePresident = isVp || roleLower.includes('vice president') || roleLower.includes('vp');
  const isCampusDirector =
    userRole === 'Campus Director' || roleLower.includes('campus director') || roleLower.includes('director');

  const canAccessExecutiveDisplay =
    isAdmin ||
    userRole === 'Admin' ||
    userRole === 'Super Admin' ||
    roleLower.includes('admin') ||
    isPresident ||
    isVicePresident ||
    isCampusDirector;

  if (!user || !userProfile) {
    return null;
  }

  const { firstName, lastName, email, avatar } = userProfile;
  const fallback = `${firstName?.charAt(0) ?? ''}${lastName?.charAt(0) ?? ''}`;

  return (
    <div className="flex items-center gap-2 sm:gap-4">
      <TooltipProvider>
        {/* Accessibility / PWD Shortcut */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-primary hover:bg-primary/5"
              asChild
            >
              <Link href="/profile#accessibility">
                <Accessibility className="h-5 w-5" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-[10px] font-bold uppercase">Accessibility Settings (PWD)</p>
          </TooltipContent>
        </Tooltip>

        {/* Notification Center / Inbox (Bell Icon Dropdown) */}
        <NotificationInbox initialNotifications={notificationsList} totalNotificationsCount={totalNotificationsCount} />
      </TooltipProvider>

      {assignments.length > 1 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 border-primary/20 bg-primary/5 px-2 sm:px-3">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              <span className="max-w-[90px] truncate text-[10px] font-bold sm:max-w-[150px] sm:text-xs">
                {activeAssignment?.unitName || userProfile.unitName || 'Primary Office'}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
              Active University Designation
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {assignments.map((assignment) => (
              <DropdownMenuItem
                key={assignment.id}
                onClick={() => setActiveAssignmentId(assignment.id)}
                className="flex cursor-pointer flex-col items-start gap-0.5"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-bold">{assignment.unitName || 'Unnamed Office'}</span>
                  {assignment.id === activeAssignment?.id && <Check className="h-3.5 w-3.5 text-primary" />}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {assignment.role}
                  {assignment.campusName ? ` • ${assignment.campusName}` : ''}
                  {assignment.isPrimary ? ' • Primary' : ''}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full user-nav-avatar">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatar} alt={`@${firstName}`} />
              <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {firstName} {lastName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">{email}</p>
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
            {canAccessExecutiveDisplay && (
              <DropdownMenuItem asChild>
                <a
                  href="/executive-display"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                >
                  <Tv className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Executive Display</span>
                  <ExternalLink className="ml-auto h-3 w-3 opacity-60" />
                </a>
              </DropdownMenuItem>
            )}
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
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </DropdownMenuItem>
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
