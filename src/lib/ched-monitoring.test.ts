import { describe, expect, it } from 'vitest';
import type { AcademicProgram, BoardExamPerformance, ProgramComplianceRecord } from './types';
import {
  getChedCopcCategory,
  getChedPortfolioSnapshot,
  getChedYearSummaries,
  getLatestBoardExam,
  toArray,
} from './ched-monitoring';

function makeProgram(id: string, isActive = true): AcademicProgram {
  return {
    id,
    name: `Program ${id}`,
    abbreviation: id,
    campusId: 'campus-1',
    collegeId: 'unit-1',
    level: 'Undergraduate',
    isBoardProgram: false,
    isNewProgram: false,
    hasSpecializations: false,
    isActive,
    createdAt: null,
  };
}

function makeCompliance(
  programId: string,
  academicYear: number,
  copcStatus?: 'With COPC' | 'In Progress' | 'No COPC',
  copcLink = '',
): ProgramComplianceRecord {
  return {
    id: `${programId}-${academicYear}`,
    programId,
    campusId: 'campus-1',
    academicYear,
    ched: { copcStatus, copcLink },
  } as ProgramComplianceRecord;
}

describe('toArray', () => {
  it('returns arrays unchanged and normalizes malformed values to an empty array', () => {
    const values = [1, 2, 3];

    expect(toArray(values)).toBe(values);
    expect(toArray<number>({ unexpected: 'object' })).toEqual([]);
    expect(toArray<number>('not an array')).toEqual([]);
  });
});

describe('CHED monitoring summaries', () => {
  it('distinguishes a missing record, an unknown status, and explicit COPC statuses', () => {
    const programs = ['with', 'with-no-link', 'progress', 'without', 'unknown', 'missing'].map((id) => makeProgram(id));
    const records = [
      makeCompliance('WITH', 2026, 'With COPC', 'https://example.org/copc.pdf'),
      makeCompliance('with-no-link', 2026, 'With COPC'),
      makeCompliance('progress', 2026, 'In Progress'),
      makeCompliance('without', 2026, 'No COPC'),
      makeCompliance('unknown', 2026),
    ];

    expect(getChedCopcCategory(records[0])).toBe('With COPC');
    expect(getChedCopcCategory(records[2])).toBe('In Progress');
    expect(getChedCopcCategory(records[3])).toBe('No COPC');
    expect(getChedCopcCategory(records[4])).toBe('Status Unknown');
    expect(getChedCopcCategory(null)).toBe('No Record');

    expect(getChedPortfolioSnapshot(programs, records, 2026)).toEqual({
      total: 6,
      withCopc: 2,
      inProgress: 1,
      noCopc: 1,
      noRecord: 1,
      unknown: 1,
      withCopcEvidence: 1,
      missingCopcEvidence: 1,
      rate: 33,
    });
  });

  it('uses the full active portfolio as the year denominator and counts missing records', () => {
    const programs = [makeProgram('with'), makeProgram('without'), makeProgram('inactive', false)];
    const records = [makeCompliance('with', 2025, 'With COPC')];

    expect(getChedYearSummaries(programs, records, 2025)).toEqual([
      {
        year: 2025,
        total: 2,
        withCopc: 1,
        inProgress: 0,
        noCopc: 0,
        noRecord: 1,
        unknown: 0,
        hasRqat: 0,
        hasCmo: 0,
        copcRate: 50,
      },
    ]);
  });

  it('includes the selected year even when it has no compliance records', () => {
    expect(getChedYearSummaries([makeProgram('one')], [], 2026)).toEqual([
      {
        year: 2026,
        total: 1,
        withCopc: 0,
        inProgress: 0,
        noCopc: 0,
        noRecord: 1,
        unknown: 0,
        hasRqat: 0,
        hasCmo: 0,
        copcRate: 0,
      },
    ]);
  });
});

describe('latest board exam selection', () => {
  const exam = (examDate: string, firstTakersPassRate: number): BoardExamPerformance => ({
    examDate,
    firstTakersCount: 10,
    firstTakersPassed: 5,
    firstTakersPassRate,
    retakersCount: 0,
    retakersPassed: 0,
    retakersPassRate: 0,
    overallPassRate: firstTakersPassRate,
    nationalPassingRate: 50,
  });

  it('selects the chronologically latest exam rather than the last inserted exam', () => {
    const latest = exam('September 2025', 80);
    expect(getLatestBoardExam([latest, exam('May 2024', 40)])).toBe(latest);
  });

  it('does not guess which exam is newest when all dates are invalid', () => {
    expect(getLatestBoardExam([exam('unknown', 40)])).toBeUndefined();
  });
});
