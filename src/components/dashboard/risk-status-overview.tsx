
'use client';

import { useMemo } from 'react';
import type { Risk, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, AlertCircle, CheckCircle, Users, Info } from 'lucide-react';
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
    const defaultStats = {
        openRisks: 0,
        closedRisks: 0,
        highRatedRisks: 0,
        participatingUnits: [],
    };
    if (!risks) return defaultStats;
    
    const yearRisks = risks.filter(r => r.year === selectedYear);

    const openRisks = yearRisks.filter(r => r.status === 'Open' || r.status === 'In Progress').length;
    const closedRisks = yearRisks.filter(r => r.status === 'Closed').length;
    const highRatedRisks = yearRisks.filter(r => r.preTreatment.rating === 'High' && r.status !== 'Closed').length;

    if (isSupervisor) {
        const participatingUnitIds = new Set(yearRisks.map(r => r.unitId));
        const participatingUnits = units ? units.filter(u => participatingUnitIds.has(u.id)) : [];
        return { openRisks, closedRisks, highRatedRisks, participatingUnits };
    }
    
    return { openRisks, closedRisks, highRatedRisks, participatingUnits: [] };
  }, [risks, units, selectedYear, isSupervisor]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
         <CardFooter>
            <Skeleton className="h-10 w-32" />
        </CardFooter>
      </Card>
    );
  }
  
  const StatCard = ({ title, value, icon, description }: { title: string, value: number, icon: React.ReactNode, description: string }) => (
    <div className="rounded-lg border bg-card-foreground/5 p-4 shadow-sm group hover:border-primary/30 transition-colors">
        <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</p>
            {icon}
        </div>
        <p className="mt-2 text-2xl font-black tabular-nums">{value}</p>
         <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase">{description}</p>
    </div>
  );


  return (
    <Card className="shadow-md border-primary/10">
      <CardHeader className="flex flex-row items-start justify-between bg-muted/5 border-b py-4">
        <div>
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Risk Management Overview
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {isSupervisor 
              ? `Aggregated risk posture for the Academic Year ${selectedYear}.`
              : `Your unit's risk registry health for AY ${selectedYear}.`}
          </CardDescription>
        </div>
        <div className="w-[120px]">
          <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
            <SelectTrigger className="h-8 bg-white text-xs font-bold">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-6">
        {isSupervisor ? (
            <>
                <StatCard 
                    title="Active Units" 
                    value={stats.participatingUnits.length} 
                    icon={<Users className="h-4 w-4 text-primary opacity-40"/>}
                    description="Units with entries"
                />
                <StatCard 
                    title="Open Factors" 
                    value={stats.openRisks} 
                    icon={<AlertCircle className="h-4 w-4 text-amber-500 opacity-40"/>}
                    description="In-progress actions"
                />
                 <StatCard 
                    title="High Magnitude" 
                    value={stats.highRatedRisks} 
                    icon={<AlertCircle className="h-4 w-4 text-destructive"/>}
                    description="Priority mitigation"
                />
                <StatCard 
                    title="Verified Closed" 
                    value={stats.closedRisks} 
                    icon={<CheckCircle className="h-4 w-4 text-green-500"/>}
                    description="Residual risk low"
                />
            </>
        ) : (
             <>
                <StatCard 
                    title="Open Risks" 
                    value={stats.openRisks} 
                    icon={<AlertCircle className="h-4 w-4 text-amber-500 opacity-40"/>}
                    description="Treatment ongoing"
                />
                <StatCard 
                    title="High Rated" 
                    value={stats.highRatedRisks} 
                    icon={<AlertCircle className="h-4 w-4 text-destructive"/>}
                    description="Priority actions"
                />
                <StatCard 
                    title="Verified Closed" 
                    value={stats.closedRisks} 
                    icon={<CheckCircle className="h-4 w-4 text-green-500"/>}
                    description="Completed treatment"
                />
                <div className="flex flex-col items-center justify-center p-4">
                    <Button asChild size="sm" className="w-full font-black text-[10px] uppercase">
                        <Link href="/risk-register">Open Registry</Link>
                    </Button>
                </div>
            </>
        )}
      </CardContent>
      <CardFooter className="bg-muted/10 border-t py-3">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  <strong>Strategic Insight:</strong> A concentration of "High Magnitude" open risks indicates areas where institutional resources should be prioritized to avoid service disruption or non-compliance.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
