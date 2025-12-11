'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/types';
import { collection, getFirestore } from 'firebase/firestore';
import { useMemo } from 'react';

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const { userProfile } = useUser();
  const firestore = getFirestore();

  const rolesQuery = useMemoFirebase(() => collection(firestore, 'roles'), [firestore]);
  const { data: roles } = useCollection<Role>(rolesQuery);
  
  const userRole = useMemo(() => {
    if (!userProfile || !roles) return null;
    return roles.find(r => r.id === userProfile.roleId)?.name;
  }, [userProfile, roles]);

  const allRoutes = [
    { href: '/dashboard', label: 'Dashboard', active: pathname === '/dashboard' },
    { href: '/submissions', label: 'Submissions', active: pathname === '/submissions' },
    { href: '/approvals', label: 'Approvals', active: pathname.startsWith('/approvals'), roles: ['Campus Director', 'Campus ODIMO', 'Unit ODIMO', 'Admin'] },
    { href: '/admin', label: 'Admin', active: pathname.startsWith('/admin'), roles: ['Admin'] },
  ];

  const visibleRoutes = allRoutes.filter(route => {
    // If a route has no roles array, it's visible to everyone
    if (!route.roles) {
      return true;
    }
    // If it has a roles array, check if the user's role is included
    return userRole && route.roles.includes(userRole);
  });
  
  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {visibleRoutes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            'text-sm font-medium transition-colors hover:text-primary',
            route.active
              ? 'text-black dark:text-white'
              : 'text-muted-foreground'
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
