
'use client';

import React from 'react';
import type { EmployeeActivity } from '@/lib/types';
import { format, differenceInMinutes } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface AccomplishmentReportTemplateProps {
  activities: EmployeeActivity[];
  userName: string;
  unitName: string;
  periodLabel: string;
}

export function AccomplishmentReportTemplate({ activities, userName, unitName, periodLabel }: AccomplishmentReportTemplateProps) {
  
  const calculateHours = (start: string, end: string) => {
    try {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return `${hours}h ${mins}m`;
    } catch (e) { return '--'; }
  };

  const totalMinutes = activities.reduce((acc, a) => {
    try {
        const [sh, sm] = a.startTime.split(':').map(Number);
        const [eh, em] = a.endTime.split(':').map(Number);
        return acc + ((eh * 60 + em) - (sh * 60 + sm));
    } catch (e) { return acc; }
  }, 0);

  const totalHoursFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  return (
    <div className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-tight">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
        <h2 className="text-md font-semibold uppercase tracking-tight mt-1">Quality Assurance Office</h2>
        <div className="mt-6">
          <h2 className="text-lg font-black uppercase underline">ACCOMPLISHMENT REPORT</h2>
          <p className="text-xs font-bold mt-1">PERIOD: {periodLabel.toUpperCase()}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-y-2 text-sm mb-8 font-bold">
        <div>NAME: <span className="font-normal underline ml-2">{userName.toUpperCase()}</span></div>
        <div className="text-right">OFFICE / UNIT: <span className="font-normal underline ml-2">{unitName.toUpperCase()}</span></div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border-2 border-black text-[11px] mb-8">
        <thead>
          <tr className="bg-gray-100 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[12%]">Date</th>
            <th className="border border-black p-2 w-[15%]">Timeline</th>
            <th className="border border-black p-2 w-[40%]">Activity Particulars</th>
            <th className="border border-black p-2">Actual Output / Deliverable</th>
            <th className="border border-black p-2 w-[10%]">Hours</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a, i) => (
            <tr key={i} className="border-b border-black">
              <td className="border border-black p-2 text-center align-top">
                {format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy')}
              </td>
              <td className="border border-black p-2 text-center align-top tabular-nums uppercase">
                {a.startTime} - {a.endTime}
              </td>
              <td className="border border-black p-2 align-top italic">
                {a.activityParticular}
              </td>
              <td className="border border-black p-2 align-top text-center font-bold">
                {a.output || '--'}
              </td>
              <td className="border border-black p-2 text-center align-top font-mono">
                {calculateHours(a.startTime, a.endTime)}
              </td>
            </tr>
          ))}
          {activities.length === 0 && (
            <tr><td colSpan={5} className="p-8 text-center italic text-gray-400">No activities recorded for this period.</td></tr>
          )}
        </tbody>
        <tfoot>
            <tr className="bg-gray-50 font-black">
                <td colSpan={4} className="border border-black p-2 text-right">TOTAL HOURS RENDERED:</td>
                <td className="border border-black p-2 text-center font-mono">{totalHoursFormatted}</td>
            </tr>
        </tfoot>
      </table>

      {/* Signatories */}
      <div className="grid grid-cols-2 gap-20 mt-20">
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-left mb-8 opacity-60">Prepared by:</p>
          <div className="border-b border-black font-bold text-sm pb-1 mb-1">
            {userName.toUpperCase()}
          </div>
          <p className="text-[10px] uppercase font-semibold">Employee / Unit Coordinator</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-bold text-left mb-8 opacity-60">Verified by:</p>
          <div className="border-b border-black font-bold text-sm pb-1 mb-1">
            {/* Space for Supervisor Signature */}
          </div>
          <p className="text-[10px] uppercase font-semibold">Unit Head / Director</p>
        </div>
      </div>

      <div className="mt-16 text-[9px] text-gray-400 italic text-center border-t pt-4">
        This is a system-generated document issued via RSU EOMS Portal. 
        Authenticated Registry AY {new Date().getFullYear()}.
      </div>
    </div>
  );
}
