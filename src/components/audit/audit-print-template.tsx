'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, AuditPlan } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { clauseQuestions } from '@/lib/audit-questions';

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
    <div className="p-6 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-tight">
      {/* Institutional Branding Header */}
      <div className="flex flex-col items-center text-center border-b-2 border-black pb-4 mb-4">
        <h1 className="text-lg font-bold uppercase tracking-tight leading-none">Romblon State University</h1>
        <h2 className="text-md font-semibold uppercase tracking-tight leading-none mt-1">Quality Assurance Office</h2>
        <div className="mt-3 px-8 py-1.5 bg-black text-white text-sm font-black uppercase tracking-[0.2em] shadow-sm">
          Internal Quality Audit Evidence Log
        </div>
      </div>

      {/* Official Audit Metadata Matrix */}
      <div className="w-full border-2 border-black mb-6 text-[10px] overflow-hidden">
        <div className="grid grid-cols-2 border-b border-black">
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">UNIT:</span> {schedule.targetName}
            </div>
            <div className="p-2 font-bold">
                <span className="opacity-60 mr-2">NC REPORT NO:</span> ___________________
            </div>
        </div>
        <div className="grid grid-cols-1 border-b border-black">
            <div className="p-2 font-bold">
                <span className="opacity-60 mr-2">PROCEDURE:</span> <span className="italic">{schedule.procedureDescription}</span>
            </div>
        </div>
        <div className="grid grid-cols-4">
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDIT NO:</span> {plan?.auditNumber || '--'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITOR:</span> {schedule.auditorName || 'TBA'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITEE:</span> {schedule.officerInCharge || '________________'}
            </div>
            <div className="p-2 font-bold">
                <span className="opacity-60 mr-2">DATE:</span> {format(conductDate, 'MM/dd/yyyy')}
            </div>
        </div>
      </div>

      {/* Main Evidence Log Table */}
      <table className="w-full border-collapse border-2 border-black mb-6 text-[10px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-black p-2 text-center w-[60px] uppercase font-black">ISO 21001:2018</th>
            <th className="border border-black p-2 text-left uppercase font-black">Requirements & Observations (Objective Evidence)</th>
            <th className="border border-black p-2 text-center w-[80px] uppercase font-black">Findings (C, NC, OFI)</th>
          </tr>
        </thead>
        <tbody>
          {sortedClauses.map((clause) => {
            const finding = findingsMap.get(clause.id);
            const questions = clauseQuestions[clause.id] || [];
            
            return (
              <tr key={clause.id} className="break-inside-avoid">
                <td className="border border-black p-2 text-center font-black align-top pt-4">
                  {clause.id}
                </td>
                <td className="border border-black p-2 align-top space-y-3">
                  <div className="space-y-1">
                    <p className="font-black text-[9px] uppercase text-primary/80">{clause.title}</p>
                    <ul className="list-disc pl-4 text-muted-foreground/80 leading-relaxed font-medium">
                        {questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                  <div className="pt-2 border-t border-slate-100 min-h-[60px]">
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1">Auditor Observations / Objective Evidence:</p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                        {finding?.evidence || <span className="text-slate-300 italic">No record entry.</span>}
                    </p>
                    {finding?.type === 'Non-Conformance' && finding.ncStatement && (
                        <div className="mt-3 p-3 bg-red-50/50 border border-black border-dashed">
                            <p className="font-black text-[8px] uppercase mb-1 text-red-700">Statement of Non-Conformance:</p>
                            <p className="italic leading-relaxed font-bold">"{finding.ncStatement}"</p>
                        </div>
                    )}
                  </div>
                </td>
                <td className="border border-black p-2 text-center font-black align-top pt-4">
                  {finding ? (
                      <span className={cn(
                          "text-sm",
                          finding.type === 'Non-Conformance' ? 'text-red-600' : 
                          finding.type === 'Commendation' ? 'text-green-600' : 'text-amber-600'
                      )}>
                          {finding.type === 'Commendation' ? 'C' : 
                           finding.type === 'Non-Conformance' ? 'NC' : 'OFI'}
                      </span>
                  ) : '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Consolidated Audit Summary */}
      <div className="space-y-4 break-inside-avoid">
        <h3 className="font-black text-xs uppercase border-b-2 border-black pb-1 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Consolidated Audit Summary
        </h3>
        
        <div className="grid grid-cols-1 border-2 border-black divide-y-2 divide-black text-[10px]">
            <div className="p-3">
                <h4 className="font-black uppercase text-green-700 mb-1">List of Commendable Practices (C)</h4>
                <div className="min-h-[40px] whitespace-pre-wrap italic">{schedule.summaryCommendablePractices || 'None recorded.'}</div>
            </div>
            <div className="p-3">
                <h4 className="font-black uppercase text-amber-700 mb-1">Opportunities for Improvement (OFI)</h4>
                <div className="min-h-[40px] whitespace-pre-wrap italic">{schedule.summaryOFI || 'None recorded.'}</div>
            </div>
            <div className="p-3 bg-slate-50">
                <h4 className="font-black uppercase text-red-700 mb-1">Non-Conformance / Non-Compliance (NC)</h4>
                <div className="min-h-[40px] whitespace-pre-wrap italic">{schedule.summaryNC || 'None recorded.'}</div>
            </div>
        </div>
      </div>

      {/* Official Signatories Section */}
      <div className="grid grid-cols-2 gap-16 mt-12 text-center break-inside-avoid px-10">
        <div>
          <div className="border-b border-black font-black text-xs pb-1 mb-1 min-h-[24px]">
            {schedule.auditorName || '__________________________'}
          </div>
          <p className="text-[9px] uppercase font-black text-slate-500">Internal Auditor</p>
        </div>
        <div>
          <div className="border-b border-black font-black text-xs pb-1 mb-1 min-h-[24px] uppercase">
            {schedule.officerInCharge || '__________________________'}
          </div>
          <p className="text-[9px] uppercase font-black text-slate-500">Unit Head / Director</p>
        </div>
      </div>

      {/* Pagination & Control Footer */}
      <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-IQA-LOG | REV 02-2025</span>
        <span className="font-bold">Page 1 of 1</span>
        <span>Electronic Copy Issued by RSU EOMS Portal</span>
      </div>
    </div>
  );
}
