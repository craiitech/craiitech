
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
    const uniqueYears = [...new Set(allCycles.map(c => Number(c.year)))].sort((a, b) => b - a);
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
    <Card className="max-w-full overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="min-w-0 pr-4">
          <CardTitle>Detailed Submission Matrix</CardTitle>
          <CardDescription className="max-w-xl">
            An overview of submitted documents for each unit, per cycle for the selected year. <Check className="inline h-4 w-4 text-green-500" /> indicates submitted, <X className="inline h-4 w-4 text-red-500" /> indicates missing, and "N/A" indicates Not Applicable.
          </CardDescription>
        </div>
        <div className="w-[120px] shrink-0">
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
      <CardContent className="max-w-full overflow-hidden">
        <Accordion type="multiple" className="w-full" defaultValue={matrixData.map(d => d.campusId)}>
          {matrixData.map(({ campusId, campusName, units }) => {
            const cId = String(campusId).trim().toLowerCase();
            return (
                <AccordionItem value={cId} key={cId} className="border-none mb-4">
                <AccordionTrigger className="hover:no-underline font-bold uppercase tracking-wider bg-muted/20 px-4 rounded-t-lg">
                    {campusName}
                </AccordionTrigger>
                <AccordionContent className="p-0 border rounded-b-lg">
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead rowSpan={2} className="sticky left-0 bg-muted border-r z-20 font-bold min-w-[200px] text-xs">UNIT NAME</TableHead>
                            {submissionTypes.map(type => (
                            <TableHead key={type} colSpan={2} className="text-center border-l font-bold text-[10px] uppercase">{type}</TableHead>
                            ))}
                        </TableRow>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                            {submissionTypes.map(type => (
                            <React.Fragment key={type}>
                                <TableHead className="text-center border-l text-[9px] font-semibold py-1">FIRST</TableHead>
                                <TableHead className="text-center border-r text-[9px] font-semibold py-1">FINAL</TableHead>
                            </React.Fragment>
                            ))}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {units.map(({ unitId, unitName, statuses }) => {
                            const uId = String(unitId).trim().toLowerCase();
                            return (
                                <TableRow key={uId} className="hover:bg-muted/10">
                                <TableCell className="font-bold sticky left-0 bg-background border-r z-10 text-[11px] whitespace-nowrap">
                                    {unitName}
                                </TableCell>
                                {submissionTypes.map(type => {
                                    // Construct lookup keys ensuring lowercase normalization
                                    const firstKey = `${cId}-${uId}-${type}-${cycles[0]}`.toLowerCase();
                                    const finalKey = `${cId}-${uId}-${type}-${cycles[1]}`.toLowerCase();
                                    
                                    return (
                                        <React.Fragment key={type}>
                                        <TableCell className="text-center border-l bg-background/50">
                                            {renderCell(statuses[firstKey])}
                                        </TableCell>
                                        <TableCell className="text-center border-r bg-background/50">
                                            {renderCell(statuses[finalKey])}
                                        </TableCell>
                                        </React.Fragment>
                                    );
                                })}
                                </TableRow>
                            );
                        })}
                        {units.length === 0 && (
                            <TableRow>
                            <TableCell colSpan={submissionTypes.length * 2 + 1} className="text-center h-24 text-muted-foreground italic text-xs">
                                No units with submissions found for this campus in {selectedYear}.
                            </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </AccordionContent>
                </AccordionItem>
            );
          })}
            {matrixData.length === 0 && (
                <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg">
                    No compliance data found for the selected year.
                </div>
            )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
