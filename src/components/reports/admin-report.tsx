
'use client';

import type { Submission, Campus, Unit } from '@/lib/types';

interface AdminReportProps {
  submissions: Submission[];
  campuses: Campus[];
  units: Unit[];
}

export function AdminReport({ submissions, campuses, units }: AdminReportProps) {
  const campusMap = new Map(campuses.map(c => [c.id, c.name]));
  const unitMap = new Map(units.map(u => [u.id, u.name]));
  
  const sortedSubmissions = submissions.sort((a, b) => {
    const campusA = campusMap.get(a.campusId) || '';
    const campusB = campusMap.get(b.campusId) || '';
    if (campusA !== campusB) {
      return campusA.localeCompare(campusB);
    }
    const unitA = unitMap.get(a.unitId) || '';
    const unitB = unitMap.get(b.unitId) || '';
    return unitA.localeCompare(unitB);
  });

  return (
    <div>
      <div className="header">
        <h1>ROMBLON STATE UNIVERSITY</h1>
        <h2>QUALITY ASSURANCE OFFICE</h2>
        <h3 className="report-title">SUBMISSION REPORTS</h3>
      </div>

      <table>
        <thead>
          <tr>
            <th>SITE / CAMPUS</th>
            <th>UNIT WITH SUBMISSION</th>
            <th>SUBMITTED DOCUMENT</th>
            <th>CYCLE</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {sortedSubmissions.map(sub => (
            <tr key={sub.id}>
              <td>{campusMap.get(sub.campusId) || 'N/A'}</td>
              <td>{sub.unitName || unitMap.get(sub.unitId) || 'N/A'}</td>
              <td>{sub.reportType}</td>
              <td style={{ textTransform: 'capitalize' }}>{sub.cycleId}</td>
              <td style={{ textTransform: 'capitalize' }}>{sub.statusId}</td>
            </tr>
          ))}
          {sortedSubmissions.length === 0 && (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center' }}>No submissions found.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="footer">
        <p>This is a system generated report, signature is not required.</p>
      </div>
    </div>
  );
}
