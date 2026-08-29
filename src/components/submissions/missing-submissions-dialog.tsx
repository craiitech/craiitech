'use client';

import React, { useMemo, useState } from 'react';
import type { Submission, Unit, Campus, Signatories, Cycle } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Printer,
  AlertTriangle,
  Building2,
  Calendar,
  School,
  FileCheck2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissingSubmissionsReport, type MissingSubmissionRow } from './notices-print-templates';
import { isCycleActive } from '@/lib/utils';
import { submissionTypes } from '@/lib/constants';

export type EOMSCommunicationType =
  'QA Memorandum' | 'QA Office Memorandum' | 'QA Office Order' | 'Office Memorandum' | 'Office Order';

interface MissingSubmissionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  allCampuses: Campus[] | null;
  allUnits: Unit[] | null;
  allSubmissions: Submission[] | null;
  allCycles?: Cycle[] | null;
  signatories?: Signatories | null;
  selectedYear?: string;
  defaultCampusId?: string;
  defaultUnitId?: string;
}

export function MissingSubmissionsDialog({
  isOpen,
  onOpenChange,
  allCampuses,
  allUnits,
  allSubmissions,
  allCycles,
  signatories,
  selectedYear = new Date().getFullYear().toString(),
  defaultCampusId,
  defaultUnitId,
}: MissingSubmissionsDialogProps) {
  // Document Scope & Filter Controls
  const [targetScope, setTargetScope] = useState<'all' | 'campus' | 'unit'>(
    defaultUnitId ? 'unit' : defaultCampusId ? 'campus' : 'all',
  );
  const [academicYear, setAcademicYear] = useState<string>(selectedYear);
  const [submissionCycle, setSubmissionCycle] = useState<'all' | 'first' | 'final'>('all');
  const [campusFilter, setCampusFilter] = useState<string>(defaultCampusId || 'all');
  const [unitFilter, setUnitFilter] = useState<string>(defaultUnitId || 'all');
  const [communicationType, setCommunicationType] = useState<EOMSCommunicationType>('QA Memorandum');
  const [paperSize, setPaperSize] = useState<'folio' | 'letter' | 'a4'>('folio');

  // Signatory, Date, and Reference Controls
  const [memoRefNo, setMemoRefNo] = useState<string>(`${selectedYear}-${format(new Date(), 'MMdd')}`);
  const [memoDate, setMemoDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(5);
  const [includeNoted, setIncludeNoted] = useState<boolean>(true);
  const [selectedQaoDirector, setSelectedQaoDirector] = useState<string>(
    signatories?.qaoDirector || 'SARAH JANE F. FALLARIA',
  );
  const [selectedQmsHead, setSelectedQmsHead] = useState<string>(
    signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)',
  );
  const [customDirective, setCustomDirective] = useState<string>(
    'Accountable Unit Heads, Program Chairs, and Campus Leads are directed to convene their respective QMS teams and upload all completed document requirements into the RSU EOMS Submission Portal without further delay.',
  );

  const campusMap = useMemo(() => new Map((allCampuses || []).map((c) => [c.id, c.name])), [allCampuses]);
  const unitMap = useMemo(() => new Map((allUnits || []).map((u) => [u.id, u.name])), [allUnits]);

  // Filter available units based on campusFilter
  const availableUnits = useMemo(() => {
    if (!allUnits) return [];
    if (campusFilter === 'all') return allUnits;
    return allUnits.filter((u) => u.campusIds?.includes(campusFilter));
  }, [allUnits, campusFilter]);

  // Compute Missing Submissions Rows
  const missingRows = useMemo<MissingSubmissionRow[]>(() => {
    if (!allCampuses || !allUnits || !allSubmissions) return [];

    const rows: MissingSubmissionRow[] = [];

    allCampuses.forEach((campus) => {
      // Filter by campus if specified
      if (targetScope === 'campus' && campusFilter !== 'all' && campus.id !== campusFilter) return;
      if (campusFilter !== 'all' && campus.id !== campusFilter) return;

      const campusUnits = allUnits
        .filter((u) => u.campusIds?.includes(campus.id))
        .sort((a, b) => a.name.localeCompare(b.name));

      campusUnits.forEach((unit) => {
        // Filter by unit if specified
        if (targetScope === 'unit' && unitFilter !== 'all' && unit.id !== unitFilter) return;

        const unitSubs = allSubmissions.filter(
          (s) => s.unitId === unit.id && s.campusId === campus.id && s.year.toString() === academicYear,
        );

        const getMissingForCycle = (cycleId: 'first' | 'final', cycleLabel: string) => {
          if (!isCycleActive(cycleId, academicYear, allCycles)) return;

          const cycleSubs = unitSubs.filter((s) => s.cycleId === cycleId);
          const registry = cycleSubs.find((s) => s.reportType === 'Risk and Opportunity Registry');
          const isActionPlanNA = registry?.riskRating === 'low';

          const missing = submissionTypes.filter((type) => {
            const existing = cycleSubs.find((s) => s.reportType === type);
            if (existing && (existing.statusId === 'submitted' || existing.statusId === 'approved')) return false;
            if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
            return true;
          });

          if (missing.length > 0) {
            rows.push({
              campusName: campus.name,
              unitName: unit.name,
              documents: missing,
              cycle: cycleLabel,
            });
          }
        };

        if (submissionCycle === 'all' || submissionCycle === 'first') {
          getMissingForCycle('first', 'First Submission Cycle');
        }
        if (submissionCycle === 'all' || submissionCycle === 'final') {
          getMissingForCycle('final', 'Final Submission Cycle');
        }
      });
    });

    return rows;
  }, [
    allCampuses,
    allUnits,
    allSubmissions,
    allCycles,
    academicYear,
    submissionCycle,
    targetScope,
    campusFilter,
    unitFilter,
  ]);

  const totalMissingDocuments = useMemo(
    () => missingRows.reduce((acc, r) => acc + r.documents.length, 0),
    [missingRows],
  );
  const uniqueDelinquentUnits = useMemo(
    () => new Set(missingRows.map((r) => `${r.campusName}-${r.unitName}`)).size,
    [missingRows],
  );

  const cycleDisplayLabel =
    submissionCycle === 'first'
      ? 'First Submission Cycle'
      : submissionCycle === 'final'
        ? 'Final Submission Cycle'
        : 'All Submission Cycles (First & Final)';

  const targetCampusName = campusFilter !== 'all' ? campusMap.get(campusFilter) : 'All Campuses (University-Wide)';
  const targetUnitName = unitFilter !== 'all' ? unitMap.get(unitFilter) : undefined;

  const handlePrint = () => {
    if (missingRows.length === 0) return;

    try {
      const reportHtml = renderToStaticMarkup(
        <MissingSubmissionsReport
          year={Number(academicYear)}
          cycleLabel={cycleDisplayLabel}
          qaoDirector={selectedQaoDirector}
          qmsHead={selectedQmsHead}
          rows={missingRows}
          communicationType={communicationType}
          includeNoted={includeNoted}
          memoRefNo={memoRefNo}
          memoDate={memoDate}
          gracePeriodDays={gracePeriodDays}
          customDirective={customDirective}
          targetScope={targetScope}
          targetCampusName={targetCampusName}
          targetUnitName={targetUnitName}
          paperSize={paperSize}
        />,
      );

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${communicationType} - Missing EOMS Submissions (AY ${academicYear})</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                @page { 
                  size: ${paperSize === 'folio' ? '8.5in 13in' : paperSize === 'a4' ? '8.27in 11.69in' : '8.5in 11in'} !important; 
                  margin: 0 !important; 
                }
                * { box-sizing: border-box !important; }
                body { 
                  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                  background: #e2e8f0; 
                  padding: 24px 0; 
                  margin: 0;
                  color: black; 
                }
                .memo-root-document { 
                  margin: 0 auto !important; 
                  width: 8.5in !important; 
                }
                .memo-page-1, .memo-attachment-page {
                  width: 8.5in !important;
                  min-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                  background: white !important;
                  position: relative !important;
                  box-sizing: border-box !important;
                  padding: 0.35in 0.45in 0.75in 0.45in !important;
                  margin: 0 auto 30px auto !important;
                  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12) !important;
                }
                .memo-footer-banner {
                  position: absolute !important;
                  bottom: 0.25in !important;
                  left: 0.45in !important;
                  right: 0.45in !important;
                }
                @media print { 
                  html, body { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    background: white !important; 
                    -webkit-print-color-adjust: exact !important; 
                    print-color-adjust: exact !important; 
                  } 
                  .no-print { display: none !important; } 
                  #print-content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                  .memo-root-document { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                  .memo-page-1 {
                    page-break-after: always !important;
                    break-after: page !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    position: relative !important;
                    box-sizing: border-box !important;
                    padding: 0.35in 0.45in 0.75in 0.45in !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    width: 8.5in !important;
                    height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                    max-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                    overflow: hidden !important;
                  }
                  .memo-attachment-page {
                    page-break-before: always !important;
                    break-before: page !important;
                    position: relative !important;
                    box-sizing: border-box !important;
                    padding: 0.35in 0.45in 0.75in 0.45in !important;
                    margin: 0 !important;
                    box-shadow: none !important;
                    width: 8.5in !important;
                    min-height: ${paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in'} !important;
                  }
                  .memo-footer-banner {
                    position: absolute !important;
                    bottom: 0.25in !important;
                    left: 0.45in !important;
                    right: 0.45in !important;
                  }
                } 
                table { border-collapse: collapse !important; width: 100% !important; }
                td, th { overflow: hidden; word-wrap: break-word; }
              </style>
            </head>
            <body>
              <div class="no-print mb-6 flex justify-center">
                <button onclick="window.print()" class="bg-emerald-700 hover:bg-emerald-800 text-white font-sans font-black px-8 py-3 rounded-lg shadow-xl uppercase text-xs tracking-widest transition-all">
                  Click to Print QA Memorandum (Folio 8.5x13 Format)
                </button>
              </div>
              <div id="print-content">
                ${reportHtml}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Print error:', err);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* MODAL HEADER */}
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-emerald-50/80 via-slate-50 to-amber-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-sm">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  EOMS Missing Submissions Memorandum &amp; Audit Generator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                  Configure institutional memorandum metadata, scope filtering, directives, and release signatories.
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase font-bold border-emerald-600 text-emerald-700 dark:text-emerald-400"
            >
              Folio 8.5&quot; × 13&quot;
            </Badge>
          </div>
        </DialogHeader>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-900 dark:text-slate-100">
          {/* LIVE SUMMARY BANNER */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-center">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border shadow-xs">
              <span className="text-[10px] font-black uppercase text-slate-500 block">Total Delinquent Units</span>
              <span className="text-xl font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {uniqueDelinquentUnits}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300">
              <span className="text-[10px] font-black uppercase block">Missing Documents</span>
              <span className="text-xl font-black tabular-nums">{totalMissingDocuments}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300">
              <span className="text-[10px] font-black uppercase block">Reporting Format</span>
              <span className="text-xs font-black uppercase mt-1 block">Page 1 Notice + Att. A</span>
            </div>
          </div>

          {/* SECTION 1: TARGETING & DOCUMENT SCOPE */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                1. Scope &amp; Target Distribution
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Document Scope
                </Label>
                <Select
                  value={targetScope}
                  onValueChange={(val: 'all' | 'campus' | 'unit') => {
                    setTargetScope(val);
                    if (val === 'all') {
                      setCampusFilter('all');
                      setUnitFilter('all');
                    }
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      Institutional (All Units)
                    </SelectItem>
                    <SelectItem value="campus" className="text-xs font-bold">
                      By Specific Campus
                    </SelectItem>
                    <SelectItem value="unit" className="text-xs font-bold">
                      By Specific Unit
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Campus Filter
                </Label>
                <Select
                  value={campusFilter}
                  onValueChange={(val) => {
                    setCampusFilter(val);
                    setUnitFilter('all');
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      All Campuses (University-Wide)
                    </SelectItem>
                    {(allCampuses || []).map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-bold">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Specific Unit Filter
                </Label>
                <Select
                  value={unitFilter}
                  onValueChange={setUnitFilter}
                  disabled={targetScope !== 'unit' && campusFilter === 'all'}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      All Filtered Units
                    </SelectItem>
                    {availableUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs font-bold">
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Academic Year
                </Label>
                <Select value={academicYear} onValueChange={setAcademicYear}>
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2028, 2027, 2026, 2025, 2024, 2023].map((yr) => (
                      <SelectItem key={yr} value={yr.toString()} className="text-xs font-bold">
                        Academic Year {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Submission Cycle
                </Label>
                <Select
                  value={submissionCycle}
                  onValueChange={(val: 'all' | 'first' | 'final') => setSubmissionCycle(val)}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Submission Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      All Cycles (First &amp; Final)
                    </SelectItem>
                    <SelectItem value="first" className="text-xs font-bold">
                      First Submission Cycle Only
                    </SelectItem>
                    <SelectItem value="final" className="text-xs font-bold">
                      Final Submission Cycle Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 2: COMMUNICATION TYPE & METADATA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Communication Type, Reference &amp; Issuance
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Communication Type
                </Label>
                <Select
                  value={communicationType}
                  onValueChange={(val: EOMSCommunicationType) => setCommunicationType(val)}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Communication Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QA Memorandum" className="text-xs font-bold">
                      QA Memorandum
                    </SelectItem>
                    <SelectItem value="QA Office Memorandum" className="text-xs font-bold">
                      QA Office Memorandum
                    </SelectItem>
                    <SelectItem value="QA Office Order" className="text-xs font-bold">
                      QA Office Order
                    </SelectItem>
                    <SelectItem value="Office Memorandum" className="text-xs font-bold">
                      Office Memorandum
                    </SelectItem>
                    <SelectItem value="Office Order" className="text-xs font-bold">
                      Office Order
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Reference Number
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">RSU-QAO-MIS-</span>
                  <Input
                    value={memoRefNo}
                    onChange={(e) => setMemoRefNo(e.target.value)}
                    className="h-9 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-950"
                    placeholder="2026-0829"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Issuance Date
                </Label>
                <Input
                  type="date"
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                  className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Compliance Grace Period (Working Days)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={30}
                  value={gracePeriodDays}
                  onChange={(e) => setGracePeriodDays(Number(e.target.value) || 5)}
                  className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Paper Layout Size
                </Label>
                <Select value={paperSize} onValueChange={(val: 'folio' | 'letter' | 'a4') => setPaperSize(val)}>
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Paper Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folio" className="text-xs font-bold">
                      Folio (8.5&quot; × 13&quot; Standard)
                    </SelectItem>
                    <SelectItem value="a4" className="text-xs font-bold">
                      A4 (8.27&quot; × 11.69&quot;)
                    </SelectItem>
                    <SelectItem value="letter" className="text-xs font-bold">
                      Letter (8.5&quot; × 11&quot;)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                Custom Directive Narrative
              </Label>
              <Textarea
                rows={2}
                value={customDirective}
                onChange={(e) => setCustomDirective(e.target.value)}
                className="text-xs font-medium bg-slate-50 dark:bg-slate-950 resize-none"
                placeholder="Specific instructions to accountable heads..."
              />
            </div>
          </div>

          {/* SECTION 3: SIGNATORIES & NOTED BY */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Building2 className="h-4 w-4 text-emerald-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                3. Issuing Signatories &amp; Noted By
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Issued By (QMS Head / Lead Auditor)
                </Label>
                <Input
                  value={selectedQmsHead}
                  onChange={(e) => setSelectedQmsHead(e.target.value)}
                  className="h-9 text-xs font-bold uppercase bg-slate-50 dark:bg-slate-950"
                  placeholder="HEAD, QUALITY MANAGEMENT SYSTEM"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                    Noted By (QA Director)
                  </Label>
                  <div className="flex items-center space-x-1.5">
                    <Checkbox
                      id="needs-noted-eoms"
                      checked={includeNoted}
                      onCheckedChange={(c) => setIncludeNoted(!!c)}
                    />
                    <label
                      htmlFor="needs-noted-eoms"
                      className="text-[10px] font-bold text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                    >
                      Include NOTED BY
                    </label>
                  </div>
                </div>

                <Input
                  value={selectedQaoDirector}
                  onChange={(e) => setSelectedQaoDirector(e.target.value)}
                  disabled={!includeNoted}
                  className="h-9 text-xs font-bold uppercase bg-slate-50 dark:bg-slate-950 disabled:opacity-50"
                  placeholder="SARAH JANE F. FALLARIA"
                />
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <DialogFooter className="p-4 border-t bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between sm:justify-between">
          <div className="text-[11px] text-muted-foreground font-medium hidden sm:block">
            {missingRows.length > 0 ? (
              <span>
                Ready to generate notice for <strong>{missingRows.length}</strong> missing records.
              </span>
            ) : (
              <span className="text-emerald-600 font-bold">100% Documentation parity for this selection!</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs font-bold uppercase tracking-wider"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                handlePrint();
              }}
              disabled={missingRows.length === 0}
              className="h-9 text-xs font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Generate &amp; Print Memorandum
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
