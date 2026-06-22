'use client';

import React from 'react';
import type { AuditSchedule, AuditFinding, ISOClause, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { clauseQuestions } from '@/lib/audit-questions';
import { cn, parseDate } from '@/lib/utils';
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
  const conductDate = parseDate(schedule.scheduledDate);

  const isBlankTemplate = findings.length === 0;
  const clausesToRender = isBlankTemplate ? allClausesData.clauses : clauses;
  const sortedClauses = [...clausesToRender].sort((a, b) => 
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' })
  );

  const qaoDirectorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';

  // Identify the primary auditee name to display
  const displayAuditee = schedule.officerInCharge || schedule.auditeeHeadName || '________________';

  return (
    <div className="text-black bg-white mx-auto leading-tight print:p-0" style={{ width: '7.5in', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11pt' }}>
      <style>{`
        @media print {
          tr, td {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: auto;
          }
          .print-page-break {
              page-break-after: always;
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
        <div className="grid grid-cols-5">
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDIT NO:</span> {schedule.auditNumber || '--'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITOR:</span> {schedule.auditorName || '________________'}
            </div>
            <div className="p-2 border-r border-black font-bold">
                <span className="opacity-60 mr-2">AUDITEE:</span> {displayAuditee}
            </div>
            <div className="p-2 border-r border-black font-bold text-xs truncate">
                <span className="opacity-60 mr-1">METHOD:</span> {schedule.iqaMethod || 'Face to Face'}
            </div>
            <div className="p-2 font-bold">
                <span className="opacity-60 mr-2">DATE:</span> {format(conductDate, 'MM/dd/yyyy')}
            </div>
        </div>
      </div>

      {/* Main Evidence Log Table (Standard HTML table for robust folio printing) */}
      <table className="w-full border-collapse border-2 border-black mb-6" style={{ fontSize: '11pt', tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b-2 border-black font-bold uppercase text-[10pt] bg-white">
            <th 
              className="border-r-2 border-black p-2 text-center" 
              style={{ width: '12%', verticalAlign: 'middle', fontWeight: 'bold' }}
            >
              <div>ISO</div>
              <div>21001:2018</div>
            </th>
            <th 
              className="border-r-2 border-black p-2 text-center" 
              style={{ width: '70%', verticalAlign: 'middle', fontWeight: 'bold' }}
            >
              REQUIREMENTS & OBSERVATIONS (OBJECTIVE EVIDENCE)
            </th>
            <th 
              className="p-2 text-center" 
              style={{ width: '18%', verticalAlign: 'middle', fontWeight: 'bold' }}
            >
              <div>FINDINGS</div>
              <div>(C, NC, OFI)</div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedClauses.map((clause) => {
            const clauseFindings = findings.filter(f => f.isoClause === clause.id);
            const questions = clauseQuestions[clause.id] || [];
            
            const findingsToPrint = clauseFindings.length > 0 ? clauseFindings : [null];
            
            return (
              <tr 
                key={clause.id} 
                className="border-b-2 border-black bg-white break-inside-avoid"
                style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
              >
                {/* Column 1: ISO Clause ID */}
                <td 
                  className="border-r-2 border-black p-2 text-center font-bold" 
                  style={{ verticalAlign: 'middle', fontSize: '11pt' }}
                >
                  {clause.id}
                </td>
 
                {/* Column 2: Requirements, Observations, Findings */}
                <td className="border-r-2 border-black p-3.5 align-top">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <p className="font-bold uppercase text-black" style={{ fontSize: '11pt' }}>{clause.title}</p>
                      <div className="space-y-1 text-black font-normal" style={{ fontSize: '11pt', lineHeight: '1.2' }}>
                        {questions.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 pl-1">
                            <span className="shrink-0">•</span>
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
 
                    {findingsToPrint.map((finding, idx) => (
                      <div key={finding?.id || idx} className={cn("space-y-2", idx > 0 && "border-t border-dashed border-slate-300 pt-3 mt-3")}>
                        {findingsToPrint.length > 1 && (
                          <p className="font-bold text-xs uppercase text-slate-500 mb-1">Audit Result {idx + 1}:</p>
                        )}
                        <div className="pt-1">
                          <p className="font-bold uppercase text-black mb-1" style={{ fontSize: '11pt' }}>AUDITOR OBSERVATIONS / OBJECTIVE EVIDENCE:</p>
                          {isBlankTemplate ? (
                              <div className="space-y-0.5 pl-1 mt-0.5 font-normal text-black" style={{ fontSize: '11pt' }}>
                                  <div>1.</div>
                                  <div>2.</div>
                                  <div>3.</div>
                              </div>
                          ) : (
                              <p className="whitespace-pre-wrap leading-relaxed font-normal" style={{ fontSize: '11pt' }}>{finding?.evidence || ""}</p>
                          )}
                        </div>
 
                        <div className="pt-1">
                           <p className="font-bold text-black mb-1" style={{ fontSize: '11pt' }}>Finding Statement</p>
                           {isBlankTemplate ? (
                              <div className="space-y-0.5 pl-1 mt-0.5 font-normal text-black" style={{ fontSize: '11pt' }}>
                                  <div>1.</div>
                                  <div>2.</div>
                              </div>
                           ) : (
                              <p className="italic leading-relaxed font-normal" style={{ fontSize: '11pt' }}>{finding?.ncStatement || finding?.description || ""}</p>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
 
                {/* Column 3: Checkboxes */}
                <td className="p-3" style={{ verticalAlign: 'middle' }}>
                  <div className="flex flex-col items-center justify-center select-none">
                    <div className="space-y-4 w-full">
                      {findingsToPrint.map((finding, idx) => (
                        <div key={finding?.id || idx} className={cn("flex flex-col items-center", idx > 0 && "border-t border-dashed border-slate-300 pt-3 mt-3")}>
                          {findingsToPrint.length > 1 && (
                            <p className="font-bold text-[8pt] text-slate-500 uppercase mb-1">Result {idx + 1}</p>
                          )}
                          <div className="space-y-2.5 font-normal text-black w-fit" style={{ fontSize: '11pt' }}>
                            <div className="flex items-center gap-2">
                                <div className="border border-black flex-shrink-0" style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Compliance' ? '#000' : 'transparent' }}>
                                    {finding?.type === 'Compliance' && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span>Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="border border-black flex-shrink-0" style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Observation for Improvement' ? '#000' : 'transparent' }}>
                                    {finding?.type === 'Observation for Improvement' && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span>OFI</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="border border-black flex-shrink-0" style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Non-Conformance' ? '#000' : 'transparent' }}>
                                    {finding?.type === 'Non-Conformance' && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span>NC</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="border border-black flex-shrink-0" style={{ width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: finding?.type === 'Not Applicable' ? '#000' : 'transparent' }}>
                                    {finding?.type === 'Not Applicable' && <Check className="h-3 w-3 text-white" />}
                                </div>
                                <span>N/A</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* FINAL AUDIT SUMMARY SECTION */}
      <div className="w-full space-y-4 mb-10 break-inside-avoid">
          <div className="bg-slate-50 border-2 border-black p-2 font-black uppercase text-center" style={{ fontSize: '11pt' }}>
              Final Audit Report Summary
          </div>
          <table className="w-full border-collapse border-2 border-black" style={{ tableLayout: 'fixed' }}>
              <tbody>
                  <tr className="border-b border-black">
                      <td className="p-3 align-top border-r border-black w-1/2 min-h-[120px]">
                          <p className="font-black text-[10pt] uppercase text-blue-700 mb-2">Summary of Commendable Practices (P):</p>
                          <p className="text-[10pt] leading-relaxed whitespace-pre-wrap italic">
                              {schedule.summaryCommendable || (isBlankTemplate ? '' : 'None recorded.')}
                          </p>
                      </td>
                      <td className="p-3 align-top w-1/2">
                          <p className="font-black text-[10pt] uppercase text-emerald-700 mb-2">Summary of Compliance (C):</p>
                          <p className="text-[10pt] leading-relaxed whitespace-pre-wrap italic">
                              {schedule.summaryCompliance || (isBlankTemplate ? '' : 'None recorded.')}
                          </p>
                      </td>
                  </tr>
                  <tr>
                      <td className="p-3 align-top border-r border-black w-1/2 min-h-[120px]">
                          <p className="font-black text-[10pt] uppercase text-amber-700 mb-2">Opportunities for Improvement (OFI):</p>
                          <p className="text-[10pt] leading-relaxed whitespace-pre-wrap italic">
                              {schedule.summaryOFI || (isBlankTemplate ? '' : 'None recorded.')}
                          </p>
                      </td>
                      <td className="p-3 align-top w-1/2">
                          <p className="font-black text-[10pt] uppercase text-rose-700 mb-2">Non-Conformance / Non-Compliance (NC):</p>
                          <p className="text-[10pt] leading-relaxed whitespace-pre-wrap italic">
                              {schedule.summaryNC || (isBlankTemplate ? '' : 'None recorded.')}
                          </p>
                      </td>
                  </tr>
              </tbody>
          </table>
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
      <div className="mt-8 text-center font-bold italic text-slate-500" style={{ fontSize: '11pt' }}>
        This is a system-generated report; signature is not required.
      </div>

      {/* Pagination & Control Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-slate-400 italic uppercase tracking-widest" style={{ fontSize: '10pt' }}>
        <span>RSU-QAO-IQA-LOG | REV 03-2025</span>
        <span className="font-bold">Page 1 of 1</span>
        <span>Issued by: {leadAuditorName || qaoDirectorName}</span>
      </div>
    </div>
  );
}
