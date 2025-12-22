
'use client';

import { useMemo } from 'react';
import type { Risk, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

interface RiskStatusOverviewProps {
  risks: Risk[] | null;
  units: Unit[] | null;
  isLoading: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
  isSupervisor: boolean;
}

export function RiskStatusOverview({ risks, units, isLoading, selectedYear, onYearChange, isSupervisor }: RiskStatusOverviewProps) {
  const stats = useMemo(() => {
    if (!risks) {
      return {
        openRisks: 0,
        closedRisks: 0,
        highRatedRisks: 0,
        participatingUnits: [],
      };
    }
    
    const yearRisks = risks.filter(r => r.year === selectedYear);

    // Supervisor/Admin view
    const participatingUnitIds = new Set(yearRisks.map(r => r.unitId));
    const participatingUnits = units ? units.filter(u => participatingUnitIds.has(u.id)) : [];
    
    // Unit Coordinator view
    const openRisks = yearRisks.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
    const closedRisks = yearRisks.filter(r => r.status === 'Closed').length;
    const highRatedRisks = yearRisks.filter(r => r.preTreatment.rating === 'High' && r.status !== 'Closed').length;

    return { openRisks, closedRisks, highRatedRisks, participatingUnits };
  }, [risks, units, selectedYear]);

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
  
  const StatCard = ({ title, value, icon, description }: { title: string, value: number, icon: React.ReactNode, description: string }) => (
    <div className="rounded-lg border bg-card-foreground/5 p-4">
        <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {icon}
        </div>
        <p className="mt-2 text-2xl font-bold">{value}</p>
         <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );


  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck /> Risk Management Overview
          </CardTitle>
          <CardDescription>
            {isSupervisor 
              ? 'A summary of risk submissions for the selected year.'
              : 'A summary of your unit\'s risk entries for the selected year.'}
          </CardDescription>
        </div>
        <div className="w-[120px]">
          <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {isSupervisor ? (
            <>
                <StatCard 
                    title="Active Units" 
                    value={stats.participatingUnits.length} 
                    icon={<Users className="h-5 w-5 text-muted-foreground"/>}
                    description="Units with at least one entry."
                />
                <StatCard 
                    title="Open Risks" 
                    value={stats.openRisks} 
                    icon={<AlertCircle className="h-5 w-5 text-destructive"/>}
                    description="Entries requiring action."
                />
                <StatCard 
                    title="Closed Risks" 
                    value={stats.closedRisks} 
                    icon={<CheckCircle className="h-5 w-5 text-green-500"/>}
                    description="Resolved and mitigated entries."
                />
            </>
        ) : (
             <>
                <StatCard 
                    title="Open Risks" 
                    value={stats.openRisks} 
                    icon={<AlertCircle className="h-5 w-5 text-muted-foreground"/>}
                    description="Entries that require ongoing attention."
                />
                <StatCard 
                    title="High-Rated Risks" 
                    value={stats.highRatedRisks} 
                    icon={<AlertCircle className="h-5 w-5 text-destructive"/>}
                    description="High-rated open entries needing priority action."
                />
                <StatCard 
                    title="Closed Risks" 
                    value={stats.closedRisks} 
                    icon={<CheckCircle className="h-5 w-5 text-green-500"/>}
                    description="Entries that have been resolved."
                />
            </>
        )}
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href="/risk-register">Open Full Register</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
