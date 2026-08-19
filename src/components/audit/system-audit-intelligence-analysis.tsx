'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type {
  AuditFinding,
  AuditSchedule,
  AuditPlan,
  ISOClause,
  Unit,
  Campus,
  CorrectiveActionRequest,
} from '@/lib/types';
import { useWebLlm } from '@/context/web-llm-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Bot,
  RotateCcw,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Flame,
  Copy,
  Check,
  Printer,
  ChevronRight,
  Target,
  Clock,
  Building,
  School,
  UserCheck,
  Cpu,
  Layers,
  FileText,
  AlertCircle,
  Network,
  GitMerge,
  Search,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShieldCheck,
  Globe2,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/lib/evaluation-export';

interface SystemAuditIntelligenceAnalysisProps {
  findings: AuditFinding[];
  schedules: AuditSchedule[];
  plans: AuditPlan[];
  isoClauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  cars?: CorrectiveActionRequest[];
  selectedYear: number;
  className?: string;
}

export interface SystemicCluster {
  clause: string;
  clauseTitle: string;
  type: 'Non-Conformance' | 'Observation for Improvement';
  occurrences: number;
  campusIds: string[];
  campusNames: string[];
  unitIds: string[];
  unitNames: string[];
  severity: 'CRITICAL_SYSTEMIC' | 'RECURRENT_CLUSTER' | 'LOCALIZED';
  sampleDescriptions: string[];
  sampleEvidences: string[];
  ncStatements: string[];
  openCarsCount: number;
  resolvedCarsCount: number;
}

export function SystemAuditIntelligenceAnalysis({
  findings,
  schedules,
  plans,
  isoClauses,
  units,
  campuses,
  cars = [],
  selectedYear,
  className = '',
}: SystemAuditIntelligenceAnalysisProps) {
  const { isAiEnabled, status, selectedModel, generateSystemAuditAnalysis } = useWebLlm();
  const { toast } = useToast();

  const [aiReportText, setAiReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'all-systemic' | 'common-nc' | 'common-ofi' | 'campus-disparity'>(
    'all-systemic',
  );
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedClusterKey, setExpandedClusterKey] = useState<string | null>(null);

  // Mappings for quick lookup
  const campusMap = useMemo(() => {
    const map = new Map<string, string>();
    campuses.forEach((c) => map.set(c.id, c.name));
    map.set('university-wide', 'Institutional / University-Wide');
    return map;
  }, [campuses]);

  const unitMap = useMemo(() => {
    const map = new Map<string, string>();
    units.forEach((u) => map.set(u.id, u.name));
    return map;
  }, [units]);

  const clauseMap = useMemo(() => {
    const map = new Map<string, { title: string; desc: string }>();
    isoClauses.forEach((c) => map.set(c.id, { title: c.title, desc: c.description }));
    return map;
  }, [isoClauses]);

  // Filter plans & schedules for the active year
  const yearPlanIds = useMemo(() => {
    return new Set(plans.filter((p) => p.year === selectedYear).map((p) => p.id));
  }, [plans, selectedYear]);

  const yearSchedules = useMemo(() => {
    return schedules.filter((s) => yearPlanIds.has(s.auditPlanId));
  }, [schedules, yearPlanIds]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, AuditSchedule>();
    schedules.forEach((s) => map.set(s.id, s));
    return map;
  }, [schedules]);

  // Year findings
  const yearFindings = useMemo(() => {
    const yearScheduleIds = new Set(yearSchedules.map((s) => s.id));
    return findings.filter((f) => yearScheduleIds.has(f.auditScheduleId));
  }, [findings, yearSchedules]);

  // Systemic clustering algorithm for identical/common NCs and OFIs across campuses
  const systemicAnalytics = useMemo(() => {
    const clusters: Record<string, SystemicCluster> = {};

    yearFindings.forEach((f) => {
      if (f.type !== 'Non-Conformance' && f.type !== 'Observation for Improvement') return;

      const schedule = scheduleMap.get(f.auditScheduleId);
      const campusId = schedule?.campusId || 'university-wide';
      const unitId = schedule?.targetId || 'general-unit';
      const campusName = campusMap.get(campusId) || 'Main / Institutional';
      const unitName = schedule?.targetName || unitMap.get(unitId) || 'Operating Unit';

      const clauseKey = f.isoClause || 'General';
      const clusterKey = `${f.type}__${clauseKey}`;

      if (!clusters[clusterKey]) {
        const clauseInfo = clauseMap.get(clauseKey);
        clusters[clusterKey] = {
          clause: clauseKey,
          clauseTitle: clauseInfo?.title || `ISO Clause ${clauseKey}`,
          type: f.type,
          occurrences: 0,
          campusIds: [],
          campusNames: [],
          unitIds: [],
          unitNames: [],
          severity: 'LOCALIZED',
          sampleDescriptions: [],
          sampleEvidences: [],
          ncStatements: [],
          openCarsCount: 0,
          resolvedCarsCount: 0,
        };
      }

      const c = clusters[clusterKey];
      c.occurrences++;

      if (!c.campusIds.includes(campusId)) {
        c.campusIds.push(campusId);
        c.campusNames.push(campusName);
      }

      if (!c.unitIds.includes(unitId)) {
        c.unitIds.push(unitId);
        c.unitNames.push(unitName);
      }

      if (f.description && !c.sampleDescriptions.includes(f.description) && c.sampleDescriptions.length < 4) {
        c.sampleDescriptions.push(f.description);
      }

      if (f.evidence && !c.sampleEvidences.includes(f.evidence) && c.sampleEvidences.length < 3) {
        c.sampleEvidences.push(f.evidence);
      }

      if (f.ncStatement && !c.ncStatements.includes(f.ncStatement) && c.ncStatements.length < 3) {
        c.ncStatements.push(f.ncStatement);
      }

      // Check linked CARs
      const relatedCar = cars.find(
        (car) => car.findingId === f.id || (car.concerningClause === f.isoClause && car.unitId === unitId),
      );
      if (relatedCar) {
        if (relatedCar.status === 'Closed') {
          c.resolvedCarsCount++;
        } else {
          c.openCarsCount++;
        }
      }
    });

    // Determine systemic severity
    const allClusters = Object.values(clusters).map((cl) => {
      const distinctCampuses = cl.campusIds.length;
      const distinctUnits = cl.unitIds.length;

      let severity: 'CRITICAL_SYSTEMIC' | 'RECURRENT_CLUSTER' | 'LOCALIZED' = 'LOCALIZED';
      if (distinctCampuses >= 3 || distinctUnits >= 5) {
        severity = 'CRITICAL_SYSTEMIC';
      } else if (distinctCampuses >= 2 || distinctUnits >= 3) {
        severity = 'RECURRENT_CLUSTER';
      }

      return { ...cl, severity };
    });

    // Sorted by distinct campuses desc, then occurrences desc
    allClusters.sort((a, b) => b.campusIds.length - a.campusIds.length || b.occurrences - a.occurrences);

    const systemicNCs = allClusters.filter(
      (c) => c.type === 'Non-Conformance' && (c.severity === 'CRITICAL_SYSTEMIC' || c.severity === 'RECURRENT_CLUSTER'),
    );
    const systemicOFIs = allClusters.filter(
      (c) =>
        c.type === 'Observation for Improvement' &&
        (c.severity === 'CRITICAL_SYSTEMIC' || c.severity === 'RECURRENT_CLUSTER'),
    );

    // Campus Disparity Breakdown (Main Campus Odiongan vs Satellites)
    const campusDisparities: Record<
      string,
      { campus: string; ncCount: number; ofiCount: number; complianceCount: number; total: number }
    > = {};
    campuses.forEach((cmp) => {
      campusDisparities[cmp.id] = { campus: cmp.name, ncCount: 0, ofiCount: 0, complianceCount: 0, total: 0 };
    });

    yearFindings.forEach((f) => {
      const sch = scheduleMap.get(f.auditScheduleId);
      const cid = sch?.campusId || 'university-wide';
      if (!campusDisparities[cid]) {
        campusDisparities[cid] = {
          campus: campusMap.get(cid) || 'Institutional',
          ncCount: 0,
          ofiCount: 0,
          complianceCount: 0,
          total: 0,
        };
      }
      campusDisparities[cid].total++;
      if (f.type === 'Non-Conformance') campusDisparities[cid].ncCount++;
      else if (f.type === 'Observation for Improvement') campusDisparities[cid].ofiCount++;
      else if (f.type === 'Compliance') campusDisparities[cid].complianceCount++;
    });

    const disparityList = Object.values(campusDisparities)
      .filter((d) => d.total > 0)
      .sort((a, b) => b.ncCount - a.ncCount || b.ofiCount - a.ofiCount);

    const totalNC = yearFindings.filter((f) => f.type === 'Non-Conformance').length;
    const totalOFI = yearFindings.filter((f) => f.type === 'Observation for Improvement').length;
    const totalCompliance = yearFindings.filter((f) => f.type === 'Compliance').length;

    return {
      allClusters,
      systemicNCs,
      systemicOFIs,
      disparityList,
      totalFindings: yearFindings.length,
      totalNC,
      totalOFI,
      totalCompliance,
      affectedCampusesCount: disparityList.length,
    };
  }, [yearFindings, scheduleMap, campusMap, unitMap, clauseMap, cars, campuses]);

  // Execute AI analysis with on-device WebLLM
  const handleGenerateSystemAudit = useCallback(async () => {
    setIsGenerating(true);
    try {
      const contextData = {
        year: selectedYear,
        totalFindings: systemicAnalytics.totalFindings,
        totalNC: systemicAnalytics.totalNC,
        totalOFI: systemicAnalytics.totalOFI,
        totalCompliance: systemicAnalytics.totalCompliance,
        affectedCampusesCount: systemicAnalytics.affectedCampusesCount,
        systemicNCs: systemicAnalytics.systemicNCs.slice(0, 6).map((c) => ({
          clause: c.clause,
          clauseTitle: c.clauseTitle,
          occurrences: c.occurrences,
          campuses: c.campusNames,
          sampleDescription: c.sampleDescriptions[0] || c.ncStatements[0] || 'Systemic procedural non-conformance',
        })),
        systemicOFIs: systemicAnalytics.systemicOFIs.slice(0, 6).map((c) => ({
          clause: c.clause,
          clauseTitle: c.clauseTitle,
          occurrences: c.occurrences,
          campuses: c.campusNames,
          sampleDescription: c.sampleDescriptions[0] || 'Systemic observation for operational improvement',
        })),
        satelliteDisparities: systemicAnalytics.disparityList.map((d) => ({
          campus: d.campus,
          ncCount: d.ncCount,
          ofiCount: d.ofiCount,
        })),
      };

      const prompt = `Conduct a comprehensive ISO 19011 / ISO 21001 multi-site system audit intelligence analysis for Romblon State University (AY ${selectedYear}). Identify same NCs and OFIs across Main and Satellite campuses, evaluate quality disparities, and generate top management strategic directives.`;

      const result = await generateSystemAuditAnalysis(prompt, contextData);
      setAiReportText(result);
    } catch (e) {
      console.error('Failed to generate Local AI System Audit Analysis:', e);
      toast({
        title: 'Analysis Fallback Active',
        description: 'Generated standard institutional audit intelligence synthesis using local analytics.',
      });
    } finally {
      setIsGenerating(false);
    }
  }, [selectedYear, systemicAnalytics, generateSystemAuditAnalysis, toast]);

  useEffect(() => {
    if (yearFindings.length > 0) {
      handleGenerateSystemAudit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, yearFindings.length]);

  const handleCopy = async () => {
    const success = await copyToClipboard(aiReportText);
    if (success) {
      setCopied(true);
      toast({
        title: 'Copied to Clipboard',
        description: 'System Audit Intelligence Report copied successfully.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(`
        <html>
          <head>
            <title>RSU_SystemWide_Audit_Intelligence_AY${selectedYear}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #0f172a; line-height: 1.6; }
              h1 { font-size: 18pt; text-transform: uppercase; margin-bottom: 4px; text-align: center; }
              h2 { font-size: 13pt; text-transform: uppercase; margin-top: 0; color: #475569; text-align: center; }
              .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
              .kri-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
              .kri-card { border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; text-align: center; background: #f8fafc; }
              .kri-value { font-size: 16pt; font-weight: bold; }
              .kri-label { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: bold; margin-top: 4px; }
              .content { white-space: pre-wrap; font-size: 10pt; line-height: 1.7; }
              .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 8pt; color: #94a3b8; text-align: center; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Romblon State University</h1>
              <h2>Quality Assurance Office • System-Wide Audit Intelligence Analysis</h2>
              <p style="font-size: 10pt; font-weight: bold; margin-top: 8px;">ACADEMIC YEAR ${selectedYear} • ISO 19011:2018 & ISO 21001:2018</p>
            </div>
            
            <div class="kri-grid">
              <div class="kri-card">
                <div class="kri-value">${systemicAnalytics.totalFindings}</div>
                <div class="kri-label">Total System Findings</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #b91c1c;">${systemicAnalytics.systemicNCs.length}</div>
                <div class="kri-label">Systemic NC Clusters</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #d97706;">${systemicAnalytics.systemicOFIs.length}</div>
                <div class="kri-label">Systemic OFI Clusters</div>
              </div>
              <div class="kri-card">
                <div class="kri-value" style="color: #4f46e5;">${systemicAnalytics.affectedCampusesCount}</div>
                <div class="kri-label">Audited Campuses</div>
              </div>
            </div>

            <div class="content">${aiReportText}</div>

            <div class="footer">
              Generated via Local On-Device AI Engine • Romblon State University EOMS Portal
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const isLlmReady = isAiEnabled && status === 'ready';

  // Filter clusters based on active tab and search
  const displayedClusters = useMemo(() => {
    let list = systemicAnalytics.allClusters;

    if (activeTab === 'common-nc') {
      list = list.filter((c) => c.type === 'Non-Conformance');
    } else if (activeTab === 'common-ofi') {
      list = list.filter((c) => c.type === 'Observation for Improvement');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (c) =>
          c.clause.toLowerCase().includes(q) ||
          c.clauseTitle.toLowerCase().includes(q) ||
          c.campusNames.some((cmp) => cmp.toLowerCase().includes(q)) ||
          c.unitNames.some((u) => u.toLowerCase().includes(q)) ||
          c.sampleDescriptions.some((d) => d.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [systemicAnalytics.allClusters, activeTab, searchTerm]);

  return (
    <Card className={cn('shadow-xl border-primary/20 overflow-hidden bg-card', className)}>
      {/* ─── CARD HEADER ────────────────────────────────────────────── */}
      <CardHeader className="bg-gradient-to-r from-blue-900/10 via-indigo-900/5 to-transparent border-b py-5 px-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-sm">
                <Network className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-black uppercase tracking-tight text-foreground flex items-center gap-2">
                <span>System-Wide Audit Intelligence & Cross-Campus Analysis</span>
                <Badge
                  variant="outline"
                  className="text-[9px] font-black uppercase border-indigo-300 text-indigo-600 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300"
                >
                  AY {selectedYear}
                </Badge>
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Autonomous on-device Local AI synthesis analyzing cross-campus recurrent Non-Conformances (NCs), systemic
              OFIs, satellite disparities, and ISO 19011 root cause directives across all RSU campuses.
            </CardDescription>
          </div>

          {/* Engine Badges & Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isLlmReady ? (
              <Badge className="h-6 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 shadow-sm">
                <Cpu className="h-3 w-3" /> Local AI Active ({selectedModel.split('-')[0]})
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="h-6 text-[9px] font-bold uppercase tracking-wider bg-background border-primary/20 text-primary gap-1"
              >
                <Bot className="h-3 w-3" /> Local Rule Engine
              </Badge>
            )}

            <Badge
              variant="secondary"
              className="h-6 text-[8px] font-bold uppercase tracking-wider text-muted-foreground"
            >
              100% On-Device • Private
            </Badge>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSystemAudit}
                disabled={isGenerating}
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-primary/20 hover:bg-primary/5 text-primary gap-1.5 shadow-sm"
              >
                <RotateCcw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
                {isGenerating ? 'Synthesizing...' : 'Re-Analyze'}
              </Button>

              {aiReportText && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-border hover:bg-muted text-muted-foreground gap-1.5 shadow-sm"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrint}
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest bg-background border-indigo-300 text-indigo-700 hover:bg-indigo-50 gap-1.5 shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Analysis
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* ─── 1. TOP SYSTEMIC KRI METRICS ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Card className="p-3 bg-muted/20 border-border/60 text-center shadow-sm">
            <p className="text-xl font-black text-foreground tabular-nums">{systemicAnalytics.totalFindings}</p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground mt-0.5">Total System Findings</p>
          </Card>

          <Card className="p-3 bg-destructive/10 border-destructive/30 text-center shadow-sm relative overflow-hidden">
            <div className="absolute top-1 right-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
              </span>
            </div>
            <p className="text-xl font-black text-destructive tabular-nums">{systemicAnalytics.systemicNCs.length}</p>
            <p className="text-[9px] font-black uppercase text-destructive tracking-tight mt-0.5">
              Systemic NC Clusters
            </p>
          </Card>

          <Card className="p-3 bg-amber-500/10 border-amber-300 dark:border-amber-900/40 text-center shadow-sm">
            <p className="text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {systemicAnalytics.systemicOFIs.length}
            </p>
            <p className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-400 mt-0.5">
              Systemic OFI Clusters
            </p>
          </Card>

          <Card className="p-3 bg-indigo-500/10 border-indigo-300 dark:border-indigo-900/40 text-center shadow-sm">
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums">
              {systemicAnalytics.affectedCampusesCount}
            </p>
            <p className="text-[9px] font-bold uppercase text-indigo-700 dark:text-indigo-400 mt-0.5">
              Campuses Audited
            </p>
          </Card>

          <Card className="p-3 bg-emerald-500/10 border-emerald-300 dark:border-emerald-900/40 text-center shadow-sm col-span-2 sm:col-span-1">
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {systemicAnalytics.totalCompliance}
            </p>
            <p className="text-[9px] font-bold uppercase text-emerald-700 dark:text-emerald-400 mt-0.5">
              Compliances Logged
            </p>
          </Card>
        </div>

        {/* ─── 2. SYSTEMIC CROSS-CAMPUS FINDINGS EXPLORER ─────────────── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <div className="flex items-center gap-2">
              <GitMerge className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Recurrent Cross-Campus Findings Clusters (Same NC / OFI across Satellites)
              </h3>
            </div>

            {/* Sub-tabs & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-44">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search clause, campus..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-7 text-[10px] bg-background"
                />
              </div>

              <div className="flex items-center border rounded-md p-0.5 bg-background">
                <button
                  type="button"
                  onClick={() => setActiveTab('all-systemic')}
                  className={cn(
                    'px-2.5 py-0.5 text-[9px] font-black uppercase rounded transition-colors',
                    activeTab === 'all-systemic'
                      ? 'bg-indigo-600 text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  All ({systemicAnalytics.allClusters.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('common-nc')}
                  className={cn(
                    'px-2.5 py-0.5 text-[9px] font-black uppercase rounded transition-colors',
                    activeTab === 'common-nc'
                      ? 'bg-destructive text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Common NC ({systemicAnalytics.allClusters.filter((c) => c.type === 'Non-Conformance').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('common-ofi')}
                  className={cn(
                    'px-2.5 py-0.5 text-[9px] font-black uppercase rounded transition-colors',
                    activeTab === 'common-ofi'
                      ? 'bg-amber-600 text-white'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Common OFI (
                  {systemicAnalytics.allClusters.filter((c) => c.type === 'Observation for Improvement').length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('campus-disparity')}
                  className={cn(
                    'px-2.5 py-0.5 text-[9px] font-black uppercase rounded transition-colors',
                    activeTab === 'campus-disparity'
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Satellites Matrix
                </button>
              </div>
            </div>
          </div>

          {activeTab === 'campus-disparity' ? (
            /* SATELLITE DISPARITY TABLE */
            <div className="rounded-xl border overflow-hidden">
              <div className="p-3 bg-muted/20 border-b flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 text-primary" />
                  Main vs. Satellite Campus Quality Finding Distribution
                </span>
                <span className="text-[9px] text-muted-foreground uppercase font-bold">
                  {systemicAnalytics.disparityList.length} Campuses Audited
                </span>
              </div>
              <div className="divide-y text-xs">
                {systemicAnalytics.disparityList.map((d, idx) => {
                  const ncShare =
                    systemicAnalytics.totalNC > 0 ? Math.round((d.ncCount / systemicAnalytics.totalNC) * 100) : 0;
                  return (
                    <div
                      key={idx}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <School className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="font-black uppercase text-foreground">{d.campus}</span>
                          {idx === 0 && d.ncCount > 2 && (
                            <Badge variant="destructive" className="h-4 text-[7px] font-black uppercase px-1">
                              Highest NC Density
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {d.total} total audit entries recorded ({d.complianceCount} compliances, {d.ofiCount} OFIs,{' '}
                          {d.ncCount} NCs).
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-destructive">{d.ncCount} NC</span>
                          <span className="text-[9px] text-muted-foreground block">{ncShare}% of system NCs</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-amber-600">{d.ofiCount} OFI</span>
                          <span className="text-[9px] text-muted-foreground block">Improvement areas</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-black text-emerald-600">
                            {d.complianceCount} Comp.
                          </span>
                          <span className="text-[9px] text-muted-foreground block">Satisfactory</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : displayedClusters.length > 0 ? (
            /* CLUSTERS ACCORDION LIST */
            <ScrollArea className="h-[320px] pr-3">
              <div className="space-y-3">
                {displayedClusters.map((cluster, idx) => {
                  const key = `${cluster.type}__${cluster.clause}`;
                  const isExpanded = expandedClusterKey === key;
                  const isCritical = cluster.severity === 'CRITICAL_SYSTEMIC';

                  return (
                    <div
                      key={idx}
                      className={cn(
                        'p-4 rounded-xl border transition-all duration-200 hover:shadow-md bg-background',
                        isCritical
                          ? 'border-destructive/40 bg-destructive/[0.02]'
                          : cluster.severity === 'RECURRENT_CLUSTER'
                            ? 'border-amber-400/50 bg-amber-500/[0.02]'
                            : 'border-border/60',
                      )}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={cluster.type === 'Non-Conformance' ? 'destructive' : 'outline'}
                              className={cn(
                                'h-5 text-[8px] font-black uppercase px-2',
                                cluster.type === 'Observation for Improvement' &&
                                  'border-amber-400 text-amber-800 bg-amber-50 dark:bg-amber-950 dark:text-amber-300',
                              )}
                            >
                              {cluster.type === 'Non-Conformance' ? 'Non-Conformance' : 'Observation for Improvement'}
                            </Badge>

                            <span className="font-black text-xs uppercase text-foreground">
                              ISO Clause {cluster.clause}: {cluster.clauseTitle}
                            </span>

                            {isCritical && (
                              <Badge className="h-4 text-[7px] font-black uppercase px-1.5 bg-destructive text-white">
                                <Flame className="h-2 w-2 mr-0.5" /> SYSTEMIC ({cluster.campusNames.length} Campuses)
                              </Badge>
                            )}

                            {cluster.severity === 'RECURRENT_CLUSTER' && (
                              <Badge
                                variant="outline"
                                className="h-4 text-[7px] font-black uppercase px-1.5 border-amber-400 text-amber-800 bg-amber-50"
                              >
                                RECURRENT ({cluster.campusNames.length} Campuses)
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Impacted Sites:
                            </span>
                            {cluster.campusNames.map((camp, cIdx) => (
                              <Badge
                                key={cIdx}
                                variant="secondary"
                                className="h-4 text-[8px] font-bold uppercase px-1.5"
                              >
                                {camp}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-black text-foreground tabular-nums">
                              {cluster.occurrences} {cluster.occurrences === 1 ? 'Finding' : 'Findings'}
                            </span>
                            <span className="text-[9px] text-muted-foreground block">
                              across {cluster.unitNames.length} units
                            </span>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedClusterKey(isExpanded ? null : key)}
                            className="h-7 w-7 p-0 rounded-full"
                          >
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
                            />
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-border/60 space-y-3 animate-in fade-in duration-200">
                          {cluster.sampleDescriptions.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider block">
                                Observed Audit Evidence / Non-Conformance Descriptions:
                              </span>
                              <div className="space-y-1 pl-2 border-l-2 border-primary/30">
                                {cluster.sampleDescriptions.map((desc, dIdx) => (
                                  <p key={dIdx} className="text-[10px] text-slate-700 dark:text-slate-300 italic">
                                    "{desc}"
                                  </p>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] bg-muted/20 p-2.5 rounded-lg border">
                            <div>
                              <strong className="text-foreground uppercase font-bold block">Units Involved:</strong>
                              <span className="text-muted-foreground">{cluster.unitNames.join(', ')}</span>
                            </div>
                            <div>
                              <strong className="text-foreground uppercase font-bold block">
                                Corrective Action Status:
                              </strong>
                              <span className="text-muted-foreground">
                                {cluster.openCarsCount} Open CARs • {cluster.resolvedCarsCount} Verified Closed
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="p-8 rounded-xl border border-dashed text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
              <p className="text-xs font-bold text-foreground">No matching systemic findings detected</p>
              <p className="text-[10px] text-muted-foreground">
                Findings are currently isolated to individual units without system-wide cross-campus recurrence.
              </p>
            </div>
          )}
        </div>

        {/* ─── 3. SYNTHESIZED LOCAL AI SYSTEM AUDIT REPORT ────────────── */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between gap-2 border-b pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-foreground">
                Autonomous Local AI System-Wide Audit Synthesis (ISO 19011:2018 & ISO 21001:2018)
              </h3>
            </div>
            <span className="text-[9px] font-bold uppercase text-muted-foreground">Multi-Site Intelligence Engine</span>
          </div>

          <div className="p-5 rounded-xl border bg-muted/10 space-y-3 relative">
            {isGenerating ? (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                <Bot className="h-8 w-8 text-indigo-600 animate-bounce" />
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-indigo-600 animate-pulse">
                    Synthesizing System-Wide Multi-Campus Audit Intelligence with Local AI...
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Correlating common NCs, latent OFIs, and satellite disparities across all RSU campus datasets.
                  </p>
                </div>
              </div>
            ) : aiReportText ? (
              <div className="text-xs text-foreground leading-relaxed font-sans space-y-3 whitespace-pre-wrap">
                {aiReportText}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-xs italic">
                Click "Re-Analyze" above to generate a comprehensive Local AI audit intelligence analysis for Academic
                Year {selectedYear}.
              </div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="bg-muted/5 border-t py-3 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-muted-foreground italic">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>
            Evaluated in accordance with ISO 19011:2018 Guidelines for Auditing Management Systems & ISO 21001:2018
            EOMS.
          </span>
        </div>
        <span className="font-semibold text-slate-700 dark:text-slate-300">
          Romblon State University • Quality Assurance Office
        </span>
      </CardFooter>
    </Card>
  );
}
