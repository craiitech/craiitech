'use client';

import { useMemo } from 'react';
import type { Unit, Submission, Campus, User as AppUser, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Building, TrendingUp } from 'lucide-react';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';

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
  const starCount = Math.floor(percentage / 20);
  const stars = [];
  for (let i = 0; i < 5; i++) {
    stars.push(
      <Star
        key={i}
        className={`h-4 w-4 ${i < starCount ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    );
  }
  return <div className="flex">{stars}</div>;
};

const getGrade = (percentage: number) => {
    if (percentage >= 95) return { label: 'A+', color: 'text-green-600' };
    if (percentage >= 85) return { label: 'A', color: 'text-green-500' };
    if (percentage >= 75) return { label: 'B', color: 'text-blue-500' };
    if (percentage >= 60) return { label: 'C', color: 'text-yellow-600' };
    return { label: 'D', color: 'text-orange-500' };
}

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
    const uniqueYears = [...new Set(allCycles.map(c => c.year))];
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
      .filter(item => item.percentage >= 10) // Show almost everyone making progress
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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            Unit Compliance Scorecard
            </CardTitle>
            <CardDescription>
            Performance based on submission completion for {selectedYear}.
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
      <CardContent>
        {leaderboardData.length > 0 ? (
            <div className="space-y-4">
            {leaderboardData.slice(0, 10).map((unit, index) => {
                const grade = getGrade(unit.percentage);
                return (
                    <div key={unit.id} className="space-y-2 rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold text-xs">
                                {index + 1}
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold truncate">{unit.name}</p>
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {unit.campusName}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className={cn("text-lg font-bold leading-none", grade.color)}>
                                    {grade.label}
                                </div>
                                <p className="text-[10px] font-medium text-muted-foreground">{unit.percentage}%</p>
                            </div>
                        </div>
                        <Progress value={unit.percentage} className="h-1.5" />
                    </div>
                )
            })}
            </div>
        ) : (
            <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm">
                <TrendingUp className="h-8 w-8 mb-2 opacity-20" />
                <p>Waiting for more unit activity...</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
