'use client';

import { useMemo, useState } from 'react';
import type { Risk, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  ShieldAlert, TrendingUp, AlertTriangle, Lightbulb, Target, Clock, MapPin, Building2,
  AlertOctagon, CheckCircle2, FileSearch, GanttChartSquare, Crosshair, Siren, ListChecks,
  ExternalLink, Flag, Users, Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays } from 'date-fns';

interface ExecutiveRiskIntelligenceProps {
  risks: Risk[];
  allUnits: Unit[];
  campuses: Campus[];
  selectedYear: number;
}

const RATING_ORDER = ['Very High', 'High', 'Medium', 'Low'] as const;
const RATING_COLORS: Record<string, string> = {
  'Very High': '#dc2626',
  'High': '#f97316',
  'Medium': '#f59e0b',
  'Low': '#10b981',
};
const RATING_BG: Record<string, string> = {
  'Very High': 'bg-red-50 border-red-200',
  'High': 'bg-orange-50 border-orange-200',
  'Medium': 'bg-amber-50 border-amber-200',
  'Low': 'bg-emerald-50 border-emerald-200',
};
const RATING_TEXT: Record<string, string> = {
  'Very High': 'text-red-700',
  'High': 'text-orange-700',
  'Medium': 'text-amber-700',
  'Low': 'text-emerald-700',
};

const SEVERITY_CONFIG = {
  critical: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-600 text-white', icon: '🔴' },
  warning: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-500 text-white', icon: '🟡' },
  good: { bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-600 text-white', icon: '🟢' },
} as const;

export function ExecutiveRiskIntelligence({ risks, allUnits, campuses, selectedYear }: ExecutiveRiskIntelligenceProps) {
  const unitMap = useMemo(() => new Map(allUnits.map(u => [u.id, u.name])), [allUnits]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const yearRisks = useMemo(() => risks.filter(r => Number(r.year) === Number(selectedYear)), [risks, selectedYear]);
  const openRisks = useMemo(() => yearRisks.filter(r => r.type === 'Risk' && r.status !== 'Closed'), [yearRisks]);
  const closedRisks = useMemo(() => yearRisks.filter(r => r.type === 'Risk' && r.status === 'Closed'), [yearRisks]);
  const risksOnly = useMemo(() => yearRisks.filter(r => r.type === 'Risk'), [yearRisks]);
  const criticalRisks = useMemo(() => openRisks.filter(r => r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High'), [openRisks]);
  const untreatedHigh = useMemo(() => criticalRisks.filter(r => !r.postTreatment), [criticalRisks]);
  const withPostTreatment = useMemo(() => yearRisks.filter(r => r.postTreatment), [yearRisks]);

  const [riskFilter, setRiskFilter] = useState<'all' | 'open' | 'ongoing' | 'closed'>('all');

  // ---- SECTION 1: Risk Statement Register ----
  const riskRegister = useMemo(() => {
    return risksOnly.map(r => {
      const unitName = unitMap.get(r.unitId) || r.unitId;
      const campusName = (campusMap.get(r.campusId) || r.campusId).replace('Campus', '').trim();
      const daysOpen = r.createdAt ? differenceInDays(new Date(), r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt)) : 0;
      const hasTreatment = !!r.postTreatment;
      const isOverdue = daysOpen > 90 && r.status !== 'Closed';
      const needsTreatment = !hasTreatment && (r.preTreatment?.rating === 'High' || r.preTreatment?.rating === 'Very High');

      let recommendation = '';
      if (needsTreatment) recommendation = 'URGENT: Define and implement post-treatment mitigation plan immediately.';
      else if (isOverdue) recommendation = 'Review and expedite closure. Risk has been open >90 days. Escalate to unit head.';
      else if (!hasTreatment && r.status !== 'Closed') recommendation = 'Consider developing a treatment plan to reduce residual risk.';
      else if (hasTreatment && r.status !== 'Closed') recommendation = 'Monitor treatment effectiveness and verify evidence for closure.';
      else recommendation = 'Closed. Verify evidence is archived for audit trail.';

      return {
        id: r.id,
        description: r.description,
        objective: r.objective || 'Unspecified',
        unitName,
        campusName,
        rating: r.preTreatment?.rating || 'Low',
        status: r.status,
        hasTreatment,
        daysOpen,
        isOverdue,
        needsTreatment,
        recommendation,
        magnitude: r.preTreatment?.magnitude || 0,
        residualMagnitude: r.postTreatment?.magnitude,
        reduction: r.postTreatment ? (r.preTreatment?.magnitude || 0) - (r.postTreatment?.magnitude || 0) : 0,
      };
    });
  }, [risksOnly, unitMap, campusMap]);

  const filteredRegister = useMemo(() => {
    if (riskFilter === 'open') return riskRegister.filter(r => r.status !== 'Closed');
    if (riskFilter === 'ongoing') return riskRegister.filter(r => r.status === 'In Progress');
    if (riskFilter === 'closed') return riskRegister.filter(r => r.status === 'Closed');
    return riskRegister;
  }, [riskRegister, riskFilter]);

  // ---- SECTION 2: Institutional Objective Risk Map ----
  const objectiveRiskMap = useMemo(() => {
    const map: Record<string, { total: number; open: number; critical: number; untreated: number; avgMagnitude: number; objectives: string[] }> = {};
    risksOnly.forEach(r => {
      const key = r.objective || 'Unspecified';
      if (!map[key]) map[key] = { total: 0, open: 0, critical: 0, untreated: 0, avgMagnitude: 0, objectives: [] };
      map[key].total++;
      if (r.status !== 'Closed') map[key].open++;
      if ((r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High') && r.status !== 'Closed') map[key].critical++;
      if (!r.postTreatment && r.status !== 'Closed') map[key].untreated++;
      map[key].avgMagnitude += r.preTreatment?.magnitude || 0;
      if (!map[key].objectives.includes(r.objective || 'Unspecified')) map[key].objectives.push(r.objective || 'Unspecified');
    });
    return Object.entries(map).map(([objective, d]) => ({
      objective: objective.length > 60 ? objective.slice(0, 60) + '...' : objective,
      fullObjective: objective,
      total: d.total,
      open: d.open,
      critical: d.critical,
      untreated: d.untreated,
      avgMagnitude: d.total > 0 ? parseFloat((d.avgMagnitude / d.total).toFixed(1)) : 0,
      riskScore: d.total > 0 ? Math.round((d.critical * 3 + d.untreated * 2 + d.open) / d.total * 10) : 0,
    })).sort((a, b) => b.riskScore - a.riskScore);
  }, [risksOnly]);

  // ---- SECTION 3: Campus Risk Profile ----
  const campusProfile = useMemo(() => {
    return campuses.map(c => {
      const campusRisks = risksOnly.filter(r => r.campusId === c.id);
      const campusOpen = campusRisks.filter(r => r.status !== 'Closed');
      const campusCritical = campusOpen.filter(r => r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High');
      const campusTreated = campusRisks.filter(r => r.postTreatment);
      const avgMag = campusRisks.length > 0
        ? parseFloat((campusRisks.reduce((s, r) => s + (r.preTreatment?.magnitude || 0), 0) / campusRisks.length).toFixed(1))
        : 0;
      const resMag = campusRisks.filter(r => r.postTreatment).length > 0
        ? parseFloat((campusRisks.filter(r => r.postTreatment).reduce((s, r) => s + (r.postTreatment?.magnitude || 0), 0) / campusRisks.filter(r => r.postTreatment).length).toFixed(1))
        : 0;
      return {
        name: c.name.replace('Campus', '').trim(),
        total: campusRisks.length,
        open: campusOpen.length,
        critical: campusCritical.length,
        treatmentRate: campusRisks.length > 0 ? Math.round((campusTreated.length / campusRisks.length) * 100) : 0,
        avgMagnitude: avgMag,
        residualMagnitude: resMag,
        reduction: avgMag - resMag,
        needsAttention: campusCritical.length > 0 && campusTreated.length < campusCritical.length,
      };
    }).filter(c => c.total > 0).sort((a, b) => b.critical - a.critical);
  }, [risksOnly, campuses]);

  // ---- SECTION 4: Overdue & Escalation Watch ----
  const alertWatch = useMemo(() => {
    const alerts: {
      type: 'critical' | 'warning' | 'info';
      title: string;
      description: string;
      icon: React.ReactNode;
      count: number;
      action: string;
    }[] = [];

    // Untreated critical risks
    if (untreatedHigh.length > 0) {
      alerts.push({
        type: 'critical',
        title: 'Untreated Critical Risks',
        description: `${untreatedHigh.length} high/very-high risks across ${new Set(untreatedHigh.map(r => r.unitId)).size} units have no post-treatment mitigation plan.`,
        icon: <AlertOctagon className="h-4 w-4" />,
        count: untreatedHigh.length,
        action: 'Convene risk owners to submit treatment plans within 14 days. Escalate to VPAA if no response.',
      });
    }

    // Overdue risks (>90 days open)
    const overdueOpen = openRisks.filter(r => {
      if (!r.createdAt) return false;
      const d = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
      return differenceInDays(new Date(), d) > 90;
    });
    if (overdueOpen.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Risk Resolutions',
        description: `${overdueOpen.length} risks have been open for >90 days without closure.`,
        icon: <Clock className="h-4 w-4" />,
        count: overdueOpen.length,
        action: 'Flag to unit heads for status update. Consider reassigning if no progress.',
      });
    }

    // Risks past target date
    const pastTarget = openRisks.filter(r => {
      if (!r.targetDate) return false;
      const d = r.targetDate.toDate ? r.targetDate.toDate() : new Date(r.targetDate);
      return d < new Date();
    });
    if (pastTarget.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Missed Treatment Deadlines',
        description: `${pastTarget.length} risks have passed their target treatment completion date.`,
        icon: <Clock className="h-4 w-4" />,
        count: pastTarget.length,
        action: 'Review and update target dates. Identify resource constraints delaying treatment.',
      });
    }

    // Overdue review cycles
    const overdueReview = openRisks.filter(r => {
      if (!r.nextReviewDue) return false;
      const d = r.nextReviewDue.toDate ? r.nextReviewDue.toDate() : new Date(r.nextReviewDue);
      return d < new Date();
    });
    if (overdueReview.length > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Risk Reviews',
        description: `${overdueReview.length} risks have passed their scheduled review date.`,
        icon: <FileSearch className="h-4 w-4" />,
        count: overdueReview.length,
        action: 'Schedule review sessions with risk owners to update status and ratings.',
      });
    }

    // Campuses needing attention
    const strugglingCampuses = campusProfile.filter(c => c.needsAttention);
    if (strugglingCampuses.length > 0) {
      alerts.push({
        type: 'info',
        title: 'Campuses Requiring Support',
        description: `${strugglingCampuses.map(c => c.name).join(', ')} have critical risks without proportional treatment coverage.`,
        icon: <Building2 className="h-4 w-4" />,
        count: strugglingCampuses.length,
        action: 'Deploy QA Office to provide targeted support for treatment plan development.',
      });
    }

    return alerts;
  }, [untreatedHigh, openRisks, campusProfile]);

  // ---- SECTION 5: Executive Score ----
  const executiveScore = useMemo(() => {
    const treatmentRate = risksOnly.length > 0 ? Math.round((withPostTreatment.length / risksOnly.length) * 100) : 0;
    const closureRate = risksOnly.length > 0 ? Math.round((closedRisks.length / risksOnly.length) * 100) : 0;
    const criticalRate = risksOnly.length > 0 ? Math.round((criticalRisks.length / risksOnly.length) * 100) : 0;
    const untreatedCriticalRate = risksOnly.length > 0 ? Math.round((untreatedHigh.length / risksOnly.length) * 100) : 0;
    const avgReduction = riskRegister.filter(r => r.hasTreatment).length > 0
      ? Math.round(riskRegister.filter(r => r.hasTreatment).reduce((s, r) => s + r.reduction, 0) / riskRegister.filter(r => r.hasTreatment).length)
      : 0;

    const score = Math.max(0, Math.min(100,
      Math.round(
        (treatmentRate * 0.25) +
        (closureRate * 0.25) +
        ((100 - criticalRate) * 0.20) +
        ((100 - untreatedCriticalRate) * 0.20) +
        (avgReduction * 0.10)
      )
    ));

    return { score, treatmentRate, closureRate, criticalRate, untreatedCriticalRate, avgReduction };
  }, [risksOnly, withPostTreatment, closedRisks, criticalRisks, untreatedHigh, riskRegister]);

  // ---- SECTION 6: Recommendations Engine ----
  const recommendations = useMemo(() => {
    const items: { priority: 'critical' | 'high' | 'medium' | 'low'; message: string; rationale: string; action: string }[] = [];

    if (untreatedHigh.length > 0) {
      const units = new Set(untreatedHigh.map(r => unitMap.get(r.unitId) || r.unitId));
      items.push({
        priority: 'critical',
        message: `${untreatedHigh.length} high-severity risks across ${units.size} units lack post-treatment plans`,
        rationale: `Without treatment plans, these risks remain at full unmitigated severity, exposing the institution to potential regulatory sanctions, reputational damage, or financial loss.`,
        action: `Issue a directive requiring each unit head to submit treatment plans within 14 calendar days. QA Office to follow up at day 7.`,
      });
    }

    const topRiskObjective = objectiveRiskMap[0];
    if (topRiskObjective && topRiskObjective.riskScore > 15) {
      items.push({
        priority: 'high',
        message: `Highest risk concentration: "${topRiskObjective.objective}" objective`,
        rationale: `${topRiskObjective.open} open risks (${topRiskObjective.critical} critical) are tied to this institutional objective, indicating a strategic vulnerability.`,
        action: `Convene a strategy review for this objective. Allocate additional resources to mitigate the ${topRiskObjective.untreated} untreated risks.`,
      });
    }

    const lowTreatmentCampuses = campusProfile.filter(c => c.treatmentRate < 50 && c.total > 0);
    if (lowTreatmentCampuses.length > 0) {
      items.push({
        priority: 'high',
        message: `${lowTreatmentCampuses.length} campus(es) have sub-50% risk treatment rates`,
        rationale: `Low treatment rates indicate that risk mitigation is not keeping pace with risk identification, creating a growing unmitigated risk exposure.`,
        action: `QA Office to conduct targeted training on risk treatment planning for ${lowTreatmentCampuses.map(c => c.name).join(', ')}.`,
      });
    }

    const totalReduction = riskRegister.filter(r => r.hasTreatment).reduce((s, r) => s + r.reduction, 0);
    const avgRed = riskRegister.filter(r => r.hasTreatment).length > 0
      ? Math.round(totalReduction / riskRegister.filter(r => r.hasTreatment).length)
      : 0;
    if (avgRed > 0) {
      items.push({
        priority: 'medium',
        message: `Treatment is effective — average risk magnitude reduction of ${avgRed} points`,
        rationale: `Risks with post-treatment plans show an average reduction of ${avgRed} magnitude points, validating the treatment framework.`,
        action: `Continue current treatment protocols. Document successful treatments as best practices for new risk owners.`,
      });
    } else if (riskRegister.filter(r => r.hasTreatment).length === 0 && risksOnly.length > 0) {
      items.push({
        priority: 'medium',
        message: 'No post-treatment data recorded for any risk',
        rationale: `Without post-treatment assessments, the institution cannot measure risk reduction effectiveness or validate the ERM framework.`,
        action: `Require all open risks to have post-treatment targets defined within 30 days. Make post-treatment documentation a mandatory field.`,
      });
    }

    if (closedRisks.length > 0) {
      items.push({
        priority: 'low',
        message: `${closedRisks.length} risks successfully closed this year`,
        rationale: `A ${Math.round((closedRisks.length / risksOnly.length) * 100)}% closure rate indicates active risk management. Benchmark against previous years to track improvement.`,
        action: `Maintain current momentum. Analyze closed risks for recurring patterns that may indicate systemic issues.`,
      });
    }

    return items;
  }, [untreatedHigh, unitMap, objectiveRiskMap, campusProfile, riskRegister, closedRisks, risksOnly]);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Crosshair className="h-5 w-5 text-amber-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ERM Executive Intelligence</p>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Enterprise Risk Summary</h3>
              <p className="text-sm text-slate-400 font-medium mt-1">
                {risksOnly.length} risks across {campusProfile.length} campuses · {selectedYear}
              </p>
            </div>
            <div className="text-center">
              <div className={cn(
                'text-5xl font-black tabular-nums',
                executiveScore.score >= 75 ? 'text-emerald-400' : executiveScore.score >= 50 ? 'text-amber-400' : 'text-red-400'
              )}>
                {executiveScore.score}<span className="text-2xl">%</span>
              </div>
              <p className="text-[9px] text-slate-500 font-bold mt-1 uppercase tracking-wider">
                <span className={executiveScore.score >= 75 ? 'text-emerald-400' : executiveScore.score >= 50 ? 'text-amber-400' : 'text-red-400'}>
                  {executiveScore.score >= 75 ? 'Strong Risk Posture' : executiveScore.score >= 50 ? 'Moderate Risk' : 'Weak Risk Posture'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* === ALERT WATCH === */}
        {alertWatch.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-500" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Active Alerts Requiring Executive Attention</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertWatch.map((alert, i) => (
                <Card key={i} className={cn(
                  'border-2 shadow-sm',
                  alert.type === 'critical' ? 'border-red-200 bg-red-50/40' :
                  alert.type === 'warning' ? 'border-amber-200 bg-amber-50/30' :
                  'border-blue-200 bg-blue-50/30'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'p-1.5 rounded-lg',
                          alert.type === 'critical' ? 'text-red-600 bg-red-100' :
                          alert.type === 'warning' ? 'text-amber-600 bg-amber-100' :
                          'text-blue-600 bg-blue-100'
                        )}>
                          {alert.icon}
                        </span>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">{alert.title}</p>
                          <p className="text-[9px] text-slate-500 font-bold">{alert.count} item(s)</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        'text-[8px] font-black uppercase tracking-wider',
                        alert.type === 'critical' ? 'bg-red-600' :
                        alert.type === 'warning' ? 'bg-amber-500' :
                        'bg-blue-500'
                      )}>{alert.type}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-2">{alert.description}</p>
                    <div className="bg-white/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Recommended Action</p>
                      <p className="text-[9px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{alert.action}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* === EXECUTIVE SCORE BREAKDOWN === */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Treatment Coverage', value: executiveScore.treatmentRate, icon: <ShieldAlert className="h-4 w-4" />, detail: `${withPostTreatment.length} of ${risksOnly.length} risks treated`, color: 'text-indigo-600' },
            { label: 'Closure Rate', value: executiveScore.closureRate, icon: <CheckCircle2 className="h-4 w-4" />, detail: `${closedRisks.length} of ${risksOnly.length} risks closed`, color: 'text-emerald-600' },
            { label: 'Critical Risk Ratio', value: 100 - executiveScore.criticalRate, icon: <AlertTriangle className="h-4 w-4" />, detail: `${criticalRisks.length} of ${risksOnly.length} are critical`, color: 'text-red-600', invert: true },
            { label: 'Untreated Critical', value: 100 - executiveScore.untreatedCriticalRate, icon: <AlertOctagon className="h-4 w-4" />, detail: `${untreatedHigh.length} untreated high-risk items`, color: 'text-orange-600', invert: true },
            { label: 'Avg Reduction', value: Math.min(executiveScore.avgReduction, 25), icon: <TrendingUp className="h-4 w-4" />, detail: `${executiveScore.avgReduction} pts avg magnitude reduction`, color: 'text-teal-600', max: 25 },
          ].map((metric, i) => (
            <Card key={i} className="bg-white border-primary/10 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{metric.label}</p>
                  <span className={cn('p-1 rounded', metric.color.replace('text-', 'bg-').replace('600', '100'), metric.color)}>{metric.icon}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={cn('text-2xl font-black tracking-tight tabular-nums', metric.color)}>
                    {metric.invert ? 100 - metric.value : metric.value}<span className="text-xs font-bold">%</span>
                  </span>
                </div>
                <Progress
                  value={metric.invert ? 100 - metric.value : metric.value}
                  max={metric.max || 100}
                  className={cn('h-1.5', metric.color.replace('text-', 'bg-').replace('600', '50'))}
                />
                <p className="text-[8px] text-slate-400 font-bold mt-1.5">{metric.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* === INSTITUTIONAL OBJECTIVE RISK MAP === */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Institutional Objective Risk Map
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Which institutional objectives are most threatened by open risks
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors focus:outline-none">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[200px] text-[10px] bg-slate-900 text-white border-none p-2 shadow-lg rounded-md">
                  <p className="font-bold mb-1">Risk Score Formula</p>
                  <p className="text-slate-200">Critical×3 + Untreated×2 + Open, normalized by total risks per objective. Higher score = greater strategic vulnerability.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {objectiveRiskMap.length > 0 ? (
              <div className="space-y-3">
                {objectiveRiskMap.slice(0, 10).map((obj, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
                      style={{ backgroundColor: obj.riskScore >= 20 ? '#fef2f2' : obj.riskScore >= 10 ? '#fff7ed' : '#f0fdf4' }}>
                      <span className={obj.riskScore >= 20 ? 'text-red-600' : obj.riskScore >= 10 ? 'text-amber-600' : 'text-emerald-600'}>
                        {obj.riskScore}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">{obj.objective}</p>
                        <span className="text-[8px] text-slate-400 font-bold">({obj.total} risks)</span>
                      </div>
                      <div className="flex items-center gap-3 text-[8px] font-bold text-slate-500">
                        <span className={obj.open > 0 ? 'text-amber-600' : 'text-emerald-600'}>
                          {obj.open} open
                        </span>
                        <span className={obj.critical > 0 ? 'text-red-600' : ''}>
                          {obj.critical} critical
                        </span>
                        <span className={obj.untreated > 0 ? 'text-orange-600' : ''}>
                          {obj.untreated} untreated
                        </span>
                        <span>Ø{obj.avgMagnitude} mag</span>
                      </div>
                    </div>
                    <div className="shrink-0 w-24">
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', obj.riskScore >= 20 ? 'bg-red-500' : obj.riskScore >= 10 ? 'bg-amber-500' : 'bg-emerald-500')}
                          style={{ width: `${Math.min(100, obj.riskScore * 5)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8 font-bold">No risks registered for {selectedYear}</p>
            )}
          </CardContent>
        </Card>

        {/* === CAMPUS RISK PROFILE === */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Campus Risk Profile Comparison
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Side-by-side risk posture across campuses — treatment rate, critical load, and magnitude reduction
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={campusProfile} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} angle={-20} textAnchor="end" />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <RechartsTooltip content={({ active, payload, label }: any) => {
                  if (!active || !payload?.length) return null;
                  const data = campusProfile.find(c => c.name === label);
                  return (
                    <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-[11px] max-w-[200px]">
                      <p className="font-black uppercase mb-1.5">{label}</p>
                      {data && (
                        <div className="space-y-0.5">
                          <p className="font-bold">Total: <span className="text-slate-700 dark:text-slate-300">{data.total}</span></p>
                          <p className="font-bold text-amber-600">Open: {data.open}</p>
                          <p className="font-bold text-red-600">Critical: {data.critical}</p>
                          <p className="font-bold text-indigo-600">Treatment: {data.treatmentRate}%</p>
                          <p className="font-bold text-emerald-600">Reduction: {data.reduction} pts</p>
                        </div>
                      )}
                    </div>
                  );
                }} />
                <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                <Bar dataKey="total" name="Total Risks" fill="#94a3b8" radius={[3, 3, 0, 0]} maxBarSize={24} />
                <Bar dataKey="critical" name="Critical (Open)" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* === RISK STATEMENT REGISTER === */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Risk Statement Register & Analysis
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Every risk with executive summary, treatment status, and recommended action
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <label className={cn('flex items-center gap-1 cursor-pointer text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors', riskFilter === 'all' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  <input type="radio" name="riskFilter" className="sr-only" checked={riskFilter === 'all'} onChange={() => setRiskFilter('all')} />
                  All Risks
                </label>
                <label className={cn('flex items-center gap-1 cursor-pointer text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors', riskFilter === 'open' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  <input type="radio" name="riskFilter" className="sr-only" checked={riskFilter === 'open'} onChange={() => setRiskFilter('open')} />
                  Open Risks
                </label>
                <label className={cn('flex items-center gap-1 cursor-pointer text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors', riskFilter === 'ongoing' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  <input type="radio" name="riskFilter" className="sr-only" checked={riskFilter === 'ongoing'} onChange={() => setRiskFilter('ongoing')} />
                  On-going Risks
                </label>
                <label className={cn('flex items-center gap-1 cursor-pointer text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-colors', riskFilter === 'closed' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                  <input type="radio" name="riskFilter" className="sr-only" checked={riskFilter === 'closed'} onChange={() => setRiskFilter('closed')} />
                  Closed Risks
                </label>
                <Badge variant="outline" className="text-[9px] font-bold">{filteredRegister.length} entries</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 p-0">
            <div className="divide-y divide-slate-100">
              {filteredRegister.slice(0, 20).map((entry, i) => (
                <div key={entry.id} className={cn(
                  'p-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/50',
                  entry.needsTreatment && 'bg-red-50/30',
                  entry.isOverdue && !entry.needsTreatment && 'bg-amber-50/30'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'shrink-0 w-1.5 h-full min-h-[60px] rounded-full mt-0.5',
                      entry.rating === 'Very High' ? 'bg-red-500' :
                      entry.rating === 'High' ? 'bg-orange-500' :
                      entry.rating === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 leading-relaxed mb-1">
                            {entry.description.length > 150 ? entry.description.slice(0, 150) + '...' : entry.description}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <Badge className={cn(
                            'text-[8px] font-black uppercase tracking-wider border',
                            RATING_BG[entry.rating] || 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700',
                            RATING_TEXT[entry.rating] || 'text-slate-700 dark:text-slate-300'
                          )}>{entry.rating}</Badge>
                          <Badge variant="outline" className={cn(
                            'text-[8px] font-bold',
                            entry.status === 'Closed' ? 'text-emerald-600 border-emerald-200' :
                            entry.status === 'In Progress' ? 'text-amber-600 border-amber-200' :
                            'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          )}>{entry.status}</Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[8px] font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{entry.unitName}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{entry.campusName}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{entry.daysOpen}d open</span>
                        <span className={cn(
                          'flex items-center gap-1',
                          entry.hasTreatment ? 'text-emerald-600' : entry.status !== 'Closed' ? 'text-orange-600' : ''
                        )}>
                          {entry.hasTreatment ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          {entry.hasTreatment ? 'Treated' : 'Untreated'}
                        </span>
                        {entry.reduction > 0 && (
                          <span className="text-emerald-600">-{entry.reduction}pts</span>
                        )}
                      </div>
                      <div className={cn(
                        'p-2.5 rounded-lg border',
                        entry.needsTreatment ? 'bg-red-50/80 border-red-200' :
                        entry.isOverdue ? 'bg-amber-50/80 border-amber-200' :
                        'bg-slate-50/80 dark:bg-slate-800/80 border-slate-100 dark:border-slate-700'
                      )}>
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Executive Recommendation</p>
                        <p className={cn(
                          'text-[9px] font-bold leading-relaxed',
                          entry.needsTreatment ? 'text-red-700' :
                          entry.isOverdue ? 'text-amber-700' :
                          'text-slate-600 dark:text-slate-400'
                        )}>{entry.recommendation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredRegister.length > 20 && (
              <div className="p-4 text-center border-t border-slate-100 dark:border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold">+ {filteredRegister.length - 20} more risks — refine filters for focused view</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* === EXECUTIVE RECOMMENDATIONS === */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Strategic Recommendations
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Data-driven action items prioritized by severity — derived from risk register analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {recommendations.length > 0 ? recommendations.map((rec, i) => (
                <div key={i} className={cn(
                  'rounded-xl border-2 p-4',
                  rec.priority === 'critical' ? 'border-red-200 bg-red-50/40' :
                  rec.priority === 'high' ? 'border-amber-200 bg-amber-50/30' :
                  rec.priority === 'medium' ? 'border-blue-200 bg-blue-50/30' :
                  'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30'
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'p-2 rounded-lg shrink-0',
                      rec.priority === 'critical' ? 'bg-red-100 text-red-600' :
                      rec.priority === 'high' ? 'bg-amber-100 text-amber-600' :
                      rec.priority === 'medium' ? 'bg-blue-100 text-blue-600' :
                      'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}>
                      {rec.priority === 'critical' ? <AlertOctagon className="h-4 w-4" /> :
                       rec.priority === 'high' ? <AlertTriangle className="h-4 w-4" /> :
                       rec.priority === 'medium' ? <Info className="h-4 w-4" /> :
                       <CheckCircle2 className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase">{rec.message}</p>
                        <Badge className={cn(
                          'text-[7px] font-black uppercase tracking-widest',
                          rec.priority === 'critical' ? 'bg-red-600' :
                          rec.priority === 'high' ? 'bg-amber-500' :
                          rec.priority === 'medium' ? 'bg-blue-500' :
                          'bg-slate-500'
                        )}>{rec.priority.toUpperCase()}</Badge>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium mb-2">{rec.rationale}</p>
                      <div className="bg-white/60 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Recommended Action</p>
                        <p className="text-[9px] text-slate-700 dark:text-slate-300 font-bold">{rec.action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-xs text-muted-foreground py-4 font-bold">No recommendations generated — risk register is empty for {selectedYear}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
