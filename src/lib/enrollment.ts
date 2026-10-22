import type { EnrollmentOverall, EnrollmentRecord, YearLevelEnrollment } from './types';

const ENROLLMENT_LEVEL_KEYS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const;

export function sumEnrollmentTerm(term?: YearLevelEnrollment | null): EnrollmentOverall {
  const male = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + Number(term?.[level]?.male || 0), 0);
  const female = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + Number(term?.[level]?.female || 0), 0);
  return { male, female, total: male + female };
}

export function withEnrollmentOveralls(record: EnrollmentRecord): EnrollmentRecord {
  return {
    ...record,
    overall: {
      firstSemester: sumEnrollmentTerm(record.firstSemester),
      secondSemester: sumEnrollmentTerm(record.secondSemester),
      midYearTerm: sumEnrollmentTerm(record.midYearTerm),
    },
  };
}
