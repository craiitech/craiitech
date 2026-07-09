'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where } from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Award,
  Activity,
  GraduationCap,
  CheckCircle2,
  Clock,
  Users,
  Zap,
  Target,
  BarChart3,
  Globe,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Wifi,
  WifiOff,
  ClipboardCheck,
  BookOpen,
  FileText,
  X,
} from 'lucide-react';
import type {
  Submission,
  Unit,
  Campus,
  Cycle,
  Risk,
  AuditSchedule,
  CorrectiveActionRequest,
  ProgramComplianceRecord,
  AcademicProgram,
} from '@/lib/types';
import { normalizeReportType, isCycleActive } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// ─── Constants ───────────────────────────────────────────────────────────────
const SLIDE_DURATION_MS = 60_000; // 1 minute
const IDLE_TIMEOUT_MS = 5_000; // 5 seconds before auto-play resumes after last interaction
const TOTAL_SLIDES = 5;

const PALETTE = {
  emerald: '#10b981',
  teal: '#14b8a6',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  amber: '#f59e0b',
  rose: '#f43f5e',
  sky: '#0ea5e9',
  cyan: '#06b6d4',
  slate: '#94a3b8',
};

// ─── Helper: grade colour ────────────────────────────────────────────────────
function gradeColor(score: number) {
  if (score >= 88) return PALETTE.emerald;
  if (score >= 70) return PALETTE.teal;
  if (score >= 55) return PALETTE.blue;
  if (score >= 40) return PALETTE.amber;
  return PALETTE.rose;
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

// ─── Slide Progress Bar ──────────────────────────────────────────────────────
function SlideTimer({ running, duration }: { running: boolean; duration: number }) {
  const [pct, setPct] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    startRef.current = Date.now();
    setPct(0);
  }, [running]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      setPct(Math.min(100, (elapsed / duration) * 100));
    }, 200);
    return () => clearInterval(id);
  }, [running, duration]);
  return (
    <div className="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-200"
        style={{ width: `${pct}%` }}
      />
    </div>
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
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5 flex flex-col gap-3 hover:bg-white/8 transition-all group">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">{label}</p>
        <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <AnimatedNumber value={value} suffix={suffix} className="text-4xl font-black tabular-nums text-white" />
      </div>
      {sub && <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{sub}</p>}
      <div
        className="absolute bottom-0 left-0 h-0.5 w-full"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
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
    <div className="flex items-center gap-4 mb-6">
      <div
        className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}44` }}
      >
        <Icon className="h-6 w-6" style={{ color }} />
      </div>
      <div>
        <h2 className="text-2xl font-black tracking-tight text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/40 font-bold uppercase tracking-widest mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      {label && <p className="font-black text-white/60 uppercase tracking-widest mb-2">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-black text-white">{typeof p.value === 'number' ? `${p.value}%` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Slide 1: EOMS Health Overview ──────────────────────────────────────────
function SlideEOMS({ data }: { data: any }) {
  const { score, breakdown, submissions, risks, cars, programs } = data;
  const radarData = [
    { subject: 'Submissions', A: breakdown.submissions },
    { subject: 'IQA Audits', A: breakdown.audits },
    { subject: 'CAR Closure', A: breakdown.cars },
    { subject: 'Risk Mgmt', A: breakdown.risks },
    { subject: 'CHED COPC', A: breakdown.ched },
    { subject: 'Accreditation', A: breakdown.accreditation },
  ];

  const grade = score >= 88 ? 'A' : score >= 70 ? 'B+' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'F';
  const scoreColor = gradeColor(score);

  return (
    <div className="h-full flex flex-col gap-6">
      <SectionHeader
        icon={ShieldCheck}
        title="EOMS Health Overview"
        subtitle="Educational Quality Management System — University-wide Score"
        color={scoreColor}
      />
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm flex flex-col items-center justify-center p-8 relative overflow-hidden">
            <div
              className="absolute inset-0 rounded-2xl"
              style={{ background: `radial-gradient(circle at 50% 50%, ${scoreColor}15, transparent 70%)` }}
            />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">EOMS Grade</p>
            <div className="text-9xl font-black tabular-nums leading-none" style={{ color: scoreColor }}>
              {grade}
            </div>
            <AnimatedNumber value={score} suffix="%" className="text-3xl font-black text-white mt-3" />
            <p className="text-xs text-white/50 font-bold uppercase tracking-widest mt-2 text-center">
              {score >= 88
                ? 'Mature EOMS Alignment'
                : score >= 70
                  ? 'Good Standing'
                  : score >= 55
                    ? 'Satisfactory'
                    : 'Needs Improvement'}
            </p>
            <div className="mt-6 w-full bg-white/10 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-1000"
                style={{ width: `${score}%`, background: `linear-gradient(to right, ${scoreColor}, ${scoreColor}aa)` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile label="Programs" value={programs} suffix="" icon={BookOpen} color={PALETTE.violet} />
            <KpiTile label="Submissions" value={submissions} suffix="" icon={FileText} color={PALETTE.sky} />
          </div>
        </div>

        {/* Radar Chart */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">
            Quality Dimension Scores
          </p>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700 }}
                />
                <Radar
                  name="Score"
                  dataKey="A"
                  stroke={scoreColor}
                  fill={scoreColor}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={{ fill: scoreColor, r: 4 }}
                />
                <RTooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Metric Breakdown</p>
          {[
            { label: 'Submissions', value: breakdown.submissions, color: PALETTE.sky },
            { label: 'IQA Audits', value: breakdown.audits, color: PALETTE.indigo },
            { label: 'CAR Closure', value: breakdown.cars, color: PALETTE.teal },
            { label: 'Risk Mgmt', value: breakdown.risks, color: PALETTE.amber },
            { label: 'CHED COPC', value: breakdown.ched, color: PALETTE.violet },
            { label: 'Accreditation', value: breakdown.accreditation, color: PALETTE.emerald },
          ].map(({ label, value, color }) => (
            <div key={label} className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-wider text-white/50">{label}</span>
                <span className="text-xs font-black text-white tabular-nums">{value}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${value}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Slide 2: Submissions & Compliance ──────────────────────────────────────
function SlideSubmissions({ data }: { data: any }) {
  const { byUnit, approvedCount, pendingCount, rejectedCount, totalCount, byReportType } = data;
  const statusData = [
    { name: 'Approved', value: approvedCount, color: PALETTE.emerald },
    { name: 'Pending', value: pendingCount, color: PALETTE.amber },
    { name: 'Rejected', value: rejectedCount, color: PALETTE.rose },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-full flex flex-col gap-6">
      <SectionHeader
        icon={ClipboardCheck}
        title="Submissions & Compliance"
        subtitle="Document submission rates across all units and campuses"
        color={PALETTE.sky}
      />
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Status Pie */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Submission Status</p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius="55%"
                    outerRadius="80%"
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <RTooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{d.name}</span>
                  </div>
                  <span className="text-sm font-black text-white tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <KpiTile label="Total Submissions" value={totalCount} suffix="" icon={FileText} color={PALETTE.sky} />
        </div>

        {/* By Report Type */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">By Report Type</p>
          <div className="h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byReportType} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 700 }}
                  width={90}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="count" fill={PALETTE.sky} radius={[0, 4, 4, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Unit */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">
            Compliance by Unit (Top 8)
          </p>
          <div className="h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byUnit.slice(0, 8)} margin={{ top: 0, right: 10, left: -20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: 700 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="approved" fill={PALETTE.emerald} name="Approved" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill={PALETTE.amber} name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 3: Risks & CARs ───────────────────────────────────────────────────
function SlideRisks({ data }: { data: any }) {
  const { openRisks, closedRisks, highRisks, medRisks, lowRisks, openCars, closedCars, carsByUnit, riskTrend } = data;
  const total = openRisks + closedRisks;
  const mitigated = total > 0 ? Math.round((closedRisks / total) * 100) : 0;
  const carTotal = openCars + closedCars;
  const carClosed = carTotal > 0 ? Math.round((closedCars / carTotal) * 100) : 0;

  const riskDistData = [
    { name: 'High', value: highRisks, color: PALETTE.rose },
    { name: 'Medium', value: medRisks, color: PALETTE.amber },
    { name: 'Low', value: lowRisks, color: PALETTE.emerald },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-full flex flex-col gap-6">
      <SectionHeader
        icon={AlertTriangle}
        title="Risk & Corrective Actions"
        subtitle="Risk treatment progress and CAR closure rates"
        color={PALETTE.amber}
      />
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Risk score cards */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Risk Distribution</p>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistData}
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  >
                    {riskDistData.map((e, i) => (
                      <Cell key={i} fill={e.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <RTooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <KpiTile label="Mitigation Rate" value={mitigated} icon={ShieldCheck} color={PALETTE.emerald} />
            <KpiTile label="CAR Closure" value={carClosed} icon={CheckCircle2} color={PALETTE.teal} />
          </div>
        </div>

        {/* CAR trend */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Open vs Closed Risks</p>
          <div className="h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'Risks', Open: openRisks, Closed: closedRisks },
                  { name: 'CARs', Open: openCars, Closed: closedCars },
                ]}
                margin={{ top: 0, right: 20, left: -10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 700 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="Open" fill={PALETTE.rose} radius={[4, 4, 0, 0]} name="Open" />
                <Bar dataKey="Closed" fill={PALETTE.emerald} radius={[4, 4, 0, 0]} name="Closed" />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CAR by unit */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-2">CAR Closure by Unit</p>
          <div className="h-full pb-8 overflow-y-auto space-y-3 pr-1">
            {carsByUnit.slice(0, 10).map(({ name, closed, total }: any) => (
              <div key={name} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white/55 truncate max-w-[65%]">{name}</span>
                  <span className="text-[10px] font-black text-white tabular-nums">
                    {closed}/{total}
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${total > 0 ? Math.round((closed / total) * 100) : 0}%`,
                      background: total > 0 && closed === total ? PALETTE.emerald : PALETTE.amber,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 4: CHED Programs & Accreditation ──────────────────────────────────
function SlideCHED({ data }: { data: any }) {
  const { programs, withCopc, noCopc, inProgress, levelBreakdown, campusBreakdown } = data;

  const copcPieData = [
    { name: 'With COPC', value: withCopc, color: PALETTE.emerald },
    { name: 'In Progress', value: inProgress, color: PALETTE.amber },
    { name: 'No COPC', value: noCopc, color: PALETTE.rose },
  ].filter((d) => d.value > 0);

  return (
    <div className="h-full flex flex-col gap-6">
      <SectionHeader
        icon={GraduationCap}
        title="CHED Programs & Accreditation"
        subtitle="Program compliance, COPC status, and accreditation levels"
        color={PALETTE.violet}
      />
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* COPC status */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">COPC Status</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={copcPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {copcPieData.map((e, i) => (
                      <Cell key={i} fill={e.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <RTooltip content={<DarkTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {copcPieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/50">{d.name}</span>
                  </div>
                  <span className="text-sm font-black text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
          <KpiTile label="Total Programs" value={programs} suffix="" icon={BookOpen} color={PALETTE.violet} />
        </div>

        {/* Accreditation levels */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Accreditation Levels</p>
          <div className="h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelBreakdown} margin={{ top: 0, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="level" tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 700 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} allowDecimals={false} />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Programs">
                  {levelBreakdown.map((_: any, i: number) => (
                    <Cell
                      key={i}
                      fill={
                        [PALETTE.emerald, PALETTE.teal, PALETTE.blue, PALETTE.indigo, PALETTE.violet, PALETTE.slate][
                          i % 6
                        ]
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By campus */}
        <div className="col-span-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Programs by Campus</p>
          <div className="h-full pb-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={campusBreakdown} layout="vertical" margin={{ left: 8, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  dataKey="campus"
                  type="category"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 700 }}
                  width={80}
                />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="withCopc" fill={PALETTE.emerald} name="With COPC" radius={[0, 4, 4, 0]} />
                <Bar dataKey="noCopc" fill={PALETTE.rose} name="No COPC" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide 5: Audit Performance ──────────────────────────────────────────────
function SlideAudit({ data }: { data: any }) {
  const { total, completed, inProgress: inProg, scheduled, overdue, completionRate, byCampus } = data;

  const statusData = [
    { name: 'Completed', value: completed, color: PALETTE.emerald },
    { name: 'In Progress', value: inProg, color: PALETTE.sky },
    { name: 'Scheduled', value: scheduled, color: PALETTE.indigo },
    { name: 'Overdue', value: overdue, color: PALETTE.rose },
  ].filter((d) => d.value > 0);

  const radialData = statusData.map((d, i) => ({
    ...d,
    fill: d.color,
    pct: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }));

  return (
    <div className="h-full flex flex-col gap-6">
      <SectionHeader
        icon={Activity}
        title="IQA Audit Performance"
        subtitle="Internal Quality Audit completion rates and scheduling overview"
        color={PALETTE.indigo}
      />
      <div className="flex-1 grid grid-cols-3 gap-6">
        {/* Radial breakdown */}
        <div className="col-span-1 flex flex-col gap-4">
          <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 flex flex-col">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">Audit Status</p>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="90%"
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar background={{ fill: 'rgba(255,255,255,0.04)' }} dataKey="pct" cornerRadius={6} />
                  <RTooltip content={<DarkTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {statusData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-wider text-white/40">{d.name}</p>
                    <p className="text-sm font-black text-white">{d.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <KpiTile label="Completion Rate" value={completionRate} icon={Target} color={PALETTE.emerald} />
        </div>

        {/* By campus stacked bar */}
        <div className="col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4">Audit Status by Campus</p>
          <div className="h-full pb-12">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCampus} margin={{ top: 0, right: 20, left: -10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="campus"
                  tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 700 }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} allowDecimals={false} />
                <RTooltip content={<DarkTooltip />} />
                <Bar dataKey="completed" fill={PALETTE.emerald} name="Completed" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="inProgress" fill={PALETTE.sky} name="In Progress" stackId="a" />
                <Bar dataKey="scheduled" fill={PALETTE.indigo} name="Scheduled" stackId="a" />
                <Bar dataKey="overdue" fill={PALETTE.rose} name="Overdue" radius={[4, 4, 0, 0]} stackId="a" />
                <Legend
                  wrapperStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 700, paddingTop: 10 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE LABELS ─────────────────────────────────────────────────────────────
const SLIDE_META = [
  { label: 'EOMS Health', icon: ShieldCheck, color: PALETTE.emerald },
  { label: 'Submissions', icon: ClipboardCheck, color: PALETTE.sky },
  { label: 'Risks & CARs', icon: AlertTriangle, color: PALETTE.amber },
  { label: 'CHED & Accred.', icon: GraduationCap, color: PALETTE.violet },
  { label: 'IQA Audits', icon: Activity, color: PALETTE.indigo },
];

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function ExecutiveDisplayPage() {
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [now, setNow] = useState(new Date());
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const slideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // ── Auto-rotate when idle ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isIdle) {
      clearTimeout(slideTimer.current);
      return;
    }
    slideTimer.current = setTimeout(() => {
      setCurrentSlide((s) => (s + 1) % TOTAL_SLIDES);
    }, SLIDE_DURATION_MS);
    return () => clearTimeout(slideTimer.current);
  }, [isIdle, currentSlide]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
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
    () =>
      (rawSubs || []).map((s) => ({
        ...s,
        reportType: normalizeReportType(s.reportType),
      })),
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

  const campusMap = useMemo(() => new Map((allCampuses || []).map((c) => [c.id, c.name])), [allCampuses]);
  const unitMap = useMemo(() => new Map((allUnits || []).map((u) => [u.id, u.name])), [allUnits]);

  // EOMS Slide data
  const eomsData = useMemo(() => {
    const yearSch = (rawSchedules || []).filter((s) => {
      if (!s.scheduledDate) return false;
      const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate as any);
      return d.getFullYear() === Number(selectedYear);
    });
    const approved = yearSubs.filter((s) => s.statusId === 'approved').length;
    const total = yearSubs.length || 1;
    const subRate = Math.min(100, Math.round((approved / total) * 100));
    const completedSch = yearSch.filter((s) => s.status === 'Completed').length;
    const auditRate = yearSch.length > 0 ? Math.min(100, Math.round((completedSch / yearSch.length) * 100)) : 0;
    const closedCars = yearCars.filter((c) => c.status === 'Closed').length;
    const carRate = yearCars.length > 0 ? Math.min(100, Math.round((closedCars / yearCars.length) * 100)) : 0;
    const mitigated = yearRisks.filter((r) => r.status === 'Closed').length;
    const riskRate = yearRisks.length > 0 ? Math.min(100, Math.round((mitigated / yearRisks.length) * 100)) : 0;
    const programs = (rawPrograms || []).filter((p) => p.isActive);
    const copcCompliant = (rawCompliances || []).filter((c) => c.ched?.copcStatus === 'With COPC').length;
    const chedRate = programs.length > 0 ? Math.min(100, Math.round((copcCompliant / programs.length) * 100)) : 0;
    const score = Math.round([subRate, auditRate, carRate, riskRate, chedRate].reduce((a, b) => a + b, 0) / 5);
    return {
      score,
      breakdown: {
        submissions: subRate,
        audits: auditRate,
        cars: carRate,
        risks: riskRate,
        ched: chedRate,
        accreditation: 0,
      },
      submissions: yearSubs.length,
      risks: yearRisks.length,
      cars: yearCars.length,
      programs: programs.length,
    };
  }, [yearSubs, yearRisks, yearCars, rawSchedules, rawPrograms, rawCompliances, selectedYear]);

  // Submissions slide data
  const submissionsData = useMemo(() => {
    const approved = yearSubs.filter((s) => s.statusId === 'approved').length;
    const pending = yearSubs.filter(
      (s) => s.statusId === 'pending' || s.statusId === 'submitted' || s.statusId === 'awaiting approval',
    ).length;
    const rejected = yearSubs.filter((s) => s.statusId === 'rejected').length;
    const byUnitMap = new Map<string, { approved: number; pending: number; total: number }>();
    yearSubs.forEach((s) => {
      const name = unitMap.get(s.unitId) || s.unitId;
      const cur = byUnitMap.get(name) || { approved: 0, pending: 0, total: 0 };
      cur.total++;
      if (s.statusId === 'approved') cur.approved++;
      else cur.pending++;
      byUnitMap.set(name, cur);
    });
    const byUnit = Array.from(byUnitMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
    const rtMap = new Map<string, number>();
    yearSubs.forEach((s) => rtMap.set(s.reportType, (rtMap.get(s.reportType) || 0) + 1));
    const byReportType = Array.from(rtMap.entries())
      .map(([name, count]) => ({ name: name.length > 15 ? name.slice(0, 15) + '…' : name, count }))
      .sort((a, b) => b.count - a.count);
    return {
      approvedCount: approved,
      pendingCount: pending,
      rejectedCount: rejected,
      totalCount: yearSubs.length,
      byUnit,
      byReportType,
    };
  }, [yearSubs, unitMap]);

  // Risks + CARs slide data
  const riskData = useMemo(() => {
    const open = yearRisks.filter((r) => r.status !== 'Closed');
    const closed = yearRisks.filter((r) => r.status === 'Closed');
    const high = open.filter((r) => r.preTreatment?.rating === 'high' || r.postTreatment?.rating === 'high').length;
    const med = open.filter((r) => r.preTreatment?.rating === 'medium' || r.postTreatment?.rating === 'medium').length;
    const low = open.length - high - med;
    const openCars = yearCars.filter((c) => c.status !== 'Closed').length;
    const closedCars = yearCars.filter((c) => c.status === 'Closed').length;
    const carUnitMap = new Map<string, { closed: number; total: number }>();
    yearCars.forEach((c) => {
      const name = unitMap.get(c.unitId || '') || c.unitId || 'Unknown';
      const cur = carUnitMap.get(name) || { closed: 0, total: 0 };
      cur.total++;
      if (c.status === 'Closed') cur.closed++;
      carUnitMap.set(name, cur);
    });
    const carsByUnit = Array.from(carUnitMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
    return {
      openRisks: open.length,
      closedRisks: closed.length,
      highRisks: high,
      medRisks: med,
      lowRisks: Math.max(0, low),
      openCars,
      closedCars,
      carsByUnit,
      riskTrend: [],
    };
  }, [yearRisks, yearCars, unitMap]);

  // CHED slide data
  const chedData = useMemo(() => {
    const active = (rawPrograms || []).filter((p) => p.isActive);
    const withCopc = active.filter((p) => {
      const c = (rawCompliances || []).find((c) => c.programId === p.id);
      return c?.ched?.copcStatus === 'With COPC';
    }).length;
    const inProg = active.filter((p) => {
      const c = (rawCompliances || []).find((c) => c.programId === p.id);
      return c?.ched?.copcStatus === 'In Progress';
    }).length;
    const levelMap = new Map<string, number>();
    active.forEach((p) => {
      const c = (rawCompliances || []).find((c) => c.programId === p.id);
      const records = c?.accreditationRecords || [];
      const cur = records.find((r) => r.lifecycleStatus === 'Current') || records[records.length - 1];
      const lvl = cur?.level?.trim() || 'Non Accredited';
      const key = lvl.includes('Level IV')
        ? 'Level IV'
        : lvl.includes('Level III')
          ? 'Level III'
          : lvl.includes('Level II')
            ? 'Level II'
            : lvl.includes('Level I')
              ? 'Level I'
              : lvl.includes('Candidate') || lvl.includes('PSV')
                ? 'Candidate'
                : 'Non Accredited';
      levelMap.set(key, (levelMap.get(key) || 0) + 1);
    });
    const levelBreakdown = ['Level IV', 'Level III', 'Level II', 'Level I', 'Candidate', 'Non Accredited']
      .map((l) => ({ level: l, count: levelMap.get(l) || 0 }))
      .filter((d) => d.count > 0);
    const campusPMap = new Map<string, { withCopc: number; noCopc: number }>();
    active.forEach((p) => {
      const campus = campusMap.get(p.campusId || '') || p.campusId || 'Unknown';
      const c = (rawCompliances || []).find((c) => c.programId === p.id);
      const cur = campusPMap.get(campus) || { withCopc: 0, noCopc: 0 };
      if (c?.ched?.copcStatus === 'With COPC') cur.withCopc++;
      else cur.noCopc++;
      campusPMap.set(campus, cur);
    });
    const campusBreakdown = Array.from(campusPMap.entries()).map(([campus, v]) => ({ campus, ...v }));
    return {
      programs: active.length,
      withCopc,
      noCopc: active.length - withCopc - inProg,
      inProgress: inProg,
      levelBreakdown,
      campusBreakdown,
    };
  }, [rawPrograms, rawCompliances, campusMap]);

  // Audit slide data
  const auditData = useMemo(() => {
    const yearSch = (rawSchedules || []).filter((s) => {
      if (!s.scheduledDate) return false;
      const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate as any);
      return d.getFullYear() === Number(selectedYear);
    });
    const completed = yearSch.filter((s) => s.status === 'Completed').length;
    const inProg = yearSch.filter((s) => s.status === 'In Progress').length;
    const scheduled = yearSch.filter((s) => s.status === 'Scheduled').length;
    const overdue = yearSch.filter((s) => (s.status as string) === 'Overdue').length;
    const total = yearSch.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const campusSchMap = new Map<
      string,
      { completed: number; inProgress: number; scheduled: number; overdue: number }
    >();
    yearSch.forEach((s) => {
      const campus = campusMap.get(s.campusId || '') || s.campusId || 'Unknown';
      const cur = campusSchMap.get(campus) || { completed: 0, inProgress: 0, scheduled: 0, overdue: 0 };
      if (s.status === 'Completed') cur.completed++;
      else if (s.status === 'In Progress') cur.inProgress++;
      else if ((s.status as string) === 'Overdue') cur.overdue++;
      else cur.scheduled++;
      campusSchMap.set(campus, cur);
    });
    const byCampus = Array.from(campusSchMap.entries()).map(([campus, v]) => ({ campus, ...v }));
    return { total, completed, inProgress: inProg, scheduled, overdue, completionRate, byCampus };
  }, [rawSchedules, campusMap, selectedYear]);

  // ── Render slides ─────────────────────────────────────────────────────────
  const slides = [
    <SlideEOMS data={eomsData} key="eoms" />,
    <SlideSubmissions data={submissionsData} key="subs" />,
    <SlideRisks data={riskData} key="risks" />,
    <SlideCHED data={chedData} key="ched" />,
    <SlideAudit data={auditData} key="audit" />,
  ];

  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div
      ref={containerRef}
      className="h-screen w-screen bg-[#060912] text-white overflow-hidden flex flex-col select-none"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Background gradient blobs ─────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: `radial-gradient(circle, ${SLIDE_META[currentSlide].color}, transparent)` }}
        />
        <div
          className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full opacity-8 blur-3xl"
          style={{ background: `radial-gradient(circle, ${PALETTE.indigo}, transparent)` }}
        />
      </div>

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/8 bg-black/20 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-white">RSU CrAIITech EOMS</p>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Executive Management Display</p>
          </div>
        </div>

        {/* Slide nav dots */}
        <div className="flex items-center gap-2">
          {SLIDE_META.map((s, i) => {
            const Icon = s.icon;
            return (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300',
                  currentSlide === i
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/30 hover:text-white/60 hover:bg-white/5',
                )}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden xl:inline">{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Clock + controls */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-lg font-black tabular-nums text-white">{timeStr}</p>
            <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            {isIdle ? (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Auto</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/8 border border-white/10">
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Manual</span>
              </div>
            )}
            <button
              onClick={toggleFullscreen}
              className="h-8 w-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5 text-white/60" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5 text-white/60" />
              )}
            </button>
            <Link href="/dashboard">
              <button className="h-8 w-8 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all">
                <X className="h-3.5 w-3.5 text-white/60" />
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Timer bar ────────────────────────────────────────────────────── */}
      <div className="px-8 pt-0 shrink-0">
        <SlideTimer running={isIdle} duration={SLIDE_DURATION_MS} />
      </div>

      {/* ── Slide content ────────────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 px-8 py-6 relative overflow-hidden">
        <div key={currentSlide} className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
          {slides[currentSlide]}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="relative z-10 flex items-center justify-between px-8 py-3 border-t border-white/8 bg-black/20 backdrop-blur-sm shrink-0">
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
          Academic Year {selectedYear}–{selectedYear + 1} · Data refreshes in real-time
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentSlide((s) => (s - 1 + TOTAL_SLIDES) % TOTAL_SLIDES)}
            className="h-7 w-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-white/50" />
          </button>
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className="transition-all duration-300">
                <div
                  className={cn(
                    'rounded-full transition-all duration-300',
                    currentSlide === i ? 'h-2 w-6' : 'h-2 w-2 bg-white/20',
                  )}
                  style={currentSlide === i ? { background: SLIDE_META[i].color } : {}}
                />
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentSlide((s) => (s + 1) % TOTAL_SLIDES)}
            className="h-7 w-7 rounded-lg bg-white/8 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>
        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
          {isIdle ? `Auto-advancing in ${SLIDE_DURATION_MS / 1000}s idle` : 'Move mouse to pause auto-advance'}
        </p>
      </footer>
    </div>
  );
}
