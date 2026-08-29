'use client';

import React from 'react';
import type { CorrectiveActionRequest, Signatories } from '@/lib/types';
import { format } from 'date-fns';

export interface OverdueUnitGroup {
  unitId: string;
  unitName: string;
  campusId: string;
  campusName: string;
  unitHead?: string;
  supervisingUnitName?: string;
  overdueCars: {
    car: CorrectiveActionRequest;
    daysOverdue: number;
    deadlineStr: string;
    actionLabel: string;
  }[];
}

export interface CAROverdueMemorandumTemplateProps {
  unitGroup?: OverdueUnitGroup;
  allUnitGroups?: OverdueUnitGroup[];
  memoRefNo?: string;
  memoDate?: Date | string;
  gracePeriodDays?: number;
  customDirective?: string;
  signatories?: Signatories;
  year?: number;
  isBatchConsolidated?: boolean;
}

export function CAROverdueMemorandumTemplate({
  unitGroup,
  allUnitGroups,
  memoRefNo,
  memoDate = new Date(),
  gracePeriodDays = 5,
  customDirective,
  signatories,
  year = new Date().getFullYear(),
  isBatchConsolidated = false,
}: CAROverdueMemorandumTemplateProps) {
  const dateObj = memoDate instanceof Date ? memoDate : new Date(memoDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? format(dateObj, 'MMMM d, yyyy').toUpperCase()
    : format(new Date(), 'MMMM d, yyyy').toUpperCase();

  const generatedRefNo = memoRefNo || `${year}-${format(!isNaN(dateObj.getTime()) ? dateObj : new Date(), 'MMdd')}`;

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  // Determine recipients list
  const recipientUnits: { name: string; campus?: string }[] =
    isBatchConsolidated && allUnitGroups && allUnitGroups.length > 0
      ? allUnitGroups.map((g) => ({ name: g.unitName, campus: g.campusName }))
      : unitGroup
        ? [{ name: unitGroup.unitName, campus: unitGroup.campusName }]
        : [{ name: 'ALL ACCOUNTABLE UNITS', campus: 'Romblon State University' }];

  // Collect all overdue CAR items for attachment table
  const allOverdueItems =
    isBatchConsolidated && allUnitGroups && allUnitGroups.length > 0
      ? allUnitGroups.flatMap((g) =>
          g.overdueCars.map((item) => ({ ...item, unitName: g.unitName, campusName: g.campusName })),
        )
      : unitGroup
        ? unitGroup.overdueCars.map((item) => ({
            ...item,
            unitName: unitGroup.unitName,
            campusName: unitGroup.campusName,
          }))
        : [];

  const totalOverdueCount = allOverdueItems.length;

  return (
    <div
      className="p-8 sm:p-12 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-normal text-[10pt] print:p-0 print:max-w-full"
      style={{ minHeight: '11in' }}
    >
      {/* 1. TOP-LEFT MEMORANDUM CLASSIFICATION & REF NO */}
      <div className="mb-6">
        <h1 className="text-[13pt] font-black text-slate-900 tracking-tight leading-tight m-0">QA Memorandum</h1>
        <p className="text-[11pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
      </div>

      {/* 2. TABULAR METADATA BLOCK (MATCHING OFFICIAL QAO HEADER SAMPLE) */}
      <div className="space-y-3 mb-6 text-[10pt] leading-snug">
        {/* TO ROW */}
        <div className="flex items-start">
          <div className="w-24 font-bold uppercase text-slate-900 tracking-wider shrink-0">TO</div>
          <div className="w-6 text-center font-bold text-slate-900 shrink-0">:</div>
          <div className="flex-1 font-bold uppercase text-slate-900 space-y-0.5">
            {recipientUnits.map((r, i) => (
              <div key={i} className="tracking-tight">
                {r.name.toUpperCase()}{' '}
                {r.campus && !r.campus.toLowerCase().includes('main') ? `(${r.campus.toUpperCase()})` : ''}
              </div>
            ))}
            <div className="text-[9pt] font-semibold normal-case text-slate-600 pt-0.5">This University</div>
          </div>
        </div>

        {/* FROM ROW */}
        <div className="flex items-start pt-1">
          <div className="w-24 font-bold uppercase text-slate-900 tracking-wider shrink-0">FROM</div>
          <div className="w-6 text-center font-bold text-slate-900 shrink-0">:</div>
          <div className="flex-1 font-bold text-slate-900">
            <span className="uppercase block font-black">{qmsHead}</span>
            <span className="text-[9pt] font-normal text-slate-700 block">Head, Quality Management System (QMS)</span>
          </div>
        </div>

        {/* SUBJECT ROW */}
        <div className="flex items-start pt-1">
          <div className="w-24 font-bold uppercase text-slate-900 tracking-wider shrink-0">SUBJECT</div>
          <div className="w-6 text-center font-bold text-slate-900 shrink-0">:</div>
          <div className="flex-1 font-black uppercase text-slate-900 tracking-tight leading-snug">
            COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS AND CORRECTIVE ACTION PLAN FOR OVERDUE
            CORRECTIVE ACTION REQUESTS (CAR)
          </div>
        </div>

        {/* DATE ROW */}
        <div className="flex items-start pt-1">
          <div className="w-24 font-bold uppercase text-slate-900 tracking-wider shrink-0">DATE</div>
          <div className="w-6 text-center font-bold text-slate-900 shrink-0">:</div>
          <div className="flex-1 font-black uppercase text-slate-900">{formattedDate}</div>
        </div>
      </div>

      {/* 3. SOLID HORIZONTAL DIVIDING RULE */}
      <hr className="border-t-2 border-slate-900 my-5" />

      {/* 4. FORMAL MEMORANDUM BODY PARAGRAPHS */}
      <div className="space-y-3.5 text-justify text-slate-900 leading-relaxed text-[10pt]">
        <p>
          In line with the mandatory requirements of{' '}
          <strong>ISO 21001:2018 (Educational Organizations Management Systems) Clause 10.2</strong>,{' '}
          <strong>ISO 9001:2015 Clause 10.2</strong>, and the{' '}
          <strong>Romblon State University Educational Organizations Management System (RSU-EOMS) Manual</strong>, all
          accountable academic and administrative units are directed to immediately submit their official{' '}
          <em>Root Cause Analysis (RCA)</em> and <em>Corrective Action Plan (CAP)</em> for nonconformities identified
          during quality audits.
        </p>

        <p>
          Please be informed that records in the <strong>RSU EOMS Submission Portal</strong> indicate that as of{' '}
          <strong>{formattedDate}</strong>, your office has <strong>unresolved Corrective Action Requests (CAR)</strong>{' '}
          whose statutory reply deadlines have elapsed without submission of an approved action plan. The complete
          inventory of delinquent items, committed dates, and non-conformance statements is detailed in the attached
          schedule (<em>Attachment A</em>).
        </p>

        {customDirective && (
          <p className="bg-slate-50 border-l-4 border-slate-900 p-2.5 my-2 text-[9.5pt]">
            <strong>Specific Administrative Directive:</strong> {customDirective}
          </p>
        )}

        <p>
          Accountable Unit Heads, QMS Leads, and Process Owners are hereby instructed to log in to the{' '}
          <strong>RSU EOMS Submission Portal</strong> (navigate to <em>QA Reports &gt; CAR Registry</em>) and complete
          the following mandatory response workflow:
        </p>

        <ol className="list-decimal pl-5 space-y-1 text-[9.5pt] text-slate-800">
          <li>
            <strong>Root Cause Investigation (Section B):</strong> Document the systemic root cause using the 5-Whys or
            Ishikawa Fishbone method.
          </li>
          <li>
            <strong>Corrective Action Formulation:</strong> Detail both immediate containment measures and long-term
            corrective actions with designated responsible owners.
          </li>
          <li>
            <strong>Committed Timelines:</strong> Specify realistic milestone completion dates for every action step.
          </li>
          <li>
            <strong>Submission &amp; Evidence:</strong> Click <em>"Submit Unit Response"</em> to alert the Quality
            Assurance Office for verification scheduling.
          </li>
        </ol>

        <p>
          Your office is granted a strict compliance window of <strong>{gracePeriodDays} working days</strong> from
          receipt of this memorandum to complete the submissions in the portal. Failure to comply within this final
          grace period will constrain this Office to:
        </p>

        <ul className="list-disc pl-5 space-y-0.5 text-[9.5pt] text-slate-800">
          <li>
            Formally elevate the matter to the <strong>Office of the Vice Presidents</strong> and{' '}
            <strong>University President</strong> for administrative intervention;
          </li>
          <li>
            Reclassify the items as <strong>Major Systemic Nonconformities</strong> with adverse impact on the unit's
            Performance-Based Bonus (PBB) and QA compliance ratings.
          </li>
        </ul>

        <p className="pt-2">For your strict compliance and guidance.</p>
      </div>

      {/* 5. SIGNATORIES BLOCK (ISSUED BY QMS HEAD, NOTED BY QAO DIRECTOR) */}
      <div className="grid grid-cols-2 gap-8 pt-8 text-[9.5pt]">
        <div className="space-y-1">
          <p className="font-bold text-slate-600 uppercase text-[8pt]">Issued by:</p>
          <div className="pt-10">
            <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[200px]">
              {qmsHead}
            </p>
            <p className="text-[8.5pt] text-slate-800 font-bold mt-0.5">Head, Quality Management System (QMS)</p>
            <p className="text-[8pt] text-slate-500">Lead Internal Quality Auditor, RSU</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-bold text-slate-600 uppercase text-[8pt]">Noted by:</p>
          <div className="pt-10">
            <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[200px]">
              {qaoDirector}
            </p>
            <p className="text-[8.5pt] text-slate-800 font-bold mt-0.5">Director, Quality Assurance Office</p>
            <p className="text-[8pt] text-slate-500">Romblon State University</p>
          </div>
        </div>
      </div>

      {/* 6. ATTACHMENT: IDENTIFIED ISSUES TABLE IN SCHEDULE FORMAT */}
      <div className="mt-12 pt-6 border-t-2 border-slate-900" style={{ pageBreakBefore: 'always' }}>
        <div className="mb-4">
          <div className="flex justify-between items-end border-b-2 border-slate-900 pb-2">
            <div>
              <h2 className="text-[12pt] font-black uppercase tracking-tight text-slate-900 m-0">
                ATTACHMENT A: SCHEDULE OF OVERDUE CORRECTIVE ACTION REQUESTS (CAR)
              </h2>
              <p className="text-[8.5pt] font-semibold text-slate-600 m-0 mt-0.5">
                Official Inventory of Identified Audit Non-Conformances &amp; Overdue Statuses
              </p>
            </div>
            <div className="text-right">
              <span className="text-[9pt] font-mono font-bold text-slate-900 block">Ref: {generatedRefNo}</span>
              <span className="text-[8pt] font-bold text-rose-700 font-mono">
                {totalOverdueCount} Overdue Item{totalOverdueCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {allOverdueItems.length === 0 ? (
          <div className="p-8 text-center border border-dashed rounded text-slate-500 italic text-xs">
            No overdue Corrective Action Requests found.
          </div>
        ) : (
          <table className="w-full border-collapse border border-slate-900 text-[8.5pt]">
            <thead>
              <tr className="bg-slate-100 font-black text-slate-900 uppercase">
                <th className="border border-slate-900 p-2 text-center w-[5%]">#</th>
                <th className="border border-slate-900 p-2 text-center w-[12%]">CAR No.</th>
                <th className="border border-slate-900 p-2 text-left w-[20%]">Accountable Unit &amp; Campus</th>
                <th className="border border-slate-900 p-2 text-left w-[23%]">Audit Scope / ISO Clause</th>
                <th className="border border-slate-900 p-2 text-left w-[26%]">
                  Identified Audit Issue / Non-Conformance
                </th>
                <th className="border border-slate-900 p-2 text-center w-[14%]">Deadline &amp; Delay</th>
              </tr>
            </thead>
            <tbody>
              {allOverdueItems.map((item, idx) => {
                const { car, daysOverdue, deadlineStr, unitName, campusName } = item;
                return (
                  <tr key={car.id || idx} className="hover:bg-slate-50">
                    <td className="border border-slate-900 p-2 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="border border-slate-900 p-2 text-center font-mono font-bold text-slate-900">
                      <div>{car.carNumber}</div>
                      <span className="text-[7pt] px-1 py-0.2 rounded bg-slate-200 uppercase font-sans">
                        {car.auditType === 'EQA' ? 'EQA' : 'IQA'}
                      </span>
                    </td>
                    <td className="border border-slate-900 p-2">
                      <strong className="block text-slate-900 uppercase text-[8.5pt]">
                        {unitName || 'Unknown Unit'}
                      </strong>
                      <span className="text-[7.5pt] text-slate-600 block">{campusName || 'Main Campus'}</span>
                    </td>
                    <td className="border border-slate-900 p-2">
                      <span className="font-bold text-slate-900 block leading-tight">
                        {car.procedureTitle || 'General Standard Operating Procedure'}
                      </span>
                      <span className="text-[7.5pt] text-slate-600">
                        Clause {car.concerningClause || '4.1'} (ISO 21001:2018)
                      </span>
                    </td>
                    <td className="border border-slate-900 p-2 text-slate-800 leading-snug">
                      <p className="line-clamp-4 m-0 text-[8pt]">
                        {car.descriptionOfNonconformance ||
                          'Non-conformance recorded during quality audit verification.'}
                      </p>
                    </td>
                    <td className="border border-slate-900 p-2 text-center font-mono">
                      <span className="font-bold text-rose-700 block text-[8pt]">{deadlineStr}</span>
                      <span className="inline-block px-1.5 py-0.5 rounded text-[7pt] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300 mt-1">
                        {daysOverdue > 0 ? `${daysOverdue}D OVERDUE` : 'DUE TODAY'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* ATTACHMENT FOOTER ENDORSEMENTS */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-6 text-[8.5pt] border-t border-slate-300">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[7.5pt]">Certified Accurate by:</p>
            <div className="pt-8">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[180px]">
                {qmsHead}
              </p>
              <p className="text-[7.5pt] text-slate-700 font-bold mt-0.5">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[7.5pt]">Approved for Release by:</p>
            <div className="pt-8">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[180px]">
                {qaoDirector}
              </p>
              <p className="text-[7.5pt] text-slate-700 font-bold mt-0.5">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>

        {/* DOCUMENT FOOTER */}
        <div className="border-t border-slate-300 pt-3 mt-4 text-[7pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-CAR-MEMO-01 (Attachment A) | Rev. 03
          </span>
        </div>
      </div>
    </div>
  );
}
