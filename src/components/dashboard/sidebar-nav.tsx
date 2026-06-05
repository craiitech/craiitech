
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History as HistoryIcon, ShieldCheck, BookOpen, BookMarked, ClipboardList, FolderKanban, ListChecks, HandHeart, UserCheck, WifiOff, Mail } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '../ui/sidebar';
import { cn } from '@/lib/utils';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  notificationCount: number;
  commNotificationCount?: number;
}

export function SidebarNav({
  className,
  notificationCount,
  commNotificationCount = 0,
  ...props
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isOnline = useNetworkStatus();
  const { toast } = useToast();
  const { isAdmin, userRole, isSupervisor } = useUser();
  const [isForcedOffline, setIsForcedOffline] = useState(false);

  useEffect(() => {
    const checkState = () => {
        setIsForcedOffline(localStorage.getItem('rsu_eoms_net_disabled') === 'true');
    };
    checkState();
    window.addEventListener('storage', checkState);
    return () => window.removeEventListener('storage', checkState);
  }, []);

  const handleLogout = () => {
    router.push('/logout');
  };

  /**
   * OFFLINE CONDUCT PROTOCOL
   * When offline (actual or forced), we allow navigation to the core conduct routes.
   */
  const ALLOWED_OFFLINE_ROUTES = [
    '/dashboard',
    '/audit',
    '/activity-log'
  ];

  const handleNavClick = (e: React.MouseEvent, href: string) => {
    if (!isOnline || isForcedOffline) {
        const isAllowed = ALLOWED_OFFLINE_ROUTES.some(r => href.startsWith(r));
        if (!isAllowed) {
            e.preventDefault();
            toast({
                title: "Focused Conduct Mode Active",
                description: "While offline or locked, only the Home, IQA Conduct, and Activity Log modules are enabled.",
                variant: "destructive"
            });
        }
    }
  };

  const allRoutes = [
    {
      href: '/dashboard',
      label: 'Home',
      active: pathname === '/dashboard',
      icon: <LayoutDashboard />,
    },
    {
      href: '/activity-log',
      label: 'Activity Log (Daily)',
      active: pathname.startsWith('/activity-log'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <UserCheck />,
    },


    {
      href: '/audit',
      label: userRole === 'Auditor' ? 'IQA Conduct' : 'Internal Quality Audit',
      active: pathname.startsWith('/audit'),
      roles: ['Admin', 'Auditor'],
      icon: <ClipboardList />,
    },
    {
      href: '/monitoring',
      label: 'Unit Monitoring',
      active: pathname.startsWith('/monitoring'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <ClipboardList />,
    },
    {
      href: '/academic-programs',
      label: 'CHED Programs Monitoring',
      active: pathname.startsWith('/academic-programs'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <BookOpen />,
    },
    {
      href: '/gad-corner',
      label: 'GAD Corner',
      active: pathname.startsWith('/gad-corner'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <HandHeart />,
    },
    {
      href: '/submissions',
      label: 'EOMS SUBMISSION HUB',
      active: pathname.startsWith('/submissions'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Vice President', 'Unit Coordinator', 'Unit ODIMO', 'Auditor'],
      icon: <FileText />,
      showBadge: true,
    },
    {
      href: '/approvals',
      label: 'Submission Approval',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Admin', 'Vice President'],
      icon: <CheckSquare />,
      showBadge: true,
    },
     {
      href: '/manuals',
      label: 'Unit Procedure Manuals',
      active: pathname.startsWith('/manuals'),
      icon: <BookOpen />,
    },
    {
      href: '/eoms-policy-manual',
      label: 'RSU EOMS Manual',
      active: pathname.startsWith('/eoms-policy-manual'),
      icon: <BookMarked />,
    },
    {
      href: '/unit-forms',
      label: 'Unit Forms & Records',
      active: pathname.startsWith('/unit-forms'),
      icon: <ListChecks />,
    },
    {
      href: '/risk-register',
      label: 'Risk & Opportunity Registry',
      active: pathname.startsWith('/risk-register'),
      icon: <ShieldCheck />,
    },
    {
      href: '/qa-reports',
      label: 'QA Reports & CARs',
      active: pathname.startsWith('/qa-reports'),
      icon: <FolderKanban />,
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
      label: 'System Audit Log',
      active: pathname.startsWith('/audit-log'),
      roles: ['Admin'],
      icon: <HistoryIcon />,
    },
    {
      href: '/software-quality',
      label: 'Software Quality',
      active: pathname.startsWith('/software-quality'),
      roles: ['Admin'],
      icon: <HistoryIcon />,
    },
  ];

  const visibleRoutes = allRoutes.filter((route) => {
    if (!route.roles) return true;
    if (isAdmin && route.roles.includes('Admin')) return true;
    if (userRole) {
        const roleLower = userRole.toLowerCase();
        const isVp = roleLower.includes('vice president');
        const isPresident = roleLower.includes('president');
        const isQmsHead = roleLower.includes('quality management system head') || roleLower.includes('qms head');
        
        if (route.roles.includes(userRole)) return true;
        if (isVp && route.roles.includes('Vice President')) return true;
        if (isPresident && (route.roles.includes('Vice President') || route.roles.includes('Campus Director') || route.roles.includes('Admin'))) return true;
        if (isQmsHead && (route.roles.includes('Campus Director') || route.roles.includes('Admin'))) return true;
        if (userRole === 'Faculty' && (route.roles.includes('Unit Coordinator') || route.roles.includes('Unit ODIMO'))) return true;
    }
    return false;
  });

  return (
    <div className={cn("flex flex-col h-full", className)} {...props}>
      <SidebarMenu className="flex-1">
        {visibleRoutes.map((route) => {
          const isAllowedOffline = ALLOWED_OFFLINE_ROUTES.some(r => route.href.startsWith(r));
          const isDisabled = (!isOnline || isForcedOffline) && !isAllowedOffline;

          return (
            <SidebarMenuItem key={route.href}>
                <SidebarMenuButton 
                asChild 
                isActive={route.active} 
                tooltip={route.label}
                onClick={(e) => handleNavClick(e, route.href)}
                className={cn(
                    "[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent",
                    isDisabled && "opacity-20 cursor-not-allowed grayscale pointer-events-auto"
                )}
                >
                <Link href={route.href}>
                    {isDisabled ? <WifiOff className="h-4 w-4" /> : route.icon}
                    <span>{route.label}</span>
                    {route.showBadge && !isDisabled && (
                      route.href === '/communications' ? (
                        commNotificationCount > 0 && (
                          <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                            {commNotificationCount}
                          </SidebarMenuBadge>
                        )
                      ) : (
                        notificationCount > 0 && (
                          <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                            {notificationCount}
                          </SidebarMenuBadge>
                        )
                      )
                    )}
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
      <div className="mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith('/communications')}
                  tooltip="Communication"
                  onClick={(e) => handleNavClick(e, '/communications')}
                  className={cn(
                    "rounded-md hover:bg-sky-950/40 hover:text-sky-200 text-sky-300 [&_svg]:text-sky-300",
                    "[&[data-active=true]]:bg-sky-500 [&[data-active=true]]:text-slate-950 [&[data-active=true]_svg]:text-slate-950 [&[data-active=true]]:hover:bg-sky-400 [&[data-active=true]]:hover:text-slate-950",
                    (!isOnline || isForcedOffline) && "opacity-20 cursor-not-allowed"
                  )}
                >
                  <Link href="/communications">
                    <Mail />
                    <span>Communication</span>
                    {commNotificationCount > 0 && !(!isOnline || isForcedOffline) && (
                      <SidebarMenuBadge className="bg-destructive text-destructive-foreground font-black text-[10px] animate-in zoom-in duration-300">
                        {commNotificationCount}
                      </SidebarMenuBadge>
                    )}
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith('/help')}
                  tooltip="Help"
                  onClick={(e) => handleNavClick(e, '/help')}
                  className={cn(
                    "[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent",
                    (!isOnline || isForcedOffline) && "opacity-20 cursor-not-allowed"
                  )}
                >
                  <Link href="/help">
                    <HelpCircle />
                    <span>Help</span>
                  </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Logout" className="hover:bg-sidebar-accent">
                    <LogOut />
                    <span>Logout</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}

