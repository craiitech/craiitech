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
  BarChart3,
  BookOpen,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getUnitProgramsChedWarnings, getProgramChedWarnings } from '@/lib/ched-compliance-warnings';
import { AcademicUnitChedWarningsCard } from '@/components/programs/academic-unit-ched-warnings-card';
import {
  getChedCopcCategory,
  getChedPortfolioSnapshot,
  getChedYearSummaries,
  normalizeProgramId,
} from '@/lib/ched-monitoring';

export interface ChedMonitoringViewProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

const COPC_PRIORITY_THRESHOLD = 80;
const COPC_URGENT_THRESHOLD = 60;

export function ChedMonitoringView({ programs, compliances, campuses, units, selectedYear }: ChedMonitoringViewProps) {
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  const [activeTab, setActiveTab] = useState('yearly-trend');
  const [detailSearch, setDetailSearch] = useState('');
  const [detailCampusFilter, setDetailCampusFilter] = useState('all');
  const [detailUnitFilter, setDetailUnitFilter] = useState('all');
  const [detailCopcFilter, setDetailCopcFilter] = useState<string>('all');
  const [detailLevelFilter, setDetailLevelFilter] = useState<string>('all');
  const [detailWarningFilter, setDetailWarningFilter] = useState<string>('all');
  const [detailSortBy, setDetailSortBy] = useState<string>('name');

  const activePrograms = useMemo(() => programs.filter((p) => p.isActive), [programs]);

  // Aggregate CHED & Student Data Warnings across active programs
  const warningStats = useMemo(() => {
    return getUnitProgramsChedWarnings(activePrograms, compliances, selectedYear);
  }, [activePrograms, compliances, selectedYear]);

  const yearlySummary = useMemo(
    () => getChedYearSummaries(activePrograms, compliances, selectedYear),
    [activePrograms, compliances, selectedYear],
  );

  // Current Year Program Details
  const programDetailData = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => Number(c.academicYear) === Number(selectedYear));
    const complianceMap = new Map(currentYearCompliances.map((c) => [normalizeProgramId(c.programId), c]));

    return activePrograms
      .map((p) => {
        const c = complianceMap.get(normalizeProgramId(p.id));
        const copcStatus = getChedCopcCategory(c);
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
          copcStatus,
          copcAwardDate,
          copcLink,
          cmoLink,
          boardApprovalLink,
          rqatVisitsCount,
          lastRqatDate: lastRqat?.date || null,
          isNewProgram: p.isNewProgram,
          warningSummary: getProgramChedWarnings(p, c, selectedYear),
        };
      })
      .filter((item) => {
        if (detailCampusFilter !== 'all' && item.campusId !== detailCampusFilter) return false;
        if (detailUnitFilter !== 'all' && item.unitId !== detailUnitFilter) return false;
        if (detailCopcFilter !== 'all' && item.copcStatus !== detailCopcFilter) return false;
        if (detailLevelFilter !== 'all' && item.level !== detailLevelFilter) return false;
        if (detailWarningFilter === 'warnings' && !item.warningSummary.hasWarnings) return false;
        if (detailWarningFilter === 'enrollment' && !item.warningSummary.missingEnrollment) return false;
        if (detailWarningFilter === 'graduation' && !item.warningSummary.missingGraduation) return false;
        if (detailWarningFilter === 'board' && !item.warningSummary.missingBoard) return false;
        if (detailWarningFilter === 'docs' && !item.warningSummary.missingDocuments) return false;
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
        if (detailSortBy === 'warnings') return b.warningSummary.warnings.length - a.warningSummary.warnings.length;
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
    detailWarningFilter,
    detailSortBy,
  ]);

  const currentYearStats = useMemo(
    () => getChedPortfolioSnapshot(activePrograms, compliances, selectedYear),
    [activePrograms, compliances, selectedYear],
  );
  const documentWarningCount = warningStats.summaries.filter((summary) => summary.missingDocuments).length;
  const cmoOrBorGapCount = warningStats.summaries.filter((summary) =>
    summary.warnings.some((warning) => warning.code === 'NO_CMO_LINK' || warning.code === 'NO_BOR_APPROVAL'),
  ).length;
  const previousYearRate = yearlySummary.find((row) => row.year === selectedYear - 1)?.copcRate;
  const actionItems = [
    currentYearStats.noRecord > 0 &&
      `Create AY ${selectedYear} monitoring records for ${currentYearStats.noRecord} program(s) with no year record.`,
    currentYearStats.unknown > 0 &&
      `Confirm and record COPC status for ${currentYearStats.unknown} program(s) with an unknown status.`,
    currentYearStats.noCopc > 0 &&
      `Coordinate follow-up plans for ${currentYearStats.noCopc} program(s) explicitly marked No COPC.`,
    currentYearStats.inProgress > 0 &&
      `Track application milestones for ${currentYearStats.inProgress} program(s) marked In Progress.`,
    currentYearStats.missingCopcEvidence > 0 &&
      `Attach or verify COPC evidence links for ${currentYearStats.missingCopcEvidence} program(s) marked With COPC.`,
    cmoOrBorGapCount > 0 && `Review CMO or BOR evidence for ${cmoOrBorGapCount} program(s).`,
  ].filter((item): item is string => Boolean(item));
  const decisionSummary =
    currentYearStats.total === 0
      ? `No active programs are available to assess for AY ${selectedYear}.`
      : currentYearStats.rate < COPC_URGENT_THRESHOLD
        ? `${currentYearStats.rate}% of the current active portfolio is marked With COPC for AY ${selectedYear}, below the ${COPC_URGENT_THRESHOLD}% urgent-intervention benchmark.`
        : currentYearStats.rate < COPC_PRIORITY_THRESHOLD
          ? `${currentYearStats.rate}% of the current active portfolio is marked With COPC for AY ${selectedYear}, below the ${COPC_PRIORITY_THRESHOLD}% priority benchmark.`
          : `${currentYearStats.rate}% of the current active portfolio is marked With COPC for AY ${selectedYear}, meeting the ${COPC_PRIORITY_THRESHOLD}% benchmark. Maintain follow-up and verify supporting evidence.`;
  const institutionalLearning =
    previousYearRate === undefined
      ? `AY ${selectedYear} provides the current baseline. Compare future results while monitoring the separately reported missing-record and unknown-status counts.`
      : `The recorded COPC rate changed ${currentYearStats.rate - previousYearRate > 0 ? 'up' : currentYearStats.rate - previousYearRate < 0 ? 'down' : 'by'} ${Math.abs(currentYearStats.rate - previousYearRate)} percentage point(s) from AY ${selectedYear - 1}. Use the separate missing-record and unknown-status counts when interpreting this trend.`;

  // COPC Breakdown by Degree Level (Undergraduate vs Graduate) — uses all active programs against current year compliances
  const copcLevelBreakdown = useMemo(() => {
    const currentYearCompliances = compliances.filter((c) => Number(c.academicYear) === Number(selectedYear));
    const complianceMap = new Map(currentYearCompliances.map((c) => [normalizeProgramId(c.programId), c]));

    const levels = ['Undergraduate', 'Graduate', 'TVET'] as const;
    return levels
      .map((level) => {
        const levelPrograms = activePrograms.filter((p) => p.level === level);
        const total = levelPrograms.length;
        const categories = levelPrograms.map((p) => getChedCopcCategory(complianceMap.get(normalizeProgramId(p.id))));
        const withCopc = categories.filter((category) => category === 'With COPC').length;
        const inProgress = categories.filter((category) => category === 'In Progress').length;
        const noCopc = categories.filter((category) => category === 'No COPC').length;
        const noRecord = categories.filter((category) => category === 'No Record').length;
        const unknown = categories.filter((category) => category === 'Status Unknown').length;
        const rate = total > 0 ? Math.round((withCopc / total) * 100) : 0;
        return { level, total, withCopc, inProgress, noCopc, noRecord, unknown, rate };
      })
      .filter((entry) => entry.total > 0);
  }, [activePrograms, compliances, selectedYear]);

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
      case 'No COPC':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[9px] font-black shadow-none hover:bg-rose-200">
            <XCircle className="h-3 w-3 mr-1" /> No COPC
          </Badge>
        );
      case 'No Record':
        return (
          <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[9px] font-black">No AY Record</Badge>
        );
      default:
        return (
          <Badge className="bg-violet-100 text-violet-800 border-violet-200 text-[9px] font-black">
            Status Unknown
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
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: #64748b; font-weight: 700;">${row.noRecord}</span></td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0;"><span style="color: #7c3aed; font-weight: 700;">${row.unknown}</span></td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #059669;">${row.copcRate}%</td>
            <td style="padding: 10px 16px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${row.hasRqat}</td>
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
          <p class="subtitle">COPC rate = With COPC / current active portfolio; missing and unknown statuses are shown separately • Romblon State University</p>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Academic Year</th>
                <th>Current Portfolio</th>
                <th>With COPC</th>
                <th>In Progress</th>
                <th>No COPC</th>
                <th>No AY Record</th>
                <th>Status Unknown</th>
                <th>COPC Rate</th>
                <th>Programs with RQAT</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">COPC rate = With COPC / current active portfolio; missing and unknown statuses are shown separately • Generated from RSU EOMS Decision Support System</div>
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
                    : p.copcStatus === 'No COPC'
                      ? '<span style="color:#dc2626;">NO COPC</span>'
                      : p.copcStatus === 'No Record'
                        ? '<span style="color:#64748b;">NO AY RECORD</span>'
                        : '<span style="color:#7c3aed;">STATUS UNKNOWN</span>'
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
                <th>Programs with RQAT</th>
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
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3.5">
        <Card className="border-primary/10 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                Total Active Programs
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{currentYearStats.total}</h3>
              <p className="text-[9px] font-semibold text-slate-500 mt-0.5">AY {selectedYear} Registry</p>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">Marked With COPC</p>
              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl font-black text-emerald-700">{currentYearStats.withCopc}</h3>
                <span className="text-xs font-black text-emerald-600">({currentYearStats.rate}%)</span>
              </div>
              <p className="text-[9px] font-semibold text-emerald-600 mt-0.5">Share of active portfolio</p>
            </div>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-800 tracking-wider">COPC In Progress</p>
              <h3 className="text-2xl font-black text-amber-700 mt-1">{currentYearStats.inProgress}</h3>
              <p className="text-[9px] font-semibold text-amber-600 mt-0.5">Pending RQAT/CHED</p>
            </div>
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-200 shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-rose-800 tracking-wider">Explicitly No COPC</p>
              <h3 className="text-2xl font-black text-rose-700 mt-1">{currentYearStats.noCopc}</h3>
              <p className="text-[9px] font-semibold text-rose-600 mt-0.5">Status recorded</p>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm bg-gradient-to-br from-slate-50 to-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-700 tracking-wider">No AY Record</p>
              <h3 className="text-2xl font-black text-slate-700 mt-1">{currentYearStats.noRecord}</h3>
              <p className="text-[9px] font-semibold text-slate-500 mt-0.5">Monitoring data missing</p>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
              <FileText className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-200 shadow-sm bg-gradient-to-br from-violet-50/50 to-white">
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-violet-800 tracking-wider">Status Unknown</p>
              <h3 className="text-2xl font-black text-violet-700 mt-1">{currentYearStats.unknown}</h3>
              <p className="text-[9px] font-semibold text-violet-600 mt-0.5">Record needs completion</p>
            </div>
            <div className="p-2.5 bg-violet-100 text-violet-700 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab('student-warnings')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') setActiveTab('student-warnings');
          }}
          className={cn(
            'shadow-sm cursor-pointer transition-all hover:scale-[1.01]',
            warningStats.warningProgramsCount > 0
              ? 'border-amber-400 bg-gradient-to-br from-amber-500/10 via-background to-orange-500/10 ring-1 ring-amber-400/50'
              : 'border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white',
          )}
        >
          <CardContent className="p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-300 tracking-wider">
                Student Data Warnings
              </p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <h3 className="text-2xl font-black text-amber-800 dark:text-amber-200">
                  {warningStats.warningProgramsCount}
                </h3>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">Programs</span>
              </div>
              <p className="text-[9px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                {warningStats.missingEnrollmentCount} Enr • {warningStats.missingGraduationCount} Grad •{' '}
                {warningStats.missingBoardCount} Board
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-300/40">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col">
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
                <TabsTrigger
                  value="student-warnings"
                  className="text-[9px] font-black uppercase tracking-widest px-4 h-7 gap-1.5 text-amber-700 dark:text-amber-300 data-[state=active]:bg-amber-600 data-[state=active]:text-white font-black"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Student Data Warnings (
                  {warningStats.warningProgramsCount})
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Regulatory Compliance System
              </div>
            </div>

            {/* TAB: Student Data Warnings */}
            <TabsContent value="student-warnings" className="p-5 m-0 space-y-4">
              <AcademicUnitChedWarningsCard
                programs={activePrograms}
                compliances={compliances}
                selectedYear={selectedYear}
              />
            </TabsContent>

            {/* TAB 1: Yearly COPC Trend */}
            <TabsContent value="yearly-trend" className="m-0">
              {/* ── COPC by Degree Level Visualization ── */}
              {copcLevelBreakdown.length > 0 && (
                <div className="p-5 border-b bg-gradient-to-br from-emerald-50/40 to-teal-50/30 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-emerald-700" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                      Current Active Portfolio COPC Status by Degree Level — AY {selectedYear}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {copcLevelBreakdown.map((entry) => {
                      const copcPct = entry.rate;
                      const inProgressPct = entry.total > 0 ? Math.round((entry.inProgress / entry.total) * 100) : 0;
                      const noCopcPct = entry.total > 0 ? Math.round((entry.noCopc / entry.total) * 100) : 0;
                      const noRecordPct = entry.total > 0 ? Math.round((entry.noRecord / entry.total) * 100) : 0;
                      const unknownPct = entry.total > 0 ? Math.round((entry.unknown / entry.total) * 100) : 0;

                      // SVG ring/donut chart parameters
                      const radius = 44;
                      const circumference = 2 * Math.PI * radius;
                      const segments = [
                        { count: entry.withCopc, color: '#059669' },
                        { count: entry.inProgress, color: '#d97706' },
                        { count: entry.noCopc, color: '#f87171' },
                        { count: entry.noRecord, color: '#94a3b8' },
                        { count: entry.unknown, color: '#8b5cf6' },
                      ];
                      let consumedLength = 0;
                      const ringSegments = segments.map((segment) => {
                        const length = (segment.count / entry.total) * circumference;
                        const segmentData = {
                          ...segment,
                          length,
                          offset: circumference * 0.25 - consumedLength,
                        };
                        consumedLength += length;
                        return segmentData;
                      });

                      const isUndergrad = entry.level === 'Undergraduate';
                      const isGrad = entry.level === 'Graduate';
                      const ringColor = isUndergrad ? '#059669' : isGrad ? '#0ea5e9' : '#a855f7';
                      const bgGrad = isUndergrad
                        ? 'from-emerald-50 to-white border-emerald-200'
                        : isGrad
                          ? 'from-sky-50 to-white border-sky-200'
                          : 'from-purple-50 to-white border-purple-200';
                      const titleColor = isUndergrad ? 'text-emerald-800' : isGrad ? 'text-sky-800' : 'text-purple-800';
                      const Icon = isUndergrad ? BookOpen : isGrad ? FlaskConical : GraduationCap;

                      return (
                        <div
                          key={entry.level}
                          className={cn(
                            'bg-gradient-to-br rounded-xl border p-4 shadow-sm flex items-center gap-5',
                            bgGrad,
                          )}
                        >
                          {/* Donut ring chart */}
                          <div className="shrink-0 relative">
                            <svg width="100" height="100" viewBox="0 0 100 100">
                              {/* Background track */}
                              <circle cx="50" cy="50" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="10" />
                              {ringSegments
                                .filter((segment) => segment.count > 0)
                                .map((segment, index) => (
                                  <circle
                                    key={`${entry.level}-${index}`}
                                    cx="50"
                                    cy="50"
                                    r={radius}
                                    fill="none"
                                    stroke={segment.color}
                                    strokeWidth="10"
                                    strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                                    strokeDashoffset={segment.offset}
                                  />
                                ))}
                              {/* Center text */}
                              <text x="50" y="45" textAnchor="middle" fontSize="16" fontWeight="900" fill={ringColor}>
                                {copcPct}%
                              </text>
                              <text x="50" y="60" textAnchor="middle" fontSize="8" fontWeight="700" fill="#64748b">
                                WITH COPC
                              </text>
                            </svg>
                          </div>

                          {/* Stats */}
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Icon className={cn('h-4 w-4', titleColor)} />
                              <span className={cn('text-sm font-black uppercase tracking-wider', titleColor)}>
                                {entry.level}
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-semibold -mt-1">
                              {entry.total} current active programs; counts reflect AY {selectedYear} records
                            </p>

                            {/* Bar breakdown */}
                            <div className="space-y-1.5 pt-1">
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-[9px] font-black text-emerald-700">With COPC</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                    style={{ width: `${copcPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-emerald-700 w-14 text-right">
                                  {entry.withCopc} ({copcPct}%)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-[9px] font-black text-amber-700">In Progress</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${inProgressPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-amber-700 w-14 text-right">
                                  {entry.inProgress} ({inProgressPct}%)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-[9px] font-black text-rose-700">No COPC</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-rose-400 rounded-full transition-all duration-500"
                                    style={{ width: `${noCopcPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-rose-700 w-14 text-right">
                                  {entry.noCopc} ({noCopcPct}%)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-[9px] font-black text-slate-600">No AY Record</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-slate-400 rounded-full transition-all duration-500"
                                    style={{ width: `${noRecordPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-slate-600 w-14 text-right">
                                  {entry.noRecord} ({noRecordPct}%)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-24 text-[9px] font-black text-violet-700">Status Unknown</span>
                                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-violet-500 rounded-full transition-all duration-500"
                                    style={{ width: `${unknownPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-black text-violet-700 w-14 text-right">
                                  {entry.unknown} ({unknownPct}%)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary total row */}
                  <div className="bg-white/80 rounded-lg border border-emerald-100 px-4 py-2.5 flex flex-wrap items-center gap-4">
                    <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                      Overall COPC Summary:
                    </span>
                    {copcLevelBreakdown.map((entry) => (
                      <div key={entry.level} className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'text-[8px] font-black px-2 py-0.5 rounded-full',
                            entry.level === 'Undergraduate'
                              ? 'bg-emerald-100 text-emerald-800'
                              : entry.level === 'Graduate'
                                ? 'bg-sky-100 text-sky-800'
                                : 'bg-purple-100 text-purple-800',
                          )}
                        >
                          {entry.level}: {entry.withCopc}/{entry.total} ({entry.rate}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="px-5 pt-3 text-[10px] text-slate-500">
                COPC rate is programs marked With COPC divided by the current active portfolio. Programs without a
                selected-year record or with an unknown status remain visible in the denominator and are listed
                separately.
              </p>
              <ScrollArea className="max-h-[520px]">
                <Table>
                  <TableHeader className="bg-slate-50/80 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider w-[130px]">
                        Academic Year
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        Current Portfolio
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
                      <TableHead className="text-[9px] font-black uppercase text-slate-600 tracking-wider text-center">
                        No AY Record
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-violet-700 tracking-wider text-center">
                        Status Unknown
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        COPC Rate
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
                            <span className="font-black text-slate-600 text-sm">{row.noRecord}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-violet-700 text-sm">{row.unknown}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  'text-sm font-black tabular-nums',
                                  row.copcRate >= COPC_PRIORITY_THRESHOLD
                                    ? 'text-emerald-600'
                                    : row.copcRate >= COPC_URGENT_THRESHOLD
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
              {/* Decision | Action | Outcome | Learning section */}
              <div className="p-5 mt-5 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-xl space-y-4">
                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">Decision</h3>
                <p className="text-sm text-slate-700">{decisionSummary}</p>

                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-4">Action Items</h3>
                {actionItems.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                    {actionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-700">
                    No COPC, record, or required-evidence gaps were identified in the current AY snapshot.
                  </p>
                )}

                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-4">
                  Expected Outcome
                </h3>
                <p className="text-sm text-slate-700">
                  Use the recorded COPC rate and the separate missing-record, unknown-status, and evidence counts to
                  monitor follow-up. This dashboard does not determine certificate expiry or regulatory validity.
                </p>

                <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mt-4">
                  Institutional Learning
                </h3>
                <p className="text-sm text-slate-700">{institutionalLearning}</p>
              </div>
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
                    <SelectTrigger className="h-8 w-[120px] text-xs bg-white border-slate-200">
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
                      <SelectItem value="No Record" className="text-[10px] font-bold text-slate-600">
                        No AY Record
                      </SelectItem>
                      <SelectItem value="Status Unknown" className="text-[10px] font-bold text-violet-700">
                        Status Unknown
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={detailWarningFilter} onValueChange={setDetailWarningFilter}>
                    <SelectTrigger
                      className={cn(
                        'h-8 w-[155px] text-xs bg-white border-slate-200',
                        detailWarningFilter !== 'all' && 'border-amber-400 bg-amber-50/60 text-amber-900 font-bold',
                      )}
                    >
                      <SelectValue placeholder="Data Warnings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[10px] font-bold">
                        All Data Status
                      </SelectItem>
                      <SelectItem value="warnings" className="text-[10px] font-bold text-amber-600">
                        ⚠️ With Warnings ({warningStats.warningProgramsCount})
                      </SelectItem>
                      <SelectItem value="enrollment" className="text-[10px] font-bold text-rose-600">
                        👥 Missing Enrollment ({warningStats.missingEnrollmentCount})
                      </SelectItem>
                      <SelectItem value="graduation" className="text-[10px] font-bold text-orange-600">
                        🎓 Missing Graduation ({warningStats.missingGraduationCount})
                      </SelectItem>
                      <SelectItem value="board" className="text-[10px] font-bold text-purple-600">
                        📋 Missing Board Exams ({warningStats.missingBoardCount})
                      </SelectItem>
                      <SelectItem value="docs" className="text-[10px] font-bold text-blue-600">
                        📄 Missing Evidence ({documentWarningCount})
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
                      <SelectItem value="warnings" className="text-[10px] font-bold text-amber-700">
                        Sort: Most Warnings
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
                      <TableHead className="text-[9px] font-black uppercase text-amber-700 tracking-wider">
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> CHED Student Data
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
                        <TableCell colSpan={9} className="text-center py-16">
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
                          <TableCell>{copcBadge(item.copcStatus)}</TableCell>
                          <TableCell>
                            {item.warningSummary.hasWarnings ? (
                              <div className="flex flex-wrap items-center gap-1 max-w-[240px]">
                                {item.warningSummary.missingEnrollment && (
                                  <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[8px] font-black py-0 px-1 hover:bg-rose-100">
                                    No Enrollment
                                  </Badge>
                                )}
                                {item.warningSummary.missingGraduation && (
                                  <Badge className="bg-orange-50 text-orange-700 border-orange-200 text-[8px] font-black py-0 px-1 hover:bg-orange-100">
                                    No Grad Stats
                                  </Badge>
                                )}
                                {item.warningSummary.missingBoard && (
                                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[8px] font-black py-0 px-1 hover:bg-purple-100">
                                    No Board Data
                                  </Badge>
                                )}
                                {item.warningSummary.missingDocuments && (
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[8px] font-black py-0 px-1 hover:bg-blue-100">
                                    Evidence Missing
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[8px] font-black py-0 px-1.5 flex items-center gap-0.5 w-fit">
                                <CheckCircle2 className="h-2.5 w-2.5" /> Complete
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
