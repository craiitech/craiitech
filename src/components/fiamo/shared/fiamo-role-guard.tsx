'use client';

import { ReactNode } from 'react';
import { useUser } from '@/firebase';

interface FiamoRoleGuardProps {
  children: ReactNode;
  roles?: ('coordinator' | 'odimo' | 'vpaf' | 'staff' | 'unitHead' | 'driverMechanic')[];
  permission?: string;
  fallback?: ReactNode;
}

export function FiamoRoleGuard({ children, roles, permission, fallback = null }: FiamoRoleGuardProps) {
  const { isUnitCoordinator, isUnitOdimo, isVpaf, isFiamoStaff, isUnitHead, isDriverMechanic, isAdmin, can } =
    useUser();

  const roleFlags: Record<string, boolean> = {
    coordinator: isUnitCoordinator,
    odimo: isUnitOdimo,
    vpaf: isVpaf,
    staff: isFiamoStaff,
    unitHead: isUnitHead,
    driverMechanic: isDriverMechanic,
  };

  const hasRole = isAdmin || (roles ? roles.some((r) => roleFlags[r]) : true);
  const hasPermission = permission ? can(permission) : true;

  if (!hasRole || !hasPermission) return <>{fallback}</>;
  return <>{children}</>;
}
