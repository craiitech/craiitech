import type {
  EnrollmentOverall,
  EnrollmentRecord,
  GADSector,
  ProgramComplianceRecord,
  YearLevelEnrollment,
} from './types';

const ENROLLMENT_LEVEL_KEYS = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear', 'fifthYear'] as const;

export const ENROLLMENT_TERM_KEYS = ['firstSemester', 'secondSemester', 'midYearTerm'] as const;

export type EnrollmentTermKey = (typeof ENROLLMENT_TERM_KEYS)[number];

export type EnrollmentTotals = EnrollmentOverall;

export type EnrollmentTermTotals = Record<EnrollmentTermKey, EnrollmentTotals>;

export type EnrollmentSectorMap = Partial<Record<GADSector, { male: number; female: number }>>;

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
  const male = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + (Number(term?.[level]?.male) || 0), 0);
  const female = ENROLLMENT_LEVEL_KEYS.reduce((sum, level) => sum + (Number(term?.[level]?.female) || 0), 0);
  return { male, female, total: male + female };
}

/**
 * Sums GAD sector headcounts across all year levels for a given semester.
 */
export function sumEnrollmentTermSectors(term?: YearLevelEnrollment | null): EnrollmentSectorMap {
  const sectors: EnrollmentSectorMap = {};
  if (!term) return sectors;

  ENROLLMENT_LEVEL_KEYS.forEach((level) => {
    const levelSectors = term?.[level]?.sectors;
    if (!levelSectors) return;
    Object.entries(levelSectors).forEach(([sectorKey, counts]) => {
      const sec = sectorKey as GADSector;
      const m = Number(counts?.male) || 0;
      const f = Number(counts?.female) || 0;
      if (!sectors[sec]) {
        sectors[sec] = { male: 0, female: 0 };
      }
      sectors[sec]!.male += m;
      sectors[sec]!.female += f;
    });
  });

  return sectors;
}

/**
 * Resolves the canonical GAD sector breakdown for one enrollment record & semester.
 * Supports both Year-Level sector entries and Over-all sector entries (including when
 * `overallOnly` is enabled or when sectors are logged directly in the Over-all section).
 */
export function getEnrollmentRecordTermSectors(
  record: EnrollmentRecord | null | undefined,
  termKey: EnrollmentTermKey,
): EnrollmentSectorMap {
  if (!record) return {};

  const levelSectors = sumEnrollmentTermSectors(record[termKey]);
  const overallSectors = record.overall?.[termKey]?.sectors;

  if (record.overallOnly) {
    if (overallSectors && Object.keys(overallSectors).length > 0) {
      const resolved: EnrollmentSectorMap = {};
      Object.entries(overallSectors).forEach(([secKey, counts]) => {
        const sec = secKey as GADSector;
        resolved[sec] = {
          male: Number(counts?.male) || 0,
          female: Number(counts?.female) || 0,
        };
      });
      return resolved;
    }
    return levelSectors;
  }

  // When not overallOnly, merge year-level sector sums with any overall sector entries:
  // If year-level sectors for a specific sector are > 0, use the year-level sum;
  // otherwise fall back to the overall sector entry if provided.
  const merged: EnrollmentSectorMap = { ...levelSectors };
  if (overallSectors) {
    Object.entries(overallSectors).forEach(([secKey, counts]) => {
      const sec = secKey as GADSector;
      const oMale = Number(counts?.male) || 0;
      const oFemale = Number(counts?.female) || 0;
      const existing = merged[sec];
      const existingTotal = (existing?.male || 0) + (existing?.female || 0);
      if (existingTotal === 0 && oMale + oFemale > 0) {
        merged[sec] = { male: oMale, female: oFemale };
      }
    });
  }

  return merged;
}

function resolveSavedOverallSectors(
  overall: EnrollmentOverall | undefined,
  term?: YearLevelEnrollment | null,
  overallOnly?: boolean,
): EnrollmentSectorMap | undefined {
  const computed = sumEnrollmentTermSectors(term);
  const manual = overall?.sectors;

  const hasManual = manual && Object.values(manual).some((c) => (Number(c?.male) || 0) + (Number(c?.female) || 0) > 0);
  const hasComputed = Object.values(computed).some((c) => (Number(c?.male) || 0) + (Number(c?.female) || 0) > 0);

  if (!hasManual && !hasComputed && !overall?.sectors) {
    return undefined;
  }

  if (overallOnly && manual) {
    const normalized: EnrollmentSectorMap = {};
    Object.entries(manual).forEach(([secKey, counts]) => {
      const sec = secKey as GADSector;
      normalized[sec] = {
        male: Number(counts?.male) || 0,
        female: Number(counts?.female) || 0,
      };
    });
    return normalized;
  }

  // Merge computed and manual (preferring computed per sector when > 0, or manual when computed is 0)
  const merged: EnrollmentSectorMap = {};
  const allKeys = new Set<string>([...Object.keys(computed), ...Object.keys(manual || {})]);
  allKeys.forEach((secKey) => {
    const sec = secKey as GADSector;
    const cMale = Number(computed[sec]?.male) || 0;
    const cFemale = Number(computed[sec]?.female) || 0;
    const mMale = Number(manual?.[sec]?.male) || 0;
    const mFemale = Number(manual?.[sec]?.female) || 0;
    if (cMale + cFemale > 0) {
      merged[sec] = { male: cMale, female: cFemale };
    } else {
      merged[sec] = { male: mMale, female: mFemale };
    }
  });

  return merged;
}

function normalizeYearLevelTerm(term?: YearLevelEnrollment | null): YearLevelEnrollment | undefined {
  if (!term) return term ?? undefined;
  const normalized: any = { ...term };
  ENROLLMENT_LEVEL_KEYS.forEach((level) => {
    const levelData = term[level];
    if (!levelData) return;
    const male = Number(levelData.male) || 0;
    const female = Number(levelData.female) || 0;
    const total = Math.max(Number(levelData.total) || 0, male + female);
    const cleanedLevel: any = {
      ...levelData,
      male,
      female,
      total,
    };
    if (levelData.specialNeeds !== undefined) {
      cleanedLevel.specialNeeds = Number(levelData.specialNeeds) || 0;
    }
    if (levelData.sectors) {
      const cleanedSectors: EnrollmentSectorMap = {};
      Object.entries(levelData.sectors).forEach(([secKey, counts]) => {
        const sec = secKey as GADSector;
        cleanedSectors[sec] = {
          male: Number(counts?.male) || 0,
          female: Number(counts?.female) || 0,
        };
      });
      cleanedLevel.sectors = cleanedSectors;
    }
    normalized[level] = cleanedLevel;
  });
  return normalized;
}

function normalizeManualOverall(overall: EnrollmentOverall | undefined, term?: YearLevelEnrollment | null) {
  const computed = sumEnrollmentTerm(term);
  const male = Number(overall?.male ?? computed.male) || 0;
  const female = Number(overall?.female ?? computed.female) || 0;
  const sectors = resolveSavedOverallSectors(overall, term, true);
  return {
    male,
    female,
    total: male + female,
    ...(sectors ? { sectors } : {}),
  };
}

function normalizeComputedOverall(overall: EnrollmentOverall | undefined, term?: YearLevelEnrollment | null) {
  const computed = sumEnrollmentTerm(term);
  const sectors = resolveSavedOverallSectors(overall, term, false);
  return {
    ...computed,
    ...(sectors ? { sectors } : {}),
  };
}

export function withEnrollmentOveralls(record: EnrollmentRecord): EnrollmentRecord {
  const firstSemester = normalizeYearLevelTerm(record.firstSemester) ?? record.firstSemester;
  const secondSemester = normalizeYearLevelTerm(record.secondSemester) ?? record.secondSemester;
  const midYearTerm = normalizeYearLevelTerm(record.midYearTerm) ?? record.midYearTerm;

  if (record.overallOnly) {
    return {
      ...record,
      firstSemester,
      secondSemester,
      midYearTerm,
      overall: {
        firstSemester: normalizeManualOverall(record.overall?.firstSemester, firstSemester),
        secondSemester: normalizeManualOverall(record.overall?.secondSemester, secondSemester),
        midYearTerm: normalizeManualOverall(record.overall?.midYearTerm, midYearTerm),
      },
    };
  }

  return {
    ...record,
    firstSemester,
    secondSemester,
    midYearTerm,
    overall: {
      firstSemester: normalizeComputedOverall(record.overall?.firstSemester, firstSemester),
      secondSemester: normalizeComputedOverall(record.overall?.secondSemester, secondSemester),
      midYearTerm: normalizeComputedOverall(record.overall?.midYearTerm, midYearTerm),
    },
  };
}
