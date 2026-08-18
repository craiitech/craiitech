'use client';

/**
 * @fileOverview Official GAD print templates for GPB and GAD AR.
 */

import React from 'react';
import type { GADPlan, GADActivity, Signatories, GadSettings, Unit, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';

interface GADPlanReportTemplateProps {
  data: GADPlan[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
  gadSettings?: GadSettings;
}

interface GADAccomplishmentReportTemplateProps {
  data: any[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
  gadSettings?: GadSettings;
}

function groupByCategory(items: GADPlan[]): { label: string; items: GADPlan[] }[] {
  const groups: { label: string; items: GADPlan[] }[] = [];
  const client = items.filter((i) => !i.category || i.category === 'CLIENT-FOCUSED ACTIVITIES');
  const org = items.filter((i) => i.category === 'ORGANIZATION-FOCUSED ACTIVITIES');
  const attr = items.filter((i) => i.category === 'ATTRIBUTED PROGRAM');
  if (client.length) groups.push({ label: 'CLIENT-FOCUSED ACTIVITIES', items: client });
  if (org.length) groups.push({ label: 'ORGANIZATION-FOCUSED ACTIVITIES', items: org });
  if (attr.length) groups.push({ label: 'ATTRIBUTED PROGRAM', items: attr });
  return groups.length ? groups : [{ label: 'GAD PLAN ENTRIES', items }];
}

export function GADPlanReportTemplate({
  data,
  unitName,
  campusName,
  year,
  signatories,
  gadSettings,
}: GADPlanReportTemplateProps) {
  const directorName =
    gadSettings?.gadDirector || signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';
  const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';
  const categoryGroups = groupByCategory(data);

  return (
    <div className="p-4 text-black dark:text-white bg-white max-w-[13in] mx-auto font-sans leading-tight">
      <div className="text-center mb-8 border-b-2 border-black pb-4">
        <h1 className="text-lg font-bold uppercase">Romblon State University</h1>
        <h2 className="text-md font-bold uppercase mt-1">ANNUAL GAD PLAN AND BUDGET (GPB)</h2>
        <p className="text-sm font-black mt-1">FISCAL YEAR: {year}</p>
        <p className="text-xs italic mt-2 uppercase">
          {unitName} - {campusName}
        </p>
      </div>

      <table className="w-full border-collapse border-[1.5px] border-black text-[8px]">
        <thead>
          <tr className="bg-slate-100 dark:bg-slate-700 text-center font-black uppercase">
            <th className="border border-black p-1.5 w-[2%]">#</th>
            <th className="border border-black p-1.5 w-[10%]">Gender Issue / GAD Mandate</th>
            <th className="border border-black p-1.5 w-[8%]">Cause of Gender Issue</th>
            <th className="border border-black p-1.5 w-[8%]">GAD Objective</th>
            <th className="border border-black p-1.5 w-[10%]">GAD Activity</th>
            <th className="border border-black p-1.5 w-[10%]">Relevant MFO/PAP</th>
            <th className="border border-black p-1.5 w-[10%]">Performance Indicators / Targets</th>
            <th className="border border-black p-1.5 w-[7%]">GAD Budget</th>
            <th className="border border-black p-1.5 w-[7%]">Actual Result</th>
            <th className="border border-black p-1.5 w-[7%]">Actual Cost</th>
            <th className="border border-black p-1.5 w-[7%]">Variance / Remarks</th>
            <th className="border border-black p-1.5 w-[8%]">Source / Responsible Office</th>
            <th className="border border-black p-1.5 w-[6%]">Status</th>
          </tr>
        </thead>
        <tbody>
          {categoryGroups.map((group) => (
            <React.Fragment key={group.label}>
              <tr className="bg-slate-200 dark:bg-slate-800 font-black text-[8px] uppercase">
                <td colSpan={13} className="border border-black p-1.5 text-left">
                  {group.label}
                </td>
              </tr>
              {group.items.map((item, idx) => (
                <tr key={item.id || idx} className="align-top">
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold">{item.genderIssue}</td>
                  <td className="border border-black p-1 italic">{item.causeOfIssue}</td>
                  <td className="border border-black p-1">{item.objective}</td>
                  <td className="border border-black p-1 font-medium">{item.gadActivityName || item.pap}</td>
                  <td className="border border-black p-1 font-black uppercase">{item.pap}</td>
                  <td className="border border-black p-1">
                    <p className="font-bold underline">{item.performanceIndicators}</p>
                    <p className="mt-0.5 italic">{item.targets}</p>
                  </td>
                  <td className="border border-black p-1 text-right font-black tabular-nums">
                    ₱{item.budget.toLocaleString()}
                  </td>
                  <td className="border border-black p-1 text-center text-[7.5px] italic">
                    {item.actualResult || '—'}
                  </td>
                  <td className="border border-black p-1 text-right font-black tabular-nums">
                    {item.actualCost != null ? `₱${item.actualCost.toLocaleString()}` : '—'}
                  </td>
                  <td className="border border-black p-1 italic text-[7.5px] leading-snug">
                    {item.varianceRemarks || '—'}
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    <p>{item.sourceOfBudget}</p>
                    <p className="mt-1 text-[7px] opacity-60">RESP: {item.responsibleOffice}</p>
                    {item.psCost || item.mooeCost || item.coCost ? (
                      <div className="mt-0.5 text-[6px] font-mono opacity-50">
                        PS: ₱{(item.psCost || 0).toLocaleString()} | MOOE: ₱{(item.mooeCost || 0).toLocaleString()} |
                        CO: ₱{(item.coCost || 0).toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td className="border border-black p-1 text-center font-bold text-[7px] uppercase">
                    {item.implementationStatus === 'Yet to be implemented'
                      ? 'PENDING'
                      : item.implementationStatus || 'DONE'}
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-100 font-bold text-[8px]">
                <td colSpan={10} className="border border-black p-1 text-right uppercase">
                  SUB-TOTAL ({group.label}):
                </td>
                <td className="border border-black p-1 text-right font-black">
                  ₱{group.items.reduce((s, i) => s + (i.budget || 0), 0).toLocaleString()}
                </td>
                <td colSpan={2} className="border border-black p-1"></td>
              </tr>
            </React.Fragment>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={13} className="border border-black p-8 text-center text-slate-400 italic">
                No plan entries defined for this unit.
              </td>
            </tr>
          )}
          <tr className="bg-slate-300 font-black text-[9px] uppercase border-t-2 border-black">
            <td colSpan={10} className="border border-black p-1.5 text-right">
              TOTAL GAD BUDGET:
            </td>
            <td className="border border-black p-1.5 text-right font-black">
              ₱{data.reduce((s, i) => s + (i.budget || 0), 0).toLocaleString()}
            </td>
            <td colSpan={2} className="border border-black p-1.5"></td>
          </tr>
        </tbody>
      </table>

      <div className="mt-12 grid grid-cols-3 gap-16 px-10 text-[10px] font-black uppercase">
        <div className="text-center">
          <p className="text-left mb-8 opacity-60">Prepared by:</p>
          <div className="border-b border-black pb-1">GAD COORDINATOR</div>
          <p className="mt-1 text-[8px]">Unit Level</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-8 opacity-60">Reviewed / Certified by:</p>
          <div className="border-b border-black pb-1 font-black text-primary">{directorName}</div>
          <p className="mt-1 text-[8px]">GAD DIRECTOR</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-8 opacity-60">Approved by:</p>
          <div className="border-b border-black pb-1 font-black text-primary">{presidentName}</div>
          <p className="mt-1 text-[8px]">UNIVERSITY PRESIDENT</p>
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
  gadSettings,
}: GADAccomplishmentReportTemplateProps) {
  const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';
  const directorName =
    gadSettings?.gadDirector || signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';

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

// ─────────────────────────────────────────────────────────────────────────────
// 3. UNIT-LEVEL GAD MAINSTREAMING EVALUATION & GAP ANALYSIS TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export interface GADUnitMainstreamingReportTemplateProps {
  unit: Unit;
  campusName: string;
  year: number;
  scores: Record<string, boolean>;
  criteria: Array<{ id: string; category: string; cmoRef: string; label: string }>;
  signatories?: Signatories;
  gadSettings?: GadSettings;
}

export function GADUnitMainstreamingReportTemplate({
  unit,
  campusName,
  year,
  scores,
  criteria,
  signatories,
  gadSettings,
}: GADUnitMainstreamingReportTemplateProps) {
  const directorName =
    gadSettings?.gadDirector || signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';
  const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';

  const completedCount = Object.values(scores || {}).filter(Boolean).length;
  const complianceIndex = Math.round((completedCount / criteria.length) * 100);

  const categories = Array.from(new Set(criteria.map((c) => c.category)));
  const gaps = criteria.filter((c) => !scores?.[c.id]);

  return (
    <div className="p-6 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-tight">
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-base font-bold uppercase">Romblon State University</h1>
        <h2 className="text-sm font-semibold uppercase mt-0.5">
          Gender and Development Office &bull; Quality Assurance Office
        </h2>
        <h3 className="text-sm font-black uppercase mt-2 text-indigo-900 tracking-wider">
          CHED CMO No. 01, s. 2015 GAD Mainstreaming Evaluation & Gap Report
        </h3>
        <p className="text-xs font-bold mt-1">
          ACADEMIC / FISCAL YEAR: AY {year}-{year + 1} ({year})
        </p>
        <p className="text-xs italic mt-1 font-semibold uppercase text-slate-700">
          Unit: {unit.name} &bull; Campus: {campusName}
        </p>
      </div>

      {/* Compliance Overview Card */}
      <div className="mb-6 border-2 border-black p-4 bg-slate-50 grid grid-cols-3 text-center">
        <div className="border-r border-black p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600">Compliance Index</p>
          <p className="text-3xl font-black text-indigo-900 mt-1">{complianceIndex}%</p>
          <p className="text-[8px] font-bold uppercase text-slate-500 mt-0.5">
            {complianceIndex >= 80
              ? 'High Compliance'
              : complianceIndex >= 50
                ? 'Moderate Compliance'
                : 'Low Compliance / High Risk'}
          </p>
        </div>
        <div className="border-r border-black p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600">Compliant Elements</p>
          <p className="text-3xl font-black text-emerald-800 mt-1">
            {completedCount} / {criteria.length}
          </p>
          <p className="text-[8px] font-bold uppercase text-emerald-700 mt-0.5">Operational Criteria</p>
        </div>
        <div className="p-2">
          <p className="text-[10px] font-bold uppercase text-slate-600">Identified Gaps</p>
          <p className="text-3xl font-black text-rose-700 mt-1">{gaps.length}</p>
          <p className="text-[8px] font-bold uppercase text-rose-600 mt-0.5">Deficiencies Requiring Action</p>
        </div>
      </div>

      {/* Criteria Breakdown Table */}
      <table className="w-full border-collapse border-[1.5px] border-black text-[8.5px] mb-6">
        <thead>
          <tr className="bg-slate-200 text-center font-black uppercase">
            <th className="border border-black p-2 w-[5%]">#</th>
            <th className="border border-black p-2 w-[18%]">CHED / PCW Reference</th>
            <th className="border border-black p-2 w-[60%] text-left">Mainstreaming Criteria & Guidelines</th>
            <th className="border border-black p-2 w-[17%]">Status / Findings</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => {
            const catCriteria = criteria.filter((c) => c.category === cat);
            return (
              <React.Fragment key={cat}>
                <tr className="bg-indigo-50 font-black uppercase text-[9px]">
                  <td colSpan={4} className="border border-black p-1.5 text-left text-indigo-900">
                    {cat}
                  </td>
                </tr>
                {catCriteria.map((item, idx) => {
                  const isMet = !!scores?.[item.id];
                  return (
                    <tr key={item.id} className={isMet ? 'bg-white' : 'bg-rose-50/30'}>
                      <td className="border border-black p-1.5 text-center font-bold">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-bold uppercase text-slate-700 text-center">
                        {item.cmoRef}
                      </td>
                      <td className="border border-black p-1.5 font-medium leading-relaxed">{item.label}</td>
                      <td className="border border-black p-1.5 text-center font-black uppercase text-[8px]">
                        {isMet ? (
                          <span className="text-emerald-800 font-black">✓ OPERATIONAL</span>
                        ) : (
                          <span className="text-rose-700 font-black">✗ GAP / DEFICIENT</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>

      {/* Summary of Deficiencies & Corrective Action */}
      <div className="mb-6 border border-black p-4 bg-slate-50">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-900 mb-2">
          Summary of Identified Gaps & Deficiencies:
        </h4>
        {gaps.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1 text-[8.5px] text-slate-800">
            {gaps.map((g) => (
              <li key={g.id}>
                <strong>[{g.cmoRef}]</strong> {g.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[9px] font-bold text-emerald-800 italic">
            No critical mainstreaming deficiencies found. The unit meets 100% of the CMO No. 1, s. 2015 institutional
            standards.
          </p>
        )}
      </div>

      {/* Signatories */}
      <div className="mt-8 grid grid-cols-2 gap-16 px-8 text-[9px] font-bold">
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Evaluated & Prepared By:</p>
          <div className="border-b border-black pb-1 font-black uppercase">{directorName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">Director, Gender and Development</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Approved By:</p>
          <div className="border-b border-black pb-1 font-black uppercase text-indigo-900">{presidentName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">University President</p>
        </div>
      </div>

      <div className="mt-8 text-[7.5px] text-slate-500 italic border-t pt-2 flex justify-between">
        <span>Official CMO No. 1 s. 2015 Audit Report &bull; Unit Assessment</span>
        <span>Generated via CRAIITECH Quality EOMS Portal</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. UNIVERSITY-WIDE GAD MAINSTREAMING AUDIT & GAP ANALYSIS REPORT TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export interface GADInstitutionalMainstreamingReportTemplateProps {
  units: Unit[];
  campuses: Campus[];
  year: number;
  allChecklists: Array<{ unitId: string; year: number; scores: Record<string, boolean> }>;
  criteria: Array<{ id: string; category: string; cmoRef: string; label: string }>;
  signatories?: Signatories;
  gadSettings?: GadSettings;
}

export function GADInstitutionalMainstreamingReportTemplate({
  units,
  campuses,
  year,
  allChecklists,
  criteria,
  signatories,
  gadSettings,
}: GADInstitutionalMainstreamingReportTemplateProps) {
  const directorName =
    gadSettings?.gadDirector || signatories?.gadDirector || signatories?.qaoDirector || 'Carolyn D. Fetalver';
  const presidentName = signatories?.universityPresident || 'Merian P. Catajay-Mani, Ed.D., CESE';

  const campusMap = new Map(campuses.map((c) => [c.id, c.name]));
  const checklistMap = new Map(allChecklists.map((c) => [c.unitId, c.scores || {}]));

  // Compute unit scores
  const unitStats = units.map((u) => {
    const scores = checklistMap.get(u.id) || {};
    const completed = Object.values(scores).filter(Boolean).length;
    const scorePct = Math.round((completed / criteria.length) * 100);
    const gaps = criteria.filter((c) => !scores[c.id]);
    return {
      unit: u,
      scores,
      completed,
      scorePct,
      gaps,
    };
  });

  const totalPossible = units.length * criteria.length;
  const totalCompleted = unitStats.reduce((acc, u) => acc + u.completed, 0);
  const universityAvgIndex = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
  const unitsEvaluated = unitStats.filter((u) => u.completed > 0).length;

  // Compute criterion compliance rate across the entire university
  const criteriaStats = criteria.map((crit) => {
    const metUnits = unitStats.filter((u) => u.scores[crit.id]).length;
    const rate = units.length > 0 ? Math.round((metUnits / units.length) * 100) : 0;
    return {
      ...crit,
      metUnits,
      rate,
      deficientUnits: units.length - metUnits,
    };
  });

  // Sort criteria from lowest compliance (biggest problems) to highest
  const problematicCriteria = [...criteriaStats].sort((a, b) => a.rate - b.rate);

  return (
    <div className="p-6 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight">
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-base font-bold uppercase">Romblon State University</h1>
        <h2 className="text-sm font-semibold uppercase mt-0.5">
          Gender and Development Office &bull; Quality Assurance Office
        </h2>
        <h3 className="text-sm font-black uppercase mt-2 text-indigo-900 tracking-wider">
          Institutional GAD Mainstreaming Audit & University-Wide Gap Analysis
        </h3>
        <p className="text-xs font-black mt-1">
          ACADEMIC / FISCAL YEAR: AY {year}-{year + 1} ({year})
        </p>
        <p className="text-[10px] text-slate-600 uppercase font-bold mt-0.5">
          Benchmark: CHED Memorandum Order No. 01, Series of 2015 & Harmonized GAD Guidelines (HGDG)
        </p>
      </div>

      {/* University Executive Summary Cards */}
      <div className="mb-6 border-2 border-black p-4 bg-slate-50 grid grid-cols-4 text-center">
        <div className="border-r border-black p-2">
          <p className="text-[9px] font-bold uppercase text-slate-600">University Compliance Index</p>
          <p className="text-3xl font-black text-indigo-900 mt-1">{universityAvgIndex}%</p>
          <p className="text-[7.5px] font-bold uppercase text-slate-500 mt-0.5">Overall Institutional Average</p>
        </div>
        <div className="border-r border-black p-2">
          <p className="text-[9px] font-bold uppercase text-slate-600">Units Evaluated</p>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {unitsEvaluated} / {units.length}
          </p>
          <p className="text-[7.5px] font-bold uppercase text-emerald-700 mt-0.5">Active Participating Units</p>
        </div>
        <div className="border-r border-black p-2">
          <p className="text-[9px] font-bold uppercase text-slate-600">Top Problem Area</p>
          <p className="text-sm font-black text-rose-700 mt-2 truncate" title={problematicCriteria[0]?.label}>
            {problematicCriteria[0]?.cmoRef || 'N/A'}
          </p>
          <p className="text-[7.5px] font-bold uppercase text-rose-600 mt-0.5">
            Only {problematicCriteria[0]?.rate || 0}% Compliant
          </p>
        </div>
        <div className="p-2">
          <p className="text-[9px] font-bold uppercase text-slate-600">Audit Status</p>
          <p className="text-base font-black text-emerald-900 mt-2">
            {universityAvgIndex >= 75 ? 'SATISFACTORY' : 'REQUIRES REMEDIATION'}
          </p>
          <p className="text-[7.5px] font-bold uppercase text-slate-500 mt-0.5">Official QA Determination</p>
        </div>
      </div>

      {/* Section I: Pillar-by-Pillar Problem & Gap Ranking */}
      <div className="mb-6">
        <h4 className="text-xs font-black uppercase text-indigo-900 border-b border-black pb-1 mb-2">
          Section I. University-Wide GAD Mainstreaming Criteria & Deficiencies Ranking (Lowest to Highest Compliance)
        </h4>
        <p className="text-[8px] text-slate-600 mb-2 italic">
          This table reveals the exact systemic gaps across the university, ranked by deficiency rate to prioritize
          institutional resources and policy interventions.
        </p>
        <table className="w-full border-collapse border-[1.5px] border-black text-[8px]">
          <thead>
            <tr className="bg-slate-200 text-center font-black uppercase">
              <th className="border border-black p-1.5 w-[4%]">Rank</th>
              <th className="border border-black p-1.5 w-[14%]">CHED / PCW Ref</th>
              <th className="border border-black p-1.5 w-[18%]">Pillar Category</th>
              <th className="border border-black p-1.5 w-[42%] text-left">Mainstreaming Element & Requirement</th>
              <th className="border border-black p-1.5 w-[11%]">Compliant Units</th>
              <th className="border border-black p-1.5 w-[11%]">Compliance Rate</th>
            </tr>
          </thead>
          <tbody>
            {problematicCriteria.map((crit, idx) => (
              <tr
                key={crit.id}
                className={crit.rate < 50 ? 'bg-rose-50/40' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
              >
                <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                <td className="border border-black p-1 text-center font-bold uppercase text-slate-700">
                  {crit.cmoRef}
                </td>
                <td className="border border-black p-1 font-bold text-center uppercase">{crit.category}</td>
                <td className="border border-black p-1 font-medium leading-tight">{crit.label}</td>
                <td className="border border-black p-1 text-center font-bold">
                  {crit.metUnits} of {units.length}
                </td>
                <td className="border border-black p-1 text-center font-black tabular-nums">
                  <span className={crit.rate < 50 ? 'text-rose-700' : 'text-emerald-800'}>{crit.rate}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section II: Unit-by-Unit Compliance & Specific Gaps Matrix */}
      <div className="mb-6">
        <h4 className="text-xs font-black uppercase text-indigo-900 border-b border-black pb-1 mb-2">
          Section II. Unit-by-Unit Mainstreaming Performance & Identified Specific Gaps
        </h4>
        <table className="w-full border-collapse border-[1.5px] border-black text-[7.5px]">
          <thead>
            <tr className="bg-slate-200 text-center font-black uppercase">
              <th className="border border-black p-1 w-[3%]">#</th>
              <th className="border border-black p-1 w-[22%] text-left">Operating Unit</th>
              <th className="border border-black p-1 w-[15%] text-left">Campus Site</th>
              <th className="border border-black p-1 w-[10%]">Index (%)</th>
              <th className="border border-black p-1 w-[10%]">Elements Met</th>
              <th className="border border-black p-1 w-[40%] text-left">Specific Gaps / Deficiencies Identified</th>
            </tr>
          </thead>
          <tbody>
            {unitStats
              .sort((a, b) => a.scorePct - b.scorePct)
              .map((u, idx) => (
                <tr
                  key={u.unit.id}
                  className={u.scorePct < 50 ? 'bg-rose-50/20' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}
                >
                  <td className="border border-black p-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black p-1 font-bold uppercase">{u.unit.name}</td>
                  <td className="border border-black p-1 text-slate-600">
                    {u.unit.campusIds
                      ?.map((cId: string) => campusMap.get(cId))
                      .filter(Boolean)
                      .join(', ') || 'Institutional'}
                  </td>
                  <td className="border border-black p-1 text-center font-black tabular-nums">
                    <span
                      className={
                        u.scorePct >= 80 ? 'text-emerald-800' : u.scorePct >= 50 ? 'text-amber-700' : 'text-rose-700'
                      }
                    >
                      {u.scorePct}%
                    </span>
                  </td>
                  <td className="border border-black p-1 text-center font-bold">
                    {u.completed} / {criteria.length}
                  </td>
                  <td className="border border-black p-1 text-slate-700 leading-tight">
                    {u.gaps.length > 0 ? (
                      <span className="text-rose-900 font-medium">
                        Missing: {u.gaps.map((g) => g.cmoRef).join('; ')}
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-bold">All 11 criteria verified operational.</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Signatories */}
      <div className="mt-8 grid grid-cols-2 gap-16 px-8 text-[9px] font-bold">
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Prepared & Audited By:</p>
          <div className="border-b border-black pb-1 font-black uppercase">{directorName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">Director, Gender and Development</p>
        </div>
        <div className="text-center">
          <p className="text-left mb-10 text-slate-600">Noted & Approved By:</p>
          <div className="border-b border-black pb-1 font-black uppercase text-indigo-900">{presidentName}</div>
          <p className="mt-1 text-[8px] uppercase text-slate-500">University President</p>
        </div>
      </div>

      <div className="mt-8 text-[7.5px] text-slate-500 italic border-t pt-2 flex justify-between">
        <span>
          Official CMO No. 1 s. 2015 Institutional Mainstreaming Audit Report &bull; AY {year}-{year + 1}
        </span>
        <span>Generated via CRAIITECH Quality EOMS Portal</span>
      </div>
    </div>
  );
}
