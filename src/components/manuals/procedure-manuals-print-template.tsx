'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type ProcedureManualReportRow = {
  unitId: string;
  unitName: string;
  isShared?: boolean;
  procedureNumber: string;
  manualTitle: string;
  numberOfProcesses: string | number;
  revisionNumber: string;
  revisionDate: string;
  pageCount: string | number;
  hasData: boolean;
};

interface ProcedureManualsPrintTemplateProps {
  rows: ProcedureManualReportRow[];
  qaoDirector?: string;
  qmsHead?: string;
}

export function ProcedureManualsPrintTemplate({
  rows,
  qaoDirector = 'QAO Director',
  qmsHead = 'QMS Head',
}: ProcedureManualsPrintTemplateProps) {
  const totalUnits = rows.length;
  const configuredCount = rows.filter((r) => r.hasData).length;
  const missingCount = totalUnits - configuredCount;

  return (
    <div
      className="p-8 text-black bg-white max-w-[13in] mx-auto font-serif leading-tight print:p-0"
      style={{ fontSize: '9.5pt' }}
    >
      {/* INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-6">
        <div className="space-y-1">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '13pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '11pt' }}>
            Quality Assurance Office
          </h2>
          <p className="text-[8.5pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      {/* MEMORANDUM DETAILS */}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-0.5">
          <p className="font-bold uppercase tracking-wider">MEMORANDUM / INVENTORY REPORT</p>
          <p className="text-[8.5pt] font-mono">
            Ref No: RSU-QAO-PMI-{new Date().getFullYear()}-{format(new Date(), 'MMdd')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* SUBJECT */}
      <div className="mb-5">
        <div className="grid grid-cols-12 gap-2 pt-1 border-t border-b border-black py-2 bg-slate-50">
          <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
          <span className="col-span-10 font-black uppercase underline decoration-1 underline-offset-2">
            UNIT PROCEDURE MANUALS INVENTORY AND STATUS REPORT
          </span>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <div className="border border-black p-2 bg-slate-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-slate-700">Total Units / Groups</p>
          <p className="text-base font-black">{totalUnits}</p>
        </div>
        <div className="border border-black p-2 bg-emerald-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-emerald-800">Configured Manuals</p>
          <p className="text-base font-black text-emerald-900">{configuredCount}</p>
        </div>
        <div className="border border-black p-2 bg-amber-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-amber-800">
            Pending / No Data (Highlighted)
          </p>
          <p className="text-base font-black text-amber-900">{missingCount}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="space-y-3 mb-8">
        <p className="text-[9pt] italic">
          * Highlighted rows indicate units with <strong>no registered data</strong> on their procedure manual. These
          units must be updated in the system settings.
        </p>

        <table className="w-full border-collapse border border-black" style={{ fontSize: '8.5pt' }}>
          <thead>
            <tr className="bg-slate-200 text-black">
              <th className="border border-black p-2 text-center w-8 font-black uppercase">#</th>
              <th className="border border-black p-2 text-left w-28 font-black uppercase">Procedure Number</th>
              <th className="border border-black p-2 text-left font-black uppercase">Unit</th>
              <th className="border border-black p-2 text-left font-black uppercase">Procedure Manual Title</th>
              <th className="border border-black p-2 text-center w-24 font-black uppercase">No. of Processes</th>
              <th className="border border-black p-2 text-center w-20 font-black uppercase">Revision No.</th>
              <th className="border border-black p-2 text-center w-24 font-black uppercase">Revision Date</th>
              <th className="border border-black p-2 text-center w-20 font-black uppercase">Total Pages</th>
              <th className="border border-black p-2 text-center w-24 font-black uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isMissing = !row.hasData;
              return (
                <tr
                  key={row.unitId}
                  className={cn(isMissing ? 'bg-amber-100/80 font-medium' : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white')}
                >
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-mono font-bold">
                    {row.procedureNumber || <span className="text-slate-400 italic font-normal">—</span>}
                  </td>
                  <td className="border border-black p-1.5 font-bold">
                    {row.unitName}
                    {row.isShared && <span className="ml-1 text-[7.5pt] italic text-blue-700">(Academic Shared)</span>}
                  </td>
                  <td className="border border-black p-1.5">
                    {row.manualTitle || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.numberOfProcesses !== '' && row.numberOfProcesses !== undefined ? (
                      row.numberOfProcesses
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {row.revisionNumber || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.revisionDate || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.pageCount !== '' && row.pageCount !== undefined ? (
                      row.pageCount
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {isMissing ? (
                      <span className="font-black uppercase text-[7.5pt] text-amber-900 px-1 py-0.5 bg-amber-200 border border-amber-400 rounded">
                        NO DATA
                      </span>
                    ) : (
                      <span className="font-bold uppercase text-[7.5pt] text-emerald-800">Configured</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SIGNATORIES BLOCK */}
      <div className="mt-12 grid grid-cols-2 gap-8 text-left break-inside-avoid">
        <div className="space-y-1">
          <p className="font-bold uppercase text-[8pt] text-slate-500">PREPARED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[200px]"
            style={{ fontSize: '10pt' }}
          >
            {qmsHead}
          </p>
          <p className="font-bold uppercase text-[8.5pt]">Head, Quality Management System Unit</p>
        </div>

        <div className="space-y-1">
          <p className="font-bold uppercase text-[8pt] text-slate-500">NOTED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[200px]"
            style={{ fontSize: '10pt' }}
          >
            {qaoDirector}
          </p>
          <p className="font-bold uppercase text-[8.5pt]">Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-10 pt-4 border-t border-black flex justify-between text-[8pt] text-slate-600 font-bold italic">
        <span>RSU-QAO-FOR-026 | REV 01-2026</span>
        <span>Issued via RSU EOMS Digital Portal</span>
      </div>
    </div>
  );
}
