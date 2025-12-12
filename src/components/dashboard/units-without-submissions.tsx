
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface UnitsWithoutSubmissionsProps {
  allUnits: Unit[] | null;
  allSubmissions: Submission[] | null;
  isLoading: boolean;
  userProfile: AppUser | null;
  isAdmin: boolean;
  isCampusSupervisor: boolean;
}

export function UnitsWithoutSubmissions({
  allUnits,
  allSubmissions,
  isLoading,
  userProfile,
  isAdmin,
  isCampusSupervisor,
}: UnitsWithoutSubmissionsProps) {

  const unitsWithoutSubmissions = useMemo(() => {
    if (!allUnits || !allSubmissions) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    const submittedUnitIds = new Set(
        allSubmissions
        .filter(s => s.year === currentYear)
        .map(s => s.unitId)
    );

    let relevantUnits = allUnits;

    if (isCampusSupervisor && userProfile?.campusId) {
      relevantUnits = allUnits.filter(u => u.campusId === userProfile.campusId);
    }
    // For Admins, relevantUnits is allUnits.

    return relevantUnits.filter(unit => !submittedUnitIds.has(unit.id));
  }, [allUnits, allSubmissions, isCampusSupervisor, userProfile]);

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

  if (unitsWithoutSubmissions.length === 0) {
    return null; // Don't show the card if every unit has submitted
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive" />
            Units Without Submissions
        </CardTitle>
        <CardDescription>
          The following units have not submitted any documents for the current year ({new Date().getFullYear()}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <List>
          {unitsWithoutSubmissions.map(unit => (
            <ListItem key={unit.id}>
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{unit.name}</span>
              </div>
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
