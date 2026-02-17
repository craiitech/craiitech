'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useAuth,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History, ShieldCheck, BookOpen, BookMarked, ClipboardCheck, GraduationCap, MonitorCheck, ClipboardList } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuBadge } from '../ui/sidebar';

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
      href: '/approvals',
      label: 'Approvals',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Admin', 'Vice President'],
      icon: <CheckSquare />,
    },
     {
      href: '/manuals',
      label: 'Procedure Manuals',
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
      href: '/risk-register',
      label: 'Risk Register',
      active: pathname.startsWith('/risk-register'),
      icon: <ShieldCheck />,
    },
    {
      href: '/academic-programs',
      label: 'Program Monitoring',
      active: pathname.startsWith('/academic-programs'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <GraduationCap />,
    },
    {
      href: '/monitoring',
      label: 'Unit Monitoring',
      active: pathname.startsWith('/monitoring'),
      roles: ['Admin', 'Campus Director', 'Campus ODIMO', 'Auditor', 'Vice President', 'Unit Coordinator', 'Unit ODIMO'],
      icon: <ClipboardCheck />,
    },
    {
      href: '/audit',
      label: 'Internal Quality Audit',
      active: pathname.startsWith('/audit'),
      roles: ['Admin', 'Auditor'],
      icon: <ClipboardList />,
    },
    {
      href: '/software-quality',
      label: 'Software Quality',
      active: pathname.startsWith('/software-quality'),
      roles: ['Admin', 'Auditor'],
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
      label: 'Audit Log',
      active: pathname.startsWith('/audit-log'),
      roles: ['Admin'],
      icon: <History />,
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
    <div className="flex flex-col h-full">
      <SidebarMenu className="flex-1">
        {visibleRoutes.map((route) => (
          <SidebarMenuItem key={route.href} className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground rounded-md">
            <Link href={route.href} passHref>
              <SidebarMenuButton as="a" isActive={route.active} icon={route.icon} {...props} className="[&[data-active=true]]:bg-sidebar-primary [&[data-active=true]]:text-sidebar-primary-foreground hover:bg-sidebar-accent">
                {route.label}
                {route.href === '/approvals' && isSupervisor && notificationCount > 0 && (
                  <SidebarMenuBadge>{notificationCount}</SidebarMenuBadge>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="mt-auto">
         <SidebarMenu>
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
