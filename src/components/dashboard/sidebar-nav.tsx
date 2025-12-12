
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  useUser,
  useMemoFirebase,
  useFirestore,
  useCollection,
} from '@/firebase';
import type { Role } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { useMemo } from 'react';
import { LayoutDashboard, FileText, CheckSquare, Settings } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '../ui/sidebar';

export function SidebarNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const { userProfile, isAdmin } = useUser();
  const firestore = useFirestore();

  const rolesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'roles') : null),
    [firestore]
  );
  const { data: roles } = useCollection<Role>(rolesQuery);

  const userRole = useMemo(() => {
    if (isAdmin) return 'Admin';
    if (!userProfile || !roles) return null;
    return roles.find((r) => r.id === userProfile.roleId)?.name;
  }, [isAdmin, userProfile, roles]);

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
      return true;
    }
    return userRole && route.roles.includes(userRole);
  });

  return (
    <SidebarMenu>
      {visibleRoutes.map((route) => (
        <SidebarMenuItem key={route.href}>
          <Link href={route.href} passHref>
            <SidebarMenuButton as="a" isActive={route.active} icon={route.icon} {...props}>
              {route.label}
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
