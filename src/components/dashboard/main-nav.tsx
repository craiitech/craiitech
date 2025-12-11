'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import type { User } from '@/lib/types';

export function MainNav({
  className,
  user,
  ...props
}: React.HTMLAttributes<HTMLElement> & { user: User | null }) {
  const pathname = usePathname();

  const routes = [
    { href: '/dashboard', label: 'Dashboard', active: pathname === '/dashboard' },
    { href: '/submissions', label: 'Submissions', active: pathname === '/submissions' },
    { href: '/approvals', label: 'Approvals', active: pathname.startsWith('/approvals'), roles: ['Campus Director', 'Campus ODIMO', 'Unit ODIMO', 'Admin'] },
    { href: '/admin', label: 'Admin', active: pathname.startsWith('/admin'), roles: ['Admin'] },
  ].filter(route => !route.roles || (user && route.roles.includes(user.role)));

  return (
    <nav
      className={cn('flex items-center space-x-4 lg:space-x-6', className)}
      {...props}
    >
      {routes.map((route) => (
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
