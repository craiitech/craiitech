'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { getPublicSubmissionMatrixData } from '@/lib/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Check, X, Loader2, Info } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';
import Link from 'next/link';

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
        } else {
            setData(result.matrix || []);
            setYears(result.availableYears || [new Date().getFullYear()]);
        }
      } catch (err) {
        console.error(err);
        setError("Compliance data could not be loaded at this time.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [selectedYear]);

  const renderCell = (status: string | undefined) => {
    switch (status) {
      case 'submitted':
        return <div className="bg-green-500/20 p-1 rounded-full w-fit mx-auto"><Check className="h-3 w-3 text-green-500" /></div>;
      case 'not-applicable':
        return <span className="text-[9px] font-bold text-white/30 mx-auto block text-center">N/A</span>;
      default:
        return <div className="bg-red-500/10 p-1 rounded-full w-fit mx-auto"><X className="h-3 w-3 text-red-500/40" /></div>;
    }
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <CardTitle className="text-2xl text-white">Transparency Board</CardTitle>
          <CardDescription className="text-white/60">
            Real-time compliance status for the ISO 21001:2018 Management System.
          </CardDescription>
        </div>
        {!error && !isLoading && data.length > 0 && (
            <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 font-semibold uppercase tracking-widest">Year:</span>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                    <SelectTrigger className="w-[100px] h-8 bg-white/5 border-white/10 text-white text-xs">
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
            <p className="text-sm">Fetching compliance data...</p>
          </div>
        ) : error ? (
            <div className="bg-slate-900/50 border border-white/10 rounded-xl p-12 text-center flex flex-col items-center gap-4">
                <Info className="h-12 w-12 text-blue-400/40" />
                <div className="space-y-2">
                    <h3 className="text-white font-semibold text-lg">Compliance Summary Unavailable</h3>
                    <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
                        {error}
                    </p>
                </div>
                <div className="flex gap-3 mt-4">
                    <Button asChild variant="default" className="shadow-lg shadow-primary/20">
                        <Link href="/login">Portal Login</Link>
                    </Button>
                    <Button asChild variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                        <Link href="/help">Contact Support</Link>
                    </Button>
                </div>
            </div>
        ) : (
          <Accordion type="multiple" className="w-full space-y-4" defaultValue={data.length > 0 ? [data[0].campusId] : []}>
            {data.map((campus) => (
              <AccordionItem 
                value={campus.campusId} 
                key={campus.campusId}
                className="border border-white/10 rounded-lg overflow-hidden bg-black/20 backdrop-blur-sm"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white/5 text-white font-bold uppercase tracking-wider text-sm">
                  {campus.campusName}
                </AccordionTrigger>
                <AccordionContent className="bg-white/5 p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                          <TableHead rowSpan={2} className="text-white font-bold min-w-[220px] border-r border-white/10 sticky left-0 z-20 bg-slate-950">UNIT NAME</TableHead>
                          {submissionTypes.map(type => (
                            <TableHead key={type} colSpan={2} className="text-center text-[9px] text-white/80 font-bold uppercase border-l border-white/10">{type}</TableHead>
                          ))}
                        </TableRow>
                        <TableRow className="border-white/10 hover:bg-transparent bg-white/5">
                          {submissionTypes.map(type => (
                            <React.Fragment key={type}>
                              <TableHead className="text-center border-l border-white/10 text-[8px] py-1 text-white/40">1ST</TableHead>
                              <TableHead className="text-center border-r border-white/10 text-[8px] py-1 text-white/40">FINAL</TableHead>
                            </React.Fragment>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {campus.units.map((unit: any) => {
                            const cId = String(campus.campusId).toLowerCase();
                            const uId = String(unit.unitId).toLowerCase();
                            return (
                                <TableRow key={unit.unitId} className="border-white/5 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-medium text-white text-[11px] border-r border-white/10 sticky left-0 z-10 bg-slate-950 md:bg-transparent">{unit.unitName}</TableCell>
                                    {submissionTypes.map(type => {
                                        const normalizedType = type.toLowerCase();
                                        return (
                                            <React.Fragment key={type}>
                                                <TableCell className="text-center border-l border-white/5">
                                                    {renderCell(unit.statuses[`${cId}-${uId}-${normalizedType}-first`])}
                                                </TableCell>
                                                <TableCell className="text-center border-r border-white/5">
                                                    {renderCell(unit.statuses[`${cId}-${uId}-${normalizedType}-final`])}
                                                </TableCell>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
        
        {!isLoading && !error && data.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-6 text-[10px] text-white/40 font-medium uppercase tracking-widest justify-center md:justify-start">
                <div className="flex items-center gap-2">
                    <div className="bg-green-500/20 p-1 rounded-full"><Check className="h-3 w-3 text-green-500" /></div>
                    <span>Submitted</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="bg-red-500/20 p-1 rounded-full"><X className="h-3 w-3 text-red-500" /></div>
                    <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="h-4 py-0 text-[8px] bg-white/10 text-white/60 border-none">N/A</Badge>
                    <span>Not Required</span>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
