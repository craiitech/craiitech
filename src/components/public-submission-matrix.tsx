
'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { getPublicSubmissionMatrixData } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

const submissionTypes = [
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan',
  'Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

export function PublicSubmissionMatrix() {
  const [data, setData] = useState<any[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getPublicSubmissionMatrixData(selectedYear);
        if (result.error) {
            setError(result.error);
        }
        setData(result.matrix || []);
        setYears(result.availableYears || [new Date().getFullYear()]);
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred while loading the transparency data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const renderCell = (status: string | undefined) => {
    switch (status) {
      case 'submitted':
        return <Check className="h-4 w-4 text-green-500 mx-auto" />;
      case 'not-applicable':
        return <span className="text-[10px] font-bold text-muted-foreground mx-auto block text-center">N/A</span>;
      case 'missing':
      default:
        return <X className="h-4 w-4 text-red-500 mx-auto opacity-30" />;
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <CardTitle className="text-2xl text-white">Public Transparency Board</CardTitle>
          <CardDescription className="text-white/60">
            Real-time ISO 21001:2018 compliance tracking across all university units.
          </CardDescription>
        </div>
        {!error && (
            <div className="flex items-center gap-2">
                <span className="text-sm text-white/60">Reporting Year:</span>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[120px] bg-white/10 border-white/20 text-white">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/60">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <p>Aggregating compliance data...</p>
          </div>
        ) : error ? (
            <Alert variant="destructive" className="bg-red-950/20 border-red-900/50 text-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={data.length > 0 ? [data[0].campusId] : []}>
            {data.map((campus) => (
              <AccordionItem 
                value={campus.campusId} 
                key={campus.campusId}
                className="border border-white/10 rounded-lg overflow-hidden bg-white/5"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 text-white font-bold uppercase tracking-wider">
                  {campus.campusName}
                </AccordionTrigger>
                <AccordionContent className="bg-white/5">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead rowSpan={2} className="bg-slate-900 text-white font-bold min-w-[200px] border-r border-white/10 sticky left-0 z-20">UNIT</TableHead>
                          {submissionTypes.map(type => (
                            <TableHead key={type} colSpan={2} className="text-center text-[9px] text-white/80 font-bold uppercase border-l border-white/10">{type}</TableHead>
                          ))}
                        </TableRow>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          {submissionTypes.map(type => (
                            <React.Fragment key={type}>
                              <TableHead className="text-center border-l border-white/10 text-[8px] py-1 text-white/40">1ST</TableHead>
                              <TableHead className="text-center border-r border-white/10 text-[8px] py-1 text-white/40">FINAL</TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campus.units.map((unit: any) => (
                          <TableRow key={unit.unitId} className="border-white/5 hover:bg-white/10 transition-colors">
                            <TableCell className="font-medium text-white text-xs bg-slate-900 md:bg-transparent border-r border-white/10 sticky left-0 z-10">{unit.unitName}</TableCell>
                            {submissionTypes.map(type => {
                                const cId = String(campus.campusId).toLowerCase();
                                const uId = String(unit.unitId).toLowerCase();
                                const t = type.toLowerCase();
                                return (
                                    <React.Fragment key={type}>
                                        <TableCell className="text-center border-l border-white/5">
                                            {renderCell(unit.statuses[`${cId}-${uId}-${t}-first`])}
                                        </TableCell>
                                        <TableCell className="text-center border-r border-white/5">
                                            {renderCell(unit.statuses[`${cId}-${uId}-${t}-final`])}
                                        </TableCell>
                                    </React.Fragment>
                                );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        {!isLoading && !error && (
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-white/40">
                <div className="flex items-center gap-1.5">
                    <div className="bg-green-500/20 p-0.5 rounded"><Check className="h-3 w-3 text-green-500" /></div>
                    <span>Submitted & Validated</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="bg-red-500/20 p-0.5 rounded"><X className="h-3 w-3 text-red-500" /></div>
                    <span>Pending Submission</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="h-4 py-0 text-[9px] bg-white/10">N/A</Badge>
                    <span>Not Applicable</span>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
