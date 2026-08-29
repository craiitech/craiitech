'use client';

import React, { useState, useMemo, useEffect } from 'react';
import type { Risk, Signatories, Unit, Campus, Submission } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Printer,
  Sparkles,
  SlidersHorizontal,
  Briefcase,
  BellRing,
  Clock,
  ShieldCheck,
  ChevronRight,
  School,
  Building,
  FileText,
  Filter,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RORPrintTemplate } from '@/components/risk/ror-print-template';
import {
  ExecutiveRiskBriefingTemplate,
  RiskResourceAllocationTemplate,
  RiskAccountabilityTrackerTemplate,
  RiskEffectivenessAuditTemplate,
  OpportunityInnovationTemplate,
  RiskStatusReminderNoticeTemplate,
  UnitNonSubmissionAuditTemplate,
  RiskDecisionMemorandumPage,
  type UnitComplianceAuditItem,
} from '@/components/risk/risk-decision-print-templates';
import { cn, normalizeReportType } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { submissionTypes } from '@/lib/constants';

export type DecisionReportType =
  | 'status-reminder'
  | 'non-submission-audit'
  | 'executive-briefing'
  | 'resource-allocation'
  | 'accountability-tracker'
  | 'effectiveness-audit'
  | 'opportunity-scorecard'
  | 'ror-standard';

interface RiskDecisionReportsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filteredRisks: Risk[];
  selectedYear: number;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  allCampuses?: Campus[];
  allUnits?: Unit[];
  allSubmissions?: Submission[];
  signatories?: Signatories;
  currentCycle?: 'first' | 'final';
  defaultReportId?: DecisionReportType;
}

interface ReportOption {
  id: DecisionReportType;
  title: string;
  category: string;
  badge: string;
  badgeColor: string;
  description: string;
  icon: React.ElementType;
  pageSize: string;
  orientation: 'landscape' | 'portrait';
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    id: 'non-submission-audit',
    title: 'EOMS & Risk Digital Registry Non-Submission & Deficiency Audit',
    category: 'Institutional Governance',
    badge: 'Decision Support: Compliance Gap',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    description:
      'Executive decision-support tool cross-examining which units have NOT yet submitted their 6 required EOMS documents and Digital Risk Register entries across campuses.',
    icon: AlertTriangle,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'status-reminder',
    title: 'Unit Risk Treatment Status & Action Reminder Notice',
    category: 'Institutional Directive',
    badge: 'Reminder Memorandum',
    badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
    description:
      'Official memorandum to Unit and Campus heads detailing all pending and overdue risk treatments, compliance directives, and evidence submission instructions.',
    icon: BellRing,
    pageSize: '11.5in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'executive-briefing',
    title: 'Executive Risk Profile & Decision Briefing',
    category: 'Top Management',
    badge: 'Management Review',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    description:
      'High-level summary synthesizing institutional risk concentration, magnitude reduction index, top critical vulnerabilities, and governance directives for the President & VPs.',
    icon: Briefcase,
    pageSize: '11in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'resource-allocation',
    title: 'RAP & Resource Allocation Blueprint',
    category: 'Budget & Planning',
    badge: 'Funding Justification',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description:
      'Consolidates all resource requirements (budget, IT, staffing, infrastructure) needed to execute committed risk treatment plans for annual procurement & budget hearings.',
    icon: SlidersHorizontal,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'accountability-tracker',
    title: 'Accountability & Overdue Milestone Tracker',
    category: 'Operations',
    badge: 'Action Velocity',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description:
      'Tracks focal person accountability, overdue mitigation milestones, reminders sent, and pending action items across units.',
    icon: Clock,
    pageSize: '12in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'effectiveness-audit',
    title: 'Residual Risk & Treatment Effectiveness Dossier',
    category: 'Quality Assurance & Audit',
    badge: 'ISO 21001 Clause 6.1',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description:
      'Audit matrix evaluating pre vs post treatment magnitude drops (Delta), documentary evidence compliance, and auditor sign-offs for ISO & AACCUP accreditors.',
    icon: ShieldCheck,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'opportunity-scorecard',
    title: 'Opportunity Capitalization Scorecard',
    category: 'Innovation & Strategy',
    badge: 'Strategic Growth',
    badgeColor: 'bg-sky-100 text-sky-800 border-sky-200',
    description:
      'Evaluates institutional opportunity capture rates, realized academic partnerships, research grants, and strategic advancements.',
    icon: Sparkles,
    pageSize: '11.5in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'ror-standard',
    title: 'Official Risk & Opportunity Register (ROR)',
    category: 'Compliance Standard',
    badge: 'Official Template',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
    description:
      'Standard tabular landscape register listing all operational objectives, likelihood/consequence metrics, controls, and treatment plans.',
    icon: FileText,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
];

export function RiskDecisionReportsDialog({
  isOpen,
  onOpenChange,
  filteredRisks,
  selectedYear,
  unitMap,
  campusMap,
  allCampuses = [],
  allUnits = [],
  allSubmissions = [],
  signatories,
  currentCycle = 'final',
  defaultReportId = 'non-submission-audit',
}: RiskDecisionReportsDialogProps) {
  const [activeYear, setActiveYear] = useState<number>(Number(selectedYear) || new Date().getFullYear());
  const [selectedReportId, setSelectedReportId] = useState<DecisionReportType>(defaultReportId);
  const [cycle, setCycle] = useState<'first' | 'final'>(currentCycle);
  const [selectedCampusScope, setSelectedCampusScope] = useState<string>('all');
  const [selectedUnitScope, setSelectedUnitScope] = useState<string>('all');
  const [selectedStatusScope, setSelectedStatusScope] = useState<string>('all');

  useEffect(() => {
    if (selectedYear) {
      setActiveYear(Number(selectedYear));
    }
  }, [selectedYear]);

  // Compute available years list dynamically from data + reasonable range
  const yearsList = useMemo(() => {
    const yrSet = new Set<number>();
    const current = new Date().getFullYear();
    for (let i = -3; i <= 3; i++) yrSet.add(current + i);
    if (selectedYear) yrSet.add(Number(selectedYear));
    filteredRisks?.forEach((r) => {
      if (r.year) yrSet.add(Number(r.year));
    });
    allSubmissions?.forEach((s) => {
      if (s.year) yrSet.add(Number(s.year));
    });
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [filteredRisks, allSubmissions, selectedYear]);

  // Filter available units based on selected campus
  const availableUnitsForCampus = useMemo(() => {
    if (selectedCampusScope === 'all') return allUnits;
    return allUnits.filter(
      (u) => !u.campusIds || u.campusIds.length === 0 || u.campusIds.includes(selectedCampusScope),
    );
  }, [allUnits, selectedCampusScope]);

  // Filter risks based on target year, campus, status, and unit filters
  const processedRisks = useMemo(() => {
    const today = new Date();
    return filteredRisks.filter((r) => {
      // 0. Year Filter
      if (r.year && Number(r.year) !== Number(activeYear)) {
        return false;
      }

      // 1. Campus Site Filter
      if (selectedCampusScope !== 'all' && r.campusId !== selectedCampusScope) {
        return false;
      }

      // 2. Status Filter
      if (selectedStatusScope !== 'all') {
        if (selectedStatusScope === 'action-required') {
          if (r.status === 'Closed') return false;
        } else if (selectedStatusScope === 'overdue') {
          if (r.status === 'Closed') return false;
          if (!r.targetDate) return false;
          const target = r.targetDate?.toDate ? r.targetDate.toDate() : new Date(r.targetDate);
          if (isNaN(target.getTime()) || target >= today) return false;
        } else if (r.status !== selectedStatusScope) {
          return false;
        }
      }

      return true;
    });
  }, [filteredRisks, activeYear, selectedCampusScope, selectedStatusScope]);

  // Group risks by unit
  const unitsInFilter = useMemo(() => {
    const map = new Map<string, Risk[]>();
    processedRisks.forEach((r) => {
      if (!map.has(r.unitId)) map.set(r.unitId, []);
      map.get(r.unitId)!.push(r);
    });
    return Array.from(map.entries()).map(([uId, rList]) => {
      let resolvedCampusName = 'Institutional';
      if (selectedCampusScope !== 'all') {
        resolvedCampusName = campusMap.get(selectedCampusScope) || 'Institutional';
      } else {
        const uniqueCampusIds = Array.from(new Set(rList.map((r) => r.campusId).filter(Boolean)));
        if (uniqueCampusIds.length === 1) {
          resolvedCampusName = campusMap.get(uniqueCampusIds[0]) || 'Institutional';
        } else if (uniqueCampusIds.length > 1) {
          resolvedCampusName = 'All Campuses (University-Wide)';
        } else {
          resolvedCampusName = 'Institutional';
        }
      }

      return {
        unitId: uId,
        unitName: unitMap.get(uId) || 'Unknown Unit',
        campusName: resolvedCampusName,
        risks: rList,
      };
    });
  }, [processedRisks, unitMap, campusMap, selectedCampusScope]);

  const targetUnitGroups = useMemo(() => {
    if (selectedUnitScope === 'all') return unitsInFilter;
    return unitsInFilter.filter((u) => u.unitId === selectedUnitScope);
  }, [unitsInFilter, selectedUnitScope]);

  // Cross-reference all units with EOMS submissions and digital risks for activeYear
  const auditUnitsList = useMemo<UnitComplianceAuditItem[]>(() => {
    const unitsToScan = availableUnitsForCampus;

    return unitsToScan.map((u) => {
      const uCampusId = u.campusIds?.[0] || (selectedCampusScope !== 'all' ? selectedCampusScope : '');
      const uCampusName = campusMap.get(uCampusId) || 'Institutional';

      // Submissions for this unit for activeYear
      const uSubmissions = (allSubmissions || []).filter(
        (s) => s.unitId === u.id && Number(s.year) === Number(activeYear),
      );

      const firstCycleDocs = new Set(
        uSubmissions
          .filter((s) => s.cycleId?.toLowerCase().includes('first') || s.cycleId === 'first')
          .map((s) => normalizeReportType(s.reportType)),
      );
      const finalCycleDocs = new Set(
        uSubmissions
          .filter((s) => s.cycleId?.toLowerCase().includes('final') || s.cycleId === 'final')
          .map((s) => normalizeReportType(s.reportType)),
      );

      const missingFirst = submissionTypes.filter((t) => !firstCycleDocs.has(t));
      const missingFinal = submissionTypes.filter((t) => !finalCycleDocs.has(t));

      // Risks for this unit for activeYear
      const uRisks = (filteredRisks || []).filter((r) => r.unitId === u.id && Number(r.year) === Number(activeYear));

      const closedRisks = uRisks.filter((r) => r.status === 'Closed').length;
      const inProgressRisks = uRisks.filter((r) => r.status === 'In Progress').length;
      const openRisks = uRisks.filter((r) => r.status === 'Open').length;
      const overdueRisks = uRisks.filter((r) => {
        if (r.status === 'Closed' || !r.targetDate) return false;
        const target = r.targetDate?.toDate ? r.targetDate.toDate() : new Date(r.targetDate);
        return target < new Date();
      }).length;

      const firstCount = submissionTypes.length - missingFirst.length;
      const finalCount = submissionTypes.length - missingFinal.length;
      const riskScore = uRisks.length > 0 ? (uRisks.length >= 3 ? 2 : 1) : 0;
      const totalEarned = firstCount + finalCount + riskScore;
      const totalPossible = submissionTypes.length * 2 + 2; // 14
      const complianceScore = Math.round((totalEarned / totalPossible) * 100);

      let complianceStatus: 'Fully Compliant' | 'Partial Submission' | 'Non-Compliant (No Submissions)' =
        'Partial Submission';
      if (complianceScore >= 95) {
        complianceStatus = 'Fully Compliant';
      } else if (uSubmissions.length === 0 && uRisks.length === 0) {
        complianceStatus = 'Non-Compliant (No Submissions)';
      }

      return {
        unitId: u.id,
        unitName: u.name,
        campusId: uCampusId,
        campusName: uCampusName,
        firstCycleSubmitted: Array.from(firstCycleDocs),
        missingFirstCycle: missingFirst,
        finalCycleSubmitted: Array.from(finalCycleDocs),
        missingFinalCycle: missingFinal,
        totalRisksLogged: uRisks.length,
        openRisksCount: openRisks,
        inProgressRisksCount: inProgressRisks,
        closedRisksCount: closedRisks,
        overdueRisksCount: overdueRisks,
        complianceScore,
        complianceStatus,
      };
    });
  }, [availableUnitsForCampus, allSubmissions, activeYear, campusMap, filteredRisks, selectedCampusScope]);

  const targetAuditUnits = useMemo(() => {
    if (selectedUnitScope === 'all') return auditUnitsList;
    return auditUnitsList.filter((u) => u.unitId === selectedUnitScope);
  }, [auditUnitsList, selectedUnitScope]);

  const handleExecutePrint = () => {
    try {
      let reportsHtml = '';
      const reportOption = REPORT_OPTIONS.find((r) => r.id === selectedReportId);
      const reportTitle = reportOption?.title || 'Decision-Support Report';

      if (selectedReportId === 'non-submission-audit') {
        if (targetAuditUnits.length === 0) return;

        const campusScopeName =
          selectedCampusScope === 'all'
            ? 'All Campuses (University-Wide)'
            : campusMap.get(selectedCampusScope) || 'Institutional';
        const unitScopeName =
          selectedUnitScope === 'all'
            ? 'All Audited Units'
            : allUnits?.find((u) => u.id === selectedUnitScope)?.name || 'Audited Unit';

        const memoPage = (
          <RiskDecisionMemorandumPage
            reportId={selectedReportId}
            reportTitle={reportTitle}
            unitName={unitScopeName}
            campusName={campusScopeName}
            year={activeYear}
            signatories={signatories}
            cycle={cycle}
            totalItemsCount={targetAuditUnits.length}
          />
        );

        const templateNode = (
          <UnitNonSubmissionAuditTemplate
            auditUnits={targetAuditUnits}
            campusName={campusScopeName}
            year={activeYear}
            signatories={signatories}
            currentCycle={cycle}
          />
        );

        reportsHtml = `<div class="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full" style="width: 8.5in;">${renderToStaticMarkup(
          <div>
            {memoPage}
            {templateNode}
          </div>,
        )}</div>`;
      } else {
        if (targetUnitGroups.length === 0) return;

        reportsHtml = targetUnitGroups
          .map(({ unitName, campusName, risks: uRisks, unitId }) => {
            let templateNode: React.ReactNode = null;

            switch (selectedReportId) {
              case 'status-reminder':
                templateNode = (
                  <RiskStatusReminderNoticeTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'executive-briefing':
                templateNode = (
                  <ExecutiveRiskBriefingTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    cycle={cycle}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'resource-allocation':
                templateNode = (
                  <RiskResourceAllocationTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'accountability-tracker':
                templateNode = (
                  <RiskAccountabilityTrackerTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'effectiveness-audit':
                templateNode = (
                  <RiskEffectivenessAuditTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'opportunity-scorecard':
                templateNode = (
                  <OpportunityInnovationTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
              case 'ror-standard':
              default:
                templateNode = (
                  <RORPrintTemplate
                    risks={uRisks}
                    unitName={unitName}
                    campusName={campusName}
                    year={activeYear}
                    signatories={signatories}
                    cycle={cycle}
                    unitMap={unitMap}
                    campusMap={campusMap}
                  />
                );
                break;
            }

            const memoPage = (
              <RiskDecisionMemorandumPage
                reportId={selectedReportId}
                reportTitle={reportTitle}
                unitName={unitName}
                campusName={campusName}
                year={activeYear}
                signatories={signatories}
                cycle={cycle}
                totalItemsCount={uRisks.length}
              />
            );

            return `<div key="${unitId}" class="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full" style="width: 8.5in; margin-bottom: 30px;">${renderToStaticMarkup(
              <div>
                {memoPage}
                {templateNode}
              </div>,
            )}</div>`;
          })
          .join('');
      }

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>QA Memorandum - ${reportTitle} (AY ${activeYear})</title>
              <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
              <style>
                  @page { 
                      size: 8.5in 13in !important; 
                      margin: 0 !important; 
                  }
                  @media print { 
                      html, body { 
                          margin: 0 !important; 
                          padding: 0 !important; 
                          background: white !important; 
                          -webkit-print-color-adjust: exact !important; 
                          print-color-adjust: exact !important;
                          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                      } 
                      .no-print { display: none !important; } 
                      #print-content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                      .memo-root-document { padding: 0 !important; width: 100% !important; }
                      .memo-page-1 {
                          page-break-after: always !important;
                          break-after: page !important;
                          page-break-inside: avoid !important;
                          break-inside: avoid !important;
                          position: relative !important;
                          box-sizing: border-box !important;
                          padding: 0.35in 0.45in 0.65in 0.45in !important;
                      }
                      .memo-attachment-page {
                          page-break-before: always !important;
                          break-before: page !important;
                          position: relative !important;
                          box-sizing: border-box !important;
                          padding: 0.35in 0.45in 0.65in 0.45in !important;
                      }
                      .memo-footer-banner {
                          position: absolute !important;
                          bottom: 0.25in !important;
                          left: 0.45in !important;
                          right: 0.45in !important;
                      }
                  } 
                  body { 
                      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                      background: #f1f5f9; 
                      padding: 20px; 
                      color: black; 
                  }
                  table { border-collapse: collapse !important; width: 100% !important; }
                  td, th { overflow: hidden; word-wrap: break-word; }
              </style>
          </head>
          <body>
              <div class="no-print mb-6 flex justify-center">
                  <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-sans font-black uppercase text-xs tracking-widest transition-all">Click to Print QA Memorandum (Folio 8.5x13 Format)</button>
              </div>
              <div id="print-content">
                  ${reportsHtml}
              </div>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Failed to generate report window', err);
    }
  };

  const isAuditReport = selectedReportId === 'non-submission-audit';
  const readyCount = isAuditReport ? targetAuditUnits.length : targetUnitGroups.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/10">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Risk & EOMS Decision-Support Report Generator
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Generate executive briefings, non-submission audits, budget blueprints, accountability logs, and ISO audit
            dossiers from digital records.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CONFIGURATION BAR (YEAR, SITE/CAMPUS, UNIT, STATUS, CYCLE) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
            {/* 1. ACADEMIC / FISCAL YEAR SELECTION */}
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 text-primary" /> Target Year
              </label>
              <Select value={String(activeYear)} onValueChange={(val) => setActiveYear(Number(val))}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearsList.map((yr) => (
                    <SelectItem key={yr} value={String(yr)}>
                      AY {yr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 2. CAMPUS / SITE SELECTION */}
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <School className="h-3 w-3 text-primary" /> Campus / Site
              </label>
              <Select
                value={selectedCampusScope}
                onValueChange={(val) => {
                  setSelectedCampusScope(val);
                  setSelectedUnitScope('all');
                }}
              >
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-medium">
                  <SelectValue placeholder="All Campuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses / University-Wide</SelectItem>
                  {allCampuses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 3. UNIT / DEPARTMENT SCOPE */}
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <Building className="h-3 w-3 text-primary" /> Unit / Department
              </label>
              <Select value={selectedUnitScope} onValueChange={setSelectedUnitScope}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-medium">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {isAuditReport
                      ? `All Audited Units (${auditUnitsList.length} Units)`
                      : `All Filtered Units (${unitsInFilter.length} Units)`}
                  </SelectItem>
                  {isAuditReport
                    ? auditUnitsList.map((u) => (
                        <SelectItem key={u.unitId} value={u.unitId}>
                          {u.unitName} ({u.complianceStatus})
                        </SelectItem>
                      ))
                    : unitsInFilter.map((u) => (
                        <SelectItem key={u.unitId} value={u.unitId}>
                          {u.unitName} ({u.risks.length} {u.risks.length === 1 ? 'entry' : 'entries'})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. STATUS FILTER */}
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <Filter className="h-3 w-3 text-primary" /> Status Filter
              </label>
              <Select value={selectedStatusScope} onValueChange={setSelectedStatusScope}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses (Open, In Progress, Closed)</SelectItem>
                  <SelectItem value="action-required">⚠️ Action Required (Open & In Progress)</SelectItem>
                  <SelectItem value="overdue">🚨 Overdue Only (Past Deadline)</SelectItem>
                  <SelectItem value="Open">Open Pending Only</SelectItem>
                  <SelectItem value="In Progress">In Progress Only</SelectItem>
                  <SelectItem value="Closed">Closed / Completed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. MONITORING CYCLE */}
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" /> Monitoring Cycle
              </label>
              <Select value={cycle} onValueChange={(v) => setCycle(v as 'first' | 'final')}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">1st Cycle (Baseline)</SelectItem>
                  <SelectItem value="final">Final Cycle (Evaluation)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TEMPLATE CARDS SELECTOR */}
          <div className="space-y-2.5">
            <label className="font-black uppercase text-xs tracking-wider text-slate-800 dark:text-slate-200 block">
              Select Decision-Support Template ({REPORT_OPTIONS.length} Available)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {REPORT_OPTIONS.map((opt) => {
                const isSelected = selectedReportId === opt.id;
                const IconComponent = opt.icon;

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedReportId(opt.id)}
                    className={cn(
                      'text-left p-4 rounded-xl border-2 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/30'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={cn(
                            'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border',
                            opt.badgeColor,
                          )}
                        >
                          {opt.badge}
                        </span>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          {opt.category}
                        </span>
                      </div>

                      <div className="flex items-start gap-3 mt-1">
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0 mt-0.5 transition-colors',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10',
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h4
                            className={cn(
                              'text-xs font-black uppercase tracking-tight',
                              isSelected ? 'text-primary' : 'text-slate-900 dark:text-slate-100',
                            )}
                          >
                            {opt.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t flex items-center justify-between text-[9px] font-bold text-muted-foreground uppercase">
                      <span>Paper: {opt.pageSize}</span>
                      <span className={cn('flex items-center gap-1', isSelected ? 'text-primary font-black' : '')}>
                        {isSelected ? 'Selected' : 'Select Template'} <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 border-t bg-slate-50 dark:bg-slate-900/80 flex flex-row items-center justify-between sm:justify-between gap-2">
          <div className="text-xs text-muted-foreground font-medium">
            <span className="font-bold text-slate-900 dark:text-slate-100">{readyCount} Unit(s)</span>{' '}
            {isAuditReport ? 'evaluated in deficiency audit' : 'ready for generation'} (AY {activeYear})
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecutePrint}
              disabled={readyCount === 0}
              className="font-black uppercase text-xs tracking-wider gap-2 shadow-md shadow-primary/20 bg-primary"
            >
              <Printer className="h-4 w-4" />
              Generate & Print Report (AY {activeYear})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
