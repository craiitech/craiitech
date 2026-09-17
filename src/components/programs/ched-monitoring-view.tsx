'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GraduationCap,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Building2,
  CalendarDays,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Printer,
  FileCheck,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface ChedMonitoringViewProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

export function ChedMonitoringView({ programs, compliances, campuses, units, selectedYear }: ChedMonitoringViewProps) {
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const [detailSearch, setDetailSearch] = useState('');
  const [detailCampusFilter, setDetailCampusFilter] = useState('all');
  const [detailUnitFilter, setDetailUnitFilter] = useState('all');
  const [detailCopcFilter, setDetailCopcFilter] = useState<string>('all');
  const [detailLevelFilter, setDetailLevelFilter] = useState<string>('all');
  const [detailSortBy, setDetailSortBy] = useState<string>('name');

  const activePrograms = useMemo(() => programs.filter((p) => p.isActive), [programs]);

  // Yearly COPC Compliance Summary
  const yearlySummary = useMemo(() => {
    const yearMap = new Map<
      number,
      {
        total: number;
        newProgram: number;
        withCopc: number;
        inProgress: number;
        noCopc: number;
        hasRqat: number;
        hasCmo: number;
      }
    >();

    activePrograms.forEach((p) => {
      const programCompliances = compliances.filter((c) => c.programId === p.id);
      programCompliances.forEach((c) => {
        const yr = c.academicYear;
        if (!yearMap.has(yr)) {
          yearMap.set(yr, {
            total: 0,
            newProgram: 0,
            withCopc: 0,
            inProgress: 0,
            noCopc: 0,
            hasRqat: 0,
            hasCmo: 0,
          });
        }
        const entry = yearMap.get(yr)!;
        entry.total++;
        if (p.isNewProgram) entry.newProgram++;

        const copc = c.ched?.copcStatus || 'No COPC';
        if (copc === 'With COPC') entry.withCopc++;
        else if (copc === 'In Progress') entry.inProgress++;
        else entry.noCopc++;

        if (c.ched?.rqatVisits && c.ched.rqatVisits.length > 0) entry.hasRqat++;
        if (c.ched?.programCmoLink) entry.hasCmo++;
      });
    });

    return Array.from(yearMap.entries())
      .map(([year, data]) => ({
        year,
        ...data,
        copcRate: data.total > 0 ? Math.round((data.withCopc / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.year - a.year);
  }, [activePrograms, compliances]);

  // Current Year Program Details
  const programDetailData = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => c.academicYear === selectedYear);
    const complianceMap = new Map(currentYearCompliances.map((c) => [c.programId, c]));

    return activePrograms
      .map((p) => {
        const c = complianceMap.get(p.id);
        const copcStatus = c?.ched?.copcStatus || 'No COPC';
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const unitName = unitMap.get(p.collegeId) || 'Unknown';
        const copcAwardDate = c?.ched?.copcAwardDate || '—';
        const copcLink = c?.ched?.copcLink || '';
        const cmoLink = c?.ched?.programCmoLink || '';
        const boardApprovalLink = c?.ched?.boardApprovalLink || '';
        const rqatVisitsCount = c?.ched?.rqatVisits?.length || 0;
        const lastRqat =
          c?.ched?.rqatVisits && c.ched.rqatVisits.length > 0 ? c.ched.rqatVisits[c.ched.rqatVisits.length - 1] : null;

        return {
          id: p.id,
          name: p.name,
          abbreviation: p.abbreviation,
          level: p.level,
          campusId: p.campusId,
          campus: campusName,
          unitId: p.collegeId,
          unit: unitName,
          hasRecord: !!c,
          copcStatus,
          copcAwardDate,
          copcLink,
          cmoLink,
          boardApprovalLink,
          rqatVisitsCount,
          lastRqatDate: lastRqat?.date || null,
          isNewProgram: p.isNewProgram,
        };
      })
      .filter((item) => {
        if (detailCampusFilter !== 'all' && item.campusId !== detailCampusFilter) return false;
        if (detailUnitFilter !== 'all' && item.unitId !== detailUnitFilter) return false;
        if (detailCopcFilter !== 'all' && item.copcStatus !== detailCopcFilter) return false;
        if (detailLevelFilter !== 'all' && item.level !== detailLevelFilter) return false;
        if (detailSearch) {
          const s = detailSearch.toLowerCase();
          if (!item.name.toLowerCase().includes(s) && !item.abbreviation.toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (detailSortBy === 'name') return a.name.localeCompare(b.name);
        if (detailSortBy === 'campus') return a.campus.localeCompare(b.campus);
        if (detailSortBy === 'copc') return b.copcStatus.localeCompare(a.copcStatus);
        if (detailSortBy === 'date') return (b.copcAwardDate || '').localeCompare(a.copcAwardDate || '');
        return a.name.localeCompare(b.name);
      });
  }, [
    activePrograms,
    compliances,
    selectedYear,
    campusMap,
    unitMap,
    detailSearch,
    detailCampusFilter,
    detailUnitFilter,
    detailCopcFilter,
    detailLevelFilter,
    detailSortBy,
  ]);

  // Current Year KPIs
  const currentYearStats = useMemo(() => {
    const currentYearData = programDetailData;
    const total = currentYearData.length;
    const withCopc = currentYearData.filter((p) => p.copcStatus === 'With COPC').length;
    const inProgress = currentYearData.filter((p) => p.copcStatus === 'In Progress').length;
    const noCopc = currentYearData.filter((p) => p.copcStatus === 'No COPC').length;
    const withCmo = currentYearData.filter((p) => !!p.cmoLink).length;
    const withRqat = currentYearData.filter((p) => p.rqatVisitsCount > 0).length;
    const rate = total > 0 ? Math.round((withCopc / total) * 100) : 0;

    return { total, withCopc, inProgress, noCopc, withCmo, withRqat, rate };
  }, [programDetailData]);

  const copcBadge = (status: string) => {
    switch (status) {
      case 'With COPC':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black shadow-none hover:bg-emerald-200">
            <CheckCircle2 className="h-3 w-3 mr-1" /> With COPC
          </Badge>
        );
      case 'In Progress':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-black shadow-none hover:bg-amber-200">
            <Clock className="h-3 w-3 mr-1" /> In Progress
          </Badge>
        );
      default:
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-black shadow-none hover:bg-rose-200">
            <XCircle className="h-3 w-3 mr-1" /> No COPC
          </Badge>
        );
    }
  };

  const handlePrintChedTrend = () => {
    const rowsHtml = yearlySummary
      .map(
        (row) => `
          <tr>
            <td style="padding: 10px 16px; font-weight: 900; font-size: 14px; border-bottom: 1px solid #e2e8f0;">AY ${row.year}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${row.total}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: #059669; font-weight: 700;">${row.withCopc}</span></td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: #d97706; font-weight: 700;">${row.inProgress}</span></td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: #dc2626; font-weight: 700;">${row.noCopc}</span></td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #059669;">${row.copcRate}%</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${row.newProgram > 0 ? `<span style="background:#f3e8ff; color:#6b21a8; padding:2px 8px; border-radius:999px; font-size:11px; font-weight:700;">${row.newProgram} New</span>` : '—'}</td>
          </tr>
        `,
      )
      .join('');

    const printHtml = `
      <html>
        <head>
          <title>CHED Program Compliance (COPC) Trend Report</title>
          <style>
            @page { size: 14in 8.5in landscape !important; margin: 0.5in !important; }
            @media print { body { background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
            body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 4px; }
            p.subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background: #f1f5f9; padding: 12px 16px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; text-align: center; border-bottom: 2px solid #e2e8f0; }
            th:first-child { text-align: left; }
            td:first-child { text-align: left; }
            .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background:#1B6535; color:white; border:none; padding:12px 32px; border-radius:8px; font-weight:900; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">Print CHED Trend Report</button>
          </div>
          <h1>CHED Program Compliance (COPC) — Yearly Trend</h1>
          <p class="subtitle">Romblon State University • Commission on Higher Education Regulatory Monitoring</p>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Academic Year</th>
                <th>Active Programs</th>
                <th>With COPC</th>
                <th>In Progress</th>
                <th>No COPC</th>
                <th>COPC Rate</th>
                <th>New Programs</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generated from RSU EOMS Decision Support System</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  const handlePrintProgramDetails = () => {
    const rowsHtml = programDetailData
      .map(
        (p) => `
          <tr>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0;">
              <span style="font-weight: 900; font-size: 13px;">${p.name}</span><br>
              <span style="font-size: 10px; color: #94a3b8; font-weight: 700;">${p.abbreviation} &bull; ${p.level}</span>
            </td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.campus}</td>
            <td style="padding: 10px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.unit}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 900;">
              ${
                p.copcStatus === 'With COPC'
                  ? '<span style="color:#059669;">WITH COPC</span>'
                  : p.copcStatus === 'In Progress'
                    ? '<span style="color:#d97706;">IN PROGRESS</span>'
                    : '<span style="color:#dc2626;">NO COPC</span>'
              }
            </td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 700; font-size: 12px;">${p.copcAwardDate}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">${p.cmoLink ? 'Complied' : '—'}</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 11px;">${p.rqatVisitsCount > 0 ? `${p.rqatVisitsCount} visit(s)` : 'None'}</td>
          </tr>
        `,
      )
      .join('');

    const printHtml = `
      <html>
        <head>
          <title>CHED Program Compliance Details — AY ${selectedYear}</title>
          <style>
            @page { size: 14in 8.5in landscape !important; margin: 0.5in !important; }
            @media print { body { background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
            body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #0f172a; margin-bottom: 4px; }
            p.subtitle { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { background: #f1f5f9; padding: 12px 16px; font-size: 10px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; text-align: center; border-bottom: 2px solid #e2e8f0; }
            th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
            td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
            .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align:center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background:#1B6535; color:white; border:none; padding:12px 32px; border-radius:8px; font-weight:900; font-size:12px; text-transform:uppercase; letter-spacing:0.05em; cursor:pointer;">Print Programs List</button>
          </div>
          <h1>CHED Program Compliance Status — AY ${selectedYear}</h1>
          <p class="subtitle">Certificate of Program Compliance (COPC) Registry • Romblon State University</p>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Program Title</th>
                <th style="text-align:left;">Campus</th>
                <th style="text-align:left;">Academic Unit</th>
                <th>COPC Status</th>
                <th>Award / Issuance Date</th>
                <th>CMO Link</th>
                <th>RQAT Visits</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">Generated from RSU EOMS Decision Support System • Total: ${programDetailData.length} programs</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Highlight KPI Cards for CHED */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Total Active Programs
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{currentYearStats.total}</h3>
              <p className="text-[9px] font-semibold text-slate-500 mt-0.5">AY {selectedYear} Registry</p>
            </div>
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <GraduationCap className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">With Valid COPC</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-emerald-700">{currentYearStats.withCopc}</h3>
                <span className="text-xs font-black text-emerald-600">({currentYearStats.rate}%)</span>
              </div>
              <p className="text-[9px] font-semibold text-emerald-600 mt-0.5">Compliant to CHED Standard</p>
            </div>
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">COPC In Progress</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{currentYearStats.inProgress}</h3>
              <p className="text-[9px] font-semibold text-amber-600 mt-0.5">Pending RQAT/CHED Action</p>
            </div>
            <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Without COPC</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">{currentYearStats.noCopc}</h3>
              <p className="text-[9px] font-semibold text-rose-600 mt-0.5">Requires Immediate Action</p>
            </div>
            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main CHED Monitoring Tabs Card */}
      <Card className="border-primary/10 shadow-lg overflow-hidden bg-white">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-b py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white shadow-sm border border-emerald-200">
                <ShieldCheck className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <CardTitle className="text-base font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  CHED Program Monitoring Dashboard
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Certificate of Program Compliance (COPC), CMO alignment, and RQAT monitoring
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100/70 border border-emerald-300">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-800" />
                <span className="text-[9px] font-black text-emerald-900 uppercase tracking-wider">
                  {yearlySummary.length} AY Tracked
                </span>
              </div>
              <Button
                onClick={handlePrintChedTrend}
                variant="outline"
                size="sm"
                className="h-8 bg-white border-emerald-200 text-emerald-800 font-black uppercase text-[9px] tracking-widest gap-1.5 shadow-sm hover:bg-emerald-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Trend
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="yearly-trend" className="flex flex-col">
            <div className="bg-slate-50/80 border-b px-4 py-2.5 flex items-center justify-between">
              <TabsList className="bg-white border shadow-sm h-8 p-0.5">
                <TabsTrigger
                  value="yearly-trend"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5"
                >
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-600" /> Yearly COPC Trend
                </TabsTrigger>
                <TabsTrigger
                  value="program-registry"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5"
                >
                  <FileCheck className="h-3.5 w-3.5 text-teal-600" /> Program Compliance (AY {selectedYear})
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Regulatory Compliance System
              </div>
            </div>

            {/* TAB 1: Yearly COPC Trend */}
            <TabsContent value="yearly-trend" className="m-0">
              <ScrollArea className="max-h-[520px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider w-[130px]">
                        Academic Year
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        Monitored Programs
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-emerald-700 tracking-wider text-center">
                        With COPC
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-amber-700 tracking-wider text-center">
                        In Progress
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-rose-700 tracking-wider text-center">
                        No COPC
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        Compliance Rate
                      </TableHead>
                      <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Remarks
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlySummary.map((row) => {
                      const prevYear = yearlySummary.find((y) => y.year === row.year - 1);
                      const copcChange = prevYear ? row.copcRate - prevYear.copcRate : null;

                      return (
                        <TableRow key={row.year} className="hover:bg-slate-50/80 transition-all border-b group">
                          <TableCell className="pl-6 py-4">
                            <span className="font-black text-sm text-slate-900 dark:text-slate-100">AY {row.year}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-sm text-slate-800">{row.total}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-emerald-600 text-sm">{row.withCopc}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-amber-600 text-sm">{row.inProgress}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-rose-600 text-sm">{row.noCopc}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  'text-sm font-black tabular-nums',
                                  row.copcRate >= 80
                                    ? 'text-emerald-600'
                                    : row.copcRate >= 50
                                      ? 'text-amber-600'
                                      : 'text-rose-600',
                                )}
                              >
                                {row.copcRate}%
                              </span>
                              {copcChange !== null && (
                                <span
                                  className={cn(
                                    'text-[8px] font-bold',
                                    copcChange > 0
                                      ? 'text-emerald-500'
                                      : copcChange < 0
                                        ? 'text-rose-500'
                                        : 'text-slate-400',
                                  )}
                                >
                                  {copcChange > 0 ? '+' : ''}
                                  {copcChange}pp
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {row.newProgram > 0 && (
                                <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[8px] font-black px-2 py-0.5">
                                  {row.newProgram} New Offering
                                </Badge>
                              )}
                              {row.hasRqat > 0 && (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[8px] font-black px-2 py-0.5">
                                  {row.hasRqat} RQAT Visited
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* TAB 2: Program Compliance (AY {selectedYear}) */}
            <TabsContent value="program-registry" className="m-0">
              <div className="p-4 border-b bg-slate-50/50">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <Input
                      placeholder="Search program by name or acronym..."
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      className="pl-9 h-8 text-xs bg-white border-slate-200"
                    />
                  </div>
                  <Select value={detailCampusFilter} onValueChange={setDetailCampusFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Campuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Campuses
                      </SelectItem>
                      {campuses.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-[10px] font-medium">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={detailUnitFilter} onValueChange={setDetailUnitFilter}>
                    <SelectTrigger className="h-8 w-[140px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="All Units" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Units
                      </SelectItem>
                      {units
                        .filter((u) => u.category === 'Academic')
                        .map((u) => (
                          <SelectItem key={u.id} value={u.id} className="text-[10px] font-medium">
                            {u.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={detailCopcFilter} onValueChange={setDetailCopcFilter}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="COPC Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All COPC
                      </SelectItem>
                      <SelectItem value="With COPC" className="text-[10px] font-bold text-emerald-600">
                        With COPC
                      </SelectItem>
                      <SelectItem value="In Progress" className="text-[10px] font-bold text-amber-600">
                        In Progress
                      </SelectItem>
                      <SelectItem value="No COPC" className="text-[10px] font-bold text-rose-600">
                        No COPC
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={detailSortBy} onValueChange={setDetailSortBy}>
                    <SelectTrigger className="h-8 w-[130px] text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name" className="text-[10px] font-bold">
                        Sort: Name
                      </SelectItem>
                      <SelectItem value="campus" className="text-[10px] font-bold">
                        Sort: Campus
                      </SelectItem>
                      <SelectItem value="copc" className="text-[10px] font-bold">
                        Sort: COPC
                      </SelectItem>
                      <SelectItem value="date" className="text-[10px] font-bold">
                        Sort: Award Date
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">
                      {programDetailData.length} program{programDetailData.length !== 1 ? 's' : ''}
                    </span>
                    <Button
                      onClick={handlePrintProgramDetails}
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white border-slate-200 text-slate-700 font-black uppercase text-[9px] tracking-widest gap-1 shadow-sm"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print List
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Program Name
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Campus
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Level
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> COPC Status
                        </div>
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Award Date
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        CMO Linkage
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        RQAT Status
                      </TableHead>
                      <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        BOR Approval
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programDetailData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <GraduationCap className="h-8 w-8 text-slate-300 mx-auto mb-2 stroke-[1.5]" />
                          <p className="text-xs font-bold text-slate-500">No programs match the selected filters</p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Adjust your search or filter criteria above.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      programDetailData.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/80 transition-all border-b group">
                          <TableCell className="pl-6 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 leading-tight">
                                {item.name}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-mono font-bold">
                                  {item.abbreviation}
                                </span>
                                {item.isNewProgram && (
                                  <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[7px] font-black py-0 px-1">
                                    New Offering
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                              {item.campus}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="text-[8px] font-black text-slate-600 border-slate-300 bg-white"
                            >
                              {item.level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.hasRecord ? (
                              copcBadge(item.copcStatus)
                            ) : (
                              <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[8px] font-black">
                                No Data
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px] font-mono font-bold text-slate-600 tabular-nums whitespace-nowrap">
                            {item.copcLink ? (
                              <a
                                href={item.copcLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1"
                              >
                                {item.copcAwardDate}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              item.copcAwardDate
                            )}
                          </TableCell>
                          <TableCell>
                            {item.cmoLink ? (
                              <a
                                href={item.cmoLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:underline"
                              >
                                <FileText className="h-3 w-3" /> CMO Link
                              </a>
                            ) : (
                              <span className="text-[9px] text-slate-300 font-bold">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.rqatVisitsCount > 0 ? (
                              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-bold">
                                {item.rqatVisitsCount} Visit{item.rqatVisitsCount !== 1 ? 's' : ''}
                                {item.lastRqatDate ? ` (${item.lastRqatDate})` : ''}
                              </Badge>
                            ) : (
                              <span className="text-[9px] text-slate-400 font-medium">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {item.boardApprovalLink ? (
                              <a
                                href={item.boardApprovalLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 hover:underline"
                              >
                                BOR Link <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : (
                              <span className="text-[9px] text-slate-300 font-bold">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
