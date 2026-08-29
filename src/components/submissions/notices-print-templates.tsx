'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle2, ShieldCheck, Check } from 'lucide-react';

interface NoticeProps {
  unitName: string;
  campusName: string;
  year: number;
  missingFirst: string[];
  missingFinal: string[];
  totalApproved: number;
  totalPossible: number;
  qaoDirector: string;
  qmsHead: string;
  cycle?: string;
}

interface CampusNoticeProps {
  campusName: string;
  year: number;
  qaoDirector: string;
  qmsHead: string;
  cycle?: string;
  units: {
    name: string;
    score: number;
    approvedCount: number;
    totalPossible: number;
    missingFirst: string[];
    missingFinal: string[];
  }[];
}

/**
 * NOTICE OF NON-COMPLIANCE TEMPLATE (UNIT LEVEL)
 * Official 1-page Folio (8.5 x 13) Memorandum layout with institutional letterhead,
 * left sidebar (Vision, Mission, Policy, Core Values), metadata table, and green-gold footer.
 */
export function NoticeOfNonCompliance({
  unitName,
  campusName,
  year,
  missingFirst,
  missingFinal,
  qaoDirector,
  qmsHead,
}: NoticeProps) {
  const formattedDate = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = `RSU-QAO-NNC-${year}-${format(new Date(), 'MMdd')}`;
  const isFirstCompliant = missingFirst.length === 0;
  const isFinalCompliant = missingFinal.length === 0;

  const directorName = qaoDirector || 'SARAH JANE F. FALLARIA';
  const qmsHeadName = qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';

  return (
    <div
      className="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full"
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="memo-page-1 relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: '13in',
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
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/rsulogo.png"
                alt="RSU Official Seal"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />

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

            <div className="flex items-center pl-2">
              <img
                src="/ISOlogo.jpg"
                alt="ISO 9001:2015 TÜV Rheinland Certified"
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. TWO-COLUMN FOLIO LAYOUT */}
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
                <h3 className="text-[10pt] font-black text-slate-900 tracking-tight leading-none m-0">QA Memorandum</h3>
                <p className="text-[8.5pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
              </div>

              {/* TABULAR METADATA BLOCK */}
              <div className="space-y-0.5 pt-0.5 text-[7.2pt]">
                {/* TO ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                    <div className="leading-tight">THE UNIT HEAD / DEAN / PROGRAM CHAIR, {unitName.toUpperCase()}</div>
                    <div className="text-[7pt] font-semibold normal-case text-slate-600">
                      {campusName.toUpperCase()} — Romblon State University
                    </div>
                  </div>
                </div>

                {/* FROM ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{qmsHeadName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Head, Quality Management System (QMS)
                    </span>
                  </div>
                </div>

                {/* NOTED ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{directorName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Director, Quality Assurance Office
                    </span>
                  </div>
                </div>

                {/* SUBJECT ROW */}
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">SUBJECT</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900 leading-snug">
                    NOTICE OF NON-COMPLIANCE: OUTSTANDING EOMS MANDATORY SUBMISSIONS (AY {year})
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
                  In strict compliance with <strong>ISO 21001:2018 Clause 7.5 (Documented Information)</strong>,{' '}
                  <strong>ISO 9001:2015</strong>, and the{' '}
                  <strong>RSU Educational Organizations Management System (EOMS) Manual</strong>, this Office has
                  conducted a compliance audit for Academic Year <strong>{year}</strong>.
                </p>

                <p className="m-0">
                  Verification records in the <strong>RSU EOMS Digital Submission Portal</strong> reveal that your
                  office has outstanding documentary deficiencies as summarized below:
                </p>

                {/* DEFICIENCY STATUS BOXES */}
                <div className="grid grid-cols-2 gap-2 my-1">
                  <div
                    className={cn(
                      'p-1.5 rounded border text-[6.8pt]',
                      isFirstCompliant ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300',
                    )}
                  >
                    <div className="flex items-center justify-between font-black uppercase text-[7pt] mb-0.5">
                      <span className={isFirstCompliant ? 'text-emerald-800' : 'text-rose-800'}>
                        1st Submission Cycle
                      </span>
                      <span
                        className={cn(
                          'px-1 py-0.2 rounded text-[6pt]',
                          isFirstCompliant ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900',
                        )}
                      >
                        {isFirstCompliant ? 'COMPLIANT' : 'DEFICIENT'}
                      </span>
                    </div>
                    {isFirstCompliant ? (
                      <p className="m-0 text-emerald-700">All mandatory documents submitted and verified.</p>
                    ) : (
                      <ul className="list-disc pl-3.5 m-0 text-rose-900 space-y-0.2">
                        {missingFirst.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div
                    className={cn(
                      'p-1.5 rounded border text-[6.8pt]',
                      isFinalCompliant ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300',
                    )}
                  >
                    <div className="flex items-center justify-between font-black uppercase text-[7pt] mb-0.5">
                      <span className={isFinalCompliant ? 'text-emerald-800' : 'text-rose-800'}>
                        Final Evaluation Cycle
                      </span>
                      <span
                        className={cn(
                          'px-1 py-0.2 rounded text-[6pt]',
                          isFinalCompliant ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900',
                        )}
                      >
                        {isFinalCompliant ? 'COMPLIANT' : 'DEFICIENT'}
                      </span>
                    </div>
                    {isFinalCompliant ? (
                      <p className="m-0 text-emerald-700">All mandatory documents submitted and verified.</p>
                    ) : (
                      <ul className="list-disc pl-3.5 m-0 text-rose-900 space-y-0.2">
                        {missingFinal.map((d, i) => (
                          <li key={i}>{d}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.5 text-[6.8pt] leading-tight">
                  <strong>Specific Directive:</strong> The Unit Head / Program Chair is hereby directed to access the{' '}
                  <strong>RSU EOMS Portal &gt; Submissions Hub</strong>, upload the signed PDF files, and notify the
                  Quality Assurance Office within the compliance window.
                </p>

                <p className="m-0">
                  Your office is granted a strict compliance window of <strong>3 working days</strong> from receipt of
                  this notice. Failure to comply shall constrain this Office to formally elevate the matter to the{' '}
                  <strong>Office of the Vice Presidents</strong> and <strong>University President</strong> for
                  administrative intervention.
                </p>

                <p className="pt-0.5 m-0 font-semibold text-[7pt]">
                  For your immediate compliance and appropriate action.
                </p>
              </div>

              {/* SIGNATORIES BLOCK */}
              <div className="grid grid-cols-2 gap-4 pt-1.5 text-[7pt]">
                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Issued by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {qmsHeadName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Head, Quality Management System (QMS)
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Noted by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {directorName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Director, Quality Assurance Office
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE (UNIT LEVEL)
 * Official 1-page Folio (8.5 x 13) Certificate of Compliance layout.
 */
export function NoticeOfCompliance({
  unitName,
  campusName,
  year,
  totalApproved,
  totalPossible,
  qaoDirector,
  qmsHead,
  cycle,
}: NoticeProps) {
  const formattedDate = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = `RSU-QAO-NOC-${year}-${format(new Date(), 'MMdd')}`;
  const directorName = qaoDirector || 'SARAH JANE F. FALLARIA';
  const qmsHeadName = qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';

  return (
    <div
      className="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full"
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="memo-page-1 relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: '13in',
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
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/rsulogo.png"
                alt="RSU Official Seal"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />

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

            <div className="flex items-center pl-2">
              <img
                src="/ISOlogo.jpg"
                alt="ISO 9001:2015 TÜV Rheinland Certified"
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. TWO-COLUMN FOLIO LAYOUT */}
          <div className="grid grid-cols-12 gap-3.5 items-start">
            {/* LEFT SIDEBAR */}
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

            {/* RIGHT MAIN COLUMN */}
            <div className="col-span-9 space-y-1 text-slate-900">
              <div>
                <h3 className="text-[10pt] font-black text-slate-900 tracking-tight leading-none m-0">
                  QA Notice of Compliance
                </h3>
                <p className="text-[8.5pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
              </div>

              {/* METADATA BLOCK */}
              <div className="space-y-0.5 pt-0.5 text-[7.2pt]">
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                    <div className="leading-tight">THE UNIT HEAD / DEAN / PROGRAM CHAIR, {unitName.toUpperCase()}</div>
                    <div className="text-[7pt] font-semibold normal-case text-slate-600">
                      {campusName.toUpperCase()} — Romblon State University
                    </div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{qmsHeadName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Head, Quality Management System (QMS)
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{directorName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Director, Quality Assurance Office
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">SUBJECT</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900 leading-snug">
                    CERTIFICATE OF COMPLIANCE: EOMS QUALITY DOCUMENTATION PARITY (AY {year})
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">DATE</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900">{formattedDate}</div>
                </div>
              </div>

              <hr className="border-t border-slate-900 my-1" />

              <div className="space-y-1.5 text-justify leading-tight text-[7.2pt] text-slate-900">
                <p className="m-0">
                  This is to officially recognize and commend the <strong>{unitName}</strong> ({campusName}) for having
                  successfully fulfilled all mandatory documentation requirements of the{' '}
                  <strong>Educational Organizations Management System (EOMS)</strong> in strict alignment with{' '}
                  <strong>ISO 21001:2018</strong> and <strong>ISO 9001:2015</strong> standards for Academic Year{' '}
                  <strong>{year}</strong> ({cycle || 'First and Final Cycles'}).
                </p>

                {/* INSTITUTIONAL VERIFICATION BADGE */}
                <div className="border border-emerald-400 bg-emerald-50/60 p-2 rounded-lg flex items-center justify-between my-1">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-800 font-black uppercase text-[7.5pt]">
                      <ShieldCheck className="h-4 w-4 text-emerald-700 inline" />
                      <span>Institutional Verification Ledger</span>
                    </div>
                    <p className="text-[6.8pt] text-emerald-700 font-bold m-0">
                      Quality Documentation Maturity: 100% Verified Compliant
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-900 text-[10pt] block">
                      {totalApproved} / {totalPossible}
                    </span>
                    <span className="text-[5.8pt] uppercase font-bold text-emerald-700">Approved Documents</span>
                  </div>
                </div>

                <p className="m-0">
                  The Quality Assurance Office acknowledges the dedicated efforts of the leadership, faculty, and staff
                  of the <strong>{unitName}</strong> in upholding institutional quality standards and sustaining our
                  commitment to continuous quality improvement.
                </p>

                <p className="pt-0.5 m-0 font-semibold text-[7pt]">
                  Issued for official documentation, quality audit, and accreditation records.
                </p>
              </div>

              {/* SIGNATORIES BLOCK */}
              <div className="grid grid-cols-2 gap-4 pt-2 text-[7pt]">
                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {qmsHeadName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Head, Quality Management System (QMS)
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {directorName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Director, Quality Assurance Office
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (NON-COMPLIANCE)
 * Official 1-page Folio (8.5 x 13) layout for Campus-level notice.
 */
export function CampusNoticeOfNonCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  const formattedDate = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = `RSU-QAO-CNNC-${year}-${format(new Date(), 'MMdd')}`;
  const directorName = qaoDirector || 'SARAH JANE F. FALLARIA';
  const qmsHeadName = qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const nonCompliantUnits = units.filter((u) => u.score < 100);

  return (
    <div
      className="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full"
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="memo-page-1 relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: '13in',
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
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/rsulogo.png"
                alt="RSU Official Seal"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />

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

            <div className="flex items-center pl-2">
              <img
                src="/ISOlogo.jpg"
                alt="ISO 9001:2015 TÜV Rheinland Certified"
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. TWO-COLUMN FOLIO LAYOUT */}
          <div className="grid grid-cols-12 gap-3.5 items-start">
            {/* LEFT SIDEBAR */}
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

            {/* RIGHT MAIN COLUMN */}
            <div className="col-span-9 space-y-1 text-slate-900">
              <div>
                <h3 className="text-[10pt] font-black text-slate-900 tracking-tight leading-none m-0">QA Memorandum</h3>
                <p className="text-[8.5pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
              </div>

              {/* METADATA BLOCK */}
              <div className="space-y-0.5 pt-0.5 text-[7.2pt]">
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                    <div className="leading-tight">THE CAMPUS DIRECTOR, {campusName.toUpperCase()}</div>
                    <div className="text-[7pt] font-semibold normal-case text-slate-600">Romblon State University</div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{qmsHeadName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Head, Quality Management System (QMS)
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{directorName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Director, Quality Assurance Office
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">SUBJECT</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900 leading-snug">
                    CAMPUS COMPLIANCE DIRECTIVE: DEFICIENT EOMS SUBMISSIONS AUDIT (AY {year})
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">DATE</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900">{formattedDate}</div>
                </div>
              </div>

              <hr className="border-t border-slate-900 my-1" />

              <div className="space-y-1 text-justify leading-tight text-[7.2pt] text-slate-900">
                <p className="m-0">
                  Transmitted herewith is the official compliance evaluation for <strong>{campusName}</strong> for
                  Academic Year <strong>{year}</strong> based on recorded submissions in the{' '}
                  <strong>RSU EOMS Digital Portal</strong>.
                </p>

                <p className="m-0">
                  The following operating units under your campus jurisdiction currently have outstanding EOMS
                  documentary deficiencies:
                </p>

                {/* NON-COMPLIANT UNITS TABLE */}
                <table className="w-full border-collapse border border-slate-900 text-[6.5pt] my-1">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 font-bold uppercase">
                      <th className="border border-slate-900 p-1 text-left">Unit / Department</th>
                      <th className="border border-slate-900 p-1 text-center w-20">Maturity Score</th>
                      <th className="border border-slate-900 p-1 text-center w-28">Approved / Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nonCompliantUnits.map((u, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="border border-slate-900 p-1 font-bold">{u.name}</td>
                        <td className="border border-slate-900 p-1 text-center font-mono font-black text-rose-700">
                          {u.score.toFixed(0)}%
                        </td>
                        <td className="border border-slate-900 p-1 text-center font-mono font-bold">
                          {u.approvedCount} / {u.totalPossible}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.5 text-[6.8pt] leading-tight">
                  <strong>Specific Directive:</strong> Campus Directors are directed to convene an immediate
                  coordination meeting with the heads of the delinquent units listed above to ensure complete document
                  uploads within <strong>3 working days</strong>.
                </p>

                <p className="pt-0.5 m-0 font-semibold text-[7pt]">For your prompt guidance and strict compliance.</p>
              </div>

              {/* SIGNATORIES BLOCK */}
              <div className="grid grid-cols-2 gap-4 pt-1.5 text-[7pt]">
                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Issued by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {qmsHeadName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Head, Quality Management System (QMS)
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Noted by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {directorName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Director, Quality Assurance Office
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
    </div>
  );
}

/**
 * MISSING / NO SUBMISSIONS MATRIX (INSTITUTIONAL / PER SITE)
 * Prints a matrix of units with outstanding EOMS documents grouped per
 * campus/site. Columns: Site/Campus; Unit; Documents; Status.
 */
export type MissingSubmissionRow = {
  campusName: string;
  unitName: string;
  documents: string[];
  cycle: string;
};

export function MissingSubmissionsReport({
  year,
  cycleLabel,
  qaoDirector,
  qmsHead,
  rows,
  communicationType = 'QA Memorandum',
  includeNoted = true,
  memoRefNo,
  memoDate,
  gracePeriodDays = 5,
  customDirective,
  targetScope = 'all',
  targetCampusName,
  targetUnitName,
  paperSize = 'folio',
}: {
  year: number;
  cycleLabel?: string;
  qaoDirector: string;
  qmsHead: string;
  rows: MissingSubmissionRow[];
  communicationType?: string;
  includeNoted?: boolean;
  memoRefNo?: string;
  memoDate?: string;
  gracePeriodDays?: number;
  customDirective?: string;
  targetScope?: 'all' | 'campus' | 'unit';
  targetCampusName?: string;
  targetUnitName?: string;
  paperSize?: 'folio' | 'letter' | 'a4';
}) {
  const parsedDate = memoDate ? new Date(memoDate) : new Date();
  const formattedDate = format(isNaN(parsedDate.getTime()) ? new Date() : parsedDate, 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = memoRefNo
    ? memoRefNo.startsWith('RSU-QAO-')
      ? memoRefNo
      : `RSU-QAO-MIS-${memoRefNo}`
    : `RSU-QAO-MIS-${year}-${format(new Date(), 'MMdd')}`;
  const totalMissingCount = rows.reduce((acc, r) => acc + r.documents.length, 0);
  const isReportOnly = communicationType === 'Report Only';
  const pageHeight = paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in';

  let recipientLine = 'ALL CONCERNED CAMPUS DIRECTORS, DEANS, PROGRAM CHAIRS, AND HEADS OF ACCOUNTABLE UNITS';
  let recipientSubline = 'This University';

  if (targetScope === 'unit' && targetUnitName) {
    recipientLine = `THE UNIT HEAD / DEAN / PROGRAM CHAIR, ${targetUnitName.toUpperCase()}`;
    recipientSubline = targetCampusName ? targetCampusName.toUpperCase() : 'This University';
  } else if (targetScope === 'campus' && targetCampusName && targetCampusName !== 'All Campuses (University-Wide)') {
    recipientLine = `THE CAMPUS DIRECTOR, DEANS, AND HEADS OF ACCOUNTABLE UNITS`;
    recipientSubline = targetCampusName.toUpperCase();
  }

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
      {!isReportOnly && (
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
                <img
                  src="/rsulogo.png"
                  alt="RSU Official Seal"
                  style={{ height: '38px', width: '38px', objectFit: 'contain' }}
                />
                <img
                  src="/qa_logo.png"
                  alt="QAO Emblem"
                  style={{ height: '38px', width: '38px', objectFit: 'contain' }}
                />

                <div>
                  <h1 className="text-[11pt] font-black uppercase tracking-tight text-slate-900 leading-none m-0 font-serif">
                    ROMBLON STATE UNIVERSITY
                  </h1>
                  <h2 className="text-[8pt] font-bold uppercase tracking-wider text-slate-800 leading-tight m-0 mt-0.5">
                    QUALITY ASSURANCE OFFICE
                  </h2>
                  <p className="text-[5.5pt] text-slate-600 leading-tight m-0 mt-0.5">
                    3/F Multi-Purpose Building, RSU-Main Campus, Liwanag, Odiongan, Romblon 5505
                    <br />
                    Telephone: (042) 567-2201 | Email: qao@rsu.edu.ph | Website: rsu.edu.ph
                  </p>
                </div>
              </div>

              <div className="flex items-center pl-2">
                <img
                  src="/ISOlogo.jpg"
                  alt="ISO 9001:2015 TÜV Rheinland Certified"
                  style={{ height: '36px', width: 'auto', objectFit: 'contain' }}
                />
              </div>
            </div>

            {/* 2. TWO-COLUMN FOLIO LAYOUT */}
            <div className="grid grid-cols-12 gap-3 items-start">
              {/* LEFT SIDEBAR: RSU VISION, MISSION, QUALITY POLICY, CORE VALUES */}
              <div
                className="col-span-3 text-[5.2pt] text-slate-500 italic leading-[1.15] space-y-1 select-none pr-1.5"
                style={{ fontFamily: 'Georgia, Cambria, serif' }}
              >
                <div>
                  <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">RSU Vision</strong>
                  <p className="m-0 text-justify leading-[1.15]">
                    A research-based academic institution committed to excellence and service in nurturing globally
                    competitive workforce towards sustainable development.
                  </p>
                </div>

                <div>
                  <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">RSU Mission</strong>
                  <p className="m-0 text-justify leading-[1.15]">
                    Romblon State University shall nurture an academic environment that provides advanced education,
                    higher technological and professional instruction and technical expertise in agriculture and
                    fisheries, forestry, engineering and technology, education, humanities, sciences and other relevant
                    fields of study and collaborate with other institutions and communities through responsive, relevant
                    and research-based extension services.
                  </p>
                </div>

                <div>
                  <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">
                    RSU Quality Policy
                  </strong>
                  <p className="m-0 text-justify leading-[1.15]">
                    Romblon State University commits to provide higher education through quality instruction, research,
                    production, and community-based extension services that meet or exceed the requirements and
                    expectations of the university's stakeholders. It will comply with international standards,
                    applicable statutory and regulatory requirements, and continually improve the Quality Management
                    System's effectiveness through periodic monitoring and evaluation toward sustained remarkable
                    outcomes.
                  </p>
                </div>

                <div>
                  <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">
                    RSU Core Values
                  </strong>
                  <div className="space-y-0 pl-1 text-[5pt] leading-[1.15]">
                    <div>Stewardship</div>
                    <div>Competence</div>
                    <div>Resilience</div>
                    <div>Integrity</div>
                    <div>Balance</div>
                    <div>Excellence</div>
                    <div>Service</div>
                  </div>
                  <p className="m-0 mt-0.2 text-[4.8pt] text-slate-400 text-justify leading-[1.1]">
                    These Core Values serve as our guiding principle in our efforts to make ROMBLON STATE UNIVERSITY a
                    recognized HEI in the region and beyond.
                  </p>
                </div>
              </div>

              {/* RIGHT MAIN COLUMN: MEMORANDUM HEADER & NARRATIVE */}
              <div className="col-span-9 space-y-0.5 text-slate-900">
                {/* DOCUMENT CLASSIFICATION & REF NO */}
                <div>
                  <h3 className="text-[9.5pt] font-black text-slate-900 tracking-tight leading-none m-0">
                    {communicationType}
                  </h3>
                  <p className="text-[8pt] font-bold font-mono text-slate-900 m-0 mt-0.2">{generatedRefNo}</p>
                </div>

                {/* TABULAR METADATA BLOCK (COLON-ALIGNED) */}
                <div className="space-y-0.5 pt-0.2 text-[7pt]">
                  {/* TO ROW */}
                  <div className="flex items-start">
                    <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                    <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                    <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                      <div className="leading-tight">{recipientLine}</div>
                      <div className="text-[6.8pt] font-semibold normal-case text-slate-600">{recipientSubline}</div>
                    </div>
                  </div>

                  {/* FROM ROW */}
                  <div className="flex items-start">
                    <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                    <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                    <div className="flex-1 font-bold text-slate-900">
                      <span className="uppercase block font-black">{qmsHead}</span>
                      <span className="text-[6.5pt] font-normal text-slate-700 block">
                        Head, Quality Management System (QMS)
                      </span>
                    </div>
                  </div>

                  {/* NOTED ROW */}
                  {includeNoted && (
                    <div className="flex items-start">
                      <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                      <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                      <div className="flex-1 font-bold text-slate-900">
                        <span className="uppercase block font-black">{qaoDirector}</span>
                        <span className="text-[6.5pt] font-normal text-slate-700 block">
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
                      COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF OUTSTANDING EOMS DOCUMENTATION REQUIREMENTS (AY{' '}
                      {year}
                      {cycleLabel ? ` — ${cycleLabel.toUpperCase()}` : ''})
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
                <hr className="border-t border-slate-900 my-0.5" />

                {/* MEMORANDUM BODY PARAGRAPHS */}
                <div className="space-y-0.5 text-justify leading-tight text-[7pt] text-slate-900">
                  <p className="m-0">
                    In accordance with the mandatory requirements of <strong>ISO 21001:2018 (EOMS)</strong>,{' '}
                    <strong>ISO 9001:2015</strong>, and the{' '}
                    <strong>
                      Romblon State University Educational Organizations Management System (RSU-EOMS) Manual
                    </strong>
                    , all academic and administrative operating units across all campuses are required to maintain
                    current and approved quality documentation.
                  </p>

                  <p className="m-0">
                    Official verification records in the <strong>RSU EOMS Submission Portal</strong> indicate that as of{' '}
                    <strong>{formattedDate}</strong>, several academic and administrative units have{' '}
                    <strong>outstanding / unsubmitted quality management documents</strong> for Academic Year{' '}
                    <strong>{year}</strong>
                    {cycleLabel ? ` (${cycleLabel})` : ''}. The complete inventory of delinquent units and missing
                    documents is detailed in <em>Attachment A</em>.
                  </p>

                  <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.2 text-[6.5pt] leading-tight">
                    <strong>Specific Directive:</strong>{' '}
                    {customDirective ||
                      'Accountable Unit Heads, Program Chairs, and Campus Leads are directed to convene their respective QMS teams and upload all completed document requirements into the RSU EOMS Submission Portal without further delay.'}
                  </p>

                  <p className="m-0">To complete your submission, please follow the standard portal workflow:</p>

                  <ol className="list-decimal pl-3.5 space-y-0 text-[6.5pt] text-slate-800 leading-tight">
                    <li>
                      <strong>Access the Portal:</strong> Log in to the <strong>RSU EOMS Submission Portal</strong> and
                      navigate to <em>Submissions &gt; Campus / Unit Matrix</em>.
                    </li>
                    <li>
                      <strong>Upload Documents:</strong> Select your unit, choose the required report type (e.g. Risk
                      and Opportunity Registry, Operational Plan, Work Instructions), and attach the signed PDF
                      document.
                    </li>
                    <li>
                      <strong>Submit for QA Review:</strong> Click <em>"Submit Document"</em> to forward the file to the
                      Quality Assurance Office for formal audit verification.
                    </li>
                  </ol>

                  <p className="m-0">
                    All concerned units are granted a strict compliance window of{' '}
                    <strong>{gracePeriodDays} working days</strong> from receipt of this directive. Failure to comply
                    shall constrain this Office to formally elevate the matter to the{' '}
                    <strong>Office of the Vice Presidents</strong> and <strong>University President</strong> for
                    administrative intervention.
                  </p>

                  <p className="pt-0.2 m-0 font-semibold text-[6.8pt]">For your strict compliance and guidance.</p>
                </div>

                {/* SIGNATORIES BLOCK */}
                <div className={includeNoted ? 'grid grid-cols-2 gap-4 pt-1 text-[6.8pt]' : 'pt-1 text-[6.8pt]'}>
                  <div>
                    <p className="font-bold text-slate-600 uppercase text-[5.8pt] m-0">Issued by:</p>
                    <div className="pt-2">
                      <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7pt] m-0">
                        {qmsHead}
                      </p>
                      <p className="text-[6.2pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                        Head, Quality Management System (QMS)
                      </p>
                      <p className="text-[5.5pt] text-slate-500 m-0 leading-tight">
                        Lead Internal Quality Auditor, RSU
                      </p>
                    </div>
                  </div>

                  {includeNoted && (
                    <div>
                      <p className="font-bold text-slate-600 uppercase text-[5.8pt] m-0">Noted by:</p>
                      <div className="pt-2">
                        <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7pt] m-0">
                          {qaoDirector}
                        </p>
                        <p className="text-[6.2pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                          Director, Quality Assurance Office
                        </p>
                        <p className="text-[5.5pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
      )}

      {/* ========================================================
          PAGE 2+: ATTACHMENT A - SCHEDULE OF OUTSTANDING SUBMISSIONS TABLE
          ======================================================== */}
      <div
        className="memo-attachment-page relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: pageHeight,
          padding: '0.35in 0.45in 0.65in 0.45in',
          boxSizing: 'border-box',
          pageBreakBefore: isReportOnly ? 'auto' : 'always',
          breakBefore: isReportOnly ? 'auto' : 'page',
          position: 'relative',
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
              {!isReportOnly && (
                <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">Ref: {generatedRefNo}</span>
              )}
              <span className="text-[7pt] font-bold text-slate-700 block">Date Printed/Updated: {formattedDate}</span>
              <span className="text-[6.8pt] font-bold text-rose-700 font-mono block">
                {totalMissingCount} Missing Document Item{totalMissingCount !== 1 ? 's' : ''} Listed
              </span>
            </div>
          </div>

          <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
            <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
              {isReportOnly ? '' : 'ATTACHMENT A: '}SCHEDULE OF OUTSTANDING EOMS DOCUMENTATION SUBMISSIONS
            </h2>
            <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
              Itemized Inventory of Accountable Units and Delinquent EOMS Documentation Requirements (AY {year}
              {cycleLabel ? ` — ${cycleLabel}` : ''})
            </p>
            {isReportOnly && (
              <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
                <span>
                  <strong>SITE/CAMPUS:</strong>{' '}
                  {targetCampusName && targetCampusName !== 'All Campuses (University-Wide)'
                    ? targetCampusName
                    : 'All Campuses (University-Wide)'}
                </span>
                <span className="text-slate-400">•</span>
                <span>
                  <strong>UNIT:</strong>{' '}
                  {targetScope === 'unit' && targetUnitName ? targetUnitName : 'All Accountable Units'}
                </span>
              </div>
            )}
          </div>

          {/* ATTACHMENT TABLE */}
          {rows.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded text-slate-500 italic text-xs">
              No outstanding submissions recorded. All units are fully compliant for Academic Year {year}.
            </div>
          ) : (
            <table className="w-full border-collapse border border-slate-900 text-[7.5pt]">
              <thead>
                <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[7pt]">
                  <th className="border border-slate-900 p-1.5 text-center w-[5%]">#</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[25%]">Site / Campus</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[28%]">Accountable Unit</th>
                  <th className="border border-slate-900 p-1.5 text-left w-[30%]">Required Document(s) &amp; Cycle</th>
                  <th className="border border-slate-900 p-1.5 text-center w-[12%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="border border-slate-900 p-1 text-center font-bold text-slate-600">{idx + 1}</td>
                    <td className="border border-slate-900 p-1 font-bold text-slate-900 uppercase">{row.campusName}</td>
                    <td className="border border-slate-900 p-1 font-bold text-slate-900 uppercase">{row.unitName}</td>
                    <td className="border border-slate-900 p-1 text-slate-800">
                      <ul className="list-disc pl-3.5 space-y-0.5 m-0 text-[7pt]">
                        {row.documents.map((doc, i) => (
                          <li key={i}>
                            <strong>{doc}</strong>{' '}
                            <span className="text-slate-500 italic text-[6.5pt]">({row.cycle})</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="border border-slate-900 p-1 text-center font-sans">
                      <span className="inline-block px-1.5 py-0.2 rounded text-[6pt] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
                        NOT SUBMITTED
                      </span>
                    </td>
                  </tr>
                ))}
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

        {/* ATTACHMENT FOOTER & GREEN BANNER */}
        <div>
          <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
            <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
            <span className="font-mono font-bold text-slate-800">
              Form Code: RSU-QAO-EOMS-MIS-01 (Attachment A) | Rev. 03
            </span>
          </div>

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
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (COMPLIANCE)
 * Official 1-page Folio (8.5 x 13) layout for Campus-level Notice of Compliance.
 */
export function CampusNoticeOfCompliance({ campusName, year, qaoDirector, qmsHead, units, cycle }: CampusNoticeProps) {
  const formattedDate = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = `RSU-QAO-CNOC-${year}-${format(new Date(), 'MMdd')}`;
  const directorName = qaoDirector || 'SARAH JANE F. FALLARIA';
  const qmsHeadName = qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';

  return (
    <div
      className="memo-root-document text-black bg-white mx-auto print:p-0 print:max-w-full"
      style={{
        width: '8.5in',
        boxSizing: 'border-box',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        className="memo-page-1 relative flex flex-col justify-between"
        style={{
          width: '8.5in',
          minHeight: '13in',
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
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2">
            <div className="flex items-center gap-2.5">
              <img
                src="/rsulogo.png"
                alt="RSU Official Seal"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />
              <img
                src="/qa_logo.png"
                alt="QAO Emblem"
                style={{ height: '42px', width: '42px', objectFit: 'contain' }}
              />

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

            <div className="flex items-center pl-2">
              <img
                src="/ISOlogo.jpg"
                alt="ISO 9001:2015 TÜV Rheinland Certified"
                style={{ height: '38px', width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* 2. TWO-COLUMN FOLIO LAYOUT */}
          <div className="grid grid-cols-12 gap-3.5 items-start">
            {/* LEFT SIDEBAR */}
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

            {/* RIGHT MAIN COLUMN */}
            <div className="col-span-9 space-y-1 text-slate-900">
              <div>
                <h3 className="text-[10pt] font-black text-slate-900 tracking-tight leading-none m-0">
                  QA Notice of Compliance
                </h3>
                <p className="text-[8.5pt] font-bold font-mono text-slate-900 m-0 mt-0.5">{generatedRefNo}</p>
              </div>

              {/* METADATA BLOCK */}
              <div className="space-y-0.5 pt-0.5 text-[7.2pt]">
                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">TO</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold uppercase text-slate-900 space-y-0">
                    <div className="leading-tight">THE CAMPUS DIRECTOR, {campusName.toUpperCase()}</div>
                    <div className="text-[7pt] font-semibold normal-case text-slate-600">Romblon State University</div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">FROM</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{qmsHeadName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Head, Quality Management System (QMS)
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">NOTED</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-bold text-slate-900">
                    <span className="uppercase block font-black">{directorName}</span>
                    <span className="text-[6.8pt] font-normal text-slate-700 block">
                      Director, Quality Assurance Office
                    </span>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">SUBJECT</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900 leading-snug">
                    CAMPUS COMPLIANCE CERTIFICATE: 100% EOMS QUALITY PARITY (AY {year})
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-14 font-bold uppercase text-slate-900 shrink-0">DATE</div>
                  <div className="w-3 text-center font-bold text-slate-900 shrink-0">:</div>
                  <div className="flex-1 font-black uppercase text-slate-900">{formattedDate}</div>
                </div>
              </div>

              <hr className="border-t border-slate-900 my-1" />

              <div className="space-y-1.5 text-justify leading-tight text-[7.2pt] text-slate-900">
                <p className="m-0">
                  The Quality Assurance Office officially confers this{' '}
                  <strong>Institutional Notice of Compliance</strong> upon <strong>{campusName}</strong> for achieving{' '}
                  <strong>100% Quality Documentation Parity</strong> across all assigned academic departments and
                  operating units for Academic Year <strong>{year}</strong> ({cycle || 'First & Final Cycles'}).
                </p>

                {/* SITE MATURITY INDEX BOX */}
                <div className="border border-emerald-400 bg-emerald-50/60 p-2 rounded-lg flex items-center justify-between my-1">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-800 font-black uppercase text-[7.5pt]">
                      <ShieldCheck className="h-4 w-4 text-emerald-700 inline" />
                      <span>Campus Quality Documentation Performance</span>
                    </div>
                    <p className="text-[6.8pt] text-emerald-700 font-bold m-0">
                      ISO 21001:2018 &amp; ISO 9001:2015 Standards Verified
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-900 text-[11pt] block">100.0%</span>
                    <span className="text-[5.8pt] uppercase font-bold text-emerald-700">Campus Maturity</span>
                  </div>
                </div>

                <p className="m-0">
                  This achievement demonstrates exemplary leadership, administrative diligence, and strong quality
                  culture. All documentation has been formally recorded in the institutional quality repository.
                </p>

                <p className="pt-0.5 m-0 font-semibold text-[7pt]">
                  Issued for official institutional recognition and quality records.
                </p>
              </div>

              {/* SIGNATORIES BLOCK */}
              <div className="grid grid-cols-2 gap-4 pt-2 text-[7pt]">
                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {qmsHeadName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Head, Quality Management System (QMS)
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
                  </div>
                </div>

                <div>
                  <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved by:</p>
                  <div className="pt-3">
                    <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[140px] text-[7.2pt] m-0">
                      {directorName}
                    </p>
                    <p className="text-[6.5pt] text-slate-800 font-bold mt-0.5 m-0 leading-tight">
                      Director, Quality Assurance Office
                    </p>
                    <p className="text-[5.8pt] text-slate-500 m-0 leading-tight">Romblon State University</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
    </div>
  );
}
