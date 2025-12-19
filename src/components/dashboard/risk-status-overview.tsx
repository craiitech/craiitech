'use client';

import { useMemo } from 'react';
import type { Risk, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, AlertCircle, CheckCircle, Building, Users } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

interface RiskStatusOverviewProps {
  risks: Risk[] | null;
  units: Unit[] | null;
  isLoading: boolean;
}

export function RiskStatusOverview({ risks, units, isLoading }: RiskStatusOverviewProps) {
  const stats = useMemo(() => {
    if (!risks || !units) {
      return {
        participatingUnits: [],
        openRisks: 0,
        closedRisks: 0,
      };
    }

    const participatingUnitIds = new Set(risks.map(r => r.unitId));
    const participatingUnits = units.filter(u => participatingUnitIds.has(u.id));
    const openRisks = risks.filter(r => r.status === 'Open').length;
    const closedRisks = risks.filter(r => r.status === 'Closed').length;

    return { participatingUnits, openRisks, closedRisks };
  }, [risks, units]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
         <CardFooter>
            <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck /> Risk Management Overview
        </CardTitle>
        <CardDescription>
          A summary of risk and opportunity submissions across your area of responsibility.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card-foreground/5 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Active Units</p>
                <Users className="h-5 w-5 text-muted-foreground"/>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.participatingUnits.length}</p>
             <p className="text-xs text-muted-foreground">Units that have submitted at least one entry.</p>
        </div>
        <div className="rounded-lg border bg-card-foreground/5 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Open Risks</p>
                <AlertCircle className="h-5 w-5 text-destructive"/>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.openRisks}</p>
             <p className="text-xs text-muted-foreground">Entries that require ongoing attention.</p>
        </div>
        <div className="rounded-lg border bg-card-foreground/5 p-4">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Closed Risks</p>
                <CheckCircle className="h-5 w-5 text-green-500"/>
            </div>
            <p className="mt-2 text-2xl font-bold">{stats.closedRisks}</p>
            <p className="text-xs text-muted-foreground">Entries that have been resolved.</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/risk-register">Open Full Register</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
