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
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle2, Clock, Layers, ListChecks, Loader2, Printer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildIqaOfiRegisterRows, type IqaOfiRegisterRow } from './iqa-ofi-register-data';

type PrintScope = 'current' | 'campus' | 'unit';

interface OfiPrintGroup {
  key: string;
  label: string;
  rows: IqaOfiRegisterRow[];
}

function isClosedStatus(status: string) {
  const normalized = status.toLowerCase();
  return (
    normalized.includes('closed') ||
    normalized.includes('completed') ||
    normalized.includes('implemented') ||
    normalized.includes('verified')
  );
}

function getStatusClass(status: string) {
  if (isClosedStatus(status)) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status.toLowerCase().includes('progress')) return 'border-blue-200 bg-blue-50 text-blue-700';
  if (status.toLowerCase().includes('no action')) return 'border-slate-200 bg-slate-50 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function buildPrintGroups(rows: IqaOfiRegisterRow[], scope: PrintScope): OfiPrintGroup[] {
  if (scope === 'current') {
    return [{ key: 'all', label: 'All OFI Records', rows }];
  }

  const groups = new Map<string, OfiPrintGroup>();
  const sortedRows = [...rows].sort(
    (a, b) => a.campus.localeCompare(b.campus) || a.unit.localeCompare(b.unit) || a.year - b.year,
  );

  sortedRows.forEach((row) => {
    const key = scope === 'campus' ? row.campus : `${row.campus}|||${row.unit}`;
    const label = scope === 'campus' ? row.campus : `${row.campus} — ${row.unit || 'Unit not recorded'}`;
    const existing = groups.get(key);
    if (existing) {
      existing.rows.push(row);
    } else {
      groups.set(key, { key, label, rows: [row] });
    }
  });

  return Array.from(groups.values());
}

function IqaOfiTable({ rows }: { rows: IqaOfiRegisterRow[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Year</th>
          <th>OFI Statement</th>
          <th>Campus / Site</th>
          <th>Unit</th>
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
              <td>{row.unit}</td>
              <td>{row.status}</td>
              <td>{row.remarks}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6}>No IQA OFI records found for this selection.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function IqaOfiPrintReport({
  rows,
  year,
  scope,
  campusLabel,
  unitLabel,
}: {
  rows: IqaOfiRegisterRow[];
  year: string;
  scope: PrintScope;
  campusLabel: string;
  unitLabel: string;
}) {
  const groups = buildPrintGroups(rows, scope);
  const closedCount = rows.filter((row) => isClosedStatus(row.status)).length;
  const campusCount = new Set(rows.map((row) => row.campus)).size;
  const unitCount = new Set(rows.map((row) => `${row.campus}|||${row.unit}`)).size;
  const scopeLabel =
    scope === 'campus'
      ? 'Grouped by Campus / Site'
      : scope === 'unit'
        ? 'Grouped by Units per Campus / Site'
        : 'Current Filtered List';

  return (
    <main>
      <header>
        <h1>Romblon State University</h1>
        <h2>Internal Quality Audit</h2>
        <h3>Specific Opportunities for Improvement (OFI) Register</h3>
        <p>{year === 'all' ? 'All Years' : `Audit Year: ${year}`}</p>
        <p>
          Campus / Site: {campusLabel} | Unit: {unitLabel} | Print View: {scopeLabel}
        </p>
      </header>

      <section className="summary">
        <div>
          <strong>{rows.length}</strong>
          <span>Total OFIs</span>
        </div>
        <div>
          <strong>{rows.length - closedCount}</strong>
          <span>Open Actions</span>
        </div>
        <div>
          <strong>{closedCount}</strong>
          <span>Closed / Completed</span>
        </div>
        <div>
          <strong>{campusCount}</strong>
          <span>Campuses / Sites</span>
        </div>
        <div>
          <strong>{unitCount}</strong>
          <span>Units Covered</span>
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.key} className="group">
          {scope !== 'current' && <h4>{group.label}</h4>}
          <IqaOfiTable rows={group.rows} />
          {scope !== 'current' && (
            <p className="group-total">
              {group.rows.length} OFI record(s) | {group.rows.filter((row) => isClosedStatus(row.status)).length} closed
              / completed
            </p>
          )}
        </section>
      ))}

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
  const [campusFilter, setCampusFilter] = useState('all');
  const [unitFilter, setUnitFilter] = useState('all');
  const [printScope, setPrintScope] = useState<PrintScope>('current');

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

  const campusOptions = useMemo(() => {
    return [...campuses].sort((a, b) => a.name.localeCompare(b.name));
  }, [campuses]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      if (selectedYear !== 'all' && row.year !== Number(selectedYear)) return;
      if (campusFilter !== 'all' && row.campusId !== campusFilter) return;
      if (row.unit) set.add(row.unit);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows, selectedYear, campusFilter]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedYear !== 'all' && row.year !== Number(selectedYear)) return false;
      if (campusFilter !== 'all' && row.campusId !== campusFilter) return false;
      if (unitFilter !== 'all' && row.unit !== unitFilter) return false;
      return true;
    });
  }, [rows, selectedYear, campusFilter, unitFilter]);

  const stats = useMemo(() => {
    const closed = filteredRows.filter((row) => isClosedStatus(row.status)).length;
    const unitKeys = new Set(filteredRows.map((row) => `${row.campusId || row.campus}|||${row.unit}`));
    return {
      total: filteredRows.length,
      open: filteredRows.length - closed,
      closed,
      campuses: new Set(filteredRows.map((row) => row.campusId || row.campus)).size,
      units: unitKeys.size,
    };
  }, [filteredRows]);

  const isLoading = isLoadingFindings || isLoadingSchedules || isLoadingPlans || isLoadingCars;
  const hasActiveFilters = selectedYear !== 'all' || campusFilter !== 'all' || unitFilter !== 'all';
  const campusLabel = campusFilter === 'all' ? 'All Campuses / Sites' : campusMap.get(campusFilter) || campusFilter;
  const unitLabel = unitFilter === 'all' ? 'All Units' : unitFilter;

  const handlePrint = () => {
    const reportHtml = renderToStaticMarkup(
      <IqaOfiPrintReport
        rows={filteredRows}
        year={selectedYear}
        scope={printScope}
        campusLabel={campusLabel}
        unitLabel={unitLabel}
      />,
    );
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
        header { text-align: center; margin-bottom: 14px; }
        h1 { font-size: 15pt; margin: 0; text-transform: uppercase; }
        h2 { font-size: 12pt; margin: 5px 0; text-transform: uppercase; }
        h3 { font-size: 11pt; margin: 12px 0 4px; text-transform: uppercase; }
        h4 { font-size: 10pt; margin: 16px 0 5px; text-transform: uppercase; background: #f3f4f6; padding: 5px 7px; border: 1px solid #9ca3af; }
        header p { margin: 0; font-size: 9pt; }
        .summary { display: flex; gap: 8px; margin: 12px 0 16px; }
        .summary div { flex: 1; border: 1px solid #9ca3af; padding: 7px; text-align: center; }
        .summary strong { display: block; font-size: 14pt; }
        .summary span { display: block; font-size: 7.5pt; text-transform: uppercase; color: #4b5563; }
        .group { break-inside: auto; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border: 1px solid #111827; padding: 6px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
        th { background: #e5e7eb; text-transform: uppercase; font-size: 7.5pt; }
        th:first-child, td:first-child { width: 6%; }
        th:nth-child(2), td:nth-child(2) { width: 31%; }
        th:nth-child(3), td:nth-child(3) { width: 13%; }
        th:nth-child(4), td:nth-child(4) { width: 14%; }
        th:nth-child(5), td:nth-child(5) { width: 13%; }
        th:nth-child(6), td:nth-child(6) { width: 23%; }
        .group-total { margin: 4px 0 0; text-align: right; font-size: 8pt; color: #4b5563; }
        footer { margin-top: 16px; text-align: right; font-size: 8pt; color: #4b5563; }
        tr { break-inside: avoid; }
      </style></head>
      <body>${reportHtml}</body></html>`);
    printWindow.document.close();
  };

  const clearFilters = () => {
    setSelectedYear('all');
    setCampusFilter('all');
    setUnitFilter('all');
    setPrintScope('current');
  };

  const statCards = [
    {
      label: 'Total OFIs',
      value: stats.total,
      description: 'Filtered OFI records',
      icon: ListChecks,
      className: 'border-primary/20 bg-primary/5 text-primary',
    },
    {
      label: 'Open Actions',
      value: stats.open,
      description: 'Pending or in progress',
      icon: Clock,
      className: 'border-amber-200 bg-amber-50/60 text-amber-700',
    },
    {
      label: 'Closed / Completed',
      value: stats.closed,
      description: 'Actions closed or verified',
      icon: CheckCircle2,
      className: 'border-emerald-200 bg-emerald-50/60 text-emerald-700',
    },
    {
      label: 'Campuses / Sites',
      value: stats.campuses,
      description: 'Sites with OFIs',
      icon: Building2,
      className: 'border-blue-200 bg-blue-50/60 text-blue-700',
    },
    {
      label: 'Units Covered',
      value: stats.units,
      description: 'Units with OFIs',
      icon: Layers,
      className: 'border-purple-200 bg-purple-50/60 text-purple-700',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Specific OFI for Each Year</h3>
          <p className="text-xs text-muted-foreground">
            Opportunities for improvement identified in internal audit findings, with linked action status and remarks.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={printScope} onValueChange={(value) => setPrintScope(value as PrintScope)}>
            <SelectTrigger className="w-[210px]" aria-label="Select OFI print grouping">
              <SelectValue placeholder="Print view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Filtered List</SelectItem>
              <SelectItem value="campus">Group by Campus / Site</SelectItem>
              <SelectItem value="unit">Group by Units per Site</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Printer className="mr-2 h-4 w-4" />
            Print OFI Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className={cn('shadow-sm', card.className)}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-2xl font-black leading-none">{isLoading ? '—' : card.value}</p>
                  <p className="mt-1 text-[10px] font-bold text-muted-foreground">{card.description}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase">IQA Opportunities for Improvement</CardTitle>
              <CardDescription className="text-xs">
                {filteredRows.length} OFI record(s){' '}
                {selectedYear !== 'all' ? `for ${selectedYear}` : 'across all years'}
                {campusFilter !== 'all' ? ` in ${campusLabel}` : ''}
                {unitFilter !== 'all' ? ` — ${unitFilter}` : ''}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedYear}
                onValueChange={(value) => {
                  setSelectedYear(value);
                  setUnitFilter('all');
                }}
              >
                <SelectTrigger className="w-[135px]" aria-label="Filter OFIs by year">
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

              <Select
                value={campusFilter}
                onValueChange={(value) => {
                  setCampusFilter(value);
                  setUnitFilter('all');
                }}
              >
                <SelectTrigger className="w-[190px]" aria-label="Filter OFIs by campus or site">
                  <SelectValue placeholder="All Campuses / Sites" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses / Sites</SelectItem>
                  {campusOptions.map((campus) => (
                    <SelectItem key={campus.id} value={campus.id}>
                      {campus.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger className="w-[190px]" aria-label="Filter OFIs by unit">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 px-2 text-xs">
                  <X className="mr-1.5 h-3.5 w-3.5" /> Clear
                </Button>
              )}
            </div>
          </div>
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
                    <TableHead>Unit</TableHead>
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
                        <TableCell className="min-w-[160px]">{row.unit}</TableCell>
                        <TableCell className="min-w-[160px]">
                          <Badge variant="outline" className={cn('text-[10px] font-bold', getStatusClass(row.status))}>
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="min-w-[220px] whitespace-pre-wrap">{row.remarks}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">
                        {isLoading ? 'Loading IQA OFI records…' : 'No IQA OFI records found for this selection.'}
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
