
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History as HistoryIcon, ShieldCheck, BookOpen, BookMarked, ClipboardCheck, GraduationCap, MonitorCheck, ClipboardList, FolderKanban, Megaphone, ListChecks } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '../ui/sidebar';
import { cn } from '@/lib/utils';

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  notificationCount: number;
}

export function SidebarNav({
  className,
  notificationCount,
  ...props
}: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, userRole, isSupervisor } = useUser();

  const handleLogout = () => {
    router.push('/logout');
  };

  // Reordered and refined routes for optimal workflow
  const allRoutes = [
    {
      href: '/dashboard',
      label: 'Home',
      active: pathname === '/dashboard',
      icon: <LayoutDashboard />,
    },
    {
      href: '/advisories',
      label: 'QA Advisories',
      active: pathname.startsWith('/advisories'),
      icon: <Megaphone />,
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
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <ClipboardCheck />,
    },
    {
      href: '/academic-programs',
      label: 'CHED Programs Monitoring',
      active: pathname.startsWith('/academic-programs'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <GraduationCap />,
    },
    {
      href: '/submissions',
      label: 'EOMS SUBMISSION HUB',
      active: pathname.startsWith('/submissions'),
      icon: <FileText />,
    },
    {
      href: '/approvals',
      label: 'Submission Approval',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Admin', 'Vice President'],
      icon: <CheckSquare />,
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
      href: '/software-quality',
      label: 'Software Quality',
      active: pathname.startsWith('/software-quality'),
      roles: ['Admin'],
      icon: <MonitorCheck />,
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
  ];

  const visibleRoutes = allRoutes.filter((route) => {
    if (!route.roles) return true;
    if (isAdmin && route.roles.includes('Admin')) return true;
    if (userRole) {
        const isVp = userRole.toLowerCase().includes('vice president');
        if (route.roles.includes(userRole)) return true;
        if (isVp && route.roles.includes('Vice President')) return true;
    }
    return false;
  });

  return (
    <div className={cn("flex flex-col h-full", className)} {...props}>
      <SidebarMenu className="flex-1">
        {visibleRoutes.map((route) => (
          <SidebarMenuItem key={route.href}>
            <SidebarMenuButton 
              asChild 
              isActive={route.active} 
              tooltip={route.label}
              className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent"
            >
              <Link href={route.href}>
                {route.icon}
                <span>{route.label}</span>
                {route.href === '/approvals' && isSupervisor && notificationCount > 0 && (
                  <SidebarMenuBadge>{notificationCount}</SidebarMenuBadge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname.startsWith('/help')}
                  tooltip="Help"
                  className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md hover:bg-sidebar-accent"
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
