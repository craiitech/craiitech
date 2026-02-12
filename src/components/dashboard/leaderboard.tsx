'use client';

import { useMemo } from 'react';
import type { Unit, Submission, Campus, User as AppUser, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Building, TrendingUp } from 'lucide-react';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { cn } from '@/lib/utils';

interface LeaderboardProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allCycles: Cycle[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isCampusSupervisor: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const StarRating = ({ percentage }: { percentage: number }) => {
  // 1 star for every 20%
  const starCount = Math.floor(percentage / 20);
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-3 w-3 ${i < starCount ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    );
  }
  return <div className="flex gap-0.5">{stars}</div>;
};

export function Leaderboard({
  allSubmissions,
  allUnits,
  allCampuses,
  allCycles,
  isLoading,
  userProfile,
  isCampusSupervisor,
  selectedYear,
  onYearChange
}: LeaderboardProps) {

  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    const uniqueYears = [...new Set(allCycles.map(c => Number(c.year)))];
    if (uniqueYears.length === 0) return [new Date().getFullYear()];
    return uniqueYears.sort((a, b) => b - a);
  }, [allCycles]);

  const leaderboardData = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }
    
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }
    
    const campusUnitProgress: { id: string, name: string, campusName: string, percentage: number }[] = [];

    relevantCampuses.forEach(campus => {
        const unitsInCampus = allUnits.filter(u => u.campusIds?.includes(campus.id));

        unitsInCampus.forEach(unit => {
            const campusUnitSubmissions = allSubmissions.filter(s => 
                s.year === selectedYear &&
                s.unitId === unit.id &&
                s.campusId === campus.id
            );
            
            // Per-cycle calculation
            const firstCycleRegistry = campusUnitSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
            const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';
            const requiredFirst = isFirstActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            const firstCycleSubmissions = new Set(campusUnitSubmissions.filter(s => s.cycleId === 'first').map(s => s.reportType));
            if (isFirstActionPlanNA) {
                firstCycleSubmissions.delete('Risk and Opportunity Action Plan');
            }
            const firstCycleCount = firstCycleSubmissions.size;

            const finalCycleRegistry = campusUnitSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
            const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';
            const requiredFinal = isFinalActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            const finalCycleSubmissions = new Set(campusUnitSubmissions.filter(s => s.cycleId === 'final').map(s => s.reportType));
            if (isFinalActionPlanNA) {
                finalCycleSubmissions.delete('Risk and Opportunity Action Plan');
            }
            const finalCycleCount = finalCycleSubmissions.size;
            
            const totalRequired = requiredFirst + requiredFinal;
            const submissionCount = firstCycleCount + finalCycleCount;
            const percentage = totalRequired > 0 ? Math.round((submissionCount / totalRequired) * 100) : 0;

            campusUnitProgress.push({
                id: `${unit.id}-${campus.id}`,
                name: unit.name,
                campusName: campus.name,
                percentage,
            });
        });
    });


    return campusUnitProgress
      .filter(item => item.percentage >= 5) 
      .sort((a, b) => b.percentage - a.percentage);

  }, [allSubmissions, allUnits, allCampuses, userProfile, isCampusSupervisor, selectedYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
            <Trophy className="text-yellow-500 h-5 w-5" />
            Unit Compliance Scorecard
            </CardTitle>
            <CardDescription className="text-xs">
            Performance based on submission completion for {selectedYear}.
            </CardDescription>
        </div>
        <div className="w-[100px]">
             <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
                <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboardData.length > 0 ? (
            <div className="space-y-3">
            {leaderboardData.slice(0, 10).map((unit, index) => {
                return (
                    <div key={unit.id} className="space-y-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors overflow-hidden">
                        <div className="flex items-center gap-3">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-[10px]">
                                {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate leading-none mb-1">{unit.name}</p>
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-tighter">
                                    <Building className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">{unit.campusName}</span>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end shrink-0">
                                <StarRating percentage={unit.percentage} />
                                <p className="text-[9px] font-bold text-muted-foreground mt-1">{unit.percentage}%</p>
                            </div>
                        </div>
                        <Progress value={unit.percentage} className="h-1" />
                    </div>
                )
            })}
            </div>
        ) : (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-xs">Waiting for unit activity...</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
