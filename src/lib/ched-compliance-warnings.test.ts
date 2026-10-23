import { describe, expect, it } from 'vitest';
import type { AcademicProgram, ProgramComplianceRecord } from './types';
import { getProgramChedWarnings, getUnitProgramsChedWarnings } from './ched-compliance-warnings';

const program: AcademicProgram = {
  id: 'program-1',
  name: 'Test Program',
  abbreviation: 'TP',
  campusId: 'campus-1',
  collegeId: 'unit-1',
  level: 'Undergraduate',
  isBoardProgram: false,
  isNewProgram: false,
  hasSpecializations: false,
  isActive: true,
  createdAt: null,
};

function compliance(ched: Record<string, unknown>): ProgramComplianceRecord {
  return {
    id: 'program-1-2026',
    programId: program.id,
    campusId: program.campusId,
    academicYear: 2026,
    ched,
  } as ProgramComplianceRecord;
}

describe('CHED compliance warnings', () => {
  it('does not report No COPC when the actual issue is a missing monitoring record', () => {
    const summary = getProgramChedWarnings(program, null, 2026);

    expect(summary.warnings.map((warning) => warning.code)).toContain('NO_COMPLIANCE_RECORD');
    expect(summary.warnings.map((warning) => warning.code)).not.toContain('NO_COPC');
  });

  it('reports a missing COPC status as unknown instead of treating it as No COPC', () => {
    const summary = getProgramChedWarnings(program, compliance({}), 2026);

    expect(summary.warnings.map((warning) => warning.code)).toContain('UNKNOWN_COPC_STATUS');
    expect(summary.warnings.map((warning) => warning.code)).not.toContain('NO_COPC');
  });

  it('counts missing regulatory evidence separately from other warning categories', () => {
    const record = compliance({
      copcStatus: 'With COPC',
      copcLink: 'https://example.org/copc.pdf',
      programCmoLink: 'https://example.org/cmo.pdf',
      boardApprovalLink: 'https://example.org/bor.pdf',
    });
    const summary = getProgramChedWarnings(program, record, 2026);
    const stats = getUnitProgramsChedWarnings([program], [record], 2026);

    expect(summary.missingOtherChed).toBe(true);
    expect(summary.missingDocuments).toBe(false);
    expect(stats.missingChedDocCount).toBe(0);
  });

  it('does not count an empty major approval link as BOR evidence', () => {
    const summary = getProgramChedWarnings(
      program,
      compliance({ boardApprovalLink: '', majorBoardApprovals: [{ majorId: 'major-1', link: '' }] }),
      2026,
    );

    expect(summary.warnings.map((warning) => warning.code)).toContain('NO_BOR_APPROVAL');
    expect(summary.missingDocuments).toBe(true);
  });
});
