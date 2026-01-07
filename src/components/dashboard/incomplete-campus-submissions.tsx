
'use client';

import { useMemo } from 'react';
import type { Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { FileWarning, School, CheckCircle } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { TOTAL_REQUIRED_SUBMISSIONS_PER_UNIT } from '@/app/(dashboard)/dashboard/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

interface IncompleteCampusSubmissionsProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  isLoading: boolean;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function IncompleteCampusSubmissions({
  allSubmissions,
  allCampuses,
  allUnits,
  isLoading,
  selectedYear,
  onYearChange,
}: IncompleteCampusSubmissionsProps) {

  const incompleteReportsByCampus = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits) {
      return [];
    }

    return allCampuses.map(campus => {
      // Get all unit IDs for the current campus
      const campusUnitIds = allUnits.filter(u => u.campusIds?.includes(campus.id)).map(u => u.id);
      
      // Get all submissions from those units for the selected year
      const campusSubmissions = allSubmissions.filter(s => 
        campusUnitIds.includes(s.unitId) && s.year === selectedYear
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

  }, [allSubmissions, allCampuses, allUnits, selectedYear]);

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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                 <CardTitle className="flex items-center gap-2">
                    <FileWarning className="text-destructive" />
                    Campus-Wide Missing Reports
                </CardTitle>
                <CardDescription>
                Campuses that have not received any submissions for the following report types for {selectedYear}.
                </CardDescription>
            </div>
            <div className="w-[120px]">
                <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
                    <SelectTrigger>
                    <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                    {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {incompleteReportsByCampus.length > 0 ? (
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
        ) : (
             <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground h-40">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="font-semibold">All Compliant!</p>
                <p>All campuses have submitted all required reports for {selectedYear}.</p>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
