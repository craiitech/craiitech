
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Heart } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { TOTAL_REPORTS_PER_CYCLE, TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';

interface CompletedSubmissionsProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isCampusSupervisor: boolean;
  selectedYear: number;
}

export function CompletedSubmissions({
  allUnits,
  allCampuses,
  allSubmissions,
  isLoading,
  userProfile,
  isCampusSupervisor,
  selectedYear,
}: CompletedSubmissionsProps) {
  
  const completedSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const unitsByCampus = allUnits.reduce((acc, unit) => {
      unit.campusIds?.forEach(campusId => {
        if (!acc[campusId]) {
          acc[campusId] = [];
        }
        acc[campusId].push(unit);
      });
      return acc;
    }, {} as Record<string, Unit[]>);
    
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }

    return relevantCampuses.map(campus => {
        const campusUnits = unitsByCampus[campus.id] || [];
        const completedUnits = campusUnits.map(unit => {
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.year === selectedYear);
            
            const firstCycleRegistry = unitSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry Form');
            const isFirstActionPlanNA = firstCycleRegistry?.riskRating === 'low';
            const requiredFirst = isFirstActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            const firstCycleSubmissions = new Set(unitSubmissions.filter(s => s.cycleId === 'first').map(s => s.reportType));
             if (isFirstActionPlanNA) {
                firstCycleSubmissions.delete('Risk and Opportunity Action Plan');
            }

            const finalCycleRegistry = unitSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry Form');
            const isFinalActionPlanNA = finalCycleRegistry?.riskRating === 'low';
            const requiredFinal = isFinalActionPlanNA ? TOTAL_REPORTS_PER_CYCLE - 1 : TOTAL_REPORTS_PER_CYCLE;
            const finalCycleSubmissions = new Set(unitSubmissions.filter(s => s.cycleId === 'final').map(s => s.reportType));
            if (isFinalActionPlanNA) {
                finalCycleSubmissions.delete('Risk and Opportunity Action Plan');
            }

            const isComplete = firstCycleSubmissions.size >= requiredFirst && finalCycleSubmissions.size >= requiredFinal;
            
            return {
                id: unit.id,
                name: unit.name,
                isComplete,
            };
        }).filter(unit => unit.isComplete);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            completedUnits: completedUnits
        };
    }).filter(campus => campus.completedUnits.length > 0);

  }, [allUnits, allCampuses, allSubmissions, isCampusSupervisor, userProfile, selectedYear]);


  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (completedSubmissionsByCampus.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Heart className="text-green-500" />
            On-Track Units
        </CardTitle>
        <CardDescription>
            Congratulations to the following units for completing all required submissions for {selectedYear}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {completedSubmissionsByCampus.map(campus => (
                 <AccordionItem value={campus.campusId} key={campus.campusId}>
                    <AccordionTrigger className="font-medium">
                        {campus.campusName} ({campus.completedUnits.length} units)
                    </AccordionTrigger>
                    <AccordionContent>
                         <List>
                          {campus.completedUnits.map(unit => (
                            <ListItem key={unit.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{unit.name}</span>
                              </div>
                            </ListItem>
                          ))}
                        </List>
                    </AccordionContent>
                 </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
