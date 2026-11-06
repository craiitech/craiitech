import { describe, expect, it } from 'vitest';
import type { Risk } from '@/lib/types';
import { analyzeRiskDecisionRecords, type RiskDecisionRecord } from './risk-decision-analysis';

function makeRecord(
  overrides: Partial<Risk> & { id: string; type?: Risk['type']; unitId?: string } = { id: 'risk-1' },
): RiskDecisionRecord {
  const { id, type = 'Risk', unitId = 'unit-1', ...riskOverrides } = overrides;
  const risk: Risk = {
    id,
    userId: 'user-1',
    unitId,
    campusId: 'campus-1',
    year: 2026,
    objective: 'Maintain learner services',
    type,
    description: 'Service disruption',
    currentControls: 'Continuity plan',
    preTreatment: { likelihood: 4, consequence: 4, magnitude: 16, rating: 'High' },
    treatmentAction: 'Activate backup process',
    responsiblePersonId: 'owner-1',
    responsiblePersonName: 'Owner One',
    targetDate: '2026-10-01',
    status: 'Open',
    createdAt: null,
    updatedAt: null,
    ...riskOverrides,
  };

  return { risk, unitName: risk.unitId, campusName: 'Main Campus' };
}

describe('analyzeRiskDecisionRecords', () => {
  it('flags active high risks, overdue actions, and missing residual assessments', () => {
    const result = analyzeRiskDecisionRecords([makeRecord()], new Date('2026-11-06T12:00:00'));

    expect(result.highPriorityRisks).toHaveLength(1);
    expect(result.overdueItems).toHaveLength(1);
    expect(result.unassessedRiskItems).toHaveLength(1);
    expect(result.actionRequired[0].reasons).toEqual(
      expect.arrayContaining([
        'High inherent risk remains active',
        'Target date has passed while the item remains open',
        'Residual assessment has not been recorded',
      ]),
    );
  });

  it('flags low-rated opportunities for decision review without classifying them as high risks', () => {
    const opportunity = makeRecord({
      id: 'opp-1',
      type: 'Opportunity',
      preTreatment: { likelihood: 1, consequence: 3, magnitude: 3, rating: 'Low' },
      status: 'Open',
      treatmentAction: '',
    });

    const result = analyzeRiskDecisionRecords([opportunity], new Date('2026-11-06T12:00:00'));

    expect(result.lowRatedOpportunities).toHaveLength(1);
    expect(result.highPriorityRisks).toHaveLength(0);
    expect(result.actionRequired[0].reasons).toContain('Low-rated opportunity is flagged for priority decision review');
  });

  it('flags high residual risk for explicit treatment or acceptance even when marked closed', () => {
    const closedRisk = makeRecord({
      id: 'closed-high-residual',
      status: 'Closed',
      postTreatment: {
        likelihood: 3,
        consequence: 4,
        magnitude: 12,
        rating: 'High',
        evidence: 'Implementation evidence uploaded',
        dateImplemented: '2026-10-01',
      },
    });

    const result = analyzeRiskDecisionRecords([closedRisk], new Date('2026-11-06T12:00:00'));

    expect(result.highResidualRisks).toHaveLength(1);
    expect(result.actionRequired[0].reasons).toContain(
      'Residual risk remains High/Critical; management decision on further treatment or acceptance is needed',
    );
  });

  it('flags an active non-low opportunity without an outcome assessment', () => {
    const opportunity = makeRecord({
      id: 'unassessed-opportunity',
      type: 'Opportunity',
      preTreatment: { likelihood: 4, consequence: 4, magnitude: 16, rating: 'High' },
      postTreatment: undefined,
    });

    const result = analyzeRiskDecisionRecords([opportunity], new Date('2026-11-06T12:00:00'));

    expect(result.unassessedOpportunityItems).toHaveLength(1);
    expect(result.actionRequired[0].reasons).toContain(
      'Opportunity outcome or realization assessment has not been recorded',
    );
  });

  it('groups exact normalized matches and recurring objectives without requiring identical wording', () => {
    const result = analyzeRiskDecisionRecords([
      makeRecord({ id: 'one', objective: 'Maintain learner services', description: 'Service disruption!' }),
      makeRecord({ id: 'two', objective: 'MAINTAIN learner services', description: 'service   disruption' }),
      makeRecord({ id: 'three', objective: 'Maintain learner services', description: 'Delayed service recovery' }),
    ]);

    expect(result.potentialDuplicateGroups).toHaveLength(1);
    expect(result.potentialDuplicateGroups[0].records).toHaveLength(2);
    expect(result.recurringObjectiveGroups).toHaveLength(1);
    expect(result.recurringObjectiveGroups[0].records).toHaveLength(3);
  });

  it('does not call empty objectives or descriptions duplicates', () => {
    const result = analyzeRiskDecisionRecords([
      makeRecord({ id: 'one', objective: '', description: '' }),
      makeRecord({ id: 'two', objective: '', description: '' }),
    ]);

    expect(result.potentialDuplicateGroups).toHaveLength(0);
    expect(result.recurringObjectiveGroups).toHaveLength(0);
  });

  it('does not group a risk and an opportunity as duplicates', () => {
    const result = analyzeRiskDecisionRecords([
      makeRecord({ id: 'risk-1', type: 'Risk' }),
      makeRecord({
        id: 'opportunity-1',
        type: 'Opportunity',
        preTreatment: { likelihood: 4, consequence: 4, magnitude: 16, rating: 'High' },
      }),
    ]);

    expect(result.potentialDuplicateGroups).toHaveLength(0);
    expect(result.recurringObjectiveGroups).toHaveLength(0);
  });
});
