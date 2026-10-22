import type { EnrollmentOverall, EnrollmentRecord, ProgramComplianceRecord, YearLevelEnrollment } from './types';

const ENROLLMENT_LEVEL_KEYS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const;

export const ENROLLMENT_TERM_KEYS = ['firstSemester', 'secondSemester', 'midYearTerm'] as const;

export type EnrollmentTermKey = (typeof ENROLLMENT_TERM_KEYS)[number];

export type EnrollmentTotals = EnrollmentOverall;

export type EnrollmentTermTotals = Record<EnrollmentTermKey, EnrollmentTotals>;

export const emptyEnrollmentTotals = (): EnrollmentTotals => ({ male: 0, female: 0, total: 0 });

export const addEnrollmentTotals = (a: EnrollmentTotals, b: EnrollmentTotals): EnrollmentTotals => ({
  male: a.male + b.male,
  female: a.female + b.female,
  total: a.total + b.total,
});

/**
 * Sums a semester's year-level breakdown into male, female, and total headcounts.
 * Supports both the disaggregated male/female format and legacy total-only rows.
 */
export function sumEnrollmentLevels(term?: YearLevelEnrollment | null): EnrollmentTotals {
  return ENROLLMENT_LEVEL_KEYS.reduce<EnrollmentTotals>((totals, level) => {
    const levelData = term?.[level];
    if (!levelData) return totals;

    const male = Number(levelData.male) || 0;
    const female = Number(levelData.female) || 0;
    const reportedTotal = Number(levelData.total) || 0;

    return {
      male: totals.male + male,
      female: totals.female + female,
      total: totals.total + Math.max(male + female, reportedTotal),
    };
  }, emptyEnrollmentTotals());
}

export function resolveEnrollmentOverall(
  overall: EnrollmentOverall | undefined,
  fallback: EnrollmentTotals,
): EnrollmentTotals {
  if (!overall) return fallback;

  const male = Number(overall.male ?? fallback.male) || 0;
  const female = Number(overall.female ?? fallback.female) || 0;

  return {
    male,
    female,
    total: Math.max(Number(overall.total) || 0, male + female),
  };
}

/**
 * Canonical semester totals for one enrollment record. When a record is stored
 * in "overall only" mode, the overall totals take precedence over the zeroed
 * year-level breakdown.
 */
export function getEnrollmentRecordTermTotals(
  record: EnrollmentRecord | null | undefined,
  termKey: EnrollmentTermKey,
): EnrollmentTotals {
  if (!record) return emptyEnrollmentTotals();

  const computed = sumEnrollmentLevels(record[termKey]);
  const overall = record.overall?.[termKey];

  if (record.overallOnly) {
    return resolveEnrollmentOverall(overall, computed);
  }

  return computed.total > 0 ? computed : resolveEnrollmentOverall(overall, computed);
}

export function getEnrollmentRecordsForYear(
  records: EnrollmentRecord[] | null | undefined,
  academicYear?: number | string,
): EnrollmentRecord[] {
  const all = Array.isArray(records) ? records : [];
  if (!academicYear) return all;

  const year = String(academicYear);
  return all.filter((record) => !record.academicYear || String(record.academicYear).includes(year));
}

/**
 * Canonical enrollment summary for a single compliance record.
 *
 * Rules:
 * 1. Enrollment records are preferred over the legacy `stats.enrollment` block.
 * 2. Records are filtered to the record's academic year when they carry one.
 * 3. "Overall only" records use their `overall` totals.
 * 4. A semester falls back to legacy stats only when no record totals exist.
 */
export function getComplianceEnrollmentSummary(
  record: ProgramComplianceRecord | null | undefined,
  options?: { academicYear?: number | string },
): EnrollmentTermTotals {
  const academicYear = options?.academicYear ?? record?.academicYear;
  const enrollmentRecords = getEnrollmentRecordsForYear(record?.enrollmentRecords, academicYear);
  const summary = {} as EnrollmentTermTotals;

  ENROLLMENT_TERM_KEYS.forEach((termKey) => {
    const fromRecords = enrollmentRecords.reduce(
      (totals, enrollmentRecord) =>
        addEnrollmentTotals(totals, getEnrollmentRecordTermTotals(enrollmentRecord, termKey)),
      emptyEnrollmentTotals(),
    );

    if (fromRecords.total > 0) {
      summary[termKey] = fromRecords;
      return;
    }

    const legacyTerm = record?.stats?.enrollment?.[termKey];
    const legacyTotals = sumEnrollmentLevels(legacyTerm);
    const legacyOverall = (record?.stats?.enrollment as any)?.overall?.[termKey] as EnrollmentOverall | undefined;

    summary[termKey] = legacyTotals.total > 0 ? legacyTotals : resolveEnrollmentOverall(legacyOverall, legacyTotals);
  });

  return summary;
}

export function getUniqueComplianceRecords(
  records: ProgramComplianceRecord[] | null | undefined,
  options?: { academicYear?: number | string; activeProgramIds?: Set<string> },
): ProgramComplianceRecord[] {
  const unique = new Map<string, ProgramComplianceRecord>();

  (records || []).forEach((record) => {
    const programId = String(record.programId || '')
      .toLowerCase()
      .trim();
    if (!programId) return;
    if (options?.activeProgramIds && !options.activeProgramIds.has(programId)) return;
    if (options?.academicYear && Number(record.academicYear) !== Number(options.academicYear)) return;

    unique.set(`${programId}::${record.academicYear ?? ''}`, record);
  });

  return Array.from(unique.values());
}

export function aggregateComplianceEnrollment(
  records: ProgramComplianceRecord[] | null | undefined,
  options?: { academicYear?: number | string; activeProgramIds?: Set<string> },
): EnrollmentTermTotals {
  const totals = {
    firstSemester: emptyEnrollmentTotals(),
    secondSemester: emptyEnrollmentTotals(),
    midYearTerm: emptyEnrollmentTotals(),
  } satisfies EnrollmentTermTotals;

  getUniqueComplianceRecords(records, options).forEach((record) => {
    const summary = getComplianceEnrollmentSummary(record, { academicYear: options?.academicYear });
    ENROLLMENT_TERM_KEYS.forEach((termKey) => {
      totals[termKey] = addEnrollmentTotals(totals[termKey], summary[termKey]);
    });
  });

  return totals;
}

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
