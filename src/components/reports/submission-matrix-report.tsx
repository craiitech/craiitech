'use client';

import * as React from 'react';
import { useMemo } from 'react';
import type { Campus, Cycle } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Printer, Loader2 } from 'lucide-react';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import ReactDOMServer from 'react-dom/server';

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

/**
 * PRINT TEMPLATE COMPONENT
 * Minimal, high-contrast version for official print-outs.
 */
const MatrixPrintView = ({ data, year }: { data: MatrixData, year: number }) => (
  <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
    <div style={{ textAlign: 'center', marginBottom: '30px' }}>
      <h1 style={{ margin: 0, fontSize: '18px' }}>ROMBLON STATE UNIVERSITY</h1>
      <h2 style={{ margin: 0, fontSize: '16px' }}>QUALITY ASSURANCE OFFICE</h2>
      <h3 style={{ marginTop: '10px', fontSize: '14px', textTransform: 'uppercase' }}>
        DETAILED SUBMISSION MATRIX - AY {year}
      </h3>
      <p style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>Generated on: {new Date().toLocaleString()}</p>
    </div>

    {data.map((campus) => (
      <div key={campus.campusId} style={{ marginBottom: '40px', pageBreakInside: 'avoid' }}>
        <h4 style={{ background: '#f1f5f9', padding: '8px', border: '1px solid #000', margin: 0, fontSize: '12px', fontWeight: 'bold' }}>
          CAMPUS: {campus.campusName.toUpperCase()}
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th rowSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'left', width: '180px' }}>UNIT / OFFICE NAME</th>
              {submissionTypes.map(type => (
                <th key={type} colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '8px' }}>{type.toUpperCase()}</th>
              ))}
            </tr>
            <tr style={{ background: '#f8fafc' }}>
              {submissionTypes.map(type => (
                <React.Fragment key={type}>
                  <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '30px' }}>1ST</th>
                  <th style={{ border: '1px solid #000', padding: '2px', textAlign: 'center', width: '30px' }}>FINAL</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {campus.units.map((unit) => (
              <tr key={unit.unitId}>
                <td style={{ border: '1px solid #000', padding: '4px', fontWeight: 'bold' }}>{unit.unitName}</td>
                {submissionTypes.map(type => {
                  const firstStatus = unit.statuses[`${campus.campusId}-${unit.unitId}-${type}-first`.toLowerCase()];
                  const finalStatus = unit.statuses[`${campus.campusId}-${unit.unitId}-${type}-final`.toLowerCase()];
                  
                  const renderStatus = (status: any) => {
                    if (status === 'submitted') return '✔';
                    if (status === 'not-applicable') return 'N/A';
                    return '✘';
                  };

                  return (
                    <React.Fragment key={type}>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{renderStatus(firstStatus)}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{renderStatus(finalStatus)}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ))}

    <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', fontSize: '9px', fontStyle: 'italic', color: '#444' }}>
      <p>Status Key: ✔ = Submitted & Approved | ✘ = Missing / Pending | N/A = Not Required for Cycle</p>
      <p>This is a system-generated document issued by the RSU EOMS Portal.</p>
    </div>
  </div>
);

export function SubmissionMatrixReport({
  matrixData,
  allCycles,
  selectedYear,
  onYearChange,
}: SubmissionMatrixReportProps) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const years = useMemo(() => {
    if (!allCycles) return [new Date().getFullYear()];
    const uniqueYears = [...new Set(allCycles.map(c => Number(c.year)))].sort((a, b) => b - a);
    if (uniqueYears.length > 0) return uniqueYears;
    return [new Date().getFullYear()];
  }, [allCycles]);
  
  const handlePrintMatrix = () => {
    setIsPrinting(true);
    try {
        const html = ReactDOMServer.renderToStaticMarkup(
            <MatrixPrintView data={matrixData} year={selectedYear} />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>RSU EOMS Submission Matrix - ${selectedYear}</title>
                        <style>
                            @media print {
                                @page { size: landscape; margin: 1cm; }
                                body { margin: 0; padding: 0; }
                                .no-print { display: none !important; }
                            }
                            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print" style="padding: 20px; background: #f1f5f9; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: center;">
                            <button onclick="window.print()" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                                Click to Print Matrix
                            </button>
                        </div>
                        ${html}
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) {
        console.error("Print failed", e);
    } finally {
        setIsPrinting(false);
    }
  };

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
    <Card className="max-w-full overflow-hidden border-primary/10 shadow-lg">
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-muted/10 border-b py-6">
        <div className="min-w-0 pr-4">
          <CardTitle className="text-xl font-black uppercase tracking-tight">Institutional Submission Matrix</CardTitle>
          <CardDescription className="max-w-xl text-xs font-medium">
            Cross-sectional compliance summary for {selectedYear}. <Check className="inline h-3 w-3 text-green-500" /> Approved, <X className="inline h-3 w-3 text-red-500" /> Missing, "N/A" Not Applicable.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Select value={String(selectedYear)} onValueChange={(v) => onYearChange(Number(v))}>
            <SelectTrigger className="w-[120px] h-9 bg-white font-bold shadow-sm">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintMatrix} 
            disabled={isPrinting || matrixData.length === 0}
            className="h-9 bg-white shadow-sm font-bold gap-2"
          >
            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            Print Matrix
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-w-full overflow-hidden p-0">
        <Accordion type="multiple" className="w-full" defaultValue={matrixData.map(d => d.campusId)}>
          {matrixData.map(({ campusId, campusName, units }) => {
            const cId = String(campusId).trim().toLowerCase();
            return (
                <AccordionItem value={cId} key={cId} className="border-none">
                <AccordionTrigger className="hover:no-underline font-black text-xs uppercase tracking-[0.1em] bg-muted/30 px-6 py-4 border-b">
                    <div className="flex items-center gap-3">
                        <span className="text-primary">{campusName}</span>
                        <Badge variant="outline" className="h-5 text-[9px] font-black bg-white">{units.length} UNITS</Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead rowSpan={2} className="sticky left-0 bg-slate-50 border-r z-20 font-black text-[10px] uppercase min-w-[220px]">Unit / Office Name</TableHead>
                                {submissionTypes.map(type => (
                                <TableHead key={type} colSpan={2} className="text-center border-l font-black text-[9px] uppercase py-2 bg-slate-100/50">{type}</TableHead>
                                ))}
                            </TableRow>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                {submissionTypes.map(type => (
                                <React.Fragment key={type}>
                                    <TableHead className="text-center border-l text-[8px] font-black py-1 uppercase text-muted-foreground">1st</TableHead>
                                    <TableHead className="text-center border-r text-[8px] font-black py-1 uppercase text-muted-foreground">Final</TableHead>
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
                                    No units with recorded submissions found for this campus site.
                                </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </div>
                </AccordionContent>
                </AccordionItem>
            );
          })}
            {matrixData.length === 0 && (
                <div className="text-center py-20 text-muted-foreground border border-dashed rounded-lg m-6 bg-muted/5">
                    <Printer className="h-10 w-10 mx-auto opacity-10 mb-4" />
                    <p className="font-bold text-xs uppercase tracking-widest">No compliance data available</p>
                    <p className="text-[10px] mt-1">Try selecting a different academic year.</p>
                </div>
            )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
