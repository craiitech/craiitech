
'use client';

import { LogOut, Bell, User as UserIcon, Settings, Accessibility, Sun, Moon } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  notificationsList = [] 
}: UserNavProps) {
  const router = useRouter();
  const { logSessionActivity } = useSessionActivity();
  const { userRole, isSupervisor } = useUser();
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
  }
  
  const canViewSettings = userRole === 'Admin' || userRole === 'Campus Director';

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
                            <Accessibility className="h-5 w-5"/>
                        </Link>
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="text-[10px] font-bold uppercase">Accessibility Settings (PWD)</p>
                </TooltipContent>
            </Tooltip>

            {/* Notification Bell Dropdown */}
            <DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="relative h-9 w-9 rounded-full text-primary hover:bg-primary/5 focus-visible:ring-0 focus-visible:ring-offset-0"
                            >
                                <Bell className="h-5 w-5"/>
                                {totalNotificationsCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] font-bold text-white items-center justify-center">
                                            {totalNotificationsCount}
                                        </span>
                                    </span>
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-[10px] font-bold uppercase">Notifications ({totalNotificationsCount})</p>
                    </TooltipContent>
                </Tooltip>
                
                <DropdownMenuContent className="w-80 p-0 rounded-2xl border border-primary/10 shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md" align="end" forceMount>
                    <div className="bg-primary/5 p-4 border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-primary">Notifications Hub</span>
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-red-500 text-white rounded-full">
                                {totalNotificationsCount} Updates
                            </span>
                        </div>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Movement across your quality areas</p>
                    </div>

                    <div className="divide-y divide-primary/5 max-h-[350px] overflow-y-auto">
                        {notificationsList.map((item) => {
                            // Map icon / color per module
                            let iconColor = 'text-primary';
                            let iconBg = 'bg-primary/5';
                            if (item.module === 'submissions') { iconColor = 'text-teal-600'; iconBg = 'bg-teal-50'; }
                            else if (item.module === 'car') { iconColor = 'text-rose-600'; iconBg = 'bg-rose-50'; }
                            else if (item.module === 'risk') { iconColor = 'text-amber-600'; iconBg = 'bg-amber-50'; }
                            else if (item.module === 'accreditation') { iconColor = 'text-indigo-600'; iconBg = 'bg-indigo-50'; }
                            else if (item.module === 'decisions') { iconColor = 'text-emerald-600'; iconBg = 'bg-emerald-50'; }

                            return (
                                <DropdownMenuItem 
                                    key={item.id} 
                                    onClick={() => router.push(item.link)}
                                    className="p-3.5 hover:bg-primary/5 cursor-pointer transition-colors focus:bg-primary/5 flex items-center justify-between gap-3"
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${iconBg} ${iconColor}`}>
                                            <Bell className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase text-slate-800 leading-tight truncate">{item.label}</p>
                                            <p className="text-[10px] font-medium text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
                                        </div>
                                    </div>
                                    <span className="shrink-0 text-[8px] font-black uppercase tracking-widest h-5 px-1.5 bg-primary/10 text-primary rounded-full flex items-center justify-center">
                                        NEW
                                    </span>
                                </DropdownMenuItem>
                            );
                        })}

                        {totalNotificationsCount === 0 && (
                            <div className="p-8 text-center text-muted-foreground italic flex flex-col items-center gap-2">
                                <Bell className="h-8 w-8 text-muted-foreground/30" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Quality Areas Complied</span>
                                <p className="text-[9px] not-italic text-slate-400 uppercase tracking-tighter">No active recommendations or approvals pending.</p>
                            </div>
                        )}
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>
        </TooltipProvider>

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
