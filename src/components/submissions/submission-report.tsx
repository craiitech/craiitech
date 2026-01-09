
'use client';

import type { Submission, User as AppUser } from '@/lib/types';
import { format } from 'date-fns';

interface SubmissionReportProps {
  user: AppUser;
  submissions: Submission[];
  campusName: string;
  cycle: string;
  year: number;
}

export function SubmissionReport({ user, submissions, campusName, cycle, year }: SubmissionReportProps) {
  return (
    <div>
      <div className="header">
        <h1>ROMBLON STATE UNIVERSITY</h1>
        <h2>QUALITY ASSURANCE OFFICE</h2>
        <h3>Updated as of {new Date().toLocaleDateString()}</h3>
      </div>

      <div className="user-info">
        <p><strong>UNIT:</strong> {user.unitId ? submissions.find(s => s.unitId === user.unitId)?.unitName || 'N/A' : 'N/A'}</p>
        <p><strong>CAMPUS:</strong> {campusName}</p>
      </div>

      <h3 className="report-title">
        SUBMISSION REPORT FOR {cycle.toUpperCase()} OF {year}
      </h3>

      <table>
        <thead>
          <tr>
            <th>SUBMITTED DOCUMENT</th>
            <th>LINK</th>
            <th>DATE SUBMITTED</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map(sub => (
            <tr key={sub.id}>
              <td>{sub.reportType}</td>
              <td><a href={sub.googleDriveLink} target="_blank" rel="noopener noreferrer">View File</a></td>
              <td>{format(sub.submissionDate, 'yyyy-MM-dd')}</td>
              <td style={{ textTransform: 'capitalize' }}>{sub.statusId}</td>
            </tr>
          ))}
          {submissions.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center' }}>No submissions found for this period.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="footer">
        <p>This is a system generated report no signature is required.</p>
      </div>
    </div>
  );
}
