'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface UnitsWithoutSubmissionsProps {
  allUnits: Unit[] | null;
  allCampuses: Campus[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isAdmin: boolean;
  isCampusSupervisor: boolean;
}

export function UnitsWithoutSubmissions({
  allUnits,
  allCampuses,
  allSubmissions,
  isLoading,
  userProfile,
  isAdmin,
  isCampusSupervisor,
}: UnitsWithoutSubmissionsProps) {

  const incompleteSubmissionsByCampus = useMemo(() => {
    if (!allUnits || !allSubmissions || !allCampuses) {
      return [];
    }

    const currentYear = new Date().getFullYear();

    // Create a map of units grouped by campusId
    const unitsByCampus = allUnits.reduce((acc, unit) => {
      if (unit.campusId) {
        if (!acc[unit.campusId]) {
          acc[unit.campusId] = [];
        }
        acc[unit.campusId].push(unit);
      }
      return acc;
    }, {} as Record<string, Unit[]>);
    
    // Determine which campuses to show
    let relevantCampuses = allCampuses;
    if (isCampusSupervisor && userProfile?.campusId) {
        relevantCampuses = allCampuses.filter(c => c.id === userProfile.campusId);
    }

    // Process each campus
    return relevantCampuses.map(campus => {
        const campusUnits = unitsByCampus[campus.id] || [];
        const incompleteUnits = campusUnits.map(unit => {
            const unitSubmissions = allSubmissions.filter(s => s.unitId === unit.id && s.year === currentYear);
            const uniqueReports = new Set(unitSubmissions.map(s => s.reportType));
            return {
                id: unit.id,
                name: unit.name,
                count: uniqueReports.size
            };
        }).filter(unit => unit.count < TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT);
        
        return {
            campusId: campus.id,
            campusName: campus.name,
            incompleteUnits: incompleteUnits.sort((a,b) => a.count - b.count)
        };
    }).filter(campus => campus.incompleteUnits.length > 0); // Only include campuses with incomplete units

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
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (incompleteSubmissionsByCampus.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive" />
            Incomplete Submissions by Campus
        </CardTitle>
        <CardDescription>
          The following campuses have units that have not completed all {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT} required submissions for {new Date().getFullYear()}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {incompleteSubmissionsByCampus.map(campus => (
                 <AccordionItem value={campus.campusId} key={campus.campusId}>
                    <AccordionTrigger className="font-medium">
                        {campus.campusName} ({campus.incompleteUnits.length} units)
                    </AccordionTrigger>
                    <AccordionContent>
                         <List>
                          {campus.incompleteUnits.map(unit => (
                            <ListItem key={unit.id} className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <Building className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{unit.name}</span>
                              </div>
                              <Badge variant={unit.count === 0 ? 'destructive' : 'secondary'}>
                                {unit.count} of {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT}
                              </Badge>
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
