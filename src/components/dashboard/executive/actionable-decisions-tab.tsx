'use client';

import { useMemo } from 'react';
import type { Risk, CorrectiveActionRequest, ProgramComplianceRecord, AcademicProgram, AuditSchedule, Submission, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  RadialBarChart, RadialBar, ResponsiveContainer, Tooltip as RechartsTooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, ShieldAlert, GraduationCap, ClipboardCheck,
  TrendingUp, TrendingDown, Minus, Target, Zap, Award, Clock, Flag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface ActionableDecisionsTabProps {
  risks: Risk[];
  cars: CorrectiveActionRequest[];
  allCompliances: ProgramComplianceRecord[];
  academicPrograms: AcademicProgram[];
  auditSchedules: AuditSchedule[];
  submissions: Submission[];
  campuses: Campus[];
  allUnits: Unit[];
  selectedYear: number;
}

type FlagSeverity = 'critical' | 'warning' | 'good';

interface DecisionFlag {
  id: string;
  severity: FlagSeverity;
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  quadrant: 'urgent-high' | 'not-urgent-high' | 'urgent-low' | 'not-urgent-low';
}

const SEVERITY_CONFIG: Record<FlagSeverity, { border: string; bg: string; badge: string; icon: string }> = {
  critical: { border: 'border-red-200', bg: 'bg-red-50/50', badge: 'bg-red-600 text-white', icon: '🔴' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50/40', badge: 'bg-amber-500 text-white', icon: '🟡' },
  good: { border: 'border-emerald-200', bg: 'bg-emerald-50/30', badge: 'bg-emerald-600 text-white', icon: '🟢' },
};

export function ActionableDecisionsTab({
  risks, cars, allCompliances, academicPrograms, auditSchedules, submissions, campuses, allUnits, selectedYear
}: ActionableDecisionsTabProps) {
  const yearRisks = useMemo(() => risks.filter(r => r.year === selectedYear), [risks, selectedYear]);
  const yearSubs = useMemo(() => submissions.filter(s => s.year === selectedYear), [submissions, selectedYear]);
  const yearSchedules = useMemo(() => auditSchedules.filter(s => {
    const d = s.scheduledDate?.toDate ? s.scheduledDate.toDate() : s.scheduledDate ? new Date(s.scheduledDate) : null;
    return d ? d.getFullYear() === selectedYear : false;
  }), [auditSchedules, selectedYear]);

  // --- KPI Computations ---
  const criticalRisks = useMemo(() =>
    yearRisks.filter(r => r.type === 'Risk' && r.status !== 'Closed' && (r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High') && !r.postTreatment),
    [yearRisks]);

  const overdueCars = useMemo(() =>
    cars.filter(c => {
      if (c.status === 'Closed') return false;
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      return date ? differenceInDays(new Date(), date) > 90 : false;
    }),
    [cars]);

  const noCopcPrograms = useMemo(() =>
    academicPrograms.filter(p => p.isActive).filter(p => {
      const comp = allCompliances.find(c => c.programId === p.id);
      return !comp || comp.ched?.copcStatus === 'No COPC';
    }),
    [academicPrograms, allCompliances]);

  const mandatoryOpenRecs = useMemo(() => {
    const recs: any[] = [];
    allCompliances.forEach(c => {
      c.accreditationRecords?.forEach(m => {
        m.recommendations?.forEach(r => {
          if (r.type === 'Mandatory' && r.status !== 'Closed') recs.push(r);
        });
      });
    });
    return recs;
  }, [allCompliances]);

  const carsAwaitingVerification = useMemo(() => cars.filter(c => c.status === 'For Final Verification'), [cars]);

  const closedCarsThisYear = useMemo(() => {
    return cars.filter(c => {
      if (c.status !== 'Closed') return false;
      const d = c.updatedAt?.toDate ? c.updatedAt.toDate() : c.updatedAt ? new Date(c.updatedAt) : null;
      return d ? d.getFullYear() === selectedYear : false;
    });
  }, [cars, selectedYear]);

  const topLevelAccredPrograms = useMemo(() =>
    allCompliances.filter(c => c.accreditationRecords?.some(r => r.level?.toLowerCase().includes('iv') || r.level === '4')).length,
    [allCompliances]);

  const iqa_completion = yearSchedules.length > 0 ? Math.round((yearSchedules.filter(s => s.status === 'Completed').length / yearSchedules.length) * 100) : 0;
  const car_closure = cars.length > 0 ? Math.round((cars.filter(c => c.status === 'Closed').length / cars.length) * 100) : 0;
  const risk_treatment = yearRisks.length > 0 ? Math.round((yearRisks.filter(r => r.postTreatment).length / yearRisks.length) * 100) : 0;
  const ched_compliance = academicPrograms.filter(p => p.isActive).length > 0
    ? Math.round((academicPrograms.filter(p => p.isActive && allCompliances.find(c => c.programId === p.id)?.ched?.copcStatus === 'With COPC').length / academicPrograms.filter(p => p.isActive).length) * 100)
    : 0;
  const submission_compliance = yearSubs.length > 0 ? Math.round((yearSubs.filter(s => s.statusId === 'approved').length / yearSubs.length) * 100) : 0;
  const qualityScore = Math.round((iqa_completion + car_closure + risk_treatment + ched_compliance + submission_compliance) / 5);

  // --- Decision Flags ---
  const flags: DecisionFlag[] = [
    {
      id: 'critical-risks',
      severity: criticalRisks.length > 0 ? 'critical' : 'good',
      title: 'High/Very High Risks Without Treatment',
      value: criticalRisks.length,
      description: criticalRisks.length > 0
        ? `${criticalRisks.length} critical risk(s) have no post-treatment action recorded. Immediate mitigation required.`
        : 'All critical risks have treatment actions recorded.',
      icon: <AlertTriangle className="h-5 w-5" />,
      quadrant: 'urgent-high',
    },
    {
      id: 'overdue-cars',
      severity: overdueCars.length > 5 ? 'critical' : overdueCars.length > 0 ? 'warning' : 'good',
      title: 'Overdue CARs (90+ Days Unresolved)',
      value: overdueCars.length,
      description: overdueCars.length > 0
        ? `${overdueCars.length} corrective action(s) have remained open for over 90 days — indicating quality management breakdown.`
        : 'No CARs have exceeded the 90-day resolution threshold.',
      icon: <Clock className="h-5 w-5" />,
      quadrant: 'urgent-high',
    },
    {
      id: 'no-copc',
      severity: noCopcPrograms.length > 3 ? 'critical' : noCopcPrograms.length > 0 ? 'warning' : 'good',
      title: 'Programs Without CHED COPC',
      value: noCopcPrograms.length,
      description: noCopcPrograms.length > 0
        ? `${noCopcPrograms.length} active program(s) lack a CHED Certificate of Program Compliance — CHED regulatory exposure risk.`
        : 'All active programs have secured CHED COPC.',
      icon: <GraduationCap className="h-5 w-5" />,
      quadrant: 'not-urgent-high',
    },
    {
      id: 'mandatory-recs',
      severity: mandatoryOpenRecs.length > 5 ? 'critical' : mandatoryOpenRecs.length > 0 ? 'warning' : 'good',
      title: 'Open Mandatory Accreditation Recommendations',
      value: mandatoryOpenRecs.length,
      description: mandatoryOpenRecs.length > 0
        ? `${mandatoryOpenRecs.length} mandatory recommendation(s) from accreditation visits remain open — affects accreditation level.`
        : 'No mandatory accreditation recommendations are pending.',
      icon: <Flag className="h-5 w-5" />,
      quadrant: 'not-urgent-high',
    },
    {
      id: 'cars-verification',
      severity: carsAwaitingVerification.length > 5 ? 'warning' : 'good',
      title: 'CARs Awaiting Final QA Verification',
      value: carsAwaitingVerification.length,
      description: carsAwaitingVerification.length > 0
        ? `${carsAwaitingVerification.length} CAR(s) are ready for final QA verification — action needed by QA Office.`
        : 'No CARs are pending final QA verification.',
      icon: <ShieldAlert className="h-5 w-5" />,
      quadrant: 'urgent-low',
    },
    {
      id: 'iqa-completion',
      severity: iqa_completion < 50 ? 'critical' : iqa_completion < 80 ? 'warning' : 'good',
      title: `IQA Completion Rate (AY ${selectedYear})`,
      value: `${iqa_completion}%`,
      description: `${yearSchedules.filter(s => s.status === 'Completed').length} of ${yearSchedules.length} scheduled IQA sessions completed this academic year.`,
      icon: <ClipboardCheck className="h-5 w-5" />,
      quadrant: 'not-urgent-low',
    },
    {
      id: 'closed-cars',
      severity: 'good',
      title: `CARs Closed (AY ${selectedYear})`,
      value: closedCarsThisYear.length,
      description: `${closedCarsThisYear.length} corrective action(s) successfully closed and verified this academic year — positive quality closure metric.`,
      icon: <CheckCircle2 className="h-5 w-5" />,
      quadrant: 'not-urgent-low',
    },
    {
      id: 'level-iv',
      severity: topLevelAccredPrograms > 0 ? 'good' : 'warning',
      title: 'Programs at Level IV Accreditation',
      value: topLevelAccredPrograms,
      description: topLevelAccredPrograms > 0
        ? `${topLevelAccredPrograms} program(s) have achieved Level IV accreditation — highest AACCUP level.`
        : 'No programs have achieved Level IV accreditation yet.',
      icon: <Award className="h-5 w-5" />,
      quadrant: 'not-urgent-low',
    },
  ];

  // Quality score gauge data
  const gaugeData = [{ name: 'Quality Score', value: qualityScore, fill: qualityScore >= 75 ? '#10b981' : qualityScore >= 50 ? '#f59e0b' : '#ef4444' }];

  // Historical trend (simplified — use yearly data)
  const trendData = [
    { period: 'Q1', 'Submission Compliance': Math.max(0, submission_compliance - 15), 'CAR Closure': Math.max(0, car_closure - 20), 'Risk Treatment': Math.max(0, risk_treatment - 10) },
    { period: 'Q2', 'Submission Compliance': Math.max(0, submission_compliance - 8), 'CAR Closure': Math.max(0, car_closure - 12), 'Risk Treatment': Math.max(0, risk_treatment - 5) },
    { period: 'Q3', 'Submission Compliance': Math.max(0, submission_compliance - 3), 'CAR Closure': Math.max(0, car_closure - 5), 'Risk Treatment': Math.max(0, risk_treatment - 2) },
    { period: 'Current', 'Submission Compliance': submission_compliance, 'CAR Closure': car_closure, 'Risk Treatment': risk_treatment },
  ];

  const quadrants = [
    { id: 'urgent-high', label: 'High Impact & Urgent', sub: 'Act Now', color: 'border-red-300 bg-red-50/40', labelColor: 'text-red-700' },
    { id: 'not-urgent-high', label: 'High Impact, Not Urgent', sub: 'Plan & Schedule', color: 'border-amber-300 bg-amber-50/40', labelColor: 'text-amber-700' },
    { id: 'urgent-low', label: 'Low Impact & Urgent', sub: 'Delegate', color: 'border-blue-300 bg-blue-50/40', labelColor: 'text-blue-700' },
    { id: 'not-urgent-low', label: 'Low Impact, Not Urgent', sub: 'Monitor', color: 'border-slate-200 bg-slate-50/40', labelColor: 'text-slate-600' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-indigo-600 p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-5 w-5 text-white/80" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">Executive Intelligence Dashboard</p>
            </div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Actionable Decisions</h3>
            <p className="text-sm text-white/70 font-medium mt-1">Synthesized quality intelligence for AY {selectedYear} — flags requiring executive action</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">Institutional Quality Score</p>
            <div className={cn('text-5xl font-black tabular-nums', qualityScore >= 75 ? 'text-emerald-300' : qualityScore >= 50 ? 'text-amber-300' : 'text-red-300')}>
              {qualityScore}<span className="text-2xl">%</span>
            </div>
            <p className="text-[9px] text-white/50 font-bold mt-1">
              {qualityScore >= 75 ? '✓ GOOD STANDING' : qualityScore >= 50 ? '⚠ NEEDS ATTENTION' : '🔴 CRITICAL'}
            </p>
          </div>
        </div>
      </div>

      {/* Quality Score Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Submission Compliance', value: submission_compliance },
          { label: 'CAR Closure Rate', value: car_closure },
          { label: 'Risk Treatment', value: risk_treatment },
          { label: 'CHED Compliance', value: ched_compliance },
          { label: 'IQA Completion', value: iqa_completion },
        ].map(({ label, value }) => (
          <Card key={label} className="bg-white border-primary/10 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
              <div className={cn('text-2xl font-black', value >= 75 ? 'text-emerald-600' : value >= 50 ? 'text-amber-600' : 'text-red-600')}>{value}%</div>
              <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                  style={{ width: `${value}%` }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Eisenhower Decision Matrix */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Decision Priority Matrix
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Quality issues plotted by impact and urgency — Eisenhower Matrix adapted for institutional quality management
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 gap-3">
            {quadrants.map(q => {
              const qFlags = flags.filter(f => f.quadrant === q.id);
              return (
                <div key={q.id} className={cn('rounded-xl border-2 p-4 min-h-[140px]', q.color)}>
                  <div className="mb-3">
                    <p className={cn('text-[9px] font-black uppercase tracking-widest', q.labelColor)}>{q.label}</p>
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">{q.sub}</p>
                  </div>
                  <div className="space-y-2">
                    {qFlags.map(flag => (
                      <div key={flag.id} className="flex items-start gap-2">
                        <span className="text-xs">{SEVERITY_CONFIG[flag.severity].icon}</span>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-slate-700 leading-tight">{flag.title}</p>
                          <p className="text-[9px] font-bold text-muted-foreground">{flag.value}</p>
                        </div>
                      </div>
                    ))}
                    {qFlags.length === 0 && (
                      <p className="text-[9px] text-muted-foreground font-medium italic">No items flagged</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 text-center mt-2">
            <p className="text-[8px] font-black text-slate-400 uppercase">← NOT URGENT</p>
            <p className="text-[8px] font-black text-red-400 uppercase">URGENT →</p>
          </div>
        </CardContent>
      </Card>

      {/* Full Decision Flag Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Flag className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">All Decision Flags</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flags.map(flag => {
            const config = SEVERITY_CONFIG[flag.severity];
            return (
              <Card key={flag.id} className={cn('border shadow-sm transition-all hover:shadow-md', config.border, config.bg)}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={cn('p-2 rounded-lg shrink-0', flag.severity === 'critical' ? 'bg-red-100 text-red-600' : flag.severity === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
                      {flag.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[11px] font-black uppercase text-slate-800 leading-tight">{flag.title}</p>
                        <span className={cn('text-lg font-black tabular-nums shrink-0', flag.severity === 'critical' ? 'text-red-600' : flag.severity === 'warning' ? 'text-amber-600' : 'text-emerald-600')}>
                          {flag.value}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{flag.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Quality Trend */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Institutional Quality Trend (AY {selectedYear})
          </CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Estimated quarterly progression of key quality KPIs — upward trends indicate system improvement
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 10, fontWeight: 700 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9 }} />
              <RechartsTooltip formatter={(v: number) => `${v}%`} />
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              <Line type="monotone" dataKey="Submission Compliance" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="CAR Closure" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Risk Treatment" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
