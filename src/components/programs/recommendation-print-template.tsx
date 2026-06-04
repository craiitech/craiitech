'use client';

import React from 'react';
import type { AccreditationRecommendation } from '@/lib/types';
import { format } from 'date-fns';

interface AccreditationRecommendationReportProps {
  items: {
    programName: string;
    abbreviation: string;
    level: string;
    surveyDate?: string;
    recommendation: AccreditationRecommendation;
    certificateLink?: string;
  }[];
  unitMap: Map<string, string>;
  scope: 'institutional' | 'program' | 'unit';
  year: number;
  unitName?: string;
}

/**
 * ACCREDITATION RECOMMENDATION REPORT TEMPLATE
 * Optimized for Folio (8.5 x 13) with 10-11pt base font.
 */
export function AccreditationRecommendationReport({ items, unitMap, scope, year, unitName }: AccreditationRecommendationReportProps) {
  const currentTitle = (scope === 'institutional' || scope === 'unit')
    ? 'Institutional Accreditation Gaps Registry' 
    : 'Program Accreditation Recommendations';

  return (
    <div className="p-0 text-black bg-white mx-auto font-serif leading-tight" style={{ width: '7.5in', fontSize: '11pt' }}>
      {/* Header */}
      <div className="text-center mb-10 border-b-2 border-black pb-6">
        <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Romblon State University</h1>
        <h2 className="font-semibold uppercase tracking-tight mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
        <div className="mt-8">
          <h2 className="font-black uppercase underline decoration-2 underline-offset-4" style={{ fontSize: '13pt' }}>{currentTitle}</h2>
          {unitName && (
              <h3 className="font-black uppercase text-slate-900 mt-4 tracking-tight" style={{ fontSize: '16pt' }}>{unitName}</h3>
          )}
          <p className="font-bold mt-2 uppercase tracking-widest" style={{ fontSize: '10pt' }}>ACADEMIC YEAR: {year}</p>
        </div>
      </div>

      <p className="mb-6 text-justify italic" style={{ fontSize: '10pt' }}>
        In alignment with the institutional Quality Management System (ISO 21001:2018) and AACCUP accreditation standards, 
        the following items have been identified as mandatory requirements or enhancement areas. The identified accountable 
        units are directed to implement necessary corrective or improvement actions.
      </p>

      {/* Registry Table */}
      <table className="w-full border-collapse border-2 border-black mb-12">
        <thead>
          <tr className="bg-slate-50 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[18%]" style={{ fontSize: '9pt' }}>Program Offering</th>
            <th className="border border-black p-2 w-[10%]" style={{ fontSize: '9pt' }}>Type</th>
            <th className="border border-black p-2 w-[34%]" style={{ fontSize: '9pt' }}>Accreditor's Recommendation</th>
            <th className="border border-black p-2 w-[18%]" style={{ fontSize: '9pt' }}>Assigned Responsibility (Offices)</th>
            <th className="border border-black p-2 w-[10%]" style={{ fontSize: '9pt' }}>Status</th>
            <th className="border border-black p-2 text-center" style={{ fontSize: '8pt' }}>Evidence / Initials</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-black">
              <td className="border border-black p-2 align-top">
                <p className="font-black leading-tight uppercase" style={{ fontSize: '9pt' }}>{item.programName}</p>
                <p className="text-slate-500 mt-1 uppercase font-bold" style={{ fontSize: '8pt' }}>
                    {item.level} | {item.surveyDate || 'TBA'}
                </p>
                {item.certificateLink && (
                  <div className="mt-2 pt-1 border-t border-slate-200">
                    <a href={item.certificateLink} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-bold uppercase tracking-tight text-[7.5pt] block hover:text-blue-900">
                      View Certificate
                    </a>
                  </div>
                )}
              </td>
              <td className="border border-black p-2 text-center align-top font-bold uppercase" style={{ fontSize: '8pt' }}>
                {item.recommendation.type}
              </td>
              <td className="border border-black p-2 align-top italic leading-relaxed" style={{ fontSize: '9pt' }}>
                "{item.recommendation.text}"
                {item.recommendation.additionalInfo && (
                    <div className="mt-2 pt-2 border-t border-slate-100 not-italic font-bold" style={{ fontSize: '8pt' }}>
                        <span className="uppercase text-slate-400 mr-1">Admin Notes:</span>
                        {item.recommendation.additionalInfo}
                    </div>
                )}
              </td>
              <td className="border border-black p-2 align-top font-bold uppercase text-slate-800" style={{ fontSize: '8pt' }}>
                <div className="flex flex-col gap-1">
                  {(item.recommendation.assignedUnitIds || []).map((uid: string) => (
                    <div key={uid} className="leading-tight">
                      • {unitMap.get(uid) || uid}
                    </div>
                  ))}
                  {!item.recommendation.assignedUnitIds?.length && (
                    <span className="text-slate-400 italic">Institutional</span>
                  )}
                </div>
              </td>
              <td className="border border-black p-2 text-center align-top font-black uppercase" style={{ fontSize: '8pt' }}>
                {item.recommendation.status}
              </td>
              <td className="border border-black p-2 align-top min-h-[60px]">
                  {/* Space for manual evidence noting */}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan={6} className="p-8 text-center italic text-gray-400">No active accreditation gaps recorded for this cycle.</td></tr>
          )}
        </tbody>
      </table>

      {/* Footer Signatories */}
      <div className="mt-20 grid grid-cols-2 gap-20 px-8">
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-10 opacity-60" style={{ fontSize: '10pt' }}>Generated by:</p>
          <div className="border-b-2 border-black font-black pb-1 mb-1 uppercase" style={{ fontSize: '11pt' }}>
            RSU EOMS PORTAL
          </div>
          <p className="uppercase font-bold text-center" style={{ fontSize: '9pt' }}>Institutional Digital Registry</p>
        </div>
        <div className="text-center">
          <p className="uppercase font-bold text-left mb-10 opacity-60" style={{ fontSize: '10pt' }}>Verified by:</p>
          <div className="border-b-2 border-black font-black pb-1 mb-1 min-h-[1.2rem] uppercase" style={{ fontSize: '11pt' }}>
          </div>
          <p className="uppercase font-bold text-center" style={{ fontSize: '9pt' }}>Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-24 text-[9pt] text-gray-400 italic text-center border-t pt-4 space-y-1">
        <p>This is an official system-generated document issued via RSU EOMS Portal.</p>
        <p className="font-bold">Institutional Accountability Registry AY {year}.</p>
      </div>
    </div>
  );
}
