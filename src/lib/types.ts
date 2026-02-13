
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

export type Unit = {
    id: string;
    name: string;
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
  endDate: any; // Can be Timestamp
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
    auditorId: string;
    auditorName: string;
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
    type: 'Non-Conformance' | 'Observation for Improvement' | 'Commendation';
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
  officerInCharge?: string;
  monitorId: string;
  monitorName: string;
  observations: ObservationItem[];
  generalRemarks?: string;
  createdAt: any; // Timestamp
};

// --- ACADEMIC PROGRAM MONITORING TYPES ---

export type AcademicProgram = {
  id: string;
  name: string;
  abbreviation: string;
  campusId: string;
  collegeId: string; // e.g., 'CET', 'CAS'
  level: 'Undergraduate' | 'Graduate' | 'TVET';
  isActive: boolean;
  createdAt: any;
};

export type FacultyAlignment = 'Aligned' | 'Not Aligned' | 'N/A';
export type FacultyCategory = 'Core' | 'Professional Special' | 'General Education' | 'Staff';

export type ProgramFacultyMember = {
  id: string;
  name: string;
  highestEducation: string;
  category: FacultyCategory;
  isAlignedWithCMO: FacultyAlignment;
};

export type ProgramComplianceRecord = {
  id: string;
  programId: string;
  campusId: string;
  academicYear: number;
  
  // CHED Compliance
  ched: {
    copcStatus: 'With COPC' | 'No COPC' | 'In Progress';
    copcLink?: string; // GDrive PDF
    contentNoted: boolean;
    contentNotedLink?: string; // GDrive PDF
    rqatVisit?: {
      date: any;
      result: string;
      comments: string;
      nonCompliances: string;
    };
  };

  // Accreditation
  accreditation: {
    level: string; // Level 1, Level 2, etc.
    dateOfAward: any;
    nextSchedule: any;
    certificateLink?: string; // GDrive PDF
  };

  // Curriculum
  curriculum: {
    revisionNumber: string;
    dateImplemented: any;
    isNotedByChed: boolean;
    cmoLink?: string; // GDrive PDF (Program CMO)
  };

  // Faculty/Staff
  faculty: {
    dean: {
      name: string;
      highestEducation: string;
      isAlignedWithCMO: FacultyAlignment;
    };
    programChair: {
      name: string;
      highestEducation: string;
      isAlignedWithCMO: FacultyAlignment;
    };
    members: ProgramFacultyMember[];
  };

  // Student Stats
  stats: {
    enrollment: {
      firstYear: number;
      secondYear: number;
      thirdYear: number;
      fourthYear: number;
      fifthYear?: number;
    };
    graduationCount: number;
  };

  // Board Performance
  boardPerformance?: {
    examDate: any;
    firstTakersPassRate: number;
    retakersPassRate: number;
    overallPassRate: number;
    nationalPassingRate: number;
  };

  // Tracer Data
  tracer: {
    totalGraduates: number;
    tracedCount: number;
    employmentRate: number; // calculated %
  };

  updatedAt: any;
  updatedBy: string;
};
