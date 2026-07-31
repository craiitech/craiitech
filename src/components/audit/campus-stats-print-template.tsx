'use client';

import React from 'react';

export interface CampusStatEntry {
  campusId: string;
  campusName: string;
  totalAudited: number;
  completedAudited: number;
  ofiCount: number;
  ncCount: number;
  complianceCount?: number;
}

interface CampusStatsPrintTemplateProps {
  campusStats: CampusStatEntry[];
  year: number;
  qaoDirector?: string;
  leadAuditorName?: string;
}

export function CampusStatsPrintTemplate({
  campusStats,
  year,
  qaoDirector,
  leadAuditorName,
}: CampusStatsPrintTemplateProps) {
  const totals = React.useMemo(() => {
    return campusStats.reduce(
      (acc, curr) => ({
        totalAudited: acc.totalAudited + curr.totalAudited,
        completedAudited: acc.completedAudited + curr.completedAudited,
        ofiCount: acc.ofiCount + curr.ofiCount,
        ncCount: acc.ncCount + curr.ncCount,
        complianceCount: acc.complianceCount + (curr.complianceCount || 0),
      }),
      { totalAudited: 0, completedAudited: 0, ofiCount: 0, ncCount: 0, complianceCount: 0 },
    );
  }, [campusStats]);

  return (
    <div
      className="p-0 text-black dark:text-white bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none"
      style={{ fontSize: '12pt' }}
    >
      {/* Institutional Header */}
      <div className="text-center mb-8">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
          <h1 className="font-bold uppercase leading-none" style={{ fontSize: '14pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase mt-1" style={{ fontSize: '12pt' }}>
            Quality Assurance Office
          </h2>
          <p style={{ fontSize: '10pt' }} className="italic">
            Odiongan, Romblon
          </p>
        </div>
        <div className="mt-6 border-y-2 border-black py-3 bg-slate-50/50 dark:bg-slate-800/50">
          <h2 className="font-black uppercase tracking-[0.15em]" style={{ fontSize: '13pt' }}>
            Campus Audit Statistics & Findings Summary
          </h2>
          <p className="font-bold mt-1" style={{ fontSize: '12pt' }}>
            ACADEMIC YEAR {year}
          </p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8 text-center">
        <div className="border-2 border-black p-3 bg-gray-50">
          <p className="font-black text-xl">{campusStats.length}</p>
          <p className="font-bold uppercase text-[9pt] mt-1 text-slate-700">Total Campuses</p>
        </div>
        <div className="border-2 border-black p-3 bg-gray-50">
          <p className="font-black text-xl">{totals.totalAudited}</p>
          <p className="font-bold uppercase text-[9pt] mt-1 text-slate-700">Sessions Audited</p>
        </div>
        <div className="border-2 border-black p-3 bg-amber-50">
          <p className="font-black text-xl text-amber-900">{totals.ofiCount}</p>
          <p className="font-bold uppercase text-[9pt] mt-1 text-amber-900">Total OFI</p>
        </div>
        <div className="border-2 border-black p-3 bg-red-50">
          <p className="font-black text-xl text-red-900">{totals.ncCount}</p>
          <p className="font-bold uppercase text-[9pt] mt-1 text-red-900">Total NC</p>
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
        <thead>
          <tr className="bg-gray-100">
            <th
              className="border-2 border-black p-3 text-left font-black uppercase w-[35%]"
              style={{ fontSize: '11pt' }}
            >
              Campus / Site
            </th>
            <th
              className="border-2 border-black p-3 text-center font-black uppercase w-[20%]"
              style={{ fontSize: '11pt' }}
            >
              Audited Sessions
            </th>
            <th
              className="border-2 border-black p-3 text-center font-black uppercase w-[15%]"
              style={{ fontSize: '11pt' }}
            >
              Completed
            </th>
            <th
              className="border-2 border-black p-3 text-center font-black uppercase w-[15%]"
              style={{ fontSize: '11pt' }}
            >
              OFI
            </th>
            <th
              className="border-2 border-black p-3 text-center font-black uppercase w-[15%]"
              style={{ fontSize: '11pt' }}
            >
              NC
            </th>
          </tr>
        </thead>
        <tbody>
          {campusStats.map((cs, idx) => (
            <tr key={idx} className="border-b border-black break-inside-avoid">
              <td className="border-2 border-black p-3 font-black uppercase" style={{ fontSize: '11pt' }}>
                {cs.campusName}
              </td>
              <td className="border-2 border-black p-3 text-center font-bold" style={{ fontSize: '11pt' }}>
                {cs.totalAudited}
              </td>
              <td
                className="border-2 border-black p-3 text-center font-bold text-slate-700"
                style={{ fontSize: '11pt' }}
              >
                {cs.completedAudited}
              </td>
              <td
                className="border-2 border-black p-3 text-center font-black text-amber-800"
                style={{ fontSize: '11pt' }}
              >
                {cs.ofiCount}
              </td>
              <td
                className="border-2 border-black p-3 text-center font-black text-red-800"
                style={{ fontSize: '11pt' }}
              >
                {cs.ncCount}
              </td>
            </tr>
          ))}
          {/* Totals Row */}
          <tr className="bg-gray-200 border-t-4 border-black font-black">
            <td className="border-2 border-black p-3 uppercase" style={{ fontSize: '11pt' }}>
              TOTAL INSTITUTIONAL
            </td>
            <td className="border-2 border-black p-3 text-center" style={{ fontSize: '11pt' }}>
              {totals.totalAudited}
            </td>
            <td className="border-2 border-black p-3 text-center" style={{ fontSize: '11pt' }}>
              {totals.completedAudited}
            </td>
            <td className="border-2 border-black p-3 text-center text-amber-900" style={{ fontSize: '11pt' }}>
              {totals.ofiCount}
            </td>
            <td className="border-2 border-black p-3 text-center text-red-900" style={{ fontSize: '11pt' }}>
              {totals.ncCount}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Signatories */}
      <div className="grid grid-cols-2 gap-12 mt-12 pt-6 border-t border-slate-300">
        <div>
          <p className="font-bold text-xs uppercase mb-12">Prepared By:</p>
          <p className="font-black text-sm uppercase underline">{leadAuditorName || 'IQA LEAD AUDITOR'}</p>
          <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Lead Internal Quality Auditor</p>
        </div>
        <div>
          <p className="font-bold text-xs uppercase mb-12">Approved & Noted By:</p>
          <p className="font-black text-sm uppercase underline">{qaoDirector || 'DIRECTOR, QAO'}</p>
          <p className="text-xs text-slate-600 uppercase font-semibold mt-0.5">Quality Assurance Office Director</p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center text-[9pt] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-IQA-CAMPUS-STATS | REV 01-2025</span>
        <div className="text-right">
          <p>Institutional Audit Analytics</p>
          <p>Generated via RSU EOMS Portal</p>
        </div>
      </div>
    </div>
  );
}
