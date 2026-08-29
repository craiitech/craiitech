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

export type CommunicationType =
  'QA Memorandum' | 'QA Office Memorandum' | 'QA Office Order' | 'QA Advisory' | 'QA Communication';

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
  paperSize?: 'folio' | 'letter' | 'a4';
  statusCategory?: 'all' | 'open' | 'ongoing' | 'for_action' | 'verification';
  communicationType?: CommunicationType;
  includeNoted?: boolean;
  selectedQaoDirector?: string;
  selectedQmsHead?: string;
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
  paperSize = 'folio',
  statusCategory = 'all',
  communicationType = 'QA Memorandum',
  includeNoted = true,
  selectedQaoDirector,
  selectedQmsHead,
}: CAROverdueMemorandumTemplateProps) {
  const dateObj = memoDate instanceof Date ? memoDate : new Date(memoDate);
  const formattedDate = !isNaN(dateObj.getTime())
    ? format(dateObj, 'MMMM d, yyyy').toUpperCase()
    : format(new Date(), 'MMMM d, yyyy').toUpperCase();

  const generatedRefNo = memoRefNo || `${year}-${format(!isNaN(dateObj.getTime()) ? dateObj : new Date(), 'MMdd')}`;

  const qmsHead = selectedQmsHead || signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = selectedQaoDirector || signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

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

  const pageHeight = paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in';

  return (
    <div
      className="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full"
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ========================================================
          PAGE 1: OFFICIAL 1-PAGE FOLIO MEMORANDUM
          ======================================================== */}
      <div
        className="memo-page-1 relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: pageHeight,
          padding: '0.35in 0.45in 0.75in 0.45in',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          pageBreakAfter: 'always',
          breakAfter: 'page',
          position: 'relative',
        }}
      >
        <div>
          {/* 1. TOP INSTITUTIONAL UNIVERSITY LETTERHEAD */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1.5">
            <div className="flex items-center gap-2">
              {/* RSU SEAL & QAO LOGO */}
              <img
                src="/rsulogo.png"
                alt="RSU Official Seal"
                style={{ height: '38px', width: '38px', objectFit: 'contain' }}
              />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />

              {/* UNIVERSITY & OFFICE TITLES */}
              <div>
                <h1 className="text-[11.5pt] font-black uppercase tracking-tight text-slate-900 leading-none m-0 font-serif">
                  ROMBLON STATE UNIVERSITY
                </h1>
                <h2 className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-800 leading-tight m-0 mt-0.5">
                  QUALITY ASSURANCE OFFICE
                </h2>
                <p className="text-[5.8pt] text-slate-600 leading-tight m-0 mt-0.5">
                  3/F Multi-Purpose Building, RSU-Main Campus, Liwanag, Odiongan, Romblon 5505
                  <br />
                  Telephone: (042) 567-2201 | Email: qao@rsu.edu.ph | Website: rsu.edu.ph
                </p>
              </div>
            </div>

            {/* ISO 9001:2015 CERTIFICATION BADGE */}
            <div className="flex items-center pl-2">
              <img
                src="/ISOlogo.jpg"
                alt="ISO 9001:2015 TÜV Rheinland Certified"
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. TWO-COLUMN FOLIO LAYOUT (LEFT SIDEBAR & RIGHT MEMORANDUM) */}
          <div className="grid grid-cols-12 gap-3.5 items-start">
            {/* LEFT SIDEBAR: RSU VISION, MISSION, QUALITY POLICY, CORE VALUES */}
            <div
              className="col-span-3 text-[5.5pt] text-slate-500 italic leading-tight space-y-1.5 select-none pr-2"
              style={{ fontFamily: 'Georgia, Cambria, serif' }}
            >
              <div>
                <strong className="block not-italic font-bold text-slate-700 text-[6.2pt] mb-0.5">RSU Vision</strong>
                <p className="m-0 text-justify leading-tight">
                  A research-based academic institution committed to excellence and service in nurturing globally
                  competitive workforce towards sustainable development.
                </p>
              </div>

              <div>
                <strong className="block not-italic font-bold text-slate-700 text-[6.2pt] mb-0.5">RSU Mission</strong>
                <p className="m-0 text-justify leading-tight">
                  Romblon State University shall nurture an academic environment that provides advanced education,
                  higher technological and professional instruction and technical expertise in agriculture and
                  fisheries, forestry, engineering and technology, education, humanities, sciences and other relevant
                  fields of study and collaborate with other institutions and communities through responsive, relevant
                  and research-based extension services.
                </p>
              </div>

              <div>
                <strong className="block not-italic font-bold text-slate-700 text-[6.2pt] mb-0.5">
                  RSU Quality Policy
                </strong>
                <p className="m-0 text-justify leading-tight">
                  Romblon State University commits to provide higher education through quality instruction, research,
                  production, and community-based extension services that meet or exceed the requirements and
                  expectations of the university's stakeholders. It will comply with international standards, applicable
                  statutory and regulatory requirements, and continually improve the Quality Management System's
                  effectiveness through periodic monitoring and evaluation toward sustained remarkable outcomes.
                </p>
              </div>

              <div>
                <strong className="block not-italic font-bold text-slate-700 text-[6.2pt] mb-0.5">
                  RSU Core Values
                </strong>
                <div className="space-y-0 pl-1 text-[5.2pt]">
                  <div>Stewardship</div>
                  <div>Competence</div>
                  <div>Resilience</div>
                  <div>Integrity</div>
                  <div>Balance</div>
                  <div>Excellence</div>
                  <div>Service</div>
                </div>
                <p className="m-0 mt-0.5 text-[5pt] text-slate-400 text-justify leading-tight">
                  These Core Values serve as our guiding principle in our efforts to make ROMBLON STATE UNIVERSITY a
                  recognized HEI in the region and beyond.
                </p>
              </div>
            </div>

            {/* RIGHT MAIN COLUMN: MEMORANDUM HEADER & NARRATIVE */}
            <div className="col-span-9 space-y-1 text-slate-900">
              {/* DOCUMENT CLASSIFICATION & REF NO */}
              <div>
                <h3 className="text-[10pt] font-black text-slate-900 tracking-tight leading-none m-0">
                  {communicationType}
                </h3>
                <p className="text-[8.5pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
              </div>

              {/* TABULAR METADATA BLOCK (COLON-ALIGNED) */}
              <div className="space-y-0.5 pt-0.5 text-[7.2pt]">
                {/* TO ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                    {recipientUnits.slice(0, 8).map((r, i) => (
                      <div key={i} className="leading-tight">
                        {r.name.toUpperCase()}{' '}
                        {r.campus && !r.campus.toLowerCase().includes('main') ? `(${r.campus.toUpperCase()})` : ''}
                      </div>
                    ))}
                    {recipientUnits.length > 8 && (
                      <div className="text-[6.5pt] font-semibold text-slate-600">
                        (+ {recipientUnits.length - 8} other accountable academic &amp; administrative units)
                      </div>
                    )}
                    <div className="text-[7pt] font-semibold normal-case text-slate-600">This University</div>
                  </div>
                </div>

                {/* FROM ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{qmsHead}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Head, Quality Management System (QMS)
                    </span>
                  </div>
                </div>

                {/* NOTED ROW (WHEN includeNoted IS TRUE) */}
                {includeNoted && (
                  <div className="flex items-start">
                    <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                    <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                    <div className="flex-1 font-bold text-slate-900">
                      <span className="uppercase block font-black">{qaoDirector}</span>
                      <span className="text-[6.8pt] font-normal text-slate-700 block">
                        Director, Quality Assurance Office
                      </span>
                    </div>
                  </div>
                )}

                {/* SUBJECT ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">SUBJECT</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900 leading-snug">
                    {statusCategory === 'open'
                      ? 'COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS & ACTION PLAN FOR OVERDUE OPEN CAR(S)'
                      : statusCategory === 'ongoing'
                        ? 'COMPLIANCE DIRECTIVE: IMMEDIATE STATUS COMMITMENT & EVIDENCE SUBMISSION FOR OVERDUE ON-GOING CAR(S)'
                        : statusCategory === 'for_action'
                          ? 'COMPLIANCE DIRECTIVE: IMMEDIATE ACTION & COMPLIANCE ON OVERDUE CORRECTIVE ACTION REQUESTS (CAR)'
                          : statusCategory === 'verification'
                            ? 'COMPLIANCE DIRECTIVE: IMMEDIATE EVIDENCE SUBMISSION FOR CARS PENDING FINAL QUALITY VERIFICATION'
                            : 'COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF ROOT CAUSE ANALYSIS AND CORRECTIVE ACTION PLAN FOR OVERDUE CORRECTIVE ACTION REQUESTS (CAR)'}
                  </div>
                </div>

                {/* DATE ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">DATE</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900">{formattedDate}</div>
                </div>
              </div>

              {/* HORIZONTAL RULE */}
              <hr className="border-t border-slate-900 my-1" />

              {/* MEMORANDUM BODY PARAGRAPHS */}
              <div className="space-y-1 text-justify leading-tight text-[7.2pt] text-slate-900">
                <p className="m-0">
                  In line with the mandatory requirements of <strong>ISO 21001:2018 Clause 10.2</strong>,{' '}
                  <strong>ISO 9001:2015 Clause 10.2</strong>, and the{' '}
                  <strong>
                    Romblon State University Educational Organizations Management System (RSU-EOMS) Manual
                  </strong>
                  , all accountable academic and administrative units are directed to immediately submit their official{' '}
                  <em>Root Cause Analysis (RCA)</em> and <em>Corrective Action Plan (CAP)</em> for nonconformities
                  identified during quality audits.
                </p>

                <p className="m-0">
                  Please be informed that records in the <strong>RSU EOMS Submission Portal</strong> indicate that as of{' '}
                  <strong>{formattedDate}</strong>, your office has{' '}
                  <strong>unresolved Corrective Action Requests (CAR)</strong> whose statutory reply deadlines have
                  elapsed without an approved action plan. The complete inventory of delinquent items and
                  non-conformance statements is detailed in <em>Attachment A</em>.
                </p>

                {customDirective && (
                  <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.5 text-[6.8pt] leading-tight">
                    <strong>Specific Administrative Directive:</strong> {customDirective}
                  </p>
                )}

                <p className="m-0">
                  Accountable Unit Heads, QMS Leads, and Process Owners are hereby instructed to log in to the{' '}
                  <strong>RSU EOMS Submission Portal</strong> (navigate to <em>QA Reports &gt; CAR Registry</em>) and
                  complete the following mandatory response workflow:
                </p>

                <ol className="list-decimal pl-3.5 space-y-0 text-[6.8pt] text-slate-800 leading-tight">
                  <li>
                    <strong>Root Cause Investigation (Section B):</strong> Document the systemic root cause using the
                    5-Whys or Fishbone framework.
                  </li>
                  <li>
                    <strong>Corrective Action Plan (CAP):</strong> Formulate immediate containment and long-term
                    preventive actions with assigned leads and completion milestones.
                  </li>
                  <li>
                    <strong>Submission &amp; Evidence:</strong> Click <em>"Submit Unit Response"</em> to commit updates
                    and upload documentary proofs for QA verification.
                  </li>
                </ol>

                <p className="m-0">
                  Your office is granted a strict compliance window of <strong>{gracePeriodDays} working days</strong>{' '}
                  from receipt of this memorandum. Failure to comply will constrain this Office to:
                </p>

                <ul className="list-disc pl-3.5 space-y-0 text-[6.8pt] text-slate-800 leading-tight">
                  <li>
                    Formally elevate the matter to the <strong>Office of the Vice Presidents</strong> and{' '}
                    <strong>University President</strong> for administrative intervention;
                  </li>
                  <li>
                    Reclassify the items as <strong>Major Systemic Nonconformities</strong> with adverse impact on the
                    unit's Performance-Based Bonus (PBB) and QA compliance ratings.
                  </li>
                </ul>

                <p className="pt-0.5 m-0 font-semibold text-[7pt]">For your strict compliance and guidance.</p>
              </div>

              {/* SIGNATORIES BLOCK */}
              <div className={includeNoted ? 'grid grid-cols-2 gap-4 pt-1.5 text-[7pt]' : 'pt-1.5 text-[7pt]'}>
                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Issued by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {qmsHead}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Head, Quality Management System (QMS)
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
                  </div>
                </div>

                {includeNoted && (
                  <div>
                    <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Noted by:</p>
                    <div className="pt-3">
                      <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                        {qaoDirector}
                      </p>
                      <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                        Director, Quality Assurance Office
                      </p>
                      <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER (FIXED AT THE VERY BOTTOM OF THE PAGE) */}
        <div
          className="memo-footer-banner"
          style={{
            position: 'absolute',
            bottom: '0.25in',
            left: '0.45in',
            right: '0.45in',
            height: '24px',
            background: 'linear-gradient(90deg, #15803d 0%, #16a34a 60%, #ca8a04 88%, #eab308 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontFamily: 'Georgia, Cambria, serif',
              fontSize: '7.5pt',
              fontWeight: 'bold',
              fontStyle: 'italic',
              letterSpacing: '0.04em',
            }}
          >
            Serving with Honor and Excellence!
          </span>
        </div>
      </div>

      {/* ========================================================
          PAGE 2: ATTACHMENT A - SCHEDULE OF OVERDUE ISSUES TABLE
          ======================================================== */}
      <div
        className="memo-attachment-page relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: pageHeight,
          padding: '0.35in 0.45in 0.65in 0.45in',
          boxSizing: 'border-box',
          pageBreakBefore: 'always',
          breakBefore: 'page',
        }}
      >
        <div>
          {/* ATTACHMENT TOP HEADER */}
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
            <div className="flex items-center gap-2.5">
              <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '36px', width: '36px', objectFit: 'contain' }}
              />
              <div>
                <h2 className="text-[10pt] font-black uppercase tracking-tight text-slate-900 leading-none m-0 font-serif">
                  ROMBLON STATE UNIVERSITY
                </h2>
                <h3 className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-800 leading-tight m-0 mt-0.5">
                  QUALITY ASSURANCE OFFICE
                </h3>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">Ref: {generatedRefNo}</span>
              <span className="text-[6.8pt] font-bold text-rose-700 font-mono">
                {totalOverdueCount} Overdue Item{totalOverdueCount !== 1 ? 's' : ''} Listed
              </span>
            </div>
          </div>

          <div className="mb-2">
            <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
              ATTACHMENT A: SCHEDULE OF OVERDUE CORRECTIVE ACTION REQUESTS (CAR)
            </h2>
            <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
              Itemized Inventory of Identified Audit Non-Conformances, Procedures, and Overdue Statuses
            </p>
          </div>

          {/* ATTACHMENT TABLE */}
          {allOverdueItems.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded text-slate-500 italic text-xs">
              No overdue Corrective Action Requests found for this scope.
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-900 text-[7.5pt]">
              <thead>
                <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[7pt]">
                  <th className="border border-slate-900 p-1.5 text-center w-[12%]">CAR No. &amp; Type</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[22%]">Campus &amp; Unit Involved</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[20%]">Procedure / ISO Clause</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[26%]">Finding Description / Issue</th>
                  <th className="border border-slate-900 p-1.5 text-center w-[10%]">Reply Deadline</th>
                  <th className="border border-slate-900 p-1.5 text-center w-[10%]">Status &amp; Delay</th>
                </tr>
              </thead>
              <tbody>
                {allOverdueItems.map((item, idx) => {
                  const { car, daysOverdue, deadlineStr, unitName, campusName } = item;
                  return (
                    <tr key={car.id || idx} className="hover:bg-slate-50">
                      {/* Col 1: CAR No & Audit Type */}
                      <td className="border border-slate-900 p-1 text-center font-mono font-bold text-slate-900">
                        <div className="font-bold text-[7.8pt]">{car.carNumber}</div>
                        <div className="flex flex-col items-center gap-0.5 mt-0.5">
                          <span className="text-[6pt] px-1 py-0.2 rounded bg-slate-200 uppercase font-sans">
                            {car.auditType === 'EQA' ? 'EQA' : 'IQA'}
                          </span>
                          <span
                            className={
                              car.status === 'Open'
                                ? 'text-[6pt] px-1 py-0.2 rounded font-black uppercase bg-amber-100 text-amber-800 border border-amber-300 font-sans'
                                : car.status === 'In Progress'
                                  ? 'text-[6pt] px-1 py-0.2 rounded font-black uppercase bg-blue-100 text-blue-800 border border-blue-300 font-sans'
                                  : car.status === 'Awaiting Response/Update'
                                    ? 'text-[6pt] px-1 py-0.2 rounded font-black uppercase bg-indigo-100 text-indigo-800 border border-indigo-300 font-sans'
                                    : 'text-[6pt] px-1 py-0.2 rounded font-black uppercase bg-slate-100 text-slate-700 border border-slate-300 font-sans'
                            }
                          >
                            {car.status === 'Open'
                              ? 'OPEN'
                              : car.status === 'In Progress'
                                ? 'ONGOING'
                                : car.status === 'Awaiting Response/Update'
                                  ? 'FOR ACTION'
                                  : car.status === 'For Final Verification'
                                    ? 'VERIFICATION'
                                    : car.status}
                          </span>
                        </div>
                      </td>

                      {/* Col 2: Campus & Unit Involved */}
                      <td className="border border-slate-900 p-1">
                        <span className="text-[6.8pt] text-slate-600 font-bold uppercase tracking-wide block">
                          {campusName || 'Main Campus, Odiongan'}
                        </span>
                        <strong className="block text-slate-900 uppercase text-[7.8pt] font-black leading-tight mt-0.5">
                          {unitName || 'Unknown Unit'}
                        </strong>
                        {car.unitHead && (
                          <span className="text-[6.5pt] text-slate-500 italic block mt-0.5">Lead: {car.unitHead}</span>
                        )}
                      </td>

                      {/* Col 3: Procedure / ISO Clause */}
                      <td className="border border-slate-900 p-1">
                        <span className="font-bold text-slate-900 block leading-tight text-[7.2pt]">
                          {car.procedureTitle || 'General Standard Operating Procedure'}
                        </span>
                        <span className="text-[6.5pt] text-slate-600 block mt-0.5">
                          Clause {car.concerningClause || '4.1'} (ISO 21001:2018)
                        </span>
                      </td>

                      {/* Col 4: Finding Description / Issue */}
                      <td className="border border-slate-900 p-1 text-slate-800 leading-snug">
                        <p className="line-clamp-4 m-0 text-[7pt]">
                          {car.descriptionOfNonconformance ||
                            'Non-conformance recorded during quality audit verification.'}
                        </p>
                      </td>

                      {/* Col 5: Reply Deadline */}
                      <td className="border border-slate-900 p-1 text-center font-mono font-bold text-rose-700 text-[7.2pt]">
                        {deadlineStr}
                      </td>

                      {/* Col 6: Status & Delay */}
                      <td className="border border-slate-900 p-1 text-center font-sans">
                        <span className="inline-block px-1 py-0.2 rounded text-[6pt] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                          {daysOverdue > 0 ? `${daysOverdue}D OVERDUE` : 'DUE TODAY'}
                        </span>
                        <span className="block text-[5.8pt] text-slate-500 mt-0.5 font-bold uppercase">
                          {car.status === 'Open'
                            ? 'Initial Response Due'
                            : car.status === 'In Progress'
                              ? 'Action Committed'
                              : 'Update Required'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ATTACHMENT SIGNATORIES */}
          <div
            className={
              includeNoted
                ? 'grid grid-cols-2 gap-6 pt-4 mt-3 text-[7.2pt] border-t border-slate-300'
                : 'pt-4 mt-3 text-[7.2pt] border-t border-slate-300'
            }
          >
            <div>
              <p className="font-bold text-slate-600 uppercase text-[6pt]">Certified Accurate by:</p>
              <div className="pt-3">
                <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt]">
                  {qmsHead}
                </p>
                <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5">Head, Quality Management System (QMS)</p>
              </div>
            </div>

            {includeNoted && (
              <div>
                <p className="font-bold text-slate-600 uppercase text-[6pt]">Approved for Release by:</p>
                <div className="pt-3">
                  <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt]">
                    {qaoDirector}
                  </p>
                  <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5">Director, Quality Assurance Office</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ATTACHMENT FOOTER & GREEN BANNER (FIXED AT THE VERY BOTTOM OF THE PAGE) */}
        <div>
          <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
            <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
            <span className="font-mono font-bold text-slate-800">
              Form Code: RSU-QAO-CAR-MEMO-01 (Attachment A) | Rev. 03
            </span>
          </div>

          <div
            className="memo-footer-banner w-full"
            style={{
              height: '24px',
              background: 'linear-gradient(90deg, #15803d 0%, #16a34a 60%, #ca8a04 88%, #eab308 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <span
              style={{
                color: '#ffffff',
                fontFamily: 'Georgia, Cambria, serif',
                fontSize: '7.5pt',
                fontWeight: 'bold',
                fontStyle: 'italic',
                letterSpacing: '0.04em',
              }}
            >
              Serving with Honor and Excellence!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
