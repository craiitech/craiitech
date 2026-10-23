import type { AcademicProgram, BoardExamPerformance, ProgramComplianceRecord } from './types';

export type ChedCopcCategory = 'With COPC' | 'In Progress' | 'No COPC' | 'No Record' | 'Status Unknown';

export type ChedYearSummary = {
  year: number;
  total: number;
  withCopc: number;
  inProgress: number;
  noCopc: number;
  noRecord: number;
  unknown: number;
  hasRqat: number;
  hasCmo: number;
  copcRate: number;
};

export type ChedPortfolioSnapshot = {
  total: number;
  withCopc: number;
  inProgress: number;
  noCopc: number;
  noRecord: number;
  unknown: number;
  withCopcEvidence: number;
  missingCopcEvidence: number;
  rate: number;
};

export function toArray<T>(value: T[] | null | undefined): T[];
export function toArray<T>(value: unknown): T[];
export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export const normalizeProgramId = (id: string | undefined) =>
  String(id || '')
    .toLowerCase()
    .trim();

export function getChedCopcCategory(record?: ProgramComplianceRecord | null): ChedCopcCategory {
  if (!record) return 'No Record';
  const status = record.ched?.copcStatus;
  if (status === 'With COPC' || status === 'In Progress' || status === 'No COPC') return status;
  return 'Status Unknown';
}

export function hasCopcEvidence(record?: ProgramComplianceRecord | null): boolean {
  return Boolean(
    record?.ched?.copcLink?.trim() || record?.ched?.majorCopcs?.some((copc) => Boolean(copc.copcLink?.trim())),
  );
}

export function getChedPortfolioSnapshot(
  programs: AcademicProgram[],
  compliances: ProgramComplianceRecord[],
  selectedYear: number,
): ChedPortfolioSnapshot {
  const activePrograms = programs.filter((program) => program.isActive);
  const recordMap = new Map(
    compliances
      .filter((record) => Number(record.academicYear) === Number(selectedYear))
      .map((record) => [normalizeProgramId(record.programId), record]),
  );

  const snapshot: ChedPortfolioSnapshot = {
    total: activePrograms.length,
    withCopc: 0,
    inProgress: 0,
    noCopc: 0,
    noRecord: 0,
    unknown: 0,
    withCopcEvidence: 0,
    missingCopcEvidence: 0,
    rate: 0,
  };

  activePrograms.forEach((program) => {
    const record = recordMap.get(normalizeProgramId(program.id));
    const category = getChedCopcCategory(record);
    if (category === 'With COPC') {
      snapshot.withCopc++;
      if (hasCopcEvidence(record)) snapshot.withCopcEvidence++;
      else snapshot.missingCopcEvidence++;
    } else if (category === 'In Progress') {
      snapshot.inProgress++;
    } else if (category === 'No COPC') {
      snapshot.noCopc++;
    } else if (category === 'No Record') {
      snapshot.noRecord++;
    } else {
      snapshot.unknown++;
    }
  });

  snapshot.rate = snapshot.total > 0 ? Math.round((snapshot.withCopc / snapshot.total) * 100) : 0;
  return snapshot;
}

export function getChedYearSummaries(
  programs: AcademicProgram[],
  compliances: ProgramComplianceRecord[],
  selectedYear: number,
): ChedYearSummary[] {
  const activePrograms = programs.filter((program) => program.isActive);
  const programIds = new Set(activePrograms.map((program) => normalizeProgramId(program.id)));
  const years = new Set(
    compliances
      .filter(
        (record) =>
          programIds.has(normalizeProgramId(record.programId)) && Number.isFinite(Number(record.academicYear)),
      )
      .map((record) => Number(record.academicYear)),
  );
  years.add(Number(selectedYear));

  return Array.from(years)
    .map((year) => {
      const recordMap = new Map(
        compliances
          .filter(
            (record) => Number(record.academicYear) === year && programIds.has(normalizeProgramId(record.programId)),
          )
          .map((record) => [normalizeProgramId(record.programId), record]),
      );
      const summary: ChedYearSummary = {
        year,
        total: activePrograms.length,
        withCopc: 0,
        inProgress: 0,
        noCopc: 0,
        noRecord: 0,
        unknown: 0,
        hasRqat: 0,
        hasCmo: 0,
        copcRate: 0,
      };

      activePrograms.forEach((program) => {
        const record = recordMap.get(normalizeProgramId(program.id));
        const category = getChedCopcCategory(record);
        if (category === 'With COPC') summary.withCopc++;
        else if (category === 'In Progress') summary.inProgress++;
        else if (category === 'No COPC') summary.noCopc++;
        else if (category === 'No Record') summary.noRecord++;
        else summary.unknown++;

        if (record?.ched?.rqatVisits?.length) summary.hasRqat++;
        if (record?.ched?.programCmoLink) summary.hasCmo++;
      });

      summary.copcRate = summary.total > 0 ? Math.round((summary.withCopc / summary.total) * 100) : 0;
      return summary;
    })
    .sort((a, b) => b.year - a.year);
}

function parseExamDate(value: string): number | null {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function getLatestBoardExam(exams: BoardExamPerformance[]): BoardExamPerformance | undefined {
  return exams
    .map((exam) => ({ exam, timestamp: parseExamDate(exam.examDate) }))
    .filter((entry): entry is { exam: BoardExamPerformance; timestamp: number } => entry.timestamp !== null)
    .sort((a, b) => b.timestamp - a.timestamp)[0]?.exam;
}
