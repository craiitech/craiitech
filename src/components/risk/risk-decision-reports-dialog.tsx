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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  FileText,
  Filter,
  AlertTriangle,
  Calendar,
  Layers,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { format } from 'date-fns';
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
  | 'non-submission-audit'
  | 'status-reminder'
  | 'executive-briefing'
  | 'resource-allocation'
  | 'accountability-tracker'
  | 'effectiveness-audit'
  | 'opportunity-scorecard'
  | 'ror-standard';

export interface DecisionReportOption {
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

export const REPORT_OPTIONS: DecisionReportOption[] = [
  {
    id: 'non-submission-audit',
    title: 'Unit Non-Submission & Deficiency Audit',
    category: 'Institutional Compliance',
    badge: 'Critical Audit',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description:
      'University-wide audit report listing all operating units with unsubmitted EOMS reports and delinquent Risk Registers (ROR).',
    icon: AlertTriangle,
    pageSize: '8.5in 13in',
    orientation: 'portrait',
  },
  {
    id: 'status-reminder',
    title: 'Risk Treatment Action Plan & Status Reminder Notice',
    category: 'Urgent Directives',
    badge: 'Official Directive',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
    description:
      'Direct formal advisory notice instructing process owners to resolve overdue risk treatments and update the EOMS portal.',
    icon: BellRing,
    pageSize: '8.5in 13in',
    orientation: 'portrait',
  },
  {
    id: 'executive-briefing',
    title: 'Executive Risk Profile & Decision Briefing',
    category: 'Executive Summary',
    badge: 'High Level',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    description:
      'Concise executive overview for the University President, VPs, and Campus Directors highlighting top strategic risks.',
    icon: Briefcase,
    pageSize: '8.5in 13in',
    orientation: 'portrait',
  },
  {
    id: 'resource-allocation',
    title: 'Risk-Based Resource Allocation & Budget Blueprint (RAP)',
    category: 'Strategic Planning',
    badge: 'Budget Support',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    description:
      'Cross-tabulates critical and high risks with required resources, budget allocations, and technology investments.',
    icon: SlidersHorizontal,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'accountability-tracker',
    title: 'Risk Accountability & Treatment Commitment Tracker (RAT)',
    category: 'Governance & Ownership',
    badge: 'Accountability',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    description:
      'Inventory of individual risk owners, commitment milestones, completion timelines, and proof attachments.',
    icon: Clock,
    pageSize: '13in 8.5in',
    orientation: 'landscape',
  },
  {
    id: 'effectiveness-audit',
    title: 'Risk Treatment Effectiveness Audit & ISO Compliance Dossier (REA)',
    category: 'Quality Assurance',
    badge: 'ISO 21001:2018',
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

interface RiskDecisionReportsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filteredRisks: Risk[];
  selectedYear?: string | number;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  allCampuses?: Campus[];
  allUnits?: Unit[];
  allSubmissions?: Submission[];
  signatories?: Signatories | null;
  currentCycle?: 'first' | 'final';
  defaultReportId?: DecisionReportType;
}

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
  // Scope & Distribution Controls
  const [targetScope, setTargetScope] = useState<'all' | 'campus' | 'unit'>('all');
  const [activeYear, setActiveYear] = useState<number>(Number(selectedYear) || new Date().getFullYear());
  const [selectedReportId, setSelectedReportId] = useState<DecisionReportType>(defaultReportId);
  const [cycle, setCycle] = useState<'first' | 'final'>(currentCycle);
  const [selectedCampusScope, setSelectedCampusScope] = useState<string>('all');
  const [selectedUnitScope, setSelectedUnitScope] = useState<string>('all');
  const [selectedStatusScope, setSelectedStatusScope] = useState<string>('all');

  // Communication & Signatory Controls
  const [communicationType, setCommunicationType] = useState<string>('QA Memorandum');
  const [paperSize, setPaperSize] = useState<'folio' | 'letter' | 'a4'>('folio');
  const [memoRefNo, setMemoRefNo] = useState<string>(
    `${selectedYear || new Date().getFullYear()}-${format(new Date(), 'MMdd')}`,
  );
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
    'All concerned administrative officers, academic deans, and risk owners are instructed to log in to the RSU EOMS Portal > Risk Intelligence Hub to execute action plans, commit resource allocations, and ensure timely submission of documentary proofs.',
  );

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

        const isReportOnly = communicationType === 'Report Only';

        const memoPage = !isReportOnly ? (
          <RiskDecisionMemorandumPage
            reportId={selectedReportId}
            reportTitle={reportTitle}
            unitName={unitScopeName}
            campusName={campusScopeName}
            year={activeYear}
            signatories={signatories}
            cycle={cycle}
            totalItemsCount={targetAuditUnits.length}
            communicationType={communicationType}
            includeNoted={includeNoted}
            memoRefNo={memoRefNo}
            memoDate={memoDate}
            gracePeriodDays={gracePeriodDays}
            customDirective={customDirective}
            customQaoDirector={selectedQaoDirector}
            customQmsHead={selectedQmsHead}
            paperSize={paperSize}
          />
        ) : null;

        const templateNode = (
          <UnitNonSubmissionAuditTemplate
            auditUnits={targetAuditUnits}
            campusName={campusScopeName}
            year={activeYear}
            signatories={signatories}
            currentCycle={cycle}
            isReportOnly={isReportOnly}
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

        const isReportOnly = communicationType === 'Report Only';

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
                    isReportOnly={isReportOnly}
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
                    isReportOnly={isReportOnly}
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
                    isReportOnly={isReportOnly}
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
                    isReportOnly={isReportOnly}
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
                    isReportOnly={isReportOnly}
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
                    isReportOnly={isReportOnly}
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

            const memoPage = !isReportOnly ? (
              <RiskDecisionMemorandumPage
                reportId={selectedReportId}
                reportTitle={reportTitle}
                unitName={unitName}
                campusName={campusName}
                year={activeYear}
                signatories={signatories}
                cycle={cycle}
                totalItemsCount={uRisks.length}
                communicationType={communicationType}
                includeNoted={includeNoted}
                memoRefNo={memoRefNo}
                memoDate={memoDate}
                gracePeriodDays={gracePeriodDays}
                customDirective={customDirective}
                customQaoDirector={selectedQaoDirector}
                customQmsHead={selectedQmsHead}
                paperSize={paperSize}
              />
            ) : null;

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
        const isReportOnly = communicationType === 'Report Only';
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
              <title>${isReportOnly ? reportTitle : communicationType} - ${reportTitle} (AY ${activeYear})</title>
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
                  <button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-sans font-black uppercase text-xs tracking-widest transition-all">Click to Print ${isReportOnly ? 'Report' : communicationType} (${paperSize === 'folio' ? 'Folio 8.5x13' : paperSize.toUpperCase()} Format)</button>
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
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* MODAL HEADER */}
        <DialogHeader className="p-5 pb-3 border-b bg-gradient-to-r from-indigo-50/80 via-slate-50 to-emerald-50/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Risk &amp; EOMS Decision-Support Report Generator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium mt-0.5">
                  Generate executive briefings, non-submission audits, budget blueprints, accountability logs, and ISO
                  audit dossiers.
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="font-mono text-[10px] uppercase font-bold border-indigo-600 text-indigo-700 dark:text-indigo-400"
            >
              Folio 8.5&quot; × 13&quot;
            </Badge>
          </div>
        </DialogHeader>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-900 dark:text-slate-100">
          {/* SECTION 1: TEMPLATE CARDS SELECTOR */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  1. Select Decision-Support Template ({REPORT_OPTIONS.length} Available)
                </h4>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground">
                Selected: <strong>{REPORT_OPTIONS.find((r) => r.id === selectedReportId)?.title}</strong>
              </span>
            </div>

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
                      'text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between group cursor-pointer relative overflow-hidden',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/20 dark:bg-indigo-950/30 shadow-md ring-1 ring-indigo-500/30'
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={cn(
                            'text-[8.5pt] font-black uppercase tracking-wider px-2 py-0.2 rounded border',
                            opt.badgeColor,
                          )}
                        >
                          {opt.badge}
                        </span>
                        <span className="text-[8.5pt] font-bold text-muted-foreground uppercase tracking-wider">
                          {opt.category}
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5 mt-1">
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0 mt-0.5 transition-colors',
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-muted text-muted-foreground group-hover:text-indigo-600 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50',
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h4
                            className={cn(
                              'text-xs font-black uppercase tracking-tight leading-snug',
                              isSelected
                                ? 'text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-900 dark:text-slate-100',
                            )}
                          >
                            {opt.title}
                          </h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                            {opt.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-[8.5pt] font-bold text-muted-foreground uppercase">
                      <span>Format: Page 1 Notice + Att. A</span>
                      <span className={cn('flex items-center gap-1', isSelected ? 'text-indigo-600 font-black' : '')}>
                        {isSelected ? 'Selected' : 'Select'} <ChevronRight className="h-3 w-3" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: SCOPE & TARGETING CONTROLS */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Layers className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                2. Scope &amp; Target Distribution
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
                      setSelectedCampusScope('all');
                      setSelectedUnitScope('all');
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
                  value={selectedCampusScope}
                  onValueChange={(val) => {
                    setSelectedCampusScope(val);
                    setSelectedUnitScope('all');
                  }}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="All Campuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      All Campuses (University-Wide)
                    </SelectItem>
                    {allCampuses.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs font-bold">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Unit Scope
                </Label>
                <Select
                  value={selectedUnitScope}
                  onValueChange={setSelectedUnitScope}
                  disabled={targetScope !== 'unit' && selectedCampusScope === 'all'}
                >
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="All Units" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      {isAuditReport
                        ? `All Audited Units (${auditUnitsList.length} Units)`
                        : `All Filtered Units (${unitsInFilter.length} Units)`}
                    </SelectItem>
                    {isAuditReport
                      ? auditUnitsList.map((u) => (
                          <SelectItem key={u.unitId} value={u.unitId} className="text-xs font-bold">
                            {u.unitName} ({u.complianceStatus})
                          </SelectItem>
                        ))
                      : unitsInFilter.map((u) => (
                          <SelectItem key={u.unitId} value={u.unitId} className="text-xs font-bold">
                            {u.unitName} ({u.risks.length} {u.risks.length === 1 ? 'entry' : 'entries'})
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Target Academic Year
                </Label>
                <Select value={String(activeYear)} onValueChange={(val) => setActiveYear(Number(val))}>
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearsList.map((yr) => (
                      <SelectItem key={yr} value={String(yr)} className="text-xs font-bold">
                        Academic Year {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Monitoring Cycle
                </Label>
                <Select value={cycle} onValueChange={(v) => setCycle(v as 'first' | 'final')}>
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first" className="text-xs font-bold">
                      1st Cycle (Baseline)
                    </SelectItem>
                    <SelectItem value="final" className="text-xs font-bold">
                      Final Cycle (Evaluation)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Status Scope
                </Label>
                <Select value={selectedStatusScope} onValueChange={setSelectedStatusScope}>
                  <SelectTrigger className="h-9 text-xs font-bold bg-slate-50 dark:bg-slate-950">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs font-bold">
                      All Statuses (Open, In Progress, Closed)
                    </SelectItem>
                    <SelectItem value="action-required" className="text-xs font-bold">
                      ⚠️ Action Required (Open &amp; In Progress)
                    </SelectItem>
                    <SelectItem value="overdue" className="text-xs font-bold">
                      🚨 Overdue Only (Past Deadline)
                    </SelectItem>
                    <SelectItem value="Open" className="text-xs font-bold">
                      Open Pending Only
                    </SelectItem>
                    <SelectItem value="In Progress" className="text-xs font-bold">
                      In Progress Only
                    </SelectItem>
                    <SelectItem value="Closed" className="text-xs font-bold">
                      Closed / Completed Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECTION 3: COMMUNICATION TYPE, REFERENCE & SIGNATORIES */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <FileText className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                3. Communication Type, Reference &amp; Issuance
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Communication Type
                </Label>
                <Select value={communicationType} onValueChange={setCommunicationType}>
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
                    <SelectItem value="QA Advisory" className="text-xs font-bold">
                      QA Advisory
                    </SelectItem>
                    <SelectItem value="QA Communication" className="text-xs font-bold">
                      QA Communication
                    </SelectItem>
                    <SelectItem value="Office Memorandum" className="text-xs font-bold">
                      Office Memorandum
                    </SelectItem>
                    <SelectItem value="Office Order" className="text-xs font-bold">
                      Office Order
                    </SelectItem>
                    <SelectItem value="Report Only" className="text-xs font-bold text-indigo-700 dark:text-indigo-400">
                      Report Only (Table Only)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">
                  Reference Number
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">RSU-QAO-RDS-</span>
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

          {/* SECTION 4: SIGNATORIES & NOTED BY */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-200 dark:border-slate-800">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                4. Issuing Signatories &amp; Noted By
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
                      id="needs-noted-risk"
                      checked={includeNoted}
                      onCheckedChange={(c) => setIncludeNoted(!!c)}
                    />
                    <label
                      htmlFor="needs-noted-risk"
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
              className="font-black uppercase text-xs tracking-wider gap-2 shadow-md shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer className="h-4 w-4" />
              Generate &amp; Print Report (AY {activeYear})
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
