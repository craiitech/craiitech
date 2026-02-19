export type Role = {
  id: string;
  name: string;
  description?: string;
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  roleId: string;
  role: string; // denormalized
  campusId: string;
  unitId: string;
  verified: boolean;
  ndaAccepted?: boolean;
  lastSeen?: any;
};

export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Submitted';

export type Comment = {
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: any; // serverTimestamp()
}

export type Submission = {
  id: string;
  userId: string;
  submissionDate: Date;
  googleDriveLink: string;
  cycleId: string;
  statusId: string;
  reportType: string;
  year: number;
  unitName: string;
  campusId: string;
  unitId: string;
  comments?: Comment[];
  riskRating?: 'low' | 'medium-high';
  revision: number;
  controlNumber: string;
};

export type Risk = {
    id: string;
    userId: string; // Added to track ownership for security rules
    unitId: string;
    campusId: string;
    year: number;
    objective: string;
    type: 'Risk' | 'Opportunity';
    description: string;
    currentControls: string;
    preTreatment: {
        likelihood: number;
        consequence: number;
        magnitude: number;
        rating: string;
    };
    treatmentAction?: string;
    responsiblePersonId?: string;
    responsiblePersonName?: string; // Denormalized
    targetDate?: any; // Can be Timestamp
    status: 'Open' | 'In Progress' | 'Closed';
    postTreatment?: {
        likelihood: number;
        consequence: number;
        magnitude: number;
        rating: string;
        evidence: string;
        dateImplemented: any;
    };
    oapNo?: string;
    resourcesNeeded?: string;
    updates?: string;
    preparedBy?: string; // Unit Head
    approvedBy?: string; // VPAA/VPAF/VPREDI
    createdAt: any; // serverTimestamp()
    updatedAt: any; // serverTimestamp()
}


export type Campus = {
    id: string;
    name: string;
    location: string;
}

export type UnitCategory = 'Academic' | 'Administrative' | 'Research' | 'Support';

export type Unit = {
    id: string;
    name: string;
    category?: UnitCategory;
    vicePresidentId?: string;
    campusIds?: string[];
}

export type CampusSetting = {
    id: string;
    announcement?: string;
}

export type ActivityLog = {
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    details: Record<string, any>;
    timestamp: any; // serverTimestamp()
}
    
export type Cycle = {
  id: string;
  name: 'first' | 'final';
  year: number;
  startDate: any; // Can be Timestamp
  endDate: any; // Timestamp
}

export type ErrorReport = {
  id: string;
  errorMessage: string;
  errorStack: string;
  errorDigest?: string;
  url: string;
  status: 'new' | 'acknowledged' | 'resolved';
  userId?: string;
  userName?: string;
  userRole?: string;
  userEmail?: string;
  timestamp: any; // serverTimestamp()
}

export type ISOClause = {
    id: string;
    title: string;
    description: string;
};

export type AuditPlan = {
    id: string;
    title: string;
    year: number;
    campusId: string;
    auditeeType: 'Units' | 'Top Management';
    scope: string;
    createdAt: any; // serverTimestamp()
};

export type AuditSchedule = {
    id: string;
    auditPlanId: string;
    auditorId: string | null;
    auditorName: string | null;
    targetId: string; // unitId or userId
    targetType: 'Unit' | 'User';
    targetName: string; // unit name or user name
    scheduledDate: any; // Timestamp
    isoClausesToAudit: string[];
    status: 'Scheduled' | 'In Progress' | 'Completed';
    summaryCommendablePractices?: string;
    summaryOFI?: string;
    summaryNC?: string;
};

export type AuditFinding = {
    id: string;
    auditScheduleId: string;
    isoClause: string;
    type: 'Commendation' | 'Observation for Improvement' | 'Non-Conformance';
    description: string;
    evidence: string;
    createdAt: any; // serverTimestamp()
    authorId: string;
};

export type CorrectiveActionPlan = {
    id: string;
    findingId: string;
    rootCauseAnalysis: string;
    correctionPlan: string;
    correctiveAction: string;
    responsiblePersonId: string;
    responsiblePersonName: string;
    targetDate: any; // Timestamp
    status: 'Submitted' | 'Accepted' | 'Rejected' | 'Completed';
    authorId: string;
    createdAt: any; // serverTimestamp()
};

export type ProcedureManual = {
    id: string; // Same as unitId
    unitName: string;
    googleDriveLink: string;
    revisionNumber?: string;
    dateImplemented?: string;
    updatedAt: any; // serverTimestamp()
}

export type EomsPolicyManual = {
    id: string; // e.g., 'section-1'
    sectionNumber: number;
    title: string;
    googleDriveLink: string;
    revisionNumber: string;
    pageCount: number;
    executionDate: string;
    updatedAt: any; // serverTimestamp()
}

export type ObservationItem = {
  item: string;
  status: 'Available' | 'Not Available' | 'For Improvement' | 'Not Applicable' | 'Need to revisit' | 'Needs Updating';
  remarks?: string;
};

export type UnitMonitoringRecord = {
  id: string;
  visitDate: any; // Timestamp
  campusId: string;
  unitId: string;
  roomNumber?: string;
  building?: string;
  officerInCharge?: string;
  monitorId: string;
  monitorName: string;
  observations: ObservationItem[];
  generalRemarks?: string;
  createdAt: any; // Timestamp
};

export type AppFeedback = {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comments?: string;
  suggestions?: string;
  timestamp: any;
};

export type SoftwareEvaluation = {
  id: string;
  userId: string;
  userName: string;
  timestamp: any;
  scores: Record<string, number>;
  overallScore: number;
  generalComments?: string;
  recommendations?: string;
};

// --- ACADEMIC PROGRAM MONITORING TYPES ---

export type AcademicProgram = {
  id: string;
  name: string;
  abbreviation: string;
  campusId: string;
  collegeId: string; // e.g., 'CET', 'CAS'
  level: 'Undergraduate' | 'Graduate' | 'TVET';
  isBoardProgram: boolean;
  isNewProgram: boolean; // Flag for programs not yet subject to accreditation
  hasSpecializations: boolean;
  specializations?: { id: string; name: string }[];
  isActive: boolean;
  createdAt: any;
};

export type FacultyAlignment = 'Aligned' | 'Not Aligned' | 'N/A';
export type FacultyCategory = 'Core' | 'Professional Special' | 'General Education' | 'Staff';

export type ProgramFacultyMember = {
  id: string;
  name: string;
  highestEducation: string;
  academicRank: string;
  category: FacultyCategory;
  isAlignedWithCMO: FacultyAlignment;
  sex: 'Male' | 'Female';
  specializationAssignment?: string; // Linked to a specialization.id
};

export type GraduationOutcome = {
  year: number;
  semester: string;
  count: number;
  maleCount: number;
  femaleCount: number;
};

export type TracerOutcome = {
  year: number;
  semester: string;
  totalGraduates: number;
  tracedCount: number;
  employmentRate: number;
  maleTraced: number;
  femaleTraced: number;
  maleEmployed: number;
  femaleEmployed: number;
};

export type RQATVisit = {
  date: string;
  result: string;
  comments: string;
  nonCompliances: string;
  reportLink?: string; // Link to GDrive PDF
};

export type BoardExamPerformance = {
  examDate: string;
  firstTakersCount: number;
  firstTakersPassed: number;
  firstTakersPassRate: number;
  retakersCount: number;
  retakersPassed: number;
  retakersPassRate: number;
  overallPassRate: number;
  nationalPassingRate: number;
};

export type AccreditationArea = {
  areaCode: string;
  areaName: string;
  googleDriveLink: string;
  taskForce?: string;
  weight?: number;
  mean?: number;
  weightedMean?: number;
};

export type EnrollmentStats = {
  male: number;
  female: number;
  total: number;
  specialNeeds: number;
};

export type YearLevelEnrollment = {
  firstYear: EnrollmentStats;
  secondYear: EnrollmentStats;
  thirdYear: EnrollmentStats;
  fourthYear: EnrollmentStats;
  fifthYear?: EnrollmentStats;
};

export type FacultyLeadershipMember = {
  name: string;
  highestEducation: string;
  academicRank?: string;
  isAlignedWithCMO: FacultyAlignment;
  sex: 'Male' | 'Female';
};

export type AccreditationRecord = {
    id: string;
    level: string; // Level 1, Level 2, etc.
    typeOfVisit?: string;
    result?: string;
    components?: { id: string; name: string }[];
    dateOfSurvey?: string;
    statusValidityDate?: string;
    dateOfAward?: string;
    nextSchedule: string;
    certificateLink?: string; // GDrive PDF
    overallTaskForceHead?: string;
    taskForce?: string;
    areas?: AccreditationArea[];
    mandatoryRequirements?: string;
    enhancementRecommendations?: string;
    ratingsSummary?: {
        overallTotalWeight: number;
        overallTotalWeightedMean: number;
        grandMean: number;
        descriptiveRating: string;
    };
    lifecycleStatus?: 'Current' | 'Undergoing' | 'Completed' | 'TBA' | 'Waiting for Official Result';
};

export type CurriculumRecord = {
  id: string;
  majorId: string; // 'General' or specific specialization id
  revisionNumber: string;
  dateImplemented: string;
  isNotedByChed: boolean;
  notationProofLink?: string; // Proof of notation PDF
  dateNoted?: string;
};

export type ProgramComplianceRecord = {
  id: string;
  programId: string;
  campusId: string;
  academicYear: number;
  
  // CHED Institutional Compliance (Registry strictly for authority)
  ched: {
    copcStatus: 'With COPC' | 'No COPC' | 'In Progress';
    copcLink?: string; // GDrive PDF
    boardApprovalMode?: 'sole' | 'per-major';
    boardApprovalLink?: string; // Single BOR resolution link
    majorBoardApprovals?: { majorId: string; link: string }[]; // Major-specific links
    programCmoLink?: string; // ADDED: Shared Program CMO
    rqatVisits?: RQATVisit[];
  };

  // Accreditation (Array for history/lifecycle tracking)
  accreditationRecords?: AccreditationRecord[];

  // Unified Curriculum & Content Noted Registry
  curriculumRecords?: CurriculumRecord[];

  // Faculty/Staff
  faculty: {
    dean: FacultyLeadershipMember;
    hasAssociateDean?: boolean;
    associateDean?: FacultyLeadershipMember;
    programChair: FacultyLeadershipMember;
    members: ProgramFacultyMember[];
  };

  // Student Stats
  stats: {
    enrollment: {
      firstSemester: YearLevelEnrollment;
      secondSemester: YearLevelEnrollment;
      midYearTerm?: YearLevelEnrollment;
    };
    graduationCount: number;
    maleGraduates?: number;
    femaleGraduates?: number;
  };

  // Outcomes registries
  graduationRecords?: GraduationOutcome[];
  tracerRecords?: TracerOutcome[];

  // Board Performance
  boardPerformance?: BoardExamPerformance[];

  updatedAt: any;
  updatedBy: string;
};
