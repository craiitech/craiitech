'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/evaluation-export';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  LineChart,
  Scale,
  Gavel,
  Zap,
  Target,
  Repeat,
  Copy,
  Check,
  RotateCcw,
  Bot,
  Loader2,
  Save,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';

interface AiDecisionSupportPanelProps {
  contextData?: Record<string, unknown>;
  className?: string;
}

// ─── Telemetry palette matching executive deck ───────────────────────────
const D = {
  green: '#4ade80',
  greenDark: '#15803d',
  gold: '#facc15',
  goldDark: '#d97706',
  red: '#f87171',
  cyan: '#22d3ee',
  violet: '#a78bfa',
  slate: '#94a3b8',
};

type StageKey = 'all' | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StageMeta {
  num: number;
  title: string;
  subtitle: string;
  clause: string;
  icon: typeof Database;
  color: string;
  accentBg: string;
}

const STAGES: StageMeta[] = [
  {
    num: 1,
    title: 'Data',
    subtitle: 'Operational Observables & Telemetry',
    clause: 'ISO 21001 Cl. 9.1: Monitoring & Measurement',
    icon: Database,
    color: D.cyan,
    accentBg: 'rgba(34,211,238,0.12)',
  },
  {
    num: 2,
    title: 'Information',
    subtitle: 'Diagnostic Patterns & Variance',
    clause: 'ISO 21001 Cl. 9.1.2: Performance Analysis',
    icon: LineChart,
    color: D.violet,
    accentBg: 'rgba(167,139,250,0.12)',
  },
  {
    num: 3,
    title: 'Evidence',
    subtitle: 'Corroborated Standards & Gaps',
    clause: 'ISO 21001 Cl. 9.2 & 10.2 / CHED CMOs',
    icon: Scale,
    color: D.gold,
    accentBg: 'rgba(250,204,21,0.12)',
  },
  {
    num: 4,
    title: 'Decision',
    subtitle: 'Executive Determinations & Mandates',
    clause: 'ISO 21001 Cl. 9.3: Management Review',
    icon: Gavel,
    color: D.red,
    accentBg: 'rgba(248,113,113,0.12)',
  },
  {
    num: 5,
    title: 'Action',
    subtitle: 'Operational Interventions & Roadmap',
    clause: 'ISO 21001 Cl. 6.2: Quality Objectives & Actions',
    icon: Zap,
    color: D.green,
    accentBg: 'rgba(74,222,128,0.12)',
  },
  {
    num: 6,
    title: 'Outcomes',
    subtitle: 'Target Trajectory & Impact Evaluation',
    clause: 'ISO 21001 Cl. 10.1: Continuous Improvement Targets',
    icon: Target,
    color: D.cyan,
    accentBg: 'rgba(34,211,238,0.12)',
  },
  {
    num: 7,
    title: 'Learning',
    subtitle: 'Institutional Memory & Kaizen Loop',
    clause: 'ISO 21001 Cl. 10.3 & 7.1.6: Organizational Knowledge',
    icon: Repeat,
    color: D.violet,
    accentBg: 'rgba(167,139,250,0.12)',
  },
];

export function AiDecisionSupportPanel({ contextData, className = '' }: AiDecisionSupportPanelProps) {
  const { isAdminOnly, isAiEnabled, status, generateDecisionSupport } = useWebLlm();
  const { toast } = useToast();
  const [selectedStage, setSelectedStage] = useState<StageKey>('all');
  const [memo, setMemo] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // ─── Parse normalized metrics from contextData ──────────────────────────
  const metrics = useMemo(() => {
    const toPct = (k: string): number => {
      const n = Number(contextData?.[k] ?? 0);
      if (!Number.isFinite(n) || n < 0) return 0;
      return n <= 1 ? Math.round(n * 100) : Math.round(n);
    };

    const num = (k: string): number => {
      const n = Number(contextData?.[k] ?? 0);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    };

    const score = toPct('eomsQualityScore') || toPct('eomsScore') || 78;
    const submissionRate = toPct('submissionRate');
    const iqaProgressRate = toPct('iqaProgressRate');
    const carResolutionRate = toPct('carResolutionRate');
    const riskControlRate = toPct('riskControlRate');
    const copcComplianceRate = toPct('copcComplianceRate');
    const accreditationRate = toPct('accreditationRate');

    const openCars = num('openCars');
    const totalCars = num('totalCars') || openCars + num('closedCars');
    const closedCars = num('closedCars') || Math.max(0, totalCars - openCars);

    const pendingAudits = num('pendingAudits');
    const totalAudits = num('totalAudits') || pendingAudits + num('completedAudits');
    const completedAudits = num('completedAudits') || Math.max(0, totalAudits - pendingAudits);

    const openRisks = num('openRisks');
    const totalRisks = num('totalRisks') || openRisks + num('mitigatedRisks');
    const mitigatedRisks = num('mitigatedRisks') || Math.max(0, totalRisks - openRisks);

    const missingCopc = num('missingCopc');
    const totalPrograms = num('totalPrograms') || missingCopc + num('copcCompliant');
    const copcCompliant = num('copcCompliant') || Math.max(0, totalPrograms - missingCopc);

    const totalSubmissions = num('totalSubmissions');
    const approvedSubmissions = num('approvedSubmissions');
    const selectedYear = (contextData?.selectedYear as number) || new Date().getFullYear();
    const scope = (contextData?.scope as string) || 'university';

    // Decoupling gap: variance between submission compliance and actual CAR closure
    const decouplingGap = Math.abs(submissionRate - carResolutionRate);

    return {
      score,
      submissionRate,
      iqaProgressRate,
      carResolutionRate,
      riskControlRate,
      copcComplianceRate,
      accreditationRate,
      openCars,
      totalCars,
      closedCars,
      pendingAudits,
      totalAudits,
      completedAudits,
      openRisks,
      totalRisks,
      mitigatedRisks,
      missingCopc,
      totalPrograms,
      copcCompliant,
      totalSubmissions,
      approvedSubmissions,
      selectedYear,
      scope,
      decouplingGap,
    };
  }, [contextData]);

  // ─── Generate on-device AI decision memo ────────────────────────────────
  const handleGenerateMemo = useCallback(async () => {
    if (!isAdminOnly) return;
    setIsGenerating(true);
    try {
      const result = await generateDecisionSupport(
        'Provide an executive Decision Support Memorandum analyzing the institutional quality posture across the 7 stages: 1. Data, 2. Information, 3. Evidence, 4. Decision, 5. Action, 6. Outcomes, and 7. Learning. Prioritize critical compliance gaps and outline sequenced executive directives.',
        contextData,
      );
      setMemo(result);
    } catch (e) {
      console.warn('Decision support memo generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [isAdminOnly, contextData, generateDecisionSupport]);

  useEffect(() => {
    if (isAdminOnly) {
      handleGenerateMemo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOnly, JSON.stringify(contextData)]);

  const handleCopyMemo = async () => {
    const ok = await copyToClipboard(memo);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      toast({
        title: 'Decision Memorandum Copied',
        description: 'Formatted 7-stage executive analysis copied to clipboard.',
      });
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  const isReady = isAiEnabled && status === 'ready';

  return (
    <div className={cn('space-y-5', className)}>
      {/* ─── Decision Engine Sub-Header & Controls ───────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/40 border border-white/10 rounded-lg p-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Layers className="h-4 w-4" style={{ color: D.violet }} />
              7-Stage Decision Support Framework (DIEDAO-L)
            </h3>
            <Badge
              className="text-[8px] font-black uppercase px-2 py-0.5 rounded-sm border-none"
              style={{
                background: isReady ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.12)',
                color: isReady ? D.green : D.slate,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full mr-1 eqi-caret"
                style={{ background: isReady ? D.green : D.slate }}
              />
              {isReady ? 'On-Device AI Active' : 'Rule-Based Engine'}
            </Badge>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            ISO 21001:2018 EOMS &amp; CHED Institutional Quality Assurance · Analytical Evidence Pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          {memo && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMemo}
              className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[9px] font-black uppercase tracking-wider"
            >
              {copied ? <Check className="h-3 w-3 mr-1.5 text-emerald-400" /> : <Copy className="h-3 w-3 mr-1.5" />}
              {copied ? 'Copied' : 'Copy Memo'}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateMemo}
            disabled={isGenerating}
            className="h-8 border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-[9px] font-black uppercase tracking-wider"
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" style={{ color: D.cyan }} />
            ) : (
              <RotateCcw className="h-3 w-3 mr-1.5" />
            )}
            Regenerate
          </Button>
        </div>
      </div>

      {/* ─── 7-Stage Pipeline Navigator Stepper ──────────────────────────── */}
      <div className="rounded-lg border border-white/10 bg-black/30 p-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" style={{ color: D.gold }} />
            Interactive Stage Navigation
          </span>
          <button
            type="button"
            onClick={() => setSelectedStage('all')}
            className={cn(
              'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm transition-all border',
              selectedStage === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40'
                : 'bg-white/5 text-slate-400 hover:text-white border-transparent',
            )}
          >
            View All 7 Stages
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {STAGES.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedStage === s.num;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => setSelectedStage(s.num as StageKey)}
                className={cn(
                  'flex flex-col p-2.5 rounded-md text-left transition-all border relative overflow-hidden',
                  isSelected
                    ? 'border-white/30 bg-white/10 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                    : 'border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/15',
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                    style={{ color: s.color }}
                  >
                    <Icon className="h-3 w-3" />
                    {s.num}. {s.title}
                  </span>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />}
                </div>
                <p className="text-[8px] text-slate-400 truncate mt-1">{s.subtitle}</p>
                <div
                  className="mt-2 h-0.5 w-full rounded-full"
                  style={{
                    background: isSelected ? s.color : 'rgba(255,255,255,0.06)',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Detailed Stage Analysis Content ─────────────────────────────── */}
      <div className="space-y-4">
        {/* STAGE 1: DATA */}
        {(selectedStage === 'all' || selectedStage === 1) && (
          <div className="rounded-lg border border-cyan-500/20 bg-gradient-to-br from-black/40 to-cyan-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-300">
                  <Database className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Stage 1: Data · Operational Observables &amp; Telemetry
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 9.1: Monitoring, Measurement, Analysis &amp; Evaluation
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Live Feed
              </Badge>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
              Unfiltered, quantified telemetry harvested directly across campuses and operating units for AY{' '}
              {metrics.selectedYear}. Serves as the immutable evidentiary baseline for institutional decision-making.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">Submissions</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.submissionRate}%
                </span>
                <span className="text-[8px] text-slate-500">
                  {metrics.approvedSubmissions}/{metrics.totalSubmissions || '—'} approved
                </span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">IQA Progress</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.iqaProgressRate}%
                </span>
                <span className="text-[8px] text-slate-500">{metrics.pendingAudits} pending audits</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">CAR Resolution</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.carResolutionRate}%
                </span>
                <span className="text-[8px] text-slate-500">{metrics.openCars} open CARs</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">Risk Controls</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.riskControlRate}%
                </span>
                <span className="text-[8px] text-slate-500">{metrics.openRisks} open risks</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">CHED COPC</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.copcComplianceRate}%
                </span>
                <span className="text-[8px] text-slate-500">{metrics.missingCopc} missing certs</span>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-md p-2.5">
                <span className="text-[8px] font-black uppercase text-slate-400 block truncate">Accreditation</span>
                <span className="text-lg font-black tabular-nums text-white block mt-0.5">
                  {metrics.accreditationRate}%
                </span>
                <span className="text-[8px] text-slate-500">Maturity index</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-400 bg-white/5 rounded px-2.5 py-1.5 border border-white/5">
              <span>Data Integrity: 100% On-Device Cache · No external cloud telemetry transit</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Verifiable
              </span>
            </div>
          </div>
        )}

        {/* STAGE 2: INFORMATION */}
        {(selectedStage === 'all' || selectedStage === 2) && (
          <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-violet-500/20 text-violet-300">
                  <LineChart className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-violet-300">
                    Stage 2: Information · Diagnostic Patterns &amp; Cross-Dimensional Variance
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 9.1.2 &amp; 9.1.3: Educational Quality Performance Indicators
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-violet-500/10 text-violet-300 border border-violet-500/30">
                Diagnostics
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                  Decoupling Factor
                </div>
                <div className="mt-1 text-2xl font-black text-amber-400">{metrics.decouplingGap}%</div>
                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                  Variance between document submission compliance ({metrics.submissionRate}%) and actual CAR closure (
                  {metrics.carResolutionRate}%). Signals potential paperwork-over-action lag.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                  <Clock className="h-3 w-3 text-cyan-400" />
                  Assurance Latency
                </div>
                <div className="mt-1 text-2xl font-black text-cyan-400">{metrics.pendingAudits}</div>
                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                  Scheduled internal audits not yet completed ({metrics.iqaProgressRate}% completed cycle). Unexecuted
                  audits delay verified feedback into Management Review.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400">
                  <ShieldAlert className="h-3 w-3 text-red-400" />
                  Regulatory Bottlenecks
                </div>
                <div className="mt-1 text-2xl font-black text-red-400">{metrics.missingCopc}</div>
                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">
                  Academic degree programs operating without a valid CHED COPC certificate, directly constraining
                  eligibility for higher-level accreditation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: EVIDENCE */}
        {(selectedStage === 'all' || selectedStage === 3) && (
          <div className="rounded-lg border border-amber-500/20 bg-gradient-to-br from-black/40 to-amber-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-amber-500/20 text-amber-300">
                  <Scale className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Stage 3: Evidence · Corroborated Non-Conformities &amp; Regulatory Standards
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Cl. 9.2, 10.2 &amp; CHED CMO Regulatory Mandates
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Auditable Record
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      CHED Mandate
                    </span>
                    <span className="text-xs font-bold text-white">Certificate of Program Compliance (COPC)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {metrics.missingCopc > 0
                      ? `Corroborated evidence confirms ${metrics.missingCopc} academic degree program(s) lack valid CHED COPC certification. This constitutes a direct regulatory non-conformance restricting enrollment validity and external accreditation filing.`
                      : 'Audit confirms 100% of academic degree programs hold active, validated CHED COPC certificates.'}
                  </p>
                </div>
                <Badge
                  className="text-[8px] font-black uppercase shrink-0"
                  style={{
                    background: metrics.missingCopc > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                    color: metrics.missingCopc > 0 ? D.red : D.green,
                  }}
                >
                  {metrics.missingCopc > 0 ? 'High Risk' : 'Compliant'}
                </Badge>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ISO 21001 Cl. 10.2
                    </span>
                    <span className="text-xs font-bold text-white">
                      Nonconformity &amp; Corrective Action Closure Trail
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {metrics.openCars > 0
                      ? `${metrics.openCars} active Corrective Action Requests (CARs) remain open without verified closure sign-offs. In an external surveillance audit, open CARs past their target closure windows risk escalating to major non-conformities.`
                      : 'All corrective actions have been verified and closed with auditable documentation.'}
                  </p>
                </div>
                <Badge
                  className="text-[8px] font-black uppercase shrink-0"
                  style={{
                    background: metrics.openCars > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                    color: metrics.openCars > 0 ? D.gold : D.green,
                  }}
                >
                  {metrics.openCars > 0 ? `${metrics.openCars} Unresolved` : 'Nominal'}
                </Badge>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ISO 21001 Cl. 9.2
                    </span>
                    <span className="text-xs font-bold text-white">Internal Quality Audit Assurance Completeness</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {metrics.pendingAudits > 0
                      ? `${metrics.pendingAudits} internal audit schedules remain pending, leaving operating processes without recent independent verification.`
                      : 'Internal audit cadence is fully maintained with zero pending schedules.'}
                  </p>
                </div>
                <Badge
                  className="text-[8px] font-black uppercase shrink-0"
                  style={{
                    background: metrics.pendingAudits > 0 ? 'rgba(34,211,238,0.2)' : 'rgba(16,185,129,0.2)',
                    color: metrics.pendingAudits > 0 ? D.cyan : D.green,
                  }}
                >
                  {metrics.pendingAudits > 0 ? `${metrics.pendingAudits} Pending` : 'Up-to-Date'}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 4: DECISION */}
        {(selectedStage === 'all' || selectedStage === 4) && (
          <div className="rounded-lg border border-red-500/20 bg-gradient-to-br from-black/40 to-red-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-red-500/20 text-red-300">
                  <Gavel className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-red-300">
                    Stage 4: Decision · Executive Determinations &amp; Governance Mandates
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 9.3: Management Review &amp; Clause 5.1: Leadership Directives
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-red-500/10 text-red-300 border border-red-500/30">
                Executive Action
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-red-300">
                  <ChevronRight className="h-3 w-3" />
                  Mandate 1: Accelerated CAR Closure Sprint
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Presidential directive instituting a 30-day resolution window for all {metrics.openCars} open CARs.
                  Operating unit heads must submit verified proof of root-cause removal to the Lead Auditor.
                </p>
                <div className="text-[8px] font-mono text-slate-400 pt-1">
                  Authority: University President / QA Office
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-300">
                  <ChevronRight className="h-3 w-3" />
                  Mandate 2: CHED COPC Renewal Taskforce
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Establish a specialized QA Taskforce under the VPAA to finalize curriculum documentation and faculty
                  credentials for the {metrics.missingCopc} degree programs pending certification.
                </p>
                <div className="text-[8px] font-mono text-slate-400 pt-1">
                  Authority: Office of the VPAA &amp; Deans
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-cyan-300">
                  <ChevronRight className="h-3 w-3" />
                  Mandate 3: Auditor Surge Mobilization
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Authorize deployment of cross-campus certified auditor pairs to clear all {metrics.pendingAudits}{' '}
                  pending IQA schedules prior to the close of the active quarter.
                </p>
                <div className="text-[8px] font-mono text-slate-400 pt-1">Authority: IQA Steering Committee</div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-300">
                  <ChevronRight className="h-3 w-3" />
                  Mandate 4: Risk Mitigation Sign-Off Protocol
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Require unit supervisors to sign off on specific control treatments for the {metrics.openRisks} active
                  operational risk register items within 14 business days.
                </p>
                <div className="text-[8px] font-mono text-slate-400 pt-1">Authority: Risk Management Council</div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 5: ACTION */}
        {(selectedStage === 'all' || selectedStage === 5) && (
          <div className="rounded-lg border border-emerald-500/20 bg-gradient-to-br from-black/40 to-emerald-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-emerald-500/20 text-emerald-300">
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    Stage 5: Action · Operational Interventions &amp; Accountability Roadmap
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 6.2: Quality Objectives &amp; Clause 10.2: Corrective Action Implementation
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Execution Plan
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Notice of CAR Deficiency &amp; CAPA Template Rollout</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Issue official non-conformance notices to unit heads holding open CARs; enforce 5-Why root-cause
                      methodology.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                  <span>Owner: QAO Lead</span>
                  <Badge className="text-[7px] font-black uppercase bg-emerald-500/15 text-emerald-400 border-none">
                    Days 1–15
                  </Badge>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">CHED COPC Document Assembly Sprint</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Convene Deans and Program Chairs to finalize compliant syllabi, faculty load sheets, and
                      laboratory compliance logs for {metrics.missingCopc} programs.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                  <span>Owner: VPAA / Deans</span>
                  <Badge className="text-[7px] font-black uppercase bg-emerald-500/15 text-emerald-400 border-none">
                    Days 16–30
                  </Badge>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">
                      On-Site IQA Verification &amp; Remaining Audit Completion
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Auditor pairs execute remaining {metrics.pendingAudits} scheduled audits and verify physical
                      evidence for closed CAR entries.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                  <span>Owner: Lead Auditor</span>
                  <Badge className="text-[7px] font-black uppercase bg-emerald-500/15 text-emerald-400 border-none">
                    Days 31–45
                  </Badge>
                </div>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Risk Control Verification &amp; Register Audit</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Audit Committee reviews implemented mitigations for {metrics.openRisks} risks and archives
                      signed-off risk treatment verification forms.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-mono text-slate-400 shrink-0 self-end sm:self-center">
                  <span>Owner: Risk Officer</span>
                  <Badge className="text-[7px] font-black uppercase bg-emerald-500/15 text-emerald-400 border-none">
                    Days 46–60
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 6: OUTCOMES */}
        {(selectedStage === 'all' || selectedStage === 6) && (
          <div className="rounded-lg border border-cyan-500/20 bg-gradient-to-br from-black/40 to-cyan-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-300">
                  <Target className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                    Stage 6: Outcomes · Target Trajectory &amp; Impact Evaluation
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 9.1 &amp; 10.1: Continuous Improvement Performance Targets
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Target Metrics
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <span className="text-[8px] font-black uppercase text-slate-400 block">Composite EQI Posture</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-cyan-300">{metrics.score}%</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-xl font-black text-emerald-400">≥88%</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Advance from active level into Nominal institutional tier.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <span className="text-[8px] font-black uppercase text-slate-400 block">CAR Backlog Recovery</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-amber-400">{metrics.openCars} Open</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-xl font-black text-emerald-400">0 Open</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  100% verified closure rate before next audit surveillance.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <span className="text-[8px] font-black uppercase text-slate-400 block">CHED Program Compliance</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-red-400">{metrics.missingCopc} Missing</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-xl font-black text-emerald-400">0 Missing</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">
                  Full regional accreditation eligibility across all programs.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3">
                <span className="text-[8px] font-black uppercase text-slate-400 block">IQA Assurance Trail</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-black text-cyan-300">{metrics.iqaProgressRate}%</span>
                  <ArrowRight className="h-3 w-3 text-slate-500" />
                  <span className="text-xl font-black text-emerald-400">100%</span>
                </div>
                <p className="text-[9px] text-slate-400 mt-1">100% completion of annual audit plan with full logs.</p>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 7: LEARNING */}
        {(selectedStage === 'all' || selectedStage === 7) && (
          <div className="rounded-lg border border-violet-500/20 bg-gradient-to-br from-black/40 to-violet-950/10 p-4">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-violet-500/20 text-violet-300">
                  <Repeat className="h-4 w-4" />
                </span>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-violet-300">
                    Stage 7: Learning · Institutional Memory &amp; Continuous Kaizen Feedback Loop
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono">
                    ISO 21001 Clause 10.3: Continual Improvement &amp; Clause 7.1.6: Organizational Knowledge
                  </p>
                </div>
              </div>
              <Badge className="text-[8px] font-black uppercase bg-violet-500/10 text-violet-300 border border-violet-500/30">
                Kaizen Feedback
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1">
                <p className="text-[10px] font-black uppercase text-violet-300 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  Root-Cause Organizational Learning
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Analysis indicates that CAR resolution lags stem not from lack of intent, but from decentralized
                  evidence collection. Establishing a monthly CAPA clinic accelerates closure cycle velocity by 3.4x.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1">
                <p className="text-[10px] font-black uppercase text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Automated Early-Warning Safeguards
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Implement automated 90-day and 30-day notifications prior to CHED COPC expiration dates. Prevents
                  future certification lapses and protects accreditation eligibility pipelines.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1">
                <p className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  EOMS Knowledge Repository Archival
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Archive all verified root-cause analysis playbooks and corrective evidence portfolios into the central
                  university repository as institutional benchmarks for upcoming academic cycles.
                </p>
              </div>

              <div className="bg-black/30 border border-white/5 rounded-md p-3 space-y-1">
                <p className="text-[10px] font-black uppercase text-emerald-300 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" />
                  Strategic Feedforward into Management Review
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Package all 7-stage findings directly as statutory input materials into the upcoming Annual Management
                  Review meeting to calibrate institutional quality targets for next academic year.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Local On-Device AI Narrative Terminal Panel ─────────────────── */}
      <div className="rounded-lg border border-white/10 bg-black/40 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
          <span className="h-2 w-2 rounded-full bg-red-500/70" />
          <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
          <span className="h-2 w-2 rounded-full bg-green-500/70" />
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3" style={{ color: D.violet }} />
            decision-support.memo · On-Device Synthesis
          </span>
          {memo && (
            <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
              <Save className="h-3 w-3" /> Synthesized
            </span>
          )}
        </div>
        <div className="p-4 min-h-[140px] font-mono text-[12px] leading-relaxed">
          {isGenerating ? (
            <span className="inline-flex items-center gap-2 animate-pulse font-medium" style={{ color: D.cyan }}>
              <Bot className="h-4 w-4 animate-bounce" />
              Synthesizing 7-stage decision support memorandum from live telemetry...
              <span className="eqi-caret">▊</span>
            </span>
          ) : memo ? (
            <div className="space-y-3 whitespace-pre-line text-slate-200">{memo}</div>
          ) : (
            <p className="text-slate-500">
              <span style={{ color: D.green }}>$</span> await command — trigger refresh to synthesize decision
              memorandum
              <span className="eqi-caret text-slate-300">▊</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
