'use client';

import React from 'react';

interface AccreditationScheduleItem {
  date: string;
  campus: string;
  program: string;
  abbreviation?: string;
  level: string;
  validity?: string;
}

interface AccreditationSchedulePrintTemplateProps {
  items: AccreditationScheduleItem[];
  year: number | 'all';
}

/**
 * ACCREDITATION SCHEDULE PRINT TEMPLATE
 * "Programs to be Accredited" — scheduled accreditation registry per selected year.
 * Optimized for Folio (8.5 x 13) with 10-11pt base font.
 */
export function AccreditationSchedulePrintTemplate({ items, year }: AccreditationSchedulePrintTemplateProps) {
  const yearLabel = year === 'all' ? 'ALL YEARS' : `AY ${year}`;

  return (
    <div
      className="p-0 text-black bg-white mx-auto font-serif leading-tight"
      style={{ width: '7.5in', fontSize: '11pt' }}
    >
      {/* Header with logos */}
      <table className="w-full mb-2" style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td className="w-20 text-center align-middle">
              <img src="/rsulogo.png" alt="RSU Logo" style={{ height: '70px', objectFit: 'contain' }} />
            </td>
            <td className="text-center align-middle">
              <p className="font-black uppercase tracking-tight" style={{ fontSize: '15pt' }}>
                Romblon State University
              </p>
              <p className="font-semibold uppercase tracking-tight" style={{ fontSize: '11.5pt' }}>
                Quality Assurance Office
              </p>
              <p className="font-bold uppercase tracking-widest mt-1 text-slate-700" style={{ fontSize: '9pt' }}>
                Decision Support System · CHED Program Monitoring
              </p>
            </td>
            <td className="w-20 text-center align-middle">
              <img src="/ISOlogo.jpg" alt="ISO Logo" style={{ height: '55px', objectFit: 'contain' }} />
            </td>
          </tr>
        </tbody>
      </table>

      <div className="border-b-2 border-black mb-8" />

      <div className="text-center mb-8">
        <h2 className="font-black uppercase underline decoration-2 underline-offset-4" style={{ fontSize: '14pt' }}>
          Programs to be Accredited
        </h2>
        <h3 className="font-black uppercase tracking-tight mt-2" style={{ fontSize: '12pt' }}>
          Institutional Accreditation Schedule
        </h3>
        <p className="font-bold mt-2 uppercase tracking-widest" style={{ fontSize: '10pt' }}>
          {yearLabel}
        </p>
        <p className="mt-2 italic text-slate-600" style={{ fontSize: '9.5pt' }}>
          Strategic temporal view of the institutional accreditation pipeline.
        </p>
      </div>

      {/* Schedule Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
        <thead>
          <tr className="bg-slate-50 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[22%]" style={{ fontSize: '9.5pt' }}>
              Date of Accreditation
            </th>
            <th className="border border-black p-2 w-[24%]" style={{ fontSize: '9.5pt' }}>
              Campus
            </th>
            <th className="border border-black p-2" style={{ fontSize: '9.5pt' }}>
              Program
            </th>
            <th className="border border-black p-2 w-[18%]" style={{ fontSize: '9.5pt' }}>
              Current Accreditation Level
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-black">
              <td
                className="border border-black p-2 text-center align-top font-black uppercase tabular-nums"
                style={{ fontSize: '9.5pt' }}
              >
                {item.date || 'TBA'}
              </td>
              <td className="border border-black p-2 align-top font-bold uppercase" style={{ fontSize: '9.5pt' }}>
                {item.campus}
              </td>
              <td className="border border-black p-2 align-top">
                <p className="font-black leading-tight uppercase" style={{ fontSize: '9.5pt' }}>
                  {item.program}
                </p>
                {item.abbreviation && (
                  <p className="text-slate-600 mt-0.5 font-bold uppercase" style={{ fontSize: '8pt' }}>
                    {item.abbreviation}
                    {item.validity && item.validity !== 'TBA' ? ` · Valid until ${item.validity}` : ''}
                  </p>
                )}
              </td>
              <td
                className="border border-black p-2 text-center align-top font-black uppercase"
                style={{ fontSize: '9.5pt' }}
              >
                {item.level}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="p-8 text-center italic text-gray-400">
                No accreditation schedules recorded for this scope.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Summary Strip */}
      <div className="grid grid-cols-3 gap-6 mb-12 text-center">
        <div className="border border-black p-3">
          <p className="text-2xl font-black">{items.length}</p>
          <p className="uppercase font-bold text-[8.5pt] text-slate-600">Total Programs Scheduled</p>
        </div>
        <div className="border border-black p-3">
          <p className="text-2xl font-black">{new Set(items.map((i) => i.campus)).size}</p>
          <p className="uppercase font-bold text-[8.5pt] text-slate-600">Campuses Covered</p>
        </div>
        <div className="border border-black p-3">
          <p className="text-2xl font-black">{new Set(items.map((i) => i.level)).size}</p>
          <p className="uppercase font-bold text-[8.5pt] text-slate-600">Accreditation Levels</p>
        </div>
      </div>

      {/* Footer Signatories */}
      <div className="mt-12 grid grid-cols-2 gap-20 px-8">
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-10 opacity-60" style={{ fontSize: '10pt' }}>
            Prepared by:
          </p>
          <div className="border-b-2 border-black font-black pb-1 mb-1 uppercase" style={{ fontSize: '11pt' }}>
            RSU EOMS PORTAL
          </div>
          <p className="uppercase font-bold text-center" style={{ fontSize: '9pt' }}>
            Institutional Digital Registry
          </p>
        </div>
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-10 opacity-60" style={{ fontSize: '10pt' }}>
            Noted by:
          </p>
          <div
            className="border-b-2 border-black font-black pb-1 mb-1 min-h-[1.2rem] uppercase"
            style={{ fontSize: '11pt' }}
          ></div>
          <p className="uppercase font-bold text-center" style={{ fontSize: '9pt' }}>
            Director, Quality Assurance Office
          </p>
        </div>
      </div>

      <div className="mt-24 text-[9pt] text-gray-400 italic text-center border-t pt-4 space-y-1">
        <p>This is an official system-generated document issued via RSU EOMS Portal.</p>
        <p className="font-bold">Institutional Accreditation Schedule {yearLabel}.</p>
      </div>
    </div>
  );
}
