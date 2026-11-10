import { describe, expect, it } from 'vitest';
import { buildUnitEqaOfiWarnings, buildUnitIqaOfiWarnings } from './unit-ofi-warnings-data';
import type { AuditFinding, AuditPlan, AuditSchedule, EqaOfiMonitoring, IqaOfiActionUpdate } from '@/lib/types';

const schedules: AuditSchedule[] = [
  {
    id: 'schedule-unit-1',
    auditPlanId: 'plan-1',
    campusId: 'campus-1',
    targetId: 'unit-1',
    targetType: 'Unit',
    targetName: 'Unit One',
    procedureDescription: 'Procedure',
    scheduledDate: '2025-03-01',
    endScheduledDate: '2025-03-01',
    isoClausesToAudit: [],
    status: 'Completed',
    auditorId: null,
    auditorName: null,
  },
  {
    id: 'schedule-unit-2',
    auditPlanId: 'plan-1',
    campusId: 'campus-1',
    targetId: 'unit-2',
    targetType: 'Unit',
    targetName: 'Unit Two',
    procedureDescription: 'Procedure',
    scheduledDate: '2025-03-01',
    endScheduledDate: '2025-03-01',
    isoClausesToAudit: [],
    status: 'Completed',
    auditorId: null,
    auditorName: null,
  },
];

const plans: AuditPlan[] = [
  {
    id: 'plan-1',
    auditNumber: 'IQA-2025',
    auditType: 'Regular Audit',
    title: 'Annual IQA',
    year: 2025,
    campusId: 'campus-1',
    auditeeType: [],
    scope: 'University',
    leadAuditorId: 'auditor',
    leadAuditorName: 'Auditor',
    openingMeetingDate: null,
    closingMeetingDate: null,
    referenceDocument: 'ISO 21001',
    createdAt: null,
  },
];

const findings: AuditFinding[] = [
  {
    id: 'ofi-no-action',
    auditScheduleId: 'schedule-unit-1',
    isoClause: '7.1',
    type: 'Observation for Improvement',
    description: 'Improve resource tracking',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
  },
  {
    id: 'ofi-returned',
    auditScheduleId: 'schedule-unit-1',
    isoClause: '7.2',
    type: 'Observation for Improvement',
    description: 'Improve training records',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
  },
  {
    id: 'ofi-in-verification',
    auditScheduleId: 'schedule-unit-1',
    isoClause: '7.3',
    type: 'Observation for Improvement',
    description: 'Improve equipment logs',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
  },
  {
    id: 'nc-unit-1',
    auditScheduleId: 'schedule-unit-1',
    isoClause: '8.1',
    type: 'Non-Conformance',
    description: 'A non-conformance',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
  },
  {
    id: 'ofi-implemented',
    auditScheduleId: 'schedule-unit-1',
    isoClause: '7.5',
    type: 'Observation for Improvement',
    description: 'Already implemented',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
    verification: {
      status: 'Implemented',
      verifiedBy: 'auditor',
      verifiedAt: null,
    },
  },
  {
    id: 'ofi-unit-2',
    auditScheduleId: 'schedule-unit-2',
    isoClause: '7.4',
    type: 'Observation for Improvement',
    description: 'Improve another unit',
    evidence: '',
    createdAt: null,
    authorId: 'auditor',
  },
];

const actionUpdates: IqaOfiActionUpdate[] = [
  {
    id: 'ofi-returned',
    findingId: 'ofi-returned',
    campusId: 'campus-1',
    campusName: 'Campus One',
    unitId: 'unit-1',
    unitName: 'Unit One',
    actionTaken: 'Draft action',
    movLinks: [],
    status: 'Returned for Revision',
    verifications: [],
    createdAt: null,
    updatedAt: null,
  },
  {
    id: 'ofi-in-verification',
    findingId: 'ofi-in-verification',
    campusId: 'campus-1',
    campusName: 'Campus One',
    unitId: 'unit-1',
    unitName: 'Unit One',
    actionTaken: 'Action submitted',
    movLinks: [],
    status: 'For QAO Verification',
    verifications: [],
    createdAt: null,
    updatedAt: null,
  },
];

const eqaOfis: EqaOfiMonitoring[] = [
  {
    id: 'eqa-ofi-1',
    auditDate: '2024-08-15',
    certifyingBody: 'Certifying Body',
    ofiStatement: 'External improvement one',
    targetUnits: [
      {
        id: 'target-1',
        unitId: 'unit-1',
        unitName: 'Unit One',
        campusId: 'campus-1',
        status: 'Pending Action',
      },
      {
        id: 'target-2',
        unitId: 'unit-1',
        unitName: 'Unit One',
        campusId: 'campus-1',
        status: 'Completed',
      },
      {
        id: 'target-3',
        unitId: 'unit-2',
        unitName: 'Unit Two',
        campusId: 'campus-1',
        status: 'In Progress',
      },
    ],
    createdAt: null,
    updatedAt: null,
  },
];

describe('buildUnitIqaOfiWarnings', () => {
  it('returns only internal OFIs for the unit that still need action or revision', () => {
    const warnings = buildUnitIqaOfiWarnings({
      unitId: 'unit-1',
      schedules,
      findings,
      plans,
      actionUpdates,
    });

    expect(warnings.map((warning) => warning.id)).toEqual(['ofi-no-action', 'ofi-returned']);
  });
});

describe('buildUnitEqaOfiWarnings', () => {
  it('returns only external OFI targets for the unit that are still pending action', () => {
    const warnings = buildUnitEqaOfiWarnings({ unitId: 'unit-1', eqaOfis });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      id: 'eqa-ofi-1-target-1',
      source: 'EQA',
      statement: 'External improvement one',
      status: 'Pending Action',
      year: 2024,
    });
  });
});
