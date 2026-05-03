'use client';

import React from 'react';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface AssignmentEntry {
    unitName: string;
    date: any;
    startTime: any;
    endTime: any;
    status: string;
    procedure: string;
    campus: string;
}

interface AuditorData {
    name: string;
    count: number;
    completed: number;
    assignments: AssignmentEntry[];
}

interface AuditorAssignmentsPrintTemplateProps {
  auditorData: AuditorData[];
  year: number;
  qaoDirector?: string;
  leadAuditorName?: string;
}

export function AuditorAssignmentsPrintTemplate({ auditorData, year, qaoDirector, leadAuditorName }: AuditorAssignmentsPrintTemplateProps) {
  const safeFormatDate = (d: any) => {
    if (!d) return 'TBA';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? 'TBA' : format(date, 'MM/dd/yyyy');
  };

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'hh:mm a');
  };

  return (
    <div className="text-black bg-white max-w-[8in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '12pt' }}>
      {auditorData.map((auditor, idx) => (
        <div key={idx} className="print-page-break p-6 mb-10 flex flex-col" style={{ pageBreakAfter: 'always' }}>
          {/* Institutional Header */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center justify-center gap-1 mb-2">
                <h1 className="text-lg font-bold uppercase leading-none">Romblon State University</h1>
                <h2 className="text-md font-semibold leading-none mt-1">Quality Assurance Office</h2>
                <p className="text-xs italic">Odiongan, Romblon</p>
            </div>
            <div className="mt-6 border-y-2 border-black py-2 bg-slate-50/50">
              <h2 className="text-sm font-black uppercase tracking-[0.15em]">IQA Auditor Assignment Registry</h2>
              <p className="text-xs font-bold mt-1">FISCAL YEAR {year}</p>
            </div>
          </div>

          {/* Auditor Identification Row */}
          <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
              <h3 className="text-sm font-black uppercase">Auditor: {auditor.name}</h3>
              <div className="flex gap-6 text-[10pt]">
                  <span className="font-bold uppercase">Assignments: {auditor.count}</span>
                  <span className="font-bold uppercase">Completion: {Math.round((auditor.completed / auditor.count) * 100)}%</span>
              </div>
          </div>

          {/* Assignments Table */}
          <table className="w-full border-collapse border-2 border-black mb-12">
              <thead>
                  <tr className="bg-slate-50">
                      <th className="border-2 border-black p-2 w-[15%] text-left font-black uppercase text-[10pt]">Date</th>
                      <th className="border-2 border-black p-2 w-[18%] text-left font-black uppercase text-[10pt]">Time Slot</th>
                      <th className="border-2 border-black p-2 w-[25%] text-left font-black uppercase text-[10pt]">Target Unit</th>
                      <th className="border-2 border-black p-2 text-left font-black uppercase text-[10pt]">Procedure / Scope</th>
                      <th className="border-2 border-black p-2 w-[12%] text-center font-black uppercase text-[10pt]">Status</th>
                  </tr>
              </thead>
              <tbody>
                  {auditor.assignments.sort((a,b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0)).map((a, i) => (
                      <tr key={i} className="break-inside-avoid border-b border-black/10 last:border-black">
                          <td className="border border-black p-2 font-bold tabular-nums text-[11pt]">{safeFormatDate(a.date)}</td>
                          <td className="border border-black p-2 font-bold uppercase whitespace-nowrap text-[10pt]">
                              {safeFormatTime(a.startTime)} - {safeFormatTime(a.endTime)}
                          </td>
                          <td className="border border-black p-2">
                              <p className="font-black uppercase leading-tight text-[11pt]">{a.unitName}</p>
                              <p className="text-[9pt] font-bold text-slate-500 mt-1 uppercase tracking-tighter">{a.campus}</p>
                          </td>
                          <td className="border border-black p-2 text-[11pt] italic leading-relaxed">
                              {a.procedure}
                          </td>
                          <td className="border border-black p-2 text-center font-black uppercase text-[9pt]">
                              {a.status}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          {/* Official Signatories */}
          <div className="mt-12 grid grid-cols-2 gap-16 px-6 break-inside-avoid">
            <div className="text-center">
              <p className="text-left mb-10 text-[10pt] font-bold uppercase opacity-60">Prepared and Verified by:</p>
              <div className="border-b-2 border-black font-black text-sm pb-1 mb-1 uppercase tracking-tight">
                {leadAuditorName || '__________________________'}
              </div>
              <p className="text-[10pt] uppercase font-black text-slate-500 tracking-widest">IQA Team Leader</p>
            </div>
            <div className="text-center">
              <p className="text-left mb-10 text-[10pt] font-bold uppercase opacity-60">Approved by:</p>
              <div className="border-b-2 border-black font-black text-sm pb-1 mb-1 uppercase tracking-tight">
                {qaoDirector || '__________________________'}
              </div>
              <p className="text-[10pt] uppercase font-black text-slate-500 tracking-widest">Director, Quality Assurance Office</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[9pt] text-slate-400 italic uppercase tracking-widest">
            <span>RSU-QAO-IQA-AUDITOR-LOG | REV 02-2025</span>
            <div className="flex gap-6">
                <span>Page {idx + 1} of {auditorData.length}</span>
                <span>Generated via RSU EOMS Portal</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
