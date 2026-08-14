'use client';

import React, { useState, useMemo } from 'react';
import type { Risk, Signatories, Unit, Campus } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Printer,
  ShieldCheck,
  Briefcase,
  Clock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RORPrintTemplate } from '@/components/risk/ror-print-template';
import {
  ExecutiveRiskBriefingTemplate,
  RiskResourceAllocationTemplate,
  RiskAccountabilityTrackerTemplate,
  RiskEffectivenessAuditTemplate,
  OpportunityInnovationTemplate,
} from '@/components/risk/risk-decision-print-templates';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export type DecisionReportType =
  | 'ror-standard'
  | 'executive-briefing'
  | 'resource-allocation'
  | 'accountability-tracker'
  | 'effectiveness-audit'
  | 'opportunity-scorecard';

interface RiskDecisionReportsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  filteredRisks: Risk[];
  selectedYear: number;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  signatories?: Signatories;
  currentCycle?: 'first' | 'final';
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
  signatories,
  currentCycle = 'final',
}: RiskDecisionReportsDialogProps) {
  const [selectedReportId, setSelectedReportId] = useState<DecisionReportType>('executive-briefing');
  const [cycle, setCycle] = useState<'first' | 'final'>(currentCycle);
  const [selectedUnitScope, setSelectedUnitScope] = useState<string>('all');

  const selectedReport = REPORT_OPTIONS.find((r) => r.id === selectedReportId) || REPORT_OPTIONS[0];

  // Group risks by unit
  const unitsInFilter = useMemo(() => {
    const map = new Map<string, Risk[]>();
    filteredRisks.forEach((r) => {
      if (!map.has(r.unitId)) map.set(r.unitId, []);
      map.get(r.unitId)!.push(r);
    });
    return Array.from(map.entries()).map(([uId, rList]) => ({
      unitId: uId,
      unitName: unitMap.get(uId) || 'Unknown Unit',
      campusName: campusMap.get(rList[0]?.campusId) || 'Institutional',
      risks: rList,
    }));
  }, [filteredRisks, unitMap, campusMap]);

  const targetUnitGroups = useMemo(() => {
    if (selectedUnitScope === 'all') return unitsInFilter;
    return unitsInFilter.filter((u) => u.unitId === selectedUnitScope);
  }, [unitsInFilter, selectedUnitScope]);

  const handleExecutePrint = () => {
    if (targetUnitGroups.length === 0) return;

    try {
      const reportsHtml = targetUnitGroups
        .map(({ unitName, campusName, risks: uRisks, unitId }) => {
          let templateNode: React.ReactNode = null;

          switch (selectedReportId) {
            case 'executive-briefing':
              templateNode = (
                <ExecutiveRiskBriefingTemplate
                  risks={uRisks}
                  unitName={unitName}
                  campusName={campusName}
                  year={selectedYear}
                  signatories={signatories}
                  cycle={cycle}
                />
              );
              break;
            case 'resource-allocation':
              templateNode = (
                <RiskResourceAllocationTemplate
                  risks={uRisks}
                  unitName={unitName}
                  campusName={campusName}
                  year={selectedYear}
                  signatories={signatories}
                />
              );
              break;
            case 'accountability-tracker':
              templateNode = (
                <RiskAccountabilityTrackerTemplate
                  risks={uRisks}
                  unitName={unitName}
                  campusName={campusName}
                  year={selectedYear}
                  signatories={signatories}
                />
              );
              break;
            case 'effectiveness-audit':
              templateNode = (
                <RiskEffectivenessAuditTemplate
                  risks={uRisks}
                  unitName={unitName}
                  campusName={campusName}
                  year={selectedYear}
                  signatories={signatories}
                />
              );
              break;
            case 'opportunity-scorecard':
              templateNode = (
                <OpportunityInnovationTemplate
                  risks={uRisks}
                  unitName={unitName}
                  campusName={campusName}
                  year={selectedYear}
                  signatories={signatories}
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
                  year={selectedYear}
                  signatories={signatories}
                  cycle={cycle}
                />
              );
              break;
          }

          return `<div key="${unitId}" class="print-page-break">${renderToStaticMarkup(templateNode)}</div>`;
        })
        .join('');

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>${selectedReport.title} - AY ${selectedYear}</title>
            <style>
              @page {
                size: ${selectedReport.pageSize};
                margin: 0;
              }
              @media print {
                html, body {
                  margin: 0;
                  padding: 0;
                  background: white;
                  -webkit-print-color-adjust: exact;
                  overflow: visible;
                }
                .no-print {
                  display: none !important;
                }
                .print-page-break {
                  page-break-after: always;
                  min-height: 100vh;
                  padding: 0.3in;
                  box-sizing: border-box;
                  display: block;
                  position: relative;
                }
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #f8fafc;
                padding: 0;
                color: #0f172a;
              }
              table {
                border-collapse: collapse !important;
                table-layout: fixed !important;
                width: 100% !important;
              }
              td, th {
                overflow: hidden;
                word-wrap: break-word;
              }
            </style>
          </head>
          <body>
            <div class="no-print" style="padding: 16px 24px; background: #0f172a; color: white; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; position: sticky; top: 0; z-index: 1000;">
              <div>
                <h2 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;">${selectedReport.title}</h2>
                <p style="margin: 2px 0 0 0; font-size: 11px; color: #94a3b8;">Fiscal Year ${selectedYear} • ${targetUnitGroups.length} Unit Document(s)</p>
              </div>
              <button onclick="window.print()" style="padding: 10px 24px; background: #1B6535; color: white; border: none; border-radius: 6px; font-weight: 900; font-size: 12px; text-transform: uppercase; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                Print / Save as PDF
              </button>
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-900">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/10">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="h-5 w-5" />
            <DialogTitle className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Risk Decision-Support & Report Generator
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Generate executive briefings, budget blueprints, accountability logs, and ISO audit dossiers from digital
            risk registry data.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* CONFIGURATION BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground">Scope / Unit Target</label>
              <Select value={selectedUnitScope} onValueChange={setSelectedUnitScope}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900">
                  <SelectValue placeholder="Select Scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Filtered Units ({unitsInFilter.length} Units)</SelectItem>
                  {unitsInFilter.map((u) => (
                    <SelectItem key={u.unitId} value={u.unitId}>
                      {u.unitName} ({u.risks.length} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold uppercase text-[10px] text-muted-foreground">Monitoring Cycle</label>
              <Select value={cycle} onValueChange={(v) => setCycle(v as 'first' | 'final')}>
                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 font-bold">
                  <SelectValue placeholder="Cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First Cycle (Pre-Treatment Baseline)</SelectItem>
                  <SelectItem value="final">Final Cycle (Post-Treatment Evaluation)</SelectItem>
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
                      'text-left p-4 rounded-xl border transition-all flex flex-col justify-between select-none relative overflow-hidden group cursor-pointer',
                      isSelected
                        ? 'bg-primary/5 border-primary shadow-md ring-2 ring-primary/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50/70',
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] font-black uppercase px-2 py-0.5', opt.badgeColor)}
                        >
                          {opt.badge}
                        </Badge>
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                          {opt.category}
                        </span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'p-2 rounded-lg shrink-0 mt-0.5 transition-colors',
                            isSelected
                              ? 'bg-primary text-white'
                              : 'bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white',
                          )}
                        >
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4
                            className={cn(
                              'text-xs font-black uppercase leading-snug',
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
            <span className="font-bold text-slate-900 dark:text-slate-100">{targetUnitGroups.length} Unit(s)</span>{' '}
            ready for generation
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecutePrint}
              disabled={targetUnitGroups.length === 0}
              className="font-black uppercase text-xs tracking-wider gap-2 shadow-md shadow-primary/20"
            >
              <Printer className="h-4 w-4" />
              Generate & Print Report
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
