'use client';

import React from 'react';
import type { CorrectiveActionRequest, Signatories, Unit, Campus } from '@/lib/types';
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
  unitGroup: OverdueUnitGroup;
  memoRefNo?: string;
  memoDate?: Date | string;
  gracePeriodDays?: number;
  customDirective?: string;
  signatories?: Signatories;
  year?: number;
}

export function CAROverdueMemorandumTemplate({
  unitGroup,
  memoRefNo,
  memoDate = new Date(),
  gracePeriodDays = 5,
  customDirective,
  signatories,
  year = new Date().getFullYear(),
}: CAROverdueMemorandumTemplateProps) {
  const dateObj = memoDate instanceof Date ? memoDate : new Date(memoDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? format(dateObj, 'MMMM d, yyyy')
    : format(new Date(), 'MMMM d, yyyy');
  const generatedRefNo =
    memoRefNo || `RSU-QAO-MEMO-CAR-${year}-${format(!isNaN(dateObj.getTime()) ? dateObj : new Date(), 'MMdd')}`;

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'DIR. QUALITY ASSURANCE OFFICE';

  const isMainCampus =
    unitGroup.campusName.toLowerCase().includes('main') || unitGroup.campusName.toLowerCase().includes('institutional');

  const thruLine = !isMainCampus ? `THE CAMPUS DIRECTOR, ${unitGroup.campusName.toUpperCase()}` : undefined;

  const totalOverdue = unitGroup.overdueCars.length;
  const maxDaysOverdue = Math.max(...unitGroup.overdueCars.map((c) => c.daysOverdue), 0);

  return (
    <div
      className="p-8 sm:p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed text-[10.5pt] print:p-0 print:max-w-full"
      style={{ minHeight: '11in' }}
    >
      {/* 1. INSTITUTIONAL UNIVERSITY LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-6">
        <p className="text-[9pt] font-sans font-bold uppercase tracking-widest text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-[14pt] font-sans font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-[11pt] font-sans font-bold uppercase tracking-wide text-slate-800 m-0">
          Quality Assurance Office
        </h2>
        <p className="text-[8.5pt] font-sans italic text-slate-600 m-0">
          Main Campus, Odiongan, Romblon | ISO 21001:2018 (EOMS) & ISO 9001:2015 Standardized
        </p>
      </div>

      {/* 2. OFFICIAL MEMORANDUM STRIP */}
      <div className="border-y-2 border-black py-1.5 mb-6 bg-slate-50 text-center font-sans">
        <h2 className="text-[11pt] font-black uppercase tracking-[0.18em] text-slate-900 m-0">OFFICE MEMORANDUM</h2>
        <p className="text-[8pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          URGENT COMPLIANCE DIRECTIVE: UNRESOLVED CORRECTIVE ACTION REQUEST (CAR) RESPONSES
        </p>
      </div>

      {/* 3. MEMORANDUM HEADER DETAILS */}
      <div className="border border-black font-sans text-[9pt] mb-6">
        <div className="grid grid-cols-12 border-b border-black">
          <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">MEMO REF NO:</div>
          <div className="col-span-4 p-2 font-mono font-bold border-r border-black text-slate-900">
            {generatedRefNo}
          </div>
          <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">DATE:</div>
          <div className="col-span-4 p-2 font-bold text-slate-900">{formattedDate}</div>
        </div>

        <div className="grid grid-cols-12 border-b border-black">
          <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">TO / FOR:</div>
          <div className="col-span-10 p-2 font-bold text-slate-900">
            <span className="uppercase text-[9.5pt] font-black">
              {unitGroup.unitHead ? `${unitGroup.unitHead.toUpperCase()} — ` : ''}
              {unitGroup.unitName.toUpperCase()}
            </span>
            <span className="text-slate-600 block text-[8.5pt]">
              {unitGroup.campusName} | Accountable Unit Head, QMS Focal Persons & Process Owners
            </span>
          </div>
        </div>

        {thruLine && (
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">THRU:</div>
            <div className="col-span-10 p-2 font-bold uppercase text-slate-800">{thruLine}</div>
          </div>
        )}

        {unitGroup.supervisingUnitName && (
          <div className="grid grid-cols-12 border-b border-black">
            <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">SUPERVISION:</div>
            <div className="col-span-10 p-2 font-bold uppercase text-slate-800">
              {unitGroup.supervisingUnitName.toUpperCase()}
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 border-b border-black">
          <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">FROM:</div>
          <div className="col-span-10 p-2 font-black uppercase text-slate-900">
            {qmsHead}
            <span className="font-normal normal-case block text-slate-600 text-[8.5pt]">
              Head, Quality Management System (QMS) / Lead Internal Quality Auditor
            </span>
          </div>
        </div>

        <div className="grid grid-cols-12">
          <div className="col-span-2 font-bold p-2 bg-slate-100 uppercase border-r border-black">SUBJECT:</div>
          <div className="col-span-10 p-2 font-black uppercase text-slate-900 underline decoration-1 underline-offset-2">
            FINAL NOTICE & COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS & CORRECTIVE ACTION PLAN
            (CAP) FOR OVERDUE CORRECTIVE ACTION REQUEST(S)
          </div>
        </div>
      </div>

      {/* 4. FORMAL DIRECTIVE BODY */}
      <div className="space-y-4 text-justify mb-6">
        <p>
          1. <strong>LEGAL & REGULATORY BASIS:</strong> In accordance with the provisions of{' '}
          <strong>ISO 21001:2018 (Educational Organizations Management Systems) Clause 10.2</strong>,{' '}
          <strong>ISO 9001:2015 Clause 10.2</strong>, and the{' '}
          <strong>Romblon State University Educational Organizations Management System (RSU-EOMS) Manual</strong>, all
          accountable units are mandated to timely investigate nonconformities, determine genuine root causes, and
          implement corrective actions within the prescribed timeline.
        </p>

        <p>
          2. <strong>NOTICE OF NON-RESPONSE:</strong> Records in the <strong>RSU EOMS Submission Portal</strong>{' '}
          indicate that as of <strong>{formattedDate}</strong>, your office has <strong>failed to submit</strong> the
          required <em>Root Cause Analysis (RCA)</em> and <em>Corrective Action Plan (CAP)</em> for{' '}
          <strong>
            {totalOverdue} Corrective Action Request{totalOverdue > 1 ? 's' : ''} (CAR)
          </strong>
          , with delinquency reaching up to{' '}
          <strong>
            {maxDaysOverdue} day{maxDaysOverdue === 1 ? '' : 's'} past the committed deadline
          </strong>
          .
        </p>

        {customDirective && (
          <div className="border-l-4 border-rose-600 bg-rose-50/70 p-3 font-sans text-[9pt] text-slate-800 rounded-r border-y border-r border-rose-200">
            <strong className="text-rose-900 uppercase">SPECIFIC ADMINISTRATIVE DIRECTIVE:</strong>
            <p className="mt-1 leading-snug">{customDirective}</p>
          </div>
        )}
      </div>

      {/* 5. INVENTORY TABLE OF OVERDUE CARs */}
      <div className="mb-6 font-sans">
        <h3 className="text-[9.5pt] font-black uppercase tracking-wider mb-2 border-b-2 border-black pb-1 flex justify-between items-center">
          <span>Schedule of Overdue Corrective Action Requests (CAR)</span>
          <span className="text-[8pt] font-bold text-rose-700 font-mono">
            {totalOverdue} Item{totalOverdue > 1 ? 's' : ''} Overdue
          </span>
        </h3>

        <table className="w-full border-collapse border border-black text-[8.5pt]">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase">
              <th className="border border-black p-2 text-center w-[12%]">CAR No.</th>
              <th className="border border-black p-2 text-center w-[8%]">Type</th>
              <th className="border border-black p-2 text-left w-[26%]">Procedure / Requirement</th>
              <th className="border border-black p-2 text-left w-[28%]">Finding Description</th>
              <th className="border border-black p-2 text-center w-[13%]">Reply Deadline</th>
              <th className="border border-black p-2 text-center w-[13%]">Status & Delay</th>
            </tr>
          </thead>
          <tbody>
            {unitGroup.overdueCars.map((item, idx) => {
              const { car, daysOverdue, deadlineStr, actionLabel } = item;
              return (
                <tr key={car.id || idx} className="hover:bg-slate-50">
                  <td className="border border-black p-2 text-center font-bold font-mono text-slate-900">
                    {car.carNumber}
                  </td>
                  <td className="border border-black p-2 text-center font-bold">
                    {car.auditType === 'EQA' ? 'EQA' : 'IQA'}
                  </td>
                  <td className="border border-black p-2">
                    <span className="font-bold block text-slate-900">{car.procedureTitle || 'General Procedure'}</span>
                    <span className="text-[7.5pt] text-slate-600">Clause {car.concerningClause || 'N/A'}</span>
                  </td>
                  <td className="border border-black p-2 text-slate-700 leading-snug">
                    <p className="line-clamp-3 m-0">
                      {car.descriptionOfNonconformance || 'Non-conformance recorded during quality audit.'}
                    </p>
                  </td>
                  <td className="border border-black p-2 text-center font-bold font-mono text-rose-700">
                    {deadlineStr}
                  </td>
                  <td className="border border-black p-2 text-center">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[7.5pt] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                      {daysOverdue > 0 ? `${daysOverdue}d OVERDUE` : 'DUE TODAY'}
                    </span>
                    <span className="block text-[7pt] text-slate-500 mt-0.5">{actionLabel}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 6. STEP-BY-STEP INSTRUCTIONS ON HOW TO RESPOND IN RSU EOMS SUBMISSION PORTAL */}
      <div className="border-2 border-black bg-slate-50/60 p-4 rounded-none mb-6 font-sans text-[8.5pt]">
        <h4 className="text-[9pt] font-black uppercase tracking-wider text-slate-900 border-b border-black pb-1 mb-2.5">
          MANDATORY INSTRUCTIONS: HOW TO FILE YOUR UNIT RESPONSE IN RSU EOMS SUBMISSION PORTAL
        </h4>

        <ol className="space-y-2 pl-4 list-decimal text-slate-800 leading-snug">
          <li>
            <strong>Access the RSU EOMS Submission Portal:</strong> Navigate to{' '}
            <span className="font-mono font-bold bg-white px-1.5 py-0.5 border border-slate-300">
              QA Reports &gt; CAR Registry
            </span>{' '}
            or click the direct link embedded in your on-device CAR alert.
          </li>
          <li>
            <strong>Locate the Overdue CAR:</strong> Under the <em>"Open &amp; On-going CAR"</em> or{' '}
            <em>"For Action"</em> tab, find your assigned CAR number (
            {unitGroup.overdueCars.map((c) => c.car.carNumber).join(', ')}) and click{' '}
            <strong>"Take Action / Manage"</strong>.
          </li>
          <li>
            <strong>Conduct Root Cause Analysis (RCA):</strong> In <em>Section B (Root Cause Analysis)</em>, perform a
            structured cause analysis using the <strong>5 Whys Method</strong>, <strong>Fishbone Diagram</strong>, or{' '}
            <strong>4M/6M Root Cause Framework</strong>. State the fundamental systemic vulnerability that allowed the
            non-conformance to occur.
          </li>
          <li>
            <strong>Formulate Corrective Action Plan (CAP):</strong>
            <ul className="list-disc pl-4 mt-1 space-y-1 text-slate-700">
              <li>
                <strong>Immediate Correction (Containment):</strong> Specify immediate remedies to arrest and rectify
                the direct defect.
              </li>
              <li>
                <strong>Long-Term Corrective Action:</strong> Formulate systemic process changes, revisions of
                documented procedures, or controls to guarantee non-recurrence.
              </li>
              <li>
                <strong>Target Completion Dates &amp; Responsible Leads:</strong> Designate specific personnel and
                realistic completion target dates for every action step.
              </li>
            </ul>
          </li>
          <li>
            <strong>Submit for Quality Assurance Verification:</strong> Review all entered data and click{' '}
            <strong className="text-primary">"Submit Unit Response / Save CAR"</strong>. The Quality Assurance Office
            and Lead Auditor will receive an automated notification for compliance assessment and verification
            scheduling.
          </li>
          <li>
            <strong>Upload Objective Evidence:</strong> Prepare and attach documentary proof (training attendance,
            revised forms, communication memos, photographic evidence) in the RSU EOMS Submission Portal once action
            steps are completed.
          </li>
        </ol>
      </div>

      {/* 7. STRICT COMPLIANCE WINDOW & SANCTION WARNING */}
      <div className="space-y-3 text-justify mb-8">
        <p>
          3. <strong>STRICT GRACE WINDOW:</strong> Your office is granted a final, non-extendable grace period of{' '}
          <strong>{gracePeriodDays} working days</strong> from the date of this memorandum (on or before{' '}
          <strong>{format(new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000), 'MMMM d, yyyy (EEEE)')}</strong>
          ) to submit the completed Root Cause Analysis and Corrective Action Plan in the RSU EOMS Submission Portal.
        </p>

        <p>
          4. <strong>SANCTIONS & ESCALATION:</strong> Please be advised that continued non-compliance and failure to
          respond within this final window will constrain this Office to:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-slate-800 text-[10pt]">
          <li>
            Formally elevate the matter to the <strong>Office of the Vice Presidents</strong> and{' '}
            <strong>University President</strong> for administrative intervention;
          </li>
          <li>
            Reclassify the item as a <strong>Major Systemic Nonconformity</strong> with immediate adverse effect on the
            unit's Performance-Based Bonus (PBB) and Quality Assurance rating;
          </li>
          <li>
            Include the non-responsive status in the official <strong>Management Review Output (Clause 9.3)</strong> and
            Institutional Accreditation dossiers.
          </li>
        </ul>

        <p className="mt-4">For your strict compliance and immediate preferential action.</p>
      </div>

      {/* 8. SIGNATORIES BLOCK */}
      <div className="grid grid-cols-2 gap-8 pt-6 font-sans text-[9pt] border-t border-black mb-8">
        <div className="space-y-1">
          <p className="font-bold text-slate-600 uppercase text-[8pt]">Issued by:</p>
          <div className="pt-8">
            <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[200px]">
              {qmsHead}
            </p>
            <p className="text-[8pt] text-slate-700 font-bold mt-0.5">Head, Quality Management System (QMS)</p>
            <p className="text-[7.5pt] text-slate-500">Lead Internal Quality Auditor, RSU</p>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-bold text-slate-600 uppercase text-[8pt]">Noted by:</p>
          <div className="pt-8">
            <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.5 min-w-[200px]">
              {qaoDirector}
            </p>
            <p className="text-[8pt] text-slate-700 font-bold mt-0.5">Director, Quality Assurance Office</p>
            <p className="text-[7.5pt] text-slate-500">Romblon State University</p>
          </div>
        </div>
      </div>

      {/* 9. ROUTING / CC SECTION */}
      <div className="border-t border-slate-300 pt-3 font-sans text-[7.5pt] text-slate-600 flex justify-between items-start">
        <div>
          <span className="font-bold uppercase text-slate-800">Copy Furnished (CC):</span>
          <span className="ml-1.5">
            Office of the University President • Office of the Vice Presidents • Campus Directors • Internal Quality
            Audit Committee • File
          </span>
        </div>
        <div className="text-right font-mono shrink-0">
          Doc Code: <span className="font-bold text-slate-900">RSU-QAO-CAR-MEMO-01</span> | Rev. 02
        </div>
      </div>
    </div>
  );
}
