'use client';

import * as React from 'react';
import { useMemo } from 'react';
import type { Campus, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const cycles = ['first', 'final'] as const;

type MatrixData = {
    campusId: string;
    campusName: string;
    units: {
        unitId: string;
        unitName: string;
        statuses: Record<string, boolean>;
    }[];
}[];

interface SubmissionMatrixReportProps {
  matrixData: MatrixData;
  allCycles: Cycle[] | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function SubmissionMatrixReport({
  matrixData,
  allCycles,
  selectedYear,
  onYearChange,
}: SubmissionMatrixReportProps) {

  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    const uniqueYears = [...new Set(allCycles.map(c => c.year))].sort((a, b) => b - a);
    if (uniqueYears.length > 0) return uniqueYears;
    return [new Date().getFullYear()];
  }, [allCycles]);

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
              <AccordionTrigger>{campusName.toUpperCase()}</AccordionTrigger>
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
