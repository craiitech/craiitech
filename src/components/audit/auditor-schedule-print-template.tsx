
'use client';

import React, { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface AuditorSchedulePrintTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  campusName: string;
  signatories?: Signatories;
}

export function AuditorSchedulePrintTemplate({ plan, schedules, campusName, signatories }: AuditorSchedulePrintTemplateProps) {
  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    schedules.forEach(s => {
      const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
      if (!isNaN(d.getTime())) {
        dates.add(format(d, 'MM/dd/yyyy'));
      }
    });
    return Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [schedules]);

  const auditorData = useMemo(() => {
    const auditors: Record<string, any[]> = {};
    
    // Group by Auditor Name
    schedules.forEach(s => {
        const name = s.auditorName || 'UNASSIGNED';
        if (!auditors[name]) auditors[name] = [];
        auditors[name].push(s);
    });

    return Object.entries(auditors).sort(([a], [b]) => a.localeCompare(b));
  }, [schedules]);

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm');
  };

  return (
    <div className="p-0 text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '11pt' }}>
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1">
            <h1 className="font-bold uppercase" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
        </div>
        <div className="mt-8 mb-4">
          <h2 className="font-black uppercase tracking-tight" style={{ fontSize: '13pt' }}>INTERNAL QUALITY AUDIT SCHEDULE (AUDITOR)</h2>
        </div>
        <div className="text-left font-black uppercase mt-4" style={{ fontSize: '11pt' }}>
            SITE / CAMPUS: <span className="underline underline-offset-4 decoration-black">{campusName}</span>
        </div>
      </div>

      {/* Main Schedule Table */}
      <table className="w-full border-collapse border-2 border-black mb-8">
        <thead>
          <tr className="bg-gray-200">
            <th className="border-2 border-black p-3 text-center font-black uppercase w-[20%]" style={{ fontSize: '11pt' }}>Name of Auditor</th>
            {uniqueDates.map((date, idx) => (
                <th key={date} className="border-2 border-black p-3 text-center font-black uppercase" style={{ fontSize: '10pt' }}>
                    DAY {idx + 1}<br />
                    DATE: {date}
                </th>
            ))}
            {/* Fill up to at least 3 columns as per screenshot if uniqueDates < 3 */}
            {uniqueDates.length < 3 && Array.from({ length: 3 - uniqueDates.length }).map((_, i) => (
                <th key={`empty-day-${i}`} className="border-2 border-black p-3 text-center font-black uppercase" style={{ fontSize: '10pt' }}>
                    DAY {uniqueDates.length + i + 1}<br />
                    DATE: 
                </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {auditorData.map(([auditorName, sessions]) => (
            <tr key={auditorName} className="border-b border-black">
              <td className="border-2 border-black p-3 font-black uppercase align-top" style={{ fontSize: '11pt' }}>
                {auditorName}
              </td>
              {uniqueDates.map(date => {
                  const dateSessions = sessions.filter(s => {
                      const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
                      return format(d, 'MM/dd/yyyy') === date;
                  }).sort((a, b) => {
                      const tA = a.scheduledDate?.toMillis?.() || new Date(a.scheduledDate).getTime();
                      const tB = b.scheduledDate?.toMillis?.() || new Date(b.scheduledDate).getTime();
                      return tA - tB;
                  });

                  return (
                      <td key={date} className="border-2 border-black p-3 align-top">
                          <div className="space-y-4">
                              {dateSessions.map((s, idx) => (
                                  <div key={idx} className="space-y-1">
                                      <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
                                          {safeFormatTime(s.scheduledDate)} – {safeFormatTime(s.endScheduledDate)} {s.targetName}
                                      </p>
                                  </div>
                              ))}
                              {dateSessions.length === 0 && <span className="opacity-40">-</span>}
                          </div>
                      </td>
                  );
              })}
              {uniqueDates.length < 3 && Array.from({ length: 3 - uniqueDates.length }).map((_, i) => (
                  <td key={`empty-cell-${i}`} className="border-2 border-black p-3 align-top">
                      <span className="opacity-40">-</span>
                  </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Info */}
      <div className="mt-12 flex justify-between items-end border-t border-slate-200 pt-4 text-[9pt] text-slate-400 italic">
        <span>RSU-QAO-IQA-AUDITOR-SCHED | REV 03-2025</span>
        <div className="text-right">
            <p>Institutional Excellence Registry</p>
            <p>Generated via RSU EOMS Portal</p>
        </div>
      </div>
    </div>
  );
}
