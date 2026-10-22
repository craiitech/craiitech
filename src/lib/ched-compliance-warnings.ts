import type { AcademicProgram, ProgramComplianceRecord } from './types';
import { getComplianceEnrollmentSummary } from './enrollment';

export type ProgramChedWarningType =
  'enrollment' | 'graduation' | 'board' | 'ched_copc' | 'ched_cmo' | 'ched_bor' | 'faculty';

export type ProgramChedWarningSeverity = 'critical' | 'warning' | 'info';

export interface ProgramChedWarningItem {
  type: ProgramChedWarningType;
  severity: ProgramChedWarningSeverity;
  code: string;
  title: string;
  description: string;
}

export interface ProgramChedWarningSummary {
  program: AcademicProgram;
  compliance?: ProgramComplianceRecord | null;
  warnings: ProgramChedWarningItem[];
  hasWarnings: boolean;
  hasCritical: boolean;
  missingEnrollment: boolean;
  missingGraduation: boolean;
  missingBoard: boolean;
  missingOtherChed: boolean;
  enrollmentSummary: {
    firstSemCount: number;
    secondSemCount: number;
    midYearCount: number;
    totalYear: number;
  };
  graduationSummary: {
    totalGraduates: number;
  };
  boardSummary: {
    isBoardProgram: boolean;
    examCount: number;
    latestPassRate: number | null;
    nationalPassRate: number | null;
  };
}

/**
 * Analyzes a single academic program and its compliance record to identify any missing required CHED monitoring data:
 * 1. Enrollment per semester (1st Sem & 2nd Sem)
 * 2. Graduation counts
 * 3. Board Examination Performance (for PRC board programs)
 * 4. Other Required CHED Program Monitoring info (COPC proof, CMO linkage, BOR approval)
 */
export function getProgramChedWarnings(
  program: AcademicProgram,
  compliance?: ProgramComplianceRecord | null,
  targetYear?: number,
): ProgramChedWarningSummary {
  const warnings: ProgramChedWarningItem[] = [];

  // 1. Calculate Enrollment per Semester using the shared canonical aggregator
  const enrollmentSummary = getComplianceEnrollmentSummary(compliance, { academicYear: targetYear });
  const firstSemCount = enrollmentSummary.firstSemester.total;
  const secondSemCount = enrollmentSummary.secondSemester.total;
  const midYearCount = enrollmentSummary.midYearTerm.total;

  const totalYearEnrollment = firstSemCount + secondSemCount + midYearCount;

  // Enrollment Checks
  let missingEnrollment = false;
  if (!compliance) {
    warnings.push({
      type: 'enrollment',
      severity: 'critical',
      code: 'NO_COMPLIANCE_RECORD',
      title: 'No CHED Monitoring Record for AY',
      description: 'Program has no compliance record registered for this academic year.',
    });
    missingEnrollment = true;
  } else if (firstSemCount === 0 && secondSemCount === 0) {
    warnings.push({
      type: 'enrollment',
      severity: 'critical',
      code: 'NO_ENROLLMENT_BOTH_SEMESTERS',
      title: 'Missing Student Enrollment (Both Semesters)',
      description: 'Zero student headcount recorded for both 1st and 2nd Semester in CHED monitoring.',
    });
    missingEnrollment = true;
  } else if (firstSemCount === 0) {
    warnings.push({
      type: 'enrollment',
      severity: 'warning',
      code: 'NO_FIRST_SEM_ENROLLMENT',
      title: 'Missing 1st Semester Enrollment',
      description: 'Zero student headcount logged for 1st Semester.',
    });
    missingEnrollment = true;
  } else if (secondSemCount === 0) {
    warnings.push({
      type: 'enrollment',
      severity: 'warning',
      code: 'NO_SECOND_SEM_ENROLLMENT',
      title: 'Missing 2nd Semester Enrollment',
      description: 'Zero student headcount logged for 2nd Semester.',
    });
    missingEnrollment = true;
  }

  // 2. Graduation Checks
  let totalGraduates = compliance?.stats?.graduationCount ?? 0;
  if (Array.isArray(compliance?.graduationRecords) && compliance.graduationRecords.length > 0) {
    const sumRecords = compliance.graduationRecords.reduce((sum, r) => sum + (r.count ?? 0), 0);
    if (sumRecords > totalGraduates) {
      totalGraduates = sumRecords;
    }
  }

  let missingGraduation = false;
  // If it is an established program (not marked isNewProgram), graduation statistics are required by CHED
  if (!program.isNewProgram) {
    if (!compliance || totalGraduates === 0) {
      warnings.push({
        type: 'graduation',
        severity: 'warning',
        code: 'NO_GRADUATION_DATA',
        title: 'Missing Graduation Data',
        description: 'Zero graduates recorded for this program in the monitored academic year.',
      });
      missingGraduation = true;
    }
  }

  // 3. Board Examination Performance Checks
  let missingBoard = false;
  let examCount = 0;
  let latestPassRate: number | null = null;
  let nationalPassRate: number | null = null;

  if (program.isBoardProgram) {
    const exams = Array.isArray(compliance?.boardPerformance) ? compliance.boardPerformance : [];
    examCount = exams.length;

    if (examCount === 0) {
      warnings.push({
        type: 'board',
        severity: 'critical',
        code: 'NO_BOARD_EXAM_DATA',
        title: 'Missing Board Exam Performance',
        description: 'This is a PRC Board Exam program with no PRC licensure examination results recorded.',
      });
      missingBoard = true;
    } else {
      const latest = exams[exams.length - 1];
      latestPassRate = latest.firstTakersPassRate ?? null;
      nationalPassRate = latest.nationalPassingRate ?? null;

      if (latestPassRate === null && nationalPassRate === null) {
        warnings.push({
          type: 'board',
          severity: 'warning',
          code: 'INCOMPLETE_BOARD_RATES',
          title: 'Incomplete Board Exam Pass Rates',
          description: 'PRC Board exam entry is missing first-timer passing rates or national rating.',
        });
        missingBoard = true;
      }
    }
  }

  // 4. Other Required CHED Program Monitoring Information
  let missingOtherChed = false;
  const copcStatus = compliance?.ched?.copcStatus || 'No COPC';

  if (copcStatus === 'No COPC') {
    warnings.push({
      type: 'ched_copc',
      severity: 'critical',
      code: 'NO_COPC',
      title: 'No COPC (Operating without CHED Certificate)',
      description: 'Program is operating without a valid CHED Certificate of Program Compliance (COPC).',
    });
    missingOtherChed = true;
  } else if ((copcStatus === 'With COPC' || copcStatus === 'In Progress') && !compliance?.ched?.copcLink) {
    warnings.push({
      type: 'ched_copc',
      severity: 'warning',
      code: 'NO_COPC_PROOF_LINK',
      title: 'Missing COPC Verification Link',
      description: 'No Certificate of Program Compliance or CHED application document link attached.',
    });
    missingOtherChed = true;
  }

  const hasCmoLink = Boolean(compliance?.ched?.programCmoLink);
  const hasCurriculumNoted =
    Array.isArray(compliance?.curriculumRecords) &&
    compliance.curriculumRecords.some((c) => c.isNotedByChed || c.notationProofLink);

  if (!hasCmoLink && !hasCurriculumNoted) {
    warnings.push({
      type: 'ched_cmo',
      severity: 'warning',
      code: 'NO_CMO_LINK',
      title: 'Missing CMO / Curriculum Notation',
      description: 'No CHED Memorandum Order (CMO) compliance proof or curriculum notation logged.',
    });
    missingOtherChed = true;
  }

  const hasBor =
    Boolean(compliance?.ched?.boardApprovalLink) ||
    (Array.isArray(compliance?.ched?.majorBoardApprovals) && compliance.ched.majorBoardApprovals.length > 0);

  if (!hasBor) {
    warnings.push({
      type: 'ched_bor',
      severity: 'warning',
      code: 'NO_BOR_APPROVAL',
      title: 'Missing Board of Regents (BOR) Approval',
      description: 'No Board of Regents (BOR) approval resolution link on record.',
    });
    missingOtherChed = true;
  }

  const hasChairOrDean = Boolean(compliance?.faculty?.programChair?.name || compliance?.faculty?.dean?.name);
  const hasFacultyMembers = Array.isArray(compliance?.faculty?.members) && compliance.faculty.members.length > 0;

  if (!hasChairOrDean && !hasFacultyMembers) {
    warnings.push({
      type: 'faculty',
      severity: 'warning',
      code: 'NO_FACULTY_ROSTER',
      title: 'Missing Faculty / Chair Profile',
      description: 'No Program Chair, Dean, or faculty alignment roster recorded for this program.',
    });
    missingOtherChed = true;
  }

  return {
    program,
    compliance,
    warnings,
    hasWarnings: warnings.length > 0,
    hasCritical: warnings.some((w) => w.severity === 'critical'),
    missingEnrollment,
    missingGraduation,
    missingBoard,
    missingOtherChed,
    enrollmentSummary: {
      firstSemCount,
      secondSemCount,
      midYearCount,
      totalYear: totalYearEnrollment,
    },
    graduationSummary: {
      totalGraduates,
    },
    boardSummary: {
      isBoardProgram: !!program.isBoardProgram,
      examCount,
      latestPassRate,
      nationalPassRate,
    },
  };
}

/**
 * Aggregates warnings across an array of academic programs for an academic unit or campus.
 */
export function getUnitProgramsChedWarnings(
  programs: AcademicProgram[],
  compliances: ProgramComplianceRecord[],
  targetYear?: number,
) {
  const complianceMap = new Map<string, ProgramComplianceRecord>();

  compliances.forEach((c) => {
    if (targetYear) {
      if (Number(c.academicYear) === Number(targetYear)) {
        complianceMap.set(c.programId, c);
      }
      return;
    }

    const existing = complianceMap.get(c.programId);
    if (!existing || c.academicYear > existing.academicYear) {
      complianceMap.set(c.programId, c);
    }
  });

  const activePrograms = programs.filter((p) => p.isActive === true);

  const summaries = activePrograms.map((p) => {
    const comp = complianceMap.get(p.id);
    return getProgramChedWarnings(p, comp, targetYear);
  });

  const warningSummaries = summaries.filter((s) => s.hasWarnings);
  const cleanProgramsCount = summaries.length - warningSummaries.length;

  const missingEnrollmentCount = summaries.filter((s) => s.missingEnrollment).length;
  const missingGraduationCount = summaries.filter((s) => s.missingGraduation).length;
  const missingBoardCount = summaries.filter((s) => s.missingBoard).length;
  const missingChedDocCount = summaries.filter((s) => s.missingOtherChed).length;

  return {
    totalPrograms: activePrograms.length,
    warningProgramsCount: warningSummaries.length,
    cleanProgramsCount,
    summaries,
    warningSummaries,
    missingEnrollmentCount,
    missingGraduationCount,
    missingBoardCount,
    missingChedDocCount,
  };
}
