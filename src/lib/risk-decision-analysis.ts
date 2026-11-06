import type { Risk } from '@/lib/types';
import { parseDateSafe } from '@/lib/utils';

export interface RiskDecisionRecord {
  risk: Risk;
  unitName: string;
  campusName: string;
}

export interface RiskDecisionGroup {
  key: string;
  records: RiskDecisionRecord[];
}

export interface RiskDecisionAction {
  record: RiskDecisionRecord;
  reasons: string[];
  priority: number;
}

export interface RiskDecisionAnalysis {
  risks: RiskDecisionRecord[];
  opportunities: RiskDecisionRecord[];
  highPriorityRisks: RiskDecisionRecord[];
  highResidualRisks: RiskDecisionRecord[];
  lowRatedOpportunities: RiskDecisionRecord[];
  overdueItems: RiskDecisionRecord[];
  unassessedRiskItems: RiskDecisionRecord[];
  unassessedOpportunityItems: RiskDecisionRecord[];
  missingTreatmentItems: RiskDecisionRecord[];
  potentialDuplicateGroups: RiskDecisionGroup[];
  recurringObjectiveGroups: RiskDecisionGroup[];
  actionRequired: RiskDecisionAction[];
}

function normalizedRating(risk: Risk) {
  return risk.preTreatment?.rating?.trim().toLowerCase() || '';
}

function normalizedText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function groupBy<T>(items: T[], keyFor: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFor(item);
    if (!key) continue;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  return groups;
}

function isOverdue(record: RiskDecisionRecord, today: Date) {
  const { risk } = record;
  if (risk.status === 'Closed' || !risk.targetDate) return false;
  const targetDate = parseDateSafe(risk.targetDate);
  if (!targetDate) return false;

  return isDateBeforeToday(targetDate, today);
}

function isDateBeforeToday(date: Date, today: Date) {
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return targetDay < todayStart;
}

function isReviewOverdue(record: RiskDecisionRecord, today: Date) {
  if (record.risk.status === 'Closed' || !record.risk.nextReviewDue) return false;
  const reviewDate = parseDateSafe(record.risk.nextReviewDue);
  return reviewDate ? isDateBeforeToday(reviewDate, today) : false;
}

function actionFor(record: RiskDecisionRecord, today: Date): RiskDecisionAction | null {
  const { risk } = record;
  const rating = normalizedRating(risk);
  const reasons: string[] = [];

  if (risk.type === 'Risk' && (rating === 'critical' || rating === 'high') && risk.status !== 'Closed') {
    reasons.push(`${risk.preTreatment.rating} inherent risk remains active`);
  }

  if (isOverdue(record, today)) reasons.push('Target date has passed while the item remains open');
  if (isReviewOverdue(record, today)) reasons.push('Scheduled review date has passed');

  if (rating !== 'low' && !risk.treatmentAction?.trim()) {
    reasons.push('Treatment action is missing');
  }

  if (rating !== 'low' && !risk.responsiblePersonName?.trim() && !risk.responsiblePersonId?.trim()) {
    reasons.push('Accountable owner is missing');
  }

  if (rating !== 'low' && !risk.targetDate) reasons.push('Target date is missing');

  if (risk.type === 'Risk' && rating !== 'low' && !risk.postTreatment && risk.status !== 'Closed') {
    reasons.push('Residual assessment has not been recorded');
  }

  if (risk.type === 'Risk' && rating !== 'low' && risk.status === 'Closed' && !risk.postTreatment?.evidence?.trim()) {
    reasons.push('Closed risk has no recorded post-treatment evidence');
  }

  if (risk.type === 'Opportunity' && rating !== 'low' && !risk.postTreatment && risk.status !== 'Closed') {
    reasons.push('Opportunity outcome or realization assessment has not been recorded');
  }

  if (risk.status === 'Closed' && rating !== 'low' && !risk.monitoringScore?.trim()) {
    reasons.push('Closed item has no recorded effectiveness or outcome measure');
  }

  if (risk.type === 'Risk' && ['critical', 'high'].includes(risk.postTreatment?.rating?.trim().toLowerCase() || '')) {
    reasons.push(
      'Residual risk remains High/Critical; management decision on further treatment or acceptance is needed',
    );
  }

  if (risk.type === 'Risk' && ['Incorrect', 'Not Updated'].includes(risk.verification?.status || '')) {
    reasons.push('Verification did not confirm the record as correct or updated');
  }

  if (risk.type === 'Opportunity' && rating === 'low') {
    reasons.push('Low-rated opportunity is flagged for priority decision review');
  }

  if (reasons.length === 0) return null;

  const priority =
    (risk.type === 'Risk' && (rating === 'critical' || rating === 'high') ? 100 : 0) +
    (risk.type === 'Risk' && ['critical', 'high'].includes(risk.postTreatment?.rating?.trim().toLowerCase() || '')
      ? 80
      : 0) +
    (isOverdue(record, today) ? 50 : 0) +
    (isReviewOverdue(record, today) ? 40 : 0) +
    (risk.type === 'Opportunity' && rating === 'low' ? 25 : 0) +
    reasons.length;

  return { record, reasons, priority };
}

export function analyzeRiskDecisionRecords(records: RiskDecisionRecord[], today = new Date()): RiskDecisionAnalysis {
  const risks = records.filter(({ risk }) => risk.type === 'Risk');
  const opportunities = records.filter(({ risk }) => risk.type === 'Opportunity');

  const exactMatches = groupBy(records, ({ risk }) => {
    const objective = normalizedText(risk.objective || '');
    const description = normalizedText(risk.description || '');
    return objective && description ? `${risk.type}::${objective}::${description}` : '';
  });

  const objectiveGroups = groupBy(records, ({ risk }) => {
    const objective = normalizedText(risk.objective || '');
    return objective ? `${risk.type}::${objective}` : '';
  });

  const potentialDuplicateGroups = Array.from(exactMatches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([key, matches]) => ({ key, records: matches }));

  const recurringObjectiveGroups = Array.from(objectiveGroups.entries())
    .map(([key, matches]) => ({
      key,
      records: matches,
      descriptions: new Set(matches.map(({ risk }) => normalizedText(risk.description || '')).filter(Boolean)),
    }))
    .filter(({ records: matches, descriptions }) => matches.length > 1 && descriptions.size > 1)
    .map(({ key, records: matches }) => ({ key, records: matches }));

  const highPriorityRisks = risks.filter(({ risk }) => ['critical', 'high'].includes(normalizedRating(risk)));
  const highResidualRisks = risks.filter(({ risk }) =>
    ['critical', 'high'].includes(risk.postTreatment?.rating?.trim().toLowerCase() || ''),
  );
  const lowRatedOpportunities = opportunities.filter(({ risk }) => normalizedRating(risk) === 'low');
  const overdueItems = records.filter((record) => isOverdue(record, today));
  const unassessedRiskItems = risks.filter(
    ({ risk }) => normalizedRating(risk) !== 'low' && !risk.postTreatment && risk.status !== 'Closed',
  );
  const unassessedOpportunityItems = opportunities.filter(
    ({ risk }) => normalizedRating(risk) !== 'low' && !risk.postTreatment && risk.status !== 'Closed',
  );
  const missingTreatmentItems = records.filter(
    ({ risk }) => normalizedRating(risk) !== 'low' && !risk.treatmentAction?.trim(),
  );
  const actionRequired = records
    .map((record) => actionFor(record, today))
    .filter((action): action is RiskDecisionAction => action !== null)
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        (b.record.risk.preTreatment?.magnitude || 0) - (a.record.risk.preTreatment?.magnitude || 0),
    );

  return {
    risks,
    opportunities,
    highPriorityRisks,
    highResidualRisks,
    lowRatedOpportunities,
    overdueItems,
    unassessedRiskItems,
    unassessedOpportunityItems,
    missingTreatmentItems,
    potentialDuplicateGroups,
    recurringObjectiveGroups,
    actionRequired,
  };
}
