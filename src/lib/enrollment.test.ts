import { describe, expect, it } from 'vitest';
import {
  aggregateComplianceEnrollment,
  getComplianceEnrollmentSummary,
  getEnrollmentRecordTermSectors,
  sumEnrollmentTerm,
  withEnrollmentOveralls,
} from './enrollment';
import type { EnrollmentRecord, ProgramComplianceRecord, YearLevelEnrollment } from './types';

const level = (male: number, female: number) => ({
  male,
  female,
  total: male + female,
  specialNeeds: 0,
});

const term = (first: [number, number], second: [number, number]): YearLevelEnrollment => ({
  firstYear: level(...first),
  secondYear: level(...second),
  thirdYear: level(0, 0),
  fourthYear: level(0, 0),
});

describe('sumEnrollmentTerm', () => {
  it('sums male and female counts across year levels', () => {
    expect(sumEnrollmentTerm(term([3, 4], [5, 6]))).toEqual({ male: 8, female: 10, total: 18 });
  });

  it('returns zeroes for an empty term', () => {
    expect(sumEnrollmentTerm(undefined)).toEqual({ male: 0, female: 0, total: 0 });
  });
});

describe('withEnrollmentOveralls', () => {
  it('adds computed overall totals for every enrollment term', () => {
    const record = {
      id: 'record-1',
      majorId: 'General',
      firstSemester: term([1, 2], [3, 4]),
      secondSemester: term([5, 6], [7, 8]),
      midYearTerm: term([9, 10], [0, 0]),
    } as EnrollmentRecord;

    expect(withEnrollmentOveralls(record).overall).toEqual({
      firstSemester: { male: 4, female: 6, total: 10 },
      secondSemester: { male: 12, female: 14, total: 26 },
      midYearTerm: { male: 9, female: 10, total: 19 },
    });
  });

  it('preserves admin-entered male and female totals and recomputes overall total', () => {
    const record = {
      id: 'record-2',
      majorId: 'General',
      overallOnly: true,
      firstSemester: term([1, 2], [3, 4]),
      secondSemester: term([5, 6], [7, 8]),
      midYearTerm: term([9, 10], [0, 0]),
      overall: {
        firstSemester: { male: 100, female: 200, total: 999 },
        secondSemester: { male: 12, female: 14, total: 999 },
        midYearTerm: { male: 9, female: 10, total: 999 },
      },
    } as EnrollmentRecord;

    expect(withEnrollmentOveralls(record).overall).toEqual({
      firstSemester: { male: 100, female: 200, total: 300 },
      secondSemester: { male: 12, female: 14, total: 26 },
      midYearTerm: { male: 9, female: 10, total: 19 },
    });
  });

  it('fills missing manual overall fields from year-level totals', () => {
    const record = {
      id: 'record-3',
      majorId: 'General',
      overallOnly: true,
      firstSemester: term([1, 2], [3, 4]),
      secondSemester: term([5, 6], [7, 8]),
      midYearTerm: term([9, 10], [0, 0]),
      overall: {
        firstSemester: { male: 100, female: 200, total: 250 },
      },
    } as EnrollmentRecord;

    const overall = withEnrollmentOveralls(record).overall!;
    expect(overall.firstSemester).toEqual({ male: 100, female: 200, total: 300 });
    expect(overall.secondSemester).toEqual({ male: 12, female: 14, total: 26 });
    expect(overall.midYearTerm).toEqual({ male: 9, female: 10, total: 19 });
  });

  it('recomputes totals and ignores stored overalls when overallOnly is disabled', () => {
    const record = {
      id: 'record-4',
      majorId: 'General',
      firstSemester: term([1, 2], [3, 4]),
      secondSemester: term([5, 6], [7, 8]),
      midYearTerm: term([9, 10], [0, 0]),
      overall: {
        firstSemester: { male: 100, female: 200, total: 250 },
      },
    } as EnrollmentRecord;

    expect(withEnrollmentOveralls(record).overall?.firstSemester).toEqual({ male: 4, female: 6, total: 10 });
  });
});

const enrollmentRecord = (overrides: Partial<EnrollmentRecord>): EnrollmentRecord => ({
  id: 'enrollment-1',
  majorId: 'General',
  firstSemester: term([1, 1], [0, 0]),
  secondSemester: term([0, 0], [0, 0]),
  ...overrides,
});

const complianceRecord = (overrides: Record<string, unknown>): ProgramComplianceRecord =>
  ({
    id: 'compliance-1',
    programId: 'program-1',
    campusId: 'campus-1',
    academicYear: 2025,
    ched: { copcStatus: 'No COPC' },
    faculty: { dean: {}, programChair: {}, members: [] },
    stats: {
      enrollment: {
        firstSemester: term([0, 0], [0, 0]),
        secondSemester: term([0, 0], [0, 0]),
      },
      graduationCount: 0,
    },
    updatedAt: null,
    updatedBy: 'test',
    ...overrides,
  }) as unknown as ProgramComplianceRecord;

describe('getComplianceEnrollmentSummary', () => {
  it('prefers enrollment records over legacy stats', () => {
    const record = complianceRecord({
      stats: {
        enrollment: {
          firstSemester: term([9, 9], [9, 9]),
          secondSemester: term([0, 0], [0, 0]),
        },
        graduationCount: 0,
      },
      enrollmentRecords: [enrollmentRecord({ firstSemester: term([2, 3], [0, 0]) })],
    });

    expect(getComplianceEnrollmentSummary(record).firstSemester).toEqual({ male: 2, female: 3, total: 5 });
  });

  it('filters enrollment records by the selected academic year', () => {
    const record = complianceRecord({
      enrollmentRecords: [
        enrollmentRecord({ id: 'old', academicYear: 2024, firstSemester: term([100, 0], [0, 0]) }),
        enrollmentRecord({ id: 'current', academicYear: 2025, firstSemester: term([2, 3], [0, 0]) }),
      ],
    });

    expect(getComplianceEnrollmentSummary(record, { academicYear: 2025 }).firstSemester).toEqual({
      male: 2,
      female: 3,
      total: 5,
    });
  });

  it('uses overall totals for overall-only records', () => {
    const record = complianceRecord({
      enrollmentRecords: [
        enrollmentRecord({
          overallOnly: true,
          firstSemester: term([0, 0], [0, 0]),
          overall: {
            firstSemester: { male: 10, female: 5, total: 15 },
            secondSemester: { male: 0, female: 0, total: 0 },
          },
        }),
      ],
    });

    expect(getComplianceEnrollmentSummary(record).firstSemester).toEqual({ male: 10, female: 5, total: 15 });
  });

  it('supports legacy per-level total-only rows', () => {
    const record = complianceRecord({
      stats: {
        enrollment: {
          firstSemester: { firstYear: { total: 12 } },
          secondSemester: {},
        },
        graduationCount: 0,
      },
    });

    expect(getComplianceEnrollmentSummary(record).firstSemester).toEqual({ male: 0, female: 0, total: 12 });
  });
});

describe('aggregateComplianceEnrollment', () => {
  it('aggregates unique active programs for the selected year', () => {
    const records = [
      complianceRecord({
        id: 'compliance-1',
        programId: 'program-1',
        enrollmentRecords: [enrollmentRecord({ firstSemester: term([2, 2], [0, 0]) })],
      }),
      complianceRecord({
        id: 'compliance-2',
        programId: 'program-2',
        enrollmentRecords: [enrollmentRecord({ firstSemester: term([3, 4], [0, 0]) })],
      }),
    ];

    const totals = aggregateComplianceEnrollment(records, {
      academicYear: 2025,
      activeProgramIds: new Set(['program-1']),
    });

    expect(totals.firstSemester).toEqual({ male: 2, female: 2, total: 4 });
    expect(totals.secondSemester).toEqual({ male: 0, female: 0, total: 0 });
  });
});

describe('getEnrollmentRecordTermSectors', () => {
  it('resolves overall sectors when overallOnly is enabled', () => {
    const rec = enrollmentRecord({
      overallOnly: true,
      overall: {
        firstSemester: {
          male: 20,
          female: 30,
          total: 50,
          sectors: {
            'Solo Parent': { male: 2, female: 5 },
            PWD: { male: 1, female: 3 },
          },
        },
        secondSemester: { male: 0, female: 0, total: 0 },
      },
    });

    expect(getEnrollmentRecordTermSectors(rec, 'firstSemester')).toEqual({
      'Solo Parent': { male: 2, female: 5 },
      PWD: { male: 1, female: 3 },
    });
  });

  it('merges year-level sectors and falls back to overall sectors when year-level sectors are zero', () => {
    const rec = enrollmentRecord({
      overallOnly: false,
      firstSemester: {
        firstYear: {
          male: 10,
          female: 10,
          total: 20,
          specialNeeds: 0,
          sectors: { PWD: { male: 2, female: 1 } },
        },
        secondYear: level(0, 0),
        thirdYear: level(0, 0),
        fourthYear: level(0, 0),
      },
      overall: {
        firstSemester: {
          male: 10,
          female: 10,
          total: 20,
          sectors: {
            'Indigenous People': { male: 4, female: 6 },
          },
        },
        secondSemester: { male: 0, female: 0, total: 0 },
      },
    });

    expect(getEnrollmentRecordTermSectors(rec, 'firstSemester')).toEqual({
      PWD: { male: 2, female: 1 },
      'Indigenous People': { male: 4, female: 6 },
    });
  });

  it('normalizes partial or undefined sector counts to finite zeroes when saving via withEnrollmentOveralls', () => {
    const rawRec = enrollmentRecord({
      overallOnly: false,
      firstSemester: {
        firstYear: {
          male: 12,
          female: 15,
          total: 27,
          specialNeeds: 0,
          sectors: {
            PWD: { male: 3, female: undefined as any },
          },
        },
        secondYear: level(0, 0),
        thirdYear: level(0, 0),
        fourthYear: level(0, 0),
      },
      overall: {
        firstSemester: {
          male: 12,
          female: 15,
          total: 27,
          sectors: {
            'Solo Parent': { male: undefined as any, female: 4 },
            Employee: { male: undefined as any, female: undefined as any },
          },
        },
        secondSemester: { male: 0, female: 0, total: 0 },
      },
    });

    const normalized = withEnrollmentOveralls(rawRec);

    expect(normalized.firstSemester.firstYear.sectors?.PWD).toEqual({ male: 3, female: 0 });
    expect(normalized.overall?.firstSemester?.sectors?.PWD).toEqual({ male: 3, female: 0 });
    expect(normalized.overall?.firstSemester?.sectors?.['Solo Parent']).toEqual({ male: 0, female: 4 });
    expect(normalized.overall?.firstSemester?.sectors?.Employee).toEqual({ male: 0, female: 0 });
  });
});
