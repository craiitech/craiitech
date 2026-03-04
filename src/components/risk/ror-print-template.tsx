
'use client';

import React from 'react';
import type { Risk, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

interface RORPrintTemplateProps {
  risks: Risk[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

export function RORPrintTemplate({ risks, unitName, campusName, year, signatories }: RORPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const riskEntries = risks.filter(r => r.type === 'Risk');
  const opportunityEntries = risks.filter(r => r.type === 'Opportunity');

  // Determine if this is a "Final" submission based on presence of post-treatment data
  const isFinal = risks.some(r => r.status === 'Closed' || (r.postTreatment && r.postTreatment.evidence));

  // Signatory Logic based on Site
  const isMainCampus = campusName.toLowerCase().includes('main campus') || campusName.toLowerCase().includes('site 1');
  const approverTitle = isMainCampus ? 'UNIT HEAD / DIRECTOR' : 'CAMPUS DIRECTOR';

  return (
    <div className="p-4 text-black bg-white max-w-[13in] mx-auto font-sans leading-tight">
      {/* Institutional Header */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-4">
        <div className="flex items-center gap-4">
            <div className="text-left">
                <p className="text-[10px] uppercase">Republic of the Philippines</p>
                <h1 className="text-lg font-bold uppercase leading-none">Romblon State University</h1>
                <p className="text-[10px]">Romblon, Philippines</p>
            </div>
        </div>
        <div className="text-center">
            <h2 className="text-md font-black uppercase tracking-[0.1em]">RISK AND OPPORTUNITY REGISTER (ROR)</h2>
            <div className="flex items-center justify-center gap-4 mt-1 text-[11px] font-bold">
                <span>FISCAL YEAR <span className="underline px-2">{year}</span></span>
                <div className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 border border-black flex items-center justify-center", !isFinal && "bg-black")}>
                        {!isFinal && <div className="w-1 h-1 bg-white" />}
                    </div>
                    <span>First</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 border border-black flex items-center justify-center", isFinal && "bg-black")}>
                        {isFinal && <div className="w-1 h-1 bg-white" />}
                    </div>
                    <span>Final</span>
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <img src="/ISOlogo.jpg" alt="ISO Logo" className="h-14 object-contain" />
        </div>
      </div>

      <div className="flex justify-between items-end mb-2 text-[10px] font-bold uppercase">
        <div>Campus/College/Unit: <span className="underline ml-1">{unitName} ({campusName})</span></div>
        <div>Updated as of: <span className="underline ml-1">{format(new Date(), 'MMMM d, yyyy')}</span></div>
      </div>

      {/* Main Matrix Table */}
      <table className="w-full border-collapse border-[1.5px] border-black text-[8.5px]">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-black p-1 text-center font-black uppercase w-[80px]">Objective</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[120px]">Risk (R) / Opportunity (O) Description and Causes</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[100px]">Current Controls/ Situation</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Likelihood *</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Consequence **</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">R / O Magnitude (Likelihood x Consequence)</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Risk/Opportunity Rating ***</th>
            <th className="border border-black p-1 text-center font-black uppercase">Treatment Plan</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[70px]">Responsible</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Target Date</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Date Implemented</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Treatment Plan Monitoring Score</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Likelihood After Treatment *</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">Consequence After Treatment **</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">R/O Magnitude After Treatment</th>
            <th className="border border-black p-1 text-center font-black uppercase w-[25px] [writing-mode:vertical-lr] rotate-180">R/O Rating After Treatment ***</th>
          </tr>
        </thead>
        <tbody>
          {/* RISK SECTION */}
          <tr className="bg-slate-100 font-black text-center uppercase tracking-widest border border-black">
            <td colSpan={16} className="py-0.5 border border-black">Risk</td>
          </tr>
          {riskEntries.map((r, i) => (
            <tr key={r.id} className="bg-blue-50/50">
              <td className="border border-black p-1 align-top">{r.objective}</td>
              <td className="border border-black p-1 align-top font-bold">{r.description}</td>
              <td className="border border-black p-1 align-top">{r.currentControls}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.preTreatment.consequence}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-1 align-top">{r.treatmentAction}</td>
              <td className="border border-black p-1 align-top text-center">{r.responsiblePersonName}</td>
              <td className="border border-black p-1 text-center font-bold align-middle whitespace-nowrap">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[7.5px]">{r.monitoringScore}</td>
              <td className="border border-black p-1 text-center align-middle">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-1 text-center align-middle">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {riskEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-4 text-center text-slate-400 italic">No risk entries recorded.</td></tr>}

          {/* OPPORTUNITY SECTION */}
          <tr className="bg-slate-100 font-black text-center uppercase tracking-widest border border-black">
            <td colSpan={16} className="py-0.5 border border-black">Opportunity</td>
          </tr>
          {opportunityEntries.map((r, i) => (
            <tr key={r.id} className="bg-green-50/50">
              <td className="border border-black p-1 align-top">{r.objective}</td>
              <td className="border border-black p-1 align-top font-bold">{r.description}</td>
              <td className="border border-black p-1 align-top">{r.currentControls}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.preTreatment.likelihood}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.preTreatment.consequence}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.preTreatment.magnitude}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.preTreatment.rating?.charAt(0)}</td>
              <td className="border border-black p-1 align-top">{r.treatmentAction}</td>
              <td className="border border-black p-1 align-top text-center">{r.responsiblePersonName}</td>
              <td className="border border-black p-1 text-center font-bold align-middle whitespace-nowrap">{safeDate(r.targetDate)}</td>
              <td className="border border-black p-1 text-center font-bold align-middle">{r.postTreatment?.dateImplemented || ''}</td>
              <td className="border border-black p-1 align-top italic text-[7.5px]">{r.monitoringScore}</td>
              <td className="border border-black p-1 text-center align-middle">{r.postTreatment?.likelihood || ''}</td>
              <td className="border border-black p-1 text-center align-middle">{r.postTreatment?.consequence || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.postTreatment?.magnitude || ''}</td>
              <td className="border border-black p-1 text-center font-black align-middle">{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {opportunityEntries.length === 0 && <tr><td colSpan={16} className="border border-black p-4 text-center text-slate-400 italic">No opportunity entries recorded.</td></tr>}
        </tbody>
      </table>

      {/* Legend & Signatories Footer */}
      <div className="mt-4 grid grid-cols-12 gap-4 text-[8px] leading-tight">
        <div className="col-span-5 border p-2">
            <p className="font-bold mb-1">Legend:</p>
            <div className="grid grid-cols-1 gap-0.5">
                <p><span className="font-bold">Likelihood *:</span> 1 - Rare | 2 - Low | 3 - Medium | 4 - High | 5 - Very High</p>
                <p><span className="font-bold">Consequence **:</span> 1 - Insignificant | 2 - Minor | 3 - Significant | 4 - Major | 5 - Catastrophic</p>
            </div>
        </div>
        <div className="col-span-7 border p-2 relative">
            <p className="font-bold mb-1">Legend:</p>
            <div className="grid grid-cols-1 gap-0.5">
                <p><span className="font-bold">Risk / Opportunity Rating ***:</span> L - Low | M - Medium | H - High</p>
                <div className="flex items-center gap-1 font-black text-primary">
                    <div className="h-2.5 w-2.5 bg-yellow-400 rounded-full" />
                    <span>- New Risk / Opportunity -</span>
                </div>
            </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-16 text-center text-[10px] uppercase font-bold">
        <div>
            <p className="text-left mb-6 text-[9px] opacity-60">Prepared by:</p>
            <div className="border-b border-black pb-1 min-h-[1.5rem] uppercase">
                {risks[0]?.preparedBy || ''}
            </div>
            <p className="mt-1 text-[8px]">UNIT ODIMO</p>
        </div>
        <div>
            <p className="text-left mb-6 text-[9px] opacity-60">Monitored by:</p>
            <div className="border-b border-black pb-1 min-h-[1.5rem] uppercase">
                {/* Visual placeholder for signature */}
            </div>
            <p className="mt-1 text-[8px]">UNIT COORDINATOR</p>
        </div>
        <div>
            <p className="text-left mb-6 text-[9px] opacity-60">Approved by:</p>
            <div className="border-b border-black pb-1 min-h-[1.5rem] uppercase font-black text-primary">
                {/* Approval Name logic handled in registration */}
            </div>
            <p className="mt-1 text-[8px]">{approverTitle}</p>
        </div>
      </div>

      <div className="mt-10 flex justify-between items-end border-t border-slate-200 pt-4 text-[8px] text-slate-400 font-bold italic">
        <div>
            <p>QAO-03-002</p>
            <p>Creation Date: 2021-02-14</p>
            <p>Revision Date: 2024-01-22</p>
        </div>
        <div className="text-right">
            <p className="text-sm font-black text-slate-900 not-italic">ROR No.: ________________</p>
            <p className="mt-1">Generated by RSU EOMS Digital Portal</p>
        </div>
      </div>
    </div>
  );
}
