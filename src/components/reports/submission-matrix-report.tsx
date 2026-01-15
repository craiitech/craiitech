
'use client';

import * as React from 'react';
import { useMemo } from 'react';
import type { Submission, Campus, Unit, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface SubmissionMatrixReportProps {
  allSubmissions: Submission[] | null;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  allCycles: Cycle[] | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

const cycles = ['first', 'final'] as const;

export function SubmissionMatrixReport({
  allSubmissions,
  allCampuses,
  allUnits,
  allCycles,
  selectedYear,
  onYearChange,
}: SubmissionMatrixReportProps) {
    
  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    return [...new Set(allCycles.map(c => c.year))].sort((a,b) => b-a);
  }, [allCycles]);

  const matrixData = useMemo(() => {
    if (!allSubmissions || !allCampuses || !allUnits) {
      return [];
    }

    // Create a Set for efficient lookups. This is the core of the fix.
    // It processes all submissions for the selected year just once.
    const submittedSet = new Set(
      allSubmissions
        .filter(s => s.year === selectedYear)
        .map(s => `${s.unitId}-${s.reportType}-${s.cycleId}`)
    );

    return allCampuses.map(campus => {
      const campusUnits = allUnits.filter(unit => unit.campusIds?.includes(campus.id));
      
      const unitStatuses = campusUnits.map(unit => {
        const statuses: Record<string, boolean> = {};
        
        submissionTypes.forEach(reportType => {
          cycles.forEach(cycleId => {
            const key = `${reportType}-${cycleId}`;
            // Perform a fast lookup in the Set.
            const lookupKey = `${unit.id}-${reportType}-${cycleId}`;
            statuses[key] = submittedSet.has(lookupKey);
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
    }).filter(c => c.units.length > 0).sort((a,b) => a.campusName.localeCompare(b.campusName));

  }, [allSubmissions, allCampuses, allUnits, selectedYear]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
            <CardTitle>Detailed Submission Matrix ({selectedYear})</CardTitle>
            <CardDescription>
            An overview of submitted documents for each unit, per cycle. <Check className="inline h-4 w-4 text-green-500" /> indicates submitted, <X className="inline h-4 w-4 text-red-500" /> indicates not submitted.
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
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
            {matrixData.map(({ campusId, campusName, units }) => (
                <AccordionItem value={campusId} key={campusId}>
                    <AccordionTrigger>{campusName}</AccordionTrigger>
                    <AccordionContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead rowSpan={2} className="sticky left-0 bg-background border-r">Unit</TableHead>
                                        {submissionTypes.map(type => (
                                            <TableHead key={type} colSpan={2} className="text-center border-l">{type}</TableHead>
                                        ))}
                                    </TableRow>
                                    <TableRow>
                                        {submissionTypes.map(type => (
                                            <React.Fragment key={type}>
                                                <TableHead className="text-center border-l">First</TableHead>
                                                <TableHead className="text-center border-l">Final</TableHead>
                                            </React.Fragment>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {units.map(({ unitId, unitName, statuses }) => (
                                        <TableRow key={unitId}>
                                            <TableCell className="font-medium sticky left-0 bg-background border-r">{unitName}</TableCell>
                                            {submissionTypes.map(type => (
                                                <React.Fragment key={type}>
                                                    <TableCell className="text-center border-l">
                                                        {statuses[`${type}-first`] ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                                                    </TableCell>
                                                     <TableCell className="text-center border-l">
                                                        {statuses[`${type}-final`] ? <Check className="h-4 w-4 text-green-500 mx-auto" /> : <X className="h-4 w-4 text-red-500 mx-auto" />}
                                                    </TableCell>
                                                </React.Fragment>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
