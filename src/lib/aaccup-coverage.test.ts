import { describe, expect, it } from 'vitest';
import type { AcademicProgram, ProgramComplianceRecord } from './types';
import { calculateAaccupCoverage } from './aaccup-coverage';

function program(id: string, isNewProgram = false, isActive = true): AcademicProgram {
  return {
    id,
    name: id,
    abbreviation: id,
    campusId: 'campus-1',
    collegeId: 'unit-1',
    level: 'Undergraduate',
    isBoardProgram: false,
    isNewProgram,
    hasSpecializations: false,
    isActive,
    createdAt: null,
  };
}

function compliance(programId: string, level: string): ProgramComplianceRecord {
  return {
    id: `${programId}-compliance`,
    programId,
    campusId: 'campus-1',
    academicYear: 2026,
    ched: { copcStatus: 'In Progress' },
    accreditationRecords: [{ id: `${programId}-accreditation`, level, nextSchedule: '' }],
  } as ProgramComplianceRecord;
}

describe('calculateAaccupCoverage', () => {
  it('excludes new programs from both the eligible denominator and accredited count', () => {
    const programs = [program('accredited'), program('new-accredited', true), program('not-accredited')];
    const records = new Map([
      ['accredited', compliance('accredited', 'Level II Accredited')],
      ['new-accredited', compliance('new-accredited', 'Level III Accredited')],
      ['not-accredited', compliance('not-accredited', 'Non Accredited')],
    ]);

    expect(calculateAaccupCoverage(programs, records)).toEqual({
      eligibleCount: 2,
      accreditedCount: 1,
      rate: 50,
    });
  });

  it('excludes inactive programs and returns zero when no programs are eligible', () => {
    expect(calculateAaccupCoverage([program('new-only', true), program('inactive', false, false)], new Map())).toEqual({
      eligibleCount: 0,
      accreditedCount: 0,
      rate: 0,
    });
  });
});
