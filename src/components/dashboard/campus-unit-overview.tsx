'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';

interface CampusUnitOverviewProps {
  allUnits: Unit[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  selectedYear: number;
}

export function CampusUnitOverview({
  allUnits,
  allSubmissions,
  isLoading,
  userProfile,
  selectedYear,
}: CampusUnitOverviewProps) {

  const unitSubmissionProgress = useMemo(() => {
    if (!allUnits || !allSubmissions || !userProfile?.campusId) {
      return [];
    }

    const campusUnits = allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));

    return campusUnits.map(unit => {
      const unitSubmissionsForYear = allSubmissions.filter(s => s.unitId === unit.id && s.year === selectedYear);
      
      const firstCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry Form');
      const requiredFirst = firstCycleRegistry?.riskRating === 'low' ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
      
      const finalCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry Form');
      const requiredFinal = finalCycleRegistry?.riskRating === 'low' ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
      
      const totalRequired = requiredFirst + requiredFinal;

      const uniqueSubmissions = new Set(unitSubmissionsForYear.map(s => `${s.reportType}-${s.cycleId}`));
      const submissionCount = uniqueSubmissions.size;
      const progress = totalRequired > 0 ? (submissionCount / totalRequired) * 100 : 0;

      return {
        id: unit.id,
        name: unit.name,
        submissionCount,
        progress,
        totalRequired,
      };
    });

  }, [allUnits, allSubmissions, userProfile?.campusId, selectedYear]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (unitSubmissionProgress.length === 0) {
    return null; // Don't show the card if there are no units in the campus
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submission Status per Unit</CardTitle>
        <CardDescription>
          Shows the submission progress for each unit within your campus for {selectedYear}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <List>
          {unitSubmissionProgress.map(unit => (
            <ListItem key={unit.id} className="flex-col !items-start">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{unit.name}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {unit.submissionCount} of {unit.totalRequired}
                </span>
              </div>
              <Progress value={unit.progress} className="mt-2 h-2" />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
