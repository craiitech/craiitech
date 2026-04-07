
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
}

export function AuditorAssignmentsPrintTemplate({ auditorData, year, qaoDirector }: AuditorAssignmentsPrintTemplateProps) {
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
    <div className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans text-[10px] leading-tight border-none">
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="text-lg font-bold leading-none">Romblon State University</h1>
            <h2 className="text-md font-semibold leading-none mt-1">Quality Assurance Office</h2>
            <p className="text-xs italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-6 border-y-2 border-black py-2 bg-slate-50">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">IQA AUDITOR ASSIGNMENT REGISTRY</h2>
          <p className="text-[10px] font-bold mt-1">FISCAL YEAR {year}</p>
        </div>
      </div>

      {/* Main Registry Loop */}
      <div className="space-y-10">
        {auditorData.map((auditor, idx) => (
            <div key={idx} className="break-inside-avoid">
                <div className="flex items-center justify-between border-b-2 border-black pb-1 mb-3">
                    <h3 className="text-sm font-black uppercase">Auditor: {auditor.name}</h3>
                    <div className="flex gap-4">
                        <span className="font-bold uppercase">Total Assignments: {auditor.count}</span>
                        <span className="font-bold uppercase">Status: {Math.round((auditor.completed / auditor.count) * 100)}% Complete</span>
                    </div>
                </div>

                <table className="w-full border-collapse border border-black">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border border-black p-2 w-[15%] text-left font-black uppercase text-[9px]">Date</th>
                            <th className="border border-black p-2 w-[15%] text-left font-black uppercase text-[9px]">Time Slot</th>
                            <th className="border border-black p-2 w-[25%] text-left font-black uppercase text-[9px]">Target Unit</th>
                            <th className="border border-black p-2 text-left font-black uppercase text-[9px]">Procedure / Scope</th>
                            <th className="border border-black p-2 w-[10%] text-center font-black uppercase text-[9px]">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditor.assignments.sort((a,b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0)).map((a, i) => (
                            <tr key={i}>
                                <td className="border border-black p-2 font-bold tabular-nums">{safeFormatDate(a.date)}</td>
                                <td className="border border-black p-2 font-bold uppercase whitespace-nowrap text-[8px]">
                                    {safeFormatTime(a.startTime)} - {safeFormatTime(a.endTime)}
                                </td>
                                <td className="border border-black p-2 font-bold">
                                    <p className="uppercase leading-tight">{a.unitName}</p>
                                    <p className="text-[7px] font-medium text-slate-500 mt-0.5">{a.campus}</p>
                                </td>
                                <td className="border border-black p-2 text-[9px] italic leading-relaxed">
                                    {a.procedure}
                                </td>
                                <td className="border border-black p-2 text-center font-black uppercase text-[8px]">
                                    {a.status}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ))}
      </div>

      {/* Official Signatories */}
      <div className="mt-20 flex justify-end pr-10 break-inside-avoid">
        <div className="text-center w-64">
          <p className="text-left mb-8 text-[9px] font-bold uppercase opacity-60">Verified and Issued by:</p>
          <div className="border-b border-black font-black text-xs pb-1 mb-1 uppercase">
            {qaoDirector || '__________________________'}
          </div>
          <p className="text-[9px] uppercase font-black text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-IQA-ASSIGNMENTS | REV 01-2025</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
