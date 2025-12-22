
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Star, Building } from 'lucide-react';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';

interface LeaderboardProps {
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  isLoading: boolean;
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
  isLoading,
}: LeaderboardProps) {

  const leaderboardData = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const campusMap = new Map(allCampuses.map(c => [c.id, c.name]));

    const unitProgress = allUnits.map(unit => {
      const unitSubmissions = allSubmissions.filter(
        s => s.unitId === unit.id && s.year === currentYear
      );
      const uniqueSubmissions = new Set(
        unitSubmissions.map(s => `${s.reportType}-${s.cycleId}`)
      );
      const submissionCount = uniqueSubmissions.size;
      const percentage = Math.round((submissionCount / TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT) * 100);
      
      // Find the primary campus for the unit to display
      const campusName = unit.campusIds && unit.campusIds.length > 0 ? campusMap.get(unit.campusIds[0]) : 'N/A';

      return {
        id: unit.id,
        name: unit.name,
        percentage,
        campusName,
      };
    });

    return unitProgress
      .filter(unit => unit.percentage >= 50)
      .sort((a, b) => b.percentage - a.percentage);

  }, [allSubmissions, allUnits, allCampuses]);

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

  if (leaderboardData.length === 0) {
    return null; // Don't render the card if there's no one to show
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="text-yellow-500" />
          Top Performing Units
        </CardTitle>
        <CardDescription>
          Units with 50% or more completed submissions for {new Date().getFullYear()}.
        </CardDescription>
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
