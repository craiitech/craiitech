
'use client';

import { useMemo } from 'react';
import type { Submission, Unit, User as AppUser, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Building, CalendarOff } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Timestamp } from 'firebase/firestore';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { isAfter } from 'date-fns';

interface NonCompliantUnitsProps {
  allCycles: Cycle[] | null;
  allSubmissions: Submission[] | null;
  allUnits: Unit[] | null;
  userProfile: AppUser | null;
  isLoading: boolean;
}

export function NonCompliantUnits({
  allCycles,
  allSubmissions,
  allUnits,
  userProfile,
  isLoading,
}: NonCompliantUnitsProps) {
  const nonCompliantUnitsByCycle = useMemo(() => {
    if (!allCycles || !allSubmissions || !allUnits || !userProfile) {
      return [];
    }
    
    const now = new Date();
    const passedDeadlines = allCycles.filter(cycle => {
        const endDate = cycle.endDate instanceof Timestamp ? cycle.endDate.toDate() : new Date(cycle.endDate);
        return isAfter(now, endDate);
    });

    if (passedDeadlines.length === 0) return [];
    
    const relevantUnits = userProfile.role === 'Admin'
      ? allUnits
      : allUnits.filter(u => u.campusIds?.includes(userProfile.campusId));

    return passedDeadlines.map(cycle => {
        const nonCompliantUnits = relevantUnits.map(unit => {
            const submittedTypes = new Set(
                allSubmissions
                    .filter(s => s.unitId === unit.id && s.cycleId === cycle.id)
                    .map(s => s.reportType)
            );
            
            const missingReports = submissionTypes.filter(type => !submittedTypes.has(type));
            
            return {
                id: unit.id,
                name: unit.name,
                missingReports,
            }
        }).filter(unit => unit.missingReports.length > 0);

        return {
            cycleId: cycle.id,
            cycleName: `${cycle.name} ${cycle.year}`,
            nonCompliantUnits,
        };
    }).filter(cycle => cycle.nonCompliantUnits.length > 0);

  }, [allCycles, allSubmissions, allUnits, userProfile]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (nonCompliantUnitsByCycle.length === 0) {
    return null;
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle />
          Non-Compliant Units (Past Deadlines)
        </CardTitle>
        <CardDescription>
          The following units failed to submit all required reports before the official deadline for the listed cycles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {nonCompliantUnitsByCycle.map(cycleResult => (
            <AccordionItem value={cycleResult.cycleId} key={cycleResult.cycleId}>
              <AccordionTrigger className="font-medium capitalize hover:no-underline">
                <div className="flex items-center gap-3">
                  <CalendarOff className="h-4 w-4 text-muted-foreground" />
                  <span>{cycleResult.cycleName}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-2 pl-6">
                  {cycleResult.nonCompliantUnits.map(unit => (
                    <li key={unit.id} className="text-sm">
                      <p className="font-semibold">{unit.name}</p>
                      <ul className="list-disc pl-5 text-muted-foreground">
                        {unit.missingReports.map(report => <li key={report}>{report}</li>)}
                      </ul>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
