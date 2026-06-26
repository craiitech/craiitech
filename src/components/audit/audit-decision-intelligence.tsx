'use client';

import { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Unit, Campus, CorrectiveActionRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, Cell, LabelList,
  PieChart, Pie,
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Target, Clock, Building2, ListChecks,
  AlertOctagon, Lightbulb, FileSearch, ArrowRight, ShieldCheck, Info, TrendingUp, Siren, Flag, Search,
  GanttChartSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface IqaDecisionIntelligenceProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  cars: CorrectiveActionRequest[];
  isoClauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  selectedYear: number;
}

const FINDING_TYPE_COLORS: Record<string, string> = {
  'Compliance': '#10b981',
  'Observation for Improvement': '#f59e0b',
  'Non-Conformance': '#ef4444',
  'Not Applicable': '#94a3b8',
};

const FINDING_TYPE_SHORT: Record<string, string> = {
  'Compliance': 'C',
  'Observation for Improvement': 'OFI',
  'Non-Conformance': 'NC',
  'Not Applicable': 'N/A',
};

export function IqaDecisionIntelligence({
  plans, schedules, findings, cars, isoClauses, units, campuses, selectedYear
}: IqaDecisionIntelligenceProps) {
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  // Scope data to selected year
  const yearData = useMemo(() => {
    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    const yearSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    const scheduleIds = new Set(yearSchedules.map(s => s.id));
    const yearFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    return { yearPlans, yearSchedules, scheduleIds, yearFindings };
  }, [plans, schedules, findings, selectedYear]);

  const { yearPlans, yearSchedules, yearFindings } = yearData;

  // Cross-year progression: OFIs in previous year → NCs in current year (same unit, same clause)
  const crossYearProgression = useMemo(() => {
    const prevYear = selectedYear - 1;
    const prevYearPlans = plans.filter(p => p.year === prevYear);
    const prevPlanIds = new Set(prevYearPlans.map(p => p.id));
    const prevYearSchedules = schedules.filter(s => prevPlanIds.has(s.auditPlanId));
    const prevScheduleIds = new Set(prevYearSchedules.map(s => s.id));
    const prevFindings = findings.filter(f => prevScheduleIds.has(f.auditScheduleId));

    if (prevFindings.length === 0) return [];

    // Map previous year OFIs by unit+clause
    const prevOfiByUnitClause: Record<string, string[]> = {};
    prevFindings.forEach(f => {
      if (f.type !== 'Observation for Improvement') return;
      const schedule = prevYearSchedules.find(s => s.id === f.auditScheduleId);
      if (!schedule) return;
      const key = `${schedule.targetId}-${f.isoClause}`;
      if (!prevOfiByUnitClause[key]) prevOfiByUnitClause[key] = [];
      prevOfiByUnitClause[key].push(f.id || f.isoClause);
    });

    // Find current year NCs on same unit+clause
    const result: {
      unitId: string;
      unitName: string;
      clauseId: string;
      clauseTitle: string;
      prevOfiCount: number;
      currentNcCount: number;
    }[] = [];

    yearFindings.forEach(f => {
      if (f.type !== 'Non-Conformance') return;
      const schedule = yearSchedules.find(s => s.id === f.auditScheduleId);
      if (!schedule) return;
      const key = `${schedule.targetId}-${f.isoClause}`;
      const prevOfis = prevOfiByUnitClause[key];
      if (!prevOfis || prevOfis.length === 0) return;

      // Check if this unit+clause already in result
      const existing = result.find(r => r.unitId === schedule.targetId && r.clauseId === f.isoClause);
      if (existing) {
        existing.currentNcCount++;
      } else {
        const match = isoClauses.find(c => c.id === f.isoClause || c.title === f.isoClause);
        result.push({
          unitId: schedule.targetId,
          unitName: unitMap.get(schedule.targetId) || 'Unknown',
          clauseId: f.isoClause,
          clauseTitle: match ? match.title : `Clause ${f.isoClause}`,
          prevOfiCount: prevOfis.length,
          currentNcCount: 1,
        });
      }
    });

    return result.sort((a, b) => b.currentNcCount - a.currentNcCount);
  }, [findings, plans, schedules, isoClauses, unitMap, selectedYear, yearFindings, yearSchedules]);

  // Finding counts by type
  const findingCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Compliance': 0, 'Observation for Improvement': 0, 'Non-Conformance': 0, 'Not Applicable': 0 };
    yearFindings.forEach(f => { if (counts[f.type] !== undefined) counts[f.type]++; });
    return counts;
  }, [yearFindings]);

  // ---- 1. FINDING-TO-ACTION FUNNEL ----
  const funnelData = useMemo(() => {
    const totalFindings = yearFindings.length;
    const totalNc = findingCounts['Non-Conformance'];
    const totalOfi = findingCounts['Observation for Improvement'];
    const totalCompliance = findingCounts['Compliance'];

    // Map CARs to NC findings
    const ncFindingIds = new Set(yearFindings.filter(f => f.type === 'Non-Conformance').map(f => f.id));
    const carsLinked = cars.filter(c =>
      c.source === 'Audit Finding' && c.findingId && ncFindingIds.has(c.findingId)
    );
    const closedCarsList = carsLinked.filter(c => c.status === 'Closed');
    const carsForNc = carsLinked.length;
    const closedCars = closedCarsList.length;

    // Nc findings without CARs
    const ncWithCarIds = new Set(carsLinked.filter(c => c.findingId).map(c => c.findingId!));
    const ncWithoutCar = totalNc - ncWithCarIds.size;

    // Ofis linked to CARs
    const ofiFindingIds = new Set(yearFindings.filter(f => f.type === 'Observation for Improvement').map(f => f.id));
    const carsFromOfi = cars.filter(c =>
      c.source === 'Audit Finding' && c.findingId && ofiFindingIds.has(c.findingId)
    );

    const result: {
      totalFindings: number; totalNc: number; totalOfi: number; totalCompliance: number;
      ncWithoutCar: number; carsForNc: number; closedCars: number; carsFromOfi: number;
    } = {
      totalFindings, totalNc, totalOfi, totalCompliance,
      ncWithoutCar, carsForNc, closedCars, carsFromOfi: carsFromOfi.length,
    };
    return result;
  }, [yearFindings, findingCounts, cars]);

  // ---- 2. CRITICAL NC WATCHLIST ----
  const ncWatchlist = useMemo(() => {
    const ncFindings = yearFindings.filter(f => f.type === 'Non-Conformance');
    const carFindingIds = new Set(cars.filter(c => c.findingId).map(c => c.findingId!));

    return ncFindings
      .filter(f => !carFindingIds.has(f.id))
      .map(f => {
        const schedule = yearSchedules.find(s => s.id === f.auditScheduleId);
        return {
          id: f.id,
          description: f.description || f.ncStatement || 'No description',
          unitName: schedule ? (unitMap.get(schedule.targetId) || schedule.targetName) : 'Unknown',
          campusName: schedule ? (campusMap.get(schedule.campusId) || 'Unknown').replace('Campus', '').trim() : 'Unknown',
          isoClause: f.isoClause,
          evidence: f.evidence,
          schedule,
        };
      });
  }, [yearFindings, cars, yearSchedules, unitMap, campusMap]);

  // ---- 3. UNIT COMPLIANCE SCORE MATRIX ----
  const unitScores = useMemo(() => {
    const map: Record<string, { total: number; nc: number; ofi: number; compliance: number; score: number; campusId: string }> = {};

    yearSchedules.forEach(s => {
      const unitFindings = yearFindings.filter(f => f.auditScheduleId === s.id && f.type !== 'Not Applicable');
      if (unitFindings.length === 0) return;

      if (!map[s.targetId]) {
        map[s.targetId] = { total: 0, nc: 0, ofi: 0, compliance: 0, score: 0, campusId: s.campusId };
      }

      unitFindings.forEach(f => {
        map[s.targetId].total++;
        if (f.type === 'Non-Conformance') map[s.targetId].nc++;
        else if (f.type === 'Observation for Improvement') map[s.targetId].ofi++;
        else if (f.type === 'Compliance') map[s.targetId].compliance++;
      });
    });

    return Object.entries(map).map(([unitId, d]) => {
      const weightedScore = d.total > 0
        ? Math.round(((d.compliance * 1 + d.ofi * 0.5 + d.nc * 0) / d.total) * 100)
        : 0;
      return {
        unitId,
        unitName: unitMap.get(unitId) || 'Unknown',
        campusName: (campusMap.get(d.campusId) || 'Unknown').replace('Campus', '').trim(),
        ...d,
        weightedScore,
        grade: weightedScore >= 90 ? 'A' : weightedScore >= 75 ? 'B' : weightedScore >= 50 ? 'C' : 'D',
        hasNc: d.nc > 0,
      };
    }).sort((a, b) => a.weightedScore - b.weightedScore);
  }, [yearSchedules, yearFindings, unitMap, campusMap]);

  // ---- 4. ISO CLAUSE RISK MAP ----
  const clauseRiskData = useMemo(() => {
    const clauseStats: Record<string, { nc: number; ofi: number; compliance: number; total: number }> = {};

    yearFindings.forEach(f => {
      if (f.type === 'Not Applicable') return;
      if (!clauseStats[f.isoClause]) clauseStats[f.isoClause] = { nc: 0, ofi: 0, compliance: 0, total: 0 };
      clauseStats[f.isoClause].total++;
      if (f.type === 'Non-Conformance') clauseStats[f.isoClause].nc++;
      else if (f.type === 'Observation for Improvement') clauseStats[f.isoClause].ofi++;
      else clauseStats[f.isoClause].compliance++;
    });

    return Object.entries(clauseStats)
      .map(([clauseId, d]) => {
        const match = isoClauses.find(c => c.id === clauseId || c.title === clauseId);
        return {
          clauseId,
          title: match ? match.title : `Clause ${clauseId}`,
          description: match ? match.description : '',
          ...d,
          riskIndex: d.total > 0 ? Math.round(((d.nc * 3 + d.ofi * 1) / d.total) * 100) : 0,
        };
      })
      .sort((a, b) => b.riskIndex - a.riskIndex);
  }, [yearFindings, isoClauses]);

  // ---- 5. RECURRING ISSUE DETECTION ----
  const recurringIssues = useMemo(() => {
    const unitClauseMap: Record<string, { nc: number; ofi: number }> = {};

    yearFindings.forEach(f => {
      if (f.type === 'Not Applicable') return;
      const schedule = yearSchedules.find(s => s.id === f.auditScheduleId);
      if (!schedule) return;
      const key = `${schedule.targetId}-${f.isoClause}`;
      if (!unitClauseMap[key]) unitClauseMap[key] = { nc: 0, ofi: 0 };
      if (f.type === 'Non-Conformance') unitClauseMap[key].nc++;
      else if (f.type === 'Observation for Improvement') unitClauseMap[key].ofi++;
    });

    return Object.entries(unitClauseMap)
      .filter(([_, data]) => data.nc >= 1 || data.ofi >= 2)
      .map(([key, data]) => {
        const [unitId, clauseId] = key.split('-');
        const match = isoClauses.find(c => c.id === clauseId || c.title === clauseId);
        return {
          unitId,
          unitName: unitMap.get(unitId) || 'Unknown',
          clauseId,
          clauseTitle: match ? match.title : `Clause ${clauseId}`,
          nc: data.nc,
          ofi: data.ofi,
          severity: data.nc >= 1 ? 'critical' : 'warning',
        };
      })
      .sort((a, b) => (b.nc + b.ofi) - (a.nc + a.ofi));
  }, [yearFindings, yearSchedules, isoClauses, unitMap]);

  // ---- 6. PROCESS CATEGORY HEALTH ----
  const processHealth = useMemo(() => {
    const cats: Record<string, { nc: number; ofi: number; compliance: number; total: number }> = {};

    yearFindings.forEach(f => {
      if (f.type === 'Not Applicable') return;
      const schedule = yearSchedules.find(s => s.id === f.auditScheduleId);
      const cat = schedule?.processCategory || 'Operation Processes';
      if (!cats[cat]) cats[cat] = { nc: 0, ofi: 0, compliance: 0, total: 0 };
      cats[cat].total++;
      if (f.type === 'Non-Conformance') cats[cat].nc++;
      else if (f.type === 'Observation for Improvement') cats[cat].ofi++;
      else cats[cat].compliance++;
    });

    return Object.entries(cats).map(([name, d]) => ({
      name: name === 'Management Processes' ? 'Management' : name === 'Operation Processes' ? 'Operations' : 'Support',
      fullName: name,
      ...d,
      healthScore: d.total > 0 ? Math.round(((d.compliance * 1 + d.ofi * 0.5 + d.nc * 0) / d.total) * 100) : 0,
    }));
  }, [yearFindings, yearSchedules]);

  // ---- 7. EXECUTIVE RECOMMENDATIONS ----
  const recommendations = useMemo(() => {
    const items: {
      priority: 'critical' | 'high' | 'medium' | 'low';
      title: string;
      rationale: string;
      action: string;
      count: number;
      icon: React.ReactNode;
    }[] = [];

    // NCs without CARs
    if (funnelData.ncWithoutCar > 0) {
      items.push({
        priority: 'critical',
        title: `${funnelData.ncWithoutCar} NC Findings Without Corrective Actions`,
        rationale: `Non-conformances without linked CARs may go unaddressed, creating compliance gaps and recurring audit findings. Each NC requires a root-cause analysis and corrective action plan.`,
        action: `QA Office to assign CAR creation for each orphaned NC finding within 7 days. Escalate to Campus Director for compliance.`,
        count: funnelData.ncWithoutCar,
        icon: <AlertOctagon className="h-4 w-4" />,
      });
    }

    // Low-scoring units
    const failingUnits = unitScores.filter(u => u.weightedScore < 60);
    if (failingUnits.length > 0) {
      items.push({
        priority: 'high',
        title: `${failingUnits.length} Units Scoring Below 60% Compliance`,
        rationale: `Units with weighted scores below 60% have more non-conformances than compliant findings, indicating systemic process failures. ${failingUnits.slice(0, 3).map(u => u.unitName).join(', ')} require immediate intervention.`,
        action: `Schedule follow-up audits for these units within 60 days. Assign mentor auditors to guide corrective actions. Report progress to VPAA.`,
        count: failingUnits.length,
        icon: <AlertTriangle className="h-4 w-4" />,
      });
    }

    // High-risk ISO clauses
    const highRiskClauses = clauseRiskData.filter(c => c.riskIndex >= 50);
    if (highRiskClauses.length > 0) {
      items.push({
        priority: 'high',
        title: `${highRiskClauses.length} ISO Clauses With High NC Density`,
        rationale: `${highRiskClauses[0]?.title} (${highRiskClauses[0]?.nc} NCs) and ${highRiskClauses[1]?.title || ''} are the most frequently cited clauses. This indicates institutional weaknesses in these specific process areas.`,
        action: `Conduct targeted process improvement workshops for these ISO clauses. Update procedure documentation and deliver refresher training to all unit heads.`,
        count: highRiskClauses.length,
        icon: <FileSearch className="h-4 w-4" />,
      });
    }

    // Cross-year OFI→NC progression
    if (crossYearProgression.length > 0) {
      items.push({
        priority: 'critical',
        title: `${crossYearProgression.length} Units With OFI→NC Progression`,
        rationale: `${crossYearProgression.length} unit(s) had Observations for Improvement (OFI) on specific ISO clauses last year that escalated to Non-Conformances (NC) this year. This pattern indicates that previous corrective actions were ineffective or incomplete. ${crossYearProgression.slice(0, 2).map(u => `${u.unitName} (${u.clauseTitle})`).join(', ')} show this progression.`,
        action: `Mandate root-cause re-analysis for these specific unit-clause combinations. Previous CARs must be reopened and effectiveness audits scheduled within 30 days. Escalate to Campus Director level.`,
        count: crossYearProgression.length,
        icon: <TrendingUp className="h-4 w-4" />,
      });
    }

    // Recurring issues (same unit, same clause)
    const persistentIssues = recurringIssues.filter(r => r.severity === 'critical');
    if (persistentIssues.length > 0) {
      items.push({
        priority: 'critical',
        title: `${persistentIssues.length} Units With Recurring NCs on the Same ISO Clause`,
        rationale: `These units have been cited for non-conformance on the same ISO clause repeatedly, indicating root-cause analysis was incomplete or corrective actions were ineffective. ${persistentIssues.slice(0, 2).map(u => u.unitName).join(', ')} show the most persistent patterns.`,
        action: `Escalate to QAO Director for mandatory root-cause re-analysis. Previous CARs for these clauses must be reviewed for effectiveness before closure.`,
        count: persistentIssues.length,
        icon: <Search className="h-4 w-4" />,
      });
    }

    // CAR closure bottleneck
    const openCars = cars.filter(c => c.status !== 'Closed' && c.source === 'Audit Finding');
    if (openCars.length > 5) {
      items.push({
        priority: 'medium',
        title: `${openCars.length} Audit-Finding CARs Still Open`,
        rationale: `A backlog of ${openCars.length} open CARs from audit findings indicates a bottleneck in the corrective action pipeline. Average resolution time should not exceed 90 days per CAR procedure.`,
        action: `QA Office to audit the CAR workflow. Identify stalled items and assign escalation owners. Set 30-day closure targets for CARs older than 60 days.`,
        count: openCars.length,
        icon: <Clock className="h-4 w-4" />,
      });
    }

    // Exemplar units (high compliance)
    const exemplarUnits = unitScores.filter(u => u.weightedScore >= 90);
    if (exemplarUnits.length > 0) {
      items.push({
        priority: 'low',
        title: `${exemplarUnits.length} Units Achieved 90%+ Compliance Score`,
        rationale: `${exemplarUnits.slice(0, 3).map(u => u.unitName).join(', ')} demonstrated strong IQA performance. Their practices can serve as institutional benchmarks.`,
        action: `Document best practices from these units. Invite unit heads to share methodologies in the next QMS review. Consider recognition in the annual quality awards.`,
        count: exemplarUnits.length,
        icon: <CheckCircle2 className="h-4 w-4" />,
      });
    }

    return items;
  }, [funnelData, unitScores, clauseRiskData, recurringIssues, cars, crossYearProgression]);

  // ---- DERIVED METRICS ----
  const iqaCompletionRate = yearSchedules.length > 0
    ? Math.round((yearSchedules.filter(s => s.status === 'Completed').length / yearSchedules.length) * 100)
    : 0;

  const findingPieData = [
    { name: 'Compliance', value: findingCounts['Compliance'], fill: FINDING_TYPE_COLORS['Compliance'] },
    { name: 'OFI', value: findingCounts['Observation for Improvement'], fill: FINDING_TYPE_COLORS['Observation for Improvement'] },
    { name: 'Non-Conformance', value: findingCounts['Non-Conformance'], fill: FINDING_TYPE_COLORS['Non-Conformance'] },
    { name: 'N/A', value: findingCounts['Not Applicable'], fill: FINDING_TYPE_COLORS['Not Applicable'] },
  ].filter(d => d.value > 0);

  const overallHealthScore = useMemo(() => {
    const totalFindings = findingCounts['Compliance'] + findingCounts['Observation for Improvement'] + findingCounts['Non-Conformance'];
    if (totalFindings === 0) return 0;
    return Math.round(((findingCounts['Compliance'] * 1 + findingCounts['Observation for Improvement'] * 0.5 + findingCounts['Non-Conformance'] * 0) / totalFindings) * 100);
  }, [findingCounts]);

  const kpiCards = [
    {
      label: 'IQA Completion',
      value: `${iqaCompletionRate}%`,
      detail: `${yearSchedules.filter(s => s.status === 'Completed').length} of ${yearSchedules.length} audits done`,
      icon: <ClipboardCheck className="h-4 w-4" />,
      color: iqaCompletionRate >= 80 ? 'text-emerald-600' : iqaCompletionRate >= 50 ? 'text-amber-600' : 'text-red-600',
      bg: iqaCompletionRate >= 80 ? 'bg-emerald-50' : iqaCompletionRate >= 50 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      label: 'Overall Health',
      value: `${overallHealthScore}%`,
      detail: `${findingCounts['Compliance']} C · ${findingCounts['Observation for Improvement']} OFI · ${findingCounts['Non-Conformance']} NC`,
      icon: <ShieldCheck className="h-4 w-4" />,
      color: overallHealthScore >= 75 ? 'text-emerald-600' : overallHealthScore >= 50 ? 'text-amber-600' : 'text-red-600',
      bg: overallHealthScore >= 75 ? 'bg-emerald-50' : overallHealthScore >= 50 ? 'bg-amber-50' : 'bg-red-50',
    },
    {
      label: 'NC → CAR Conversion',
      value: `${funnelData.totalNc > 0 ? Math.round((funnelData.carsForNc / funnelData.totalNc) * 100) : 0}%`,
      detail: `${funnelData.carsForNc} of ${funnelData.totalNc} NCs have CARs`,
      icon: <ArrowRight className="h-4 w-4" />,
      color: funnelData.ncWithoutCar === 0 ? 'text-emerald-600' : 'text-orange-600',
      bg: funnelData.ncWithoutCar === 0 ? 'bg-emerald-50' : 'bg-orange-50',
    },
    {
      label: 'Audited Units',
      value: unitScores.length,
      detail: `${unitScores.filter(u => !u.hasNc).length} NC-free · ${unitScores.filter(u => u.hasNc).length} with NCs`,
      icon: <Building2 className="h-4 w-4" />,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
  ];

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6">

        {/* Header Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-indigo-700 p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-5 w-5 text-indigo-300" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">IQA Executive Intelligence</p>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Audit Decision Support</h3>
              <p className="text-sm text-indigo-300 font-medium mt-1">
                {yearFindings.length} findings · {unitScores.length} audited units · {yearSchedules.length} sessions · AY {selectedYear}
              </p>
            </div>
            <div className="text-center">
              <div className={cn(
                'text-5xl font-black tabular-nums',
                overallHealthScore >= 75 ? 'text-emerald-400' : overallHealthScore >= 50 ? 'text-amber-400' : 'text-red-400'
              )}>
                {overallHealthScore}<span className="text-2xl">%</span>
              </div>
              <p className="text-[9px] font-bold mt-1 uppercase tracking-wider text-indigo-300">
                <span className={overallHealthScore >= 75 ? 'text-emerald-400' : overallHealthScore >= 50 ? 'text-amber-400' : 'text-red-400'}>
                  {overallHealthScore >= 75 ? 'Strong QMS Compliance' : overallHealthScore >= 50 ? 'Needs Improvement' : 'Critical Condition'}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiCards.map((kpi, i) => (
            <Card key={i} className="bg-white border-primary/10 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{kpi.label}</p>
                  <span className={cn('p-1 rounded', kpi.bg, kpi.color)}>{kpi.icon}</span>
                </div>
                <p className={cn('text-2xl font-black tabular-nums tracking-tight', kpi.color)}>{kpi.value}</p>
                <p className="text-[8px] text-slate-400 font-bold mt-1">{kpi.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* === EXECUTIVE RECOMMENDATIONS (shown first as highest value) === */}
        {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Siren className="h-4 w-4 text-red-500" />
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">Priority Action Items</h4>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').map((rec, i) => (
                <Card key={i} className={cn(
                  'border-2 shadow-sm',
                  rec.priority === 'critical' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/30'
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'p-1.5 rounded-lg',
                          rec.priority === 'critical' ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100'
                        )}>{rec.icon}</span>
                        <div>
                          <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">{rec.title}</p>
                          <Badge className={cn(
                            'text-[7px] font-black uppercase tracking-widest mt-0.5',
                            rec.priority === 'critical' ? 'bg-red-600' : 'bg-amber-500'
                          )}>{rec.priority}</Badge>
                        </div>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-2">{rec.rationale}</p>
                    <div className="bg-white/70 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[7px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Recommended Action</p>
                      <p className="text-[9px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{rec.action}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Row 1: Finding Distribution + Unit Grading */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Finding Distribution */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Finding Distribution
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">
                Compliance vs Opportunities for Improvement vs Non-Conformance
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={findingPieData}
                    cx="50%" cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value, percent }) => `${FINDING_TYPE_SHORT[name] || name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                  >
                    {findingPieData.map(entry => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* NC → CAR Funnel */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <GanttChartSquare className="h-4 w-4 text-primary" />
                Finding-to-Action Pipeline
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">
                How findings flow from identification through corrective action to closure
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center gap-0">
                {[
                  { label: 'Total Findings', value: funnelData.totalFindings, color: 'bg-slate-500' },
                  { label: 'Non-Conformances', value: funnelData.totalNc, color: 'bg-red-500' },
                  { label: 'With CARs', value: funnelData.carsForNc, color: 'bg-orange-500' },
                  { label: 'CARs Closed', value: funnelData.closedCars, color: 'bg-emerald-500' },
                ].map((stage, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm shadow-sm',
                      stage.color
                    )}>
                      {stage.value}
                    </div>
                    <p className="text-[8px] font-bold text-slate-500 mt-1.5 text-center leading-tight">{stage.label}</p>
                    {i < 3 && <ChevronRight className="h-4 w-4 text-slate-300 -mr-2 -ml-2" />}
                  </div>
                ))}
              </div>
              {funnelData.ncWithoutCar > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-[9px] font-bold text-red-700">
                    ⚠ {funnelData.ncWithoutCar} NC finding(s) have no associated CAR — corrective action gap
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Unit Scores + ISO Clause Risk */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Unit Compliance Score Matrix */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Unit Compliance Score Matrix
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold text-slate-400">
                    Audited units ranked by weighted finding score — lower scores need intervention
                  </CardDescription>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-slate-400 hover:text-slate-600 dark:text-slate-400 transition-colors focus:outline-none">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[200px] text-[10px] bg-slate-900 text-white border-none p-2 shadow-lg rounded-md">
                    <p className="font-bold mb-1">Weighted Score Formula</p>
                    <p className="text-slate-200">Compliance×1 + OFI×0.5 + NC×0, normalized per unit. Grade A ≥90%, B ≥75%, C ≥50%, D &lt;50%.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y divide-slate-100">
                {unitScores.slice(0, 10).map((unit, i) => (
                  <div key={unit.unitId} className={cn(
                    'flex items-center gap-3 p-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors',
                    unit.grade === 'D' && 'bg-red-50/30',
                    unit.grade === 'C' && 'bg-amber-50/20',
                  )}>
                    <div className={cn(
                      'shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black',
                      unit.grade === 'A' ? 'bg-emerald-100 text-emerald-700' :
                      unit.grade === 'B' ? 'bg-blue-100 text-blue-700' :
                      unit.grade === 'C' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    )}>{unit.grade}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate">{unit.unitName}</p>
                        <span className="text-[7px] text-slate-400 font-bold">{unit.campusName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[8px] font-bold text-slate-500 mt-0.5">
                        <span className="text-emerald-600">{unit.compliance} C</span>
                        <span className="text-amber-600">{unit.ofi} OFI</span>
                        <span className={unit.nc > 0 ? 'text-red-600' : ''}>{unit.nc} NC</span>
                      </div>
                    </div>
                    <div className="shrink-0 w-16 text-right">
                      <span className={cn(
                        'text-sm font-black tabular-nums',
                        unit.weightedScore >= 75 ? 'text-emerald-600' :
                        unit.weightedScore >= 50 ? 'text-amber-600' : 'text-red-600'
                      )}>{unit.weightedScore}%</span>
                      <Progress
                        value={unit.weightedScore}
                        className="h-1 mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {unitScores.length > 10 && (
                <p className="text-center text-[8px] text-slate-400 font-bold py-2 border-t border-slate-100 dark:border-slate-700">
                  + {unitScores.length - 10} more units
                </p>
              )}
            </CardContent>
          </Card>

          {/* ISO Clause Risk Map */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <FileSearch className="h-4 w-4 text-primary" />
                ISO Clause Risk Map
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">
                Clauses with highest NC density — risk index = (NC×3 + OFI×1) / total
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={clauseRiskData.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 8 }} domain={[0, 100]} />
                  <YAxis dataKey="title" type="category" tick={{ fontSize: 8, fontWeight: 700 }} width={100} tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 20) + '...' : v} />
                  <RechartsTooltip content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-border rounded-xl shadow-xl p-2.5 text-[10px] max-w-[220px]">
                        <p className="font-black mb-1">{d.title}</p>
                        <p className="font-bold text-emerald-600">Compliance: {d.compliance}</p>
                        <p className="font-bold text-amber-600">OFI: {d.ofi}</p>
                        <p className="font-bold text-red-600">NC: {d.nc}</p>
                        <p className="font-bold text-slate-500">Risk Index: {d.riskIndex}%</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="riskIndex" name="Risk Index" radius={[0, 4, 4, 0]}>
                    {clauseRiskData.slice(0, 8).map((entry, i) => (
                      <Cell key={i} fill={
                        entry.riskIndex >= 60 ? '#dc2626' :
                        entry.riskIndex >= 30 ? '#f97316' :
                        '#f59e0b'
                      } />
                    ))}
                    <LabelList dataKey="riskIndex" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 8, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Cross-Year Progression + Process Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Cross-Year OFI→NC Progression */}
          {crossYearProgression.length > 0 && (
            <Card className="shadow-md bg-white border-orange-200 lg:col-span-2">
              <CardHeader className="border-b bg-orange-50 pb-3">
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-orange-700">
                  <TrendingUp className="h-4 w-4" />
                  OFI → NC Progression Detected
                </CardTitle>
                <CardDescription className="text-[10px] font-bold text-orange-500">
                  Observations for Improvement from AY {selectedYear - 1} escalated to Non-Conformances in AY {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 p-0">
                <div className="divide-y divide-slate-100">
                  {crossYearProgression.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50/20">
                      <div className="shrink-0 p-1.5 rounded bg-red-100 text-red-600">
                        <TrendingUp className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-800 dark:text-slate-200 truncate">{item.unitName}</p>
                        <p className="text-[8px] text-slate-500 font-bold">{item.clauseTitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[8px] font-bold">
                        <span className="text-amber-600">{item.prevOfiCount} OFI (prev)</span>
                        <ArrowRight className="h-3 w-3 text-slate-300" />
                        <span className="text-red-600">{item.currentNcCount} NC (now)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recurring Issue Detection */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Recurring Issue Detection
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">
                Units with ≥2 OFIs or ≥1 NC on the same ISO clause this year — indicates ineffective corrective action
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {recurringIssues.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recurringIssues.slice(0, 8).map((issue, i) => (
                    <div key={i} className={cn(
                      'flex items-center gap-3 p-3',
                      issue.severity === 'critical' && 'bg-red-50/30'
                    )}>
                      <div className={cn(
                        'shrink-0 p-1.5 rounded',
                        issue.severity === 'critical' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      )}>
                        {issue.severity === 'critical' ? <AlertTriangle className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-slate-800 dark:text-slate-200 truncate">{issue.unitName}</p>
                        <p className="text-[8px] text-slate-500 font-bold">{issue.clauseTitle}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[8px] font-bold">
                        <span className={issue.nc > 0 ? 'text-red-600' : ''}>{issue.nc} NC</span>
                        <span className="text-amber-600">{issue.ofi} OFI</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <p className="text-[10px] text-slate-400 font-bold">No recurring issues detected for AY {selectedYear}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Process Category Health */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <GanttChartSquare className="h-4 w-4 text-primary" />
                Process Category Health
              </CardTitle>
              <CardDescription className="text-[10px] font-bold text-slate-400">
                Management, Operations, and Support process maturity based on finding composition
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {processHealth.map((cat, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">{cat.name}</p>
                        <span className="text-[8px] text-slate-400 font-bold">({cat.total} findings)</span>
                      </div>
                      <span className={cn(
                        'text-[11px] font-black tabular-nums',
                        cat.healthScore >= 75 ? 'text-emerald-600' :
                        cat.healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
                      )}>{cat.healthScore}%</span>
                    </div>
                    <Progress
                      value={cat.healthScore}
                      className={cn(
                        'h-2',
                        cat.healthScore >= 75 ? '' : cat.healthScore >= 50 ? '' : ''
                      )}
                    />
                    <div className="flex items-center gap-3 text-[7px] font-bold text-slate-500">
                      <span className="text-emerald-600">{cat.compliance} C</span>
                      <span className="text-amber-600">{cat.ofi} OFI</span>
                      <span className={cat.nc > 0 ? 'text-red-600' : ''}>{cat.nc} NC</span>
                    </div>
                  </div>
                ))}
                {processHealth.length === 0 && (
                  <p className="text-center text-[10px] text-slate-400 font-bold py-4">No process category data for AY {selectedYear}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical NC Watchlist */}
        {ncWatchlist.length > 0 && (
          <Card className="shadow-md bg-white border-red-200/60">
            <CardHeader className="border-b bg-red-50/50 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2 text-red-700">
                  <AlertOctagon className="h-4 w-4 text-red-500" />
                  Critical NC Watchlist — Unlinked Findings
                </CardTitle>
                <Badge className="bg-red-600 text-[9px] font-black">{ncWatchlist.length} orphaned</Badge>
              </div>
              <CardDescription className="text-[10px] font-bold text-red-600/70">
                Non-conformances without linked Corrective Action Requests — risk of being forgotten
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              <div className="divide-y divide-red-100">
                {ncWatchlist.slice(0, 10).map((nc, i) => (
                  <div key={nc.id} className="flex items-start gap-3 p-3 hover:bg-red-50/30 transition-colors">
                    <div className="shrink-0 mt-0.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 leading-relaxed mb-1">
                        {nc.description.length > 120 ? nc.description.slice(0, 120) + '...' : nc.description}
                      </p>
                      <div className="flex items-center gap-3 text-[7px] font-bold text-slate-500">
                        <span className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5" />{nc.unitName}</span>
                        <span className="flex items-center gap-1">{nc.campusName}</span>
                        <span className="text-indigo-600">Clause {nc.isoClause}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {ncWatchlist.length > 10 && (
                <p className="text-center text-[8px] text-red-400 font-bold py-2 border-t border-red-100">
                  + {ncWatchlist.length - 10} more orphaned NCs
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* All Recommendations (including medium/low) */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Executive Recommendations Summary
            </CardTitle>
            <CardDescription className="text-[10px] font-bold text-slate-400">
              All data-driven action items prioritized by severity — {recommendations.length} total
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-3">
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
                      'bg-emerald-100 text-emerald-600'
                    )}>{rec.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[10px] font-black text-slate-800 dark:text-slate-200">{rec.title}</p>
                        <Badge className={cn(
                          'text-[7px] font-black uppercase tracking-widest',
                          rec.priority === 'critical' ? 'bg-red-600' :
                          rec.priority === 'high' ? 'bg-amber-500' :
                          rec.priority === 'medium' ? 'bg-blue-500' :
                          'bg-emerald-600'
                        )}>{rec.priority}</Badge>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium mb-2">{rec.rationale}</p>
                      <div className="bg-white/70 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-[7px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Recommended Action</p>
                        <p className="text-[9px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{rec.action}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-center text-xs text-muted-foreground py-4 font-bold">No findings data for {selectedYear} — recommendations will populate after audits are completed</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <ArrowRight className={cn('h-3 w-3 shrink-0', className)} />;
}

function PieChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
