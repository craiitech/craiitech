
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useAuth,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History, ShieldCheck, User as UserIcon, ClipboardList, BookOpen, BookMarked } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import type { User as AppUser } from '@/lib/types';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const AdminStatusIndicator = () => {
    const { firestore } = useUser();

    // Fetch all online users to perform a case-insensitive check on the client.
    const onlineUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('isOnline', '==', true)
        );
    }, [firestore]);

    const { data: onlineUsers, isLoading: isLoadingOnlineUsers } = useCollection<AppUser>(onlineUsersQuery);

    const adminIsOnline = useMemo(() => {
        if (!onlineUsers || onlineUsers.length === 0) return false;

        // Filter for admins on the client-side to handle case-insensitivity
        const onlineAdmins = onlineUsers.filter(user => user.role?.toLowerCase().includes('admin'));

        if (onlineAdmins.length === 0) return false;

        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        
        return onlineAdmins.some(admin => {
            if (!admin.lastSeen) return false;

            let lastSeenMillis = 0;
            // Robustly check for a Timestamp object.
            if (admin.lastSeen?.toDate && typeof admin.lastSeen.toDate === 'function') {
                lastSeenMillis = admin.lastSeen.toDate().getTime();
            } else if (typeof (admin.lastSeen as any)?.seconds === 'number') {
                // Handle serialized timestamp objects.
                lastSeenMillis = (admin.lastSeen as any).seconds * 1000;
            }

            return lastSeenMillis > twoMinutesAgo;
        });
    }, [onlineUsers]);
    
    if (isLoadingOnlineUsers) {
        return (
             <SidebarMenuItem>
                <div className="flex h-10 items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-20 group-data-[collapsible=icon]:hidden" />
                </div>
            </SidebarMenuItem>
        );
    }
    
    const statusText = adminIsOnline ? "Admin Online" : "Admin Offline";
    const statusColor = adminIsOnline ? "bg-green-500" : "bg-destructive";
    const tooltipText = adminIsOnline 
        ? "An administrator is currently online."
        : "No administrators are currently online.";

    return (
        <SidebarMenuItem className="cursor-default">
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex h-10 items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm text-sidebar-foreground/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:!p-2">
                        <span className={cn("relative flex h-3 w-3 shrink-0", "group-data-[collapsible=icon]:h-3.5 group-data-[collapsible=icon]:w-3.5")}>
                            {adminIsOnline && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />}
                            <span className={cn("relative inline-flex h-3 w-3 rounded-full", statusColor)} />
                        </span>
                        <span className="truncate group-data-[collapsible=icon]:hidden">{statusText}</span>
                    </div>
                </TooltipTrigger>
                <TooltipContent side="right" align="center">
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </SidebarMenuItem>
    );
};


export function SidebarNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, userProfile, isAdmin, userRole, isSupervisor, firestore } = useUser();
  const { logSessionActivity } = useSessionActivity();

  const handleLogout = () => {
    router.push('/logout');
  };

  const allRoutes = [
    {
      href: '/dashboard',
      label: 'Home',
      active: pathname === '/dashboard',
      icon: <LayoutDashboard />,
    },
    {
      href: '/submissions',
      label: 'Submissions',
      active: pathname.startsWith('/submissions'),
      icon: <FileText />,
    },
     {
      href: '/manuals',
      label: 'Procedure Manuals',
      active: pathname.startsWith('/manuals'),
      icon: <BookOpen />,
    },
    // {
    //   href: '/eoms-policy-manual',
    //   label: 'EOMS Policy Manual',
    //   active: pathname.startsWith('/eoms-policy-manual'),
    //   icon: <BookMarked />,
    // },
    {
      href: '/risk-register',
      label: 'Risk Register',
      active: pathname.startsWith('/risk-register'),
      icon: <ShieldCheck />,
    },
    {
      href: '/audit',
      label: 'Audit',
      active: pathname.startsWith('/audit'),
      roles: ['Admin'],
      icon: <ClipboardList />,
    },
    {
      href: '/approvals',
      label: 'Approvals',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Admin', 'Vice President'],
      icon: <CheckSquare />,
    },
     {
      href: '/reports',
      label: 'Reports',
      active: pathname.startsWith('/reports'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO'],
      icon: <BarChart />,
    },
    {
        href: '/settings',
        label: 'Settings',
        active: pathname.startsWith('/settings'),
        roles: ['Admin', 'Campus Director'],
        icon: <Settings />,
    },
    {
      href: '/audit-log',
      label: 'Audit Log',
      active: pathname.startsWith('/audit-log'),
      roles: ['Admin'],
      icon: <History />,
    },
  ];

  const visibleRoutes = allRoutes.filter((route) => {
    // If no roles are required, show the route.
    if (!route.roles) {
      return true;
    }
    // Specific check for admins
    if (isAdmin && route.roles.includes('Admin')) {
        return true;
    }
    // Check for other roles
    if (userRole) {
        const isVp = userRole.toLowerCase().includes('vice president');
        if (route.roles.includes(userRole)) {
            return true;
        }
        if (isVp && route.roles.includes('Vice President')) {
            return true;
        }
    }
    return false;
  });

  return (
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        {visibleRoutes.map((route) => (
          <SidebarMenuItem key={route.href} className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md">
            <Link href={route.href} passHref>
              <SidebarMenuButton as="a" isActive={route.active} icon={route.icon} {...props} className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground hover:bg-sidebar-accent">
                {route.label}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="mt-auto">
         <SidebarMenu>
            <AdminStatusIndicator />
            <SidebarMenuItem>
                <Link href="/help" passHref>
                    <SidebarMenuButton as="a" isActive={pathname.startsWith('/help')} icon={<HelpCircle/>} className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground hover:bg-sidebar-accent">
                        Help
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} icon={<LogOut/>} className="hover:bg-sidebar-accent">
                    Logout
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
