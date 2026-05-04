'use client';

import React from 'react';
import type { AuditPlan, AuditSchedule, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface UnitSchedulePrintTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  campusName: string;
  signatories?: Signatories;
}

export function UnitSchedulePrintTemplate({ plan, schedules, campusName, signatories }: UnitSchedulePrintTemplateProps) {
  const safeFormatDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm');
  };

  const sortedSchedules = [...schedules].sort((a, b) => {
    const timeA = a.scheduledDate instanceof Timestamp ? a.scheduledDate.toMillis() : new Date(a.scheduledDate).getTime();
    const timeB = b.scheduledDate instanceof Timestamp ? b.scheduledDate.toMillis() : new Date(b.scheduledDate).getTime();
    return timeA - timeB;
  });

  return (
    <div className="p-0 text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '12pt' }}>
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="font-bold uppercase leading-none" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p style={{ fontSize: '10pt' }} className="italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-8 mb-4">
          <h2 className="font-black uppercase tracking-tight" style={{ fontSize: '13pt' }}>INTERNAL QUALITY AUDIT SCHEDULE (OFFICE/UNIT)</h2>
        </div>
      </div>

      <div className="text-left font-black uppercase mb-4" style={{ fontSize: '12pt' }}>
          SITE / CAMPUS: <span className="underline underline-offset-4 decoration-black">{campusName}</span>
      </div>

      {/* Main Schedule Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
        <thead>
          <tr className="bg-gray-200">
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[30%]" style={{ fontSize: '12pt' }}>UNIT / OFFICE</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[25%]" style={{ fontSize: '12pt' }}>AUDITOR</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[20%]" style={{ fontSize: '12pt' }}>SCHEDULE</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[25%]" style={{ fontSize: '12pt' }}>UNIT HEAD SIGNATURE</th>
          </tr>
        </thead>
        <tbody>
          {sortedSchedules.map((s, i) => (
            <tr key={s.id} className="h-16 border-b border-black break-inside-avoid">
              <td className="border-2 border-black p-2 align-middle">
                <div className="flex gap-2">
                    <span className="font-black">{i + 1}.</span>
                    <span className="font-black uppercase">{s.targetName}</span>
                </div>
              </td>
              <td className="border-2 border-black p-2 text-center font-black uppercase align-middle">
                {s.auditorName || 'UNASSIGNED'}
              </td>
              <td className="border-2 border-black p-2 text-center align-middle">
                  <p className="font-bold tabular-nums">{safeFormatDate(s.scheduledDate)}</p>
                  <p className="font-bold tabular-nums">{safeFormatTime(s.scheduledDate)} - {safeFormatTime(s.endScheduledDate)}</p>
              </td>
              <td className="border-2 border-black p-2 align-middle">
                  {/* Empty signature column */}
              </td>
            </tr>
          ))}
          {sortedSchedules.length === 0 && (
            <tr><td colSpan={4} className="border border-black p-8 text-center text-slate-400 italic">No itinerary entries found for this site context.</td></tr>
          )}
        </tbody>
      </table>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-center text-[10pt] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-IQA-UNIT-SCHED | REV 02-2025</span>
        <div className="text-right">
            <p>Institutional Excellence Registry</p>
            <p>Generated via RSU EOMS Portal</p>
        </div>
      </div>
    </div>
  );
}
