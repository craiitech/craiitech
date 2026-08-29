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
 * Optimized for Folio (8.5 x 13) with 11pt typography and single spacing.
 * Aligns Unit Name and Campus under the FOR: label.
 * Signatories: Name on first line, Title on second line, no solid line.
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
  const isPresident = unitName.toLowerCase().includes('president');
  const isVP = unitName.toLowerCase().includes('vice president');

  let designationLine = 'THE UNIT HEAD / DIRECTOR / DEAN / PROGRAM CHAIR';
  let unitLine = unitName.toUpperCase();
  const campusLine = campusName.toUpperCase();
  let thruLine: string | null = null;

  if (isPresident) {
    designationLine = 'THE UNIVERSITY PRESIDENT';
    unitLine = 'OFFICE OF THE UNIVERSITY PRESIDENT';
  } else if (isVP) {
    designationLine = 'THE VICE PRESIDENT';
    unitLine = unitName.toUpperCase();
  } else if (!campusName.toLowerCase().includes('main campus')) {
    thruLine = `THE CAMPUS DIRECTOR, ${campusName.toUpperCase()}`;
  }

  const isFirstCompliant = missingFirst.length === 0;

  return (
    <div
      className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight"
      style={{ fontSize: '11pt' }}
    >
      {/* Institutional Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <div className="space-y-1">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>
            Quality Assurance Office
          </h2>
          <p className="text-[9pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="space-y-0.5">
          <p className="font-bold uppercase">MEMORANDUM</p>
          <p className="text-[9pt] font-mono">
            Ref No: RSU-QAO-NNC-{year}-{format(new Date(), 'MMdd')}
          </p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-3 mb-10">
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-1 font-bold uppercase">FOR:</span>
          <div className="col-span-11 space-y-0.5">
            <p className="font-bold uppercase">{designationLine}</p>
            <p className="font-bold uppercase">{unitLine}</p>
            <p className="font-bold uppercase">{campusLine}</p>
          </div>
        </div>

        {thruLine && (
          <div className="grid grid-cols-12 gap-2">
            <span className="col-span-1 font-bold uppercase">THRU:</span>
            <span className="col-span-11 font-bold uppercase">{thruLine}</span>
          </div>
        )}

        <div className="border-b border-black pb-2" />

        <div className="grid grid-cols-12 gap-2 pt-2">
          <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
          <span className="col-span-10 font-black uppercase underline decoration-2 underline-offset-4">
            NOTICE OF NON-COMPLIANCE (EOMS DOCUMENTATION)
          </span>
        </div>
      </div>

      <div className="space-y-6 text-justify">
        <p>
          This is to formally inform your office that as of <strong>{format(new Date(), 'MMMM do, yyyy')}</strong>, the
          <strong> {unitName}</strong> has failed to complete the mandatory documentation requirements for the
          Educational Organizations Management System (EOMS) aligned with ISO 21001:2018 for the Academic Year{' '}
          <strong>{year}</strong>.
        </p>

        <p>Upon verification through the RSU EOMS Portal, the current audit status for your unit is as follows:</p>

        <div className="space-y-4 py-2">
          {isFirstCompliant ? (
            <div className="border border-green-600 p-4 bg-green-50/30 flex items-center justify-between rounded-lg">
              <div className="space-y-0.5">
                <p className="font-black text-green-700 uppercase" style={{ fontSize: '9pt' }}>
                  I. FIRST SUBMISSION CYCLE:
                </p>
                <p className="font-bold text-green-600">FULLY COMPLIANT</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          ) : (
            <div className="border border-black p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
              <p className="font-bold uppercase mb-2 text-primary" style={{ fontSize: '9pt' }}>
                I. FIRST SUBMISSION CYCLE (OUTSTANDING):
              </p>
              <ul className="list-disc pl-8 space-y-1">
                {missingFirst.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          )}

          {missingFinal.length > 0 ? (
            <div className="border border-black p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
              <p className="font-bold uppercase mb-2 text-primary" style={{ fontSize: '9pt' }}>
                II. FINAL SUBMISSION CYCLE (OUTSTANDING):
              </p>
              <ul className="list-disc pl-8 space-y-1">
                {missingFinal.map((doc, i) => (
                  <li key={i}>{doc}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="border border-green-600 p-4 bg-green-50/30 flex items-center justify-between rounded-lg">
              <div className="space-y-0.5">
                <p className="font-black text-green-700 uppercase" style={{ fontSize: '9pt' }}>
                  II. FINAL SUBMISSION CYCLE:
                </p>
                <p className="font-bold text-green-600">FULLY COMPLIANT</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          )}
        </div>

        <p>
          Please be reminded that full compliance with documentation cycles is critical for institutional quality audits
          and the maintenance of our ISO certification. You are hereby directed to upload the corrected documents to
          your designated Google Drive folders and notify the Quality Assurance Office within{' '}
          <strong>three (3) working days</strong>
          from receipt of this notice.
        </p>

        <p>For your immediate compliance and appropriate action.</p>
      </div>

      {/* SIGNATORIES BLOCK - Name on 1st line, Title on 2nd line, no solid line */}
      <div className="mt-20 space-y-8">
        <div className="w-full text-left">
          <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
            {qmsHead}
          </p>
          <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
            HEAD, QUALITY MANAGEMENT SYSTEM UNIT
          </p>
        </div>

        <div className="space-y-4 text-left">
          <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
          <div className="w-full">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
              {qaoDirector}
            </p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
              DIRECTOR, QUALITY ASSURANCE OFFICE
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-900 dark:text-slate-100">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[9pt] text-slate-400 font-bold italic">
        <span>RSU-QAO-FOR-022 | Rev 02-2025</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE (UNIT LEVEL)
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
  return (
    <div
      className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight border-[12px] border-double border-slate-200 dark:border-slate-700"
      style={{ fontSize: '11pt' }}
    >
      <div className="border border-slate-800 p-10 min-h-[11in] flex flex-col">
        {/* Institutional Header */}
        <div className="text-center pb-6 mb-12 border-b border-slate-100 dark:border-slate-700">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>
            Quality Assurance Office
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-10 flex-1">
          <div className="flex justify-center">
            <ShieldCheck className="h-20 w-24 text-emerald-600" />
          </div>

          <div className="space-y-3">
            <h2
              className="font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100"
              style={{ fontSize: '24pt' }}
            >
              Notice of Compliance
            </h2>
            {cycle && (
              <p className="font-mono font-black text-xs uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full w-fit mx-auto border border-emerald-100">
                {cycle}
              </p>
            )}
          </div>

          <p className="text-lg italic text-slate-600 dark:text-slate-400">This is to officially certify that the</p>

          <div className="py-4">
            <h3
              className="font-black uppercase text-primary underline underline-offset-4 decoration-slate-300"
              style={{ fontSize: '20pt' }}
            >
              {unitName}
            </h3>
            <p
              className="font-bold text-slate-700 dark:text-slate-300 mt-3 uppercase tracking-widest"
              style={{ fontSize: '12pt' }}
            >
              {campusName}
            </p>
          </div>

          <p className="max-w-xl mx-auto text-base leading-relaxed">
            has successfully completed and fulfilled all mandatory documentation requirements for the
            <strong> Educational Organizations Management System (EOMS)</strong> compliant with
            <strong> ISO 21001:2018</strong> standards for the{' '}
            <span className="font-bold underline">{cycle || 'First and Final'} Submission Cycle(s)</span> for the
            Academic Year <strong>{year}</strong>.
          </p>

          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl max-w-sm mx-auto shadow-sm space-y-4">
            <div className="border-b border-emerald-200 pb-2">
              <p className="text-[10pt] font-black uppercase tracking-widest text-emerald-700 mb-1">
                Institutional Verification Ledger
              </p>
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <span className="text-xl font-black text-emerald-800">
                  {totalApproved} / {totalPossible} Approved Records
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500 pt-8">
            Issued this <strong>{format(new Date(), 'do')}</strong> day of <strong>{format(new Date(), 'MMMM')}</strong>
            ,<strong> {format(new Date(), 'yyyy')}</strong>.
          </p>
        </div>

        {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
        <div className="mt-20 space-y-8 text-left">
          <div className="w-full">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
              {qmsHead}
            </p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
              HEAD, QUALITY MANAGEMENT SYSTEM UNIT
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
            <div className="w-full">
              <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
                {qaoDirector}
              </p>
              <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
                DIRECTOR, QUALITY ASSURANCE OFFICE
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[9pt] font-bold italic text-slate-500">
          This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-6 flex justify-between items-end text-[9pt] text-slate-400 uppercase font-bold tracking-tighter">
          <div className="flex flex-col space-y-0.5">
            <span>
              Verification Code: VER-{year}-{format(new Date(), 'HHmm')}
            </span>
            <span>RSU-QAO-FOR-023 | REV 01-2025</span>
          </div>
          <div className="text-right">
            <p>Institutional Excellence Record</p>
            <p>Issued by RSU EOMS Digital Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (NON-COMPLIANCE)
 */
export function CampusNoticeOfNonCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  const nonCompliantUnits = units.filter((u) => u.score < 100);

  return (
    <div
      className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight"
      style={{ fontSize: '11pt' }}
    >
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <div className="space-y-1">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>
            Quality Assurance Office
          </h2>
          <p className="text-[9pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="space-y-0.5">
          <p className="font-bold uppercase">MEMORANDUM</p>
          <p className="text-[9pt] font-mono">
            Ref No: RSU-QAO-CNNC-{year}-{format(new Date(), 'MMdd')}
          </p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-12 gap-2">
          <span className="col-span-1 font-bold uppercase">FOR:</span>
          <div className="col-span-11 space-y-0.5">
            <p className="font-black uppercase" style={{ fontSize: '12pt' }}>
              THE CAMPUS DIRECTOR
            </p>
            <p className="font-black uppercase" style={{ fontSize: '12pt' }}>
              {campusName}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2 pt-2 border-t border-black mt-2">
          <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
          <span className="col-span-10 font-black uppercase underline decoration-2 underline-offset-4">
            CONSOLIDATED EOMS COMPLIANCE STATUS REPORT
          </span>
        </div>
      </div>

      <div className="space-y-6 text-justify">
        <p>
          Respectfully submitted herewith is the <strong>Consolidated Compliance Status Report</strong> for the
          <strong> {campusName}</strong> Academic Year <strong>{year}</strong>, as verified through the RSU EOMS Digital
          Submission and Monitoring Portal.
        </p>

        <div className="space-y-8">
          {nonCompliantUnits.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-black text-[10pt] uppercase bg-slate-100 dark:bg-slate-700 p-2 border-l-[4px] border-black">
                I. UNITS WITH OUTSTANDING REQUIREMENTS (NON-COMPLIANT)
              </h3>
              <div className="space-y-4">
                {nonCompliantUnits.map((unit, idx) => (
                  <div key={idx} className="border border-black/20 p-4 rounded-lg bg-slate-50/30 dark:bg-slate-800/30">
                    <div className="flex justify-between items-center mb-2">
                      <p className="font-black text-sm uppercase">{unit.name}</p>
                      <span className="font-black bg-white border border-black px-3 py-0.5 rounded text-[10pt]">
                        {unit.score}% MATURITY
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <p>
          Campus Directors are urged to coordinate with the non-compliant units identified above to expedite the
          completion of their documentation requirements.
        </p>
      </div>

      {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
      <div className="mt-20 space-y-8 text-left">
        <div className="w-full">
          <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
            {qmsHead}
          </p>
          <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
            HEAD, QUALITY MANAGEMENT SYSTEM UNIT
          </p>
        </div>

        <div className="space-y-4">
          <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
          <div className="w-full">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
              {qaoDirector}
            </p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
              DIRECTOR, QUALITY ASSURANCE OFFICE
            </p>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-900 dark:text-slate-100">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[9pt] text-slate-400 font-bold italic">
        <span>RSU-QAO-FOR-024 | REV 01-2025</span>
        <span>Issued via RSU EOMS Portal</span>
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
  paperSize = 'folio',
}: {
  year: number;
  cycleLabel?: string;
  qaoDirector: string;
  qmsHead: string;
  rows: MissingSubmissionRow[];
  communicationType?: string;
  includeNoted?: boolean;
  paperSize?: 'folio' | 'letter' | 'a4';
}) {
  const formattedDate = format(new Date(), 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = `RSU-QAO-MIS-${year}-${format(new Date(), 'MMdd')}`;
  const totalMissingCount = rows.reduce((acc, r) => acc + r.documents.length, 0);
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
          height: pageHeight,
          maxHeight: pageHeight,
          padding: '0.35in 0.45in 0.65in 0.45in',
          boxSizing: 'border-box',
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
          pageBreakAfter: 'always',
          breakAfter: 'page',
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
                    <div className="leading-tight">
                      ALL CONCERNED CAMPUS DIRECTORS, DEANS, PROGRAM CHAIRS, AND HEADS OF ACCOUNTABLE UNITS
                    </div>
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

                {/* NOTED ROW */}
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
                    COMPLIANCE DIRECTIVE: IMMEDIATE SUBMISSION OF OUTSTANDING EOMS DOCUMENTATION REQUIREMENTS (AY {year}
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
              <hr className="border-t border-slate-900 my-1" />

              {/* MEMORANDUM BODY PARAGRAPHS */}
              <div className="space-y-1 text-justify leading-tight text-[7.2pt] text-slate-900">
                <p className="m-0">
                  In accordance with the mandatory requirements of <strong>ISO 21001:2018 (EOMS)</strong>,{' '}
                  <strong>ISO 9001:2015</strong>, and the{' '}
                  <strong>
                    Romblon State University Educational Organizations Management System (RSU-EOMS) Manual
                  </strong>
                  , all academic and administrative operating units across all campuses are required to maintain current
                  and approved quality documentation.
                </p>

                <p className="m-0">
                  Official verification records in the <strong>RSU EOMS Submission Portal</strong> indicate that as of{' '}
                  <strong>{formattedDate}</strong>, several academic and administrative units have{' '}
                  <strong>outstanding / unsubmitted quality management documents</strong> for Academic Year{' '}
                  <strong>{year}</strong>
                  {cycleLabel ? ` (${cycleLabel})` : ''}. The complete inventory of delinquent units and missing
                  documents is detailed in <em>Attachment A</em>.
                </p>

                <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.5 text-[6.8pt] leading-tight">
                  <strong>Specific Directive:</strong> Accountable Unit Heads, Program Chairs, and Campus Leads are
                  directed to convene their respective QMS teams and upload all completed document requirements into the
                  RSU EOMS Submission Portal without further delay.
                </p>

                <p className="m-0">To complete your submission, please follow the standard portal workflow:</p>

                <ol className="list-decimal pl-3.5 space-y-0 text-[6.8pt] text-slate-800 leading-tight">
                  <li>
                    <strong>Access the Portal:</strong> Log in to the <strong>RSU EOMS Submission Portal</strong> and
                    navigate to <em>Submissions &gt; Campus / Unit Matrix</em>.
                  </li>
                  <li>
                    <strong>Upload Documents:</strong> Select your unit, choose the required report type (e.g. Risk and
                    Opportunity Registry, Operational Plan, Work Instructions), and attach the signed PDF document.
                  </li>
                  <li>
                    <strong>Submit for QA Review:</strong> Click <em>"Submit Document"</em> to forward the file to the
                    Quality Assurance Office for formal audit verification.
                  </li>
                </ol>

                <p className="m-0">
                  All concerned units are granted a strict compliance window of <strong>5 working days</strong> from
                  receipt of this directive. Failure to comply shall constrain this Office to formally elevate the
                  matter to the <strong>Office of the Vice Presidents</strong> and <strong>University President</strong>{' '}
                  for administrative intervention.
                </p>

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

        {/* 3. OFFICIAL BOTTOM FOOTER BANNER */}
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
                {totalMissingCount} Missing Document Item{totalMissingCount !== 1 ? 's' : ''} Listed
              </span>
            </div>
          </div>

          <div className="mb-2">
            <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
              ATTACHMENT A: SCHEDULE OF OUTSTANDING EOMS DOCUMENTATION SUBMISSIONS
            </h2>
            <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
              Itemized Inventory of Accountable Units and Delinquent EOMS Documentation Requirements (AY {year}
              {cycleLabel ? ` — ${cycleLabel}` : ''})
            </p>
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

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (COMPLIANCE)
 */
export function CampusNoticeOfCompliance({ campusName, year, qaoDirector, qmsHead, units, cycle }: CampusNoticeProps) {
  return (
    <div
      className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif border-[10px] border-double border-slate-200 dark:border-slate-700"
      style={{ fontSize: '11pt' }}
    >
      <div className="border border-slate-800 p-10 min-h-[11in] flex flex-col">
        <div className="text-center pb-6 mb-12 border-b border-slate-100 dark:border-slate-700">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>
            Quality Assurance Office
          </h2>
          <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-10 flex-1">
          <div className="flex justify-center">
            <ShieldCheck className="h-24 w-24 text-emerald-600" />
          </div>

          <div className="space-y-3">
            <h2
              className="font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100"
              style={{ fontSize: '24pt' }}
            >
              Institutional Notice of Compliance
            </h2>
            {cycle && (
              <p className="font-mono font-black text-xs uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full w-fit mx-auto border border-emerald-100">
                {cycle}
              </p>
            )}
          </div>

          <p className="text-xl italic text-slate-600 dark:text-slate-400">This is to officially recognize that the</p>

          <div className="py-6">
            <h3
              className="font-black uppercase text-primary underline underline-offset-8 decoration-slate-300"
              style={{ fontSize: '28pt' }}
            >
              {campusName}
            </h3>
          </div>

          <p className="max-w-xl mx-auto text-lg leading-relaxed">
            under the leadership of the Campus Director, has achieved <strong>100% Quality Documentation Parity</strong>
            across all assigned academic and administrative units for the{' '}
            <span className="font-bold underline">{cycle || 'First and Final'} Submission Cycle(s)</span> for the
            Academic Year <strong>{year}</strong>.
          </p>

          <div className="max-w-xs mx-auto pt-8">
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl shadow-sm">
              <p className="text-[10pt] font-black uppercase tracking-widest text-emerald-700 mb-1">
                Site Maturity Index
              </p>
              <span className="text-4xl font-black text-emerald-800">100.0%</span>
            </div>
          </div>
        </div>

        {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
        <div className="mt-20 space-y-8 text-left">
          <div className="w-full">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
              {qmsHead}
            </p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
              HEAD, QUALITY MANAGEMENT SYSTEM UNIT
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
            <div className="w-full">
              <p className="font-black uppercase" style={{ fontSize: '11pt' }}>
                {qaoDirector}
              </p>
              <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>
                DIRECTOR, QUALITY ASSURANCE OFFICE
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-[9pt] font-bold italic text-slate-500">
          This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-6 flex justify-between items-end text-[9pt] text-slate-400 uppercase font-bold tracking-tighter">
          <div className="flex flex-col space-y-0.5">
            <span>
              Verification Code: SITE-VER-{year}-{format(new Date(), 'HHmm')}
            </span>
            <span>RSU-QAO-FOR-023 | REV 01-2025</span>
          </div>
          <div className="text-right">
            <p>Institutional Excellence Record</p>
            <p>Issued by RSU EOMS Digital Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
