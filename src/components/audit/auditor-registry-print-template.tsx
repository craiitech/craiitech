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

  return (
    <div className="text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none animate-in fade-in duration-300" style={{ fontSize: '11pt' }}>
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="font-bold uppercase leading-none" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p style={{ fontSize: '10pt' }} className="italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-6 border-y-2 border-black py-3 bg-slate-50/50">
          <h2 className="font-black uppercase tracking-[0.12em]" style={{ fontSize: '12pt' }}>Active System Auditors Registry & Completion</h2>
          <p className="font-bold mt-1" style={{ fontSize: '11pt' }}>ACADEMIC YEAR {year}</p>
        </div>
      </div>

      {/* Roster Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
          <thead>
              <tr className="bg-gray-150">
                  <th className="border-2 border-black p-2.5 text-left font-black uppercase w-[30%]" style={{ fontSize: '10pt' }}>Name of Auditor</th>
                  <th className="border-2 border-black p-2.5 text-left font-black uppercase w-[50%]" style={{ fontSize: '10pt' }}>List of Units Audited</th>
                  <th className="border-2 border-black p-2.5 text-center font-black uppercase w-[20%]" style={{ fontSize: '10pt' }}>Status</th>
              </tr>
          </thead>
          <tbody>
              {auditorData.map((auditor, i) => {
                  const status = getAuditorStatus(auditor);
                  const sortedAssignments = [...auditor.assignments].sort((a, b) => {
                      const timeA = a.date ? parseDate(a.date).getTime() : 0;
                      const timeB = b.date ? parseDate(b.date).getTime() : 0;
                      if (timeA !== timeB) return timeA - timeB;

                      const startA = a.startTime ? parseDate(a.startTime).getTime() : 0;
                      const startB = b.startTime ? parseDate(b.startTime).getTime() : 0;
                      return startA - startB;
                  });

                  return (
                      <tr key={i} className="break-inside-avoid border-b border-black">
                          <td className="border border-black p-2.5 text-left font-black uppercase" style={{ fontSize: '10pt' }}>
                              {auditor.name}
                          </td>
                          <td className="border border-black p-2.5 text-left text-slate-700 leading-normal" style={{ fontSize: '10pt' }}>
                              {sortedAssignments.length > 0 ? (
                                  <ul className="list-disc pl-4 space-y-2">
                                      {sortedAssignments.map((asgn, asgnIdx) => {
                                          const dateStr = safeFormatDate(asgn.date);
                                          const timeStr = asgn.startTime && asgn.endTime 
                                              ? `${safeFormatTime(asgn.startTime)} – ${safeFormatTime(asgn.endTime)}`
                                              : safeFormatTime(asgn.startTime || asgn.endTime);
                                          const dateTimeStr = [dateStr, timeStr].filter(Boolean).join(', ');
                                          return (
                                              <li key={asgnIdx} className="leading-tight">
                                                  <span className="font-semibold text-black uppercase">{asgn.unitName}</span>
                                                  <span className="block text-slate-600 text-[9pt] mt-0.5 normal-case font-medium">
                                                      Campus/Site: <span className="font-semibold text-slate-800">{asgn.campus || 'Institutional'}</span> | Date/Time: <span className="font-semibold text-slate-800">{dateTimeStr || 'Not scheduled'}</span>
                                                  </span>
                                              </li>
                                          );
                                      })}
                                  </ul>
                              ) : (
                                  <span className="italic text-slate-400">No Audited Units</span>
                              )}
                          </td>
                          <td className="border border-black p-2.5 text-center font-black" style={{ fontSize: '10pt' }}>
                              <span className={getStatusColorClass(status)}>
                                  {status} ({auditor.completed}/{auditor.count})
                              </span>
                          </td>
                      </tr>
                  );
              })}
          </tbody>
      </table>

      {/* Official Signatories */}
      <div className="mt-12 grid grid-cols-2 gap-16 px-6 break-inside-avoid">
        <div className="text-center">
          <p className="text-left mb-10 font-bold uppercase opacity-60" style={{ fontSize: '10pt' }}>Prepared and Verified by:</p>
          <div className="border-b border-black font-black pb-1 mb-1 uppercase tracking-tight" style={{ fontSize: '11pt' }}>
            {leadAuditorName || '__________________________'}
          </div>
          <p className="uppercase font-black text-slate-500 tracking-widest" style={{ fontSize: '9pt' }}>IQA Team Leader</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-10 font-bold uppercase opacity-60" style={{ fontSize: '10pt' }}>Approved by:</p>
          <div className="border-b border-black font-black pb-1 mb-1 uppercase tracking-tight" style={{ fontSize: '11pt' }}>
            {qaoDirector || '__________________________'}
          </div>
          <p className="uppercase font-black text-slate-500 tracking-widest" style={{ fontSize: '9pt' }}>Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '9pt' }}>
        <span>RSU-QAO-IQA-AUDITOR-REGISTRY | REV 01-2026</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
