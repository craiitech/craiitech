import type {
  Submission, Risk, Cycle, Unit, CorrectiveActionRequest,
  AuditPlan, CsmResponse, GADPlan, GADActivity,
  KpiDefinition, KpiSnapshot, KpiThreshold
} from './types';

export type KpiComputationResult = {
  value: number;
  metadata?: Record<string, any>;
};

type KpiComputationInput = {
  definitions: KpiDefinition[];
  submissions?: Submission[];
  risks?: Risk[];
  cycles?: Cycle[];
  units?: Unit[];
  cars?: CorrectiveActionRequest[];
  auditPlans?: AuditPlan[];
  csmResponses?: CsmResponse[];
  gadPlans?: GADPlan[];
  gadActivities?: GADActivity[];
  selectedYear: number;
  entityType: 'institution' | 'campus' | 'unit';
  entityId: string;
};

function getStatus(value: number, thresholds: KpiThreshold): 'good' | 'satisfactory' | 'poor' {
  if (thresholds.direction === 'higher_is_better') {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.satisfactory) return 'satisfactory';
    return 'poor';
  }
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.satisfactory) return 'satisfactory';
  return 'poor';
}

function getTrend(current: number, previous?: number): 'up' | 'down' | 'stable' {
  if (previous === undefined || previous === null) return 'stable';
  const diff = current - previous;
  if (Math.abs(diff) < 0.5) return 'stable';
  return diff > 0 ? 'up' : 'down';
}

export function computeKpis(input: KpiComputationInput): KpiSnapshot[] {
  const {
    definitions, submissions, risks, cycles, units,
    cars, auditPlans, csmResponses, selectedYear,
    entityType, entityId,
    gadPlans, gadActivities
  } = input;

  const yearSubmissions = submissions?.filter(s => s.year === selectedYear) || [];
  const yearRisks = risks?.filter(r => r.year === selectedYear) || [];

  function filterByEntity<T extends { campusId?: string; unitId?: string }>(items: T[]): T[] {
    if (entityType === 'institution') return items;
    if (entityType === 'campus') return items.filter(i => i.campusId === entityId);
    return items.filter(i => i.unitId === entityId);
  }

  const entitySubmissions = filterByEntity(yearSubmissions);
  const entityRisks = filterByEntity(yearRisks);

  const now = new Date();
  const period = `${selectedYear}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;

  const snapshots: KpiSnapshot[] = [];

  for (const def of definitions) {
    let result: KpiComputationResult = { value: 0 };

    switch (def.dataSource) {
      case 'submission_completion_rate': {
        const totalUnits = units?.length || 1;
        const unitsWithAllReports = new Set(entitySubmissions.map(s => s.unitId)).size;
        result = { value: Math.round((unitsWithAllReports / totalUnits) * 100) };
        break;
      }
      case 'submission_on_time_rate': {
        const total = entitySubmissions.length || 1;
        const onTime = entitySubmissions.filter(s => {
          const cycle = cycles?.find(c => c.id === s.cycleId);
          if (!cycle?.endDate) return true;
          const subDate = s.submissionDate instanceof Date ? s.submissionDate : new Date(s.submissionDate);
          const endDate = cycle.endDate.toDate ? cycle.endDate.toDate() : new Date(cycle.endDate);
          return subDate <= endDate;
        }).length;
        result = { value: Math.round((onTime / total) * 100) };
        break;
      }
      case 'submission_approval_rate': {
        const total = entitySubmissions.length || 1;
        const approved = entitySubmissions.filter(s => s.statusId === 'approved').length;
        result = { value: Math.round((approved / total) * 100) };
        break;
      }
      case 'risk_closure_rate': {
        const total = entityRisks.length || 1;
        const closed = entityRisks.filter(r => r.status === 'Closed').length;
        result = { value: Math.round((closed / total) * 100) };
        break;
      }
      case 'high_risk_percentage': {
        const total = entityRisks.length || 1;
        const highRisks = entityRisks.filter(r =>
          r.preTreatment?.rating?.toLowerCase().includes('high') ||
          r.preTreatment?.rating?.toLowerCase().includes('critical')
        ).length;
        result = { value: Math.round((highRisks / total) * 100) };
        break;
      }
      case 'risk_overdue_ratio': {
        const openRisks = entityRisks.filter(r => r.status !== 'Closed');
        const total = openRisks.length || 1;
        const overdue = openRisks.filter(r => {
          if (!r.targetDate) return false;
          const target = r.targetDate.toDate ? r.targetDate.toDate() : new Date(r.targetDate);
          return target < now;
        }).length;
        result = { value: Math.round((overdue / total) * 100) };
        break;
      }
      case 'risk_treatment_effectiveness': {
        const withTreatment = entityRisks.filter(r => r.postTreatment);
        const total = withTreatment.length || 1;
        const effective = withTreatment.filter(r =>
          (r.postTreatment?.magnitude || 0) < (r.preTreatment?.magnitude || 99)
        ).length;
        result = { value: Math.round((effective / total) * 100) };
        break;
      }
      case 'car_closure_rate': {
        const entityCars = cars ? filterByEntity(cars) : [];
        const total = entityCars.length || 1;
        const closed = entityCars.filter(c => c.status === 'Closed').length;
        result = { value: Math.round((closed / total) * 100) };
        break;
      }
      case 'audit_completion_rate': {
        const entityAudits = auditPlans ? filterByEntity(auditPlans) : [];
        const total = entityAudits.length || 1;
        const completed = entityAudits.filter(a => {
          const endDate = a.closingMeetingDate?.toDate ? a.closingMeetingDate.toDate() : new Date(a.closingMeetingDate);
          return endDate < now;
        }).length;
        result = { value: Math.round((completed / total) * 100) };
        break;
      }
      case 'csm_satisfaction_score': {
        const entityCsm = csmResponses ? filterByEntity(csmResponses) : [];
        const scores = entityCsm.map(r => r.sqd0).filter(s => s > 0);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        result = { value: Math.round((avg / 5) * 100) };
        break;
      }
      case 'gad_budget_utilization': {
        const entityGadPlans = gadPlans ? filterByEntity(gadPlans) : [];
        const entityGadActivities = gadActivities ? filterByEntity(gadActivities) : [];
        const totalBudget = entityGadPlans.reduce((s, p) => s + (p.budget || 0), 0);
        const usedBudget = entityGadActivities.reduce((s, a) => s + (a.actualBudgetUsed || 0), 0);
        result = { value: totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0 };
        break;
      }
      default: {
        result = { value: 0 };
      }
    }

    const prevSnapshot = snapshots.find(s => s.kpiId === def.id);
    snapshots.push({
      id: `${def.id}_${entityId}_${period}`,
      kpiId: def.id,
      kpiName: def.name,
      entityType,
      entityId,
      entityName: entityId,
      period,
      value: result.value,
      target: def.defaultTarget,
      status: getStatus(result.value, def.thresholds),
      previousValue: prevSnapshot?.value,
      trend: getTrend(result.value, prevSnapshot?.value),
      timestamp: now,
    });
  }

  return snapshots;
}

export function computeEomsScore(submissions: Submission[], risks: Risk[], cars: CorrectiveActionRequest[], units: Unit[]): number {
  let score = 0;
  const totalUnits = units.length || 1;

  const subRate = submissions.filter(s => s.statusId === 'approved').length / Math.max(submissions.length, 1);
  score += subRate * 30;

  const riskRate = risks.filter(r => r.status === 'Closed').length / Math.max(risks.length, 1);
  score += riskRate * 25;

  const carRate = cars.filter(c => c.status === 'Closed').length / Math.max(cars.length, 1);
  score += carRate * 25;

  const unitCoverage = new Set(submissions.map(s => s.unitId)).size / totalUnits;
  score += unitCoverage * 20;

  return Math.round(score);
}

export function calculateEomsScore(submissions: Submission[], risks: Risk[], cars: CorrectiveActionRequest[], units: Unit[]): number {
  return computeEomsScore(submissions, risks, cars, units);
}
