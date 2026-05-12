
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
 * Strictly reformatted for Landscape Folio (13" x 8.5") paper based on official layout.
 * Columns: 16 total. scoring headers are vertical.
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

  return (
    <div className="p-0 text-black bg-white w-full mx-auto font-sans leading-tight border-none" style={{ fontSize: '11pt' }}>
      
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
                    <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", !isFinal && "bg-black shadow-[inset_0_0_0_2px_white]")}>
                    </div>
                    <span>First Cycle</span>
                </div>
                <div className="flex items-center gap-3">
                    <div className={cn("w-4 h-4 border-2 border-black flex items-center justify-center", isFinal && "bg-black shadow-[inset_0_0_0_2px_white]")}>
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

      {/* Main Matrix Table - Stretched to 100% width of the Landscape Folio */}
      <table className="w-full border-collapse border-2 border-black">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[8%]">Objective</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[12%]">Risk (R) / Opportunity (O) Description and Causes</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[10%]">Current Controls/ Situation</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[3%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Likelihood *</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[3%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Consequence **</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[3%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Magnitude (L x C)</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[3%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Rating ***</div>
            </th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[14%]">Treatment Action Plan</th>
            <th className="border-2 border-black p-2 text-center font-black uppercase w-[10%]">Responsible Person</th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Target Date</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Date Implemented</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Monitoring Score</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Residual Likelihood *</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Residual Consequence **</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Residual Magnitude</div>
            </th>
            <th className="border-2 border-black p-1 text-center font-black uppercase w-[4%]">
                <div className="[writing-mode:vertical-rl] rotate-180 h-32 flex items-center justify-center mx-auto text-[9px]">Residual Rating ***</div>
            </th>
          </tr>
        </thead>
        <tbody className="text-[10pt]">
          <tr className="bg-slate-100 font-black text-center uppercase tracking-widest border-2 border-black">
            <td colSpan={16} className="py-1">I. Risks</td>
          </tr>
          {riskEntries.map((r) => (
            <tr key={r.id} className="min-h-[60px] border-b border-black">
              <td className="border border-black p-1.5 align-top">{r.objective}</td>
              <td className="border border-black p-1.5 align-top font-bold">{r.description}</td>
              <td className="border border-black p-1.5 align-top">{r.currentControls}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.preTreatment.consequence}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-1.5 align-top whitespace-pre-wrap">{r.treatmentAction}</td>
              <td className="border border-black p-1.5 align-top text-center font-black uppercase">{r.responsiblePersonName}</td>
              <td className="border border-black p-0 text-center font-bold align-middle">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[8px] bg-slate-50">{r.monitoringScore}</td>
              <td className="border border-black p-0 text-center align-middle bg-slate-50">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-0 text-center align-middle bg-slate-50">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {riskEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-10 text-center text-slate-400 italic">No Risk entries recorded.</td></tr>}

          <tr className="bg-slate-100 font-black text-center uppercase tracking-widest border-2 border-black">
            <td colSpan={16} className="py-1">II. Opportunities</td>
          </tr>
          {opportunityEntries.map((r) => (
            <tr key={r.id} className="min-h-[60px] border-b border-black">
              <td className="border border-black p-1.5 align-top">{r.objective}</td>
              <td className="border border-black p-1.5 align-top font-bold">{r.description}</td>
              <td className="border border-black p-1.5 align-top">{r.currentControls}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.preTreatment.consequence}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-1.5 align-top whitespace-pre-wrap">{r.treatmentAction}</td>
              <td className="border border-black p-1.5 align-top text-center font-black uppercase">{r.responsiblePersonName}</td>
              <td className="border border-black p-0 text-center font-bold align-middle">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-0 text-center font-bold align-middle bg-slate-50">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[8px] bg-slate-50">{r.monitoringScore}</td>
              <td className="border border-black p-0 text-center align-middle bg-slate-50">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-0 text-center align-middle bg-slate-50">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-0 text-center font-black align-middle bg-slate-50">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {opportunityEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-10 text-center text-slate-400 italic">No Opportunity entries recorded.</td></tr>}
        </tbody>
      </table>

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

      <div className="mt-12 flex justify-between items-end border-t-2 border-slate-200 pt-4 text-[9px] text-slate-400 font-bold italic">
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
