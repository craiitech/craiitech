
'use client';

import { useMemo } from 'react';
import type { Unit, Submission, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { List, ListItem } from '@/components/ui/list';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';

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

  const unitsWithIncompleteSubmissions = useMemo(() => {
    if (!allUnits || !allSubmissions) {
      return [];
    }

    const currentYear = new Date().getFullYear();
    
    let relevantUnits = allUnits;
    if (isCampusSupervisor && userProfile?.campusId) {
      relevantUnits = allUnits.filter(u => u.campusId === userProfile.campusId);
    }
    
    const unitSubmissionCounts = relevantUnits.map(unit => {
        const unitSubmissions = allSubmissions.filter(
            s => s.unitId === unit.id && s.year === currentYear
        );
        const uniqueReports = new Set(unitSubmissions.map(s => s.reportType));
        return {
            id: unit.id,
            name: unit.name,
            count: uniqueReports.size
        };
    });

    return unitSubmissionCounts
        .filter(unit => unit.count < TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT)
        .sort((a,b) => a.count - b.count); // Sort by least complete first

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

  if (unitsWithIncompleteSubmissions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertCircle className="text-destructive" />
            Incomplete Submissions by Unit
        </CardTitle>
        <CardDescription>
          The following units have not completed all {TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT} required submissions for the current year ({new Date().getFullYear()}).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <List>
          {unitsWithIncompleteSubmissions.map(unit => (
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
      </CardContent>
    </Card>
  );
}
