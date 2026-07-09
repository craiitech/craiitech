'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Cell } from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Award,
  Activity,
  GraduationCap,
  CheckCircle2,
  Target,
  ClipboardCheck,
  BookOpen,
  FileText,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from 'lucide-react';
import type {
  Submission,
  Unit,
  Campus,
  Risk,
  AuditSchedule,
  CorrectiveActionRequest,
  ProgramComplianceRecord,
  AcademicProgram,
} from '@/lib/types';
import { normalizeReportType } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────
const VIEW_INTERVAL_MS = 60_000;
const IDLE_TIMEOUT_MS = 5_000;
const TOTAL_VIEWS = 5;

const PALETTE = {
  green: '#22c55e',
  greenDark: '#166534',
  greenLight: '#4ade80',
  gold: '#eab308',
  goldLight: '#fde047',
  goldDark: '#a16207',
  white: '#ffffff',
  whiteDim: 'rgba(255,255,255,0.7)',
  whiteMuted: 'rgba(255,255,255,0.4)',
  whiteFaint: 'rgba(255,255,255,0.15)',
};

const P = PALETTE;

const GG = { green: P.green, gold: P.gold, greenLight: P.greenLight, goldLight: P.goldLight };

function gradeColor(score: number) {
  if (score >= 88) return P.green;
  if (score >= 70) return P.greenLight;
  if (score >= 55) return P.gold;
  if (score >= 40) return P.goldDark;
  return P.whiteDim;
}

function statusColor(rate: number) {
  if (rate >= 80) return P.green;
  if (rate >= 60) return P.greenLight;
  if (rate >= 40) return P.gold;
  return P.whiteDim;
}

// ─── Animated Counter ────────────────────────────────────────────────────────
function AnimatedNumber({
  value,
  suffix = '',
  decimals = 0,
  className,
}: {
  value: number;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / 40;
    const id = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(id);
      } else setDisplay(Math.floor(start));
    }, 20);
    return () => clearInterval(id);
  }, [value]);
  return (
    <span className={className}>
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────
function KpiTile({
  label,
  value,
  suffix = '%',
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: any;
  color: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 flex flex-col gap-1.5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/70">{label}</p>
        <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: `${color}33` }}>
          <Icon className="h-3 w-3" style={{ color: P.white }} />
        </div>
      </div>
      <AnimatedNumber value={value} suffix={suffix} className="text-2xl font-black tabular-nums text-white" />
      {sub && <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">{sub}</p>}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        style={{ background: `linear-gradient(to right, ${color}, ${P.goldLight})` }}
      />
    </div>
  );
}

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  color,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-3 shrink-0">
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}33`, border: `1px solid ${P.goldLight}` }}
      >
        <Icon className="h-4 w-4" style={{ color: P.white }} />
      </div>
      <div>
        <h2 className="text-lg font-black tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-[8px] text-white/60 font-bold uppercase tracking-widest">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-green-950/95 border border-yellow-600/30 rounded-xl p-3 shadow-2xl text-xs backdrop-blur-md">
      {label && <p className="font-black text-yellow-400 uppercase tracking-widest mb-2">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color || P.green }} />
          <span className="text-white/80">{p.name}:</span>
          <span className="font-black text-white">{typeof p.value === 'number' ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Mini Bar ────────────────────────────────────────────────────────────────
function MiniBar({ value, color }: { value: number; color?: string }) {
  const c = color || statusColor(value);
  return (
    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden w-full max-w-[80px]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, value)}%`, background: c }}
      />
    </div>
  );
}

// ─── Campus Row ──────────────────────────────────────────────────────────────
function CampusRow({
  rank,
  name,
  metrics,
  highlightColor,
}: {
  rank: number;
  name: string;
  metrics: { label: string; value: number; color?: string }[];
  highlightColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors border-b border-white/10 last:border-0">
      <span className="text-[10px] font-black text-white/40 w-5 text-right tabular-nums">{rank}</span>
      <span className="text-xs font-bold text-white/90 truncate w-28 shrink-0">{name}</span>
      {metrics.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-1">
          <span className="text-[9px] font-black text-white/40 w-12 text-right tabular-nums">{m.value}%</span>
          <MiniBar value={m.value} color={m.color || statusColor(m.value)} />
        </div>
      ))}
    </div>
  );
}

// ─── Narrative Card ──────────────────────────────────────────────────────────
function NarrativeCard({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm p-4 flex flex-col gap-2 shadow-md">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/60">{title}</p>
      </div>
      <p className="text-[10px] text-white/80 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── News Ticker ──────────────────────────────────────────────────────────
function NewsTicker({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="relative overflow-hidden h-7 bg-green-950/60 border-t border-white/10 shrink-0">
      <div className="flex items-center h-full whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite' }}>
        {items.concat(items).map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2 mx-6 text-[10px] font-bold text-white/80 uppercase tracking-wider"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 1: Institutional Performance Overview
// ═══════════════════════════════════════════════════════════════════════════════
function ViewOverview({
  campuses,
  eomsScore,
  radarData,
}: {
  campuses: any[];
  eomsScore: number;
  radarData: { subject: string; value: number; color: string }[];
}) {
  const grade = eomsScore >= 88 ? 'A' : eomsScore >= 70 ? 'B+' : eomsScore >= 55 ? 'B' : eomsScore >= 40 ? 'C' : 'F';
  const sc = gradeColor(eomsScore);
  const topCampus = campuses.length
    ? campuses.reduce((a: any, b: any) => (a.compositeScore > b.compositeScore ? a : b))
    : null;
  const lowCampus = campuses.length
    ? campuses.reduce((a: any, b: any) => (a.compositeScore < b.compositeScore ? a : b))
    : null;

  const tableMetrics = (c: any) => [
    { label: 'Sub', value: c.subsRate, color: P.green },
    { label: 'Risk', value: c.riskRate, color: P.gold },
    { label: 'CAR', value: c.carRate, color: P.greenLight },
    { label: 'Audit', value: c.auditRate, color: P.goldDark },
    {
      label: 'Accred',
      value: c.programsTotal > 0 ? Math.round((c.programsWithCopc / c.programsTotal) * 100) : 0,
      color: P.gold,
    },
  ];

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={ShieldCheck}
        title="Institutional Performance Overview"
        subtitle="Campus-level EOMS health assessment"
        color={sc}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Grade card */}
        <div className="col-span-2 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm flex flex-col items-center justify-center p-3 relative overflow-hidden shadow-lg">
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 50%, ${sc}15, transparent 70%)` }}
          />
          <p className="text-[7px] font-black uppercase tracking-[0.2em] text-white/40">EOMS</p>
          <div className="text-5xl font-black leading-none" style={{ color: sc }}>
            {grade}
          </div>
          <AnimatedNumber value={eomsScore} suffix="%" className="text-base font-black text-white mt-1" />
          <p className="text-[7px] text-white/40 font-bold uppercase tracking-widest mt-1 text-center leading-tight">
            {eomsScore >= 88
              ? 'Mature'
              : eomsScore >= 70
                ? 'Good Standing'
                : eomsScore >= 55
                  ? 'Satisfactory'
                  : 'Needs Improvement'}
          </p>
        </div>

        {/* Radar */}
        <div className="col-span-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Quality Dimensions</p>
          <div className="h-[calc(100%-20px)]">
            <div className="flex flex-wrap gap-1 mb-2">
              {radarData.map((d) => (
                <div key={d.subject} className="flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: d.color }} />
                  <span className="text-[6px] font-bold text-white/40">{d.subject}</span>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {radarData.map((d) => (
                <div key={d.subject} className="flex items-center gap-2">
                  <span className="text-[7px] font-bold text-white/50 w-16 truncate">{d.subject}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                  <span className="text-[8px] font-black text-white/60 w-7 text-right tabular-nums">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campus table */}
        <div className="col-span-4 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3 flex flex-col">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2 shrink-0">
            Campus Performance Ranking
          </p>
          <div className="flex-1 overflow-hidden">
            <div className="flex text-[7px] font-black text-white/30 uppercase tracking-wider mb-1 px-3">
              <span className="w-5 shrink-0" />
              <span className="w-28 shrink-0">Campus</span>
              <span className="flex-1 text-center">Sub</span>
              <span className="flex-1 text-center">Risk</span>
              <span className="flex-1 text-center">CAR</span>
              <span className="flex-1 text-center">Audit</span>
              <span className="flex-1 text-center">Accred</span>
            </div>
            <div className="space-y-0 overflow-y-auto max-h-[calc(100%-18px)]">
              {campuses
                .sort((a: any, b: any) => b.compositeScore - a.compositeScore)
                .map((c: any, i: number) => (
                  <CampusRow key={c.id} rank={i + 1} name={c.name} metrics={tableMetrics(c)} />
                ))}
            </div>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-3 flex flex-col gap-2">
          <NarrativeCard
            title="What This Means"
            text="The institutional EOMS score reflects the university's overall quality management health. It aggregates campus-level performance across document submission, risk mitigation, corrective action closure, audit completion, and program accreditation. Campuses scoring above 80% demonstrate mature alignment with the quality management system."
            color={sc}
          />
          {topCampus && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-sm p-3 shadow-md">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-green-300">Top Performer</p>
              <p className="text-xs font-black text-green-200">{topCampus.name}</p>
              <p className="text-[8px] text-white/70 mt-0.5">
                Leading with {topCampus.compositeScore}% composite score
              </p>
            </div>
          )}
          {lowCampus && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/10 backdrop-blur-sm p-3 shadow-md">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-yellow-400">Needs Attention</p>
              <p className="text-xs font-black text-yellow-400">{lowCampus.name}</p>
              <p className="text-[8px] text-white/70 mt-0.5">
                At {lowCampus.compositeScore}% — targeted intervention recommended
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 2: Submission Compliance
// ═══════════════════════════════════════════════════════════════════════════════
function ViewSubmissions({
  campuses,
  totalApproved,
  totalPending,
  totalRejected,
  totalSubs,
}: {
  campuses: any[];
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalSubs: number;
}) {
  const rate = totalSubs > 0 ? Math.round((totalApproved / totalSubs) * 100) : 0;
  const chartData = campuses
    .filter((c) => c.subsTotal > 0)
    .sort((a: any, b: any) => b.subsRate - a.subsRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.subsRate }));

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={ClipboardCheck}
        title="Submission Compliance by Campus"
        subtitle="Document submission rates across all units"
        color={P.greenLight}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="Compliance Rate" value={rate} icon={CheckCircle2} color={statusColor(rate)} />
          <KpiTile
            label="Approved"
            value={totalApproved}
            suffix=""
            icon={FileText}
            color={P.green}
            sub={`of ${totalSubs} total`}
          />
          {totalPending > 0 && (
            <KpiTile label="Pending" value={totalPending} suffix="" icon={FileText} color={P.gold} />
          )}
        </div>

        {/* Table */}
        <div className="col-span-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3 flex flex-col">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2 shrink-0">
            Compliance by Campus
          </p>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {campuses
              .filter((c: any) => c.subsTotal > 0)
              .sort((a: any, b: any) => b.subsRate - a.subsRate)
              .map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5">
                  <span className="text-[8px] font-black text-white/30 w-4 tabular-nums">{i + 1}</span>
                  <span className="text-[10px] font-bold text-white/70 w-24 truncate shrink-0">{c.name}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.subsRate}%`, background: statusColor(c.subsRate) }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-white/60 w-8 text-right tabular-nums">{c.subsRate}%</span>
                  <span className="text-[7px] text-white/30 w-12 text-right">
                    {c.subsApproved}/{c.subsTotal}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Top 10 Compliance</p>
          <div className="h-[calc(100%-20px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: 700 }}
                  width={70}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} name="Rate">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? P.green : i < 6 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Why Submissions Matter"
            text="Document submission compliance measures how consistently units meet reporting deadlines. High compliance rates indicate strong adherence to the QMS documentation requirements. Low-performing campuses may need additional support in document management and submission workflows."
            color={P.greenLight}
          />
          <NarrativeCard
            title="University Context"
            text={`With ${totalApproved} of ${totalSubs} submissions approved (${rate}%), the university maintains ${rate >= 80 ? 'strong' : rate >= 60 ? 'adequate' : 'below-target'} compliance. The target is 80% or higher for all campuses.`}
            color={P.greenLight}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 3: Risk Management
// ═══════════════════════════════════════════════════════════════════════════════
function ViewRisks({
  campuses,
  totalRisks,
  closedRisks,
  highRisks,
}: {
  campuses: any[];
  totalRisks: number;
  closedRisks: number;
  highRisks: number;
}) {
  const rate = totalRisks > 0 ? Math.round((closedRisks / totalRisks) * 100) : 0;
  const chartData = campuses
    .filter((c: any) => c.risksTotal > 0)
    .sort((a: any, b: any) => b.riskRate - a.riskRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.riskRate }));

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={AlertTriangle}
        title="Risk Management by Campus"
        subtitle="Risk identification, treatment, and mitigation effectiveness"
        color={P.gold}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="Mitigation Rate" value={rate} icon={ShieldCheck} color={statusColor(rate)} />
          <KpiTile label="Total Risks" value={totalRisks} suffix="" icon={AlertTriangle} color={P.gold} />
          {highRisks > 0 && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/10 backdrop-blur-sm px-4 py-3">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-yellow-400">High Risk</p>
              <p className="text-2xl font-black text-white tabular-nums">{highRisks}</p>
              <p className="text-[7px] text-white/60 mt-0.5">Requires immediate attention</p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="col-span-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3 flex flex-col">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2 shrink-0">
            Risk Mitigation by Campus
          </p>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {campuses
              .filter((c: any) => c.risksTotal > 0)
              .sort((a: any, b: any) => b.riskRate - a.riskRate)
              .map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5">
                  <span className="text-[8px] font-black text-white/30 w-4 tabular-nums">{i + 1}</span>
                  <span className="text-[10px] font-bold text-white/70 w-24 truncate shrink-0">{c.name}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.riskRate}%`, background: statusColor(c.riskRate) }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-white/60 w-8 text-right tabular-nums">{c.riskRate}%</span>
                  <span className="text-[7px] text-white/30 w-16 text-right">
                    {c.risksClosed}/{c.risksTotal}
                  </span>
                  {c.risksHigh > 0 && (
                    <span className="text-[7px] font-bold text-yellow-400 w-6 text-right">{c.risksHigh}!</span>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">Top Mitigation Rates</p>
          <div className="h-[calc(100%-20px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: 700 }}
                  width={70}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} name="Mitigated">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? P.green : i < 6 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Why Risk Management Matters"
            text="Effective risk management protects the university from operational, financial, and reputational harm. The mitigation rate indicates how successfully identified risks have been treated. Campuses with high open risk counts or elevated high-risk items should prioritize their risk treatment plans."
            color={P.gold}
          />
          <NarrativeCard
            title="Strategic Context"
            text={
              highRisks > 0
                ? `With ${highRisks} high-risk items remaining across all campuses, immediate executive attention is needed for these critical exposures. ${rate}% overall mitigation shows ${rate >= 70 ? 'strong' : 'developing'} risk governance.`
                : `All high-risk items have been addressed. The university's ${rate}% mitigation rate reflects a ${rate >= 70 ? 'mature' : 'developing'} risk-aware culture.`
            }
            color={P.whiteDim}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 4: CAR Performance
// ═══════════════════════════════════════════════════════════════════════════════
function ViewCars({
  campuses,
  totalCars,
  closedCars,
  openCars,
}: {
  campuses: any[];
  totalCars: number;
  closedCars: number;
  openCars: number;
}) {
  const rate = totalCars > 0 ? Math.round((closedCars / totalCars) * 100) : 0;
  const chartData = campuses
    .filter((c: any) => c.carsTotal > 0)
    .sort((a: any, b: any) => b.carRate - a.carRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.carRate }));

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={CheckCircle2}
        title="Corrective Action Performance"
        subtitle="CAR closure rates and effectiveness by campus"
        color={P.greenLight}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="CAR Closure Rate" value={rate} icon={CheckCircle2} color={statusColor(rate)} />
          <KpiTile
            label="Total CARs"
            value={totalCars}
            suffix=""
            icon={FileText}
            color={P.greenLight}
            sub={`${closedCars} closed · ${openCars} open`}
          />
        </div>

        {/* Table */}
        <div className="col-span-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3 flex flex-col">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2 shrink-0">
            CAR Closure by Campus
          </p>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {campuses
              .filter((c: any) => c.carsTotal > 0)
              .sort((a: any, b: any) => b.carRate - a.carRate)
              .map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5">
                  <span className="text-[8px] font-black text-white/30 w-4 tabular-nums">{i + 1}</span>
                  <span className="text-[10px] font-bold text-white/70 w-24 truncate shrink-0">{c.name}</span>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${c.carRate}%`, background: statusColor(c.carRate) }}
                    />
                  </div>
                  <span className="text-[9px] font-black text-white/60 w-8 text-right tabular-nums">{c.carRate}%</span>
                  <span className="text-[7px] text-white/30 w-14 text-right">
                    {c.carsClosed}/{c.carsTotal}
                  </span>
                  {c.carsOpen > 0 && c.carRate < 50 && <span className="text-[7px] font-bold text-yellow-400">!</span>}
                </div>
              ))}
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">CAR Closure Rates</p>
          <div className="h-[calc(100%-20px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: 700 }}
                  width={70}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} name="Closed">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? P.green : i < 6 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Why CAR Closure Matters"
            text="Corrective Action Requests are the primary mechanism for addressing non-conformities identified during audits and operations. High closure rates demonstrate a campus's commitment to continuous improvement. Delayed CARs may indicate systemic issues needing management attention."
            color={P.greenLight}
          />
          <NarrativeCard
            title="Current Status"
            text={`With ${closedCars} of ${totalCars} CARs resolved (${rate}%), the institution is ${rate >= 70 ? 'effectively' : 'gradually'} addressing identified issues. ${openCars > 5 ? `The ${openCars} open CARs need coordinated follow-up.` : 'Open CARs are being managed within acceptable thresholds.'}`}
            color={P.green}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 5: Accreditation & Programs
// ═══════════════════════════════════════════════════════════════════════════════
function ViewAccred({
  campuses,
  totalPrograms,
  withCopc,
  noCopc,
  inProg,
}: {
  campuses: any[];
  totalPrograms: number;
  withCopc: number;
  noCopc: number;
  inProg: number;
}) {
  const copcRate = totalPrograms > 0 ? Math.round((withCopc / totalPrograms) * 100) : 0;
  const chartData = campuses
    .filter((c: any) => c.programsTotal > 0)
    .sort((a: any, b: any) => {
      const aRate = a.programsTotal > 0 ? (a.programsWithCopc / a.programsTotal) * 100 : 0;
      const bRate = b.programsTotal > 0 ? (b.programsWithCopc / b.programsTotal) * 100 : 0;
      return bRate - aRate;
    })
    .slice(0, 10)
    .map((c: any) => ({
      name: c.name,
      rate: c.programsTotal > 0 ? Math.round((c.programsWithCopc / c.programsTotal) * 100) : 0,
    }));

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={GraduationCap}
        title="Accreditation & COPC Compliance"
        subtitle="Program compliance with CHED COPC requirements and accreditation"
        color={P.gold}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="COPC Compliance" value={copcRate} icon={Award} color={statusColor(copcRate)} />
          <KpiTile
            label="Total Programs"
            value={totalPrograms}
            suffix=""
            icon={BookOpen}
            color={P.gold}
            sub={`${withCopc} with COPC`}
          />
          {noCopc > 0 && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-500/10 backdrop-blur-sm px-4 py-3">
              <p className="text-[7px] font-black uppercase tracking-[0.15em] text-yellow-400">No COPC</p>
              <p className="text-2xl font-black text-white tabular-nums">{noCopc}</p>
              <p className="text-[7px] text-white/60 mt-0.5">Programs needing attention</p>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="col-span-5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3 flex flex-col">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2 shrink-0">
            Program COPC by Campus
          </p>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {campuses
              .filter((c: any) => c.programsTotal > 0)
              .sort((a: any, b: any) => {
                const aRate = a.programsTotal > 0 ? (a.programsWithCopc / a.programsTotal) * 100 : 0;
                const bRate = b.programsTotal > 0 ? (b.programsWithCopc / b.programsTotal) * 100 : 0;
                return bRate - aRate;
              })
              .map((c: any, i: number) => {
                const pRate = c.programsTotal > 0 ? Math.round((c.programsWithCopc / c.programsTotal) * 100) : 0;
                return (
                  <div key={c.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5">
                    <span className="text-[8px] font-black text-white/30 w-4 tabular-nums">{i + 1}</span>
                    <span className="text-[10px] font-bold text-white/70 w-24 truncate shrink-0">{c.name}</span>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pRate}%`, background: statusColor(pRate) }}
                      />
                    </div>
                    <span className="text-[9px] font-black text-white/60 w-8 text-right tabular-nums">{pRate}%</span>
                    <span className="text-[7px] text-white/30 w-16 text-right">
                      {c.programsWithCopc}/{c.programsTotal}
                    </span>
                    {c.programsNoCopc > 0 && (
                      <span className="text-[7px] font-bold text-yellow-400 w-5 text-right">{c.programsNoCopc}</span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Chart */}
        <div className="col-span-3 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-lg p-3">
          <p className="text-[7px] font-black uppercase tracking-[0.15em] text-white/40 mb-2">COPC Compliance Rates</p>
          <div className="h-[calc(100%-20px)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 8 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: 700 }}
                  width={70}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="rate" radius={[0, 3, 3, 0]} name="COPC Rate">
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? P.green : i < 6 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Why COPC & Accreditation Matter"
            text="CHED Certificate of Program Compliance (COPC) is a regulatory requirement for all academic programs. Accreditation levels (I-IV) reflect program quality against national standards. Programs without COPC or with lapsed accreditation may face regulatory sanctions."
            color={P.gold}
          />
          <NarrativeCard
            title="University Position"
            text={`With ${copcRate}% of programs COPC-compliant and ${noCopc} programs needing action, the university must prioritize securing compliance for non-compliant programs to maintain CHED regulatory good standing.`}
            color={P.goldDark}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW METADATA
// ═══════════════════════════════════════════════════════════════════════════════
const VIEW_META = [
  { label: 'Overview', icon: ShieldCheck, color: P.green },
  { label: 'Submissions', icon: ClipboardCheck, color: P.greenLight },
  { label: 'Risks', icon: AlertTriangle, color: P.gold },
  { label: 'CARs', icon: CheckCircle2, color: P.greenLight },
  { label: 'Accreditation', icon: GraduationCap, color: P.gold },
];

// ═══════════════════════════════════════════════════════════════════════════════
// INTERFACE
// ═══════════════════════════════════════════════════════════════════════════════
interface CampusPerf {
  id: string;
  name: string;
  subsTotal: number;
  subsApproved: number;
  subsPending: number;
  subsRejected: number;
  subsRate: number;
  risksTotal: number;
  risksOpen: number;
  risksClosed: number;
  risksHigh: number;
  risksMed: number;
  risksLow: number;
  riskRate: number;
  carsTotal: number;
  carsOpen: number;
  carsClosed: number;
  carRate: number;
  programsTotal: number;
  programsWithCopc: number;
  programsInProg: number;
  programsNoCopc: number;
  programsTopLevel: string;
  auditsTotal: number;
  auditsCompleted: number;
  auditsInProg: number;
  auditsScheduled: number;
  auditsOverdue: number;
  auditRate: number;
  compositeScore: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function ExecutiveDisplayPage() {
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const [currentView, setCurrentView] = useState(0);
  const [animPhase, setAnimPhase] = useState<'show' | 'hide' | 'enter'>('show');
  const [isIdle, setIsIdle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const viewTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fsAttempted, setFsAttempted] = useState(false);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Idle detection ────────────────────────────────────────────────────────
  const resetIdle = useCallback(() => {
    setIsIdle(false);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);
    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  // ── View auto-rotation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isIdle) {
      clearTimeout(viewTimer.current);
      return;
    }
    viewTimer.current = setTimeout(() => {
      setAnimPhase('hide');
    }, VIEW_INTERVAL_MS);
    return () => clearTimeout(viewTimer.current);
  }, [isIdle, currentView, animPhase]);

  // Handle animation phases
  useEffect(() => {
    if (animPhase === 'hide') {
      const t = setTimeout(() => {
        setCurrentView((s) => (s + 1) % TOTAL_VIEWS);
        setTimeout(() => setAnimPhase('enter'), 50); // Micro-delay for DOM paint
      }, 350);
      return () => clearTimeout(t);
    }
    if (animPhase === 'enter') {
      const t = setTimeout(() => setAnimPhase('show'), 450);
      return () => clearTimeout(t);
    }
  }, [animPhase]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    containerRef.current?.requestFullscreen().catch(() => {});
    setFsAttempted(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      containerRef.current?.requestFullscreen().catch(() => {});
      setFsAttempted(true);
    }, 1000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (!fs) {
        setFsAttempted(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const submissionsQ = useMemoFirebase(() => (firestore ? collection(firestore, 'submissions') : null), [firestore]);
  const { data: rawSubs } = useCollection<Submission>(submissionsQ);
  const risksQ = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: rawRisks } = useCollection<Risk>(risksQ);
  const carsQ = useMemoFirebase(
    () => (firestore ? collection(firestore, 'corrective_action_requests') : null),
    [firestore],
  );
  const { data: rawCars } = useCollection<CorrectiveActionRequest>(carsQ);
  const compliancesQ = useMemoFirebase(
    () => (firestore ? collection(firestore, 'program_compliance') : null),
    [firestore],
  );
  const { data: rawCompliances } = useCollection<ProgramComplianceRecord>(compliancesQ);
  const programsQ = useMemoFirebase(() => (firestore ? collection(firestore, 'academic_programs') : null), [firestore]);
  const { data: rawPrograms } = useCollection<AcademicProgram>(programsQ);
  const schedulesQ = useMemoFirebase(() => (firestore ? collection(firestore, 'audit_schedules') : null), [firestore]);
  const { data: rawSchedules } = useCollection<AuditSchedule>(schedulesQ);
  const unitsQ = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits } = useCollection<Unit>(unitsQ);
  const campusesQ = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: allCampuses } = useCollection<Campus>(campusesQ);

  // ── Memoised derivations ──────────────────────────────────────────────────
  const submissions = useMemo(
    () => (rawSubs || []).map((s) => ({ ...s, reportType: normalizeReportType(s.reportType) })),
    [rawSubs],
  );
  const yearSubs = useMemo(
    () => submissions.filter((s) => Number(s.year) === Number(selectedYear)),
    [submissions, selectedYear],
  );
  const yearRisks = useMemo(
    () => (rawRisks || []).filter((r) => Number(r.year) === Number(selectedYear)),
    [rawRisks, selectedYear],
  );
  const yearCars = useMemo(
    () =>
      (rawCars || []).filter((c) => {
        if (!c.createdAt) return true;
        const d = c.createdAt instanceof Timestamp ? c.createdAt.toDate() : new Date(c.createdAt as any);
        return d.getFullYear() === Number(selectedYear);
      }),
    [rawCars, selectedYear],
  );
  const yearSch = useMemo(
    () =>
      (rawSchedules || []).filter((s) => {
        if (!s.scheduledDate) return false;
        const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate as any);
        return d.getFullYear() === Number(selectedYear);
      }),
    [rawSchedules, selectedYear],
  );

  const campusMap = useMemo(() => new Map((allCampuses || []).map((c) => [c.id, c.name])), [allCampuses]);

  // ── Campus performance data ───────────────────────────────────────────────
  const campusData = useMemo(() => {
    const map = new Map<string, CampusPerf>();

    (allCampuses || []).forEach((c) => {
      map.set(c.id, {
        id: c.id,
        name: c.name || c.id,
        subsTotal: 0,
        subsApproved: 0,
        subsPending: 0,
        subsRejected: 0,
        subsRate: 0,
        risksTotal: 0,
        risksOpen: 0,
        risksClosed: 0,
        risksHigh: 0,
        risksMed: 0,
        risksLow: 0,
        riskRate: 0,
        carsTotal: 0,
        carsOpen: 0,
        carsClosed: 0,
        carRate: 0,
        programsTotal: 0,
        programsWithCopc: 0,
        programsInProg: 0,
        programsNoCopc: 0,
        programsTopLevel: 'None',
        auditsTotal: 0,
        auditsCompleted: 0,
        auditsInProg: 0,
        auditsScheduled: 0,
        auditsOverdue: 0,
        auditRate: 0,
        compositeScore: 0,
      });
    });

    // Submissions
    yearSubs.forEach((s) => {
      const c = map.get(s.campusId);
      if (!c) return;
      c.subsTotal++;
      if (s.statusId === 'approved') c.subsApproved++;
      else if (s.statusId === 'rejected') c.subsRejected++;
      else c.subsPending++;
    });

    // Risks
    yearRisks.forEach((r) => {
      const c = map.get(r.campusId);
      if (!c) return;
      c.risksTotal++;
      if (r.status === 'Closed') c.risksClosed++;
      else c.risksOpen++;
      if (r.preTreatment?.rating === 'high' || r.postTreatment?.rating === 'high') c.risksHigh++;
      else if (r.preTreatment?.rating === 'medium' || r.postTreatment?.rating === 'medium') c.risksMed++;
      else c.risksLow++;
    });

    // CARs
    yearCars.forEach((car) => {
      const c = map.get(car.campusId);
      if (!c) return;
      c.carsTotal++;
      if (car.status === 'Closed') c.carsClosed++;
      else c.carsOpen++;
    });

    // Programs
    const activePrograms = (rawPrograms || []).filter((p) => p.isActive);
    activePrograms.forEach((p) => {
      const c = map.get(p.campusId);
      if (!c) return;
      c.programsTotal++;
      const comp = (rawCompliances || []).find((co) => co.programId === p.id);
      if (comp?.ched?.copcStatus === 'With COPC') c.programsWithCopc++;
      else if (comp?.ched?.copcStatus === 'In Progress') c.programsInProg++;
      else c.programsNoCopc++;
      // Track top accreditation level
      const records = comp?.accreditationRecords || [];
      const cur = records.find((r) => r.lifecycleStatus === 'Current') || records[records.length - 1];
      if (cur?.level) {
        const lvlOrder = ['Level IV', 'Level III', 'Level II', 'Level I', 'Candidate'];
        const currentTop = lvlOrder.indexOf(c.programsTopLevel);
        const thisLvl = lvlOrder.find((l) => cur.level.includes(l));
        if (thisLvl && lvlOrder.indexOf(thisLvl) > currentTop) {
          c.programsTopLevel = thisLvl;
        }
      }
    });

    // Audits
    yearSch.forEach((s) => {
      const c = map.get(s.campusId);
      if (!c) return;
      c.auditsTotal++;
      if (s.status === 'Completed') c.auditsCompleted++;
      else if (s.status === 'In Progress') c.auditsInProg++;
      else if ((s.status as string) === 'Overdue') c.auditsOverdue++;
      else c.auditsScheduled++;
    });

    // Calculate rates
    map.forEach((c) => {
      c.subsRate = c.subsTotal > 0 ? Math.round((c.subsApproved / c.subsTotal) * 100) : 0;
      c.riskRate = c.risksTotal > 0 ? Math.round((c.risksClosed / c.risksTotal) * 100) : 0;
      c.carRate = c.carsTotal > 0 ? Math.round((c.carsClosed / c.carsTotal) * 100) : 0;
      c.auditRate = c.auditsTotal > 0 ? Math.round((c.auditsCompleted / c.auditsTotal) * 100) : 0;
      c.compositeScore = Math.round((c.subsRate + c.riskRate + c.carRate + c.auditRate) / 4);
    });

    return Array.from(map.values());
  }, [yearSubs, yearRisks, yearCars, yearSch, rawPrograms, rawCompliances, allCampuses]);

  // ── Aggregate university totals ───────────────────────────────────────────
  const totals = useMemo(() => {
    const agg = {
      subsApproved: 0,
      subsPending: 0,
      subsRejected: 0,
      subsTotal: 0,
      risksTotal: 0,
      risksClosed: 0,
      risksHigh: 0,
      risksMed: 0,
      risksLow: 0,
      carsTotal: 0,
      carsClosed: 0,
      carsOpen: 0,
      programsTotal: 0,
      programsWithCopc: 0,
      programsNoCopc: 0,
      programsInProg: 0,
      auditsTotal: 0,
      auditsCompleted: 0,
      auditsOverdue: 0,
    };
    campusData.forEach((c) => {
      agg.subsApproved += c.subsApproved;
      agg.subsPending += c.subsPending;
      agg.subsRejected += c.subsRejected;
      agg.subsTotal += c.subsTotal;
      agg.risksTotal += c.risksTotal;
      agg.risksClosed += c.risksClosed;
      agg.risksHigh += c.risksHigh;
      agg.risksMed += c.risksMed;
      agg.risksLow += c.risksLow;
      agg.carsTotal += c.carsTotal;
      agg.carsClosed += c.carsClosed;
      agg.carsOpen += c.carsOpen;
      agg.programsTotal += c.programsTotal;
      agg.programsWithCopc += c.programsWithCopc;
      agg.programsNoCopc += c.programsNoCopc;
      agg.programsInProg += c.programsInProg;
      agg.auditsTotal += c.auditsTotal;
      agg.auditsCompleted += c.auditsCompleted;
      agg.auditsOverdue += c.auditsOverdue;
    });
    return agg;
  }, [campusData]);

  // ── EOMS Score ────────────────────────────────────────────────────────────
  const eomsScore = useMemo(() => {
    const subRate = totals.subsTotal > 0 ? Math.round((totals.subsApproved / totals.subsTotal) * 100) : 0;
    const riskRate = totals.risksTotal > 0 ? Math.round((totals.risksClosed / totals.risksTotal) * 100) : 0;
    const carRate = totals.carsTotal > 0 ? Math.round((totals.carsClosed / totals.carsTotal) * 100) : 0;
    const auditRate = totals.auditsTotal > 0 ? Math.round((totals.auditsCompleted / totals.auditsTotal) * 100) : 0;
    const progRate = totals.programsTotal > 0 ? Math.round((totals.programsWithCopc / totals.programsTotal) * 100) : 0;
    return Math.round((subRate + riskRate + carRate + auditRate + progRate) / 5);
  }, [totals]);

  // ── Radar data ────────────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const subRate = totals.subsTotal > 0 ? Math.round((totals.subsApproved / totals.subsTotal) * 100) : 0;
    const riskRate = totals.risksTotal > 0 ? Math.round((totals.risksClosed / totals.risksTotal) * 100) : 0;
    const carRate = totals.carsTotal > 0 ? Math.round((totals.carsClosed / totals.carsTotal) * 100) : 0;
    const auditRate = totals.auditsTotal > 0 ? Math.round((totals.auditsCompleted / totals.auditsTotal) * 100) : 0;
    const progRate = totals.programsTotal > 0 ? Math.round((totals.programsWithCopc / totals.programsTotal) * 100) : 0;
    return [
      { subject: 'Submissions', value: subRate, color: P.greenLight },
      { subject: 'Risk Mgmt', value: riskRate, color: P.gold },
      { subject: 'CAR Closure', value: carRate, color: P.greenLight },
      { subject: 'Audits', value: auditRate, color: P.goldDark },
      { subject: 'Accreditation', value: progRate, color: P.gold },
    ];
  }, [totals]);

  // ── Ticker items ─────────────────────────────────────────────────────────
  const tickerItems = useMemo(() => {
    const items: string[] = [];
    if (totals.subsPending > 0)
      items.push(`${totals.subsPending} submission${totals.subsPending > 1 ? 's' : ''} pending approval`);
    if (totals.auditsOverdue > 0)
      items.push(`${totals.auditsOverdue} audit${totals.auditsOverdue > 1 ? 's' : ''} overdue`);
    if (totals.risksHigh > 0)
      items.push(`${totals.risksHigh} high-risk item${totals.risksHigh > 1 ? 's' : ''} requiring attention`);
    if (totals.programsNoCopc > 0)
      items.push(`${totals.programsNoCopc} program${totals.programsNoCopc > 1 ? 's' : ''} without COPC`);
    items.push(
      `EOMS Score: ${eomsScore}%  ·  Submissions: ${totals.subsTotal}  ·  Risks: ${totals.risksTotal}  ·  CARs: ${totals.carsTotal}  ·  Programs: ${totals.programsTotal}  ·  Audits: ${totals.auditsTotal}`,
    );
    return items;
  }, [totals, eomsScore]);

  // ── Views ─────────────────────────────────────────────────────────────────
  const views = useMemo(
    () => [
      <ViewOverview key="v0" campuses={campusData} eomsScore={eomsScore} radarData={radarData} />,
      <ViewSubmissions
        key="v1"
        campuses={campusData}
        totalApproved={totals.subsApproved}
        totalPending={totals.subsPending}
        totalRejected={totals.subsRejected}
        totalSubs={totals.subsTotal}
      />,
      <ViewRisks
        key="v2"
        campuses={campusData}
        totalRisks={totals.risksTotal}
        closedRisks={totals.risksClosed}
        highRisks={totals.risksHigh}
      />,
      <ViewCars
        key="v3"
        campuses={campusData}
        totalCars={totals.carsTotal}
        closedCars={totals.carsClosed}
        openCars={totals.carsOpen}
      />,
      <ViewAccred
        key="v4"
        campuses={campusData}
        totalPrograms={totals.programsTotal}
        withCopc={totals.programsWithCopc}
        noCopc={totals.programsNoCopc}
        inProg={totals.programsInProg}
      />,
    ],
    [campusData, eomsScore, radarData, totals],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      ref={containerRef}
      onClick={enterFullscreen}
      className="h-screen w-screen text-white overflow-hidden flex flex-col select-none cursor-pointer animate-gold-green-bg"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>

      {/* Green/gold animated background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-48 h-[700px] w-[700px] rounded-full opacity-20 blur-3xl animate-green-float bg-green-500/30" />
        <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full opacity-20 blur-3xl animate-gold-float bg-yellow-500/30" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full opacity-10 blur-3xl animate-glow-pulse bg-green-400/20" />
        <div className="absolute top-1/4 right-1/4 h-[300px] w-[300px] rounded-full opacity-15 blur-3xl animate-gold-float bg-yellow-400/25" />
        <div className="absolute bottom-1/3 left-1/5 h-[250px] w-[250px] rounded-full opacity-10 blur-3xl animate-green-float bg-green-400/20" />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 30% 20%, ${P.gold}08 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, ${P.green}08 0%, transparent 60%)`,
          }}
        />
      </div>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-green-950/40 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
              RSU Executive Academic and Operations Overview
            </p>
            <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">
              Real-time Institutional Performance Dashboard
            </p>
          </div>
        </div>

        {/* View nav */}
        <div className="flex items-center gap-1">
          {VIEW_META.map((v, i) => {
            const Icon = v.icon;
            return (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setAnimPhase('hide');
                  setCurrentView(i);
                }}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[7px] font-black uppercase tracking-widest transition-all',
                  currentView === i && animPhase === 'show'
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5',
                )}
              >
                <Icon className="h-2.5 w-2.5" />
                <span className="hidden lg:inline">{v.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen warning */}
          {!isFullscreen && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/15 border border-yellow-500/30 animate-pulse">
              <Maximize2 className="h-3 w-3 text-yellow-400" />
              <span className="text-[7px] font-black uppercase tracking-widest text-yellow-400">
                Click for Fullscreen
              </span>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm font-black tabular-nums text-white">{timeStr}</p>
            <p className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{dateStr}</p>
          </div>
          <Link href="/dashboard" onClick={(e) => e.stopPropagation()}>
            <button className="h-7 w-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all">
              <X className="h-3 w-3 text-white/60" />
            </button>
          </Link>
        </div>
      </header>

      {/* Timer bar */}
      <div className="relative z-10 px-6 shrink-0">
        <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${animPhase === 'hide' ? 100 : animPhase === 'enter' ? 0 : isIdle ? 0 : 0}%`,
              background: `linear-gradient(to right, ${VIEW_META[currentView].color}, ${P.goldLight})`,
              animation: isIdle && animPhase === 'show' ? `timer ${VIEW_INTERVAL_MS}ms linear` : 'none',
            }}
          />
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 px-6 py-3 relative overflow-hidden">
        <div
          className={`h-full transition-all duration-[350ms] ease-in-out ${
            animPhase === 'hide'
              ? 'opacity-0 scale-[0.97] blur-sm'
              : animPhase === 'enter'
                ? 'opacity-100 scale-100 blur-none'
                : 'opacity-100 scale-100 blur-none'
          }`}
        >
          {views[currentView]}
        </div>
      </main>

      {/* ── Ticker ─────────────────────────────────────────────────────────── */}
      <NewsTicker items={tickerItems} />

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 flex items-center justify-between px-6 py-1.5 border-t border-white/10 bg-green-950/40 backdrop-blur-sm shrink-0">
        <p className="text-[7px] font-bold text-white/30 uppercase tracking-widest">
          AY {selectedYear}–{selectedYear + 1} &middot; Real-time
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentView((s) => (s - 1 + TOTAL_VIEWS) % TOTAL_VIEWS);
            }}
            className="h-5 w-5 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
          >
            <ChevronLeft className="h-2.5 w-2.5 text-white/50" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_VIEWS }).map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentView(i);
                }}
                className="transition-all duration-300"
              >
                <div
                  className={cn(
                    'rounded-full transition-all duration-300',
                    currentView === i ? 'h-1.5 w-5' : 'h-1.5 w-1.5 bg-white/20',
                  )}
                  style={currentView === i ? { background: VIEW_META[i].color } : {}}
                />
              </button>
            ))}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentView((s) => (s + 1) % TOTAL_VIEWS);
            }}
            className="h-5 w-5 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
          >
            <ChevronRight className="h-2.5 w-2.5 text-white/50" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {isIdle ? (
              <>
                <div className="h-1 w-1 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[6px] font-black uppercase tracking-widest text-green-400/70">Auto</span>
              </>
            ) : (
              <>
                <div className="h-1 w-1 rounded-full bg-white/30" />
                <span className="text-[6px] font-black uppercase tracking-widest text-white/30">Manual</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
