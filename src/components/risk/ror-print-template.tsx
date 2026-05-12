'use client';

import React from 'react';
import type { Risk, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface RORPrintTemplateProps {
  risks: Risk[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

/**
 * RISK AND OPPORTUNITY REGISTER (ROR) PRINT TEMPLATE
 * Strictly reformatted for Landscape Folio (13" x 8.5") paper.
 * All columns are stretched to fill the 13-inch width.
 */
export function RORPrintTemplate({ risks, unitName, campusName, year, signatories }: RORPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const riskEntries = risks.filter(r => r.type === 'Risk');
  const opportunityEntries = risks.filter(r => r.type === 'Opportunity');

  const isFinal = risks.some(r => r.status === 'Closed' || (r.postTreatment && r.postTreatment.evidence));

  const isMainCampus = campusName.toLowerCase().includes('main campus') || campusName.toLowerCase().includes('site 1');
  const approverTitle = isMainCampus ? 'UNIT HEAD / DIRECTOR' : 'CAMPUS DIRECTOR';

  return (
    <div className="p-0 text-black bg-white max-w-[13in] mx-auto font-sans leading-tight border-none" style={{ width: '12in', fontSize: '10pt' }}>
      {/* Institutional Header */}
      <div className="flex flex-col items-center justify-center border-b-2 border-black pb-4 mb-4 text-center">
        <p className="text-[10px] uppercase font-bold">Republic of the Philippines</p>
        <h1 className="text-2xl font-black uppercase leading-none">Romblon State University</h1>
        <p className="text-[11px] font-bold">Romblon, Philippines</p>
        <div className="mt-6">
            <h2 className="text-lg font-black uppercase tracking-[0.2em]">RISK AND OPPORTUNITY REGISTER (ROR)</h2>
            <div className="flex items-center justify-center gap-8 mt-2 text-[12px] font-bold">
                <span>FISCAL YEAR <span className="underline decoration-2 px-4">{year}</span></span>
                <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", !isFinal && "bg-black")}>
                        {!isFinal && <div className="w-1.5 h-1.5 bg-white" />}
                    </div>
                    <span>First Cycle</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", isFinal && "bg-black")}>
                        {isFinal && <div className="w-1.5 h-1.5 bg-white" />}
                    </div>
                    <span>Final Cycle</span>
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-between items-end mb-4 text-[11px] font-black uppercase tracking-tight">
        <div>Campus/College/Unit: <span className="underline underline-offset-4 ml-2">{unitName} ({campusName})</span></div>
        <div>Updated as of: <span className="underline underline-offset-4 ml-2">{format(new Date(), 'MMMM d, yyyy')}</span></div>
      </div>

      {/* Main Matrix Table - Stretched for 13in Landscape */}
      <table className="w-full border-collapse border-2 border-black text-[9px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[100px]">Objective</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[150px]">Risk (R) / Opportunity (O) Description and Causes</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[120px]">Current Controls/ Situation</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Likelihood *</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Consequence **</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Magnitude (L x C)</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Rating ***</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase">Treatment Action Plan</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[100px]">Responsible Person</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Target Date</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Date Implemented</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Monitoring Score</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Residual Likelihood *</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Residual Consequence **</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Residual Magnitude</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[30px] [writing-mode:vertical-lr] rotate-180">Residual Rating ***</th>
          </tr>
        </thead>
        <tbody>
          <tr className="bg-slate-50 font-black text-center uppercase tracking-[0.3em]">
            <td colSpan={16} className="py-1 border-2 border-black bg-rose-50 text-rose-800">I. Risks</td>
          </tr>
          {riskEntries.map((r) => (
            <tr key={r.id} className="h-16">
              <td className="border border-black p-2 align-top">{r.objective}</td>
              <td className="border border-black p-2 align-top font-bold">{r.description}</td>
              <td className="border border-black p-2 align-top">{r.currentControls}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-blue-50/30">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-blue-50/30">{r.preTreatment.consequence}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-blue-50/30">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-blue-50/30">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-2 align-top">{r.treatmentAction}</td>
              <td className="border border-black p-2 align-top text-center font-bold">{r.responsiblePersonName}</td>
              <td className="border border-black p-1 text-center font-bold align-middle whitespace-nowrap">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-emerald-50/30">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[8px] bg-emerald-50/30">{r.monitoringScore}</td>
              <td className="border border-black p-1 text-center align-middle bg-emerald-50/30">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-1 text-center align-middle bg-emerald-50/30">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-emerald-50/30">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-emerald-50/30">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {riskEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-10 text-center text-slate-400 italic">No risk entries recorded in the digital register.</td></tr>}

          <tr className="bg-slate-50 font-black text-center uppercase tracking-[0.3em]">
            <td colSpan={16} className="py-1 border-2 border-black bg-emerald-50 text-emerald-800">II. Opportunities</td>
          </tr>
          {opportunityEntries.map((r) => (
            <tr key={r.id} className="h-16">
              <td className="border border-black p-2 align-top">{r.objective}</td>
              <td className="border border-black p-2 align-top font-bold">{r.description}</td>
              <td className="border border-black p-2 align-top">{r.currentControls}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-blue-50/30">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-blue-50/30">{r.preTreatment.consequence}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-blue-50/30">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-blue-50/30">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-2 align-top">{r.treatmentAction}</td>
              <td className="border border-black p-2 align-top text-center font-bold">{r.responsiblePersonName}</td>
              <td className="border border-black p-1 text-center font-bold align-middle whitespace-nowrap">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-1 text-center font-bold align-middle bg-emerald-50/30">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[8px] bg-emerald-50/30">{r.monitoringScore}</td>
              <td className="border border-black p-1 text-center align-middle bg-emerald-50/30">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-1 text-center align-middle bg-emerald-50/30">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-emerald-50/30">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle bg-emerald-50/30">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {opportunityEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-10 text-center text-slate-400 italic">No opportunity entries recorded in the digital register.</td></tr>}
        </tbody>
      </table>

      {/* Legend Block */}
      <div className="mt-4 grid grid-cols-12 gap-4 text-[8.5px] leading-tight border-2 border-black p-3 bg-slate-50/50">
        <div className="col-span-4 space-y-1">
            <p className="font-black uppercase border-b border-black pb-0.5 mb-1">Likelihood (L) Scale:</p>
            <p>1 - Rare | 2 - Low | 3 - Medium | 4 - High | 5 - Very High</p>
        </div>
        <div className="col-span-4 space-y-1">
            <p className="font-black uppercase border-b border-black pb-0.5 mb-1">Consequence (C) Scale:</p>
            <p>1 - Insignificant | 2 - Minor | 3 - Significant | 4 - Major | 5 - Catastrophic</p>
        </div>
        <div className="col-span-4 space-y-1">
            <p className="font-black uppercase border-b border-black pb-0.5 mb-1">Rating (Magnitude) Scale:</p>
            <p>L - Low (1-4) | M - Medium (5-9) | H - High (10-25)</p>
        </div>
      </div>

      {/* Signatories Row */}
      <div className="mt-12 grid grid-cols-3 gap-20 text-center text-[11px] uppercase font-black">
        <div className="space-y-10">
            <p className="text-left font-bold text-[10px] opacity-60">Prepared by:</p>
            <div className="border-b-2 border-black pb-1 min-h-[1.5rem] uppercase">
                {risks[0]?.preparedBy || 'UNIT HEAD'}
            </div>
            <p className="text-[9px] text-slate-500">Unit Representative</p>
        </div>
        <div className="space-y-10">
            <p className="text-left font-bold text-[10px] opacity-60">Monitored by:</p>
            <div className="border-b-2 border-black pb-1 min-h-[1.5rem] uppercase">
            </div>
            <p className="text-[9px] text-slate-500">Unit Coordinator</p>
        </div>
        <div className="space-y-10">
            <p className="text-left font-bold text-[10px] opacity-60">Approved by:</p>
            <div className="border-b-2 border-black pb-1 min-h-[1.5rem] uppercase text-primary">
                {campusName.toUpperCase().includes('MAIN') ? 'UNIT HEAD / DIRECTOR' : 'CAMPUS DIRECTOR'}
            </div>
            <p className="text-[9px] text-slate-500">Authorized Official</p>
        </div>
      </div>

      <div className="mt-16 flex justify-between items-end border-t-2 border-slate-200 pt-4 text-[9px] text-slate-400 font-bold italic">
        <div className="space-y-0.5">
            <p className="not-italic font-black text-slate-900">Form: QAO-03-002 | REV 03-2025</p>
            <p>Creation Date: 2021-02-14 | Revision Date: 2025-02-10</p>
        </div>
        <div className="text-right">
            <p className="text-lg font-black text-slate-950 not-italic">ROR Registry Year: {year}</p>
            <p className="mt-1">Authenticated via RSU EOMS Digital Portal</p>
        </div>
      </div>
    </div>
  );
}
