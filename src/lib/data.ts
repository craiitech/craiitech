import type { User, Submission, Role } from './types';

export const users: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@rsu.edu.ph', avatar: '/avatars/01.png', role: 'Admin', campus: 'Main', unit: 'Admin' },
  { id: '2', name: 'Alice Johnson', email: 'alice.j@rsu.edu.ph', avatar: '/avatars/02.png', role: 'Campus Director', campus: 'Main', unit: 'CET' },
  { id: '3', name: 'Bob Williams', email: 'bob.w@rsu.edu.ph', avatar: '/avatars/03.png', role: 'Campus ODIMO', campus: 'Main', unit: 'CAF' },
  { id: '4', name: 'Charlie Brown', email: 'charlie.b@rsu.edu.ph', avatar: '/avatars/04.png', role: 'Unit ODIMO', campus: 'Main', unit: 'CAS' },
  { id: '5', name: 'Diana Prince', email: 'diana.p@rsu.edu.ph', avatar: '/avatars/05.png', role: 'Employee', campus: 'Main', unit: 'CICT' },
  { id: '6', name: 'Eve Adams', email: 'eve.a@rsu.edu.ph', avatar: '/avatars/01.png', role: 'Employee', campus: 'Cajidiocan', unit: 'CTE' },
];

export const submissions: Submission[] = [
    {
        id: 'SUB001',
        title: 'Q1 Financial Report',
        submitter: { name: 'Diana Prince', id: '5' },
        submittedAt: '2024-05-01T10:00:00Z',
        status: 'Approved',
        cycle: 'First',
        googleDriveLink: 'https://docs.google.com/document/d/example1/edit',
    },
    {
        id: 'SUB002',
        title: 'CICT Performance Metrics',
        submitter: { name: 'Diana Prince', id: '5' },
        submittedAt: '2024-05-02T11:30:00Z',
        status: 'Pending',
        cycle: 'First',
        googleDriveLink: 'https://docs.google.com/spreadsheets/d/example2/edit',
    },
    {
        id: 'SUB003',
        title: 'CAS Mid-year Review',
        submitter: { name: 'Charlie Brown', id: '4' },
        submittedAt: '2024-05-03T14:00:00Z',
        status: 'Rejected',
        cycle: 'First',
        googleDriveLink: 'https://docs.google.com/presentation/d/example3/edit',
        comments: [
            {
                user: 'Alice Johnson',
                comment: 'Data on slide 5 is incomplete. Please revise and resubmit.',
                timestamp: '2024-05-04T09:00:00Z',
            },
        ],
    },
    {
        id: 'SUB004',
        title: 'Annual Research Symposium Plan',
        submitter: { name: 'Bob Williams', id: '3' },
        submittedAt: '2024-04-20T09:00:00Z',
        status: 'Approved',
        cycle: 'First',
        googleDriveLink: 'https://docs.google.com/document/d/example4/edit',
    },
    {
        id: 'SUB005',
        title: 'Cajidiocan Campus Enrollment Data',
        submitter: { name: 'Eve Adams', id: '6' },
        submittedAt: '2024-05-10T16:00:00Z',
        status: 'Submitted',
        cycle: 'First',
        googleDriveLink: 'https://docs.google.com/spreadsheets/d/example5/edit',
    },
];
