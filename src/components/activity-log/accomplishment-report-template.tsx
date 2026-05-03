'use client';

import React from 'react';
import type { EmployeeActivity } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface AccomplishmentReportTemplateProps {
  activities: EmployeeActivity[];
  userName: string;
  unitName: string;
  periodLabel: string;
}

export function AccomplishmentReportTemplate({ activities, userName, unitName, periodLabel }: AccomplishmentReportTemplateProps) {
  
  // Get the most frequent approver name if available
  const approverNames = activities.map(a => a.approvedByName).filter(Boolean);
  const displayApprover = approverNames.length > 0 ? approverNames[0] : '';

  return (
    <div className="p-0 text-black bg-white mx-auto font-serif leading-tight" style={{ width: '7.5in', fontSize: '12pt' }}>
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-black pb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Romblon State University</h1>
        <h2 className="text-md font-semibold uppercase tracking-tight mt-1">Quality Assurance Office</h2>
        <div className="mt-6">
          <h2 className="text-lg font-black uppercase underline">ACCOMPLISHMENT REPORT</h2>
          <p className="text-xs font-bold mt-1">PERIOD: {periodLabel.toUpperCase()}</p>
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-y-2 mb-8 font-bold" style={{ fontSize: '12pt' }}>
        <div>NAME: <span className="font-normal underline ml-2">{userName.toUpperCase()}</span></div>
        <div className="text-right">OFFICE / UNIT: <span className="font-normal underline ml-2">{unitName.toUpperCase()}</span></div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border-2 border-black mb-8" style={{ fontSize: '11pt' }}>
        <thead>
          <tr className="bg-gray-100 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[12%]">Date</th>
            <th className="border border-black p-2 w-[15%]">Timeline</th>
            <th className="border border-black p-2 w-[45%]">Activity Particulars</th>
            <th className="border border-black p-2">Actual Output</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((a, i) => (
            <tr key={i} className="border-b border-black">
              <td className="border border-black p-2 text-center align-top">
                {format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy')}
              </td>
              <td className="border border-black p-2 text-center align-top tabular-nums uppercase whitespace-nowrap">
                {a.startTime} - {a.endTime}
              </td>
              <td className="border border-black p-2 align-top italic">
                {a.activityParticular}
              </td>
              <td className="border border-black p-2 align-top text-center font-bold">
                {a.output || '--'}
              </td>
            </tr>
          ))}
          {activities.length === 0 && (
            <tr><td colSpan={4} className="p-8 text-center italic text-gray-400">No activities recorded for this period.</td></tr>
          )}
        </tbody>
      </table>

      {/* Signatories */}
      <div className="grid grid-cols-2 gap-20 mt-20" style={{ fontSize: '12pt' }}>
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-8 opacity-60" style={{ fontSize: '10pt' }}>Prepared by:</p>
          <div className="border-b border-black font-bold pb-1 mb-1">
            {userName.toUpperCase()}
          </div>
          <p className="uppercase font-semibold text-center" style={{ fontSize: '10pt' }}>Employee / Unit Coordinator</p>
        </div>
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-8 opacity-60" style={{ fontSize: '10pt' }}>Verified by:</p>
          <div className="border-b border-black font-bold pb-1 mb-1 uppercase">
            {displayApprover || '____________________'}
          </div>
          <p className="uppercase font-semibold text-center" style={{ fontSize: '10pt' }}>Unit Head / Coordinator</p>
        </div>
      </div>

      <div className="mt-16 text-[10pt] text-gray-400 italic text-center border-t pt-4">
        This is a system-generated document issued via RSU EOMS Portal. 
        Authenticated Registry AY {new Date().getFullYear()}.
      </div>
    </div>
  );
}
