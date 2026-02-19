'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, AuditPlan } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface AuditPrintTemplateProps {
  schedule: AuditSchedule;
  findings: AuditFinding[];
  clauses: ISOClause[];
  plan?: AuditPlan;
}

export function AuditPrintTemplate({ schedule, findings, clauses, plan }: AuditPrintTemplateProps) {
  const conductDate = schedule.scheduledDate instanceof Timestamp 
    ? schedule.scheduledDate.toDate() 
    : new Date(schedule.scheduledDate);

  const findingsMap = new Map(findings.map(f => [f.isoClause, f]));
  const sortedClauses = [...clauses].sort((a, b) => 
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );

  return (
    <div className="p-10 text-black bg-white max-w-5xl mx-auto font-sans leading-tight">
      {/* RSU Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
        <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
        <div className="mt-2 py-1 px-6 bg-black text-white inline-block uppercase text-sm font-black tracking-[0.2em]">
          Internal Quality Audit Evidence Log
        </div>
      </div>

      {/* Meta Information Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm mb-8">
        <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-bold uppercase text-[10px]">Audit Number:</span>
            <span>{plan?.auditNumber || '--'}</span>
        </div>
        <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-bold uppercase text-[10px]">Date of Conduct:</span>
            <span>{format(conductDate, 'MMMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-bold uppercase text-[10px]">Lead Auditor:</span>
            <span>{plan?.leadAuditorName || '--'}</span>
        </div>
        <div className="flex justify-between border-b border-gray-300 pb-1">
            <span className="font-bold uppercase text-[10px]">Session Auditor:</span>
            <span>{schedule.auditorName || 'TBA'}</span>
        </div>
        <div className="flex justify-between border-b border-gray-300 pb-1 col-span-2">
            <span className="font-bold uppercase text-[10px]">Auditee (Unit/Office):</span>
            <span className="font-bold">{schedule.targetName}</span>
        </div>
        <div className="flex justify-between border-b border-gray-300 pb-1 col-span-2">
            <span className="font-bold uppercase text-[10px]">Scope / Procedure Focus:</span>
            <span className="italic">{schedule.procedureDescription}</span>
        </div>
      </div>

      {/* Main Evidence Log Table */}
      <table className="w-full border-collapse border-2 border-black mb-8 text-[11px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-center w-[80px] uppercase font-black">Clause</th>
            <th className="border border-black p-2 text-left uppercase font-black">Requirements & Observations (Objective Evidence)</th>
            <th className="border border-black p-2 text-center w-[100px] uppercase font-black">Result</th>
          </tr>
        </thead>
        <tbody>
          {sortedClauses.map((clause) => {
            const finding = findingsMap.get(clause.id);
            return (
              <React.Fragment key={clause.id}>
                <tr>
                  <td className="border border-black p-2 text-center font-bold align-top">
                    {clause.id}
                  </td>
                  <td className="border border-black p-2 align-top">
                    <p className="font-bold uppercase text-[9px] mb-1 text-gray-600">{clause.title}</p>
                    <div className="min-h-[40px] whitespace-pre-wrap leading-relaxed">
                        {finding?.evidence || <span className="text-gray-300 italic">No evidence recorded for this requirement.</span>}
                    </div>
                    {finding?.type === 'Non-Conformance' && finding.ncStatement && (
                        <div className="mt-3 p-3 bg-gray-50 border border-black border-dashed">
                            <p className="font-black text-[9px] uppercase mb-1">Statement of Non-Conformance:</p>
                            <p className="italic leading-relaxed">"{finding.ncStatement}"</p>
                        </div>
                    )}
                  </td>
                  <td className="border border-black p-2 text-center font-black align-top">
                    {finding ? (
                        <span className={finding.type === 'Non-Conformance' ? 'text-red-600' : ''}>
                            {finding.type === 'Commendation' ? 'C' : 
                             finding.type === 'Non-Conformance' ? 'NC' : 'OFI'}
                        </span>
                    ) : '--'}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Executive Summary Section */}
      <div className="space-y-6 break-inside-avoid">
        <h3 className="font-black text-xs uppercase border-b-2 border-black pb-1">Consolidated Audit Summary</h3>
        
        <div className="grid grid-cols-1 gap-4 text-xs">
            <div className="p-4 border border-black">
                <h4 className="font-bold uppercase text-[10px] mb-2 text-green-700">List of Commendable Practices (C)</h4>
                <div className="min-h-[60px] whitespace-pre-wrap">{schedule.summaryCommendablePractices || 'None recorded.'}</div>
            </div>
            <div className="p-4 border border-black">
                <h4 className="font-bold uppercase text-[10px] mb-2 text-amber-700">Opportunities for Improvement (OFI)</h4>
                <div className="min-h-[60px] whitespace-pre-wrap">{schedule.summaryOFI || 'None recorded.'}</div>
            </div>
            <div className="p-4 border border-black bg-gray-50">
                <h4 className="font-bold uppercase text-[10px] mb-2 text-red-700">Non-Conformance / Non-Compliance (NC)</h4>
                <div className="min-h-[60px] whitespace-pre-wrap">{schedule.summaryNC || 'None recorded.'}</div>
            </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-20 mt-16 text-center break-inside-avoid">
        <div>
          <div className="border-b border-black font-bold text-sm pb-1 mb-1">
            {schedule.auditorName || '__________________________'}
          </div>
          <p className="text-[10px] uppercase font-black text-gray-500">Internal Auditor</p>
        </div>
        <div>
          <div className="border-b border-black font-bold text-sm pb-1 mb-1 uppercase">
            {schedule.officerInCharge || '__________________________'}
          </div>
          <p className="text-[10px] uppercase font-black text-gray-500">Officer-in-Charge / Unit Head</p>
        </div>
      </div>

      <div className="mt-12 text-[8px] text-gray-400 italic text-center border-t pt-4 uppercase tracking-widest">
        This document is an official digital record generated by the RSU EOMS Submission Portal.
      </div>
    </div>
  );
}
