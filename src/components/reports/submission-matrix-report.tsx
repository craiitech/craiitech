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
        statuses: Record<string, 'submitted' | 'missing' | 'not-applicable'>;
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
  
  const renderCell = (status: 'submitted' | 'missing' | 'not-applicable' | undefined) => {
    switch (status) {
      case 'submitted':
        return <Check className="h-4 w-4 text-green-500 mx-auto" />;
      case 'not-applicable':
        return <span className="text-[10px] font-bold text-muted-foreground mx-auto block text-center">N/A</span>;
      case 'missing':
      default:
        return <X className="h-4 w-4 text-red-500 mx-auto" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Detailed Submission Matrix</CardTitle>
          <CardDescription>
            An overview of submitted documents for each unit, per cycle for the selected year. <Check className="inline h-4 w-4 text-green-500" /> indicates submitted, <X className="inline h-4 w-4 text-red-500" /> indicates missing, and "N/A" indicates Not Applicable.
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
              <AccordionTrigger className="hover:no-underline font-bold uppercase tracking-wider">{campusName}</AccordionTrigger>
              <AccordionContent>
                <div className="relative overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead rowSpan={2} className="sticky left-0 bg-muted border-r z-10 font-bold min-w-[200px]">UNIT NAME</TableHead>
                        {submissionTypes.map(type => (
                          <TableHead key={type} colSpan={2} className="text-center border-l font-bold text-[10px] uppercase">{type}</TableHead>
                        ))}
                      </TableRow>
                      <TableRow className="bg-muted/30">
                        {submissionTypes.map(type => (
                          <React.Fragment key={type}>
                            <TableHead className="text-center border-l text-[9px] font-semibold py-1">FIRST</TableHead>
                            <TableHead className="text-center border-r text-[9px] font-semibold py-1">FINAL</TableHead>
                          </React.Fragment>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {units.map(({ unitId, unitName, statuses }) => (
                        <TableRow key={unitId} className="hover:bg-muted/20">
                          <TableCell className="font-medium sticky left-0 bg-background border-r z-10 text-xs">{unitName}</TableCell>
                          {submissionTypes.map(type => {
                            // Ensure lookup keys match the lowercase normalization in the parent
                            const firstKey = `${campusId}-${unitId}-${type}-first`.toLowerCase();
                            const finalKey = `${campusId}-${unitId}-${type}-final`.toLowerCase();
                            
                            return (
                                <React.Fragment key={type}>
                                <TableCell className="text-center border-l">
                                    {renderCell(statuses[firstKey])}
                                </TableCell>
                                <TableCell className="text-center border-r">
                                    {renderCell(statuses[finalKey])}
                                </TableCell>
                                </React.Fragment>
                            );
                          })}
                        </TableRow>
                      ))}
                       {units.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={submissionTypes.length * 2 + 1} className="text-center h-24 text-muted-foreground">
                            No units with submissions found for this campus in {selectedYear}.
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
                    No compliance data found for the selected year.
                </div>
            )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
