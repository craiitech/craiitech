'use client';

import { useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { collection } from '@/firebase/firestore-wrapper';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { AuditFinding, AuditPlan, AuditSchedule, Campus, CorrectiveActionRequest } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer } from 'lucide-react';
import { buildIqaOfiRegisterRows, type IqaOfiRegisterRow } from './iqa-ofi-register-data';

function IqaOfiPrintReport({ rows, year }: { rows: IqaOfiRegisterRow[]; year: string }) {
  return (
    <main>
      <header>
        <h1>Romblon State University</h1>
        <h2>Internal Quality Audit</h2>
        <h3>Specific Opportunities for Improvement (OFI) Register</h3>
        <p>{year === 'all' ? 'All Years' : `Audit Year: ${year}`}</p>
      </header>
      <table>
        <thead>
          <tr>
            <th>Year</th>
            <th>OFI Statement</th>
            <th>Campus / Site</th>
            <th>Status of Action</th>
            <th>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row) => (
              <tr key={row.id}>
                <td>{row.year}</td>
                <td>{row.statement}</td>
                <td>{row.campus}</td>
                <td>{row.status}</td>
                <td>{row.remarks}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No IQA OFI records found for this year.</td>
            </tr>
          )}
        </tbody>
      </table>
      <footer>Generated {new Date().toLocaleString()}</footer>
    </main>
  );
}

interface IqaOfiRegisterTabProps {
  campuses: Campus[];
}

export function IqaOfiRegisterTab({ campuses }: IqaOfiRegisterTabProps) {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState('all');

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const schedulesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'auditSchedules') : null),
    [firestore],
  );
  const plansQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const carsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'correctiveActionRequests') : null),
    [firestore],
  );

  const { data: findings, isLoading: isLoadingFindings } = useCollection<AuditFinding>(findingsQuery);
  const { data: schedules, isLoading: isLoadingSchedules } = useCollection<AuditSchedule>(schedulesQuery);
  const { data: plans, isLoading: isLoadingPlans } = useCollection<AuditPlan>(plansQuery);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carsQuery);

  const campusMap = useMemo(() => new Map(campuses.map((campus) => [campus.id, campus.name])), [campuses]);
  const rows = useMemo(() => {
    if (!findings || !schedules || !plans || !cars) return [];
    return buildIqaOfiRegisterRows({ findings, schedules, plans, cars, campusMap });
  }, [findings, schedules, plans, cars, campusMap]);

  const availableYears = useMemo(() => Array.from(new Set(rows.map((row) => row.year))).sort((a, b) => b - a), [rows]);
  const filteredRows = useMemo(
    () => (selectedYear === 'all' ? rows : rows.filter((row) => row.year === Number(selectedYear))),
    [rows, selectedYear],
  );
  const isLoading = isLoadingFindings || isLoadingSchedules || isLoadingPlans || isLoadingCars;

  const handlePrint = () => {
    const reportHtml = renderToStaticMarkup(<IqaOfiPrintReport rows={filteredRows} year={selectedYear} />);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      console.error('Print window was blocked. Allow pop-ups to print the IQA OFI register.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html><head><title>IQA OFI Register</title>
      <style>
        @page { size: landscape; margin: 0.5in; }
        body { font-family: Arial, sans-serif; color: #111827; font-size: 10pt; }
        header { text-align: center; margin-bottom: 20px; }
        h1 { font-size: 15pt; margin: 0; text-transform: uppercase; }
        h2 { font-size: 12pt; margin: 5px 0; text-transform: uppercase; }
        h3 { font-size: 11pt; margin: 12px 0 4px; text-transform: uppercase; }
        header p { margin: 0; font-size: 9pt; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #111827; padding: 7px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        th { background: #e5e7eb; text-transform: uppercase; font-size: 8pt; }
        th:first-child, td:first-child { width: 7%; }
        th:nth-child(2), td:nth-child(2) { width: 38%; }
        th:nth-child(3), td:nth-child(3) { width: 17%; }
        th:nth-child(4), td:nth-child(4) { width: 16%; }
        th:nth-child(5), td:nth-child(5) { width: 22%; }
        footer { margin-top: 16px; text-align: right; font-size: 8pt; color: #4b5563; }
        tr { break-inside: avoid; }
      </style></head>
      <body>${reportHtml}</body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Specific OFI for Each Year</h3>
          <p className="text-xs text-muted-foreground">
            Opportunities for improvement identified in internal audit findings, with linked action status and remarks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[150px]" aria-label="Filter OFIs by year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Print OFI Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-black uppercase">IQA Opportunities for Improvement</CardTitle>
          <CardDescription className="text-xs">
            {filteredRows.length} OFI record(s) {selectedYear !== 'all' ? `for ${selectedYear}` : 'across all years'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Year</TableHead>
                    <TableHead>OFI Statement</TableHead>
                    <TableHead>Campus / Site</TableHead>
                    <TableHead>Status of Action</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length ? (
                    filteredRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap">{row.year}</TableCell>
                        <TableCell className="min-w-[280px] whitespace-pre-wrap">{row.statement}</TableCell>
                        <TableCell className="min-w-[140px]">{row.campus}</TableCell>
                        <TableCell className="min-w-[150px]">{row.status}</TableCell>
                        <TableCell className="min-w-[220px] whitespace-pre-wrap">{row.remarks}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                        {isLoading ? 'Loading IQA OFI records…' : 'No IQA OFI records found for this year.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
