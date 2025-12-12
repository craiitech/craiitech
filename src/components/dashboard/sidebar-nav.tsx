'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useUser,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';

export function SidebarNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const { userProfile, isAdmin } = useUser();

  const userRole = isAdmin ? 'Admin' : userProfile?.role;
  const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';

  const allRoutes = [
    {
      href: '/dashboard',
      label: 'Dashboard',
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
      roles: ['Campus Director', 'Campus ODIMO', 'Unit ODIMO', 'Admin'],
      icon: <CheckSquare />,
    },
    {
        href: '/settings',
        label: 'Settings',
        active: pathname.startsWith('/settings'),
        roles: ['Admin', 'Campus Director', 'Campus ODIMO'],
        icon: <Settings />,
    }
  ];

  const visibleRoutes = allRoutes.filter((route) => {
    if (!route.roles) {
      return true; // Route is visible to everyone
    }
    if (!userRole) {
      return false; // If role is not loaded yet, don't show role-specific routes
    }
    // Check if the user's role is included in the route's allowed roles
    return route.roles.includes(userRole);
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
            <SidebarMenuItem>
                <SidebarMenuButton icon={<HelpCircle/>} className="hover:bg-sidebar-accent">Help</SidebarMenuButton>
            </SidebarMenuItem>
             <SidebarMenuItem>
                <SidebarMenuButton icon={<LogOut/>} className="hover:bg-sidebar-accent">Logout</SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </div>
  );
}
