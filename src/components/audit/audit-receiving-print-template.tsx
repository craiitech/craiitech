'use client';

import React from 'react';
import { format } from 'date-fns';

interface AuditorEntry {
    name: string;
    campuses: string[];
}

interface AuditReceivingPrintTemplateProps {
  auditors: AuditorEntry[];
  year: number;
}

/**
 * AUDIT CHECKLIST RECEIVING FORM
 * Standardized for Folio (8.5 x 13) paper.
 * Columns: Name of Auditor, Campus/Site, Date Received, Signature.
 */
export function AuditReceivingPrintTemplate({ auditors, year }: AuditReceivingPrintTemplateProps) {
  // Fill up to 15 rows for a full page presentation if few auditors are assigned
  const displayRows = [...auditors];
  while (displayRows.length < 15) {
      displayRows.push({ name: '', campuses: [] });
  }

  return (
    <div className="p-0 text-black dark:text-white bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '12pt' }}>
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="font-bold uppercase leading-none" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p style={{ fontSize: '10pt' }} className="italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-8 border-y-2 border-black py-3 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="font-black uppercase tracking-[0.15em]" style={{ fontSize: '13pt' }}>AUDIT CHECKLIST RECEIVING FORM</h2>
          <p className="font-bold mt-1" style={{ fontSize: '12pt' }}>ACADEMIC YEAR {year}</p>
        </div>
      </div>

      <div className="mb-6">
          <p className="text-justify leading-relaxed">
              This form serves as the official acknowledgment of receipt for the Internal Quality Audit (IQA) Checklists. By signing below, the assigned auditor confirms that they have received the necessary documentation, scope, and criteria for their designated audit sessions.
          </p>
      </div>

      {/* Main Receiving Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
          <thead>
              <tr className="bg-gray-100">
                  <th className="border-2 border-black p-3 text-center font-black uppercase w-[30%]" style={{ fontSize: '11pt' }}>Name of Auditor</th>
                  <th className="border-2 border-black p-3 text-center font-black uppercase w-[25%]" style={{ fontSize: '11pt' }}>Campus / Site</th>
                  <th className="border-2 border-black p-3 text-center font-black uppercase w-[20%]" style={{ fontSize: '11pt' }}>Date Received</th>
                  <th className="border-2 border-black p-3 text-center font-black uppercase w-[25%]" style={{ fontSize: '11pt' }}>Signature</th>
              </tr>
          </thead>
          <tbody>
              {displayRows.map((auditor, i) => (
                  <tr key={i} className="h-16 border-b border-black break-inside-avoid">
                      <td className="border-2 border-black p-3 font-black uppercase align-middle">
                          {auditor.name}
                      </td>
                      <td className="border-2 border-black p-3 text-center font-bold uppercase align-middle" style={{ fontSize: '10pt' }}>
                          {auditor.campuses.join(', ')}
                      </td>
                      <td className="border-2 border-black p-3 align-middle">
                          {/* Blank for manual entry */}
                      </td>
                      <td className="border-2 border-black p-3 align-middle">
                          {/* Blank for signature */}
                      </td>
                  </tr>
              ))}
          </tbody>
      </table>

      {/* Official Verification Note */}
      <div className="mt-10 font-bold mb-12 italic text-center">
        This document remains part of the official IQA framework archives.
      </div>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-[10pt] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-IQA-RECEIVING | REV 01-2025</span>
        <div className="text-right">
            <p>Institutional Excellence Record</p>
            <p>Generated via RSU EOMS Portal</p>
        </div>
      </div>
    </div>
  );
}
