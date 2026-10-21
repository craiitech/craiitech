export type Role = {
  id: string;
  name: string;
  description?: string;
  permissions?: Record<string, boolean>;
};

export type UserAccessibility = {
  highContrast?: boolean;
  dyslexicFont?: boolean;
  reducedMotion?: boolean;
  fontSize?: number;
  themeColor?: 'default' | 'blue' | 'green' | 'maroon' | 'gold';
};

export type PortfolioItem = {
  id: string;
  title: string;
  googleDriveLink: string;
  dateAcquired: string;
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
  unitName?: string; // denormalized
  verified: boolean;
  ndaAccepted?: boolean;
  lastSeen?: any;
  accessibility?: UserAccessibility;
  lastSeenVersion?: string; // Track the last changelog version seen by the user
  portfolios?: PortfolioItem[];
  // FIAMO-specific fields
  fiamoRole?: FiamoRole;
  workerTypeId?: string;
  workerTypeName?: string;
};

export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Submitted';

export type Comment = {
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: any; // serverTimestamp()
};

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
  siteDriveFolderId?: string;
  uploadedFileName?: string;
  uploadedViaSiteRepo?: boolean;
  isHardCopySubmission?: boolean;
  submissionNeedsEntry?: boolean;
  dataEntryCompleted?: boolean;
  dataEntryCompletedAt?: any;
  dataEntryCompletedBy?: string;
  dataEntryCompletedByName?: string;
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
  monitoringToolLink?: string; // Google Drive link of QAO-00-027-Monitoring Tool for ROR Treatment Plan
  isFinalAssessmentNA?: boolean; // Whether the final assessment is not applicable (Low Rating)
  cycleId?: 'first' | 'final'; // Submission cycle: 'first' or 'final'
  oapNo?: string;
  resourcesNeeded?: string;
  updates?: string;
  preparedBy?: string; // Unit Head
  approvedBy?: string; // VPAA/VPAF/VPREDI
  verification?: {
    status: 'Correct' | 'Incorrect' | 'Updated' | 'Not Updated' | 'Implemented' | 'Carried Forward';
    verifiedBy: string;
    verifiedAt: any;
    evidence?: string;
    carriedToRiskId?: string;
  };
  auditorRemarks?: string; // New: Granular auditor feedback
  auditorRemarksBy?: string;
  auditorRemarksAt?: any;

  // NEW: Enhanced monitoring & accountability fields
  reviewCycle?: 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual'; // Mandatory review frequency
  lastReviewedAt?: any; // Timestamp of last review
  nextReviewDue?: any; // Timestamp when next review is due
  reviewHistory?: ReviewEntry[]; // History of reviews

  // NEW: Escalation tracking
  originalRating?: string; // Rating at creation (for escalation detection)
  escalationHistory?: EscalationEntry[]; // Track rating changes over time
  isEscalated?: boolean; // Flag if risk has been escalated
  escalatedFromId?: string; // Reference to original risk if escalated

  // NEW: Reminder/notification tracking
  remindersSent?: number; // Count of reminders sent
  lastReminderSent?: any; // Timestamp of last reminder
  reminderFrequency?: 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly'; // For overdue risks

  // NEW: Auto-status progression
  autoStatusEnabled?: boolean; // Enable automatic status updates based on dates

  // Low-risk vigilance fields
  escalationTrigger?: string;
  reviewInterval?: string;

  createdAt: any; // serverTimestamp()
  updatedAt: any; // serverTimestamp()
};

// NEW: Supporting types for enhanced monitoring
export type ReviewEntry = {
  reviewedAt: any; // Timestamp
  reviewedBy: string;
  reviewedByName: string;
  statusAtReview: 'Open' | 'In Progress' | 'Closed';
  ratingAtReview: string;
  comments: string;
  nextReviewDue: any; // Next review date set by reviewer
};

export type EscalationEntry = {
  escalatedAt: any; // Timestamp
  escalatedBy: string;
  escalatedByName: string;
  previousRating: string;
  newRating: string;
  reason: string; // 'Automatic' | 'Manual Review' | 'Incident Triggered'
  previousMagnitude: number;
  newMagnitude: number;
};

export type RiskAlert = {
  id: string;
  riskId: string;
  unitId: string;
  campusId: string;
  type:
    'Deadline_Approaching' | 'Overdue' | 'Review_Due' | 'Escalation_Detected' | 'No_Progress' | 'Low_Risk_Monitoring';
  severity: 'Info' | 'Warning' | 'Critical';
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
  createdAt: any;
};

export type Campus = {
  id: string;
  name: string;
  location: string;
  submissionDriveFolderUrl?: string;
  submissionDriveFolderId?: string;
  submissionDriveUpdatedAt?: string;
};

export type UnitCategory = 'Academic' | 'Administrative' | 'Research' | 'Support';

export type Unit = {
  id: string;
  name: string;
  category?: UnitCategory;
  vicePresidentId?: string;
  campusIds?: string[];
  establishedYear?: number; // Academic/Calendar year the unit was established (units established >= selectedYear are exempt from prior year requirements)
  createdAt?: any;
  formsDriveLink?: string; // Admin-set Google Drive area for registered forms
  formsDriveRevision?: string;
  formsDriveUpdatedAt?: string;
  masterlistPdfLink?: string; // Admin-set Link for the PDF Preview
  masterlistRevision?: string;
  masterlistUpdatedAt?: string;
};

export type UnitOrgStructure = {
  id: string;
  unitId: string;
  unitName: string;
  campusId: string;
  year: number;
  cycleId: 'first' | 'final';
  googleDriveLink: string;
  revisionNumber: string; // e.g. "02"
  revisionDate: string; // ISO date string e.g. "2026-08-13"
  submittedBy: string; // user displayName
  submittedById: string;
  createdAt: any; // Firestore Timestamp
  isCarriedOver?: boolean; // true if auto-carried from First Cycle with no changes
};

export type CampusSetting = {
  id: string;
  announcement?: string;
  announcementEndsAt?: string;
  announcement2?: string;
  announcement2EndsAt?: string;
  formsDriveLink?: string;
  formsDriveRevision?: string;
  formsDriveUpdatedAt?: string;
  masterlistPdfLink?: string;
  masterlistRevision?: string;
  masterlistUpdatedAt?: string;
  submissionDriveFolderUrl?: string; // Admin-configured Google Drive folder for campus submissions
  submissionDriveFolderId?: string; // Extracted folder ID
  submissionDriveUpdatedAt?: string;
  googleScriptWebhookUrl?: string; // Global or campus-specific Google Apps Script Webhook URL
  // Archipelagic Intelligence (AQ) Settings
  archipelagicUniversityVision?: string;
  archipelagicUniversityMission?: string;
  archipelagicUniversityGoals?: string;
  archipelagicUniversityQualityPolicy?: string;
  // Institutional Home Dashboard Settings
  enableUnifiedHomeDashboard?: boolean;
  homeDashboardDefaultTab?: string;
  allowUserWorkspaceSwitch?: boolean;
};

export type HomeDashboardSettings = {
  enableUnifiedHomeDashboard: boolean;
  defaultTab?: string;
  allowUserWorkspaceSwitch?: boolean;
  headlineTitle?: string;
  headlineSubtitle?: string;
  updatedAt?: any;
  updatedBy?: string;
  updatedByName?: string;
};

export type OperationalPlanSubmissionMode = 'legacy_link' | 'structured_data';

export type SucOfficialLevel = 'Level I' | 'Level II' | 'Level III' | 'Level IV' | 'Level V';

export type SucInstitutionalProfile = {
  currentLevel: SucOfficialLevel;
  officialPoints?: number;
  conferredYear?: number;
  validityPeriod?: string; // e.g. "AY 2022–2025" or "Active"
  legalBasis?: string; // e.g. "DBM-CHED Joint Circular No. 1, s. 2016" or "BOR Resolution No. 45, s. 2022"
  conferredBy?: string; // e.g. "DBM-CHED Joint Evaluation Committee (JREC / NREC)"
  targetNextLevel?: SucOfficialLevel;
  targetYear?: number;
  evidenceDriveUrl?: string; // Link to official DBM-CHED certificate / documentation in Google Drive
  strategicVision?: string; // Narrative on goals and focal areas
  updatedAt?: any;
  updatedBy?: string;
  updatedByName?: string;
};

export type SystemSettings = {
  logoUrl?: string;
  operationalPlanMode?: OperationalPlanSubmissionMode;
  enableUnifiedHomeDashboard?: boolean;
  homeDashboardDefaultTab?: string;
  sucLevellingProfile?: SucInstitutionalProfile;
  updatedAt?: any;
  updatedBy?: string;
};

// SUC Levelling Types
export type SucKraId = 'KRA_1' | 'KRA_2' | 'KRA_3' | 'KRA_4';

export type SucLevellingCycleStatus = 'Draft' | 'DataCollection' | 'InternalReview' | 'Submitted' | 'Finalized';

export type SucLevellingCycle = {
  id: string;
  cycleName: string; // e.g. "AY 2024–2027 SUC Levelling Assessment"
  targetYearStart: number;
  targetYearEnd: number;
  status: SucLevellingCycleStatus;
  isFinalized: boolean;
  scoringCeilings?: {
    kra1Max: number;
    kra2Max: number;
    kra3Max: number;
    kra4Max: number;
  };
  totalPoints?: number;
  achievedLevel?: string;
  notes?: string;
  createdAt: any;
  updatedAt: any;
};

export type SucIndicator = {
  id: string;
  kraId: SucKraId;
  code: string;
  title: string;
  description: string;
  calculationType: 'TABLE_LOOKUP' | 'RATIO_PERCENT' | 'TIERED_POINTS' | 'DIRECT_VALUE';
  maxAllowablePoints: number;
  targetUnit: 'PERCENTAGE' | 'COUNT' | 'PESOS' | 'POINTS';
  requiresDriveEvidence: boolean;
  movDescription?: string;
};

export type SucMovDriveLink = {
  title: string;
  driveFolderUrl: string;
  fileId?: string;
  directViewLink?: string;
  mimeType?: string;
};

export type SucIndicatorSubmission = {
  id: string;
  cycleId: string;
  indicatorId: string;
  unitId: string;
  unitName?: string;
  campusId: string;
  campusName?: string;
  academicYear: number;
  numeratorValue: number;
  denominatorValue: number;
  rawMetricValue: number;
  selfAwardedPoints: number;
  validatedPoints?: number;
  externalPoints?: number;
  movDriveLinks: SucMovDriveLink[];
  validationStatus: 'Pending' | 'Verified' | 'Flagged' | 'Rejected';
  validatorRemarks?: string;
  validatedById?: string;
  validatedByName?: string;
  validatedAt?: any;
  createdAt: any;
  updatedAt: any;
};

export type SucLevelThreshold = {
  level: 'Level V' | 'Level IV' | 'Level III' | 'Level II' | 'Level I';
  title: string;
  minTotal: number;
  minKra1: number;
  minKra2: number;
  minKra3: number;
  minKra4: number;
  badgeClass: string;
  description: string;
};

export type SucKraScores = {
  kra1: number;
  kra2: number;
  kra3: number;
  kra4: number;
  total: number;
};

export type GadSettings = {
  leadershipUnitId?: string;
  isPublicEntryEnabled?: boolean;
  institutionalTotalBudget?: number;
  gadDirector?: string;
  updatedAt?: any;
  updatedBy?: string;
};

export type PbbSettings = {
  authorizedUnitIds?: string[];
  updatedAt?: any;
  updatedBy?: string;
};

export type CommunicationSettings = {
  authorizedUnitIds?: string[];
  updatedAt?: any;
  updatedBy?: string;
};

export type PbbSubmission = {
  id: string;
  unitId: string;
  unitName: string;
  campusId: string;
  campusName: string;
  year: number;
  submittedAt: any;
  title: string;
  googleLink: string;
  submittedBy: string;
  submittedByName: string;
};

export type BackupSettings = {
  targetDriveLink?: string;
  lastConfiguredAt?: any;
  lastConfiguredBy?: string;
};

export type CsmSettings = {
  managingUnitId?: string;
  csmDirector?: string;
  csmQualityHead?: string;
  csmCampusCoordinator?: string;
  updatedAt?: any;
  updatedBy?: string;
};

export type CsmResponse = {
  id?: string;
  visitorLogId: string;
  visitorName: string;
  sex: 'Male' | 'Female' | string;
  ageGroup: 'Below 20' | '19-under' | '20-34' | '35-49' | '50-64' | '65 and above' | '65-over' | string;
  clientType: 'Citizen' | 'Business' | 'Government' | 'STUDENT' | string;
  campusId: string;
  unitId: string;
  unitName: string;
  purpose: string;

  // Citizen's Charter Questions
  cc1: number; // 1-4 scale
  cc2: number; // 1-5 scale (or N/A)
  cc3: number; // 1-4 scale (or N/A)

  // Service Quality Dimensions (SQD) - ratings 1-5, or 0 for N/A
  sqd0: number; // Overall Satisfaction
  sqd1: number; // Responsiveness
  sqd2: number; // Reliability
  sqd3: number; // Access & Facilities
  sqd4: number; // Communication
  sqd5: number; // Costs
  sqd6: number; // Integrity
  sqd7: number; // Assurance
  sqd8: number; // Outcome

  comments?: string;
  createdAt: any;
};

export type CsmDeployment = {
  id: string;
  academicYear: number;
  cycleId: 'first' | 'final';
  isPublished: boolean;
  deployedAt: any;
  deployedBy: string;
  publishedUnitIds?: string[];
};

export type ActivityLog = {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details?: Record<string, any>;
  timestamp: any; // serverTimestamp()
};

export type Cycle = {
  id: string;
  name: 'first' | 'final';
  year: number;
  startDate: any; // Can be Timestamp
  endDate: any; // Timestamp
  submissionStartDate?: any; // Timestamp - when the submission window officially opens
};

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
};

export type ISOClause = {
  id: string;
  title: string;
  description: string;
};

export type AuditGroup = 'Management Processes' | 'Operation Processes' | 'Support Processes';

export type AuditPlanDocument = {
  name: string;
  link: string;
  communicationId?: string;
  communicationRefNum?: string;
  communicationSubject?: string;
};

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
  documents?: AuditPlanDocument[];
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
  iqaMethod?: 'Face to Face Audit' | 'Online / Remote Audit';
  documents?: AuditPlanDocument[];
};

export type AuditFinding = {
  id: string;
  auditScheduleId: string;
  isoClause: string;
  type: 'Compliance' | 'Observation for Improvement' | 'Non-Conformance' | 'Not Applicable' | '';
  description: string; // Used for general description or Compliance/OFI notes
  evidence: string;
  ncStatement?: string; // New: Formal statement for Non-Conformance
  createdAt: any; // serverTimestamp()
  authorId: string;
  verification?: {
    status: 'Implemented' | 'Carried Forward';
    verifiedBy: string;
    verifiedAt: any;
    evidence?: string;
    carriedToRiskId?: string;
  };
  linkedPreviousOFI?: string;
};

export type ClauseRevisit = {
  id: string;
  auditScheduleId: string;
  clauseId: string;
  clauseTitle: string;
  unitId: string;
  unitName: string;
  campusId: string;
  auditorId: string;
  auditorName: string;
  reason: string;
  scheduledDate: any;
  status: 'Pending' | 'Completed';
  createdAt: any;
  completedAt?: any;
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

export type ManualProcess = {
  processNumber: string; // e.g., "6.1"
  processTitle: string; // e.g., "Curriculum Review & Revision"
};

export type ProcedureManual = {
  id: string; // Same as unitId
  unitName: string;
  procedureNumber?: string;
  manualTitle?: string;
  numberOfProcesses?: number;
  processes?: ManualProcess[];
  revisionNumber?: string;
  revisionDate?: string;
  dateImplemented?: string;
  pageCount?: number;
  googleDriveLink?: string;
  status?: 'Updated' | 'Needs Revision' | 'Not Submitted' | string;
  copiedFromUnitId?: string;
  copiedFromUnitName?: string;
  updatedAt?: any; // serverTimestamp()
};

export type EomsPolicyManual = {
  id: string; // e.g., 'section-1'
  sectionNumber: number;
  title: string;
  googleDriveLink: string;
  revisionNumber: string;
  pageCount: number;
  executionDate: string;
  updatedAt: any; // serverTimestamp()
};

export type EomsAcademyTopic = {
  id: string;
  title: string;
  description: string;
  googleDriveLink: string;
  order: number;
  updatedAt?: any;
};

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
  verificationStatus?: 'Accepted' | 'Not Accepted' | 'Pending';
  verificationRemarks?: string;
};

export type CAREvidence = {
  title: string;
  url: string;
};

export type CARFollowUpNextAction =
  | 'For Verification'
  | 'For ReChecking'
  | 'Add More Actions'
  | 'For Closure Verification'
  | 'Continue Monitoring'
  | 'Others';

export type CARFollowUpLog = {
  result: string;
  verifiedBy: string;
  date: any; // Timestamp
  remarks?: string;
  nextAction?: CARFollowUpNextAction | string;
  nextActionDate?: any; // Timestamp or date for Validation of the selected action
};

export type CAREffectivenessAudit = {
  result: string;
  verifiedBy: string;
  date: any; // Timestamp
  action:
    | 'Effective'
    | 'Not Effective'
    | 'Close the NC'
    | 'Continue Monitoring the NC'
    | 'Provide More Actions to Address the NC';
  remarks?: string;
};

export type CARAssignedUnit = {
  id: string;
  campusId: string;
  unitId: string;
  unitName?: string;
  unitHead?: string;
  status?: 'Open' | 'In Progress' | 'Awaiting Response/Update' | 'For Final Verification' | 'Closed';
  needsVerification?: boolean;
  rootCauseAnalysis?: string;
  actionSteps?: CARActionStep[];
  followUpLogs?: CARFollowUpLog[];
  effectivenessAudits?: CAREffectivenessAudit[];
  adminFeedback?: string;
};

export type CorrectiveActionRequest = {
  id: string;
  auditType?: 'IQA' | 'EQA';
  findingId?: string; // New: Link to source audit finding
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
  assignedUnits?: CARAssignedUnit[];
  descriptionOfNonconformance: string;
  requestDate: any; // Timestamp
  preparedBy: string;
  approvedBy: string;

  rootCauseAnalysis?: string;
  actionSteps?: CARActionStep[];
  evidences?: CAREvidence[];

  // Decoupled Oversight Sections
  followUpLogs?: CARFollowUpLog[];
  effectivenessAudits?: CAREffectivenessAudit[];
  comments?: Comment[];

  status: 'Open' | 'In Progress' | 'Awaiting Response/Update' | 'For Final Verification' | 'Closed';
  needsVerification?: boolean; // New flag for tracking unit updates
  nextVerificationDate?: any; // New: Date for scheduling follow-up/reminders
  nextActionDate?: any; // Date for upcoming action milestone
  lastUpdatedBy?: string;
  lastUpdatedByName?: string;
  lastUpdatedByRole?: string;
  lastNotifiedAt?: any;
  lastNotifiedBy?: string;
  createdAt: any;
  updatedAt: any;
};

export type EqaOfiStatus = 'Pending Action' | 'In Progress' | 'Completed' | 'Verified by QAO';

export type EqaOfiTargetUnit = {
  id: string;
  unitId: string;
  unitName: string;
  campusId: string;
  actionTaken?: string;
  status?: EqaOfiStatus;
  targetDate?: any;
  evidenceLink?: string;
  updatedAt?: any;
};

export type EqaOfiMonitoring = {
  id: string;
  eqaReportId?: string;
  auditDate: any; // Timestamp or Date string
  certifyingBody?: string;
  standard?: string;
  ofiStatement: string;
  remarks?: string;
  targetUnits: EqaOfiTargetUnit[];
  createdAt: any;
  updatedAt: any;
};

export type Signatories = {
  qaoDirector: string;
  qmsHead: string;
  accreditationHead: string;
  gadDirector?: string;
  universityPresident?: string;
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
  revisionDate?: string;
  requestId?: string;
  createdAt: any;
  updatedAt?: any;
};

export type UnitFormRequestStatus =
  'Submitted' | 'QA Review' | 'Returned for Correction' | 'Endorsement for Approval' | 'Approved & Registered';

export type UnitFormRequestComment = {
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
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
  presidentialApprovalLink?: string; // Final evidence of authority
  isDraft?: boolean; // New: Draft flag for preliminary content check
  controlNumber?: string; // New: Standardized control number for the request
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
};

export type CrossUnitFormRequest = {
  id: string;
  formId: string;
  formCode: string;
  formName: string;
  formRevision?: string;
  googleDriveLink: string;
  // Requester details
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  requesterUnitId: string;
  requesterUnitName: string;
  requesterCampusId?: string;
  requesterCampusName?: string;
  // Form owner (provider) details
  ownerUnitId: string;
  ownerUnitName: string;
  ownerCampusId?: string;
  ownerCampusName?: string;
  // Exchange purpose & audit metadata
  purpose: string;
  status: 'Fulfilled';
  downloadDate: string; // YYYY-MM-DD
  createdAt: any; // serverTimestamp()
};

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

export type SectorHeadcount = {
  male: number;
  female: number;
};

export type EnrollmentStats = {
  male: number;
  female: number;
  total: number;
  specialNeeds: number;
  sectors?: {
    [key in GADSector]?: SectorHeadcount;
  };
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
  status: 'Open' | 'In Progress' | 'Closed' | 'Move to the Official Current Level';
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
  academicYear?: number | string; // e.g. 2024 or "2024-2025"
  majorId: string; // 'General' or specific specialization ID
  firstSemester: YearLevelEnrollment;
  secondSemester: YearLevelEnrollment;
  midYearTerm?: YearLevelEnrollment;
};

export type ProgramComplianceRecord = {
  id: string;
  programId: string;
  campusId: string;
  unitId?: string;
  academicYear: number;
  ched: {
    copcStatus: 'With COPC' | 'No COPC' | 'In Progress';
    copcLink?: string;
    copcAwardDate?: string;
    majorCopcs?: {
      majorId: string;
      copcStatus: 'With COPC' | 'No COPC' | 'In Progress';
      copcLink?: string;
      copcAwardDate?: string;
    }[];
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

export type ChedAnnouncement = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  additionalInstructions?: string;
  googleDriveLink?: string;
  createdAt: any;
  updatedAt: any;
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

// Sector definition for GAD SDD
export type GADSector =
  'Solo Parent' | 'PWD' | 'Senior Citizen' | 'Youth/Student' | 'Employee' | 'LGBTQA++' | 'Indigenous People';

export type GADCategory = 'CLIENT-FOCUSED ACTIVITIES' | 'ORGANIZATION-FOCUSED ACTIVITIES' | 'ATTRIBUTED PROGRAM';
export type GADImplementationStatus = 'Done' | 'Partially Done' | 'On-going' | 'Yet to be implemented' | 'Not Done';

// GAD Plan & Budget types
export type GADPlan = {
  id: string;
  year: number;
  unitId: string;
  campusId: string;
  genderIssue: string;
  causeOfIssue: string;
  objective: string;
  pap: string;
  performanceIndicators: string;
  targets: string;
  budget: number;
  sourceOfBudget: string;
  responsibleOffice: string;
  status: 'Draft' | 'Finalized';
  category?: GADCategory;
  hgdgScore?: number;
  hgdgAttributionRate?: number;
  psCost?: number;
  mooeCost?: number;
  coCost?: number;
  gadActivityName?: string;
  implementationStatus?: GADImplementationStatus;
  actualResult?: string;
  actualCost?: number;
  varianceRemarks?: string;
  driveLink?: string;
  createdAt: any;
  updatedAt: any;
};

export type GADActivity = {
  id: string;
  activityId: string; // Official RSU Activity Code
  activityName: string;
  date: any; // Timestamp
  year: number;
  implementingUnitId: string;
  campusId: string;
  participants: {
    male: number;
    female: number;
    sectors: {
      [key in GADSector]?: {
        male: number;
        female: number;
      };
    };
  };
  planId?: string; // Optional link to a GPB entry for AR reporting
  actualBudgetUsed?: number;
  psCost?: number;
  mooeCost?: number;
  coCost?: number;
  actualOutput?: string;
  varianceAnalysis?: string;
  implementationStatus?: GADImplementationStatus;
  driveLink?: string; // Google Drive link for documentation and evidence
  deviceFingerprint: string; // For unauthenticated identification
  createdAt: any;
};

export type UnitPersonnelCensus = {
  id: string; // unitId-year
  unitId: string;
  campusId: string;
  year: number;
  teaching: {
    male: number;
    female: number;
    sectors: { [key in GADSector]?: SectorHeadcount };
  };
  nonTeaching: {
    male: number;
    female: number;
    sectors: { [key in GADSector]?: SectorHeadcount };
  };
  updatedAt: any;
  updatedBy: string;
};

export type Employee = {
  id: string;
  name: string;
  sex: 'Male' | 'Female' | 'LGBTQA+';
  type: 'Teaching' | 'Non-Teaching';
  sectors: GADSector[];
  unitId: string;
  campusId: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
};

// --- QA REPORTS MODULE TYPES ---

export type MRAttendee = {
  id: string;
  name: string;
  role: string;
  unitId?: string;
  campusId?: string;
  email?: string;
  status: 'Invited' | 'Confirmed' | 'Attended' | 'Excused';
};

export type MRAgendaPart = {
  id: string;
  partNumber: number;
  title: string;
  clause: string;
  description: string;
  assignedReporters: string;
  unitId?: string;
  campusId?: string;
  driveFolderLink?: string;
  durationMinutes?: number;
  status?: 'Pending' | 'Uploaded' | 'Presented';
};

export type ManagementReview = {
  id: string;
  title: string;
  startDate: any; // Timestamp
  endDate: any; // Timestamp
  minutesLink: string;
  campusId: string;
  createdAt: any; // Timestamp
  year?: number;
  academicYear?: string;
  theme?: string;
  venue?: string;
  modality?: 'Face-to-Face' | 'Online' | 'Hybrid';
  meetingLink?: string;
  masterDriveLink?: string;
  status?: 'Scheduled' | 'In Progress' | 'Completed' | 'Archived';
  attendees?: MRAttendee[];
  agendaParts?: MRAgendaPart[];
  conductNotes?: string;
  eomsChangesNeeded?: string;
  resourceNeeds?: string;
  opportunitiesForImprovement?: string;
  updatedAt?: any; // Timestamp
};

export type MRAssignment = {
  campusId: string;
  unitId: string;
};

export type ManagementReviewOutputStatus = 'Open' | 'On-going' | 'Submit for Closure Verification' | 'Closed';

export type ActionEntry = {
  id: string;
  description: string;
  implementationDate: any; // Timestamp
  googleDriveLink?: string;
  submittedBy: string;
  submittedById: string;
  submittedAt: any; // Timestamp

  // Unit and Campus tracking
  campusId?: string;
  campusName?: string;
  unitId?: string;
  unitName?: string;
  actionStatus?: 'In Progress' | 'Completed' | 'Pending Verification';

  // Admin confirmation
  isConfirmed?: boolean;
  confirmationRemarks?: string;
  confirmationDate?: any; // Timestamp
  confirmedBy?: string;
  confirmedById?: string;
};

export type ManagementReviewOutput = {
  id: string;
  mrId: string; // Linked to ManagementReview
  description: string;
  initiator: string;
  assignments: MRAssignment[];
  concernedUnitIds: string[]; // Legacy - kept for backward compatibility if needed
  campusIds: string[]; // Legacy - kept for backward compatibility if needed
  actionPlan?: string;
  followUpDate: any; // Timestamp
  followUpRemarks?: string;
  status: ManagementReviewOutputStatus;
  createdAt: any; // Timestamp
  actionDate?: any; // New - when unit executed action
  actionTakenBy?: string; // New - who executed action
  lineNumber?: string; // Line number from MR minutes

  // Verification Fields (Admin Only)
  verificationRemarks?: string;
  verificationDate?: any; // Timestamp
  verifiedBy?: string;

  // New: Multiple action entries for follow-up tracking
  actionEntries?: ActionEntry[];
};

export type EvaluationCycle = {
  id: string;
  academicYear: string;
  semester: string;
  type: string;
  startDate: string;
  endDate: string;
  studentWeight: number;
  supervisorWeight: number;
  status: 'Active' | 'Completed' | 'Draft' | string;
};

export type ComputedResult = {
  id: string;
  facultyId: string;
  finalScore: number;
  interpretation: string;
  studentMean: number;
  supervisorMean: number;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  facultyId: string;
  enrolledStudentIds?: string[];
};

export type ProcedureRevisionRequestStatus =
  'Submitted' | 'Returned for Revision' | 'Rejected' | 'Awaiting Presidential Approval' | 'Approved & Registered';

export type ProcedureRevisionRequestComment = {
  text: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  createdAt: any;
};

export type RevisedPart = {
  part: string;
  itemNumber: string;
  itemContents: string;
};

export type ProcedureRevisionRequest = {
  id: string;
  unitId: string;
  campusId: string;
  unitName: string;
  submitterId: string;
  submitterName: string;
  requestType?: 'New' | 'Revision';
  scannedDRRFLink: string;
  revisedManualDocxLink: string;
  approvedDRRFLink?: string;
  controlNumber?: string;
  revisedParts: RevisedPart[];
  status: ProcedureRevisionRequestStatus;
  comments: ProcedureRevisionRequestComment[];
  createdAt: any;
  updatedAt: any;
};

// --- COMMUNICATIONS HUB TYPES (ISO 21001:2025 CLAUSE 7.4) ---

export type CommunicationKind =
  | 'Memorandum Order'
  | 'Office Order'
  | 'Office Memorandum'
  | 'Communication Letter / Request'
  | 'Invitation'
  | 'Transmittal Document';

export type CommunicationRecipientType =
  'unit' | 'campus' | 'individual' | 'all' | 'external' | 'academic-units' | 'vp-cluster';

export type CommunicationScope = 'Internal' | 'External';

export type CommunicationActionType =
  'For Information' | 'For Action / Compliance' | 'For Decision / Approval' | 'For Feedback / Consultation';

export type CommunicationUrgency = 'Routine' | 'Urgent' | 'Time-Critical';

export type CommunicationTargetAudience =
  | 'All Stakeholders'
  | 'Learners & Students'
  | 'Faculty & Academic Staff'
  | 'Administrative Personnel'
  | 'Campus / Unit Heads'
  | 'External Regulators & Partners';

export type Communication = {
  id: string;
  kind: CommunicationKind;
  subject: string;
  driveLink: string | null;
  createdAt: any;
  manual: boolean;
  readBy: string[];
  senderUnitId?: string;
  senderRefNum?: string;
  recipientType?: CommunicationRecipientType;
  recipientIds?: string[];
  recipientRefNums?: Record<string, string>;
  toText: string;
  senderText: string;
  manualType?: 'incoming' | 'outgoing';
  senderName?: string;
  // ISO 21001:2025 Clause 7.4 Metadata
  communicationScope?: CommunicationScope;
  actionType?: CommunicationActionType;
  urgencyLevel?: CommunicationUrgency;
  targetAudience?: CommunicationTargetAudience;
  complianceDeadline?: string;
  actionStatus?: 'Pending Action' | 'Under Action' | 'Complied / Closed' | 'For Information Only';
  isUniversityDocument?: boolean;
  universityDocumentId?: string;
};

// --- UNIVERSITY DOCUMENTS REPOSITORY TYPES ---

export type UniversityDocument = {
  id: string;
  title: string;
  releaseDate: string; // "YYYY-MM-DD"
  googleDriveLink: string;
  category?: string; // e.g. 'Memorandum Order', 'Office Order', 'Policy & Guidelines', 'Board Resolution', 'Transmittal Document', 'General'
  description?: string;
  uploadedBy?: string;
  uploadedByRole?: string;
  createdAt: any;
  updatedAt?: any;
  sourceCommunicationId?: string; // If imported/toggled from communication
  sourceCommunicationRefNum?: string;
};

// --- UNIT ACTIVITY ATTENDANCE & DEVICE BINDING TYPES ---

export type ActivitySession = {
  id: string;
  date: string;
  label: string;
  sessionType: 'AM' | 'PM' | 'WHOLE_DAY' | 'custom';
  requiresLogout: boolean;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
};

export type EvaluationStrategy = {
  requirePin: boolean;
  pinCode: string;
  feedbackFocus: string[]; // e.g. ['objectives', 'speaker', 'venue', 'food', 'materials', 'overall']
  formMode: 'open' | 'strict';
};

export type AttendanceActivity = {
  id: string;
  name: string;
  startDateTime: any; // Timestamp
  endDateTime: any; // Timestamp
  lateThresholdMinutes: number;
  requiresLogout: boolean; // true = Login+Logout mode, false = Login Only
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  unitId: string;
  campusId: string;
  createdAt: any; // Timestamp
  createdBy: string;
  documents?: { description: string; googleDriveLink: string }[];
  sessions?: ActivitySession[];
  evaluationStrategy?: EvaluationStrategy;
  attendanceOtpCode?: string;
  attendanceOtpUpdatedAt?: any;
  activeSessionId?: string;
};

export type DeviceBinding = {
  id: string; // deviceFingerprint
  userId: string;
  userName: string;
  unitId: string;
  unitName: string;
  boundAt: any; // Timestamp
  userAgent: string;
  contactNumber?: string;
  sex?: string;
  role: 'employee' | 'student' | 'stakeholder';
};

export type ActivityAttendanceLog = {
  id: string; // activityId_userId or activityId_sessionId_userId
  activityId: string;
  userId: string;
  userName: string;
  unitId: string;
  unitName: string;
  campusId?: string;
  campusName?: string;
  deviceFingerprint: string;
  scannedAt: any; // Login Timestamp
  logoutAt?: any; // Logout Timestamp (only when requiresLogout=true)
  status: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' | 'REJECTED';
  remarks?: string;
  contactNumber?: string;
  sex?: string;
  sessionId?: string;
  sessionLabel?: string;
  synced?: boolean;
  _sig?: string;
};

export type ActivityEvaluation = {
  id: string;
  activityId: string;
  participantName?: string;
  participantContact?: string;
  participantOffice?: string;
  participantPosition?: string;
  ratingObjectives?: number;
  ratingSpeaker?: number;
  ratingTopic?: number; // Sub-criteria under Speaker & Facilitator for the Topic
  ratingPerfQuality?: number; // Quality of Delivery of Service
  ratingPerfTimeliness?: number; // Timeliness of Service
  ratingPerfStaff?: number; // Staff Behavior
  ratingVenue?: number;
  ratingFacility?: number; // Facility Quality
  ratingFood?: number;
  ratingMaterials?: number;
  ratingOverall?: number;

  // Per-category qualitative comments
  commentsObjectives?: string;
  commentsSpeaker?: string;
  commentsPerfQuality?: string;
  commentsPerfTimeliness?: string;
  commentsPerfStaff?: string;
  commentsVenue?: string;
  commentsFacility?: string;
  commentsFood?: string;
  commentsMaterials?: string;
  commentsOverall?: string;
  comments: string; // fallback or general comments

  // Open-ended qualitative answers
  ansTakeaways?: string;
  ansExpectations?: string;
  ansFeelings?: string;
  ansValuable?: string;
  ansMissed?: string;
  ansChange?: string;
  ansSuggestions?: string;

  submittedAt: any; // Timestamp
};

// ============================================================
// KPI & OKR Types
// ============================================================

export type KpiCategory =
  | 'eoms_compliance'
  | 'risk_management'
  | 'audit_car'
  | 'academic_programs'
  | 'gad'
  | 'csm_service_quality'
  | 'system_operations'
  | 'faculty_evaluation'
  | 'program_accreditation'
  | 'Program Accreditation';

export type KpiThreshold = {
  good: number;
  satisfactory: number;
  poor: number;
  direction: 'higher_is_better' | 'lower_is_better';
};

export type KpiDefinition = {
  id: string;
  name: string;
  description: string;
  category: KpiCategory;
  formula: string;
  dataSource: string;
  unit: string;
  thresholds: KpiThreshold;
  defaultTarget: number;
  weight: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
};

export type KpiSnapshot = {
  id: string;
  kpiId: string;
  kpiName: string;
  entityType: 'institution' | 'campus' | 'unit';
  entityId: string;
  entityName: string;
  period: string;
  value: number;
  target: number;
  status: 'good' | 'satisfactory' | 'poor';
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  timestamp: any;
};

export type KpiAlert = {
  id: string;
  kpiId: string;
  kpiName: string;
  entityType: string;
  entityId: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
  createdAt: any;
};

export type OkrObjective = {
  id: string;
  title: string;
  description: string;
  entityType: 'institution' | 'campus' | 'unit' | 'individual';
  entityId: string;
  year: number;
  quarter: number;
  ownerId: string;
  ownerName: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  parentObjectiveId?: string;
  confidenceScore?: number;
  progressPercentage?: number;
  createdAt: any;
  updatedAt: any;
};

export type OkrKeyResult = {
  id: string;
  objectiveId: string;
  title: string;
  type: 'metric' | 'binary' | 'milestone';
  startingValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  weight: number;
  ownerId: string;
  ownerName: string;
  lastUpdated?: any;
  createdAt: any;
};

export type OkrCheckIn = {
  id: string;
  krId: string;
  objectiveId: string;
  value: number;
  confidence: number;
  comment: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: any;
};

// ============================================================
// FIAMO Monitoring Types
// ============================================================

export type FiamoRole =
  'Unit Coordinator' | 'Unit ODIMO' | 'VPAF' | 'FIAMO Staff' | 'Unit Head' | 'Driver/Operator/Mechanic';

export type RepairCategory = 'Ceiling' | 'Roofing' | 'ComfortRoom' | 'Walls' | 'Other';

export type RepairRequestStatus = 'Submitted' | 'Reviewed' | 'Assigned' | 'InProgress' | 'Completed' | 'Filed';

export type FiamoActivityLogType =
  | 'repair_request_created'
  | 'repair_request_reviewed'
  | 'repair_request_assigned'
  | 'repair_request_started'
  | 'repair_request_completed'
  | 'repair_request_approved'
  | 'repair_request_filed'
  | 'repair_request_rejected'
  | 'evidence_submitted'
  | 'worker_type_created'
  | 'worker_type_updated'
  | 'evidence_type_created'
  | 'evidence_type_updated';

export interface RepairRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  category: RepairCategory;
  description: string;
  location: string;
  status: RepairRequestStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedWorkerTypeId?: string;
  assignedWorkerTypeName?: string;
  programOfWorkRef?: string;
  completionNotes?: string;
  photos?: string[];
  evidenceSubmitted?: RepairCompletionEvidence[];
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: any;
  createdAt: any;
  reviewedAt?: any;
  assignedAt?: any;
  startedAt?: any;
  completedAt?: any;
  filedAt?: any;
  unitId: string;
  campusId: string;
}

export interface RepairCompletionEvidence {
  evidenceTypeId: string;
  evidenceTypeLabel: string;
  evidenceCategory: 'photo' | 'document' | 'checklist' | 'receipt' | 'signoff';
  fileUrl?: string;
  remarks?: string;
  submittedAt: any;
  submittedBy: string;
  submittedByName: string;
}

export interface FiamoEvidenceType {
  id: string;
  label: string;
  description: string;
  category: 'photo' | 'document' | 'checklist' | 'receipt' | 'signoff';
  isRequired: boolean;
  sortOrder: number;
  campusId: string;
  unitId: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

export interface FiamoWorkerType {
  id: string;
  name: string;
  description: string;
  unitId: string;
  unitName?: string;
  campusId: string;
  requiredEvidenceTypeIds: string[];
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

export interface FiamoActivityLog {
  id: string;
  type: FiamoActivityLogType;
  module: 'RepairRequest' | 'WorkerType' | 'EvidenceType';
  recordId: string;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  details?: Record<string, any>;
  timestamp: any;
  campusId: string;
  unitId: string;
}

export interface FiamoCampusPersonnel {
  coordinatorIds: string[];
  coordinatorNames: string[];
  odimoIds: string[];
  odimoNames: string[];
  staffIds: string[];
}

export interface FiamoSettings {
  enabled: boolean;
  officeName: string;
  officeUnitId?: string;
  officeUnitName?: string;
  fiamoAdminId?: string;
  fiamoAdminName?: string;
  directorId?: string;
  directorName?: string;
  coordinatorIds: string[];
  coordinatorNames: string[];
  odimoIds: string[];
  odimoNames: string[];
  vpafIds: string[];
  vpafNames: string[];
  staffIds: string[];
  campusPersonnel?: Record<string, FiamoCampusPersonnel>;
  campuses: string[];
  units: string[];
  notificationChannels: ('in-app' | 'email' | 'sms')[];
  presidentApprovalMode: 'digital' | 'pdf_upload';
  updatedAt: any;
  updatedBy: string;
}

// ============================================================
// OPERATIONAL PLAN (FORM QAO-01-025) TYPES
// ============================================================

export type VpStrategicGoal = {
  id: string;
  year: number;
  vpCluster: 'VPAA' | 'VPAF' | 'VPREDI' | 'OVPSAS' | 'OVP' | 'General' | string;
  vpOfficeName?: string;
  vpUserId?: string;
  vpUserName?: string;
  title: string;
  description?: string;
  targetMetric?: string;
  qualityObjective?: string;
  sucLevellingKra?: string;
  archipelagicPillar?: string;
  tenPointAgenda?: string;
  tenPointAgendas?: string[];
  isActive: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: any;
  updatedAt?: any;
};

export type OperationalPlanStatus = 'Draft' | 'Submitted' | 'NeedsRevision' | 'Approved';

export type OperationalPlanDocument = {
  id: string;
  unitId: string;
  unitName: string;
  campusId: string;
  year: number;
  cycleId: 'first' | 'final';
  status: OperationalPlanStatus;
  opControlNumber?: string; // e.g. "QAO-01-025-2026-ENG-01"
  preparedById: string;
  preparedByName: string;
  preparedAt: any;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: any;
  feedbackNotes?: string;
  totalBudget?: number;
  totalTasks?: number;
  achievementRate?: number;
  swotStatus?: 'updated' | 'retained';
  nedStatus?: 'updated' | 'retained';
  // Quality Objectives Monitoring Form Fields
  baselineData?: string;
  policyIndicator?: string;
  unitQualityObjective?: string;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedByTitle?: string;
  preparedByTitle?: string;
  approvedByTitle?: string;
  analysisBelowTarget?: string;
  problemsEncountered?: string;
  createdAt: any;
  updatedAt: any;
};

export type OperationalPlanItem = {
  id: string;
  planId: string;
  unitId: string;
  year: number;
  sortOrder: number;
  // Baseline fields (IMMUTABLE ONCE APPROVED)
  vpObjectiveId?: string;
  vpObjectiveTitle?: string;
  objective: string;
  tasks: string;
  timelineStart: string;
  timelineEnd: string;
  personsResponsible: string;
  resources?: string;
  budget: number;
  successIndicator: string;
  targetMetricValue?: number;
  targetMetricUnit?: string;
  sucLevellingKra?: string;
  archipelagicPillar?: string;
  tenPointAgenda?: string;
  tenPointAgendas?: string[];
  qualityObjective?: string;
  isBaselineLocked: boolean;
  // Progress/Updates & Remarks (Editable in Final Cycle)
  progressUpdates?: string;
  actualMetricValue?: number;
  remarks?: string;
  movDriveLink?: string;
  // Performance Metrics
  isCompleted?: boolean;
  attainmentPercentage?: number;
  status?: string;
  createdAt: any;
  updatedAt?: any;
};

export type QualityObjectiveItem = {
  id: string;
  planId: string;
  unitId: string;
  year: number;
  cycleId: 'first' | 'final';
  objectiveText: string;
  taskText: string;
  targetIndicator: string;
  activeMonths: number[]; // 1 = Jan, 12 = Dec
  actualMonths?: number[]; // Months where activity was actually conducted
  inCharge?: string; // e.g. QA UNIT / Assigned Office
  resourcesNeeded?: string; // e.g. Human Resource / Budget / Supplies & Materials
  quarterlyMilestones?: {
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
  responsiblePerson: string;
  status: 'Pending' | 'Ongoing' | 'Achieved' | 'Delayed';
  actualOutput?: string;
  movLink?: string;
  remarks?: string;
  attainmentPercentage?: number; // 0 to 100%
  monthlyAccomplishments?: Record<number, MonthlyAccomplishmentEntry>;
  sucLevellingKra?: string;
  archipelagicPillar?: string;
  tenPointAgenda?: string;
  tenPointAgendas?: string[];
  qualityObjective?: string;
  opItemId?: string;
  createdAt: any;
  updatedAt?: any;
};

export type MonthlyAccomplishmentEntry = {
  implemented?: boolean; // whether activity was actually implemented during this month
  completed?: boolean;
  notes?: string; // unique report / accomplishment narrative for this month
  output?: string; // milestone / deliverable output produced
  attainment?: number; // 0 - 100%
  evidenceLink?: string; // Google Drive or direct URL evidence for this month
  evidenceName?: string; // Descriptive title / label of evidence document
  reportedBy?: string; // Name of person who logged the accomplishment
  date?: string; // ISO date string of update
};

// ============================================================
// SWOT ANALYSIS (FORM QAO-01-001) & INTERESTED PARTIES (FORM QAO-01-003)
// ============================================================

export type SwotAnalysisItem = {
  id: string;
  planId: string;
  unitId: string;
  year: number;
  focusArea: string;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  createdAt: any;
  updatedAt?: any;
};

export type SwotMetadata = {
  id: string;
  unitId: string;
  year: number;
  mission: string;
  vision: string;
  qualityPolicy: string;
  saNo?: string;
  updatedAt?: any;
};

export type NeedExpectationPair = {
  need: string;
  expectation: string;
};

export type InterestedPartyItem = {
  id: string;
  planId: string;
  unitId: string;
  year: number;
  partyName: string;
  needs: string;
  expectations: string;
  pairs?: NeedExpectationPair[];
  createdAt: any;
  updatedAt?: any;
};

// ============================================================
// 10-POINT AGENDA SETTINGS (ARCHIPELAGIC INTELLIGENCE - AQ)
// ============================================================

export type TenPointAgendaItem = {
  code: string;
  title: string;
  description: string;
};

export type TenPointAgendaSettings = {
  items: TenPointAgendaItem[];
  updatedAt?: any;
  updatedBy?: string;
  updatedByName?: string;
};

export type ArchipelagicStatements = {
  vision?: string;
  mission?: string;
  qualityPolicy?: string;
  updatedAt?: any;
  updatedBy?: string;
  updatedByName?: string;
};
