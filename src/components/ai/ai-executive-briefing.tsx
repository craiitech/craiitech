'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWebLlm } from '@/context/web-llm-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/evaluation-export';
import { useToast } from '@/hooks/use-toast';
import {
  Bot,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  BrainCircuit,
  Gauge,
  Activity,
  ShieldAlert,
  FileWarning,
  Cpu,
  Save,
  Zap,
  BookOpen,
  ChevronDown,
} from 'lucide-react';

interface AiExecutiveBriefingProps {
  contextData?: Record<string, unknown>;
  className?: string;
}

// ─── Futuristic telemetry palette & heuristics ────────────────────────────
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

type Tier = 'NOMINAL' | 'STABLE' | 'ATTENTION' | 'CRITICAL';

function inspectRatio(value: number): { tier: Tier; color: string; glow: string; label: string } {
  if (value >= 80) return { tier: 'NOMINAL', color: D.green, glow: `0 0 14px ${D.green}77`, label: 'NOMINAL' };
  if (value >= 60) return { tier: 'STABLE', color: D.greenDark, glow: 'none', label: 'STABLE' };
  if (value >= 40)
    return { tier: 'ATTENTION', color: D.goldDark, glow: `0 0 10px ${D.goldDark}66`, label: 'ATTENTION' };
  return { tier: 'CRITICAL', color: D.red, glow: `0 0 16px ${D.red}88`, label: 'CRITICAL' };
}

// ─── Data glossary: complete description of every presented metric ────────
interface GlossaryEntry {
  label: string;
  what: string;
  read: string;
}

const METRIC_DEFS: GlossaryEntry[] = [
  {
    label: 'Submission Compliance',
    what: 'Share of required institutional documents, reports, and quality records actually submitted against the planned submission list for the reporting period.',
    read: 'A lower rate signals documentation backlogs and delayed ISO 21001:2018 evidence; push toward higher coverage to keep the quality record complete.',
  },
  {
    label: 'IQA Progress',
    what: 'Progress against the scheduled Internal Quality Audit (IQA) plan — the share of planned internal audits already performed in the current cycle.',
    read: 'Below-full progress means audit intervals are slipping, leaving gaps in independent assurance of the quality management system.',
  },
  {
    label: 'CAR Resolution',
    what: 'Effectiveness of Corrective Action Requests (CARs) — the share of corrective actions submitted for a period that were actually resolved/closed.',
    read: 'Lower resolution than submission means known nonconformities stay open and may recur; unresolved items accumulate into the Open CARs counter.',
  },
  {
    label: 'Risk Control',
    what: 'Share of identified risks in the risk register that are actively controlled or mitigated with a defined treatment.',
    read: 'A low rate exposes unaddressed threats to processes and objectives; the residual count feeds the Open Risks counter.',
  },
  {
    label: 'CHED COPC Compliance',
    what: 'Share of academic programs holding a valid CHED COPC (Certificate of Program Compliance) status for the reporting year.',
    read: 'Programs missing certification are flagged by the Missing COPC counter and are ineligible to advance toward external accreditation.',
  },
  {
    label: 'Accreditation Performance',
    what: 'Progress of academic programs toward their target external accreditation maturity (accredited or in an approved accreditation level).',
    read: 'Lower progress slows institutional quality recognition and drives program-level readiness work.',
  },
];

const COUNT_DEFS: GlossaryEntry[] = [
  {
    label: 'Open CARs',
    what: 'Total number of Corrective Action Requests still open and not yet closed within the reporting period.',
    read: 'Every open CAR is an unresolved nonconformity; prioritize the highest-impact items and verify closure evidence.',
  },
  {
    label: 'Pending Audits',
    what: 'Number of scheduled internal quality audits not yet executed in the current cycle.',
    read: 'A backlog of pending audits delays assurance; schedule and complete them to keep the audit cadence intact.',
  },
  {
    label: 'Open Risks',
    what: 'Number of risk register entries still without a fully implemented control or mitigation.',
    read: 'Uncontrolled risks remain as live threats to institutional objectives; treat or accept them explicitly.',
  },
  {
    label: 'Missing COPC',
    what: 'Count of academic programs lacking a valid CHED COPC certificate for the current year.',
    read: 'Each missing certificate blocks program eligibility for external accreditation; prioritize renewal for expiring programs.',
  },
];

const TIER_LEGEND: Array<{ tier: Tier; color: string; meaning: string }> = [
  { tier: 'NOMINAL', color: D.green, meaning: '80+ — healthy range; maintain the current cadence.' },
  { tier: 'STABLE', color: D.greenDark, meaning: '60–79 — acceptable; monitor for drift.' },
  { tier: 'ATTENTION', color: D.goldDark, meaning: '40–59 — underperforming; schedule corrective focus.' },
  { tier: 'CRITICAL', color: D.red, meaning: 'Below 40 — significant gap; immediate prioritized action.' },
];

// ─── Numeric readout with count-up animation ──────────────────────────────
function Counter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 38;
    const id = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(id);
      } else setDisplay(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [value]);
  return <>{Math.round(display)}</>;
}

// ─── Single metric telemetry cell ─────────────────────────────────────────
function MetricCell({ label, value }: { label: string; value: number }) {
  const { color, glow, label: tierLabel } = inspectRatio(value);
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.14em] text-slate-400 flex items-center gap-1.5">
          <Activity className="h-3 w-3" style={{ color }} />
          {label}
        </span>
        <span
          className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm border"
          style={{ color, borderColor: `${color}55`, background: `${color}12` }}
        >
          {tierLabel}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-1">
        <span className="text-2xl font-black leading-none tabular-nums" style={{ color, textShadow: glow }}>
          <Counter value={value} />
        </span>
        <span className="text-[10px] font-black text-slate-500 mb-0.5">%</span>
      </div>

      <div className="mt-2 h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color, boxShadow: glow }}
        />
      </div>
    </div>
  );
}

// ─── Threat counter strip ─────────────────────────────────────────────────
function CountCell({ label, value, tier }: { label: string; value: number; tier: Tier }) {
  const pal = tier === 'CRITICAL' ? D.red : tier === 'ATTENTION' ? D.goldDark : D.green;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
        <ShieldAlert className="h-3 w-3" style={{ color: pal }} />
        {label}
      </span>
      <span className="text-base font-black tabular-nums" style={{ color: pal, textShadow: `0 0 10px ${pal}55` }}>
        {value}
      </span>
    </div>
  );
}

// ─── Complete data-glossary panel ─────────────────────────────────────────
function GlossaryPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5">
          <BookOpen className="h-3 w-3" style={{ color: D.violet }} />
          Data glossary — decoding every field
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
        >
          Close
        </button>
      </div>
      <div className="p-4 space-y-5">
        <section>
          <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Ratio metrics — telemetry cells
          </h4>
          <div className="space-y-3">
            {METRIC_DEFS.map((def) => (
              <div key={def.label} className="rounded-md border border-white/5 bg-black/20 p-3">
                <p
                  className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: D.cyan }}
                >
                  <Activity className="h-3 w-3" />
                  {def.label}
                </p>
                <p className="mt-1.5 text-[11px] font-mono leading-relaxed text-slate-300">
                  <span className="font-black uppercase tracking-widest text-slate-500 text-[8px]">
                    What it measures ·{' '}
                  </span>
                  {def.what}
                </p>
                <p className="mt-1 text-[11px] font-mono leading-relaxed text-slate-400">
                  <span className="font-black uppercase tracking-widest text-slate-500 text-[8px]">
                    How to read it ·{' '}
                  </span>
                  {def.read}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Threat counters</h4>
          <div className="space-y-3">
            {COUNT_DEFS.map((def) => (
              <div key={def.label} className="rounded-md border border-white/5 bg-black/20 p-3">
                <p
                  className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
                  style={{ color: D.goldDark }}
                >
                  <ShieldAlert className="h-3 w-3" />
                  {def.label}
                </p>
                <p className="mt-1.5 text-[11px] font-mono leading-relaxed text-slate-300">
                  <span className="font-black uppercase tracking-widest text-slate-500 text-[8px]">
                    What it measures ·{' '}
                  </span>
                  {def.what}
                </p>
                <p className="mt-1 text-[11px] font-mono leading-relaxed text-slate-400">
                  <span className="font-black uppercase tracking-widest text-slate-500 text-[8px]">
                    How to read it ·{' '}
                  </span>
                  {def.read}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2">Status tiers</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIER_LEGEND.map((t) => (
              <div key={t.tier} className="rounded-md border border-white/5 bg-black/20 p-2">
                <span className="text-[9px] font-black tabular-nums" style={{ color: t.color }}>
                  {t.tier}
                </span>
                <span className="block text-[8px] font-mono text-slate-400 mt-1 leading-snug">{t.meaning}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-mono leading-relaxed text-slate-500">
            Note: the EOMS Quality Index is the composite compliance readout of all monitored dimensions combined; tier
            bands above apply to each telemetry cell.
          </p>
        </section>
      </div>
    </div>
  );
}

/**
 * ADMIN-ONLY Executive AI Briefing card.
 * Renders only for admins; non-admins see nothing. Uses the locally loaded WebLLM
 * model (or a rule-based fallback when WebGPU/engine is unavailable) to produce an
 * institutional briefing, displayed here as a futuristic telemetry command-deck.
 */
export function AiExecutiveBriefing({ contextData, className = '' }: AiExecutiveBriefingProps) {
  const { isAdminOnly, isAiEnabled, status, generateExecutiveBriefing } = useWebLlm();
  const { toast } = useToast();
  const [briefing, setBriefing] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showGlossary, setShowGlossary] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!isAdminOnly) return;
    setIsGenerating(true);
    try {
      const result = await generateExecutiveBriefing(
        'Provide an executive briefing on the current institutional EOMS quality posture, its most critical gaps, and the prioritized actions required. For every metric you mention, briefly explain what the metric measures and what its value implies before stating the recommended action.',
        contextData,
      );
      setBriefing(result);
    } catch (e) {
      console.warn('Executive AI briefing generation failed:', e);
    } finally {
      setIsGenerating(false);
    }
  }, [isAdminOnly, contextData, generateExecutiveBriefing]);

  useEffect(() => {
    if (isAdminOnly) {
      handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOnly, JSON.stringify(contextData)]);

  const handleCopy = async () => {
    const ok = await copyToClipboard(briefing);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } else {
      toast({ title: 'Copy failed', variant: 'destructive' });
    }
  };

  // ─── Derive the telemetry deck from live metrics ────────────────────────
  const deck = useMemo(() => {
    const num = (k: string) => Number(contextData?.[k] ?? 0);
    // Metric values are stored either as a 0..1 ratio or a percentage; normalize to 0..100.
    const pct = (k: string) => {
      const n = Number(contextData?.[k] ?? 0);
      if (!Number.isFinite(n) || n < 0) return 0;
      return n <= 1 ? Math.round(n * 100) : n;
    };

    const metrics = [
      { label: 'Submission Compliance', v: pct('submissionRate') },
      { label: 'IQA Progress', v: pct('iqaProgressRate') },
      { label: 'CAR Resolution', v: pct('carResolutionRate') },
      { label: 'Risk Control', v: pct('riskControlRate') },
      { label: 'CHED COPC Compliance', v: pct('copcComplianceRate') },
      { label: 'Accreditation Performance', v: pct('accreditationRate') },
    ]
      .map((m) => ({ label: m.label, value: Math.round(m.v) }))
      .filter((m) => Number.isFinite(m.value) && m.value >= 0);

    const openCars = num('openCars');
    const pendingAudits = num('pendingAudits');
    const openRisks = num('openRisks');
    const missingCopc = num('missingCopc');

    const counts: Array<{ label: string; value: number; tier: Tier }> = [
      { label: 'Open CARs', value: openCars, tier: openCars > 0 ? 'ATTENTION' : 'NOMINAL' },
      { label: 'Pending Audits', value: pendingAudits, tier: pendingAudits > 0 ? 'ATTENTION' : 'NOMINAL' },
      {
        label: 'Open Risks',
        value: openRisks,
        tier: openRisks > 20 ? 'CRITICAL' : openRisks > 0 ? 'ATTENTION' : 'NOMINAL',
      },
      { label: 'Missing COPC', value: missingCopc, tier: missingCopc > 0 ? 'ATTENTION' : 'NOMINAL' },
    ];

    const score = Math.round(pct('eomsQualityScore') || pct('eomsScore'));
    const nCritical = metrics.filter((m) => inspectRatio(m.value).tier === 'CRITICAL').length;
    const nAttention = metrics.filter((m) => inspectRatio(m.value).tier === 'ATTENTION').length;

    return { score, metrics, counts, critical: nCritical, attention: nAttention };
  }, [contextData]);

  const scopeBadge = contextData?.scope === 'unit' ? 'UNIT' : contextData?.scope === 'campus' ? 'CAMPUS' : 'UNIVERSITY';

  // Admin-only: render nothing for non-admins.
  if (!isAdminOnly) return null;

  const isReady = isAiEnabled && status === 'ready';

  return (
    <Card
      className={cn('relative border border-white/10 shadow-lg overflow-hidden bg-[#060a14] text-white', className)}
    >
      <style>{`
        @keyframes eqiScan { 0% { transform: translateX(-130%); } 100% { transform: translateX(230%); } }
        @keyframes eqiBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
        .eqi-scan::after {
          content: ''; position: absolute; top: 0; left: 0; height: 100%; width: 34%;
          background: linear-gradient(90deg, transparent, rgba(34,211,238,0.10), transparent);
          animation: eqiScan 4.2s linear infinite; pointer-events: none;
        }
        .eqi-caret { animation: eqiBlink 1.1s step-end infinite; }
      `}</style>

      <div className="eqi-scan pointer-events-none absolute inset-0 z-0" />

      <CardHeader className="relative z-10 border-b border-white/10 pb-3 bg-gradient-to-r from-[#0b1526] via-primary/10 to-transparent">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <BrainCircuit className="h-5 w-5" style={{ color: D.cyan }} />
              Executive AI Briefing
            </CardTitle>
            <CardDescription className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400 mt-0.5 flex items-center gap-2">
              <Cpu className="h-3 w-3" style={{ color: D.violet }} />
              Local On-Device Synthesis · Institutional Quality Posture
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className="text-[8px] font-black uppercase border-none px-2 py-1 rounded-sm"
              style={{
                background: isReady ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.12)',
                color: isReady ? D.green : D.slate,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full mr-1 eqi-caret"
                style={{ background: isReady ? D.green : D.slate }}
              />
              {isReady ? 'Engine Online' : 'Template Mode'}
            </Badge>
            <Badge
              className="text-[8px] font-black uppercase border-none px-2 py-1 rounded-sm"
              style={{ background: 'rgba(34,211,238,0.12)', color: D.cyan }}
            >
              {scopeBadge} Scope
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-5">
        {/* Command bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 flex items-center gap-1.5">
            <Gauge className="h-3 w-3" style={{ color: D.cyan }} />
            Live telemetry · {status === 'ready' ? 'On-device model' : 'Admin-only · Local AI · No cloud'}
          </p>
          <div className="flex items-center gap-1">
            {briefing && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-white rounded-full"
                title="Copy briefing"
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-400 hover:text-white rounded-full"
              title="Regenerate briefing"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: D.cyan }} />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* EQI + telemetry grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="eqi-scan relative rounded-lg border border-white/10 bg-black/30 p-4 flex flex-col items-center justify-center overflow-hidden">
            <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">
              <Zap className="h-3 w-3" style={{ color: D.gold }} />
              EOMS Quality Index · {scopeBadge}
            </div>
            <div
              className="mt-2 text-5xl font-black tracking-tight tabular-nums"
              style={{ color: D.cyan, textShadow: `0 0 20px ${D.cyan}66` }}
            >
              <Counter value={deck.score} />
            </div>
            <div className="text-[9px] font-black uppercase tracking-widest mt-1" style={{ color: D.violet }}>
              Active Compliance Index
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {deck.critical > 0 && (
                <Badge
                  className="text-[7px] font-black uppercase border-none rounded-sm px-2 py-0.5"
                  style={{ background: 'rgba(220,38,38,0.18)', color: D.red }}
                >
                  {deck.critical} Critical
                </Badge>
              )}
              {deck.attention > 0 && (
                <Badge
                  className="text-[7px] font-black uppercase border-none rounded-sm px-2 py-0.5"
                  style={{ background: 'rgba(217,119,6,0.15)', color: D.goldDark }}
                >
                  {deck.attention} Attention
                </Badge>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {deck.metrics.map((m) => (
              <MetricCell key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </div>

        {/* Threat counters */}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {deck.counts.map((c) => (
            <CountCell key={c.label} label={c.label} value={c.value} tier={c.tier} />
          ))}
        </div>

        {/* AI narrative briefing — terminal panel */}
        <div className="mt-4 rounded-lg border border-white/10 bg-black/40 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border-b border-white/10">
            <span className="h-2 w-2 rounded-full bg-red-500/70" />
            <span className="h-2 w-2 rounded-full bg-yellow-500/70" />
            <span className="h-2 w-2 rounded-full bg-green-500/70" />
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 ml-2 flex items-center gap-1.5">
              <FileWarning className="h-3 w-3" style={{ color: D.gold }} />
              ai-briefing.term
            </span>
            {briefing && (
              <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                <Save className="h-3 w-3" /> Synthesized
              </span>
            )}
          </div>
          <div className="p-4 min-h-[110px] font-mono text-[12px] leading-relaxed">
            {isGenerating ? (
              <span className="inline-flex items-center gap-2 animate-pulse font-medium" style={{ color: D.cyan }}>
                <Bot className="h-4 w-4 animate-bounce" />
                Synthesizing executive briefing from live metrics
                <span className="eqi-caret">▊</span>
              </span>
            ) : briefing ? (
              <p className="text-slate-200 whitespace-pre-line">{briefing}</p>
            ) : (
              <p className="text-slate-500">
                <span style={{ color: D.green }}>$</span> await command — trigger refresh to decode institutional
                posture
                <span className="eqi-caret text-slate-300">▊</span>
              </p>
            )}
          </div>
        </div>

        {/* Data glossary toggle */}
        <div className="mt-3">
          {showGlossary ? (
            <GlossaryPanel onClose={() => setShowGlossary(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowGlossary(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 hover:border-white/30 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" style={{ color: D.violet }} />
              Read the full description &amp; explanation of every metric
              <ChevronDown className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
