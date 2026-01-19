
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
import { useMemo, useState, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';

const AdminStatusIndicator = () => {
    const [adminIsOnline, setAdminIsOnline] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAdminStatus = async () => {
            try {
                const response = await fetch('/api/admin-status');
                if (!response.ok) {
                    // Don't throw, just log and assume offline for UI stability
                    console.error('Failed to fetch admin status:', response.statusText);
                    setAdminIsOnline(false);
                    return;
                }
                const data = await response.json();
                setAdminIsOnline(data.isAdminOnline);
            } catch (error) {
                console.error(error);
                // Gracefully fail to offline status on network error
                setAdminIsOnline(false);
            } finally {
                // Set loading to false only on the first fetch.
                // Subsequent calls from the interval won't change the state.
                setIsLoading(false);
            }
        };

        // Fetch immediately and then poll every 30 seconds
        fetchAdminStatus();
        const intervalId = setInterval(fetchAdminStatus, 30000); // Poll every 30 seconds

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);


    if (isLoading) {
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
    {
      href: '/eoms-policy-manual',
      label: 'EOMS Policy Manual',
      active: pathname.startsWith('/eoms-policy-manual'),
      icon: <BookMarked />,
    },
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
      roles: ['Admin', 'Auditor'],
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
