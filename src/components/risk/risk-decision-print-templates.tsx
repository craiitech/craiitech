'use client';

import React from 'react';
import type { Risk, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';

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
  signatories?: Signatories;
  unitMap?: Map<string, string>;
  campusMap?: Map<string, string>;
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
   1. EXECUTIVE RISK PROFILE & STRATEGIC DECISION BRIEFING
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

  return (
    <div
      className="p-8 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '9pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Quality Assurance Office & Risk Management Council
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          EXECUTIVE RISK PROFILE & DECISION-SUPPORT BRIEFING
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          ISO 21001:2018 Clause 6.1 (Actions to Address Risks & Opportunities) & Institutional QMS Compliance
        </p>
      </div>

      {/* 3. METADATA TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-QAO-ERB-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE ISSUED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">AUDITEE / UNIT:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">MONITORING CYCLE:</td>
            <td className="border border-black p-2 font-bold">
              {cycle === 'first' ? '1st Monitoring Cycle' : 'Final / Annual Cycle'} (FY {year})
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. KEY DECISION METRICS GRID */}
      <div className="grid grid-cols-4 gap-3 mb-4 text-center">
        <div className="border border-black p-2.5 rounded bg-slate-50">
          <p className="text-[7pt] font-black uppercase text-slate-600">Total Portfolio</p>
          <p className="text-xl font-black text-slate-900 my-0.5">{risks.length}</p>
          <p className="text-[7pt] text-slate-600 font-bold">
            {totalRisks.length} Risks | {totalOpportunities.length} Opps
          </p>
        </div>
        <div className="border border-rose-600 p-2.5 rounded bg-rose-50/70">
          <p className="text-[7pt] font-black uppercase text-rose-800">High / Critical Vulnerabilities</p>
          <p className="text-xl font-black text-rose-700 my-0.5">{criticalCount}</p>
          <p className="text-[7pt] text-rose-700 font-bold">
            {mediumCount} Medium | {lowCount} Low
          </p>
        </div>
        <div className="border border-emerald-600 p-2.5 rounded bg-emerald-50/70">
          <p className="text-[7pt] font-black uppercase text-emerald-800">Risk Reduction Achieved</p>
          <p className="text-xl font-black text-emerald-700 my-0.5">{reductionPercentage}%</p>
          <p className="text-[7pt] text-emerald-700 font-bold">{treatedRisks.length} Verified Treatments</p>
        </div>
        <div className="border border-indigo-600 p-2.5 rounded bg-indigo-50/70">
          <p className="text-[7pt] font-black uppercase text-indigo-800">Closure / Execution Velocity</p>
          <p className="text-xl font-black text-indigo-700 my-0.5">
            {closedCount} / {totalRisks.length}
          </p>
          <p className="text-[7pt] text-indigo-700 font-bold">
            {inProgressCount} In Progress | {openCount} Open
          </p>
        </div>
      </div>

      {/* TOP CRITICAL RISKS TABLE */}
      <div className="mb-4">
        <h3 className="text-[8.5pt] font-black uppercase tracking-wider mb-1.5 text-center border-b border-black pb-1">
          Top Critical Vulnerabilities & Strategic Action Status
        </h3>
        <table className="w-full border-collapse border-2 border-black text-[8pt]">
          <thead>
            <tr className="bg-slate-100 font-black text-slate-900 uppercase">
              <th className="border border-black p-1.5 text-center w-[22%]">Objective & Origin</th>
              <th className="border border-black p-1.5 text-center w-[26%]">Risk Description & Causes</th>
              <th className="border border-black p-1.5 text-center w-[10%]">Pre-Rating</th>
              <th className="border border-black p-1.5 text-center w-[24%]">Mitigation Strategy</th>
              <th className="border border-black p-1.5 text-center w-[8%]">Post-Rating</th>
              <th className="border border-black p-1.5 text-center w-[10%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {topVulnerabilities.map((r, i) => (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-black p-1.5 font-bold align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                </td>
                <td className="border border-black p-1.5 align-top leading-snug">{r.description}</td>
                <td
                  className="border border-black p-1.5 text-center font-black align-top"
                  style={{ color: getRatingColor(r.preTreatment?.rating) }}
                >
                  {r.preTreatment?.rating} ({r.preTreatment?.magnitude})
                </td>
                <td className="border border-black p-1.5 align-top font-medium leading-snug">
                  {r.treatmentAction || '—'}
                </td>
                <td
                  className="border border-black p-1.5 text-center font-bold align-top"
                  style={{ color: getRatingColor(r.postTreatment?.rating || '') }}
                >
                  {r.postTreatment?.rating ? `${r.postTreatment.rating} (${r.postTreatment.magnitude})` : '—'}
                </td>
                <td className="border border-black p-1.5 text-center align-top">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[7pt] font-black ${
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
      <div className="border border-slate-300 p-3 rounded bg-slate-50 mb-6 text-[8pt]">
        <h4 className="font-black uppercase text-slate-800 mb-1">Executive Risk Governance Directives:</h4>
        <ul className="list-disc list-inside space-y-0.5 text-slate-700">
          <li>
            <strong>Resource Prioritization:</strong> Focus procurement and institutional funding on High/Critical items
            with pending treatments.
          </li>
          <li>
            <strong>Monitoring Cadence:</strong> Mandatory monthly review for open risks carrying consequence score
            &gt;= 4.
          </li>
          <li>
            <strong>ISO 21001 / Clause 6.1 Audit Readiness:</strong> Ensure documentary evidence is uploaded to Google
            Drive for all closed entries.
          </li>
        </ul>
      </div>

      {/* SIGNATORIES */}
      <div className="grid grid-cols-2 gap-8 text-[8.5pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-6">Prepared by / Risk Focal Person:</p>
          <div className="border-b border-black w-48 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'Unit Head / QMS Coordinator'}</p>
          <p className="text-[7.5pt] text-slate-500">Quality Management System Officer</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-6">Approved for Institutional Action:</p>
          <div className="border-b border-black w-48 ml-auto mb-1"></div>
          <p className="font-black uppercase">{signatories?.qaoDirector || 'QAO Director / Executive Officer'}</p>
          <p className="text-[7.5pt] text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   2. RISK TREATMENT ACTION PLAN & RESOURCE ALLOCATION BLUEPRINT
   ========================================================================= */
export function RiskResourceAllocationTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
}: BasePrintProps) {
  const today = new Date();
  const treatmentPlans = risks.filter(
    (r) => r.treatmentAction || r.resourcesNeeded || r.preTreatment?.rating !== 'Low',
  );

  return (
    <div
      className="p-8 text-black bg-white max-w-[12.5in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '8.5pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Financial Planning & Institutional Quality Assurance
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          RISK TREATMENT ACTION PLAN & RESOURCE ALLOCATION BLUEPRINT (RAP)
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          Annual Procurement & Resource Justification — Fiscal Year {year}
        </p>
      </div>

      {/* 3. METADATA TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-3">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-QAO-RAP-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE ISSUED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">DEPARTMENT / UNIT:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">ACTIONABLE PLANS:</td>
            <td className="border border-black p-2 font-bold">{treatmentPlans.length} Entries Requiring Resources</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-black p-1.5 text-center w-[4%]">#</th>
            <th className="border border-black p-1.5 text-center w-[20%]">Objective & Origin Context</th>
            <th className="border border-black p-1.5 text-center w-[8%]">Severity</th>
            <th className="border border-black p-1.5 text-center w-[24%]">Treatment Action Required</th>
            <th className="border border-black p-1.5 text-center w-[24%]">Resources Needed (Budget / Tech / Staff)</th>
            <th className="border border-black p-1.5 text-center w-[12%]">Responsible Lead</th>
            <th className="border border-black p-1.5 text-center w-[8%]">Target Date</th>
          </tr>
        </thead>
        <tbody>
          {treatmentPlans.map((r, i) => (
            <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-black p-1.5 text-center font-bold">{i + 1}</td>
              <td className="border border-black p-1.5 align-top">
                {renderOriginBadge(r, campusMap, unitMap)}
                <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                <p className="text-[7.5pt] text-slate-600 mt-0.5 line-clamp-2">{r.description}</p>
              </td>
              <td
                className="border border-black p-1.5 text-center font-bold align-top"
                style={{ color: getRatingColor(r.preTreatment?.rating) }}
              >
                {r.preTreatment?.rating || '—'}
              </td>
              <td className="border border-black p-1.5 align-top font-medium">{r.treatmentAction || '—'}</td>
              <td className="border border-black p-1.5 align-top font-bold text-slate-800 bg-amber-50/40">
                {r.resourcesNeeded || 'Internal Staff Time / Existing Operational Budget'}
              </td>
              <td className="border border-black p-1.5 align-top font-medium">
                {r.responsiblePersonName || 'Unit Focal Person'}
              </td>
              <td className="border border-black p-1.5 text-center align-top font-mono font-bold">
                {safeFormatDate(r.targetDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SIGNATORIES */}
      <div className="grid grid-cols-3 gap-6 text-[8pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-5">Prepared by Unit Focal Lead:</p>
          <div className="border-b border-black w-40 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'Unit Head'}</p>
        </div>
        <div>
          <p className="font-bold text-slate-600 mb-5">Budget & Resource Endorsement:</p>
          <div className="border-b border-black w-40 mb-1"></div>
          <p className="font-black uppercase">Planning & Budget Officer</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-5">Approved for Implementation:</p>
          <div className="border-b border-black w-40 ml-auto mb-1"></div>
          <p className="font-black uppercase">{signatories?.qaoDirector || 'Vice President / Director'}</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   3. TREATMENT ACCOUNTABILITY & OVERDUE MILESTONE TRACKER
   ========================================================================= */
export function RiskAccountabilityTrackerTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
}: BasePrintProps) {
  const today = new Date();
  const activeRisks = risks.filter((r) => r.type === 'Risk');

  const overdueRisks = activeRisks.filter((r) => {
    if (r.status === 'Closed') return false;
    if (!r.targetDate) return false;
    const target = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
    return target < today;
  });

  const inProgressRisks = activeRisks.filter((r) => r.status === 'In Progress' && !overdueRisks.includes(r));
  const completedRisks = activeRisks.filter((r) => r.status === 'Closed');

  return (
    <div
      className="p-8 text-black bg-white max-w-[12in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '8.5pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Monitoring & Evaluation Division • Quality Assurance Office
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          RISK TREATMENT ACCOUNTABILITY & OVERDUE MILESTONE TRACKER
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          Operational Milestone Monitoring — Fiscal Year {year}
        </p>
      </div>

      {/* 3. METADATA TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-QAO-AMT-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE GENERATED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">UNIT CONTEXT:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">ACTION STATUS:</td>
            <td className="border border-black p-2 font-bold">
              <span className="text-rose-700">{overdueRisks.length} Overdue</span> |{' '}
              <span className="text-amber-700">{inProgressRisks.length} Active</span> |{' '}
              <span className="text-emerald-700">{completedRisks.length} Closed</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* OVERDUE RISKS SECTION */}
      {overdueRisks.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-center gap-2 mb-1.5 text-rose-700 font-black uppercase text-[9pt] border-b-2 border-rose-600 pb-1 text-center">
            <span>⚠️ Critical Attention: Overdue Action Plans ({overdueRisks.length})</span>
          </div>
          <table className="w-full border-collapse border-2 border-rose-600 text-[8pt]">
            <thead>
              <tr className="bg-rose-100 font-black text-rose-900 uppercase">
                <th className="border border-rose-600 p-1.5 text-center w-[24%]">Objective & Origin</th>
                <th className="border border-rose-600 p-1.5 text-center w-[28%]">Committed Mitigation</th>
                <th className="border border-rose-600 p-1.5 text-center w-[18%]">Accountable Lead</th>
                <th className="border border-rose-600 p-1.5 text-center w-[12%]">Target Due Date</th>
                <th className="border border-rose-600 p-1.5 text-center w-[18%]">Reminders / Status</th>
              </tr>
            </thead>
            <tbody>
              {overdueRisks.map((r, i) => (
                <tr key={r.id || i} className="bg-rose-50/40">
                  <td className="border border-rose-400 p-1.5 align-top">
                    {renderOriginBadge(r, campusMap, unitMap)}
                    <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                    <p className="text-[7.5pt] text-slate-600 mt-0.5">{r.description}</p>
                  </td>
                  <td className="border border-rose-400 p-1.5 align-top font-medium">{r.treatmentAction || '—'}</td>
                  <td className="border border-rose-400 p-1.5 align-top font-bold text-slate-900">
                    {r.responsiblePersonName || 'Not Assigned'}
                  </td>
                  <td className="border border-rose-400 p-1.5 text-center align-top font-mono font-black text-rose-700">
                    {safeFormatDate(r.targetDate)}
                  </td>
                  <td className="border border-rose-400 p-1.5 text-center align-top font-bold">
                    <span className="bg-rose-200 text-rose-800 px-2 py-0.5 rounded text-[7.5pt] font-black">
                      ⚠️ OVERDUE
                    </span>
                    {r.remindersSent ? (
                      <p className="text-[7pt] text-slate-500 font-normal mt-0.5">Notice #{r.remindersSent} Sent</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ACTIVE & COMPLETED TABLE */}
      <h3 className="text-[8.5pt] font-black uppercase tracking-wider mb-1.5 border-b border-black pb-1 text-center">
        Full Treatment Milestone Inventory
      </h3>
      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-black p-1.5 text-center w-[4%]">#</th>
            <th className="border border-black p-1.5 text-center w-[24%]">Objective & Origin</th>
            <th className="border border-black p-1.5 text-center w-[28%]">Mitigation Strategy</th>
            <th className="border border-black p-1.5 text-center w-[16%]">Accountable Lead</th>
            <th className="border border-black p-1.5 text-center w-[12%]">Target Date</th>
            <th className="border border-black p-1.5 text-center w-[16%]">Current Milestone</th>
          </tr>
        </thead>
        <tbody>
          {activeRisks.map((r, i) => (
            <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-black p-1.5 text-center font-bold">{i + 1}</td>
              <td className="border border-black p-1.5 align-top">
                {renderOriginBadge(r, campusMap, unitMap)}
                <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                <p className="text-[7.5pt] text-slate-600 mt-0.5 line-clamp-2">{r.description}</p>
              </td>
              <td className="border border-black p-1.5 align-top font-medium">{r.treatmentAction || '—'}</td>
              <td className="border border-black p-1.5 align-top font-bold text-slate-900">
                {r.responsiblePersonName || 'Unit Focal Person'}
              </td>
              <td className="border border-black p-1.5 text-center align-top font-mono font-bold">
                {safeFormatDate(r.targetDate)}
              </td>
              <td className="border border-black p-1.5 text-center align-top font-bold">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[7pt] font-black ${
                    r.status === 'Closed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : r.status === 'In Progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* SIGNATORIES */}
      <div className="grid grid-cols-2 gap-8 text-[8.5pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-5">Generated & Verified by:</p>
          <div className="border-b border-black w-48 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'QMS Focal Lead'}</p>
          <p className="text-[7.5pt] text-slate-500">Quality Management System Division</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-5">Noted by QAO Director:</p>
          <div className="border-b border-black w-48 ml-auto mb-1"></div>
          <p className="font-black uppercase">{signatories?.qaoDirector || 'Director, Quality Assurance'}</p>
          <p className="text-[7.5pt] text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   4. RESIDUAL RISK & TREATMENT EFFECTIVENESS VERIFICATION DOSSIER
   ========================================================================= */
export function RiskEffectivenessAuditTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
}: BasePrintProps) {
  const today = new Date();
  const verifiedRisks = risks.filter(
    (r) => r.postTreatment || r.verification || r.status === 'Closed' || (r.type === 'Risk' && r.treatmentAction),
  );

  return (
    <div
      className="p-8 text-black bg-white max-w-[13in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '8.5pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Internal Quality Audit Committee • ISO 21001:2018 Clause 6.1 Audit Dossier
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          RESIDUAL RISK & TREATMENT EFFECTIVENESS VERIFICATION AUDIT DOSSIER
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          ISO 21001:2018 / ISO 9001:2015 Clause 6.1 — Fiscal Year {year}
        </p>
      </div>

      {/* 3. METADATA TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-3">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-IQA-EVD-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE AUDITED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">AUDITEE UNIT:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">STANDARD:</td>
            <td className="border border-black p-2 font-bold">ISO 21001:2018 & ISO 9001:2015 Clause 6.1</td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-black p-1.5 text-center w-[22%]">Objective & Auditee Origin</th>
            <th className="border border-black p-1.5 text-center w-[7%]">Pre-Mag</th>
            <th className="border border-black p-1.5 text-center w-[21%]">Implemented Treatment Action</th>
            <th className="border border-black p-1.5 text-center w-[7%]">Post-Mag</th>
            <th className="border border-black p-1.5 text-center w-[8%]">Delta Drop</th>
            <th className="border border-black p-1.5 text-center w-[23%]">Documentary Evidence / Verification</th>
            <th className="border border-black p-1.5 text-center w-[12%]">QA Verdict</th>
          </tr>
        </thead>
        <tbody>
          {verifiedRisks.map((r, i) => {
            const preMag = r.preTreatment?.magnitude || 0;
            const postMag = r.postTreatment?.magnitude || 0;
            const drop = preMag - postMag;
            const isEffective = drop > 0 || r.preTreatment?.rating === 'Low';

            return (
              <tr key={r.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="border border-black p-1.5 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                  <p className="text-[7.5pt] text-slate-600 mt-0.5 line-clamp-2">{r.description}</p>
                </td>
                <td
                  className="border border-black p-1.5 text-center align-top font-bold"
                  style={{ color: getRatingColor(r.preTreatment?.rating) }}
                >
                  {preMag} ({r.preTreatment?.rating?.charAt(0)})
                </td>
                <td className="border border-black p-1.5 align-top">{r.treatmentAction || '—'}</td>
                <td
                  className="border border-black p-1.5 text-center align-top font-bold"
                  style={{ color: getRatingColor(r.postTreatment?.rating || '') }}
                >
                  {postMag || '—'}
                </td>
                <td className="border border-black p-1.5 text-center align-top font-black">
                  {drop > 0 ? (
                    <span className="text-emerald-700">▼ -{drop}</span>
                  ) : drop === 0 ? (
                    <span className="text-slate-500">0 (Par)</span>
                  ) : (
                    <span className="text-rose-700">▲ +{Math.abs(drop)}</span>
                  )}
                </td>
                <td className="border border-black p-1.5 align-top text-[7.5pt]">
                  <p className="font-medium text-slate-800">
                    {r.postTreatment?.evidence || r.verification?.evidence || 'Attached in QAO-00-027'}
                  </p>
                  {r.auditorRemarks && <p className="text-indigo-700 font-bold mt-0.5">Auditor: {r.auditorRemarks}</p>}
                </td>
                <td className="border border-black p-1.5 text-center align-top">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[7pt] font-black ${
                      r.verification?.status === 'Correct' || r.verification?.status === 'Implemented' || isEffective
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.verification?.status || (isEffective ? 'EFFECTIVE' : 'FOR REVIEW')}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* AUDIT SIGN-OFF */}
      <div className="grid grid-cols-2 gap-8 text-[8.5pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-5">Lead Internal Quality Auditor:</p>
          <div className="border-b border-black w-48 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'Certified ISO Auditor'}</p>
          <p className="text-[7.5pt] text-slate-500">IQA Verification Team Lead</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-5">Confirmed & Registered:</p>
          <div className="border-b border-black w-48 ml-auto mb-1"></div>
          <p className="font-black uppercase">{signatories?.qaoDirector || 'QAO Director'}</p>
          <p className="text-[7.5pt] text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   5. OPPORTUNITY CAPITALIZATION & STRATEGIC INNOVATION SCORECARD
   ========================================================================= */
export function OpportunityInnovationTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
}: BasePrintProps) {
  const today = new Date();
  const opportunities = risks.filter((r) => r.type === 'Opportunity');
  const capturedCount = opportunities.filter(
    (r) => r.status === 'Closed' || (r.postTreatment && r.postTreatment.evidence),
  ).length;

  return (
    <div
      className="p-8 text-black bg-white max-w-[11.5in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '8.5pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">
          Office of Strategic Planning, Innovation & Linkages
        </h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. DOCUMENT TITLE STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          OPPORTUNITY CAPITALIZATION & STRATEGIC INNOVATION SCORECARD
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          Strategic Opportunity Capture & Innovation Monitoring — Fiscal Year {year}
        </p>
      </div>

      {/* 3. METADATA TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-QAO-OCS-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE ISSUED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">UNIT CONTEXT:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">CAPITALIZATION:</td>
            <td className="border border-black p-2 font-bold">
              <span className="text-emerald-700 font-black">
                {opportunities.length > 0 ? Math.round((capturedCount / opportunities.length) * 100) : 0}% (
                {capturedCount} Realized)
              </span>{' '}
              / {opportunities.length} Identified
            </td>
          </tr>
        </tbody>
      </table>

      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-black p-1.5 text-center w-[5%]">#</th>
            <th className="border border-black p-1.5 text-center w-[24%]">Strategic Objective & Origin</th>
            <th className="border border-black p-1.5 text-center w-[26%]">Opportunity Description & Potential</th>
            <th className="border border-black p-1.5 text-center w-[25%]">Capitalization Plan / Enhancement Action</th>
            <th className="border border-black p-1.5 text-center w-[10%]">Target Date</th>
            <th className="border border-black p-1.5 text-center w-[10%]">Realization Status</th>
          </tr>
        </thead>
        <tbody>
          {opportunities.map((o, i) => (
            <tr key={o.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="border border-black p-1.5 text-center font-bold">{i + 1}</td>
              <td className="border border-black p-1.5 font-bold align-top">
                {renderOriginBadge(o, campusMap, unitMap)}
                <p className="font-bold text-slate-900 leading-snug">{o.objective}</p>
              </td>
              <td className="border border-black p-1.5 align-top leading-snug">{o.description}</td>
              <td className="border border-black p-1.5 align-top font-medium">{o.treatmentAction || '—'}</td>
              <td className="border border-black p-1.5 text-center align-top font-mono">
                {safeFormatDate(o.targetDate)}
              </td>
              <td className="border border-black p-1.5 text-center align-top font-bold">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[7.5pt] font-black ${
                    o.status === 'Closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {o.status === 'Closed' ? 'REALIZED' : o.status}
                </span>
              </td>
            </tr>
          ))}
          {opportunities.length === 0 && (
            <tr>
              <td colSpan={6} className="text-center p-6 text-slate-500 font-bold border border-black">
                No opportunities logged for this fiscal year.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* SIGNATORIES */}
      <div className="grid grid-cols-2 gap-8 text-[8.5pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-5">Submitted by Unit Head:</p>
          <div className="border-b border-black w-44 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'Unit Head'}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-5">Noted for Strategic Planning:</p>
          <div className="border-b border-black w-44 ml-auto mb-1"></div>
          <p className="font-black uppercase">
            {signatories?.qaoDirector || 'Vice President for Academic / Research Affairs'}
          </p>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   6. UNIT RISK TREATMENT STATUS & ACTION REMINDER NOTICE (MEMORANDUM)
   ========================================================================= */
export function RiskStatusReminderNoticeTemplate({
  risks,
  unitName,
  campusName,
  year,
  signatories,
  unitMap,
  campusMap,
}: BasePrintProps) {
  const today = new Date();
  const activeRisks = risks.filter((r) => r.type === 'Risk');

  const overdueRisks = activeRisks.filter((r) => {
    if (r.status === 'Closed') return false;
    if (!r.targetDate) return false;
    const target = r.targetDate instanceof Timestamp ? r.targetDate.toDate() : new Date(r.targetDate);
    return target < today;
  });

  const inProgressRisks = activeRisks.filter((r) => r.status === 'In Progress' && !overdueRisks.includes(r));
  const openPendingRisks = activeRisks.filter((r) => r.status === 'Open' && !overdueRisks.includes(r));
  const closedRisks = activeRisks.filter((r) => r.status === 'Closed');

  const pendingCount = overdueRisks.length + inProgressRisks.length + openPendingRisks.length;

  return (
    <div
      className="p-8 text-black bg-white max-w-[11.5in] mx-auto font-sans leading-tight print:p-2 print:max-w-full"
      style={{ fontSize: '8.5pt' }}
    >
      {/* 1. INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-4">
        <p className="text-[8.5pt] font-bold uppercase tracking-wider text-slate-700 m-0">
          Republic of the Philippines
        </p>
        <h1 className="text-base md:text-lg font-black uppercase tracking-tight text-slate-900 m-0 my-1">
          ROMBLON STATE UNIVERSITY
        </h1>
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 m-0">Quality Assurance Office</h2>
        <p className="text-[8pt] italic text-slate-600 m-0">Main Campus, Odiongan, Romblon</p>
      </div>

      {/* 2. OFFICIAL MEMORANDUM STRIP */}
      <div className="border-y-2 border-black py-2 mb-4 bg-slate-50 text-center">
        <h2 className="text-xs font-black uppercase tracking-[0.15em] text-slate-900 m-0">
          MEMORANDUM: RISK TREATMENT PLAN STATUS & ACTION REMINDER NOTICE
        </h2>
        <p className="text-[7.5pt] font-bold uppercase tracking-wider text-slate-600 m-0 mt-0.5">
          ISO 21001:2018 Clause 6.1 (Actions to Address Risks & Opportunities) & Institutional QMS Compliance
        </p>
      </div>

      {/* 3. MEMORANDUM DETAILS TABLE */}
      <table className="w-full border-collapse border border-black text-[8.5pt] mb-4">
        <tbody>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">REF NO:</td>
            <td className="border border-black p-2 font-mono font-bold w-[35%]">
              RSU-QAO-RTN-{year}-{format(today, 'MMdd')}
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase w-[15%]">DATE ISSUED:</td>
            <td className="border border-black p-2 font-bold w-[35%]">{format(today, 'MMMM d, yyyy')}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">FOR / TO:</td>
            <td className="border border-black p-2 font-black uppercase text-slate-900">
              {unitName} ({campusName})
            </td>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">MONITORING YEAR:</td>
            <td className="border border-black p-2 font-bold">Fiscal Year {year}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">ATTENTION:</td>
            <td colSpan={3} className="border border-black p-2 font-bold">
              Unit Head, Risk Leads, QMS Focal Persons & Process Owners
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2 font-bold bg-slate-100 uppercase">SUBJECT:</td>
            <td colSpan={3} className="border border-black p-2 font-black uppercase underline">
              COMPLIANCE DIRECTIVE ON OVERDUE AND PENDING RISK TREATMENT ACTIONS & EVIDENCE VERIFICATION
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. SUMMARY STATUS METRIC CARDS */}
      <div className="grid grid-cols-4 gap-3 mb-4 text-center">
        <div className="border border-black p-2.5 rounded bg-slate-50">
          <p className="text-[7pt] font-black uppercase text-slate-600 tracking-wider">Total Unit Risks</p>
          <p className="text-xl font-black text-slate-900 my-0.5">{activeRisks.length}</p>
          <p className="text-[7pt] text-slate-600 font-bold">{pendingCount} Action Required</p>
        </div>
        <div className="border border-rose-600 p-2.5 rounded bg-rose-50/70">
          <p className="text-[7pt] font-black uppercase text-rose-800 tracking-wider">Overdue Treatments</p>
          <p className="text-xl font-black text-rose-700 my-0.5">{overdueRisks.length}</p>
          <p className="text-[7pt] text-rose-700 font-bold">Past Committed Deadline</p>
        </div>
        <div className="border border-amber-600 p-2.5 rounded bg-amber-50/70">
          <p className="text-[7pt] font-black uppercase text-amber-800 tracking-wider">In Progress / Pending</p>
          <p className="text-xl font-black text-amber-700 my-0.5">{inProgressRisks.length + openPendingRisks.length}</p>
          <p className="text-[7pt] text-amber-700 font-bold">Active Implementation</p>
        </div>
        <div className="border border-emerald-600 p-2.5 rounded bg-emerald-50/70">
          <p className="text-[7pt] font-black uppercase text-emerald-800 tracking-wider">Closed / Completed</p>
          <p className="text-xl font-black text-emerald-700 my-0.5">{closedRisks.length}</p>
          <p className="text-[7pt] text-emerald-700 font-bold">Verified Controls</p>
        </div>
      </div>

      {/* 5. DIRECTIVE STATEMENT */}
      <div className="border-l-4 border-rose-600 bg-rose-50/50 p-2.5 rounded-r text-[8pt] mb-4 text-slate-800 border-y border-r border-slate-300">
        <p className="font-bold text-rose-900 mb-0.5">COMPLIANCE DIRECTIVE:</p>
        <p className="leading-snug">
          Pursuant to RSU QMS & ISO 21001:2018 requirements, all operational units are instructed to expedite pending
          risk treatment actions, record progress in the digital register, and upload signed verification evidence (Form
          QAO-00-027) prior to the upcoming Internal Quality Audit.
        </p>
      </div>

      {/* 6. DETAILED ACTION ITEMS TABLE */}
      <h3 className="text-[8.5pt] font-black uppercase tracking-wider mb-1.5 border-b border-black pb-1 text-center">
        Unit Risk Treatment Action Inventory & Current Status
      </h3>
      <table className="w-full border-collapse border-2 border-black text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-black p-1.5 text-center w-[4%]">#</th>
            <th className="border border-black p-1.5 text-center w-[22%]">Objective & Origin Context</th>
            <th className="border border-black p-1.5 text-center w-[8%]">Severity</th>
            <th className="border border-black p-1.5 text-center w-[26%]">Committed Mitigation Strategy</th>
            <th className="border border-black p-1.5 text-center w-[16%]">Accountable Lead</th>
            <th className="border border-black p-1.5 text-center w-[10%]">Target Date</th>
            <th className="border border-black p-1.5 text-center w-[14%]">Current Status</th>
          </tr>
        </thead>
        <tbody>
          {activeRisks.map((r, i) => {
            const isOverdue = overdueRisks.includes(r);
            const isClosed = r.status === 'Closed';

            return (
              <tr
                key={r.id || i}
                className={
                  isOverdue
                    ? 'bg-rose-50/60 font-medium'
                    : isClosed
                      ? 'bg-emerald-50/20'
                      : i % 2 === 0
                        ? 'bg-white'
                        : 'bg-slate-50'
                }
              >
                <td className="border border-black p-1.5 text-center font-bold">{i + 1}</td>
                <td className="border border-black p-1.5 align-top">
                  {renderOriginBadge(r, campusMap, unitMap)}
                  <p className="font-bold text-slate-900 leading-snug">{r.objective}</p>
                  <p className="text-[7.5pt] text-slate-600 line-clamp-2 mt-0.5">{r.description}</p>
                </td>
                <td
                  className="border border-black p-1.5 text-center align-top font-bold"
                  style={{ color: getRatingColor(r.preTreatment?.rating) }}
                >
                  {r.preTreatment?.rating || '—'}
                </td>
                <td className="border border-black p-1.5 align-top font-medium">{r.treatmentAction || '—'}</td>
                <td className="border border-black p-1.5 align-top font-bold text-slate-900">
                  {r.responsiblePersonName || 'Unit Focal Person'}
                </td>
                <td className="border border-black p-1.5 text-center align-top font-mono font-bold">
                  {safeFormatDate(r.targetDate)}
                </td>
                <td className="border border-black p-1.5 text-center align-top font-bold">
                  {isOverdue ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[7.5pt] font-black bg-rose-200 text-rose-900 border border-rose-300 shadow-2xs">
                      ⚠️ OVERDUE
                    </span>
                  ) : isClosed ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[7.5pt] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ CLOSED
                    </span>
                  ) : r.status === 'In Progress' ? (
                    <span className="inline-block px-2 py-0.5 rounded text-[7.5pt] font-black bg-amber-100 text-amber-800 border border-amber-200">
                      ⏳ IN PROGRESS
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded text-[7.5pt] font-black bg-slate-200 text-slate-800 border border-slate-300">
                      OPEN PENDING
                    </span>
                  )}
                  {r.remindersSent ? (
                    <p className="text-[6.5pt] text-slate-500 font-normal mt-0.5">Notice #{r.remindersSent}</p>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* 7. SIGNATORIES */}
      <div className="grid grid-cols-2 gap-8 text-[8.5pt] pt-4 border-t border-slate-300">
        <div>
          <p className="font-bold text-slate-600 mb-5">Issued by Quality Assurance Office:</p>
          <div className="border-b border-black w-48 mb-1"></div>
          <p className="font-black uppercase">{signatories?.qmsHead || 'QMS Lead Officer'}</p>
          <p className="text-[7.5pt] text-slate-500">Quality Management System Division</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-slate-600 mb-5">Noted & Endorsed by Director:</p>
          <div className="border-b border-black w-48 ml-auto mb-1"></div>
          <p className="font-black uppercase">{signatories?.qaoDirector || 'Director, Quality Assurance'}</p>
          <p className="text-[7.5pt] text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>
    </div>
  );
}
