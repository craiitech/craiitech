

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

export type Campus = {
    id: string;
    name: string;
    location: string;
}

export type Unit = {
    id: string;
    name: string;
    campusIds?: string[]; // Changed from campusId to campusIds
}

export type CampusSetting = {
    id: string;
    announcement?: string;
}

    
