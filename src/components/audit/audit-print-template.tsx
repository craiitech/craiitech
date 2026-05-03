'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { clauseQuestions } from '@/lib/audit-questions';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      {/* Institutional Branding Header - Logo Removed */}
      <div className="flex flex-col items-center text-center border-b-2 border-black pb-4 mb-4">
        <div className="flex flex-col items-center gap-1 mb-2">
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
      <table className="w-full border-collapse border-2 border-black mb-6" style={{ fontSize: '11pt' }}>
        <thead className="display-table-header-group" style={{ display: 'table-header-group' }}>
          <tr className="bg-slate-100">
            <th className="border border-black p-2 text-center w-[70px] uppercase font-black" style={{ fontSize: '10pt' }}>ISO 21001:2018</th>
            <th className="border border-black p-2 text-left uppercase font-black" style={{ fontSize: '10pt' }}>Requirements & Observations (Objective Evidence)</th>
            <th className="border border-black p-2 text-center w-[90px] uppercase font-black" style={{ fontSize: '10pt' }}>Findings (C, NC, OFI)</th>
          </tr>
        </thead>
        <tbody>
          {sortedClauses.map((clause) => {
            const finding = findingsMap.get(clause.id);
            const questions = clauseQuestions[clause.id] || [];
            
            return (
              <tr key={clause.id} className="break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
                <td className="border border-black p-2 text-center font-black align-top pt-4">
                  {clause.id}
                </td>
                <td className="border border-black p-2 align-top space-y-4">
                  <div className="space-y-1">
                    <p className="font-black uppercase text-primary/80" style={{ fontSize: '11pt' }}>{clause.title}</p>
                    <ul className="list-disc pl-5 text-muted-foreground/80 leading-relaxed font-medium" style={{ fontSize: '10pt' }}>
                        {questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                  <div className={cn("pt-2 border-t border-slate-100", isBlankTemplate ? "min-h-[180px]" : "min-h-[80px]")}>
                    <p className="font-black uppercase text-slate-400 mb-1" style={{ fontSize: '9pt' }}>Auditor Observations / Objective Evidence:</p>
                    <p className="whitespace-pre-wrap leading-relaxed">
                        {finding?.evidence || ""}
                    </p>
                    {finding?.type === 'Non-Conformance' && finding.ncStatement && (
                        <div className="mt-3 p-4 bg-red-50/50 border border-black border-dashed">
                            <p className="font-black uppercase mb-1 text-red-700" style={{ fontSize: '9pt' }}>Statement of Non-Conformance:</p>
                            <p className="italic leading-relaxed font-bold">"{finding.ncStatement}"</p>
                        </div>
                    )}
                  </div>
                </td>
                <td className="border border-black p-2 text-center font-black align-top pt-4">
                  {finding ? (
                      <span className={cn(
                          "text-base",
                          finding.type === 'Non-Conformance' ? "text-red-600" : 
                          finding.type === 'Compliance' ? "text-green-600" : "text-amber-600"
                      )}>
                          {finding.type === 'Compliance' ? 'C' : 
                           finding.type === 'Non-Conformance' ? 'NC' : 'OFI'}
                      </span>
                  ) : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Consolidated Audit Summary */}
      <div className="space-y-4 break-inside-avoid" style={{ pageBreakInside: 'avoid' }}>
        <h3 className="font-black uppercase border-b-2 border-black pb-1 flex items-center gap-2" style={{ fontSize: '12pt' }}>
            <CheckCircle2 className="h-5 w-5" />
            Consolidated Audit Summary
        </h3>
        
        <div className="grid grid-cols-1 border-2 border-black divide-y-2 divide-black" style={{ fontSize: '11pt' }}>
            <div className="p-4 bg-blue-50/30">
                <h4 className="font-black uppercase text-blue-700 mb-1" style={{ fontSize: '10pt' }}>Summary of Commendable Practices (P)</h4>
                <div className={cn("whitespace-pre-wrap italic", isBlankTemplate ? "min-h-[100px]" : "min-h-[60px]")}>{schedule.summaryCommendable || ''}</div>
            </div>
            <div className="p-4">
                <h4 className="font-black uppercase text-green-700 mb-1" style={{ fontSize: '10pt' }}>Summary of Compliance (C)</h4>
                <div className={cn("whitespace-pre-wrap italic", isBlankTemplate ? "min-h-[100px]" : "min-h-[60px]")}>{schedule.summaryCompliance || ''}</div>
            </div>
            <div className="p-4">
                <h4 className="font-black uppercase text-amber-700 mb-1" style={{ fontSize: '10pt' }}>Opportunities for Improvement (OFI)</h4>
                <div className={cn("whitespace-pre-wrap italic", isBlankTemplate ? "min-h-[100px]" : "min-h-[60px]")}>{schedule.summaryOFI || ''}</div>
            </div>
            <div className="p-4 bg-slate-50">
                <h4 className="font-black uppercase text-red-700 mb-1" style={{ fontSize: '10pt' }}>Non-Conformance / Non-Compliance (NC)</h4>
                <div className={cn("whitespace-pre-wrap italic", isBlankTemplate ? "min-h-[100px]" : "min-h-[60px]")}>{schedule.summaryNC || ''}</div>
            </div>
        </div>
      </div>

      {/* Official Signatories Section */}
      <div className="grid grid-cols-2 gap-16 mt-16 text-center break-inside-avoid px-10" style={{ pageBreakInside: 'avoid' }}>
        <div>
          <div className="border-b border-black font-black text-sm pb-1 mb-1 min-h-[30px]">
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
      <div className="mt-6 text-center font-bold italic text-slate-500" style={{ fontSize: '10pt' }}>
        This is a system-generated report; signature is not required.
      </div>

      {/* Pagination & Control Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '9pt' }}>
        <span>RSU-QAO-IQA-LOG | REV 02-2025</span>
        <span className="font-bold">Page 1 of 1</span>
        <span>Issued by: {leadAuditorName || qaoDirectorName}</span>
      </div>
    </div>
  );
}
