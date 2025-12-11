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
  campusId: string;
  unitId: string;
  verified: boolean;
};

export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Submitted';

export type Submission = {
  id: string;
  userId: string;
  submissionDate: Date;
  googleDriveLink: string;
  cycleId: string;
  statusId: string;
  comments?: string;
};

export type Campus = {
    id: string;
    name: string;
    location: string;
}

export type Unit = {
    id: string;
    name: string;
    campusId: string;
}
