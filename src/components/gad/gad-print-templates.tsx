
'use client';

/**
 * @fileOverview Official GAD print templates for GPB and GAD AR.
 */

import React from 'react';
import type { GADPlan, GADActivity, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface GADPlanReportTemplateProps {
  data: GADPlan[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

interface GADAccomplishmentReportTemplateProps {
  data: any[]; // Extended with actuals
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

/**
 * GAD PLAN AND BUDGET (GPB) PRINT TEMPLATE
 * PCW Standard Landscape Format
 */
export function GADPlanReportTemplate({ data, unitName, campusName, year, signatories }: GADPlanReportTemplateProps) {
  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD PLAN AND BUDGET (GPB)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">{unitName} - {campusName}</p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[9px]">
        <thead>
          <tr className="bg-slate-100 text-center font-black uppercase">
            <th className="border border-black p-2 w-[15%]">Gender Issue / GAD Mandate</th>
            <th className="border border-black p-2 w-[15%]">Cause of Gender Issue</th>
            <th className="border border-black p-2 w-[15%]">GAD Objective</th>
            <th className="border border-black p-2 w-[15%]">Relevant GAD PAP</th>
            <th className="border border-black p-2 w-[15%]">Performance Indicators / Targets</th>
            <th className="border border-black p-2 w-[10%]">GAD Budget</th>
            <th className="border border-black p-2 w-[15%]">Source of Budget / Office</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="border border-black p-2 font-bold">{item.genderIssue}</td>
              <td className="border border-black p-2 italic">{item.causeOfIssue}</td>
              <td className="border border-black p-2">{item.objective}</td>
              <td className="border border-black p-2 font-black uppercase">{item.pap}</td>
              <td className="border border-black p-2">
                <p className="font-bold underline">{item.performanceIndicators}</p>
                <p className="mt-1 italic">{item.targets}</p>
              </td>
              <td className="border border-black p-2 text-right font-black tabular-nums">₱{item.budget.toLocaleString()}</td>
              <td className="border border-black p-2 text-center font-bold">
                <p>{item.sourceOfBudget}</p>
                <p className="mt-2 text-[8px] opacity-60">RESP: {item.responsibleOffice}</p>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={7} className="border border-black p-8 text-center text-slate-400 italic">No plan entries defined for this unit.</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-16 px-10 text-[10px] font-black uppercase">
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Prepared by:</p>
              <div className="border-b border-black pb-1">GAD COORDINATOR</div>
              <p className="mt-1 text-[8px]">Unit Level</p>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Reviewed by:</p>
              <div className="border-b border-black pb-1">QAO / GAD DIRECTOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Approved by:</p>
              <div className="border-b border-black pb-1 font-black text-primary">{directorName}</div>
              <p className="mt-1 text-[8px]">UNIVERSITY AUTHORITY</p>
          </div>
      </div>

      <div className="mt-12 text-[8px] text-slate-400 italic border-t pt-2 flex justify-between">
          <span>Official RSU GAD Document | Ref: QAO-GPB-{year}</span>
          <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * GAD ACCOMPLISHMENT REPORT (GAD AR) PRINT TEMPLATE
 */
export function GADAccomplishmentReportTemplate({ data, unitName, campusName, year, signatories }: GADAccomplishmentReportTemplateProps) {
  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD ACCOMPLISHMENT REPORT (GAD AR)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">{unitName} - {campusName}</p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[8px]">
        <thead>
          <tr className="bg-slate-100 text-center font-black uppercase">
            <th className="border border-black p-1 w-[12%]">GAD PAP</th>
            <th className="border border-black p-1 w-[12%]">Target Output</th>
            <th className="border border-black p-1 w-[12%]">Actual Accomplishment</th>
            <th className="border border-black p-1 w-[12%]">Planned Budget</th>
            <th className="border border-black p-1 w-[12%]">Actual Expenditure</th>
            <th className="border border-black p-1 w-[15%]">Actual Reach (M/F)</th>
            <th className="border border-black p-1 w-[25%]">Variance / Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr key={i} className="align-top">
              <td className="border border-black p-1 font-black uppercase">{item.pap}</td>
              <td className="border border-black p-1">{item.targets}</td>
              <td className="border border-black p-1 font-bold italic">{item.actualOutput || 'Verified Operational'}</td>
              <td className="border border-black p-1 text-right tabular-nums font-bold">₱{item.budget.toLocaleString()}</td>
              <td className="border border-black p-1 text-right tabular-nums font-black text-emerald-700">₱{item.actualBudget.toLocaleString()}</td>
              <td className="border border-black p-1 text-center font-black">
                M: {item.actualMale} | F: {item.actualFemale}
              </td>
              <td className="border border-black p-1 italic text-slate-600 leading-relaxed">
                {item.varianceBudget !== 0 ? (
                  <span>
                    Budget Variance: ₱{Math.abs(item.varianceBudget).toLocaleString()} ({item.varianceBudget < 0 ? 'Over' : 'Under'} spend).{' '}
                  </span>
                ) : null}
                {item.varianceAnalysis}
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr><td colSpan={7} className="border border-black p-8 text-center text-slate-400 italic">No accomplishment data found to process.</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-16 px-10 text-[10px] font-black uppercase">
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Prepared by:</p>
              <div className="border-b border-black pb-1">GAD COORDINATOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Verified by:</p>
              <div className="border-b border-black pb-1">GAD OFFICE DIRECTOR</div>
          </div>
          <div className="text-center">
              <p className="text-left mb-8 opacity-60">Approved by:</p>
              <div className="border-b border-black pb-1 font-black text-primary">{directorName}</div>
          </div>
      </div>

      <div className="mt-12 text-[8px] text-slate-400 italic border-t pt-2 flex justify-between">
          <span>Official RSU GAD Document | Ref: QAO-AR-{year}</span>
          <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
