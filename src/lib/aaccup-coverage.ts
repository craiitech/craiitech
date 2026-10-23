import type { AcademicProgram, ProgramComplianceRecord } from './types';

export type AaccupCoverage = {
  eligibleCount: number;
  accreditedCount: number;
  rate: number;
};

export function isAaccupAccredited(
  program: Pick<AcademicProgram, 'isNewProgram' | 'isActive'>,
  compliance?: Pick<ProgramComplianceRecord, 'accreditationRecords'>,
): boolean {
  if (program.isActive === false || program.isNewProgram) return false;

  const records = compliance?.accreditationRecords || [];
  const current = records.find((record) => record.lifecycleStatus === 'Current') || records[records.length - 1];
  const level = current?.level.trim().toLowerCase() || '';

  if (/\b(candidate|psv|awaiting result|non[\s-]*accredited)\b/.test(level)) return false;
  return /\blevel\s+(?:iv|iii|ii|i)\b/.test(level);
}

export function calculateAaccupCoverage(
  programs: AcademicProgram[],
  complianceByProgram: Map<string, ProgramComplianceRecord>,
): AaccupCoverage {
  const eligiblePrograms = programs.filter((program) => program.isActive !== false && !program.isNewProgram);
  const accreditedCount = eligiblePrograms.filter((program) =>
    isAaccupAccredited(program, complianceByProgram.get(program.id)),
  ).length;

  return {
    eligibleCount: eligiblePrograms.length,
    accreditedCount,
    rate: eligiblePrograms.length > 0 ? Math.round((accreditedCount / eligiblePrograms.length) * 100) : 0,
  };
}
