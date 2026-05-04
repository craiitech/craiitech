
'use client';

import React, { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface AuditorSchedulePrintTemplateProps {
  plan?: AuditPlan;
  schedules: AuditSchedule[];
  campusMap: Map<string, string>;
  signatories?: Signatories;
}

export function AuditorSchedulePrintTemplate({ plan, schedules, campusMap, signatories }: AuditorSchedulePrintTemplateProps) {
  
  // Group schedules by Campus first to satisfy "each campus on a new page" requirement
  const campusGroups = useMemo(() => {
    const groups: Record<string, AuditSchedule[]> = {};
    
    schedules.forEach(s => {
      const cid = s.campusId || 'university-wide';
      if (!groups[cid]) groups[cid] = [];
      groups[cid].push(s);
    });

    return Object.entries(groups).sort(([a], [b]) => {
        const nameA = campusMap.get(a) || '';
        const nameB = campusMap.get(b) || '';
        return nameA.localeCompare(nameB);
    });
  }, [schedules, campusMap]);

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm');
  };

  const safeFormatDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  return (
    <div className="p-0 text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '12pt' }}>
      {campusGroups.map(([campusId, campusSchedules], cgIdx) => {
          const campusName = campusMap.get(campusId) || 'Institutional';
          
          // Determine unique dates for THIS campus
          const uniqueDates = Array.from(new Set(
              campusSchedules.map(s => {
                  const d = s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
                  return format(d, 'MM/dd/yyyy');
              })
          )).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

          // Group by Auditor for THIS campus
          const auditors: Record<string, AuditSchedule[]> = {};
          campusSchedules.forEach(s => {
              const name = s.auditorName || 'UNASSIGNED';
              if (!auditors[name]) auditors[name] = [];
              auditors[name].push(s);
          });
          const auditorList = Object.entries(auditors).sort(([a], [b]) => a.localeCompare(b));

          return (
            <div key={campusId} className="print-page-break mb-10 flex flex-col min-h-[12in]" style={{ pageBreakAfter: 'always' }}>
                {/* Institutional Header */}
                <div className="text-center mb-8">
                    <div className="flex flex-col items-center justify-center gap-1">
                        <h1 className="font-bold uppercase" style={{ fontSize: '14pt' }}>Romblon State University</h1>
                        <h2 className="font-semibold uppercase" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
                    </div>
                    <div className="mt-8 mb-4">
                        <h2 className="font-black uppercase tracking-tight" style={{ fontSize: '13pt' }}>INTERNAL QUALITY AUDIT SCHEDULE (AUDITOR)</h2>
                    </div>
                    <div className="text-left font-black uppercase mt-4" style={{ fontSize: '12pt' }}>
                        SITE / CAMPUS: <span className="underline underline-offset-4 decoration-black">{campusName}</span>
                    </div>
                </div>

                {/* Main Schedule Table */}
                <table className="w-full border-collapse border-2 border-black mb-8">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border-2 border-black p-3 text-center font-black uppercase w-[20%]" style={{ fontSize: '11pt' }}>Name of Auditor</th>
                            {uniqueDates.map((date, idx) => (
                                <th key={date} className="border-2 border-black p-3 text-center font-black uppercase" style={{ fontSize: '10pt' }}>
                                    DAY {idx + 1}<br />
                                    DATE: {date}
                                </th>
                            ))}
                            {/* Fill up to at least 3 columns to maintain structure */}
                            {uniqueDates.length < 3 && Array.from({ length: 3 - uniqueDates.length }).map((_, i) => (
                                <th key={`empty-day-${i}`} className="border-2 border-black p-3 text-center font-black uppercase" style={{ fontSize: '10pt' }}>
                                    DAY {uniqueDates.length + i + 1}<br />
                                    DATE: 
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {auditorList.map(([auditorName, sessions]) => (
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
                                                {dateSessions.map((s, sIdx) => (
                                                    <div key={sIdx} className="space-y-1">
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
                <div className="mt-auto pt-4 border-t border-slate-200 flex justify-between items-end text-[10pt] text-slate-400 italic">
                    <span>RSU-QAO-IQA-AUDITOR-SCHED | REV 03-2025</span>
                    <div className="text-right">
                        <p>Institutional Excellence Registry</p>
                        <p>Generated via RSU EOMS Portal</p>
                    </div>
                </div>
            </div>
          );
      })}
    </div>
  );
}

