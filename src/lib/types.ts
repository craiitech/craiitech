// This file can be used for mock data types, but for Firebase, 
// consider using Zod schemas and inferring types from them, 
// especially for Firestore documents.

export type Role = 'Admin' | 'Campus Director' | 'Campus ODIMO' | 'Unit ODIMO' | 'Employee';

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  campus: string;
  unit: string;
};

export type Status = 'Pending' | 'Approved' | 'Rejected' | 'Submitted';

export type Submission = {
  id: string;
  title: string;
  submitter: Pick<User, 'name' | 'id'>;
  submittedAt: string;
  status: Status;
  cycle: 'First' | 'Final';
  googleDriveLink: string;
  comments?: {
    user: string;
    comment: string;
    timestamp: string;
  }[];
};
