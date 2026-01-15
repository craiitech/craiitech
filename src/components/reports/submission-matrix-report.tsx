
'use client';

import * as React from 'react';
import { useMemo } from 'react';
import type { Submission, Campus, Unit, Cycle, User } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUser } from '@/firebase';

interface SubmissionMatrixReportProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  allCycles: Cycle[] | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  userProfile: User | null;
}

const cycles = ['first', 'final'] as const;

export function SubmissionMatrixReport({
  allSubmissions,
  allCampuses,
  allUnits,
  allCycles,
  selectedYear,
  onYearChange,
  userProfile,
}: SubmissionMatrixReportProps) {
  const { isAdmin } = useUser();

  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    const uniqueYears = [...new Set(allCycles.map(c => c.year))].sort((a, b) => b - a);
    if (uniqueYears.length > 0) return uniqueYears;
    return [new Date().getFullYear()];
  }, [allCycles]);

  const matrixData = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits || !userProfile) {
      return [];
    }

    const submissionsForYear = allSubmissions.filter(s => s.year === selectedYear);

    // Create a Set for very fast lookups. The key is campus-aware.
    const submissionLookup = new Set(
      submissionsForYear.map(s =>
        `${s.campusId}-${s.unitId}-${s.reportType}-${s.cycleId}`
      )
    );
    
    const relevantCampuses = isAdmin
      ? allCampuses
      : allCampuses.filter(c => c.id === userProfile.campusId);

    return relevantCampuses.map(campus => {
      // Get all units assigned to the current campus.
      const campusUnits = allUnits.filter(unit => unit.campusIds?.includes(campus.id));
      
      if (campusUnits.length === 0) {
        return null; // Skip campuses with no units.
      }
      
      const unitStatuses = campusUnits.map(unit => {
        const statuses: Record<string, boolean> = {};
        
        submissionTypes.forEach(reportType => {
          cycles.forEach(cycleId => {
            const submissionKey = `${campus.id}-${unit.id}-${reportType}-${cycleId}`;
            statuses[submissionKey] = submissionLookup.has(submissionKey);
          });
        });
  
        return {
          unitId: unit.id,
          unitName: unit.name,
          statuses,
        };
      }).sort((a,b) => a.unitName.localeCompare(b.unitName));

      return {
        campusId: campus.id,
        campusName: campus.name,
        units: unitStatuses,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => a.campusName.localeCompare(b.campusName));

  }, [allSubmissions, allCampuses, allUnits, selectedYear, userProfile, isAdmin]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Detailed Submission Matrix</CardTitle>
          <CardDescription>
            An overview of submitted documents for each unit, per cycle. <Check className="inline h-4 w-4 text-green-500" /> indicates submitted, <X className="inline h-4 w-4 text-red-500" /> indicates not submitted.
          </CardDescription>
        </div>
        <div className="w-[120px]">
          <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={matrixData.map(d => d.campusId)}>
          {matrixData.map(({ campusId, campusName, units }) => (
            <AccordionItem value={campusId} key={campusId}>
              <AccordionTrigger>SITE {campusId.slice(0,4).toUpperCase()} - {campusName.toUpperCase()}</AccordionTrigger>
              <AccordionContent>
                <div className="relative overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead rowSpan={2} className="sticky left-0 bg-background border-r z-10">Unit</TableHead>
                        {submissionTypes.map(type => (
                          <TableHead key={type} colSpan={2} className="text-center border-l">{type}</TableHead>
                        ))}
                      </TableRow>
                      <TableRow>
                        {submissionTypes.map(type => (
                          <React.Fragment key={type}>
                            <TableHead className="text-center border-l">First</TableHead>
                            <TableHead className="text-center border-r">Final</TableHead>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map(({ unitId, unitName, statuses }) => (
                        <TableRow key={unitId}>
                          <TableCell className="font-medium sticky left-0 bg-background border-r z-10">{unitName}</TableCell>
                          {submissionTypes.map(type => (
                            <React.Fragment key={type}>
                              <TableCell className="text-center border-l">
                                {statuses[`${campusId}-${unitId}-${type}-first`] ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                              </TableCell>
                              <TableCell className="text-center border-r">
                                {statuses[`${campusId}-${unitId}-${type}-final`] ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                              </TableCell>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      ))}
                       {units.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={submissionTypes.length * 2 + 1} className="text-center h-24">
                            No units with submissions found for this campus.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
            {matrixData.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    No data to display for the selected year.
                </div>
            )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
