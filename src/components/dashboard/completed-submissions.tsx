
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Heart } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';

interface CompletedSubmissionsProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isCampusSupervisor: boolean;
}

export function CompletedSubmissions({
  allUnits,
  allCampuses,
  allSubmissions,
  isLoading,
  userProfile,
  isCampusSupervisor,
}: CompletedSubmissionsProps) {
  
  const completedSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const currentYear = new Date().getFullYear();

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
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.year === currentYear);
            // A unique submission is a combination of report type and cycle
            const uniqueSubmissions = new Set(unitSubmissions.map(s => `${s.reportType}-${s.cycleId}`));
            return {
                id: unit.id,
                name: unit.name,
                count: uniqueSubmissions.size
            };
        }).filter(unit => unit.count >= TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            completedUnits: completedUnits
        };
    }).filter(campus => campus.completedUnits.length > 0);

  }, [allUnits, allCampuses, allSubmissions, isCampusSupervisor, userProfile]);


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
            Congratulations to the following units for completing all {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT} required submissions for {new Date().getFullYear()}.
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
