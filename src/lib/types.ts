

// This file can be used for mock data types, but for Firebase, 
// consider using Zod schemas and inferring types from them, 
// especially for a Firestore documents.

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
  name: string;
  year: number;
  startDate: any; // Can be Timestamp
  endDate: any; // Can be Timestamp
}
    

    