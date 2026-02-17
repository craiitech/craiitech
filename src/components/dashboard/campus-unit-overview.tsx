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
      
      const firstCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
      const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';
      const requiredFirst = isFirstActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
      
      // CRITICAL: Progress is based on APPROVED status
      const firstCycleApproved = new Set(
        unitSubmissionsForYear
            .filter(s => s.cycleId === 'first' && s.statusId === 'approved')
            .map(s => s.reportType)
      ).size;
      
      const finalCycleRegistry = unitSubmissionsForYear.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');
      const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';
      const requiredFinal = isFinalActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
      
      const finalCycleApproved = new Set(
        unitSubmissionsForYear
            .filter(s => s.cycleId === 'final' && s.statusId === 'approved')
            .map(s => s.reportType)
      ).size;
      
      const totalRequired = requiredFirst + requiredFinal;
      const approvedCount = firstCycleApproved + finalCycleApproved;
      const progress = totalRequired > 0 ? (approvedCount / totalRequired) * 100 : 0;

      return {
        id: unit.id,
        name: unit.name,
        approvedCount,
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
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unit Verification Progress</CardTitle>
        <CardDescription>
          Percentage of <strong>Approved</strong> documents per unit for {selectedYear}. N/A items are excluded.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <List>
          {unitSubmissionProgress.map(unit => (
            <ListItem key={unit.id} className="flex-col !items-start p-4 hover:bg-muted/20 transition-colors">
              <div className="flex w-full items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold truncate">{unit.name}</span>
                </div>
                <Badge variant="secondary" className="text-[10px] font-black">
                  {unit.approvedCount} / {unit.totalRequired} VERIFIED
                </Badge>
              </div>
              <div className="w-full mt-3 space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    <span>Maturity</span>
                    <span>{Math.round(unit.progress)}%</span>
                </div>
                <Progress value={unit.progress} className="h-1.5" />
              </div>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
