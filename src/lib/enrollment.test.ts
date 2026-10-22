import { describe, expect, it } from 'vitest';
import { sumEnrollmentTerm, withEnrollmentOveralls } from './enrollment';
import type { EnrollmentRecord, YearLevelEnrollment } from './types';

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
