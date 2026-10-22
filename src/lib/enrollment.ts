import type { EnrollmentOverall, EnrollmentRecord, YearLevelEnrollment } from './types';

const ENROLLMENT_LEVEL_KEYS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const;

export function sumEnrollmentTerm(term?: YearLevelEnrollment | null): EnrollmentOverall {
  const male = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + Number(term?.[level]?.male || 0), 0);
  const female = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + Number(term?.[level]?.female || 0), 0);
  return { male, female, total: male + female };
}

function normalizeManualOverall(overall: EnrollmentOverall | undefined, term?: YearLevelEnrollment | null) {
  const computed = sumEnrollmentTerm(term);
  const male = Number(overall?.male ?? computed.male);
  const female = Number(overall?.female ?? computed.female);
  return {
    male,
    female,
    total: male + female,
  };
}

export function withEnrollmentOveralls(record: EnrollmentRecord): EnrollmentRecord {
  if (record.overallOnly) {
    return {
      ...record,
      overall: {
        firstSemester: normalizeManualOverall(record.overall?.firstSemester, record.firstSemester),
        secondSemester: normalizeManualOverall(record.overall?.secondSemester, record.secondSemester),
        midYearTerm: normalizeManualOverall(record.overall?.midYearTerm, record.midYearTerm),
      },
    };
  }

  return {
    ...record,
    overall: {
      firstSemester: sumEnrollmentTerm(record.firstSemester),
      secondSemester: sumEnrollmentTerm(record.secondSemester),
      midYearTerm: sumEnrollmentTerm(record.midYearTerm),
    },
  };
}
