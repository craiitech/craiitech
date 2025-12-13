
'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';

interface IncompleteCampusSubmissionsProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
}

export function IncompleteCampusSubmissions({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
}: IncompleteCampusSubmissionsProps) {

  const incompleteReportsByCampus = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits) {
      return [];
    }

    const currentYear = new Date().getFullYear();

    return allCampuses.map(campus => {
      // Get all unit IDs for the current campus
      const campusUnitIds = allUnits.filter(u => u.campusIds?.includes(campus.id)).map(u => u.id);
      
      // Get all submissions from those units for the current year
      const campusSubmissions = allSubmissions.filter(s => 
        campusUnitIds.includes(s.unitId) && s.year === currentYear
      );
      
      // Find which report types have been submitted at least once
      const submittedTypes = new Set(campusSubmissions.map(s => s.reportType));
      
      // Determine which reports are missing
      const missingReports = submissionTypes.filter(type => !submittedTypes.has(type));

      return {
        campusId: campus.id,
        campusName: campus.name,
        missingReports: missingReports,
      };
    }).filter(campus => campus.missingReports.length > 0); // Only include campuses with missing reports

  }, [allSubmissions, allCampuses, allUnits]);

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

  if (incompleteReportsByCampus.length === 0) {
    return null; // Or a success message card
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="text-destructive" />
          Campus-Wide Missing Reports
        </CardTitle>
        <CardDescription>
          Campuses that have not received any submissions for the following report types this year.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {incompleteReportsByCampus.map(campus => (
            <AccordionItem value={campus.campusId} key={campus.campusId}>
              <AccordionTrigger className="font-medium hover:no-underline">
                <div className="flex items-center gap-3">
                    <School className="h-4 w-4 text-muted-foreground" />
                    <span>{campus.campusName}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc space-y-1 pl-6 text-sm text-muted-foreground">
                    {campus.missingReports.map(reportName => (
                        <li key={reportName}>{reportName}</li>
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
