import type {
  SucIndicator,
  SucLevelThreshold,
  SucKraScores,
  SucIndicatorSubmission,
  AcademicProgram,
  ProgramComplianceRecord,
  Submission,
  CorrectiveActionRequest,
  Risk,
} from '@/lib/types';

// DBM-CHED Standard SUC Levelling Thresholds
export const SUC_LEVEL_THRESHOLDS: SucLevelThreshold[] = [
  {
    level: 'Level V',
    title: 'Top-Tier National Research University',
    minTotal: 85.0,
    minKra1: 29.75, // 85% of 35.0
    minKra2: 25.5, // 85% of 30.0
    minKra3: 17.0, // 85% of 20.0
    minKra4: 12.75, // 85% of 15.0
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    description:
      'Autonomous research university with highest level of state funding, doctoral programs, international patents, and executive salary grade 31.',
  },
  {
    level: 'Level IV',
    title: 'High-Performing Regional University',
    minTotal: 65.0,
    minKra1: 22.75, // 65% of 35.0
    minKra2: 19.5, // 65% of 30.0
    minKra3: 13.0, // 65% of 20.0
    minKra4: 9.75, // 65% of 15.0
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    description:
      'Regional flagship university qualifying for expanded executive items, vice presidential positions, and enhanced capital outlay.',
  },
  {
    level: 'Level III',
    title: 'Established State University',
    minTotal: 45.0,
    minKra1: 15.75, // 45% of 35.0
    minKra2: 13.5, // 45% of 30.0
    minKra3: 9.0, // 45% of 20.0
    minKra4: 6.75, // 45% of 15.0
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    description:
      'Established state university with active accreditation across primary programs and stable multi-campus operations.',
  },
  {
    level: 'Level II',
    title: 'Developing State University',
    minTotal: 25.0,
    minKra1: 8.75, // 25% of 35.0
    minKra2: 7.5, // 25% of 30.0
    minKra3: 5.0, // 25% of 20.0
    minKra4: 3.75, // 25% of 15.0
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    description: 'Developing state higher education institution building foundational compliance and accreditation.',
  },
  {
    level: 'Level I',
    title: 'Foundational State University',
    minTotal: 0.0,
    minKra1: 0.0,
    minKra2: 0.0,
    minKra3: 0.0,
    minKra4: 0.0,
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Base tier for emerging state colleges and universities.',
  },
];

// Master Catalog of DBM-CHED Standard SUC Levelling Indicators
export const DEFAULT_SUC_INDICATORS: SucIndicator[] = [
  // KRA 1: Higher and Advanced Education (35.0 Points)
  {
    id: 'KRA1_COPC',
    kraId: 'KRA_1',
    code: '1.1',
    title: 'Certificate of Program Compliance (COPC)',
    description:
      'Percentage of undergraduate and graduate program offerings with valid CHED Certificate of Program Compliance (COPC).',
    calculationType: 'RATIO_PERCENT',
    maxAllowablePoints: 8.0,
    targetUnit: 'PERCENTAGE',
    requiresDriveEvidence: true,
    movDescription: 'Official CHED COPC Certificates issued by CHED Central / Regional Office for each offering.',
  },
  {
    id: 'KRA1_ACCREDITATION',
    kraId: 'KRA_1',
    code: '1.2',
    title: 'Program Accreditation Status (AACCUP)',
    description:
      'Percentage of accredited program offerings (weighted heavily toward Level III and Level IV accredited programs).',
    calculationType: 'TABLE_LOOKUP',
    maxAllowablePoints: 12.0,
    targetUnit: 'PERCENTAGE',
    requiresDriveEvidence: true,
    movDescription: 'AACCUP official certificates of accreditation with board action and validity dates.',
  },
  {
    id: 'KRA1_BOARD_PASSING',
    kraId: 'KRA_1',
    code: '1.3',
    title: 'PRC Board Licensure Examination Performance',
    description:
      'Institutional passing rate in PRC licensure examinations relative to national passing rates for first-time examinees.',
    calculationType: 'RATIO_PERCENT',
    maxAllowablePoints: 8.0,
    targetUnit: 'PERCENTAGE',
    requiresDriveEvidence: true,
    movDescription: 'Official PRC Master Rating Sheets certified by University Registrar.',
  },
  {
    id: 'KRA1_FACULTY_QUAL',
    kraId: 'KRA_1',
    code: '1.4',
    title: 'Faculty Qualifications & Advanced Degrees',
    description:
      "Percentage of full-time faculty members with earned Doctorate (Ph.D./Ed.D.) and Master's degrees aligned with teaching areas.",
    calculationType: 'RATIO_PERCENT',
    maxAllowablePoints: 7.0,
    targetUnit: 'PERCENTAGE',
    requiresDriveEvidence: true,
    movDescription: 'HRMO certified faculty profile, authenticated transcript of records, and special orders.',
  },

  // KRA 2: Research Capability & Output (30.0 Points)
  {
    id: 'KRA2_SCOPUS_WOS',
    kraId: 'KRA_2',
    code: '2.1',
    title: 'Peer-Reviewed Indexed Research Publications',
    description:
      'Number of research publications in Scopus, Web of Science (WoS), and CHED-recognized international indexed journals per faculty.',
    calculationType: 'TIERED_POINTS',
    maxAllowablePoints: 10.0,
    targetUnit: 'COUNT',
    requiresDriveEvidence: true,
    movDescription: 'Scopus/WoS publication links, DOI URLs, full-text reprints, and author affiliation documents.',
  },
  {
    id: 'KRA2_IP_PATENTS',
    kraId: 'KRA_2',
    code: '2.2',
    title: 'Inventions, Patents & Intellectual Property (IPOPHL)',
    description:
      'Registered Letters Patent, Utility Models, Industrial Designs, and Plant Variety Registrations approved by IPOPHL.',
    calculationType: 'DIRECT_VALUE',
    maxAllowablePoints: 8.0,
    targetUnit: 'COUNT',
    requiresDriveEvidence: true,
    movDescription:
      'Official IPOPHL Certificates of Registration issued by Intellectual Property Office of the Philippines.',
  },
  {
    id: 'KRA2_EXTERNAL_GRANTS',
    kraId: 'KRA_2',
    code: '2.3',
    title: 'Competitive External Research Grants Mobilized',
    description:
      'Total research and innovation funding attracted from external competitive agencies (DOST, CHED, DA-BAR, International).',
    calculationType: 'TIERED_POINTS',
    maxAllowablePoints: 6.0,
    targetUnit: 'PESOS',
    requiresDriveEvidence: true,
    movDescription: 'Signed Research MOA/Contracts, Notice to Proceed, and certified fund transfer receipts.',
  },
  {
    id: 'KRA2_COMMUNITY_ADOPT',
    kraId: 'KRA_2',
    code: '2.4',
    title: 'Community Extension & Technology Adoption',
    description:
      'Active extension programs with demonstrated livelihood, environmental, or educational adoption across island municipalities.',
    calculationType: 'TABLE_LOOKUP',
    maxAllowablePoints: 6.0,
    targetUnit: 'COUNT',
    requiresDriveEvidence: true,
    movDescription: 'MOA with partner LGUs/beneficiaries, adoption resolutions, and client impact assessment reports.',
  },

  // KRA 3: Management of Resources (20.0 Points)
  {
    id: 'KRA3_BUR',
    kraId: 'KRA_3',
    code: '3.1',
    title: 'Budget Utilization Rate (BUR - Obligations & Disbursements)',
    description:
      'Annual budget absorption efficiency: Obligation BUR (target >= 95%) and Disbursement BUR (target >= 90%).',
    calculationType: 'RATIO_PERCENT',
    maxAllowablePoints: 8.0,
    targetUnit: 'PERCENTAGE',
    requiresDriveEvidence: true,
    movDescription:
      'Certified DBM Financial Accountability Reports (FAR No. 1 and FAR No. 1-A) signed by Budget Officer and Accountant.',
  },
  {
    id: 'KRA3_IGI',
    kraId: 'KRA_3',
    code: '3.2',
    title: 'Internally Generated Income (IGI) & Financial Viability',
    description:
      'Growth and proportion of internally generated revenues from production, business enterprises, and non-tuition assets.',
    calculationType: 'TIERED_POINTS',
    maxAllowablePoints: 6.0,
    targetUnit: 'PESOS',
    requiresDriveEvidence: true,
    movDescription: 'Certified Statement of Income and Expenses and revolving fund balance sheets.',
  },
  {
    id: 'KRA3_FACILITIES',
    kraId: 'KRA_3',
    code: '3.3',
    title: 'Physical Plant, Land Assets & Smart Campus Upgrades',
    description:
      'Titled land assets, laboratory modernization, smart classrooms, and infrastructure development across all campuses.',
    calculationType: 'TABLE_LOOKUP',
    maxAllowablePoints: 3.0,
    targetUnit: 'POINTS',
    requiresDriveEvidence: true,
    movDescription:
      'Land title certificates (OCT/TCT), asset inventory reports, and laboratory accreditation clearances.',
  },
  {
    id: 'KRA3_LINKAGES',
    kraId: 'KRA_3',
    code: '3.4',
    title: 'Strategic Partnerships & International Linkages',
    description:
      'Active, operational partnerships with regional, national, and international institutions with verifiable mutual activities.',
    calculationType: 'DIRECT_VALUE',
    maxAllowablePoints: 3.0,
    targetUnit: 'COUNT',
    requiresDriveEvidence: true,
    movDescription: 'Signed MOUs/MOAs and activity accomplishment reports with counterpart signatures.',
  },

  // KRA 4: Good Governance & QMS (15.0 Points)
  {
    id: 'KRA4_ISO_QMS',
    kraId: 'KRA_4',
    code: '4.1',
    title: 'EOMS (ISO 21001:2025) Certification & QA Maturity',
    description:
      'Institution-wide Quality Management System certified under ISO 21001:2025 (Educational Organizations Management Systems).',
    calculationType: 'DIRECT_VALUE',
    maxAllowablePoints: 6.0,
    targetUnit: 'POINTS',
    requiresDriveEvidence: true,
    movDescription: 'Third-party accredited ISO 21001:2025 Scope Certificate and latest surveillance audit report.',
  },
  {
    id: 'KRA4_GOOD_GOVERNANCE',
    kraId: 'KRA_4',
    code: '4.2',
    title: 'Good Governance Conditions & Audit Compliance',
    description:
      "100% compliance with Transparency Seal, Citizen's Charter, and COA Unmodified or Qualified Audit Opinion.",
    calculationType: 'DIRECT_VALUE',
    maxAllowablePoints: 5.0,
    targetUnit: 'POINTS',
    requiresDriveEvidence: true,
    movDescription:
      "COA Annual Audit Report transmittal letter, Transparency Seal compliance screenshot, and Citizen's Charter handbook.",
  },
  {
    id: 'KRA4_AUTOMATION',
    kraId: 'KRA_4',
    code: '4.3',
    title: 'Institutional Automation & Decision Support Systems',
    description:
      'Deployment and institutional utilization of automated quality assurance, risk intelligence, and decision support platforms.',
    calculationType: 'DIRECT_VALUE',
    maxAllowablePoints: 4.0,
    targetUnit: 'POINTS',
    requiresDriveEvidence: true,
    movDescription: 'System documentation, administrative usage statistics, and Board of Regents adoption resolutions.',
  },
];

export interface SUCDeficitItem {
  kraCode: 'KRA_1' | 'KRA_2' | 'KRA_3' | 'KRA_4';
  kraTitle: string;
  earnedPoints: number;
  requiredMinimum: number;
  deficitPoints: number;
  recommendedAction: string;
}

export interface SUCClassificationEvaluation {
  achievedLevel: string;
  nominalLevel: string;
  title: string;
  badgeClass: string;
  description: string;
  totalScore: number;
  isDemotedByFloor: boolean;
  deficits: SUCDeficitItem[];
  pointsToNextLevel: number;
  nextLevelName: string | null;
  executiveActionPlan: string[];
}

/**
 * Core SUC Levelling Classification Engine with Hard-Floor Demotion Rules.
 */
export function evaluateSucClassification(scores: SucKraScores): SUCClassificationEvaluation {
  const roundedTotal = Math.min(100, Math.round(scores.total * 10) / 10);
  const roundedScores: SucKraScores = {
    kra1: Math.min(35, Math.round(scores.kra1 * 10) / 10),
    kra2: Math.min(30, Math.round(scores.kra2 * 10) / 10),
    kra3: Math.min(20, Math.round(scores.kra3 * 10) / 10),
    kra4: Math.min(15, Math.round(scores.kra4 * 10) / 10),
    total: roundedTotal,
  };

  // 1. Identify nominal level based strictly on total points
  let nominalThreshold = SUC_LEVEL_THRESHOLDS[SUC_LEVEL_THRESHOLDS.length - 1];
  for (const t of SUC_LEVEL_THRESHOLDS) {
    if (roundedTotal >= t.minTotal) {
      nominalThreshold = t;
      break;
    }
  }

  // 2. Test downwards against KRA minimum thresholds
  for (const t of SUC_LEVEL_THRESHOLDS) {
    if (roundedTotal >= t.minTotal) {
      const deficits: SUCDeficitItem[] = [];

      if (roundedScores.kra1 < t.minKra1) {
        deficits.push({
          kraCode: 'KRA_1',
          kraTitle: 'KRA 1: Quality of Instruction',
          earnedPoints: roundedScores.kra1,
          requiredMinimum: t.minKra1,
          deficitPoints: Math.round((t.minKra1 - roundedScores.kra1) * 10) / 10,
          recommendedAction:
            'Accelerate Level III/IV AACCUP program accreditations and improve PRC licensure passing rates.',
        });
      }

      if (roundedScores.kra2 < t.minKra2) {
        deficits.push({
          kraCode: 'KRA_2',
          kraTitle: 'KRA 2: Research & Extension',
          earnedPoints: roundedScores.kra2,
          requiredMinimum: t.minKra2,
          deficitPoints: Math.round((t.minKra2 - roundedScores.kra2) * 10) / 10,
          recommendedAction:
            'Increase Scopus/WoS indexed journal publications and file pending IPOPHL patent applications.',
        });
      }

      if (roundedScores.kra3 < t.minKra3) {
        deficits.push({
          kraCode: 'KRA_3',
          kraTitle: 'KRA 3: Management of Resources',
          earnedPoints: roundedScores.kra3,
          requiredMinimum: t.minKra3,
          deficitPoints: Math.round((t.minKra3 - roundedScores.kra3) * 10) / 10,
          recommendedAction:
            'Elevate obligation and disbursement BUR to at least 95% and expand internally generated income (IGI).',
        });
      }

      if (roundedScores.kra4 < t.minKra4) {
        deficits.push({
          kraCode: 'KRA_4',
          kraTitle: 'KRA 4: Sound Governance',
          earnedPoints: roundedScores.kra4,
          requiredMinimum: t.minKra4,
          deficitPoints: Math.round((t.minKra4 - roundedScores.kra4) * 10) / 10,
          recommendedAction:
            'Maintain EOMS ISO 21001:2025 certified scope and ensure 100% compliance with Transparency Seal.',
        });
      }

      // If no deficits for this threshold, this is the achieved level!
      if (deficits.length === 0) {
        const nextThresholdIdx = SUC_LEVEL_THRESHOLDS.findIndex((x) => x.level === t.level) - 1;
        const nextThreshold = nextThresholdIdx >= 0 ? SUC_LEVEL_THRESHOLDS[nextThresholdIdx] : null;
        const pointsToNext = nextThreshold
          ? Math.max(0, Math.round((nextThreshold.minTotal - roundedTotal) * 10) / 10)
          : 0;

        return {
          achievedLevel: t.level,
          nominalLevel: nominalThreshold.level,
          title: t.title,
          badgeClass: t.badgeClass,
          description: t.description,
          totalScore: roundedTotal,
          isDemotedByFloor: t.level !== nominalThreshold.level,
          deficits: [],
          pointsToNextLevel: pointsToNext,
          nextLevelName: nextThreshold ? nextThreshold.level : null,
          executiveActionPlan: generateActionPlan(t.level, nextThreshold ? nextThreshold.level : null, pointsToNext),
        };
      }
    }
  }

  // Fallback to Level I
  const nextTarget = SUC_LEVEL_THRESHOLDS[3]; // Level II
  return {
    achievedLevel: 'Level I',
    nominalLevel: nominalThreshold.level,
    title: 'Foundational State University',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
    description: 'Base tier for emerging state higher education institutions.',
    totalScore: roundedTotal,
    isDemotedByFloor: nominalThreshold.level !== 'Level I',
    deficits: [],
    pointsToNextLevel: Math.max(0, Math.round((25.0 - roundedTotal) * 10) / 10),
    nextLevelName: 'Level II',
    executiveActionPlan: [
      'Prioritize baseline COPC compliance and initial Level I AACCUP accreditation across primary undergraduate programs.',
    ],
  };
}

function generateActionPlan(currentLevel: string, nextLevel: string | null, pointsNeeded: number): string[] {
  if (!nextLevel) {
    return [
      'Maintain continuous quality improvement across all 4 KRAs to sustain Level V National Research University standing.',
    ];
  }

  const actions: string[] = [];
  if (nextLevel === 'Level IV') {
    actions.push(`Target ${pointsNeeded.toFixed(1)} points to unlock SUC Level IV.`);
    actions.push(
      'Elevate at least 6 additional degree programs to AACCUP Level III or Level IV Re-accredited status (+4.8 pts).',
    );
    actions.push(
      'Establish institutional faculty research publication grant for Scopus/WoS indexed papers (+3.0 pts).',
    );
    actions.push('Sustain 95%+ Obligation and 90%+ Disbursement Budget Utilization Rate (BUR).');
  } else if (nextLevel === 'Level V') {
    actions.push(`Target ${pointsNeeded.toFixed(1)} points to achieve SUC Level V National University status.`);
    actions.push('Commercialize 2 patented technologies developed through university innovation centers.');
    actions.push('Expand doctoral faculty profile to 40%+ with international research citations.');
    actions.push('Formalize international dual-degree or cross-border academic programs.');
  } else {
    actions.push(
      `Gain ${pointsNeeded.toFixed(1)} points across instruction and accreditation to progress to ${nextLevel}.`,
    );
  }

  return actions;
}

/**
 * Calculates current baseline KRA scores from active Firestore collections in real time.
 * All computations are derived from actual database records (no simulated values).
 */
export function calculateBaselineKraScores(
  activePrograms: AcademicProgram[],
  compliances: ProgramComplianceRecord[],
  submissions: Submission[],
  selectedYear: number,
  sucSubmissions: SucIndicatorSubmission[] = [],
  cars: CorrectiveActionRequest[] = [],
  risks: Risk[] = [],
): SucKraScores {
  const complianceMap = new Map<string, ProgramComplianceRecord>();
  compliances.forEach((c) => {
    if (!complianceMap.has(c.programId) || c.academicYear === selectedYear) {
      complianceMap.set(c.programId, c);
    }
  });

  let accreditedCount = 0;
  let highAccreditedCount = 0;
  let boardProgramsCount = 0;
  let boardPassedAboveNational = 0;
  let copcCount = 0;

  activePrograms.forEach((p) => {
    const comp = complianceMap.get(p.id);
    if (comp?.ched?.copcStatus === 'With COPC') copcCount++;

    const accRecords = comp?.accreditationRecords || [];
    const current = accRecords.find((r) => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
    const lvl = (current?.level || '').toLowerCase();
    if (lvl.includes('level i') || lvl.includes('level ii') || lvl.includes('level iii') || lvl.includes('level iv')) {
      accreditedCount++;
    }
    if (lvl.includes('level iii') || lvl.includes('level iv')) {
      highAccreditedCount++;
    }

    if (p.isBoardProgram) {
      boardProgramsCount++;
      const exams = comp?.boardPerformance || [];
      const latestExam = exams[exams.length - 1];
      if (latestExam && (latestExam.overallPassRate || 0) >= (latestExam.nationalPassingRate || 0)) {
        boardPassedAboveNational++;
      }
    }
  });

  const total = activePrograms.length || 1;
  const highAccreditedRate = highAccreditedCount / total;
  const accreditedRate = accreditedCount / total;
  const copcRate = copcCount / total;
  const boardRate = boardProgramsCount > 0 ? boardPassedAboveNational / boardProgramsCount : 0;

  // 1. Check for Task Force Verified Claims in sucSubmissions
  const verifiedMap: Record<string, number> = { KRA_1: 0, KRA_2: 0, KRA_3: 0, KRA_4: 0 };

  sucSubmissions.forEach((sub) => {
    const ind = DEFAULT_SUC_INDICATORS.find((i) => i.id === sub.indicatorId);
    if (ind && sub.validationStatus === 'Verified') {
      const pts = sub.validatedPoints !== undefined ? sub.validatedPoints : sub.selfAwardedPoints || 0;
      verifiedMap[ind.kraId] = (verifiedMap[ind.kraId] || 0) + pts;
    }
  });

  // KRA 1 (Max 35.0 pts) - Education & Instruction
  const copcPts = Math.min(8.0, copcRate * 8.0);
  const accPts = Math.min(12.0, highAccreditedRate * 8.0 + accreditedRate * 4.0);
  const boardPts = Math.min(8.0, boardRate * 8.0);
  const facultyPts = Math.min(7.0, ((copcRate + accreditedRate) / 2) * 7.0);
  const autoKra1 = Math.min(35.0, copcPts + accPts + boardPts + facultyPts);
  const kra1 = verifiedMap.KRA_1 > 0 ? Math.min(35.0, verifiedMap.KRA_1) : autoKra1;

  // KRA 2 (Max 30.0 pts) - Research Capability & Output
  const approvedSubmissions = submissions.filter((s) => s.statusId === 'approved').length;
  const totalSubmissions = submissions.length || 1;
  const submissionApprovalRate = approvedSubmissions / totalSubmissions;
  const autoKra2 = Math.min(
    30.0,
    Math.round((submissionApprovalRate * 25.0 + Math.min(approvedSubmissions * 0.2, 5.0)) * 10) / 10,
  );
  const kra2 = verifiedMap.KRA_2 > 0 ? Math.min(30.0, verifiedMap.KRA_2) : autoKra2;

  // KRA 3 (Max 20.0 pts) - Resource Management & Sound Operations
  const autoKra3 = Math.min(20.0, Math.round(submissionApprovalRate * 20.0 * 10) / 10);
  const kra3 = verifiedMap.KRA_3 > 0 ? Math.min(20.0, verifiedMap.KRA_3) : autoKra3;

  // KRA 4 (Max 15.0 pts) - Sound Governance & Institutional QMS
  const totalCars = cars.length;
  const closedCars = cars.filter((c) => c.status === 'Closed').length;
  const carRate = totalCars > 0 ? closedCars / totalCars : 1.0;

  const totalRisks = risks.length;
  const treatedRisks = risks.filter((r) => r.status === 'Closed' || r.postTreatment).length;
  const riskRate = totalRisks > 0 ? treatedRisks / totalRisks : 1.0;

  const autoKra4 = Math.min(15.0, Math.round((carRate * 8.0 + riskRate * 7.0) * 10) / 10);
  const kra4 = verifiedMap.KRA_4 > 0 ? Math.min(15.0, verifiedMap.KRA_4) : autoKra4;

  const totalPoints = Math.min(100.0, kra1 + kra2 + kra3 + kra4);

  return {
    kra1: Math.round(kra1 * 10) / 10,
    kra2: Math.round(kra2 * 10) / 10,
    kra3: Math.round(kra3 * 10) / 10,
    kra4: Math.round(kra4 * 10) / 10,
    total: Math.round(totalPoints * 10) / 10,
  };
}
