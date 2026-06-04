'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { clauseQuestions } from '@/lib/audit-questions';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import allClausesData from '@/lib/iso-clauses.json';

interface AuditPrintTemplateProps {
  schedule: AuditSchedule;
  findings: AuditFinding[];
  clauses: ISOClause[];
  signatories?: Signatories;
  leadAuditorName?: string;
  campusName: string;
}

export function AuditPrintTemplate({ schedule, findings, clauses, signatories, leadAuditorName, campusName }: AuditPrintTemplateProps) {
  const conductDate = schedule.scheduledDate instanceof Timestamp 
    ? schedule.scheduledDate.toDate() 
    : (schedule.scheduledDate ? new Date(schedule.scheduledDate) : new Date());

  const findingsMap = new Map(findings.map(f => [f.isoClause, f]));
  const isBlankTemplate = findings.length === 0;
  const clausesToRender = isBlankTemplate ? allClausesData.clauses : clauses;
  const sortedClauses = [...clausesToRender].sort((a, b) => 
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );

  const qaoDirectorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';

  // Identify the primary auditee name to display
  const displayAuditee = schedule.officerInCharge || schedule.auditeeHeadName || '________________';

  return (
    <div className="w-full text-black bg-white mx-auto font-sans leading-tight print:p-0" style={{ width: '100%', fontSize: '12pt' }}>
      <style>{`
        @media print {
          tr, td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
        }
      `}</style>
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
                <span className="opacity-60 mr-2">CAMPUS:</span> {campusName}
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

      {/* Main Evidence Log Table (using Flexbox to prevent Chrome print page-break bugs) */}
      <div className="w-full mb-6" style={{ fontSize: '11pt' }}>
        {/* Header */}
        <div className={cn("flex w-full border-2 border-black bg-white font-black uppercase", isBlankTemplate ? "text-[11pt]" : "text-[10pt]")}>
          <div className="w-[12%] border-r-2 border-black p-2 text-center flex items-center justify-center shrink-0">
            ISO 21001:2018
          </div>
          <div className="w-[70%] border-r-2 border-black p-2 text-left flex items-center flex-1">
            REQUIREMENTS & OBSERVATIONS (OBJECTIVE EVIDENCE)
          </div>
          <div className="w-[18%] p-2 text-center flex items-center justify-center shrink-0">
            FINDINGS (C, NC, OFI)
          </div>
        </div>

        {/* Rows */}
        {sortedClauses.map((clause) => {
          const finding = findingsMap.get(clause.id);
          const questions = clauseQuestions[clause.id] || [];
          
          return (
            <div 
              key={clause.id} 
              className="flex w-full border-x-2 border-b-2 border-black bg-white" 
              style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
            >
              <div className="w-[12%] border-r-2 border-black p-2 text-center font-black align-top pt-4 shrink-0">
                {clause.id}
              </div>
              <div className="w-[70%] border-r-2 border-black p-4 align-top space-y-4 flex-1">
                <div className="space-y-2">
                  <p className="font-black uppercase text-slate-900" style={{ fontSize: '11pt' }}>{clause.title}</p>
                  <ul 
                    className={cn(
                      "pl-6 text-slate-800 font-bold",
                      isBlankTemplate ? "space-y-1" : "space-y-1.5 leading-relaxed"
                    )}
                    style={{ 
                      fontSize: isBlankTemplate ? '11pt' : '10pt', 
                      lineHeight: isBlankTemplate ? '1.2' : undefined 
                    }}
                  >
                      {questions.map((q, i) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
                
                <div style={{ borderTop: '1px solid #e2e8f0', margin: '15px 0' }} />

                <div className={cn("pt-4", isBlankTemplate ? "min-h-[140px]" : "min-h-[80px]")}>
                  <p className="font-black uppercase text-slate-900 mb-4" style={{ fontSize: isBlankTemplate ? '11pt' : '9pt' }}>AUDITOR OBSERVATIONS / OBJECTIVE EVIDENCE:</p>
                  {isBlankTemplate ? (
                      <div className="space-y-4 pl-2 mt-2">
                          <div className="flex items-end gap-2 h-7">
                              <span className="font-bold shrink-0" style={{ fontSize: '11pt' }}>1.</span>
                              <div className="flex-1 border-b border-black/40 mb-1" />
                          </div>
                          <div className="flex items-end gap-2 h-7">
                              <span className="font-bold shrink-0" style={{ fontSize: '11pt' }}>2.</span>
                              <div className="flex-1 border-b border-black/40 mb-1" />
                          </div>
                          <div className="flex items-end gap-2 h-7">
                              <span className="font-bold shrink-0" style={{ fontSize: '11pt' }}>3.</span>
                              <div className="flex-1 border-b border-black/40 mb-1" />
                          </div>
                      </div>
                  ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{finding?.evidence || ""}</p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4">
                   <p className="font-black uppercase text-slate-900 mb-2" style={{ fontSize: isBlankTemplate ? '11pt' : '9pt' }}>Finding Statement:</p>
                   {isBlankTemplate ? (
                      <div className="space-y-4 pl-2 mt-2">
                          <div className="flex items-end gap-2 h-7">
                              <span className="font-bold shrink-0" style={{ fontSize: '11pt' }}>1.</span>
                              <div className="flex-1 border-b border-black/40 mb-1" />
                          </div>
                          <div className="flex items-end gap-2 h-7">
                              <span className="font-bold shrink-0" style={{ fontSize: '11pt' }}>2.</span>
                              <div className="flex-1 border-b border-black/40 mb-1" />
                          </div>
                      </div>
                   ) : (
                      <p className="italic leading-relaxed">{finding?.ncStatement || finding?.description || ""}</p>
                   )}
                </div>
              </div>
              <div className="w-[18%] p-4 align-top pt-20 shrink-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                      <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Compliance' ? 'black' : 'transparent' }}>
                          {finding?.type === 'Compliance' && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className={cn("font-black uppercase", isBlankTemplate ? "text-[11pt]" : "text-[10pt]")}>Compliant</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Observation for Improvement' ? 'black' : 'transparent' }}>
                          {finding?.type === 'Observation for Improvement' && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className={cn("font-black uppercase", isBlankTemplate ? "text-[11pt]" : "text-[10pt]")}>OFI</span>
                  </div>
                  <div className="flex items-center gap-3">
                      <div style={{ width: '18px', height: '18px', border: '1.5px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Non-Conformance' ? 'black' : 'transparent' }}>
                          {finding?.type === 'Non-Conformance' && <Check className="h-4 w-4 text-white" />}
                      </div>
                      <span className={cn("font-black uppercase", isBlankTemplate ? "text-[11pt]" : "text-[10pt]")}>NC</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
