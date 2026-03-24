'use client';

import React from 'react';
import type { AuditPlan, AuditSchedule, Campus, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface AuditPlanPrintTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  campusName: string;
  signatories?: Signatories;
}

export function AuditPlanPrintTemplate({ plan, schedules, campusName, signatories }: AuditPlanPrintTemplateProps) {
  const safeFormatDate = (d: any, fmt: string = 'yyyy-MM-dd') => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, fmt);
  };

  const safeFormatTime = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'h:mm a');
  };

  const sortedSchedules = [...schedules].sort((a, b) => {
    const timeA = a.scheduledDate instanceof Timestamp ? a.scheduledDate.toMillis() : new Date(a.scheduledDate).getTime();
    const timeB = b.scheduledDate instanceof Timestamp ? b.scheduledDate.toMillis() : new Date(b.scheduledDate).getTime();
    return timeA - timeB;
  });

  // Calculate overall date range for the header
  const auditDateRange = useMemo(() => {
    if (schedules.length === 0) return '--';
    const dates = schedules.map(s => s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${format(min, 'yyyy-MM-dd')} to ${format(max, 'yyyy-MM-dd')}`;
  }, [schedules]);

  return (
    <div className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans text-[11px] leading-tight">
      {/* Institutional Branding Header */}
      <div className="text-center mb-6">
        <h1 className="text-lg font-bold leading-none">Romblon State University</h1>
        <p className="text-xs">Romblon, Philippines</p>
        <div className="mt-6 mb-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">DETAILED AUDIT PLAN</h2>
        </div>
      </div>

      {/* Top Metadata Table */}
      <table className="w-full border-collapse border-2 border-black mb-0">
        <tbody>
          <tr>
            <td className="border-2 border-black p-2 w-[15%] font-bold bg-slate-50">No. of Audit</td>
            <td className="border-2 border-black p-2 w-[35%] font-bold text-sm">{plan.auditNumber}</td>
            <td className="border-2 border-black p-2 w-[15%] font-bold bg-slate-50">Audit Date</td>
            <td className="border-2 border-black p-2 w-[35%] font-bold text-sm">{auditDateRange}</td>
          </tr>
          <tr>
            <td className="border-2 border-black p-2 font-bold bg-slate-50">Audit Type</td>
            <td colSpan={3} className="border-2 border-black p-2">
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", plan.auditType === 'Regular Audit' && "bg-black")}>
                    {plan.auditType === 'Regular Audit' && <div className="w-1.5 h-1.5 bg-white" />}
                  </div>
                  <span className="font-bold">Regular Audit</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", plan.auditType === 'Special Audit' && "bg-black")}>
                    {plan.auditType === 'Special Audit' && <div className="w-1.5 h-1.5 bg-white" />}
                  </div>
                  <span className="font-bold">Special Audit</span>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Section and Team Table */}
      <table className="w-full border-collapse border-2 border-black border-t-0 mb-0">
        <tbody>
          <tr>
            <td className="border-2 border-black p-2 w-[50%] align-top min-h-[80px]">
              <p className="font-bold text-[10px] uppercase opacity-60 mb-2">Audit Section:</p>
              <div className="text-center py-4">
                <p className="text-sm font-black uppercase">{campusName}</p>
                <p className="text-xs font-bold text-slate-600">Management</p>
              </div>
            </td>
            <td className="border-2 border-black p-2 w-[50%] align-top">
              <p className="font-bold text-[10px] uppercase opacity-60 mb-2">Audit Team</p>
              <div className="pt-2">
                <p className="text-sm font-black">Lead Auditor: {plan.leadAuditorName}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Scope and Reference Table */}
      <table className="w-full border-collapse border-2 border-black border-t-0 mb-0">
        <tbody>
          <tr>
            <td className="border-2 border-black p-2 w-[50%] align-top min-h-[120px]">
              <p className="font-bold text-[10px] uppercase opacity-60 mb-2">Audit Scope and Criteria: {campusName}</p>
              <p className="text-[9px] leading-relaxed text-slate-700 italic pr-4">{plan.scope}</p>
            </td>
            <td className="border-2 border-black p-2 w-[50%] align-top">
              <p className="font-bold text-[10px] uppercase opacity-60 mb-2">Audit Reference Document:</p>
              <div className="text-center py-8">
                <p className="text-sm font-black uppercase">{plan.referenceDocument}</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Meetings Row */}
      <table className="w-full border-collapse border-2 border-black border-t-0 mb-6">
        <tbody>
          <tr className="font-bold">
            <td className="border-2 border-black p-2 w-[50%]">
              <span className="opacity-60 mr-2">Opening Meeting:</span>
              {safeFormatDate(plan.openingMeetingDate)} | {safeFormatTime(plan.openingMeetingDate)}
            </td>
            <td className="border-2 border-black p-2 w-[50%]">
              <span className="opacity-60 mr-2">Closing Meeting:</span>
              {safeFormatDate(plan.closingMeetingDate)} | {safeFormatTime(plan.closingMeetingDate)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Itinerary Table */}
      <table className="w-full border-collapse border-2 border-black text-[10px]">
        <thead>
          <tr className="bg-slate-100 font-black text-center uppercase tracking-tighter">
            <th className="border-2 border-black p-2 w-[12%]">Date</th>
            <th className="border-2 border-black p-2 w-[12%]">Time</th>
            <th className="border-2 border-black p-2 w-[15%]">ISO Clause</th>
            <th className="border-2 border-black p-2">Procedure</th>
            <th className="border-2 border-black p-2 w-[15%]">Auditor</th>
            <th className="border-2 border-black p-2 w-[15%]">Auditee</th>
          </tr>
          <tr className="bg-slate-50 text-[9px] font-black uppercase text-center border-b-2 border-black">
            <td colSpan={6} className="py-1">Audit Itinerary</td>
          </tr>
        </thead>
        <tbody>
          {sortedSchedules.map((schedule, i) => (
            <tr key={schedule.id} className="break-inside-avoid">
              <td className="border border-black p-2 text-center font-bold align-top">
                {safeFormatDate(schedule.scheduledDate)}
              </td>
              <td className="border border-black p-2 text-center font-bold align-top">
                {safeFormatTime(schedule.scheduledDate)} - {safeFormatTime(schedule.endScheduledDate)}
              </td>
              <td className="border border-black p-2 text-center font-mono font-bold align-top">
                <div className="flex flex-wrap justify-center gap-1">
                  {schedule.isoClausesToAudit.join(', ')}
                </div>
              </td>
              <td className="border border-black p-2 align-top">
                <p className="whitespace-pre-wrap leading-tight">{schedule.procedureDescription}</p>
              </td>
              <td className="border border-black p-2 text-center font-bold align-top">
                {schedule.auditorName || 'TBA'}
              </td>
              <td className="border border-black p-2 text-center font-bold align-top uppercase">
                {schedule.targetName}
              </td>
            </tr>
          ))}
          {sortedSchedules.length === 0 && (
            <tr>
              <td colSpan={6} className="border border-black p-8 text-center text-slate-400 italic">No itinerary entries provisioned.</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer Info */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-[8px] text-slate-400 font-bold italic">
        <div>
          <p>RSU-QAO-PLAN | REV 02-2025</p>
          <p>Generated by RSU EOMS Digital Portal</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-900 not-italic uppercase">Authenticated Institutional Document</p>
          <p className="mt-1">Page 1 of 1</p>
        </div>
      </div>
    </div>
  );
}

import { useMemo } from 'react';
