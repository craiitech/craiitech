'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
} from 'recharts';
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
  X,
  Maximize2,
  Minimize2,
  Building2,
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
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────
const VIEW_INTERVAL_MS = 60_000;
const TOTAL_VIEWS = 6;

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
    <div className="relative overflow-hidden rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md px-4 py-3 flex flex-col gap-1.5 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.15em] text-white/85">{label}</p>
        <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ background: `${color}33` }}>
          <Icon className="h-3 w-3" style={{ color: P.white }} />
        </div>
      </div>
      <AnimatedNumber value={value} suffix={suffix} className="text-3xl font-black tabular-nums text-white" />
      {sub && <p className="text-[11px] text-white/75 font-bold uppercase tracking-widest">{sub}</p>}
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
        {subtitle && <p className="text-[11px] text-white/75 font-bold uppercase tracking-widest">{subtitle}</p>}
      </div>
    </div>
  );
}

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
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors border-b border-white/10 last:border-0">
      <span className="text-sm font-black text-white/55 w-5 text-right tabular-nums">{rank}</span>
      <span className="text-xs font-bold text-white/90 truncate w-28 shrink-0">{name}</span>
      {metrics.map((m, i) => (
        <div key={i} className="flex items-center gap-1.5 flex-1">
          <span className="text-xs font-black text-white/55 w-12 text-right tabular-nums">{m.value}%</span>
          <MiniBar value={m.value} color={m.color || statusColor(m.value)} />
        </div>
      ))}
    </div>
  );
}

// ─── Narrative Card ──────────────────────────────────────────────────────────
function NarrativeCard({ title, text, color }: { title: string; text: string; color: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-4 flex flex-col gap-2 shadow-md">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full" style={{ background: color }} />
        <p className="text-xs font-black uppercase tracking-[0.15em] text-white/75">{title}</p>
      </div>
      <p className="text-sm text-white/80 leading-relaxed">{text}</p>
    </div>
  );
}

// ─── News Ticker ──────────────────────────────────────────────────────────
function NewsTicker({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="relative overflow-hidden h-10 bg-green-950/70 border-t border-white/10 shrink-0">
      <div className="flex items-center h-full whitespace-nowrap" style={{ animation: 'marquee 25s linear infinite' }}>
        {items.concat(items).map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-3 mx-8 text-sm font-bold text-white/90 uppercase tracking-wider"
          >
            <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Chart (green/gold theme) ─────────────────────────────────────
function GreenDonut({
  data,
  dataKey,
  nameKey,
  centerLabel,
  centerValue,
  size = '100%',
}: {
  data: { name: string; value: number; color: string }[];
  dataKey: string;
  nameKey: string;
  centerLabel?: string;
  centerValue?: string;
  size?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative w-full h-full">
      <ResponsiveContainer width={size} height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={dataKey}
            nameKey={nameKey}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            stroke="none"
            label={({ name, value }) => `${name} ${value}`}
            labelLine={false}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {centerLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-black text-white tabular-nums">{centerValue}</p>
          <p className="text-sm font-black uppercase tracking-widest text-white/65 mt-0.5">{centerLabel}</p>
        </div>
      )}
    </div>
  );
}

// ─── Mini Line Chart (green/gold theme) ─────────────────────────────────
function TrendLine({
  data,
  dataKey,
  strokeColor = P.green,
  areaColor = P.green,
}: {
  data: { name: string; value: number }[];
  dataKey: string;
  strokeColor?: string;
  areaColor?: string;
}) {
  if (!data.length)
    return <div className="h-full flex items-center justify-center text-[11px] text-white/45">No data</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} axisLine={false} tickLine={false} />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={strokeColor}
          strokeWidth={2}
          dot={{ fill: strokeColor, r: 3, strokeWidth: 0 }}
          label={({ x, y, value }) => (
            <text x={x} y={y - 8} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize={8} fontWeight="bold">
              {value}
            </text>
          )}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Legend Row ─────────────────────────────────────────────────────────
function LegendRow({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2 justify-center mt-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          <span className="text-[8px] font-bold text-white/65 uppercase tracking-wider">{item.name}</span>
        </div>
      ))}
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
  trendData,
  riskDist,
  carDist,
}: {
  campuses: any[];
  eomsScore: number;
  radarData: { subject: string; value: number; color: string }[];
  trendData: { name: string; value: number }[];
  riskDist: { name: string; value: number; color: string }[];
  carDist: { name: string; value: number; color: string }[];
}) {
  const sc = gradeColor(eomsScore);
  const topCampus = campuses.length
    ? campuses.reduce((a: any, b: any) => (a.compositeScore > b.compositeScore ? a : b))
    : null;
  const lowCampus = campuses.length
    ? campuses.reduce((a: any, b: any) => (a.compositeScore < b.compositeScore ? a : b))
    : null;
  const totalSubs = campuses.reduce((s: number, c: any) => s + c.subsTotal, 0);
  const totalRisks = campuses.reduce((s: number, c: any) => s + c.risksTotal, 0);
  const totalCars = campuses.reduce((s: number, c: any) => s + c.carsTotal, 0);

  const tableMetrics = (c: any) => [
    { label: 'Sub', value: c.subsRate, color: P.green },
    { label: 'Risk', value: c.riskRate, color: P.gold },
    { label: 'CAR', value: c.carRate, color: P.greenLight },
    { label: 'Audit', value: c.auditRate, color: P.goldDark },
  ];

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={ShieldCheck}
        title="RSU Executive Health Overview"
        subtitle="Composite EOMS score · Quality dimensions · Risk & CAR snapshots"
        color={sc}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* Grade card */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md flex flex-col items-center justify-center p-3 relative overflow-hidden shadow-lg">
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 50%, ${sc}15, transparent 70%)` }}
          />
          <p className="text-sm font-black uppercase tracking-[0.2em] text-white/65">EOMS Score</p>
          <AnimatedNumber value={eomsScore} suffix="%" className="text-4xl font-black text-white mt-1" />
          <p className="text-sm text-white/65 font-bold uppercase tracking-widest mt-1 text-center leading-tight">
            {eomsScore >= 88
              ? 'Mature'
              : eomsScore >= 70
                ? 'Good Standing'
                : eomsScore >= 55
                  ? 'Satisfactory'
                  : eomsScore >= 40
                    ? 'Developing'
                    : 'Baseline'}
          </p>
        </div>

        {/* Quality Dimensions horizontal bars */}
        <div className="col-span-3 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-2">Quality Dimensions</p>
          <div className="space-y-1.5">
            {radarData.map((d) => (
              <div key={d.subject} className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/75 w-14 truncate">{d.subject}</span>
                <div className="flex-1 h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${d.value}%`, background: d.color, opacity: 0.85 }}
                  />
                </div>
                <span className="text-[11px] font-black text-white/85 w-7 text-right tabular-nums">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Trend Line Chart */}
        <div className="col-span-3 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-2 shrink-0">Submission Trend</p>
          <div className="flex-1 min-h-0">
            {trendData.length > 0 ? (
              <TrendLine data={trendData} dataKey="value" strokeColor={P.green} />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-white/45">Insufficient data</div>
            )}
          </div>
        </div>

        {/* Risk Severity Donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">Risk Severity</p>
          <div className="flex-1 w-full min-h-0">
            {riskDist.length > 0 ? (
              <GreenDonut data={riskDist} dataKey="value" nameKey="name" size="100%" />
            ) : (
              <span className="text-[11px] text-white/45">No data</span>
            )}
          </div>
          <LegendRow items={riskDist} />
        </div>

        {/* CAR Status Donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">CAR Status</p>
          <div className="flex-1 w-full min-h-0">
            {carDist.length > 0 ? (
              <GreenDonut data={carDist} dataKey="value" nameKey="name" size="100%" />
            ) : (
              <span className="text-[11px] text-white/45">No data</span>
            )}
          </div>
          <LegendRow items={carDist} />
        </div>

        {/* Campus ranking table */}
        <div className="col-span-6 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 flex flex-col shadow-lg">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            Campus Performance Ranking
          </p>
          <div className="flex text-sm font-black text-white/45 uppercase tracking-wider mb-1 px-3">
            <span className="w-5 shrink-0" />
            <span className="w-24 shrink-0">Campus</span>
            <span className="flex-1 text-center">Sub</span>
            <span className="flex-1 text-center">Risk</span>
            <span className="flex-1 text-center">CAR</span>
            <span className="flex-1 text-center">Audit</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-0 max-h-[calc(100%-20px)]">
            {campuses
              .sort((a: any, b: any) => b.compositeScore - a.compositeScore)
              .map((c: any, i: number) => (
                <CampusRow key={c.id} rank={i + 1} name={c.name} metrics={tableMetrics(c)} />
              ))}
          </div>
        </div>

        {/* Top / Low performer + Narrative */}
        <div className="col-span-6 grid grid-cols-2 gap-2">
          {topCampus && (
            <div className="rounded-xl border border-green-700/30 bg-green-950/80 backdrop-blur-md p-3 shadow-md flex flex-col justify-center">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-green-300">Top Performer</p>
              <p className="text-xs font-black text-green-200">{topCampus.name}</p>
              <p className="text-[11px] text-white/85 mt-0.5">Leading at {topCampus.compositeScore}% composite score</p>
              <div className="flex gap-3 mt-1.5 text-sm text-white/65">
                <span>Sub {topCampus.subsRate}%</span>
                <span>Risk {topCampus.riskRate}%</span>
                <span>CAR {topCampus.carRate}%</span>
              </div>
            </div>
          )}
          {lowCampus && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-950/80 backdrop-blur-md p-3 shadow-md flex flex-col justify-center">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400">Needs Attention</p>
              <p className="text-xs font-black text-yellow-400">{lowCampus.name}</p>
              <p className="text-[11px] text-white/85 mt-0.5">At {lowCampus.compositeScore}% — needs intervention</p>
              <div className="flex gap-3 mt-1.5 text-sm text-white/65">
                <span>Sub {lowCampus.subsRate}%</span>
                <span>Risk {lowCampus.riskRate}%</span>
                <span>CAR {lowCampus.carRate}%</span>
              </div>
            </div>
          )}
          <div className="rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-md flex flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65">Institution Overview</p>
            <p className="text-xs text-white/85 mt-1 leading-relaxed">
              {totalSubs} submissions · {totalRisks} risks · {totalCars} CARs across {campuses.length} campuses
            </p>
            <p className="text-sm text-white/55 mt-1">
              The EOMS score integrates submission compliance, risk mitigation, CAR closure, audit progress, and
              accreditation.
            </p>
          </div>
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
  subDist,
  trendData,
  cardPhase,
}: {
  campuses: any[];
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  totalSubs: number;
  subDist: { name: string; value: number; color: string }[];
  trendData: { name: string; value: number }[];
  cardPhase: number;
}) {
  const rate = totalSubs > 0 ? Math.round((totalApproved / totalSubs) * 100) : 0;
  const chartData = campuses
    .filter((c) => c.subsTotal > 0)
    .sort((a: any, b: any) => b.subsRate - a.subsRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.subsRate }));
  const top3 = [...chartData].slice(0, 3);
  const bottom3 = [...chartData].slice(-3).reverse();
  const topIdx = cardPhase % 3;
  const botIdx = cardPhase % 3;

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={ClipboardCheck}
        title="Submission Compliance Analytics"
        subtitle="Document submission rates · Status breakdown · Monthly trend"
        color={P.green}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI row */}
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
          {totalRejected > 0 && (
            <KpiTile label="Rejected" value={totalRejected} suffix="" icon={FileText} color={P.whiteDim} />
          )}
        </div>

        {/* Status donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">Status Breakdown</p>
          <div className="flex-1 w-full min-h-0">
            <GreenDonut
              data={subDist}
              dataKey="value"
              nameKey="name"
              size="100%"
              centerLabel="Total"
              centerValue={String(totalSubs)}
            />
          </div>
          <LegendRow items={subDist} />
        </div>

        {/* Monthly trend line */}
        <div className="col-span-3 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            Monthly Submission Trend
          </p>
          <div className="flex-1 min-h-0">
            {trendData.length > 0 ? (
              <TrendLine data={trendData} dataKey="value" strokeColor={P.green} />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-white/45">Insufficient data</div>
            )}
          </div>
        </div>

        {/* Campus compliance bar chart */}
        <div className="col-span-3 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            Compliance by Campus
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                  width={65}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 3, 3, 0]}
                  name="Rate"
                  fillOpacity={0.85}
                  label={{ position: 'right', fill: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' }}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 3 ? P.green : i < 6 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top/Bottom performers + Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <div className="rounded-xl border border-green-700/30 bg-green-950/80 backdrop-blur-md p-3 shadow-md">
            <p className="text-sm font-black uppercase tracking-[0.15em] text-green-300">Top Performing Campuses</p>
            {top3.map((c, i) => (
              <div
                key={i}
                className={`flex items-center justify-between mt-1.5 transition-opacity duration-700 ${i === topIdx ? 'opacity-100' : 'opacity-30'}`}
              >
                <span
                  className={`text-[11px] font-bold truncate max-w-[80px] ${i === topIdx ? 'text-white' : 'text-white/60'}`}
                >
                  {c.name}
                </span>
                <span className={`text-[11px] font-black ${i === topIdx ? 'text-green-300' : 'text-white/40'}`}>
                  {c.rate}%
                </span>
              </div>
            ))}
          </div>
          {bottom3.length > 0 && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-950/80 backdrop-blur-md p-3 shadow-md">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400">Needs Improvement</p>
              {bottom3.map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between mt-1.5 transition-opacity duration-700 ${i === botIdx ? 'opacity-100' : 'opacity-30'}`}
                >
                  <span
                    className={`text-[11px] font-bold truncate max-w-[80px] ${i === botIdx ? 'text-white' : 'text-white/60'}`}
                  >
                    {c.name}
                  </span>
                  <span className={`text-[11px] font-black ${i === botIdx ? 'text-yellow-400' : 'text-white/40'}`}>
                    {c.rate}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <NarrativeCard
            title="Context"
            text={`With ${totalApproved} of ${totalSubs} submissions approved (${rate}%), the university maintains ${rate >= 80 ? 'strong' : rate >= 60 ? 'adequate' : 'below-target'} compliance. Target is 80%+.`}
            color={P.green}
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
  severityDist,
  statusDist,
  cardPhase,
}: {
  campuses: any[];
  totalRisks: number;
  closedRisks: number;
  highRisks: number;
  severityDist: { name: string; value: number; color: string }[];
  statusDist: { name: string; value: number; color: string }[];
  cardPhase: number;
}) {
  const rate = totalRisks > 0 ? Math.round((closedRisks / totalRisks) * 100) : 0;
  const chartData = campuses
    .filter((c: any) => c.risksTotal > 0)
    .sort((a: any, b: any) => b.riskRate - a.riskRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.riskRate }));
  const riskChartIdx = chartData.length > 0 ? cardPhase % chartData.length : 0;

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={AlertTriangle}
        title="Risk Management Intelligence"
        subtitle="Risk severity · Status distribution · Mitigation effectiveness by campus"
        color={P.gold}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="Mitigation Rate" value={rate} icon={ShieldCheck} color={statusColor(rate)} />
          <KpiTile label="Total Risks" value={totalRisks} suffix="" icon={AlertTriangle} color={P.gold} />
          {highRisks > 0 && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-950/80 backdrop-blur-md px-4 py-3">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400">High Risk</p>
              <p className="text-3xl font-black text-white tabular-nums">{highRisks}</p>
              <p className="text-sm text-white/75 mt-0.5">Requires immediate attention</p>
            </div>
          )}
        </div>

        {/* Severity donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">Severity Distribution</p>
          <div className="flex-1 w-full min-h-0">
            <GreenDonut
              data={severityDist}
              dataKey="value"
              nameKey="name"
              size="100%"
              centerLabel="Total"
              centerValue={String(totalRisks)}
            />
          </div>
          <LegendRow items={severityDist} />
        </div>

        {/* Status donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">Status Breakdown</p>
          <div className="flex-1 w-full min-h-0">
            <GreenDonut data={statusDist} dataKey="value" nameKey="name" size="100%" />
          </div>
          <LegendRow items={statusDist} />
        </div>

        {/* Mitigation bar chart */}
        <div className="col-span-4 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            Mitigation by Campus
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                  width={65}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 3, 3, 0]}
                  name="Mitigated"
                  fillOpacity={0.85}
                  label={{ position: 'right', fill: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' }}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === riskChartIdx ? P.gold : i < 3 ? P.green : i < 6 ? P.greenLight : P.gold}
                      fillOpacity={i === riskChartIdx ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Risk Landscape"
            text={
              highRisks > 0
                ? `${highRisks} high-risk items need immediate executive attention. ${rate}% overall mitigation shows ${rate >= 70 ? 'strong' : 'developing'} risk governance.`
                : `All high-risk items addressed. ${rate}% mitigation reflects a ${rate >= 70 ? 'mature' : 'developing'} risk-aware culture.`
            }
            color={P.gold}
          />
          <NarrativeCard
            title="Recommendation"
            text="Regularly review and update risk registers. Ensure treatment plans are documented and verified. Focus on high and very high-risk items first."
            color={P.goldDark}
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
  carStatusDist,
  carNatureDist,
  auditDist,
  cardPhase,
}: {
  campuses: any[];
  totalCars: number;
  closedCars: number;
  openCars: number;
  carStatusDist: { name: string; value: number; color: string }[];
  carNatureDist: { name: string; value: number; color: string }[];
  auditDist: { name: string; value: number; color: string }[];
  cardPhase: number;
}) {
  const rate = totalCars > 0 ? Math.round((closedCars / totalCars) * 100) : 0;
  const chartData = campuses
    .filter((c: any) => c.carsTotal > 0)
    .sort((a: any, b: any) => b.carRate - a.carRate)
    .slice(0, 10)
    .map((c: any) => ({ name: c.name, rate: c.carRate }));
  const totalAudits = auditDist.reduce((s, d) => s + d.value, 0);
  const carChartIdx = chartData.length > 0 ? cardPhase % chartData.length : 0;

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={CheckCircle2}
        title="Corrective Action & Audit Performance"
        subtitle="CAR closure rates · Audit status · Combined compliance view"
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
          <KpiTile label="Audits" value={totalAudits} suffix="" icon={ClipboardCheck} color={P.gold} />
        </div>

        {/* CAR Status donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">CAR Status</p>
          <div className="flex-1 w-full min-h-0">
            <GreenDonut
              data={carStatusDist}
              dataKey="value"
              nameKey="name"
              size="100%"
              centerLabel="Total"
              centerValue={String(totalCars)}
            />
          </div>
          <LegendRow items={carStatusDist} />
        </div>

        {/* CAR Nature donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">NC vs OFI</p>
          <div className="flex-1 w-full min-h-0">
            {carNatureDist.length > 0 ? (
              <GreenDonut data={carNatureDist} dataKey="value" nameKey="name" size="100%" />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-white/45">No data</div>
            )}
          </div>
          <LegendRow items={carNatureDist} />
        </div>

        {/* Audit Status donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">Audit Status</p>
          <div className="flex-1 w-full min-h-0">
            {auditDist.length > 0 ? (
              <GreenDonut data={auditDist} dataKey="value" nameKey="name" size="100%" />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-white/45">No audits</div>
            )}
          </div>
          <LegendRow items={auditDist} />
        </div>

        {/* CAR closure bar chart */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            CAR Closure by Campus
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                  width={65}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 3, 3, 0]}
                  name="Closed"
                  fillOpacity={0.85}
                  label={{ position: 'right', fill: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' }}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === carChartIdx ? P.gold : i < 3 ? P.green : i < 6 ? P.greenLight : P.gold}
                      fillOpacity={i === carChartIdx ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="CAR Performance"
            text={`${closedCars} of ${totalCars} CARs resolved (${rate}%). ${openCars} open CARs need follow-up. High closure rates demonstrate commitment to continuous improvement.`}
            color={P.greenLight}
          />
          <NarrativeCard
            title="Audit Overview"
            text={`${totalAudits} total audits. Ensure timely completion of scheduled audits to maintain IQA compliance.`}
            color={P.gold}
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
  copcDist,
  accredDist,
  progLevelDist,
  currentLevelKey,
  currentLevelPrograms,
  copcYearlyTrend,
  cardPhase,
}: {
  campuses: any[];
  totalPrograms: number;
  withCopc: number;
  noCopc: number;
  inProg: number;
  copcDist: { name: string; value: number; color: string }[];
  accredDist: { name: string; value: number; color: string }[];
  progLevelDist: { name: string; value: number; color: string }[];
  currentLevelKey: string;
  currentLevelPrograms: { name: string; campus: string }[];
  copcYearlyTrend: { year: number; rate: number }[];
  cardPhase: number;
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
  const copcChartIdx = chartData.length > 0 ? cardPhase % chartData.length : 0;

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={GraduationCap}
        title="Accreditation & Program Quality"
        subtitle="COPC compliance · Accreditation levels · Program distribution"
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
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-950/80 backdrop-blur-md px-4 py-3">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400">No COPC</p>
              <p className="text-3xl font-black text-white tabular-nums">{noCopc}</p>
              <p className="text-sm text-white/75 mt-0.5">Programs needing attention</p>
            </div>
          )}
        </div>

        {/* COPC donut */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col items-center">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1">COPC Status</p>
          <div className="flex-1 w-full min-h-0">
            <GreenDonut
              data={copcDist}
              dataKey="value"
              nameKey="name"
              size="100%"
              centerLabel="Programs"
              centerValue={String(totalPrograms)}
            />
          </div>
          <LegendRow items={copcDist} />
        </div>

        {/* Accreditation level donut + cycling programs */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 text-center">
            Accreditation Levels
          </p>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="h-[55%]">
              <GreenDonut data={accredDist} dataKey="value" nameKey="name" size="100%" />
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-black uppercase tracking-widest text-yellow-400 text-center mb-0.5">
                {currentLevelKey}
              </p>
              <div className="text-center space-y-0.5">
                {currentLevelPrograms.slice(0, 6).map((p, i) => (
                  <p key={i} className="text-xs font-bold text-white/85 truncate">
                    {p.name} <span className="text-white/45 text-[11px]">({p.campus})</span>
                  </p>
                ))}
                {currentLevelPrograms.length > 6 && (
                  <p className="text-[11px] text-white/45">+{currentLevelPrograms.length - 6} more</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* COPC yearly trend line */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            COPC Yearly Trend
          </p>
          <div className="flex-1 min-h-0">
            {copcYearlyTrend.length > 0 ? (
              <TrendLine
                data={copcYearlyTrend.map((d) => ({ name: String(d.year), value: d.rate }))}
                dataKey="value"
                strokeColor={P.gold}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[11px] text-white/45">Insufficient data</div>
            )}
          </div>
        </div>

        {/* COPC by campus bar chart */}
        <div className="col-span-2 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">COPC by Campus</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                  width={65}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 3, 3, 0]}
                  name="COPC Rate"
                  fillOpacity={0.85}
                  label={{ position: 'right', fill: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold' }}
                >
                  {chartData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === copcChartIdx ? P.gold : i < 3 ? P.green : i < 6 ? P.greenLight : P.gold}
                      fillOpacity={i === copcChartIdx ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-2 flex flex-col gap-2">
          <NarrativeCard
            title="Regulatory Status"
            text={`${copcRate}% of programs are COPC-compliant. ${noCopc} programs need action to maintain CHED good standing.`}
            color={P.gold}
          />
          <NarrativeCard
            title="Accreditation"
            text="Higher accreditation levels (III, IV) indicate program quality maturity. Monitor programs with lapsed or low accreditation for improvement."
            color={P.goldDark}
          />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEW 6: Unit Submission Compliance
// ═══════════════════════════════════════════════════════════════════════════════
function ViewUnitSubmission({
  unitSubTop,
  unitSubBottom,
  totalUnits,
  unitsWithSubs,
  unitsWithoutSubs,
  unitSubData,
  cardPhase,
}: {
  unitSubTop: {
    id: string;
    name: string;
    campusName: string;
    subsTotal: number;
    subsApproved: number;
    subRate: number;
  }[];
  unitSubBottom: {
    id: string;
    name: string;
    campusName: string;
    subsTotal: number;
    subsApproved: number;
    subRate: number;
  }[];
  totalUnits: number;
  unitsWithSubs: number;
  unitsWithoutSubs: number;
  unitSubData: {
    id: string;
    name: string;
    campusName: string;
    subsTotal: number;
    subsApproved: number;
    subRate: number;
  }[];
  cardPhase: number;
}) {
  const overallRate = totalUnits > 0 ? Math.round((unitsWithSubs / totalUnits) * 100) : 0;
  const chartData = unitSubData
    .filter((u) => u.name)
    .slice(0, 15)
    .map((u) => ({ name: u.name, rate: u.subRate, total: u.subsTotal }));
  const topUnitIdx = unitSubTop.length > 0 ? cardPhase % unitSubTop.length : 0;
  const botUnitIdx = unitSubBottom.length > 0 ? cardPhase % unitSubBottom.length : 0;

  return (
    <div className="h-full flex flex-col gap-3">
      <SectionHeader
        icon={Users}
        title="Unit Submission Compliance"
        subtitle="Top performers · Non-compliant units · Strengths & weaknesses"
        color={P.greenLight}
      />
      <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
        {/* KPI summary */}
        <div className="col-span-2 flex flex-col gap-2">
          <KpiTile label="Compliance Rate" value={overallRate} icon={Users} color={statusColor(overallRate)} />
          <KpiTile
            label="Total Units"
            value={totalUnits}
            suffix=""
            icon={Building2}
            color={P.greenLight}
            sub={`${unitsWithSubs} with submissions`}
          />
          {unitsWithoutSubs > 0 && (
            <div className="rounded-xl border border-yellow-600/30 bg-yellow-950/80 backdrop-blur-md px-4 py-3">
              <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400">No Submissions</p>
              <p className="text-3xl font-black text-white tabular-nums">{unitsWithoutSubs}</p>
              <p className="text-sm text-white/75 mt-0.5">Units needing attention</p>
            </div>
          )}
        </div>

        {/* Top performers */}
        <div className="col-span-4 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-green-300 mb-1 shrink-0">
            Top Submitting Units
          </p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {unitSubTop.length === 0 && <p className="text-[11px] text-white/45">No data</p>}
            {unitSubTop.map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-opacity duration-700 ${i === topUnitIdx ? 'bg-green-800/40 opacity-100' : 'opacity-25'}`}
              >
                <span className="text-[11px] font-black text-green-300 w-4 tabular-nums">{i + 1}</span>
                <span className="text-xs font-bold text-white/85 w-20 truncate shrink-0">{u.name}</span>
                <span className="text-[8px] text-white/55 w-14 truncate shrink-0">{u.campusName}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${u.subRate}%`, background: P.green }} />
                </div>
                <span className="text-[11px] font-black text-white/85 w-8 text-right tabular-nums">{u.subRate}%</span>
                <span className="text-[8px] text-white/45 w-8 text-right tabular-nums">{u.subsTotal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom performers */}
        <div className="col-span-4 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-yellow-400 mb-1 shrink-0">
            Non-Compliant Units
          </p>
          <div className="flex-1 overflow-y-auto space-y-1">
            {unitSubBottom.length === 0 && <p className="text-[11px] text-white/45">All units are compliant</p>}
            {unitSubBottom.map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-2 px-2 py-1 rounded-lg transition-opacity duration-700 ${i === botUnitIdx ? 'bg-yellow-800/40 opacity-100' : 'opacity-25'}`}
              >
                <span className="text-[11px] font-black text-yellow-400 w-4 tabular-nums">{i + 1}</span>
                <span className="text-xs font-bold text-white/85 w-20 truncate shrink-0">{u.name}</span>
                <span className="text-[8px] text-white/55 w-14 truncate shrink-0">{u.campusName}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(u.subRate, 2)}%`, background: u.subsTotal === 0 ? P.whiteDim : P.gold }}
                  />
                </div>
                <span className="text-[11px] font-black text-white/85 w-8 text-right tabular-nums">{u.subRate}%</span>
                <span className="text-[8px] text-white/45 w-8 text-right tabular-nums">{u.subsTotal}</span>
                {u.subsTotal === 0 && <span className="text-sm font-bold text-red-400">!</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Submission rate bar chart */}
        <div className="col-span-7 rounded-xl border border-white/15 bg-green-950/85 backdrop-blur-md p-3 shadow-lg flex flex-col">
          <p className="text-sm font-black uppercase tracking-[0.15em] text-white/65 mb-1 shrink-0">
            Unit Submission Rates (Top 15)
          </p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} domain={[0, 100]} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }}
                  width={85}
                />
                <Bar
                  dataKey="rate"
                  radius={[0, 3, 3, 0]}
                  name="Rate"
                  fillOpacity={0.85}
                  label={{ position: 'right', fill: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 'bold' }}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i < 5 ? P.green : i < 10 ? P.greenLight : P.gold} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative */}
        <div className="col-span-5 flex flex-col gap-2">
          <NarrativeCard
            title="Strengths"
            text={
              unitSubTop.length > 0
                ? `Top units like ${unitSubTop[0].name} (${unitSubTop[0].subRate}%) and ${unitSubTop[1]?.name || ''} (${unitSubTop[1]?.subRate || 0}%) demonstrate strong submission compliance, setting the benchmark for the institution.`
                : 'No submission data available.'
            }
            color={P.greenLight}
          />
          <NarrativeCard
            title="Weaknesses"
            text={
              unitsWithoutSubs > 0
                ? `${unitsWithoutSubs} units have zero submissions — indicating possible process gaps, lack of awareness, or resource constraints. The lowest performers need targeted intervention and retraining on submission procedures.`
                : `All units are actively submitting. Maintain the upward trend through continuous monitoring.`
            }
            color={P.gold}
          />
          <NarrativeCard
            title="Recommendation"
            text="Recognize top-performing units publicly. For non-compliant units, assign QA liaisons to provide direct support and track weekly submission progress."
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
  { label: 'Units', icon: Users, color: P.greenLight },
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
  const [cardPhase, setCardPhase] = useState(0);
  const [animPhase, setAnimPhase] = useState<'show' | 'hide' | 'enter'>('show');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Clock ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── Card-level data cycling (every 6s within a view) ─────────────────────
  useEffect(() => {
    const t = setInterval(() => setCardPhase((s) => s + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  // Reset cardPhase on view change
  useEffect(() => {
    setCardPhase(0);
  }, [currentView]);

  // ── Continuous auto-rotation (wall display — no mouse needed) ────────────
  useEffect(() => {
    const t = setTimeout(() => setAnimPhase('hide'), VIEW_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [currentView, animPhase]);

  useEffect(() => {
    if (animPhase === 'hide') {
      const t = setTimeout(() => {
        setCurrentView((s) => (s + 1) % TOTAL_VIEWS);
        setTimeout(() => setAnimPhase('enter'), 50);
      }, 350);
      return () => clearTimeout(t);
    }
    if (animPhase === 'enter') {
      const t = setTimeout(() => setAnimPhase('show'), 450);
      return () => clearTimeout(t);
    }
  }, [animPhase]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be unavailable
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      toggleFullscreen().catch(() => {});
    }, 1000);
    return () => clearTimeout(t);
  }, [toggleFullscreen]);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Prevent Escape from exiting fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && document.fullscreenElement) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const submissionsQ = useMemoFirebase(() => (firestore ? collection(firestore, 'submissions') : null), [firestore]);
  const { data: rawSubs } = useCollection<Submission>(submissionsQ);
  const risksQ = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: rawRisks } = useCollection<Risk>(risksQ);
  const carsQ = useMemoFirebase(
    () => (firestore ? collection(firestore, 'correctiveActionRequests') : null),
    [firestore],
  );
  const { data: rawCars } = useCollection<CorrectiveActionRequest>(carsQ);
  const compliancesQ = useMemoFirebase(
    () => (firestore ? collection(firestore, 'programCompliances') : null),
    [firestore],
  );
  const { data: rawCompliances } = useCollection<ProgramComplianceRecord>(compliancesQ);
  const programsQ = useMemoFirebase(() => (firestore ? collection(firestore, 'academicPrograms') : null), [firestore]);
  const { data: rawPrograms } = useCollection<AcademicProgram>(programsQ);
  const schedulesQ = useMemoFirebase(() => (firestore ? collection(firestore, 'auditSchedules') : null), [firestore]);
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

  // ── Per-unit submission performance ───────────────────────────────────────
  interface UnitSubPerf {
    id: string;
    name: string;
    campusId: string;
    campusName: string;
    subsTotal: number;
    subsApproved: number;
    subsPending: number;
    subsRejected: number;
    subRate: number;
  }
  const unitSubData = useMemo(() => {
    const map = new Map<string, UnitSubPerf>();
    (allUnits || []).forEach((u) => {
      const cName = campusMap.get(u.campusIds?.[0] || '') || 'Unknown';
      map.set(u.id, {
        id: u.id,
        name: u.name,
        campusId: u.campusIds?.[0] || '',
        campusName: cName,
        subsTotal: 0,
        subsApproved: 0,
        subsPending: 0,
        subsRejected: 0,
        subRate: 0,
      });
    });
    yearSubs.forEach((s) => {
      const u = map.get(s.unitId);
      if (!u) return;
      u.subsTotal++;
      if (s.statusId === 'approved') u.subsApproved++;
      else if (s.statusId === 'rejected') u.subsRejected++;
      else u.subsPending++;
    });
    map.forEach((u) => {
      u.subRate = u.subsTotal > 0 ? Math.round((u.subsApproved / u.subsTotal) * 100) : 0;
    });
    return Array.from(map.values()).sort((a, b) => a.subRate - b.subRate);
  }, [yearSubs, allUnits, campusMap]);
  const unitSubTop = useMemo(
    () =>
      [...unitSubData]
        .filter((u) => u.subsTotal > 0)
        .reverse()
        .slice(0, 6),
    [unitSubData],
  );
  const unitSubBottom = useMemo(
    () => unitSubData.filter((u) => u.subsTotal === 0 || u.subRate < 100).slice(0, 6),
    [unitSubData],
  );
  const totalUnits = unitSubData.length;
  const unitsWithSubs = unitSubData.filter((u) => u.subsTotal > 0).length;
  const unitsWithoutSubs = totalUnits - unitsWithSubs;

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

  // ── Submission monthly trend ──────────────────────────────────────────
  const submissionTrend = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const counts: Record<string, number> = {};
    months.forEach((m) => (counts[m] = 0));
    yearSubs.forEach((s) => {
      const d = (s as any).submissionDate;
      if (!d) return;
      const date = d instanceof Timestamp ? d.toDate() : new Date(d);
      const m = months[date.getMonth()];
      if (m) counts[m]++;
    });
    return months.map((m) => ({ name: m, value: counts[m] })).filter((d) => d.value > 0);
  }, [yearSubs]);

  // ── Submission status distribution ────────────────────────────────────
  const subStatusDist = useMemo(
    () => [
      { name: 'Approved', value: totals.subsApproved, color: P.green },
      { name: 'Pending', value: totals.subsPending, color: P.gold },
      { name: 'Rejected', value: totals.subsRejected, color: P.whiteDim },
    ],
    [totals],
  );

  // ── Risk severity distribution ────────────────────────────────────────
  const riskSeverityDist = useMemo(() => {
    const counts = { veryHigh: 0, high: 0, medium: 0, low: 0 };
    yearRisks.forEach((r) => {
      const rating = r.preTreatment?.rating?.toLowerCase() || '';
      if (rating === 'very high') counts.veryHigh++;
      else if (rating === 'high') counts.high++;
      else if (rating === 'medium') counts.medium++;
      else counts.low++;
    });
    return [
      { name: 'Very High', value: counts.veryHigh, color: P.whiteDim },
      { name: 'High', value: counts.high, color: P.goldDark },
      { name: 'Medium', value: counts.medium, color: P.gold },
      { name: 'Low', value: counts.low, color: P.greenLight },
    ].filter((d) => d.value > 0);
  }, [yearRisks]);

  // ── Risk status distribution ──────────────────────────────────────────
  const riskStatusDist = useMemo(() => {
    const counts = { open: 0, inProg: 0, closed: 0 };
    yearRisks.forEach((r) => {
      if (r.status === 'Open') counts.open++;
      else if (r.status === 'In Progress') counts.inProg++;
      else if (r.status === 'Closed') counts.closed++;
    });
    return [
      { name: 'Open', value: counts.open, color: P.whiteDim },
      { name: 'In Progress', value: counts.inProg, color: P.gold },
      { name: 'Closed', value: counts.closed, color: P.green },
    ].filter((d) => d.value > 0);
  }, [yearRisks]);

  // ── CAR status distribution ───────────────────────────────────────────
  const carStatusDist = useMemo(() => {
    const counts: Record<string, number> = {
      Open: 0,
      'In Progress': 0,
      'Awaiting Response': 0,
      'For Final Verification': 0,
      Closed: 0,
    };
    yearCars.forEach((c) => {
      const s = c.status || 'Open';
      if (s === 'Awaiting Response/Update') counts['Awaiting Response']++;
      else if (counts[s] !== undefined) counts[s]++;
    });
    return [
      { name: 'Open', value: counts.Open, color: P.whiteDim },
      { name: 'In Progress', value: counts['In Progress'], color: P.gold },
      { name: 'Awaiting', value: counts['Awaiting Response'], color: P.goldDark },
      { name: 'For Verification', value: counts['For Final Verification'], color: P.greenLight },
      { name: 'Closed', value: counts.Closed, color: P.green },
    ].filter((d) => d.value > 0);
  }, [yearCars]);

  // ── CAR nature distribution ───────────────────────────────────────────
  const carNatureDist = useMemo(() => {
    const nc = yearCars.filter((c) => c.natureOfFinding === 'NC').length;
    const ofi = yearCars.filter((c) => c.natureOfFinding === 'OFI').length;
    return [
      { name: 'NC', value: nc, color: P.goldDark },
      { name: 'OFI', value: ofi, color: P.greenLight },
    ].filter((d) => d.value > 0);
  }, [yearCars]);

  // ── Audit status distribution ─────────────────────────────────────────
  const auditStatusDist = useMemo(() => {
    const counts = { scheduled: 0, inProg: 0, completed: 0, overdue: 0 };
    yearSch.forEach((s) => {
      if (s.status === 'Scheduled') counts.scheduled++;
      else if (s.status === 'In Progress') counts.inProg++;
      else if (s.status === 'Completed') counts.completed++;
      else counts.overdue++;
    });
    return [
      { name: 'Scheduled', value: counts.scheduled, color: P.goldDark },
      { name: 'In Progress', value: counts.inProg, color: P.gold },
      { name: 'Completed', value: counts.completed, color: P.green },
      { name: 'Overdue', value: counts.overdue, color: P.whiteDim },
    ].filter((d) => d.value > 0);
  }, [yearSch]);

  // ── COPC status distribution ──────────────────────────────────────────
  const copcDist = useMemo(() => {
    const active = (rawPrograms || []).filter((p) => p.isActive);
    const withCopc = active.filter((p) => {
      const comp = (rawCompliances || []).find((c) => c.programId === p.id);
      return comp?.ched?.copcStatus === 'With COPC';
    }).length;
    const inProg = active.filter((p) => {
      const comp = (rawCompliances || []).find((c) => c.programId === p.id);
      return comp?.ched?.copcStatus === 'In Progress';
    }).length;
    const none = active.length - withCopc - inProg;
    return [
      { name: 'With COPC', value: withCopc, color: P.green },
      { name: 'In Progress', value: inProg, color: P.gold },
      { name: 'No COPC', value: none, color: P.whiteDim },
    ].filter((d) => d.value > 0);
  }, [rawPrograms, rawCompliances]);

  // ── Accreditation level distribution ──────────────────────────────────
  const accredLevelDist = useMemo(() => {
    const levels: Record<string, number> = {
      'Level IV': 0,
      'Level III': 0,
      'Level II': 0,
      'Level I': 0,
      Candidate: 0,
      'Non Accredited': 0,
    };
    (rawPrograms || [])
      .filter((p) => p.isActive)
      .forEach((p) => {
        const comp = (rawCompliances || []).find((c) => c.programId === p.id);
        const records = comp?.accreditationRecords || [];
        const cur = records.find((r) => r.lifecycleStatus === 'Current') || records[records.length - 1];
        const level = cur?.level?.trim() || 'Non Accredited';
        let matched = 'Non Accredited';
        for (const key of Object.keys(levels)) {
          if (level.includes(key) || level === key) {
            matched = key;
            break;
          }
        }
        if (level.toLowerCase().includes('candidate')) matched = 'Candidate';
        levels[matched] = (levels[matched] || 0) + 1;
      });
    return Object.entries(levels)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: k,
        value: v,
        color:
          k === 'Level IV'
            ? P.green
            : k === 'Level III'
              ? P.greenLight
              : k === 'Level II'
                ? P.gold
                : k === 'Level I'
                  ? P.goldDark
                  : k === 'Candidate'
                    ? P.whiteDim
                    : P.whiteMuted,
      }));
  }, [rawPrograms, rawCompliances]);

  // ── Programs grouped by accreditation level (for card cycling) ────────────
  const programsByLevel = useMemo(() => {
    const groups: Record<string, { name: string; campus: string }[]> = {};
    (rawPrograms || [])
      .filter((p) => p.isActive)
      .forEach((p) => {
        const comp = (rawCompliances || []).find((c) => c.programId === p.id);
        const records = comp?.accreditationRecords || [];
        const cur = records.find((r) => r.lifecycleStatus === 'Current') || records[records.length - 1];
        const level = cur?.level?.trim() || 'Non Accredited';
        let matched = 'Non Accredited';
        for (const key of ['Level IV', 'Level III', 'Level II', 'Level I']) {
          if (level.includes(key) || level === key) {
            matched = key;
            break;
          }
        }
        if (level.toLowerCase().includes('candidate')) matched = 'Candidate';
        if (!groups[matched]) groups[matched] = [];
        groups[matched].push({ name: p.name, campus: campusMap.get(p.campusId) || '' });
      });
    return groups;
  }, [rawPrograms, rawCompliances, campusMap]);
  const levelKeys = useMemo(
    () => Object.keys(programsByLevel).filter((k) => programsByLevel[k].length > 0),
    [programsByLevel],
  );
  const currentLevelKey = levelKeys.length > 0 ? levelKeys[cardPhase % levelKeys.length] : '';
  const currentLevelPrograms = currentLevelKey ? programsByLevel[currentLevelKey] || [] : [];

  // ── COPC yearly performance trend ──────────────────────────────────────
  const copcYearlyTrend = useMemo(() => {
    const years: Record<number, { total: number; withCopc: number }> = {};
    (rawPrograms || [])
      .filter((p) => p.isActive)
      .forEach((p) => {
        const comps = (rawCompliances || []).filter((c) => c.programId === p.id);
        comps.forEach((c) => {
          const yr = c.academicYear;
          if (!yr) return;
          if (!years[yr]) years[yr] = { total: 0, withCopc: 0 };
          years[yr].total++;
          if (c.ched?.copcStatus === 'With COPC') years[yr].withCopc++;
        });
      });
    return Object.entries(years)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, d]) => ({ year: Number(year), rate: d.total > 0 ? Math.round((d.withCopc / d.total) * 100) : 0 }));
  }, [rawPrograms, rawCompliances]);

  // ── Program level distribution ────────────────────────────────────────
  const progLevelDist = useMemo(() => {
    const levels: Record<string, number> = { Undergraduate: 0, Graduate: 0, TVET: 0 };
    (rawPrograms || [])
      .filter((p) => p.isActive)
      .forEach((p) => {
        const lvl = p.level || 'Undergraduate';
        if (levels[lvl] !== undefined) levels[lvl]++;
      });
    return Object.entries(levels)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: k,
        value: v,
        color: k === 'Undergraduate' ? P.green : k === 'Graduate' ? P.gold : P.greenLight,
      }));
  }, [rawPrograms]);

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
      <ViewOverview
        key="v0"
        campuses={campusData}
        eomsScore={eomsScore}
        radarData={radarData}
        trendData={submissionTrend}
        riskDist={riskSeverityDist}
        carDist={carStatusDist}
      />,
      <ViewSubmissions
        key="v1"
        campuses={campusData}
        totalApproved={totals.subsApproved}
        totalPending={totals.subsPending}
        totalRejected={totals.subsRejected}
        totalSubs={totals.subsTotal}
        subDist={subStatusDist}
        trendData={submissionTrend}
        cardPhase={cardPhase}
      />,
      <ViewRisks
        key="v2"
        campuses={campusData}
        totalRisks={totals.risksTotal}
        closedRisks={totals.risksClosed}
        highRisks={totals.risksHigh}
        severityDist={riskSeverityDist}
        statusDist={riskStatusDist}
        cardPhase={cardPhase}
      />,
      <ViewCars
        key="v3"
        campuses={campusData}
        totalCars={totals.carsTotal}
        closedCars={totals.carsClosed}
        openCars={totals.carsOpen}
        carStatusDist={carStatusDist}
        carNatureDist={carNatureDist}
        auditDist={auditStatusDist}
        cardPhase={cardPhase}
      />,
      <ViewAccred
        key="v4"
        campuses={campusData}
        totalPrograms={totals.programsTotal}
        withCopc={totals.programsWithCopc}
        noCopc={totals.programsNoCopc}
        inProg={totals.programsInProg}
        copcDist={copcDist}
        accredDist={accredLevelDist}
        progLevelDist={progLevelDist}
        currentLevelKey={currentLevelKey}
        currentLevelPrograms={currentLevelPrograms}
        copcYearlyTrend={copcYearlyTrend}
        cardPhase={cardPhase}
      />,
      <ViewUnitSubmission
        key="v5"
        unitSubTop={unitSubTop}
        unitSubBottom={unitSubBottom}
        totalUnits={totalUnits}
        unitsWithSubs={unitsWithSubs}
        unitsWithoutSubs={unitsWithoutSubs}
        unitSubData={unitSubData}
        cardPhase={cardPhase}
      />,
    ],
    [
      campusData,
      eomsScore,
      radarData,
      totals,
      submissionTrend,
      subStatusDist,
      riskSeverityDist,
      riskStatusDist,
      carStatusDist,
      carNatureDist,
      auditStatusDist,
      copcDist,
      accredLevelDist,
      progLevelDist,
      unitSubTop,
      unitSubBottom,
      totalUnits,
      unitsWithSubs,
      unitsWithoutSubs,
      unitSubData,
      currentLevelKey,
      currentLevelPrograms,
      copcYearlyTrend,
      cardPhase,
    ],
  );

  // ── Render ────────────────────────────────────────────────────────────────
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen text-white overflow-hidden flex flex-col select-none animate-gold-green-bg"
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

      {/* ── Fullscreen gate ───────────────────────────────────────────────── */}
      {!isFullscreen && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-green-950/90 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-6 px-8 py-12 rounded-2xl border border-white/15 bg-green-950/70 shadow-2xl">
            <div className="h-16 w-16 rounded-2xl bg-green-500/20 flex items-center justify-center">
              <Maximize2 className="h-8 w-8 text-yellow-400" />
            </div>
            <p className="text-xl font-black uppercase tracking-[0.15em] text-white text-center">
              RSU Executive Dashboard
            </p>
            <p className="text-sm text-white/65 text-center max-w-md">
              This dashboard is designed for fullscreen display on a wall-mounted monitor.
            </p>
            <button
              onClick={toggleFullscreen}
              className="px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all duration-300 hover:scale-105 active:scale-95"
              style={{ background: `linear-gradient(135deg, ${P.green}, ${P.gold})`, color: '#fff' }}
            >
              Enter Fullscreen
            </button>
          </div>
        </div>
      )}

      {/* ── Dashboard content (only visible in fullscreen) ────────────────── */}
      {isFullscreen && (
        <>
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/10 bg-green-950/40 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white">
                  RSU Executive Academic and Operations Overview
                </p>
                <p className="text-sm font-bold text-white/55 uppercase tracking-widest">
                  Real-time Institutional Performance Dashboard
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View indicator dots */}
              <div className="flex gap-2 items-center">
                {VIEW_META.map((v, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div
                      className={`rounded-full transition-all duration-500 ${currentView === i ? 'h-2 w-6' : 'h-2 w-2 bg-white/20'}`}
                      style={currentView === i ? { background: v.color } : {}}
                    />
                  </div>
                ))}
              </div>
              {/* Fullscreen toggle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 border border-white/15 hover:bg-white/15 transition-all"
                title="Exit Fullscreen"
              >
                <Minimize2 className="h-3 w-3 text-white/85" />
                <span className="text-sm font-black uppercase tracking-widest text-white/65">Exit</span>
              </button>
              <div className="text-right">
                <p className="text-sm font-black tabular-nums text-white">{timeStr}</p>
                <p className="text-sm font-bold text-white/55 uppercase tracking-widest">{dateStr}</p>
              </div>
              <Link href="/dashboard" onClick={(e) => e.stopPropagation()}>
                <button className="h-7 w-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all">
                  <X className="h-3 w-3 text-white/75" />
                </button>
              </Link>
            </div>
          </header>

          {/* ── Main content ────────────────────────────────────────────────── */}
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

          {/* ── Ticker ─────────────────────────────────────────────────────── */}
          <NewsTicker items={tickerItems} />

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <footer className="relative z-10 flex items-center justify-between px-6 py-1.5 border-t border-white/10 bg-green-950/40 backdrop-blur-sm shrink-0">
            <p className="text-sm font-bold text-white/45 uppercase tracking-widest">
              AY {selectedYear}–{selectedYear + 1} &middot; Real-time
            </p>
            <div className="flex items-center gap-1.5">
              {VIEW_META.map((v, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full transition-all duration-500"
                  style={{
                    background: currentView === i ? `${v.color}25` : 'transparent',
                    border: currentView === i ? `1px solid ${v.color}40` : '1px solid transparent',
                  }}
                >
                  <div className="h-1.5 w-1.5 rounded-full" style={{ background: v.color }} />
                  <span
                    className="text-[8px] font-black uppercase tracking-widest transition-all duration-500"
                    style={{ color: currentView === i ? v.color : 'rgba(255,255,255,0.35)' }}
                  >
                    {v.label}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-sm font-bold text-white/45 tabular-nums">{timeStr}</p>
          </footer>
        </>
      )}
    </div>
  );
}
