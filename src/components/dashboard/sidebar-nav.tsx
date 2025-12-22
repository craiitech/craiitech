
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useAuth,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart, History, ShieldCheck, User as UserIcon } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';

export function SidebarNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, userProfile, isAdmin, userRole, isSupervisor } = useUser();
  const { logSessionActivity } = useSessionActivity();

  const handleLogout = () => {
    if (user && userProfile && userRole) {
      logSessionActivity('User logged out from sidebar', {
        action: 'user_logout',
        details: { method: 'manual' },
      });
    }
    // Redirect to the logout page which will show the summary and then handle the sign-out.
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
      href: '/risk-register',
      label: 'Risk Register',
      active: pathname.startsWith('/risk-register'),
      icon: <ShieldCheck />,
    },
    {
      href: '/approvals',
      label: 'Approvals',
      active: pathname.startsWith('/approvals'),
      roles: ['Campus Director', 'Campus ODIMO', 'Unit ODIMO', 'Admin', 'Vice President'],
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
        roles: ['Admin', 'Campus Director', 'Campus ODIMO'],
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
    if (!route.roles) {
      return true; // Route is visible to everyone
    }
    if (!userRole) {
      return false; // If role is not loaded yet, don't show role-specific routes
    }
    // Handle VP role matching
    if (route.roles.includes('Vice President') && userRole.toLowerCase().includes('vice president')) {
      return true;
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
