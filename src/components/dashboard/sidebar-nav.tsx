
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useUser,
  useAuth,
} from '@/firebase';
import { LayoutDashboard, FileText, CheckSquare, Settings, HelpCircle, LogOut, BarChart } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export function SidebarNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const { userProfile, isAdmin } = useUser();

  const userRole = isAdmin ? 'Admin' : userProfile?.role;
  const isCampusSupervisor = userRole === 'Campus Director' || userRole === 'Campus ODIMO';
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    } catch (error) {
       toast({
        title: 'Logout Failed',
        description: 'An error occurred while logging out. Please try again.',
        variant: 'destructive',
      });
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
      href: '/reports',
      label: 'Reports',
      active: pathname.startsWith('/reports'),
      roles: ['Admin'],
      icon: <BarChart />,
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
