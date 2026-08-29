'use client';

import React from 'react';
import type { Risk, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { cn } from '@/lib/utils';

const safeFormatDate = (d: any) => {
  if (!d) return '—';
  try {
    const date = d instanceof Timestamp ? d.toDate() : d?.toDate ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '—' : format(date, 'MM/dd/yyyy');
  } catch {
    return '—';
  }
};

const getRatingColor = (rating: string) => {
  switch (rating?.toLowerCase()) {
    case 'critical':
    case 'high':
      return '#be123c'; // rose-700
    case 'medium':
      return '#b45309'; // amber-700
    case 'low':
      return '#047857'; // emerald-700
    default:
      return '#334155'; // slate-700
  }
};

interface BasePrintProps {
  risks: Risk[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories | null;
  unitMap?: Map<string, string>;
  campusMap?: Map<string, string>;
  isReportOnly?: boolean;
}

// Origin badge helper for rows
const renderOriginBadge = (r: Risk, campusMap?: Map<string, string>, unitMap?: Map<string, string>) => {
  const rowCampus = campusMap?.get(r.campusId) || '';
  const rowUnit = unitMap?.get(r.unitId) || '';
  if (!rowCampus && !rowUnit) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mb-1">
      {rowCampus && (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 text-[6.5pt] font-black uppercase tracking-tight border border-slate-300">
          🏛️ {rowCampus}
        </span>
      )}
      {rowUnit && (
        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-blue-50 text-blue-900 text-[6.5pt] font-black uppercase tracking-tight border border-blue-200">
          🏢 {rowUnit}
        </span>
      )}
    </div>
  );
};

/* =========================================================================
   PAGE 1: OFFICIAL INSTITUTIONAL QA MEMORANDUM FOR DECISION-SUPPORT REPORTS
   ========================================================================= */
export function RiskDecisionMemorandumPage({
  reportId,
  reportTitle,
  unitName,
  campusName,
  year,
  signatories,
  cycle = 'final',
  totalItemsCount = 0,
  communicationType = 'QA Memorandum',
  includeNoted = true,
  memoRefNo,
  memoDate,
  gracePeriodDays = 5,
  customDirective,
  customQaoDirector,
  customQmsHead,
  paperSize = 'folio',
}: {
  reportId: string;
  reportTitle: string;
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories | null;
  cycle?: 'first' | 'final';
  totalItemsCount?: number;
  communicationType?: string;
  includeNoted?: boolean;
  memoRefNo?: string;
  memoDate?: string;
  gracePeriodDays?: number;
  customDirective?: string;
  customQaoDirector?: string;
  customQmsHead?: string;
  paperSize?: 'folio' | 'letter' | 'a4';
}) {
  const parsedDate = memoDate ? new Date(memoDate) : new Date();
  const formattedDate = format(isNaN(parsedDate.getTime()) ? new Date() : parsedDate, 'MMMM d, yyyy').toUpperCase();
  const generatedRefNo = memoRefNo
    ? memoRefNo.startsWith('RSU-QAO-')
      ? memoRefNo
      : `RSU-QAO-RDS-${memoRefNo}`
    : `RSU-QAO-RDS-${year}-${format(new Date(), 'MMdd')}`;
  const pageHeight = paperSize === 'folio' ? '13in' : paperSize === 'a4' ? '11.69in' : '11in';

  const qmsHead = customQmsHead || signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = customQaoDirector || signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  let subjectLine = `DECISION-SUPPORT DIRECTIVE: ${reportTitle.toUpperCase()} (AY ${year})`;
  let directiveNarrative = `The attached Attachment A contains the official ${reportTitle} synthesized from verified institutional risk management records and quality audit submissions.`;

  if (reportId === 'non-submission-audit') {
    subjectLine = `COMPLIANCE DIRECTIVE: EOMS & RISK DIGITAL REGISTRY NON-SUBMISSION AND DEFICIENCY AUDIT REPORT (AY ${year})`;
    directiveNarrative = `Records in the RSU EOMS Submission Portal and Digital Risk Registry indicate outstanding document deficiencies across operating units as itemized in Attachment A.`;
  } else if (reportId === 'status-reminder') {
    subjectLine = `COMPLIANCE DIRECTIVE: UNIT RISK TREATMENT STATUS AND ACTION REMINDER NOTICE (AY ${year})`;
    directiveNarrative = `Accountable process owners and unit leads are directed to immediately execute committed risk treatments, resolve overdue actions, and upload documentary proofs as scheduled in Attachment A.`;
  } else if (reportId === 'executive-briefing') {
    subjectLine = `MANAGEMENT REVIEW: EXECUTIVE RISK PROFILE AND DECISION BRIEFING (AY ${year})`;
    directiveNarrative = `This briefing synthesizes institutional risk concentration, magnitude reduction indices, top critical vulnerabilities, and strategic governance directives as detailed in Attachment A.`;
  } else if (reportId === 'resource-allocation') {
    subjectLine = `DECISION-SUPPORT DIRECTIVE: RISK-BASED RESOURCE ALLOCATION AND BUDGET BLUEPRINT (FY ${year})`;
    directiveNarrative = `This resource allocation blueprint prioritizes institutional funding, budgetary outlays, and logistical support for critical risk mitigations as detailed in Attachment A.`;
  } else if (reportId === 'accountability-tracker') {
    subjectLine = `GOVERNANCE DIRECTIVE: RISK ACCOUNTABILITY AND TREATMENT COMMITMENT TRACKER (AY ${year})`;
    directiveNarrative = `All assigned risk owners and designated action leads are directed to review their treatment commitments and milestone deadlines documented in Attachment A.`;
  } else if (reportId === 'effectiveness-audit') {
    subjectLine = `QUALITY ASSURANCE DIRECTIVE: RISK TREATMENT EFFECTIVENESS AUDIT AND ISO COMPLIANCE DOSSIER (AY ${year})`;
    directiveNarrative = `This dossier presents post-treatment risk evaluations, ISO 21001:2018 Clause 6.1 compliance verification, and residual risk assessments as itemized in Attachment A.`;
  } else if (reportId === 'opportunity-scorecard') {
    subjectLine = `STRATEGIC DIRECTIVE: OPPORTUNITY PURSUIT AND INNOVATION IMPACT SCORECARD (AY ${year})`;
    directiveNarrative = `This scorecard inventories institutional opportunities, positive risk initiatives, and innovation milestones recorded for strategic advancement as scheduled in Attachment A.`;
  }

  return (
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
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '38px', width: '38px', objectFit: 'contain' }} />

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
                Romblon State University shall nurture an academic environment that provides advanced education, higher
                technological and professional instruction and technical expertise in agriculture and fisheries,
                forestry, engineering and technology, education, humanities, sciences and other relevant fields of study
                and collaborate with other institutions and communities through responsive, relevant and research-based
                extension services.
              </p>
            </div>

            <div>
              <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">
                RSU Quality Policy
              </strong>
              <p className="m-0 text-justify leading-[1.15]">
                Romblon State University commits to provide higher education through quality instruction, research,
                production, and community-based extension services that meet or exceed the requirements and expectations
                of the university's stakeholders. It will comply with international standards, applicable statutory and
                regulatory requirements, and continually improve the Quality Management System's effectiveness through
                periodic monitoring and evaluation toward sustained remarkable outcomes.
              </p>
            </div>

            <div>
              <strong className="block not-italic font-bold text-slate-700 text-[6pt] mb-0.2">RSU Core Values</strong>
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
                  <div className="leading-tight">THE CONCERNED UNIT HEAD, DEAN, AND PROGRAM CHAIRS</div>
                  <div className="text-[6.8pt] font-semibold normal-case text-slate-600">
                    {unitName} ({campusName})
                  </div>
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
                <div className="flex-1 font-black uppercase text-slate-900 leading-snug">{subjectLine}</div>
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
                In strict compliance with{' '}
                <strong>ISO 21001:2018 Clause 6.1 (Actions to Address Risks and Opportunities)</strong>,{' '}
                <strong>ISO 9001:2015 Clause 6.1</strong>, and the{' '}
                <strong>Romblon State University Risk Management and Quality Assurance Manual</strong>, the Quality
                Assurance Office transmits this official decision-support memorandum.
              </p>

              <p className="m-0">
                This memorandum formally communicates the findings, assessments, and actionable recommendations compiled
                for <strong>{unitName}</strong> ({campusName}) for Academic Year <strong>{year}</strong>
                {cycle ? ` (${cycle})` : ''}.
              </p>

              {customDirective ? (
                <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.2 text-[6.5pt] leading-tight">
                  <strong>Specific Executive Directive:</strong> {customDirective}
                </p>
              ) : (
                <p className="bg-slate-50 border-l-2 border-slate-900 p-1 my-0.2 text-[6.5pt] leading-tight">
                  <strong>Standard Directive:</strong> {directiveNarrative}
                </p>
              )}

              <p className="m-0">
                All concerned unit heads, process owners, and designated risk owners are directed to review the detailed
                schedules, matrices, and directives provided in <em>Attachment A</em>, formulate necessary operational
                adjustments, and execute compliance commitments within <strong>{gracePeriodDays} working days</strong>{' '}
                from receipt hereof.
              </p>

              <p className="pt-0.2 m-0 font-semibold text-[6.8pt]">
                For your guidance, strict compliance, and appropriate operational action.
              </p>
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
                  <p className="text-[5.5pt] text-slate-500 m-0 leading-tight">Lead Internal Quality Auditor, RSU</p>
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
  );
}

/* =========================================================================
   1. EXECUTIVE RISK PROFILE & STRATEGIC DECISION BRIEFING (ATTACHMENT A)
   ========================================================================= */
interface ExecutiveBriefingProps extends BasePrintProps {
  cycle?: 'first' | 'final';
}

export function ExecutiveRiskBriefingTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  cycle = 'final',
  unitMap,
  campusMap,
  isReportOnly = false,
}: ExecutiveBriefingProps) {
  const today = new Date();
  const totalRisks = risks.filter((r) => r.type === 'Risk');
  const totalOpportunities = risks.filter((r) => r.type === 'Opportunity');
  const criticalCount = totalRisks.filter(
    (r) => r.preTreatment?.rating === 'Critical' || r.preTreatment?.rating === 'High',
  ).length;
  const mediumCount = totalRisks.filter((r) => r.preTreatment?.rating === 'Medium').length;
  const lowCount = totalRisks.filter((r) => r.preTreatment?.rating === 'Low').length;

  const closedCount = totalRisks.filter((r) => r.status === 'Closed').length;
  const inProgressCount = totalRisks.filter((r) => r.status === 'In Progress').length;
  const openCount = totalRisks.filter((r) => r.status === 'Open').length;

  const treatedRisks = totalRisks.filter((r) => r.postTreatment && r.postTreatment.magnitude);
  const totalPreMagnitude = treatedRisks.reduce((acc, r) => acc + (r.preTreatment?.magnitude || 0), 0);
  const totalPostMagnitude = treatedRisks.reduce((acc, r) => acc + (r.postTreatment?.magnitude || 0), 0);
  const reductionPercentage =
    totalPreMagnitude > 0 ? Math.round(((totalPreMagnitude - totalPostMagnitude) / totalPreMagnitude) * 100) : 0;

  const topVulnerabilities = [...totalRisks]
    .sort((a, b) => (b.preTreatment?.magnitude || 0) - (a.preTreatment?.magnitude || 0))
    .slice(0, 6);

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-ERB-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • {cycle === 'first' ? '1st Cycle' : 'Final Cycle'}
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}EXECUTIVE RISK PROFILE &amp; DECISION-SUPPORT BRIEFING
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            ISO 21001:2018 Clause 6.1 Strategic Intelligence, Magnitude Reduction, and Top Critical Vulnerabilities
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        {/* KEY DECISION METRICS GRID */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
          <div className="border border-slate-900 p-1.5 rounded bg-slate-50">
            <p className="text-[6.5pt] font-black uppercase text-slate-600">Total Portfolio</p>
            <p className="text-lg font-black text-slate-900 my-0.2">{risks.length}</p>
            <p className="text-[6.2pt] text-slate-600 font-bold">
              {totalRisks.length} Risks | {totalOpportunities.length} Opps
            </p>
          </div>
          <div className="border border-rose-600 p-1.5 rounded bg-rose-50/70">
            <p className="text-[6.5pt] font-black uppercase text-rose-800">Critical / High</p>
            <p className="text-lg font-black text-rose-700 my-0.2">{criticalCount}</p>
            <p className="text-[6.2pt] text-rose-700 font-bold">
              {mediumCount} Med | {lowCount} Low
            </p>
          </div>
          <div className="border border-emerald-600 p-1.5 rounded bg-emerald-50/70">
            <p className="text-[6.5pt] font-black uppercase text-emerald-800">Reduction Index</p>
            <p className="text-lg font-black text-emerald-700 my-0.2">{reductionPercentage}%</p>
            <p className="text-[6.2pt] text-emerald-700 font-bold">{treatedRisks.length} Treatments</p>
          </div>
          <div className="border border-indigo-600 p-1.5 rounded bg-indigo-50/70">
            <p className="text-[6.5pt] font-black uppercase text-indigo-800">Closure Velocity</p>
            <p className="text-lg font-black text-indigo-700 my-0.2">
              {closedCount} / {totalRisks.length}
            </p>
            <p className="text-[6.2pt] text-indigo-700 font-bold">
              {inProgressCount} Ongoing | {openCount} Open
            </p>
          </div>
        </div>

        {/* TOP CRITICAL RISKS TABLE */}
        <div className="mb-3">
          <table className="w-full border-collapse border border-slate-900 text-[7.2pt]">
            <thead>
              <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
                <th className="border border-slate-900 p-1 text-center w-[22%]">Objective &amp; Context</th>
                <th className="border border-slate-900 p-1 text-center w-[26%]">Risk Description &amp; Causes</th>
                <th className="border border-slate-900 p-1 text-center w-[10%]">Pre-Rating</th>
                <th className="border border-slate-900 p-1 text-center w-[24%]">Mitigation Strategy</th>
                <th className="border border-slate-900 p-1 text-center w-[8%]">Post</th>
                <th className="border border-slate-900 p-1 text-center w-[10%]">Status</th>
              </tr>
            </thead>
            <tbody>
              {topVulnerabilities.map((r, i) => (
                <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-900 p-1 font-bold align-top">
                    {renderOriginBadge(r, campusMap, unitMap)}
                    <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                  </td>
                  <td className="border border-slate-900 p-1 align-top leading-snug text-[7pt]">{r.description}</td>
                  <td
                    className="border border-slate-900 p-1 text-center font-black align-top text-[7pt]"
                    style={{ color: getRatingColor(r.preTreatment?.rating) }}
                  >
                    {r.preTreatment?.rating} ({r.preTreatment?.magnitude})
                  </td>
                  <td className="border border-slate-900 p-1 align-top font-medium leading-snug text-[6.8pt]">
                    {r.treatmentAction || '—'}
                  </td>
                  <td
                    className="border border-slate-900 p-1 text-center font-bold align-top text-[7pt]"
                    style={{ color: getRatingColor(r.postTreatment?.rating || '') }}
                  >
                    {r.postTreatment?.rating ? `${r.postTreatment.rating} (${r.postTreatment.magnitude})` : '—'}
                  </td>
                  <td className="border border-slate-900 p-1 text-center align-top">
                    <span
                      className={`inline-block px-1 py-0.2 rounded text-[6pt] font-black uppercase ${
                        r.status === 'Closed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* STRATEGIC MANAGEMENT RECOMMENDATIONS */}
        <div className="border border-slate-300 p-2 rounded bg-slate-50 mb-3 text-[6.8pt]">
          <h4 className="font-black uppercase text-slate-800 mb-0.5 text-[7pt]">
            Executive Risk Governance Directives:
          </h4>
          <ul className="list-disc list-inside space-y-0 text-slate-700 leading-tight">
            <li>
              <strong>Resource Prioritization:</strong> Focus procurement and institutional funding on High/Critical
              items with pending treatments.
            </li>
            <li>
              <strong>Monitoring Cadence:</strong> Mandatory monthly review for open risks carrying consequence score
              &gt;= 4.
            </li>
            <li>
              <strong>ISO 21001 Audit Readiness:</strong> Ensure documentary evidence is uploaded to Google Drive for
              all closed entries.
            </li>
          </ul>
        </div>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-ERB (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   2. RISK TREATMENT ACTION PLAN & RESOURCE ALLOCATION BLUEPRINT (ATTACHMENT A)
   ========================================================================= */
export function RiskResourceAllocationTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
  isReportOnly = false,
}: BasePrintProps) {
  const today = new Date();
  const treatmentPlans = risks.filter(
    (r) => r.treatmentAction || r.resourcesNeeded || r.preTreatment?.rating !== 'Low',
  );

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-RAP-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • FY {year}
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}RISK TREATMENT ACTION PLAN &amp; RESOURCE ALLOCATION BLUEPRINT (RAP)
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            Annual Procurement &amp; Resource Justification Schedule — Fiscal Year {year}
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[20%]">Objective &amp; Context</th>
              <th className="border border-slate-900 p-1 text-center w-[8%]">Severity</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Treatment Action Required</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Resources Needed</th>
              <th className="border border-slate-900 p-1 text-left w-[12%]">Responsible</th>
              <th className="border border-slate-900 p-1 text-center w-[8%]">Target</th>
            </tr>
          </thead>
          <tbody>
            {treatmentPlans.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                <td className="border border-slate-900 p-1 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                </td>
                <td
                  className="border border-slate-900 p-1 text-center font-bold align-top text-[7pt]"
                  style={{ color: getRatingColor(r.preTreatment?.rating) }}
                >
                  {r.preTreatment?.rating || '—'}
                </td>
                <td className="border border-slate-900 p-1 align-top font-medium text-[6.8pt]">
                  {r.treatmentAction || '—'}
                </td>
                <td className="border border-slate-900 p-1 align-top font-bold text-slate-800 bg-amber-50/40 text-[6.8pt]">
                  {r.resourcesNeeded || 'Internal Staff Time / Existing Operational Budget'}
                </td>
                <td className="border border-slate-900 p-1 align-top font-medium text-[6.8pt]">
                  {r.responsiblePersonName || 'Unit Focal Person'}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top font-mono font-bold text-[6.8pt]">
                  {safeFormatDate(r.targetDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-RAP (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   3. RISK TREATMENT ACCOUNTABILITY & ACTION COMMITMENT TRACKER (ATTACHMENT A)
   ========================================================================= */
export function RiskAccountabilityTrackerTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
  isReportOnly = false,
}: BasePrintProps) {
  const today = new Date();
  const actionableRisks = risks.filter((r) => r.status !== 'Closed' || r.treatmentAction);

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-RAT-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • AY {year}
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}RISK TREATMENT ACCOUNTABILITY &amp; COMMITMENT TRACKER (RAT)
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            Monitoring Assigned Action Leads, Milestone Deadlines, and Operational Risk Statuses
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[22%]">Risk Objective &amp; Type</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Committed Mitigation</th>
              <th className="border border-slate-900 p-1 text-left w-[18%]">Assigned Action Lead</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">Target Deadline</th>
              <th className="border border-slate-900 p-1 text-center w-[10%]">Status</th>
              <th className="border border-slate-900 p-1 text-center w-[10%]">Verification</th>
            </tr>
          </thead>
          <tbody>
            {actionableRisks.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                <td className="border border-slate-900 p-1 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                </td>
                <td className="border border-slate-900 p-1 align-top text-[6.8pt]">{r.treatmentAction || '—'}</td>
                <td className="border border-slate-900 p-1 align-top font-bold text-slate-800 text-[6.8pt]">
                  {r.responsiblePersonName || 'Unit Head / Focal Person'}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top font-mono font-bold text-[6.8pt]">
                  {safeFormatDate(r.targetDate)}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top">
                  <span
                    className={`inline-block px-1 py-0.2 rounded text-[6pt] font-black uppercase ${
                      r.status === 'Closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.status === 'In Progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="border border-slate-900 p-1 text-center align-top text-[6pt] text-slate-500">
                  {r.postTreatment?.evidence ? 'Evidence Uploaded' : 'Pending Proof'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-RAT (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   4. RISK TREATMENT EFFECTIVENESS AUDIT & ISO 21001:2018 COMPLIANCE DOSSIER
   ========================================================================= */
export function RiskEffectivenessAuditTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
  isReportOnly = false,
}: BasePrintProps) {
  const today = new Date();
  const treatedRisks = risks.filter((r) => r.postTreatment || r.status === 'Closed');

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-REA-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • ISO 21001:2018 Clause 6.1
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}RISK TREATMENT EFFECTIVENESS AUDIT &amp; ISO COMPLIANCE DOSSIER (REA)
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            Pre vs Post Risk Comparison, Residual Severity Evaluation, and Quality Assurance Verification
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[22%]">Risk &amp; Objective</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">Pre-Rating</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Mitigation Implemented</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">Post-Rating</th>
              <th className="border border-slate-900 p-1 text-center w-[14%]">Residual Effect</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">QA Verdict</th>
            </tr>
          </thead>
          <tbody>
            {treatedRisks.map((r, i) => {
              const preMag = r.preTreatment?.magnitude || 0;
              const postMag = r.postTreatment?.magnitude || 0;
              const diff = preMag - postMag;
              const isEffective = diff > 0 || r.status === 'Closed';

              return (
                <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                  <td className="border border-slate-900 p-1 align-top">
                    {renderOriginBadge(r, campusMap, unitMap)}
                    <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                  </td>
                  <td
                    className="border border-slate-900 p-1 text-center font-bold align-top text-[7pt]"
                    style={{ color: getRatingColor(r.preTreatment?.rating) }}
                  >
                    {r.preTreatment?.rating} ({preMag})
                  </td>
                  <td className="border border-slate-900 p-1 align-top text-[6.8pt]">{r.treatmentAction || '—'}</td>
                  <td
                    className="border border-slate-900 p-1 text-center font-bold align-top text-[7pt]"
                    style={{ color: getRatingColor(r.postTreatment?.rating || '') }}
                  >
                    {r.postTreatment?.rating ? `${r.postTreatment.rating} (${postMag})` : '—'}
                  </td>
                  <td className="border border-slate-900 p-1 text-center align-top font-bold text-[6.8pt]">
                    {diff > 0 ? (
                      <span className="text-emerald-700 font-bold">Reduced by {diff} pts</span>
                    ) : (
                      <span className="text-slate-500">Maintained</span>
                    )}
                  </td>
                  <td className="border border-slate-900 p-1 text-center align-top">
                    <span
                      className={`inline-block px-1 py-0.2 rounded text-[6pt] font-black uppercase ${
                        isEffective ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isEffective ? 'EFFECTIVE' : 'REVIEW DUE'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-REA (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   5. OPPORTUNITY PURSUIT & INNOVATION IMPACT SCORECARD (ATTACHMENT A)
   ========================================================================= */
export function OpportunityInnovationTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
  isReportOnly = false,
}: BasePrintProps) {
  const today = new Date();
  const opportunities = risks.filter((r) => r.type === 'Opportunity');

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-OIS-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • AY {year}
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}OPPORTUNITY PURSUIT &amp; INNOVATION IMPACT SCORECARD (OIS)
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            ISO 21001:2018 Clause 6.1 (Positive Risk Pursuits, Institutional Innovation, and Strategic Gains)
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Strategic Opportunity Statement</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">Potential Gain</th>
              <th className="border border-slate-900 p-1 text-left w-[28%]">Pursuit Action &amp; Initiatives</th>
              <th className="border border-slate-900 p-1 text-left w-[18%]">Responsible Lead</th>
              <th className="border border-slate-900 p-1 text-center w-[14%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                <td className="border border-slate-900 p-1 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                </td>
                <td className="border border-slate-900 p-1 text-center font-bold align-top text-emerald-700 text-[7pt]">
                  {r.preTreatment?.rating || 'High Gain'}
                </td>
                <td className="border border-slate-900 p-1 align-top text-[6.8pt]">{r.treatmentAction || '—'}</td>
                <td className="border border-slate-900 p-1 align-top font-bold text-slate-800 text-[6.8pt]">
                  {r.responsiblePersonName || 'Unit Focal Person'}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[6pt] font-black uppercase ${
                      r.status === 'Closed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : r.status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-OIS (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   6. UNIT RISK TREATMENT STATUS & ACTION REMINDER NOTICE (ATTACHMENT A)
   ========================================================================= */
export function RiskStatusReminderNoticeTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
  isReportOnly = false,
}: BasePrintProps) {
  const today = new Date();
  const pendingRisks = risks.filter((r) => r.status !== 'Closed');

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-REM-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {unitName} ({campusName}) • FY {year}
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
            <span className="text-[6.8pt] font-bold text-rose-700 font-mono block">
              {pendingRisks.length} Pending Treatment{pendingRisks.length !== 1 ? 's' : ''} Listed
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}SCHEDULE OF PENDING &amp; OVERDUE RISK TREATMENTS
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            Itemized Inventory of Active Risk Mitigation Commitments and Mandatory Compliance Milestones (AY {year})
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'Main Campus'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> {unitName || 'All Audited Units'}
              </span>
            </div>
          )}
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Risk Objective &amp; Cause</th>
              <th className="border border-slate-900 p-1 text-center w-[10%]">Pre-Rating</th>
              <th className="border border-slate-900 p-1 text-left w-[26%]">Committed Mitigation Action</th>
              <th className="border border-slate-900 p-1 text-left w-[18%]">Responsible Lead</th>
              <th className="border border-slate-900 p-1 text-center w-[10%]">Target Date</th>
              <th className="border border-slate-900 p-1 text-center w-[8%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {pendingRisks.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                <td className="border border-slate-900 p-1 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug m-0 text-[7pt]">{r.objective}</p>
                </td>
                <td
                  className="border border-slate-900 p-1 text-center font-bold align-top text-[7pt]"
                  style={{ color: getRatingColor(r.preTreatment?.rating) }}
                >
                  {r.preTreatment?.rating || '—'}
                </td>
                <td className="border border-slate-900 p-1 align-top text-[6.8pt]">{r.treatmentAction || '—'}</td>
                <td className="border border-slate-900 p-1 align-top font-bold text-slate-800 text-[6.8pt]">
                  {r.responsiblePersonName || 'Unit Focal Person'}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top font-mono font-bold text-rose-700 text-[6.8pt]">
                  {safeFormatDate(r.targetDate)}
                </td>
                <td className="border border-slate-900 p-1 text-center align-top">
                  <span
                    className={`inline-block px-1 py-0.2 rounded text-[6pt] font-black uppercase ${
                      r.status === 'In Progress' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-REM (Attachment A) | Rev. 03
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
  );
}

/* =========================================================================
   7. UNIT NON-SUBMISSION & DEFICIENCY AUDIT (ATTACHMENT A)
   ========================================================================= */
export interface UnitComplianceAuditItem {
  unitId: string;
  unitName: string;
  campusId?: string;
  campusName: string;
  firstCycleSubmitted?: string[];
  missingFirstCycle?: string[];
  finalCycleSubmitted?: string[];
  missingFinalCycle?: string[];
  totalRisksLogged?: number;
  openRisksCount?: number;
  inProgressRisksCount?: number;
  closedRisksCount?: number;
  overdueRisksCount?: number;
  complianceScore: number;
  complianceStatus: 'Fully Compliant' | 'Partial Submission' | 'Non-Compliant (No Submissions)';
}

interface UnitNonSubmissionAuditProps {
  auditUnits: UnitComplianceAuditItem[];
  campusName: string;
  year: number;
  signatories?: Signatories | null;
  currentCycle?: 'first' | 'final';
  isReportOnly?: boolean;
}

export function UnitNonSubmissionAuditTemplate({
  auditUnits,
  campusName,
  year,
  signatories,
  currentCycle = 'final',
  isReportOnly = false,
}: UnitNonSubmissionAuditProps) {
  const today = new Date();
  const totalUnits = auditUnits.length;
  const compliantUnits = auditUnits.filter((u) => u.complianceStatus === 'Fully Compliant');
  const partialUnits = auditUnits.filter((u) => u.complianceStatus === 'Partial Submission');
  const nonCompliantUnits = auditUnits.filter((u) => u.complianceStatus === 'Non-Compliant (No Submissions)');

  const qmsHead = signatories?.qmsHead || 'HEAD, QUALITY MANAGEMENT SYSTEM (QMS)';
  const qaoDirector = signatories?.qaoDirector || 'SARAH JANE F. FALLARIA';

  return (
    <div
      className="memo-attachment-page relative flex flex-col justify-between"
      style={{
        width: '8.5in',
        minHeight: '13in',
        padding: '0.35in 0.45in 0.65in 0.45in',
        boxSizing: 'border-box',
        pageBreakBefore: isReportOnly ? 'auto' : 'always',
        breakBefore: isReportOnly ? 'auto' : 'page',
      }}
    >
      <div>
        {/* ATTACHMENT TOP HEADER */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-2.5">
          <div className="flex items-center gap-2.5">
            <img src="/rsulogo.png" alt="RSU Seal" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
            <img src="/qa_logo.png" alt="QAO Emblem" style={{ height: '36px', width: '36px', objectFit: 'contain' }} />
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
            <span className="text-[7.5pt] font-mono font-bold text-slate-900 block">
              Ref: RSU-QAO-DEF-{year}-{format(today, 'MMdd')}
            </span>
            <span className="text-[6.8pt] font-bold text-slate-700 block">
              {campusName} • {currentCycle === 'first' ? '1st Cycle' : 'Final Cycle'} (AY {year})
            </span>
            <span className="text-[6.5pt] font-semibold text-slate-600 block">
              Date Printed/Updated: {format(today, 'MMMM d, yyyy')}
            </span>
          </div>
        </div>

        <div className={`mb-2 ${isReportOnly ? 'text-center' : ''}`}>
          <h2 className="text-[9.5pt] font-black uppercase tracking-tight text-slate-900 m-0">
            {isReportOnly ? '' : 'ATTACHMENT A: '}EOMS &amp; RISK DIGITAL REGISTRY NON-SUBMISSION &amp; DEFICIENCY AUDIT
          </h2>
          <p className="text-[7pt] font-semibold text-slate-600 m-0 mt-0.5">
            Auditing Unit Document Submissions in EOMS Submission Hub &amp; Digital Risk &amp; Opportunity Registry (FY{' '}
            {year})
          </p>
          {isReportOnly && (
            <div className="mt-1.5 flex items-center justify-center gap-4 text-[7.5pt] font-bold text-slate-800 uppercase tracking-tight border-y border-slate-300 py-1 bg-slate-50/80">
              <span>
                <strong>SITE/CAMPUS:</strong> {campusName || 'All Campuses (University-Wide)'}
              </span>
              <span className="text-slate-400">•</span>
              <span>
                <strong>UNIT:</strong> All Audited Units
              </span>
            </div>
          )}
        </div>

        {/* SUMMARY METRICS */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
          <div className="border border-slate-900 p-1.5 rounded bg-slate-50">
            <p className="text-[6.5pt] font-black uppercase text-slate-600">Total Units</p>
            <p className="text-lg font-black text-slate-900 my-0.2">{totalUnits}</p>
            <p className="text-[6.2pt] text-slate-600 font-bold">Evaluated</p>
          </div>
          <div className="border border-emerald-600 p-1.5 rounded bg-emerald-50/70">
            <p className="text-[6.5pt] font-black uppercase text-emerald-800">100% Compliant</p>
            <p className="text-lg font-black text-emerald-700 my-0.2">{compliantUnits.length}</p>
            <p className="text-[6.2pt] text-emerald-700 font-bold">
              {totalUnits > 0 ? Math.round((compliantUnits.length / totalUnits) * 100) : 0}% Rate
            </p>
          </div>
          <div className="border border-amber-600 p-1.5 rounded bg-amber-50/70">
            <p className="text-[6.5pt] font-black uppercase text-amber-800">Partially Deficient</p>
            <p className="text-lg font-black text-amber-700 my-0.2">{partialUnits.length}</p>
            <p className="text-[6.2pt] text-amber-700 font-bold">Missing Docs</p>
          </div>
          <div className="border border-rose-600 p-1.5 rounded bg-rose-50/70">
            <p className="text-[6.5pt] font-black uppercase text-rose-800">Non-Compliant (0)</p>
            <p className="text-lg font-black text-rose-700 my-0.2">{nonCompliantUnits.length}</p>
            <p className="text-[6.2pt] text-rose-700 font-bold">Zero Records</p>
          </div>
        </div>

        <table className="w-full border-collapse border border-slate-900 text-[7.2pt] mb-3">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase text-[6.8pt]">
              <th className="border border-slate-900 p-1 text-center w-[4%]">#</th>
              <th className="border border-slate-900 p-1 text-left w-[20%]">Campus &amp; Unit</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">EOMS 1st Cycle</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">EOMS Final</th>
              <th className="border border-slate-900 p-1 text-center w-[12%]">Risk ROR</th>
              <th className="border border-slate-900 p-1 text-left w-[24%]">Specific Missing Items</th>
              <th className="border border-slate-900 p-1 text-center w-[8%]">Score</th>
              <th className="border border-slate-900 p-1 text-center w-[8%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {auditUnits.map((u, i) => {
              const missingDocs = [
                ...(u.missingFirstCycle?.map((d) => `${d} (1st)`) || []),
                ...(u.missingFinalCycle?.map((d) => `${d} (Final)`) || []),
              ];

              return (
                <tr key={u.unitId || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="border border-slate-900 p-1 text-center font-bold">{i + 1}</td>
                  <td className="border border-slate-900 p-1 font-bold text-slate-900">
                    <span className="text-[6.5pt] text-slate-500 block uppercase font-mono">{u.campusName}</span>
                    <span className="text-[7.2pt] uppercase font-black">{u.unitName}</span>
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold text-[7pt]">
                    {u.firstCycleSubmitted?.length || 0} / 6
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold text-[7pt]">
                    {u.finalCycleSubmitted?.length || 0} / 6
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-mono font-bold text-[7pt]">
                    {u.totalRisksLogged && u.totalRisksLogged > 0
                      ? `${u.totalRisksLogged} Risks (${u.closedRisksCount || 0} closed)`
                      : 'NO ROR'}
                  </td>
                  <td className="border border-slate-900 p-1 text-[6.5pt] text-slate-700">
                    {missingDocs.length > 0 ? (
                      <ul className="list-disc pl-3 space-y-0.2 m-0">
                        {missingDocs.slice(0, 3).map((d, di) => (
                          <li key={di}>{d}</li>
                        ))}
                        {missingDocs.length > 3 && (
                          <li className="font-bold text-rose-700">+{missingDocs.length - 3} more missing</li>
                        )}
                      </ul>
                    ) : (
                      <span className="text-emerald-700 font-bold">Complete EOMS Docs</span>
                    )}
                  </td>
                  <td className="border border-slate-900 p-1 text-center font-black text-[7.2pt]">
                    {u.complianceScore}%
                  </td>
                  <td className="border border-slate-900 p-1 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.2 rounded text-[6pt] font-black uppercase ${
                        u.complianceStatus === 'Fully Compliant'
                          ? 'bg-emerald-100 text-emerald-800'
                          : u.complianceStatus === 'Partial Submission'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {u.complianceStatus === 'Fully Compliant'
                        ? 'COMPLIANT'
                        : u.complianceStatus === 'Partial Submission'
                          ? 'PARTIAL'
                          : 'NON-COMPLIANT'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ATTACHMENT SIGNATORIES */}
        <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[7.2pt]">
          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Certified Accurate by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qmsHead}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Head, Quality Management System (QMS)</p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-600 uppercase text-[6pt] m-0">Approved for Release by:</p>
            <div className="pt-3">
              <p className="font-black uppercase text-slate-900 border-b border-black inline-block pb-0.2 min-w-[150px] text-[7.2pt] m-0">
                {qaoDirector}
              </p>
              <p className="text-[6.8pt] text-slate-700 font-bold mt-0.5 m-0">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* ATTACHMENT FOOTER & GREEN BANNER */}
      <div>
        <div className="border-t border-slate-300 pt-1 mb-1 text-[6pt] text-slate-500 flex justify-between items-center font-sans">
          <span>Romblon State University • Quality Assurance Office • RSU EOMS Submission Portal</span>
          <span className="font-mono font-bold text-slate-800">
            Form Code: RSU-QAO-RDS-DEF (Attachment A) | Rev. 03
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
  );
}
