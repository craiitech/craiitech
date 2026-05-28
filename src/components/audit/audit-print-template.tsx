'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { clauseQuestions } from '@/lib/audit-questions';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface AuditPrintTemplateProps {
  schedule: AuditSchedule;
  findings: AuditFinding[];
  clauses: ISOClause[];
  signatories?: Signatories;
  leadAuditorName?: string;
}

export function AuditPrintTemplate({ schedule, findings, clauses, signatories, leadAuditorName }: AuditPrintTemplateProps) {
  const conductDate = schedule.scheduledDate instanceof Timestamp 
    ? schedule.scheduledDate.toDate() 
    : (schedule.scheduledDate ? new Date(schedule.scheduledDate) : new Date());

  const findingsMap = new Map(findings.map(f => [f.isoClause, f]));
  const sortedClauses = [...clauses].sort((a, b) => 
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );

  const qaoDirectorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';
  const isBlankTemplate = findings.length === 0;

  // Identify the primary auditee name to display
  const displayAuditee = schedule.officerInCharge || schedule.auditeeHeadName || '________________';

  return (
    <div className="text-black bg-white mx-auto font-sans leading-tight print:p-0" style={{ width: '7.5in', fontSize: '12pt' }}>
      {/* Institutional Branding Header */}
      <div className="flex flex-col items-center text-center border-b-2 border-black pb-4 mb-4">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="text-xl font-bold uppercase tracking-tight leading-none" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="text-lg font-semibold uppercase tracking-tight leading-none mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p className="text-xs italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-3 px-8 py-1.5 bg-black text-white text-sm font-black uppercase tracking-[0.2em] shadow-sm">
          Internal Quality Audit Evidence Log {isBlankTemplate && '(Template)'}
        </div>
      </div>

      {/* Official Audit Metadata Matrix */}
      <div className="w-full border-2 border-black mb-6 text-[10pt] overflow-hidden">
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
                <span className="opacity-60 mr-2">AUDIT NO:</span> {schedule.auditNumber || '--'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITOR:</span> {schedule.auditorName || '________________'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITEE:</span> {displayAuditee}
            </div>
            <div className="p-2 font-bold">
                <span className="opacity-60 mr-2">DATE:</span> {format(conductDate, 'MM/dd/yyyy')}
            </div>
        </div>
      </div>

      {/* Main Evidence Log Table */}
      <table className="w-full border-separate border-2 border-black mb-6" style={{ fontSize: '11pt', borderCollapse: 'collapse' }}>
        <thead style={{ display: 'table-header-group' }}>
          <tr className="bg-white">
            <th className="border-2 border-black p-2 text-center w-[12%] uppercase font-black" style={{ fontSize: '10pt' }}>ISO 21001:2018</th>
            <th className="border-2 border-black p-2 text-left uppercase font-black" style={{ fontSize: '10pt' }}>REQUIREMENTS & OBSERVATIONS (OBJECTIVE EVIDENCE)</th>
            <th className="border-2 border-black p-2 text-center w-[18%] uppercase font-black" style={{ fontSize: '10pt' }}>FINDINGS (C, NC, OFI)</th>
          </tr>
        </thead>
        <tbody>
          {sortedClauses.map((clause) => {
            const finding = findingsMap.get(clause.id);
            const questions = clauseQuestions[clause.id] || [];
            
            return (
              <tr key={clause.id} className="break-inside-avoid">
                <td className="border-2 border-black p-2 text-center font-black align-top pt-4">
                  {clause.id}
                </td>
                <td className="border-2 border-black p-4 align-top space-y-4">
                  <div className="space-y-2">
                    <p className="font-black uppercase text-slate-900" style={{ fontSize: '11pt' }}>{clause.title}</p>
                    <ul className="space-y-1.5 pl-6 text-slate-800 leading-relaxed font-bold" style={{ fontSize: '10pt' }}>
                        {questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '15px 0' }} />

                  <div className={cn("pt-4", isBlankTemplate ? "min-h-[140px]" : "min-h-[80px]")}>
                    <p className="font-black uppercase text-slate-900 mb-4" style={{ fontSize: '9pt' }}>AUDITOR OBSERVATIONS / OBJECTIVE EVIDENCE:</p>
                    {isBlankTemplate ? (
                        <div className="space-y-3 pl-2">
                            <p className="font-bold">1.</p>
                            <p className="font-bold">2.</p>
                            <p className="font-bold">3.</p>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{finding?.evidence || ""}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 mt-4">
                     <p className="font-black uppercase text-slate-900 mb-2" style={{ fontSize: '9pt' }}>Finding Statement:</p>
                     {isBlankTemplate ? (
                        <div className="space-y-3 pl-2">
                            <p className="font-bold">1.</p>
                            <p className="font-bold">2.</p>
                        </div>
                    ) : (
                        <p className="italic leading-relaxed">{finding?.ncStatement || finding?.description || ""}</p>
                    )}
                  </div>
                </td>
                <td className="border-2 border-black p-4 align-top pt-20">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Compliance' ? 'black' : 'transparent' }}>
                            {finding?.type === 'Compliance' && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <span className="text-[10pt] font-black uppercase">Compliant</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Observation for Improvement' ? 'black' : 'transparent' }}>
                            {finding?.type === 'Observation for Improvement' && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <span className="text-[10pt] font-black uppercase">OFI</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Non-Conformance' ? 'black' : 'transparent' }}>
                            {finding?.type === 'Non-Conformance' && <Check className="h-4 w-4 text-white" />}
                        </div>
                        <span className="text-[10pt] font-black uppercase">NC</span>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Official Signatories Section */}
      <div className="grid grid-cols-2 gap-16 mt-16 text-center break-inside-avoid px-10">
        <div>
          <div className="border-b border-black font-black text-sm pb-1 mb-1 min-h-[30px] uppercase">
            {schedule.auditorName || '__________________________'}
          </div>
          <p className="uppercase font-black text-slate-500" style={{ fontSize: '10pt' }}>Internal Auditor</p>
        </div>
        <div>
          <div className="border-b border-black font-black text-sm pb-1 mb-1 min-h-[30px] uppercase">
            {displayAuditee}
          </div>
          <p className="uppercase font-black text-slate-500" style={{ fontSize: '10pt' }}>Unit Head / Director</p>
        </div>
      </div>

      {/* System Generated Note */}
      <div className="mt-8 text-center font-bold italic text-slate-500" style={{ fontSize: '10pt' }}>
        This is a system-generated report; signature is not required.
      </div>

      {/* Pagination & Control Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '9pt' }}>
        <span>RSU-QAO-IQA-LOG | REV 03-2025</span>
        <span className="font-bold">Page 1 of 1</span>
        <span>Issued by: {leadAuditorName || qaoDirectorName}</span>
      </div>
    </div>
  );
}
