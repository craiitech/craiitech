import type {
  Submission, Risk, CorrectiveActionRequest, Unit, Cycle,
  AuditPlan, CsmResponse, KpiDefinition, KpiCategory, KpiThreshold,
  AttendanceActivity, ActivityAttendanceLog, ActivityEvaluation,
  GADPlan, GADActivity, OkrObjective, OkrKeyResult,
} from './types';
import { KPI_CATEGORIES, DEFAULT_KPI_THRESHOLDS } from './constants';

export type DataInventory = {
  submissions: Submission[] | null;
  risks: Risk[] | null;
  cars: CorrectiveActionRequest[] | null;
  units: Unit[] | null;
  cycles: Cycle[] | null;
  auditPlans: AuditPlan[] | null;
  csmResponses: CsmResponse[] | null;
  activities: AttendanceActivity[] | null;
  activityLogs: ActivityAttendanceLog[] | null;
  evaluations: ActivityEvaluation[] | null;
  gadPlans: GADPlan[] | null;
  gadActivities: GADActivity[] | null;
  okrObjectives: OkrObjective[] | null;
  okrKeyResults: OkrKeyResult[] | null;
  existingDefinitions: KpiDefinition[] | null;
  selectedYear: number;
};

export type SuggestionConfidence = 'high' | 'medium' | 'low';

export type KpiSuggestion = {
  id: string;
  dataSource: string;
  name: string;
  description: string;
  category: KpiCategory;
  unit: string;
  defaultTarget: number;
  thresholds: KpiThreshold;
  weight: number;
  confidence: SuggestionConfidence;
  reason: string;
  currentEstimate: number;
  hasData: boolean;
};

type SuggestionTemplate = {
  dataSource: string;
  defaultName: string;
  defaultCategory: KpiCategory;
  defaultUnit: string;
  defaultWeight: number;
  requiredInventory: (keyof DataInventory)[];
  confidenceCheck: (data: DataInventory) => SuggestionConfidence;
  estimateTarget: (data: DataInventory) => { target: number; current: number; reason: string; hasData: boolean };
  generateDescription: (data: DataInventory) => string;
};

function hasData(data: DataInventory, key: keyof DataInventory): boolean {
  const val = data[key];
  return Array.isArray(val) && val.length > 0;
}

function countByEntity<T extends { campusId?: string; unitId?: string }>(
  items: T[], entityType: 'institution' | 'campus' | 'unit', entityId: string
): T[] {
  if (entityType === 'institution') return items;
  if (entityType === 'campus') return items.filter(i => i.campusId === entityId);
  return items.filter(i => i.unitId === entityId);
}

const TEMPLATES: SuggestionTemplate[] = [
  {
    dataSource: 'submission_completion_rate',
    defaultName: 'Submission Completion Rate',
    defaultCategory: 'eoms_compliance',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['submissions', 'units'],
    confidenceCheck: (d) => hasData(d, 'submissions') && hasData(d, 'units') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const subs = d.submissions || [];
      if (subs.length === 0) return { target: 85, current: 0, reason: 'No submission data available yet.', hasData: false };
      const total = d.units?.length || 1;
      const distinctUnits = new Set(subs.map(s => s.unitId)).size;
      const rate = Math.round((distinctUnits / total) * 100);
      return {
        target: Math.max(rate + 10, 90),
        current: rate,
        reason: `${distinctUnits} of ${total} units have submitted. Target set above current rate.`,
        hasData: true,
      };
    },
    generateDescription: (d) => {
      const subs = d.submissions || [];
      const total = d.units?.length || 0;
      const distinctUnits = new Set(subs.map(s => s.unitId)).size;
      return `Percentage of units that have completed all required submissions for AY ${d.selectedYear}. Currently ${distinctUnits}/${total} units.`;
    },
  },
  {
    dataSource: 'submission_on_time_rate',
    defaultName: 'Submission On-Time Rate',
    defaultCategory: 'eoms_compliance',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['submissions'],
    confidenceCheck: (d) => hasData(d, 'submissions') && hasData(d, 'cycles') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const subs = d.submissions || [];
      if (subs.length === 0) return { target: 85, current: 0, reason: 'No submissions to analyze.', hasData: false };
      const cycles = d.cycles || [];
      const onTime = subs.filter(s => {
        const cycle = cycles.find(c => c.id === s.cycleId);
        if (!cycle?.endDate) return true;
        const subDate = s.submissionDate instanceof Date ? s.submissionDate : new Date(s.submissionDate);
        const endDate = cycle.endDate.toDate ? cycle.endDate.toDate() : new Date(cycle.endDate);
        return subDate <= endDate;
      }).length;
      const rate = Math.round((onTime / subs.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${onTime} of ${subs.length} submissions were on time.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of submissions completed before the cycle deadline for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'submission_approval_rate',
    defaultName: 'Submission Approval Rate',
    defaultCategory: 'eoms_compliance',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['submissions'],
    confidenceCheck: (d) => hasData(d, 'submissions') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const subs = d.submissions || [];
      if (subs.length === 0) return { target: 85, current: 0, reason: 'No submissions recorded.', hasData: false };
      const approved = subs.filter(s => s.statusId === 'approved').length;
      const rate = Math.round((approved / subs.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${approved} of ${subs.length} submissions approved.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of submissions that have been approved for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'risk_closure_rate',
    defaultName: 'Risk Closure Rate',
    defaultCategory: 'risk_management',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['risks'],
    confidenceCheck: (d) => hasData(d, 'risks') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const risks = d.risks || [];
      if (risks.length === 0) return { target: 80, current: 0, reason: 'No risks registered.', hasData: false };
      const closed = risks.filter(r => r.status === 'Closed').length;
      const rate = Math.round((closed / risks.length) * 100);
      return {
        target: Math.max(rate + 10, 85),
        current: rate,
        reason: `${closed} of ${risks.length} risks closed.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of identified risks that have been closed for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'high_risk_percentage',
    defaultName: 'High Risk Percentage',
    defaultCategory: 'risk_management',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['risks'],
    confidenceCheck: (d) => hasData(d, 'risks') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const risks = d.risks || [];
      if (risks.length === 0) return { target: 10, current: 0, reason: 'No risks to analyze.', hasData: false };
      const high = risks.filter(r =>
        r.preTreatment?.rating?.toLowerCase().includes('high') ||
        r.preTreatment?.rating?.toLowerCase().includes('critical')
      ).length;
      const rate = Math.round((high / risks.length) * 100);
      return {
        target: Math.max(5, Math.min(rate - 5, 15)),
        current: rate,
        reason: `${high} of ${risks.length} risks are high/critical.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of risks rated as high or critical for AY ${d.selectedYear}. Lower is better.`,
  },
  {
    dataSource: 'risk_overdue_ratio',
    defaultName: 'Risk Overdue Ratio',
    defaultCategory: 'risk_management',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['risks'],
    confidenceCheck: (d) => hasData(d, 'risks') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const risks = d.risks || [];
      const open = risks.filter(r => r.status !== 'Closed');
      if (open.length === 0) return { target: 5, current: 0, reason: 'All risks are closed.', hasData: false };
      const now = new Date();
      const overdue = open.filter(r => {
        if (!r.targetDate) return false;
        const target = r.targetDate.toDate ? r.targetDate.toDate() : new Date(r.targetDate);
        return target < now;
      }).length;
      const rate = Math.round((overdue / open.length) * 100);
      return {
        target: Math.max(5, Math.min(rate - 10, 20)),
        current: rate,
        reason: `${overdue} of ${open.length} open risks are overdue.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of open risks past their target closure date for AY ${d.selectedYear}. Lower is better.`,
  },
  {
    dataSource: 'risk_treatment_effectiveness',
    defaultName: 'Risk Treatment Effectiveness',
    defaultCategory: 'risk_management',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['risks'],
    confidenceCheck: (d) => hasData(d, 'risks') ? 'medium' : 'low',
    estimateTarget: (d) => {
      const risks = d.risks || [];
      const withTreatment = risks.filter(r => r.postTreatment);
      if (withTreatment.length === 0) return { target: 80, current: 0, reason: 'No risks with treatment data.', hasData: false };
      const effective = withTreatment.filter(r =>
        (r.postTreatment?.magnitude || 0) < (r.preTreatment?.magnitude || 99)
      ).length;
      const rate = Math.round((effective / withTreatment.length) * 100);
      return {
        target: Math.max(rate + 5, 85),
        current: rate,
        reason: `${effective} of ${withTreatment.length} treatments reduced risk magnitude.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of risk treatments that successfully reduced risk magnitude for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'car_closure_rate',
    defaultName: 'CAR Closure Rate',
    defaultCategory: 'audit_car',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['cars'],
    confidenceCheck: (d) => hasData(d, 'cars') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const cars = d.cars || [];
      if (cars.length === 0) return { target: 85, current: 0, reason: 'No CARs recorded.', hasData: false };
      const closed = cars.filter(c => c.status === 'Closed').length;
      const rate = Math.round((closed / cars.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${closed} of ${cars.length} CARs closed.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of Corrective Action Requests that have been closed for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'audit_completion_rate',
    defaultName: 'Audit Completion Rate',
    defaultCategory: 'audit_car',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['auditPlans'],
    confidenceCheck: (d) => hasData(d, 'auditPlans') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const plans = d.auditPlans || [];
      if (plans.length === 0) return { target: 85, current: 0, reason: 'No audit plans found.', hasData: false };
      const now = new Date();
      const completed = plans.filter(a => {
        const endDate = a.closingMeetingDate && 'toDate' in a.closingMeetingDate ? a.closingMeetingDate.toDate() : a.closingMeetingDate ? new Date(a.closingMeetingDate) : now;
        return endDate < now;
      }).length;
      const rate = Math.round((completed / plans.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${completed} of ${plans.length} audits completed.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of scheduled audits that have been completed for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'csm_satisfaction_score',
    defaultName: 'CSM Client Satisfaction Score',
    defaultCategory: 'csm_service_quality',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['csmResponses'],
    confidenceCheck: (d) => hasData(d, 'csmResponses') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const responses = d.csmResponses || [];
      if (responses.length === 0) return { target: 85, current: 0, reason: 'No CSM responses collected.', hasData: false };
      const scores = responses.map(r => r.sqd0).filter(s => s > 0);
      if (scores.length === 0) return { target: 85, current: 0, reason: 'No scored responses yet.', hasData: false };
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const pct = Math.round((avg / 5) * 100);
      return {
        target: Math.max(pct + 3, 85),
        current: pct,
        reason: `Average satisfaction: ${avg.toFixed(1)}/5 (${pct}%).`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Average client satisfaction score from CSM surveys for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'gad_budget_utilization',
    defaultName: 'GAD Budget Utilization',
    defaultCategory: 'gad',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['gadPlans'],
    confidenceCheck: (d) => hasData(d, 'gadPlans') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const plans = d.gadPlans || [];
      const activities = d.gadActivities || [];
      const totalBudget = plans.reduce((s, p) => s + (p.budget || 0), 0);
      if (totalBudget === 0) return { target: 80, current: 0, reason: 'No GAD budget allocated.', hasData: false };
      const used = activities.reduce((s, a) => s + (a.actualBudgetUsed || 0), 0);
      const rate = Math.round((used / totalBudget) * 100);
      return {
        target: Math.max(rate + 5, 85),
        current: rate,
        reason: `${rate}% of GAD budget utilized.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of allocated GAD budget that has been utilized for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'activity_participation_rate',
    defaultName: 'Activity Participation Rate',
    defaultCategory: 'faculty_evaluation',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['activities', 'activityLogs'],
    confidenceCheck: (d) => hasData(d, 'activities') && hasData(d, 'activityLogs') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const acts = d.activities || [];
      const logs = d.activityLogs || [];
      if (acts.length === 0) return { target: 80, current: 0, reason: 'No activities planned.', hasData: false };
      const withAttendance = new Set(logs.map(l => l.activityId)).size;
      const rate = Math.round((withAttendance / acts.length) * 100);
      return {
        target: Math.max(rate + 10, 90),
        current: rate,
        reason: `${withAttendance} of ${acts.length} activities have attendance records.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of planned unit activities that have documented attendance for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'activity_on_time_punctuality',
    defaultName: 'Activity Attendance Punctuality',
    defaultCategory: 'faculty_evaluation',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['activityLogs'],
    confidenceCheck: (d) => hasData(d, 'activityLogs') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const logs = d.activityLogs || [];
      if (logs.length === 0) return { target: 85, current: 0, reason: 'No attendance logs recorded.', hasData: false };
      const onTime = logs.filter(l => l.status === 'ON_TIME').length;
      const rate = Math.round((onTime / logs.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${onTime} of ${logs.length} attendees were on time (${rate}%).`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of activity attendees who arrived on time for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'activity_evaluation_score',
    defaultName: 'Activity Evaluation Score',
    defaultCategory: 'faculty_evaluation',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['evaluations'],
    confidenceCheck: (d) => hasData(d, 'evaluations') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const evals = d.evaluations || [];
      if (evals.length === 0) return { target: 85, current: 0, reason: 'No evaluations submitted.', hasData: false };
      const ratings = evals.map(e => e.ratingOverall || 0).filter(r => r > 0);
      if (ratings.length === 0) return { target: 85, current: 0, reason: 'Evaluations found but no overall ratings.', hasData: false };
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const pct = Math.round((avg / 5) * 100);
      return {
        target: Math.max(pct + 3, 85),
        current: pct,
        reason: `Average overall rating: ${avg.toFixed(1)}/5 (${pct}%).`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Average participant evaluation score across all unit activities for AY ${d.selectedYear}.`,
  },
  {
    dataSource: 'activity_completion_rate',
    defaultName: 'Activity Completion Rate',
    defaultCategory: 'faculty_evaluation',
    defaultUnit: '%',
    defaultWeight: 1,
    requiredInventory: ['activities'],
    confidenceCheck: (d) => hasData(d, 'activities') ? 'high' : 'medium',
    estimateTarget: (d) => {
      const acts = d.activities || [];
      if (acts.length === 0) return { target: 85, current: 0, reason: 'No activities planned.', hasData: false };
      const now = new Date();
      const completed = acts.filter(a => {
        if (a.status === 'COMPLETED' || a.status === 'CANCELLED') return true;
        if (!a.endDateTime) return false;
        const end = 'toDate' in a.endDateTime ? a.endDateTime.toDate() : new Date(a.endDateTime);
        return end < now;
      }).length;
      const rate = Math.round((completed / acts.length) * 100);
      return {
        target: Math.max(rate + 5, 90),
        current: rate,
        reason: `${completed} of ${acts.length} activities completed.`,
        hasData: true,
      };
    },
    generateDescription: (d) =>
      `Percentage of planned unit activities that have been completed for AY ${d.selectedYear}.`,
  },
];

export function scanForKpiSuggestions(data: DataInventory): KpiSuggestion[] {
  const existingDataSources = new Set(data.existingDefinitions?.map(d => d.dataSource) || []);
  const suggestions: KpiSuggestion[] = [];

  for (const tpl of TEMPLATES) {
    if (existingDataSources.has(tpl.dataSource)) continue;

    const { target, current, reason, hasData } = tpl.estimateTarget(data);
    const confidence = tpl.confidenceCheck(data);

    const suggestion: KpiSuggestion = {
      id: `suggestion_${tpl.dataSource}`,
      dataSource: tpl.dataSource,
      name: tpl.defaultName,
      description: tpl.generateDescription(data),
      category: tpl.defaultCategory,
      unit: tpl.defaultUnit,
      defaultTarget: target,
      thresholds: { ...DEFAULT_KPI_THRESHOLDS, good: target * 0.9, satisfactory: target * 0.7, poor: target * 0.5 },
      weight: tpl.defaultWeight,
      confidence,
      reason,
      currentEstimate: current,
      hasData,
    };

    suggestions.push(suggestion);
  }

  return suggestions;
}

export type OkrSuggestion = {
  id: string;
  title: string;
  description: string;
  entityType: 'institution' | 'campus' | 'unit' | 'individual';
  quarter: number;
  confidence: SuggestionConfidence;
  reason: string;
  keyResults: {
    title: string;
    type: 'metric' | 'binary' | 'milestone';
    startingValue: number;
    targetValue: number;
    unit: string;
  }[];
};

export function generateOkrSuggestions(data: DataInventory): OkrSuggestion[] {
  const suggestions: OkrSuggestion[] = [];
  const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

  const subs = data.submissions || [];
  const risks = data.risks || [];
  const cars = data.cars || [];
  const activities = data.activities || [];
  const logs = data.activityLogs || [];

  if (subs.length > 0) {
    const approved = subs.filter(s => s.statusId === 'approved').length;
    const approvalRate = Math.round((approved / subs.length) * 100);
    if (approvalRate < 90) {
      suggestions.push({
        id: 'okr_suggest_approval',
        title: `Improve Submission Approval Rate to 95%`,
        description: `Current approval rate is ${approvalRate}%. Improve quality of submissions to meet institutional standards.`,
        entityType: 'unit',
        quarter: currentQuarter,
        confidence: 'high',
        reason: `Only ${approved} of ${subs.length} submissions are approved (${approvalRate}%).`,
        keyResults: [
          { title: `Increase approval rate from ${approvalRate}% to 95%`, type: 'metric', startingValue: approvalRate, targetValue: 95, unit: '%' },
          { title: 'Implement pre-submission quality review process', type: 'milestone', startingValue: 0, targetValue: 1, unit: '' },
          { title: 'Reduce rejected submissions by 50%', type: 'metric', startingValue: subs.filter(s => s.statusId === 'rejected').length, targetValue: Math.max(0, Math.round(subs.filter(s => s.statusId === 'rejected').length / 2)), unit: '' },
        ],
      });
    }
  }

  if (risks.length > 0) {
    const closed = risks.filter(r => r.status === 'Closed').length;
    const closureRate = Math.round((closed / risks.length) * 100);
    if (closureRate < 80) {
      suggestions.push({
        id: 'okr_suggest_risk',
        title: `Improve Risk Closure Rate to 85%`,
        description: `Currently ${closureRate}% of risks are closed. Prioritize risk treatment and monitoring.`,
        entityType: 'unit',
        quarter: currentQuarter,
        confidence: 'high',
        reason: `Only ${closed} of ${risks.length} risks closed (${closureRate}%).`,
        keyResults: [
          { title: `Increase risk closure rate from ${closureRate}% to 85%`, type: 'metric', startingValue: closureRate, targetValue: 85, unit: '%' },
          { title: 'Conduct risk treatment review for all open risks', type: 'milestone', startingValue: 0, targetValue: 1, unit: '' },
        ],
      });
    }
  }

  if (cars.length > 0) {
    const closedCars = cars.filter(c => c.status === 'Closed').length;
    const carRate = Math.round((closedCars / cars.length) * 100);
    if (carRate < 80) {
      suggestions.push({
        id: 'okr_suggest_car',
        title: `Accelerate CAR Closure to 90%`,
        description: `CAR closure rate is ${carRate}%. Improve response time to Corrective Action Requests.`,
        entityType: 'unit',
        quarter: currentQuarter,
        confidence: 'high',
        reason: `${closedCars} of ${cars.length} CARs closed (${carRate}%).`,
        keyResults: [
          { title: `Increase CAR closure rate from ${carRate}% to 90%`, type: 'metric', startingValue: carRate, targetValue: 90, unit: '%' },
          { title: 'Reduce average CAR resolution time', type: 'metric', startingValue: 30, targetValue: 15, unit: 'days' },
        ],
      });
    }
  }

  if (activities.length > 0 && logs.length > 0) {
    const totalAttendance = logs.length;
    const onTime = logs.filter(l => l.status === 'ON_TIME').length;
    const punctualityRate = Math.round((onTime / totalAttendance) * 100);
    if (punctualityRate < 80) {
      suggestions.push({
        id: 'okr_suggest_attendance',
        title: `Improve Activity Attendance Punctuality to 90%`,
        description: `Currently ${punctualityRate}% of attendees arrive on time. Improve punctuality culture.`,
        entityType: 'unit',
        quarter: currentQuarter,
        confidence: 'medium',
        reason: `${onTime} of ${totalAttendance} attendance logs are on time (${punctualityRate}%).`,
        keyResults: [
          { title: `Increase on-time attendance from ${punctualityRate}% to 90%`, type: 'metric', startingValue: punctualityRate, targetValue: 90, unit: '%' },
          { title: 'Send pre-activity reminders 24hrs before each session', type: 'binary', startingValue: 0, targetValue: 1, unit: '' },
        ],
      });
    }
    const withAttendance = new Set(logs.map(l => l.activityId)).size;
    const participationRate = Math.round((withAttendance / activities.length) * 100);
    if (participationRate < 80) {
      suggestions.push({
        id: 'okr_suggest_participation',
        title: `Increase Activity Participation Rate to 95%`,
        description: `Currently ${participationRate}% of activities have attendance. Encourage broader engagement.`,
        entityType: 'unit',
        quarter: currentQuarter,
        confidence: 'medium',
        reason: `${withAttendance} of ${activities.length} activities have documented attendance.`,
        keyResults: [
          { title: `Increase participation from ${participationRate}% to 95%`, type: 'metric', startingValue: participationRate, targetValue: 95, unit: '%' },
          { title: 'Promote activities through official communication channels', type: 'binary', startingValue: 0, targetValue: 1, unit: '' },
        ],
      });
    }
  }

  const evalsData = data.evaluations || [];
  if (evalsData.length > 0) {
    const ratings = evalsData.map(e => e.ratingOverall || 0).filter(r => r > 0);
    if (ratings.length > 0) {
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const evalScore = Math.round((avg / 5) * 100);
      if (evalScore < 80) {
        suggestions.push({
          id: 'okr_suggest_evaluation',
          title: `Improve Activity Evaluation Score to 90%`,
          description: `Current average evaluation rating is ${avg.toFixed(1)}/5 (${evalScore}%). Enhance activity quality and delivery.`,
          entityType: 'unit',
          quarter: currentQuarter,
          confidence: 'medium',
          reason: `Average overall rating across ${ratings.length} evaluations is ${avg.toFixed(1)}/5.`,
          keyResults: [
            { title: `Increase evaluation score from ${evalScore}% to 90%`, type: 'metric', startingValue: evalScore, targetValue: 90, unit: '%' },
            { title: 'Implement post-activity feedback review process', type: 'milestone', startingValue: 0, targetValue: 1, unit: '' },
          ],
        });
      }
    }
  }

  const existingOkrCount = data.okrObjectives?.length || 0;
  if (existingOkrCount === 0 && suggestions.length === 0) {
    suggestions.push({
      id: 'okr_suggest_first',
      title: 'Establish Quality Objectives for the Year',
      description: `Set measurable objectives aligned with the EOMS framework for AY ${data.selectedYear}.`,
      entityType: 'unit',
      quarter: currentQuarter,
      confidence: 'medium',
      reason: 'No OKRs have been created yet. Start with foundational quality objectives.',
      keyResults: [
        { title: 'Define 3-5 quality objectives for the unit', type: 'milestone', startingValue: 0, targetValue: 5, unit: 'objectives' },
        { title: 'Assign owners to each objective', type: 'binary', startingValue: 0, targetValue: 1, unit: '' },
        { title: 'Schedule monthly OKR check-ins', type: 'milestone', startingValue: 0, targetValue: 12, unit: 'check-ins' },
      ],
    });
  }

  return suggestions;
}
