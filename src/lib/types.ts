
export type Role = {
  id: string;
  name: string;
  description?: string;
};

export type UserAccessibility = {
  highContrast?: boolean;
  dyslexicFont?: boolean;
  reducedMotion?: boolean;
  fontSize?: number;
  themeColor?: 'default' | 'blue' | 'green' | 'maroon' | 'gold';
};

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  sex?: string;
  avatar?: string;
  roleId: string;
  role: string; // denormalized
  campusId: string;
  unitId: string;
  verified: boolean;
  ndaAccepted?: boolean;
  lastSeen?: any;
  accessibility?: UserAccessibility;
  lastSeenVersion?: string; // Track the last changelog version seen by the user
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
  isDraft?: boolean;
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
    monitoringScore?: string; // Evaluative score/text for treatment
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
    verification?: {
        status: 'Correct' | 'Incorrect' | 'Updated' | 'Not Updated';
        verifiedBy: string;
        verifiedAt: any;
    };
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
    formsDriveLink?: string; // Admin-set Google Drive area for registered forms
    formsDriveRevision?: string;
    formsDriveUpdatedAt?: string;
    masterlistPdfLink?: string; // Admin-set Link for the PDF Preview
    masterlistRevision?: string;
    masterlistUpdatedAt?: string;
}

export type CampusSetting = {
    id: string;
    announcement?: string;
    formsDriveLink?: string;
    formsDriveRevision?: string;
    formsDriveUpdatedAt?: string;
    masterlistPdfLink?: string;
    masterlistRevision?: string;
    masterlistUpdatedAt?: string;
}

export type SystemSettings = {
    logoUrl?: string;
    updatedAt?: any;
    updatedBy?: string;
}

export type GadSettings = {
    leadershipUnitId?: string;
    updatedAt?: any;
    updatedBy?: string;
}

export type BackupSettings = {
    targetDriveLink?: string;
    lastConfiguredAt?: any;
    lastConfiguredBy?: string;
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

export type AuditGroup = 'Management Processes' | 'Operation Processes' | 'Support Processes';

export type AuditPlan = {
    id: string;
    auditNumber: string; // e.g. 2025-001
    auditType: 'Regular Audit' | 'Special Audit';
    title: string;
    year: number;
    campusId: string;
    auditeeType: AuditGroup[]; // Changed to array for multiple selection
    groupClauseMapping?: Record<string, string[]>; // New: Preset clauses per group
    scope: string;
    leadAuditorId: string;
    leadAuditorName: string;
    openingMeetingDate: any; // Timestamp
    closingMeetingDate: any; // Timestamp
    referenceDocument: string; // e.g. ISO 21001:2018 / EOMS Standard
    createdAt: any; // serverTimestamp()
};

export type AuditSchedule = {
    id: string;
    auditPlanId: string;
    auditNumber?: string; // Denormalized for access without AuditPlan get
    auditorId: string | null;
    auditorName: string | null;
    campusId: string; // Mandatory site context for each entry
    targetId: string; // unitId or userId
    targetType: 'Unit' | 'User';
    targetName: string; // unit name or user name
    auditeeHeadName?: string; // New: Specific person leading the unit
    procedureDescription: string; // The "Procedure" column text
    scheduledDate: any; // Timestamp (Start)
    endScheduledDate: any; // Timestamp (End)
    isoClausesToAudit: string[];
    status: 'Scheduled' | 'In Progress' | 'Completed';
    summaryCommendable?: string;
    summaryCompliance?: string;
    summaryOFI?: string;
    summaryNC?: string;
    officerInCharge?: string;
    processCategory?: AuditGroup;
};

export type AuditFinding = {
    id: string;
    auditScheduleId: string;
    isoClause: string;
    type: 'Compliance' | 'Observation for Improvement' | 'Non-Conformance';
    description: string; // Used for general description or Compliance/OFI notes
    evidence: string;
    ncStatement?: string; // New: Formal statement for Non-Conformance
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
  roomType: 'Office' | 'Classroom';
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

export type QaAdvisory = {
    id: string;
    controlNumber: string;
    subject: string;
    releaseDate: any; // Timestamp
    googleDriveLink: string;
    scope: 'University-Wide' | 'Specific Unit';
    targetUnitId?: string;
    createdAt: any; // Timestamp
};

export type CARActionStep = {
    description: string;
    type: 'Immediate Correction' | 'Long-term Corrective Action';
    completionDate: any; // Timestamp
    status: 'Pending' | 'Completed';
    evidenceLink?: string;
};

export type CAREvidence = {
    title: string;
    url: string;
};

export type CARVerificationRecord = {
    result: string;
    resultVerifiedBy: string;
    resultVerificationDate: any; // Timestamp
    effectivenessResult: string;
    effectivenessVerifiedBy: string;
    effectivenessVerificationDate: any; // Timestamp
    remarks?: string;
};

export type CorrectiveActionRequest = {
    id: string;
    carNumber: string;
    ncReportNumber?: string;
    source: 'Audit Finding' | 'Legal Non-compliance' | 'Non-conforming Service' | 'Others';
    procedureTitle: string;
    initiator: string;
    natureOfFinding: 'NC' | 'OFI';
    concerningClause: string;
    concerningTopManagementName?: string;
    timeLimitForReply: any; // Timestamp
    unitId: string;
    campusId: string;
    unitHead: string;
    descriptionOfNonconformance: string;
    requestDate: any; // Timestamp
    preparedBy: string;
    approvedBy: string;
    
    rootCauseAnalysis?: string;
    actionSteps?: CARActionStep[];
    evidences?: CAREvidence[];
    verificationRecords?: CARVerificationRecord[];
    
    status: 'Open' | 'In Progress' | 'Closed';
    needsVerification?: boolean; // New flag for tracking unit updates
    createdAt: any;
    updatedAt: any;
};

export type Signatories = {
  qaoDirector: string;
  qmsHead: string;
  accreditationHead: string;
  updatedAt?: any;
};

export type UnitForm = {
    id: string;
    unitId: string;
    campusId: string;
    formCode: string;
    formName: string;
    googleDriveLink: string;
    revision: string;
    requestId: string; 
    createdAt: any;
};

export type UnitFormRequestStatus = 'Submitted' | 'QA Review' | 'Returned for Correction' | 'Awaiting Presidential Approval' | 'Approved & Registered';

export type UnitFormRequestComment = {
    text: string;
    authorId: string;
    authorName: string;
    createdAt: any;
};

export type UnitFormRequest = {
    id: string;
    unitId: string;
    campusId: string;
    unitName: string;
    submitterId: string;
    submitterName: string;
    scannedRegistrationFormLink: string; 
    requestedForms: {
        name: string;
        code: string;
        link: string;
        revision: string;
    }[];
    status: UnitFormRequestStatus;
    comments: UnitFormRequestComment[];
    createdAt: any;
    updatedAt: any;
};

export type FormDownloadLog = {
    id: string;
    unitId: string;
    formId: string;
    formName: string;
    formCode: string;
    requesterName: string;
    requestDate: any; // Date
    createdAt: any; // serverTimestamp()
}

export type AcademicProgram = {
  id: string;
  name: string;
  abbreviation: string;
  campusId: string;
  collegeId: string; // e.g., 'CET', 'CAS'
  level: 'Undergraduate' | 'Graduate' | 'TVET';
  isBoardProgram: boolean;
  isNewProgram: boolean; 
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
  sex: 'Male' | 'Female' | 'Others (LGBTQI++)';
  specializationAssignment?: string; 
};

export type GraduationOutcome = {
  majorId?: string; // New: Link to specialization
  year: number;
  semester: string;
  count: number;
  maleCount: number;
  femaleCount: number;
};

export type TracerOutcome = {
  majorId?: string; // New: Link to specialization
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
  reportLink?: string; 
};

export type BoardExamPerformance = {
  majorId?: string; // New: Link to specialization
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
  sex: 'Male' | 'Female' | 'Others (LGBTQI++)';
};

export type AccreditationRecommendation = {
    id: string;
    text: string;
    type: 'Mandatory' | 'Enhancement';
    assignedUnitIds: string[];
    status: 'Open' | 'In Progress' | 'Closed';
    additionalInfo?: string;
};

export type AccreditationRecord = {
    id: string;
    level: string; 
    typeOfVisit?: string;
    result?: string;
    components?: { id: string; name: string }[];
    dateOfSurvey?: string;
    statusValidityDate?: string;
    dateOfAward?: string;
    nextSchedule: string;
    nextScheduleYear?: number;
    nextScheduleMonth?: number;
    certificateLink?: string; 
    overallTaskForceHead?: string;
    taskForce?: string;
    areas?: AccreditationArea[];
    recommendations?: AccreditationRecommendation[];
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
  majorId: string; 
  revisionNumber: string;
  dateImplemented: string;
  isNotedByChed: boolean;
  notationProofLink?: string; 
  dateNoted?: string;
};

export type EnrollmentRecord = {
    id: string;
    majorId: string; // 'General' or specific specialization ID
    firstSemester: YearLevelEnrollment;
    secondSemester: YearLevelEnrollment;
    midYearTerm?: YearLevelEnrollment;
};

export type ProgramComplianceRecord = {
  id: string;
  programId: string;
  campusId: string;
  academicYear: number;
  ched: {
    copcStatus: 'With COPC' | 'No COPC' | 'In Progress';
    copcLink?: string; 
    copcAwardDate?: string; 
    boardApprovalMode?: 'sole' | 'per-major';
    boardApprovalLink?: string; 
    majorBoardApprovals?: { majorId: string; link: string }[]; 
    programCmoLink?: string; 
    rqatVisits?: RQATVisit[];
    closureResolutionLink?: string; 
    closureApprovalDate?: string; 
    closureReferendumNumber?: string; 
  };
  accreditationRecords?: AccreditationRecord[];
  curriculumRecords?: CurriculumRecord[];
  enrollmentRecords?: EnrollmentRecord[]; // New: Disaggregated enrollment
  faculty: {
    dean: FacultyLeadershipMember;
    hasAssociateDean?: boolean;
    associateDean?: FacultyLeadershipMember;
    programChair: FacultyLeadershipMember;
    members: ProgramFacultyMember[];
  };
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
  graduationRecords?: GraduationOutcome[];
  tracerRecords?: TracerOutcome[];
  boardPerformance?: BoardExamPerformance[];
  updatedAt: any;
  updatedBy: string;
};

export type QaAuditReport = {
    id: string;
    type: 'IQA' | 'EQA';
    title: string;
    startDate: any; 
    endDate: any; 
    googleDriveLink: string;
    campusIds: string[]; 
    eqaCategory?: string;
    certifyingBody?: string;
    standard: string;
    createdAt: any; 
};

export type GADInitiative = {
    id: string;
    title: string;
    description: string;
    campusId: string;
    unitId: string;
    year: number;
    budget: number;
    utilizedAmount: number;
    beneficiariesMale: number;
    beneficiariesFemale: number;
    status: 'Planned' | 'In Progress' | 'Completed' | 'Cancelled';
    createdAt: any;
    updatedAt: any;
};

export type GADMainstreamingChecklist = {
    id: string; // unitId-year
    unitId: string;
    year: number;
    scores: Record<string, boolean>;
    updatedAt: any;
};

export type EmployeeActivity = {
    id: string;
    userId: string;
    userName: string;
    unitId: string;
    campusId: string;
    date: any; // Timestamp
    startTime: string;
    endTime: string;
    activityParticular: string;
    status: 'Completed' | 'In Progress' | 'Open' | 'Postponed';
    output?: string;
    googleDriveLink?: string;
    remarks?: string;
    createdAt: any;
    updatedAt: any;
    isApproved?: boolean;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: any;
};

export type WfhActivity = {
    id: string;
    userId: string;
    userName: string;
    unitId: string;
    campusId: string;
    date: any; // Timestamp
    deliverables: string;
    accomplishment: string;
    status: 'Pending' | 'Verified';
    type: 'Teaching' | 'Non-Teaching';
    natureOfAppointment: string;
    teachingLoad?: string;
    subjectsTaught?: string;
    officeAssignment?: string;
    otherDesignations?: string;
    evidenceLink?: string;
    createdAt: any;
    updatedAt: any;
};
