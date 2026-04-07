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
    <div className="text-black bg-white max-w-[8in] mx-auto font-sans text-[9px] leading-tight border-none">
      {auditorData.map((auditor, idx) => (
        <div key={idx} className="print-page-break p-6 mb-10 flex flex-col">
          {/* Institutional Header */}
          <div className="text-center mb-6">
            <div className="flex flex-col items-center justify-center gap-0.5 mb-1">
                <h1 className="text-sm font-bold uppercase leading-none">Romblon State University</h1>
                <h2 className="text-xs font-semibold leading-none mt-0.5">Quality Assurance Office</h2>
                <p className="text-[8px] italic">Odiongan, Romblon</p>
            </div>
            <div className="mt-4 border-y border-black py-1.5 bg-slate-50/50">
              <h2 className="text-xs font-black uppercase tracking-[0.15em]">IQA Auditor Assignment Registry</h2>
              <p className="text-[9px] font-bold mt-0.5">FISCAL YEAR {year}</p>
            </div>
          </div>

          {/* Auditor Identification Row */}
          <div className="flex items-center justify-between border-b border-black pb-1 mb-2">
              <h3 className="text-xs font-black uppercase">Auditor: {auditor.name}</h3>
              <div className="flex gap-4 text-[8px]">
                  <span className="font-bold uppercase">Total Assignments: {auditor.count}</span>
                  <span className="font-bold uppercase">Completion: {Math.round((auditor.completed / auditor.count) * 100)}%</span>
              </div>
          </div>

          {/* Assignments Table */}
          <table className="w-full border-collapse border border-black mb-10">
              <thead>
                  <tr className="bg-slate-50">
                      <th className="border border-black p-1.5 w-[12%] text-left font-black uppercase text-[8px]">Date</th>
                      <th className="border border-black p-1.5 w-[15%] text-left font-black uppercase text-[8px]">Time Slot</th>
                      <th className="border border-black p-1.5 w-[25%] text-left font-black uppercase text-[8px]">Target Unit</th>
                      <th className="border border-black p-1.5 text-left font-black uppercase text-[8px]">Procedure / Scope</th>
                      <th className="border border-black p-1.5 w-[10%] text-center font-black uppercase text-[8px]">Status</th>
                  </tr>
              </thead>
              <tbody>
                  {auditor.assignments.sort((a,b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0)).map((a, i) => (
                      <tr key={i} className="break-inside-avoid border-b border-black/10 last:border-black">
                          <td className="border border-black p-1.5 font-bold tabular-nums text-[8.5px]">{safeFormatDate(a.date)}</td>
                          <td className="border border-black p-1.5 font-bold uppercase whitespace-nowrap text-[8px]">
                              {safeFormatTime(a.startTime)} - {safeFormatTime(a.endTime)}
                          </td>
                          <td className="border border-black p-1.5">
                              <p className="font-black uppercase leading-tight text-[8.5px]">{a.unitName}</p>
                              <p className="text-[7px] font-bold text-slate-500 mt-0.5 uppercase tracking-tighter">{a.campus}</p>
                          </td>
                          <td className="border border-black p-1.5 text-[8.5px] italic leading-snug">
                              {a.procedure}
                          </td>
                          <td className="border border-black p-1.5 text-center font-black uppercase text-[7.5px]">
                              {a.status}
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>

          {/* Official Signatories */}
          <div className="mt-8 grid grid-cols-2 gap-12 px-6 break-inside-avoid">
            <div className="text-center">
              <p className="text-left mb-6 text-[8px] font-bold uppercase opacity-60">Prepared and Verified by:</p>
              <div className="border-b border-black font-black text-[10px] pb-0.5 mb-0.5 uppercase tracking-tight">
                {leadAuditorName || '__________________________'}
              </div>
              <p className="text-[8px] uppercase font-black text-slate-500 tracking-widest">IQA Lead Auditor</p>
            </div>
            <div className="text-center">
              <p className="text-left mb-6 text-[8px] font-bold uppercase opacity-60">Approved by:</p>
              <div className="border-b border-black font-black text-[10px] pb-0.5 mb-0.5 uppercase tracking-tight">
                {qaoDirector || '__________________________'}
              </div>
              <p className="text-[8px] uppercase font-black text-slate-500 tracking-widest">Director, Quality Assurance Office</p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-2 border-t border-slate-100 flex justify-between items-center text-[7.5px] text-slate-400 italic uppercase tracking-widest">
            <span>RSU-QAO-IQA-AUDITOR-LOG | REV 02-2025</span>
            <div className="flex gap-4">
                <span>Page {idx + 1} of {auditorData.length}</span>
                <span>Generated via RSU EOMS Digital Portal</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
