
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, Campus, User as AppUser, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Building } from 'lucide-react';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

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
    // If it's a campus supervisor, only show their campus
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }
    
    const campusUnitProgress: { id: string, name: string, campusName: string, percentage: number }[] = [];

    relevantCampuses.forEach(campus => {
        const unitsInCampus = allUnits.filter(u => u.campusIds?.includes(campus.id));

        unitsInCampus.forEach(unit => {
            // Filter submissions by year, unit, AND campus to get an accurate count for this specific context
            const campusUnitSubmissions = allSubmissions.filter(s => 
                s.year === selectedYear &&
                s.unitId === unit.id &&
                s.campusId === campus.id
            );
            
            // A unique submission is a combination of report type and cycle for that specific unit/campus pair
            const uniqueSubmissions = new Set(
                campusUnitSubmissions.map(s => `${s.reportType}-${s.cycleId}`)
            );
            const submissionCount = uniqueSubmissions.size;
            const percentage = Math.round((submissionCount / TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT) * 100);

            campusUnitProgress.push({
                id: `${unit.id}-${campus.id}`, // Create a unique key for the unit-campus pair
                name: unit.name,
                campusName: campus.name,
                percentage,
            });
        });
    });


    return campusUnitProgress
      .filter(item => item.percentage >= 50)
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

  if (leaderboardData.length === 0 && !isCampusSupervisor) {
    return (
         <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                     <CardTitle className="flex items-center gap-2">
                        <Trophy className="text-yellow-500" />
                        Top Performing Units
                    </CardTitle>
                    <CardDescription>
                    Units with 50% or more completed submissions for {selectedYear}.
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
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                    No units have reached 50% completion yet for {selectedYear}.
                </div>
            </CardContent>
         </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
            <Trophy className="text-yellow-500" />
            Top Performing Units
            </CardTitle>
            <CardDescription>
            Units with 50% or more completed submissions for {selectedYear}.
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
        <div className="space-y-4">
          {leaderboardData.map((unit, index) => (
            <div key={unit.id} className="flex items-center gap-4 rounded-md border p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-bold">
                {index + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{unit.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {unit.campusName}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{unit.percentage}%</p>
                <StarRating percentage={unit.percentage} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
