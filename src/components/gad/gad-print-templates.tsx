'use client';

/**
 * @fileOverview Official GAD print templates for GPB and GAD AR.
 */

import React from 'react';
import type { GADPlan, GADActivity, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';

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
    <div className="p-4 text-black dark:text-white bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD PLAN AND BUDGET (GPB)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">
          {unitName} - {campusName}
        </p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[9px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-700 text-center font-black uppercase">
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
              <td className="border border-black p-2 text-right font-black tabular-nums">
                ₱{item.budget.toLocaleString()}
              </td>
              <td className="border border-black p-2 text-center font-bold">
                <p>{item.sourceOfBudget}</p>
                <p className="mt-2 text-[8px] opacity-60">RESP: {item.responsibleOffice}</p>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-black p-8 text-center text-slate-400 italic">
                No plan entries defined for this unit.
              </td>
            </tr>
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
 * PCW Standard 12-Column Landscape Format
 */
export function GADAccomplishmentReportTemplate({
  data,
  unitName,
  campusName,
  year,
  signatories,
}: GADAccomplishmentReportTemplateProps) {
  const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';
  const directorName = signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';

  // Group data by PCW Category
  const clientFocused = data.filter((item) => !item.category || item.category === 'CLIENT-FOCUSED ACTIVITIES');
  const orgFocused = data.filter((item) => item.category === 'ORGANIZATION-FOCUSED ACTIVITIES');
  const attributedProg = data.filter((item) => item.category === 'ATTRIBUTED PROGRAM');

  const calcTotalApproved = (items: any[]) => items.reduce((sum, item) => sum + (item.budget || 0), 0);
  const calcTotalActual = (items: any[]) => items.reduce((sum, item) => sum + (item.actualBudget || 0), 0);

  const totalApprovedGaa = calcTotalApproved(data);
  const totalActualExpenditure = calcTotalActual(data);

  const renderCategoryRows = (items: any[], categoryTitle: string, startIndex: number) => {
    if (items.length === 0) return null;
    const catApproved = calcTotalApproved(items);
    const catActual = calcTotalActual(items);

    return (
      <React.Fragment key={categoryTitle}>
        <tr className="bg-slate-200 dark:bg-slate-800 font-black text-[9px] uppercase">
          <td colSpan={12} className="border border-black p-1.5 text-left bg-slate-200">
            {categoryTitle}
          </td>
        </tr>
        {items.map((item, idx) => (
          <tr key={item.id || idx} className="align-top hover:bg-slate-50">
            <td className="border border-black p-1 text-center font-bold">{startIndex + idx + 1}</td>
            <td className="border border-black p-1 font-medium">{item.genderIssue}</td>
            <td className="border border-black p-1 italic text-slate-700">{item.causeOfIssue}</td>
            <td className="border border-black p-1">{item.objective}</td>
            <td className="border border-black p-1 font-bold uppercase">{item.pap}</td>
            <td className="border border-black p-1 font-medium">{item.gadActivityName || item.pap}</td>
            <td className="border border-black p-1">
              <p className="font-bold">{item.performanceIndicators}</p>
              <p className="italic text-slate-600 mt-0.5">{item.targets}</p>
            </td>
            <td className="border border-black p-1">
              <p className="font-bold">{item.actualOutput || item.targets}</p>
              {(item.actualMale > 0 || item.actualFemale > 0) && (
                <p className="mt-1 font-mono text-[7px] text-blue-800 font-bold">
                  Reach: Male: {item.actualMale} | Female: {item.actualFemale}
                </p>
              )}
            </td>
            <td className="border border-black p-1 text-right font-bold tabular-nums">
              ₱{(item.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="border border-black p-1 text-right font-black tabular-nums text-emerald-800">
              ₱
              {(item.actualBudget || 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </td>
            <td className="border border-black p-1 text-center font-medium">
              {item.responsibleOffice || item.unitName || 'RSU'}
            </td>
            <td className="border border-black p-1 italic text-[7.5px] leading-snug">
              {item.implementationStatus && (
                <span className="font-bold uppercase not-italic block mb-0.5 text-slate-900">
                  [{item.implementationStatus}]
                </span>
              )}
              {item.varianceAnalysis || item.remarks || 'Done.'}
              {item.psCost ? (
                <p className="mt-0.5 text-[7px] not-italic text-slate-600">PS: ₱{item.psCost.toLocaleString()}</p>
              ) : null}
            </td>
          </tr>
        ))}
        <tr className="bg-slate-100 font-bold text-[8.5px]">
          <td colSpan={8} className="border border-black p-1 text-right uppercase">
            SUB-TOTAL ({categoryTitle}):
          </td>
          <td className="border border-black p-1 text-right font-black tabular-nums">
            ₱{catApproved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td className="border border-black p-1 text-right font-black tabular-nums text-emerald-800">
            ₱{catActual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
          <td colSpan={2} className="border border-black p-1"></td>
        </tr>
      </React.Fragment>
    );
  };

  return (
    <div className="p-4 text-black bg-white max-w-[13in] mx-auto font-sans leading-tight text-[8px]">
      <div className="text-center mb-6 border-b-2 border-black pb-3">
        <h1 className="text-base font-bold uppercase tracking-wide">Romblon State University</h1>
        <h2 className="text-sm font-bold uppercase mt-1">ANNUAL GENDER AND DEVELOPMENT (GAD) ACCOMPLISHMENT REPORT</h2>
        <p className="text-xs font-black mt-1">FISCAL YEAR {year}</p>
        <p className="text-[10px] italic mt-1 uppercase">
          Organization Category: State Universities and Colleges | {unitName} - {campusName}
        </p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[7.5px]">
        <thead>
          <tr className="bg-slate-100 text-center font-black uppercase">
            <th className="border border-black p-1 w-[2%]">#</th>
            <th className="border border-black p-1 w-[11%]">Gender Issue / GAD Mandate</th>
            <th className="border border-black p-1 w-[9%]">Cause of Gender Issue</th>
            <th className="border border-black p-1 w-[9%]">GAD Result Statement / Objective</th>
            <th className="border border-black p-1 w-[9%]">Relevant Organization MFO/PAP</th>
            <th className="border border-black p-1 w-[9%]">GAD Activity</th>
            <th className="border border-black p-1 w-[9%]">Performance Indicators / Targets</th>
            <th className="border border-black p-1 w-[10%]">Actual Result (Outputs/Outcomes)</th>
            <th className="border border-black p-1 w-[8%]">Total Approved Budget</th>
            <th className="border border-black p-1 w-[8%]">Actual Expenditure</th>
            <th className="border border-black p-1 w-[8%]">Responsible Unit/Office</th>
            <th className="border border-black p-1 w-[8%]">Variance / Remarks</th>
          </tr>
          <tr className="bg-slate-50 text-center font-bold text-[7px] text-slate-600">
            <td className="border border-black">1</td>
            <td className="border border-black">2</td>
            <td className="border border-black">3</td>
            <td className="border border-black">4</td>
            <td className="border border-black">5</td>
            <td className="border border-black">6</td>
            <td className="border border-black">7</td>
            <td className="border border-black">8</td>
            <td className="border border-black">9</td>
            <td className="border border-black">11</td>
            <td className="border border-black">12</td>
            <td className="border border-black">13</td>
          </tr>
        </thead>
        <tbody>
          {renderCategoryRows(clientFocused, 'CLIENT-FOCUSED ACTIVITIES', 0)}
          {renderCategoryRows(orgFocused, 'ORGANIZATION-FOCUSED ACTIVITIES', clientFocused.length)}
          {renderCategoryRows(attributedProg, 'ATTRIBUTED PROGRAM', clientFocused.length + orgFocused.length)}

          {data.length === 0 && (
            <tr>
              <td colSpan={12} className="border border-black p-8 text-center text-slate-400 italic text-sm">
                No accomplishment data found to process for Fiscal Year {year}.
              </td>
            </tr>
          )}

          <tr className="bg-slate-300 font-black text-[9px] uppercase border-t-2 border-black">
            <td colSpan={8} className="border border-black p-1.5 text-right">
              TOTAL GAD EXPENDITURE:
            </td>
            <td className="border border-black p-1.5 text-right font-black tabular-nums">
              ₱{totalApprovedGaa.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td className="border border-black p-1.5 text-right font-black tabular-nums text-emerald-900">
              ₱
              {totalActualExpenditure.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td colSpan={2} className="border border-black p-1.5"></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-8 grid grid-cols-2 gap-16 px-8 text-[9px] font-bold">
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Prepared By:</p>
          <div className="border-b border-black pb-1 font-black uppercase">{directorName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">GAD Director</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Approved By:</p>
          <div className="border-b border-black pb-1 font-black uppercase text-primary">{presidentName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">University President</p>
        </div>
      </div>

      <div className="mt-8 text-[7.5px] text-slate-500 italic border-t pt-2 flex justify-between">
        <span>Official RSU GAD Mandate Submission Document | Reference: Endorsed GPB #{year}</span>
        <span>Generated via CRAIITECH Quality EOMS Portal</span>
      </div>
    </div>
  );
}
