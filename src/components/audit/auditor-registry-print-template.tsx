'use client';

import React from 'react';
import { format } from 'date-fns';
import { parseDate } from '@/lib/utils';

interface AssignmentEntry {
    unitName: string;
    status: string;
    date?: any;
    startTime?: any;
    endTime?: any;
    campus?: string;
}

interface AuditorData {
    name: string;
    count: number;
    completed: number;
    assignments: AssignmentEntry[];
}

interface AuditorRegistryPrintTemplateProps {
  auditorData: AuditorData[];
  year: number;
  qaoDirector?: string;
  leadAuditorName?: string;
}

export function AuditorRegistryPrintTemplate({ auditorData, year, qaoDirector, leadAuditorName }: AuditorRegistryPrintTemplateProps) {
  const getAuditorStatus = (auditor: AuditorData) => {
    if (auditor.count === 0) return 'No Assignments';
    if (auditor.completed === auditor.count) return 'Completed';
    if (auditor.completed > 0) return 'In Progress';
    return 'Pending';
  };

  const getStatusColorClass = (status: string) => {
    if (status === 'Completed') return 'text-green-700 font-bold';
    if (status === 'In Progress') return 'text-blue-700 font-bold';
    return 'text-yellow-700 font-bold';
  };

  const safeFormatDate = (d: any) => {
    if (!d) return '';
    const date = parseDate(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = parseDate(d);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm a');
  };

  const getMergedCellBorderStyle = (idx: number, total: number) => {
    if (total <= 1) {
      return { border: '1px solid black' };
    }
    if (idx === 0) {
      return {
        borderLeft: '1px solid black',
        borderTop: '1px solid black',
        borderRight: '1px solid black',
        borderBottom: 'none'
      };
    }
    if (idx === total - 1) {
      return {
        borderLeft: '1px solid black',
        borderRight: '1px solid black',
        borderBottom: '1px solid black',
        borderTop: 'none'
      };
    }
    return {
      borderLeft: '1px solid black',
      borderRight: '1px solid black',
      borderTop: 'none',
      borderBottom: 'none'
    };
  };

  return (
    <div className="text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none animate-in fade-in duration-300" style={{ fontSize: '10pt' }}>
      {/* Institutional Header */}
      <div className="text-center mb-6">
        <div className="flex flex-col items-center justify-center gap-0.5 mb-1">
            <h1 className="font-bold uppercase leading-none m-0" style={{ fontSize: '13pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase leading-none m-0 mt-0.5" style={{ fontSize: '11pt' }}>Quality Assurance Office</h2>
            <p style={{ fontSize: '9pt' }} className="italic m-0 mt-0.5">Odiongan, Romblon</p>
        </div>
        <div className="mt-4 border-y border-black py-2 bg-slate-50/50">
          <h2 className="font-black uppercase tracking-[0.12em] m-0" style={{ fontSize: '11pt' }}>Active System Auditors Registry & Completion</h2>
          <p className="font-bold m-0 mt-0.5" style={{ fontSize: '10pt' }}>ACADEMIC YEAR {year}</p>
          <p className="font-bold m-0 mt-0.5 text-slate-600" style={{ fontSize: '9pt' }}>Updated as of {format(new Date(), 'MMMM dd, yyyy')}</p>
        </div>
      </div>

      {/* Roster Table */}
      <table className="w-full border-collapse border border-black mb-8 leading-tight">
          <thead>
              <tr className="bg-slate-100">
                  <th className="border border-black py-1 px-2 text-left font-black uppercase w-[30%]" style={{ fontSize: '9.5pt' }}>Name of Auditor</th>
                  <th className="border border-black py-1 px-2 text-left font-black uppercase w-[50%]" style={{ fontSize: '9.5pt' }}>List of Units Audited</th>
                  <th className="border border-black py-1 px-2 text-center font-black uppercase w-[20%]" style={{ fontSize: '9.5pt' }}>Status</th>
              </tr>
          </thead>
          <tbody>
              {auditorData.map((auditor, i) => {
                  const status = getAuditorStatus(auditor);
                  const percentage = auditor.count > 0 ? Math.round((auditor.completed / auditor.count) * 100) : 0;
                  const sortedAssignments = [...auditor.assignments].sort((a, b) => {
                      const timeA = a.date ? parseDate(a.date).getTime() : 0;
                      const timeB = b.date ? parseDate(b.date).getTime() : 0;
                      if (timeA !== timeB) return timeA - timeB;

                      const startA = a.startTime ? parseDate(a.startTime).getTime() : 0;
                      const startB = b.startTime ? parseDate(b.startTime).getTime() : 0;
                      return startA - startB;
                  });

                  if (sortedAssignments.length === 0) {
                      return (
                          <tr key={`empty-${i}`} className="break-inside-avoid">
                              <td className="border border-black py-1 px-2 text-left font-black uppercase" style={{ fontSize: '9.5pt' }}>
                                  {auditor.name}
                              </td>
                              <td className="border border-black py-1 px-2 text-left text-slate-700 leading-tight" style={{ fontSize: '9.5pt' }}>
                                  <span className="italic text-slate-400">No Audited Units</span>
                              </td>
                              <td className="border border-black py-1 px-2 text-center font-black" style={{ fontSize: '9.5pt' }}>
                                  <span className={getStatusColorClass(status)}>
                                      {status} (0/0 - {percentage}%)
                                  </span>
                              </td>
                          </tr>
                      );
                  }

                  return sortedAssignments.map((asgn, asgnIdx) => {
                      const dateStr = safeFormatDate(asgn.date);
                      const timeStr = asgn.startTime && asgn.endTime 
                          ? `${safeFormatTime(asgn.startTime)} – ${safeFormatTime(asgn.endTime)}`
                          : safeFormatTime(asgn.startTime || asgn.endTime);
                      const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(', ');

                      return (
                          <tr key={`${i}-${asgnIdx}`} className="break-inside-avoid">
                              <td className="py-1 px-2 text-left font-black uppercase" style={{ fontSize: '9.5pt', ...getMergedCellBorderStyle(asgnIdx, sortedAssignments.length) }}>
                                  {asgnIdx === 0 ? auditor.name : ''}
                              </td>
                              <td className="border border-black py-1 px-2 text-left text-slate-700 leading-tight" style={{ fontSize: '9.5pt' }}>
                                  <div className="flex items-start gap-1.5 leading-tight m-0 p-0">
                                      <span className="shrink-0 text-black select-none">•</span>
                                      <div className="m-0 p-0">
                                          <span className="font-semibold text-black uppercase">{asgn.unitName}</span>
                                          <span className="block text-slate-600 text-[8.5pt] normal-case font-medium m-0 p-0 mt-0.5">
                                              Campus/Site: <span className="font-semibold text-slate-800">{asgn.campus || 'Institutional'}</span> | Date/Time: <span className="font-semibold text-slate-800">{dateTimeStr || 'Not scheduled'}</span>
                                          </span>
                                      </div>
                                  </div>
                              </td>
                              <td className="py-1 px-2 text-center font-black" style={{ fontSize: '9.5pt', ...getMergedCellBorderStyle(asgnIdx, sortedAssignments.length) }}>
                                  {asgnIdx === 0 ? (
                                      <span className={getStatusColorClass(status)}>
                                          {status} ({auditor.completed}/{auditor.count} - {percentage}%)
                                      </span>
                                  ) : ''}
                              </td>
                          </tr>
                      );
                  });
              })}
          </tbody>
      </table>

      {/* Official Signatories */}
      <div className="mt-8 grid grid-cols-2 gap-16 px-6 break-inside-avoid">
        <div className="text-center">
          <p className="text-left m-0 font-bold uppercase opacity-60 font-sans" style={{ fontSize: '9pt' }}>Prepared and Verified by:</p>
          <div className="border-b border-black font-black pb-1 mb-1 mt-6 uppercase tracking-tight" style={{ fontSize: '10pt' }}>
            {leadAuditorName || '__________________________'}
          </div>
          <p className="uppercase font-black text-slate-500 tracking-widest m-0" style={{ fontSize: '8pt' }}>IQA Team Leader</p>
        </div>
        <div className="text-center">
          <p className="text-left m-0 font-bold uppercase opacity-60 font-sans" style={{ fontSize: '9pt' }}>Approved by:</p>
          <div className="border-b border-black font-black pb-1 mb-1 mt-6 uppercase tracking-tight" style={{ fontSize: '10pt' }}>
            {qaoDirector || '__________________________'}
          </div>
          <p className="uppercase font-black text-slate-500 tracking-widest m-0" style={{ fontSize: '8pt' }}>Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-2 border-t border-slate-200 flex justify-between items-center text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '8pt' }}>
        <span>RSU-QAO-IQA-AUDITOR-REGISTRY | REV 01-2026</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
