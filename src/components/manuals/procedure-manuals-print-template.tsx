'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { UniversityHeading } from '@/components/common/university-heading';

export type ProcedureManualReportRow = {
  unitId: string;
  unitName: string;
  category?: string;
  campusNames?: string;
  isShared?: boolean;
  procedureNumber: string;
  manualTitle: string;
  numberOfProcesses: string | number;
  revisionNumber: string;
  revisionDate: string;
  pageCount: string | number;
  status: 'Updated' | 'Needs Revision' | 'Not Submitted' | string;
  copiedFromUnitName?: string;
  hasData: boolean;
  hasDriveLink?: boolean;
};

export interface ProcedureManualCategorySummary {
  category: string;
  unitsCount: number;
  updatedCount: number;
  needsRevisionCount: number;
  notSubmittedCount: number;
  totalProcesses: number;
  coverage: number;
}

export interface ProcedureManualRevisionMaturityItem {
  revision: string;
  count: number;
}

export interface ProcedureManualTopProcessItem {
  unitName: string;
  fullName: string;
  processes: number;
  pages: number;
  category: string;
}

export interface ProcedureManualsMrPrintTemplateProps {
  rows: ProcedureManualReportRow[];
  totalUniversityUnits: number;
  categorySummary: ProcedureManualCategorySummary[];
  revisionMaturity: ProcedureManualRevisionMaturityItem[];
  topProcessUnits: ProcedureManualTopProcessItem[];
  filterScopeLabel: string;
  pendingRevisionsCount?: number;
  generatedBy?: string;
  qaoDirector?: string;
  qmsHead?: string;
  universityPresident?: string;
}

interface ProcedureManualsPrintTemplateProps {
  rows: ProcedureManualReportRow[];
  qaoDirector?: string;
  qmsHead?: string;
}

const pct = (value: number, total: number) => {
  if (!total || total <= 0) return 0;
  return Math.round((value / total) * 100);
};

export function ProcedureManualsMrPrintTemplate({
  rows,
  totalUniversityUnits,
  categorySummary,
  revisionMaturity,
  topProcessUnits,
  filterScopeLabel,
  pendingRevisionsCount = 0,
  generatedBy = 'Authorized EOMS User',
  qaoDirector = 'Director, Quality Assurance Office',
  qmsHead = 'Head, Quality Management System Unit',
  universityPresident = 'University President',
}: ProcedureManualsMrPrintTemplateProps) {
  const now = new Date();
  const refNo = `RSU-QAO-MR-PM-${now.getFullYear()}-${format(now, 'MMdd')}`;

  const totalUnits = rows.length;
  const updatedCount = rows.filter((r) => r.status === 'Updated').length;
  const needsRevisionCount = rows.filter((r) => r.status === 'Needs Revision').length;
  const notSubmittedCount = rows.filter(
    (r) => r.status === 'Not Submitted' || (!r.hasData && r.status !== 'Updated' && r.status !== 'Needs Revision'),
  ).length;
  const registeredCount = updatedCount + needsRevisionCount;
  const coveragePct = pct(registeredCount, totalUnits);
  const updatedPct = pct(updatedCount, totalUnits);
  const needsRevPct = pct(needsRevisionCount, totalUnits);
  const notSubmittedPct = pct(notSubmittedCount, totalUnits);

  const totalProcesses = rows.reduce((sum, r) => sum + (Number(r.numberOfProcesses) || 0), 0);
  const totalPages = rows.reduce((sum, r) => sum + (Number(r.pageCount) || 0), 0);
  const totalWithDriveLink = rows.filter((r) => r.hasDriveLink).length;
  const driveAccessibilityPct = pct(totalWithDriveLink, totalUnits);

  const needsRevisionUnits = rows.filter((r) => r.status === 'Needs Revision');
  const notSubmittedUnits = rows.filter(
    (r) => r.status === 'Not Submitted' || (!r.hasData && r.status !== 'Updated' && r.status !== 'Needs Revision'),
  );
  const missingDriveUnits = rows.filter((r) => r.hasData && !r.hasDriveLink);

  const maxRevCount = Math.max(...revisionMaturity.map((r) => r.count), 1);

  const getMrActionNote = (row: ProcedureManualReportRow) => {
    if (
      row.status === 'Not Submitted' ||
      (!row.hasData && row.status !== 'Updated' && row.status !== 'Needs Revision')
    ) {
      return 'Action Required: Submit initial codified Procedure Manual & SOP list';
    }
    if (row.status === 'Needs Revision') {
      return 'For MR Follow-up: Submit DRRF & revised manual for QAO review';
    }
    if (!row.hasDriveLink) {
      return 'Updated Manual: Attach verified digital Drive link for Clause 7.5 access';
    }
    if (!row.numberOfProcesses || Number(row.numberOfProcesses) === 0) {
      return 'Updated Manual: Encode individual SOP process inventory in registry';
    }
    return 'Compliant & Active: Maintain implementation & periodic review';
  };

  return (
    <div
      className="p-0 text-black bg-white mx-auto font-sans leading-tight"
      style={{ width: '12.2in', maxWidth: '100%', fontSize: '8.5pt' }}
    >
      <UniversityHeading
        officeName="QUALITY ASSURANCE OFFICE"
        subOffice="Quality Management System Unit • Institutional EOMS (ISO 21001 & ISO 9001)"
        reportTitle="STATUS OF UNIT PROCEDURE MANUALS FOR MANAGEMENT REVIEW DISCUSSION"
        reportSubtitle="University Manuals Visualization, Compliance Status, Process Density & Management Review Agenda Brief"
        refNo={refNo}
        datePrinted={now}
      />

      {/* MANAGEMENT REVIEW CONTEXT & SCOPE TABLE */}
      <table className="w-full border-collapse border border-black mb-3" style={{ fontSize: '7.5pt' }}>
        <tbody>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[16%]">MR Agenda Item:</td>
            <td className="border border-black p-1.5 font-bold text-slate-900 w-[34%]">
              Status of Unit Procedure Manuals & Documented Information (ISO 21001 Cl. 7.5 & Cl. 9.3)
            </td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[16%]">Report Scope:</td>
            <td className="border border-black p-1.5 font-semibold w-[34%]">{filterScopeLabel}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">Units Covered:</td>
            <td className="border border-black p-1.5 font-semibold">
              {totalUnits} of {totalUniversityUnits} University Unit(s)
            </td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">Prepared / Printed By:</td>
            <td className="border border-black p-1.5 font-semibold">{generatedBy}</td>
          </tr>
        </tbody>
      </table>

      {/* EXECUTIVE KPI SUMMARY STRIP */}
      <div className="grid grid-cols-6 gap-2 mb-3 text-center">
        <div className="border border-slate-900 p-2 bg-slate-50">
          <p className="font-black uppercase text-slate-600" style={{ fontSize: '6.5pt' }}>
            Units in Scope
          </p>
          <p className="font-black text-slate-900" style={{ fontSize: '15pt' }}>
            {totalUnits}
          </p>
          <p className="font-semibold text-slate-500" style={{ fontSize: '6pt' }}>
            Colleges & Offices
          </p>
        </div>

        <div className="border border-indigo-800 p-2 bg-indigo-50/70">
          <p className="font-black uppercase text-indigo-800" style={{ fontSize: '6.5pt' }}>
            QMS Coverage Rate
          </p>
          <p className="font-black text-indigo-900" style={{ fontSize: '15pt' }}>
            {coveragePct}%
          </p>
          <p className="font-semibold text-indigo-700" style={{ fontSize: '6pt' }}>
            {registeredCount} of {totalUnits} Codified
          </p>
        </div>

        <div className="border border-emerald-800 p-2 bg-emerald-50">
          <p className="font-black uppercase text-emerald-800" style={{ fontSize: '6.5pt' }}>
            Updated & Active
          </p>
          <p className="font-black text-emerald-900" style={{ fontSize: '15pt' }}>
            {updatedCount}
          </p>
          <p className="font-semibold text-emerald-700" style={{ fontSize: '6pt' }}>
            {updatedPct}% Fully Compliant
          </p>
        </div>

        <div className="border border-amber-700 p-2 bg-amber-50">
          <p className="font-black uppercase text-amber-800" style={{ fontSize: '6.5pt' }}>
            Needs Revision
          </p>
          <p className="font-black text-amber-900" style={{ fontSize: '15pt' }}>
            {needsRevisionCount}
          </p>
          <p className="font-semibold text-amber-800" style={{ fontSize: '6pt' }}>
            {needsRevPct}% Flagged for DRRF
          </p>
        </div>

        <div className="border border-rose-800 p-2 bg-rose-50">
          <p className="font-black uppercase text-rose-800" style={{ fontSize: '6.5pt' }}>
            Not Submitted
          </p>
          <p className="font-black text-rose-900" style={{ fontSize: '15pt' }}>
            {notSubmittedCount}
          </p>
          <p className="font-semibold text-rose-700" style={{ fontSize: '6pt' }}>
            {notSubmittedPct}% Pending Action
          </p>
        </div>

        <div className="border border-sky-800 p-2 bg-sky-50/70">
          <p className="font-black uppercase text-sky-800" style={{ fontSize: '6.5pt' }}>
            Codified SOPs & Cloud
          </p>
          <p className="font-black text-sky-900" style={{ fontSize: '15pt' }}>
            {totalProcesses}
          </p>
          <p className="font-semibold text-sky-700" style={{ fontSize: '6pt' }}>
            {totalPages} Pgs • {driveAccessibilityPct}% Cloud Linked
          </p>
        </div>
      </div>

      {/* VISUALIZATION & ANALYTICAL BREAKDOWN FOR MANAGEMENT REVIEW */}
      <div className="grid grid-cols-12 gap-3 mb-3 break-inside-avoid">
        {/* PANEL 1: STATUS HEALTH DISTRIBUTION */}
        <div className="col-span-4 border border-black p-2.5 bg-white">
          <div className="border-b border-slate-300 pb-1 mb-2 flex items-center justify-between">
            <h4 className="font-black uppercase tracking-wider text-slate-900" style={{ fontSize: '7.5pt' }}>
              1. Manual Status Health Distribution
            </h4>
            <span className="font-mono font-bold text-slate-600" style={{ fontSize: '6.5pt' }}>
              ISO 21001 Cl. 7.5
            </span>
          </div>

          {/* Stacked Bar */}
          <div className="w-full h-5 border border-slate-600 bg-slate-100 flex overflow-hidden mb-2">
            {updatedCount > 0 && (
              <div
                style={{ width: `${updatedPct}%`, backgroundColor: '#10b981', fontSize: '6.5pt' }}
                className="h-full flex items-center justify-center text-white font-black"
              >
                {updatedPct >= 10 ? `${updatedPct}%` : ''}
              </div>
            )}
            {needsRevisionCount > 0 && (
              <div
                style={{ width: `${needsRevPct}%`, backgroundColor: '#f59e0b', fontSize: '6.5pt' }}
                className="h-full flex items-center justify-center text-slate-950 font-black"
              >
                {needsRevPct >= 10 ? `${needsRevPct}%` : ''}
              </div>
            )}
            {notSubmittedCount > 0 && (
              <div
                style={{ width: `${notSubmittedPct}%`, backgroundColor: '#f43f5e', fontSize: '6.5pt' }}
                className="h-full flex items-center justify-center text-white font-black"
              >
                {notSubmittedPct >= 10 ? `${notSubmittedPct}%` : ''}
              </div>
            )}
          </div>

          <table className="w-full border-collapse border border-slate-300" style={{ fontSize: '7pt' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1 text-left font-black uppercase">Status Classification</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase w-14">Units</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase w-14">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-1 font-bold text-emerald-900">
                  <span className="inline-block w-2 h-2 mr-1.5" style={{ backgroundColor: '#10b981' }} />
                  Updated (Active)
                </td>
                <td className="border border-slate-300 p-1 text-center font-black">{updatedCount}</td>
                <td className="border border-slate-300 p-1 text-center font-mono">{updatedPct}%</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 font-bold text-amber-900">
                  <span className="inline-block w-2 h-2 mr-1.5" style={{ backgroundColor: '#f59e0b' }} />
                  Needs Revision
                </td>
                <td className="border border-slate-300 p-1 text-center font-black">{needsRevisionCount}</td>
                <td className="border border-slate-300 p-1 text-center font-mono">{needsRevPct}%</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-1 font-bold text-rose-900">
                  <span className="inline-block w-2 h-2 mr-1.5" style={{ backgroundColor: '#f43f5e' }} />
                  Not Submitted / Pending
                </td>
                <td className="border border-slate-300 p-1 text-center font-black">{notSubmittedCount}</td>
                <td className="border border-slate-300 p-1 text-center font-mono">{notSubmittedPct}%</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-1.5 text-slate-600 leading-snug" style={{ fontSize: '6.5pt' }}>
            <strong>Digital Availability:</strong> {totalWithDriveLink} of {totalUnits} units ({driveAccessibilityPct}%)
            have controlled Google Drive preview links attached; {missingDriveUnits.length} codified manual(s) require
            link attachment.
          </p>
        </div>

        {/* PANEL 2: CATEGORY BREAKDOWN */}
        <div className="col-span-5 border border-black p-2.5 bg-white">
          <div className="border-b border-slate-300 pb-1 mb-2 flex items-center justify-between">
            <h4 className="font-black uppercase tracking-wider text-slate-900" style={{ fontSize: '7.5pt' }}>
              2. Compliance & Process Density by Unit Category
            </h4>
            <span className="font-mono font-bold text-slate-600" style={{ fontSize: '6.5pt' }}>
              Category Benchmark
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300" style={{ fontSize: '6.8pt' }}>
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1 text-left font-black uppercase">Category</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase">Units</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase text-emerald-800">
                  Updated
                </th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase text-amber-800">
                  Needs Rev
                </th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase text-rose-800">Pending</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase">SOPs</th>
                <th className="border border-slate-300 p-1 text-center font-black uppercase">Updated %</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((cat) => (
                <tr key={cat.category}>
                  <td className="border border-slate-300 p-1 font-bold">{cat.category}</td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">{cat.unitsCount}</td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-emerald-800">
                    {cat.updatedCount}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-amber-800">
                    {cat.needsRevisionCount}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold text-rose-800">
                    {cat.notSubmittedCount}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-mono font-bold">{cat.totalProcesses}</td>
                  <td className="border border-slate-300 p-1 text-center font-mono font-black">{cat.coverage}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {topProcessUnits.length > 0 && (
            <div className="mt-2 pt-1.5 border-t border-slate-200" style={{ fontSize: '6.5pt' }}>
              <span className="font-black uppercase text-slate-700">Top Units by Codified SOP Processes: </span>
              <span className="text-slate-600">
                {topProcessUnits
                  .slice(0, 4)
                  .map((u) => `${u.fullName} (${u.processes} SOPs)`)
                  .join(' • ')}
              </span>
            </div>
          )}
        </div>

        {/* PANEL 3: REVISION MATURITY */}
        <div className="col-span-3 border border-black p-2.5 bg-white">
          <div className="border-b border-slate-300 pb-1 mb-2 flex items-center justify-between">
            <h4 className="font-black uppercase tracking-wider text-slate-900" style={{ fontSize: '7.5pt' }}>
              3. Revision Maturity (CQI)
            </h4>
            <span className="font-mono font-bold text-slate-600" style={{ fontSize: '6.5pt' }}>
              Cl. 10.2
            </span>
          </div>

          <div className="space-y-1.5">
            {revisionMaturity.map((item) => (
              <div key={item.revision}>
                <div className="flex justify-between font-bold" style={{ fontSize: '6.5pt' }}>
                  <span>{item.revision}</span>
                  <span className="font-mono">{item.count} manual(s)</span>
                </div>
                <div className="w-full h-2.5 border border-slate-400 bg-slate-100 mt-0.5">
                  <div
                    className="h-full"
                    style={{
                      width: `${pct(item.count, maxRevCount)}%`,
                      backgroundColor: '#4f46e5',
                      minWidth: item.count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className="mt-2 pt-1.5 border-t border-slate-200 text-slate-600 leading-snug"
            style={{ fontSize: '6.5pt' }}
          >
            <strong>DRRF Activity:</strong>{' '}
            {pendingRevisionsCount > 0
              ? `${pendingRevisionsCount} revision application(s) logged in the DRRF workflow.`
              : 'Revision levels reflect approved manual updates via the DRRF workflow.'}
          </div>
        </div>
      </div>

      {/* MANAGEMENT REVIEW DISCUSSION AGENDA & ACTIONABLE DECISIONS BLOCK */}
      <div className="border-2 border-slate-900 bg-slate-50/70 p-3 mb-3 break-inside-avoid">
        <div className="flex items-center justify-between border-b border-slate-400 pb-1.5 mb-2">
          <h3 className="font-black uppercase tracking-wider text-slate-900" style={{ fontSize: '8.5pt' }}>
            MANAGEMENT REVIEW DISCUSSION BRIEF & RECOMMENDED DECISIONS (ISO 21001 CLAUSE 9.3)
          </h3>
          <span
            className="font-mono font-bold uppercase text-emerald-900 bg-emerald-100 border border-emerald-400 px-2 py-0.5"
            style={{ fontSize: '6.5pt' }}
          >
            For Top Management Deliberation
          </span>
        </div>

        <div className="grid grid-cols-12 gap-3" style={{ fontSize: '7.2pt' }}>
          {/* LEFT: PRIORITY UNITS FOR DISCUSSION */}
          <div className="col-span-6 space-y-1.5 border-r border-slate-300 pr-3">
            <p className="font-black uppercase text-slate-800">
              A. Current Status Observations & Priority Units for Discussion
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-800 leading-snug">
              <li>
                <strong>Overall Institutional Readiness:</strong> {updatedCount} of {totalUnits} units ({updatedPct}%)
                maintain <strong>Updated</strong> procedure manuals, with {totalProcesses} codified SOP processes and{' '}
                {totalPages} total documented pages across the university.
              </li>
              <li>
                <strong>Units Flagged &ldquo;Needs Revision&rdquo; ({needsRevisionUnits.length}):</strong>{' '}
                {needsRevisionUnits.length > 0 ? (
                  <span>
                    {needsRevisionUnits.map((u) => `${u.unitName} (${u.procedureNumber || 'No Code'})`).join('; ')}.
                  </span>
                ) : (
                  <span>No units are currently flagged as Needs Revision.</span>
                )}
              </li>
              <li>
                <strong>Units Marked &ldquo;Not Submitted&rdquo; ({notSubmittedUnits.length}):</strong>{' '}
                {notSubmittedUnits.length > 0 ? (
                  <span>
                    {notSubmittedUnits
                      .slice(0, 15)
                      .map((u) => u.unitName)
                      .join('; ')}
                    {notSubmittedUnits.length > 15 ? ` (+${notSubmittedUnits.length - 15} more in table below)` : ''}.
                  </span>
                ) : (
                  <span>All units in scope have submitted procedure manuals.</span>
                )}
              </li>
            </ul>
          </div>

          {/* RIGHT: RECOMMENDED MR DECISIONS */}
          <div className="col-span-6 space-y-1.5">
            <p className="font-black uppercase text-slate-800">
              B. Management Review Decisions & Directives to Consider
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-800 leading-snug">
              <li>
                <strong>Mandate Initial Codification for Non-Submitted Units:</strong> Direct unit heads of the{' '}
                {notSubmittedCount} pending unit(s) to submit their codified Procedure Manual and SOP inventory to the
                Quality Assurance Office within an agreed recovery timeline.
              </li>
              <li>
                <strong>Expedite DRRF Submissions for Manuals Needing Revision:</strong> Require the{' '}
                {needsRevisionCount} unit(s) marked <em>Needs Revision</em> to submit signed Document Registration and
                Revision Forms (DRRF) incorporating process updates and audit corrective actions.
              </li>
              <li>
                <strong>Enforce Digital Control & Point-of-Use Availability (Cl. 7.5.3):</strong> Ensure all registered
                manuals have verified Google Drive links ({totalUnits - totalWithDriveLink} unit(s) currently missing
                cloud links) and complete process lists.
              </li>
              <li>
                <strong>Record Action Owners & Deadlines in MR Minutes:</strong> Assign responsible unit heads,
                supervising VPs/Campus Directors, and target completion dates in the official Management Review Outputs
                register.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* UNIT-BY-UNIT STATUS REGISTER TABLE */}
      <div className="space-y-2 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="font-black uppercase tracking-wider text-slate-900" style={{ fontSize: '8.5pt' }}>
            UNIT PROCEDURE MANUALS STATUS & CONTROL REGISTER ({rows.length} UNITS)
          </h3>
          <p className="italic text-slate-600" style={{ fontSize: '7pt' }}>
            * Highlighted rows indicate units with <strong>Needs Revision</strong> or <strong>Not Submitted</strong>{' '}
            status requiring Management Review action.
          </p>
        </div>

        <table className="w-full border-collapse border border-black" style={{ fontSize: '7.5pt' }}>
          <thead>
            <tr className="bg-slate-200 text-black">
              <th className="border border-black p-1.5 text-center w-7 font-black uppercase">#</th>
              <th className="border border-black p-1.5 text-left w-24 font-black uppercase">Control No.</th>
              <th className="border border-black p-1.5 text-left font-black uppercase">Unit / Office Name</th>
              <th className="border border-black p-1.5 text-left w-28 font-black uppercase">Category / Site</th>
              <th className="border border-black p-1.5 text-left font-black uppercase">Procedure Manual Title</th>
              <th className="border border-black p-1.5 text-center w-14 font-black uppercase">SOPs</th>
              <th className="border border-black p-1.5 text-center w-20 font-black uppercase">Rev / Date</th>
              <th className="border border-black p-1.5 text-center w-12 font-black uppercase">Pages</th>
              <th className="border border-black p-1.5 text-center w-16 font-black uppercase">Cloud</th>
              <th className="border border-black p-1.5 text-center w-24 font-black uppercase">Status</th>
              <th className="border border-black p-1.5 text-left w-52 font-black uppercase">
                Management Review Discussion / Action
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isNotSubmitted =
                row.status === 'Not Submitted' ||
                (!row.hasData && row.status !== 'Updated' && row.status !== 'Needs Revision');
              const isNeedsRevision = row.status === 'Needs Revision';

              return (
                <tr
                  key={row.unitId}
                  className={cn(
                    'break-inside-avoid',
                    isNotSubmitted
                      ? 'bg-rose-50/90 font-medium'
                      : isNeedsRevision
                        ? 'bg-amber-50/90'
                        : idx % 2 === 1
                          ? 'bg-slate-50'
                          : 'bg-white',
                  )}
                >
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-mono font-bold">
                    {row.procedureNumber || <span className="text-slate-400 italic font-normal">Pending</span>}
                  </td>
                  <td className="border border-black p-1 font-bold">
                    <div>{row.unitName}</div>
                    {row.copiedFromUnitName && (
                      <div className="text-[6.5pt] font-normal italic text-blue-800">
                        (Inherits: {row.copiedFromUnitName})
                      </div>
                    )}
                    {row.isShared && (
                      <div className="text-[6.5pt] font-normal italic text-indigo-700">(Academic Shared Manual)</div>
                    )}
                  </td>
                  <td className="border border-black p-1">
                    <div className="font-bold text-[7pt] uppercase">{row.category || 'Support'}</div>
                    {row.campusNames && <div className="text-[6.5pt] text-slate-600">{row.campusNames}</div>}
                  </td>
                  <td className="border border-black p-1">
                    {row.manualTitle || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1 text-center font-mono font-bold">
                    {row.numberOfProcesses !== '' &&
                    row.numberOfProcesses !== undefined &&
                    row.numberOfProcesses !== 0 ? (
                      row.numberOfProcesses
                    ) : (
                      <span className="text-slate-400 italic font-normal">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">
                    <div className="font-bold">{row.revisionNumber || '—'}</div>
                    {row.revisionDate && <div className="text-[6.5pt] text-slate-600">{row.revisionDate}</div>}
                  </td>
                  <td className="border border-black p-1 text-center font-mono">
                    {row.pageCount !== '' && row.pageCount !== undefined && row.pageCount !== 0 ? (
                      row.pageCount
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center" style={{ fontSize: '6.5pt' }}>
                    {row.hasDriveLink ? (
                      <span className="font-bold text-emerald-800 uppercase">Linked</span>
                    ) : (
                      <span className="text-slate-400 italic">No Link</span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-center">
                    {row.status === 'Updated' ? (
                      <span className="font-black uppercase text-[6.5pt] text-emerald-900 px-1.5 py-0.5 bg-emerald-100 border border-emerald-400 rounded inline-block">
                        Updated
                      </span>
                    ) : row.status === 'Needs Revision' ? (
                      <span className="font-black uppercase text-[6.5pt] text-amber-950 px-1.5 py-0.5 bg-amber-200 border border-amber-500 rounded inline-block">
                        Needs Revision
                      </span>
                    ) : (
                      <span className="font-black uppercase text-[6.5pt] text-rose-950 px-1.5 py-0.5 bg-rose-200 border border-rose-400 rounded inline-block">
                        Not Submitted
                      </span>
                    )}
                  </td>
                  <td className="border border-black p-1 text-[6.8pt] leading-snug">{getMrActionNote(row)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SIGNATORIES BLOCK */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-left break-inside-avoid">
        <div className="space-y-1">
          <p className="font-bold uppercase text-[7.5pt] text-slate-600">PREPARED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[210px]"
            style={{ fontSize: '9pt' }}
          >
            {qmsHead}
          </p>
          <p className="font-bold uppercase text-[7.5pt]">Head, Quality Management System Unit</p>
        </div>

        <div className="space-y-1">
          <p className="font-bold uppercase text-[7.5pt] text-slate-600">REVIEWED & NOTED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[210px]"
            style={{ fontSize: '9pt' }}
          >
            {qaoDirector}
          </p>
          <p className="font-bold uppercase text-[7.5pt]">Director, Quality Assurance Office</p>
        </div>

        <div className="space-y-1">
          <p className="font-bold uppercase text-[7.5pt] text-slate-600">MANAGEMENT REVIEW CHAIR:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[210px]"
            style={{ fontSize: '9pt' }}
          >
            {universityPresident}
          </p>
          <p className="font-bold uppercase text-[7.5pt]">University President</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-6 pt-2 border-t border-black flex justify-between text-[7.5pt] text-slate-600 font-bold italic">
        <span>{refNo} | RSU-QAO-FOR-026 | ISO 21001 Clause 7.5 & Clause 9.3 Management Review Evidence</span>
        <span>Generated via RSU EOMS Digital Portal • {format(now, 'MMMM d, yyyy h:mm a')}</span>
      </div>
    </div>
  );
}

export function ProcedureManualsPrintTemplate({
  rows,
  qaoDirector = 'QAO Director',
  qmsHead = 'QMS Head',
}: ProcedureManualsPrintTemplateProps) {
  const totalUnits = rows.length;
  const updatedCount = rows.filter((r) => r.status === 'Updated').length;
  const needsRevisionCount = rows.filter((r) => r.status === 'Needs Revision').length;
  const notSubmittedCount = rows.filter((r) => r.status === 'Not Submitted' || !r.hasData).length;

  return (
    <div
      className="p-8 text-black bg-white max-w-[13in] mx-auto font-serif leading-tight print:p-0"
      style={{ fontSize: '9.5pt' }}
    >
      {/* INSTITUTIONAL LETTERHEAD */}
      <div className="text-center border-b-2 border-black pb-3 mb-6">
        <div className="space-y-1">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '13pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '11pt' }}>
            Quality Assurance Office
          </h2>
          <p className="text-[8.5pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      {/* MEMORANDUM DETAILS */}
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-0.5">
          <p className="font-bold uppercase tracking-wider">MEMORANDUM / INVENTORY REPORT</p>
          <p className="text-[8.5pt] font-mono">
            Ref No: RSU-QAO-PMI-{new Date().getFullYear()}-{format(new Date(), 'MMdd')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </div>

      {/* SUBJECT */}
      <div className="mb-5">
        <div className="grid grid-cols-12 gap-2 pt-1 border-t border-b border-black py-2 bg-slate-50">
          <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
          <span className="col-span-10 font-black uppercase underline decoration-1 underline-offset-2">
            UNIT PROCEDURE MANUALS INVENTORY AND STATUS REPORT
          </span>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-4 gap-3 mb-6 text-center">
        <div className="border border-black p-2 bg-slate-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-slate-700">Total Units / Groups</p>
          <p className="text-base font-black">{totalUnits}</p>
        </div>
        <div className="border border-black p-2 bg-emerald-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-emerald-800">Updated</p>
          <p className="text-base font-black text-emerald-900">{updatedCount}</p>
        </div>
        <div className="border border-black p-2 bg-amber-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-amber-800">Needs Revision</p>
          <p className="text-base font-black text-amber-900">{needsRevisionCount}</p>
        </div>
        <div className="border border-black p-2 bg-rose-50">
          <p className="text-[8pt] font-black uppercase tracking-wider text-rose-800">Not Submitted (Highlighted)</p>
          <p className="text-base font-black text-rose-900">{notSubmittedCount}</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="space-y-3 mb-8">
        <p className="text-[9pt] italic">
          * Highlighted rows indicate units with <strong>Not Submitted</strong> or missing data on their procedure
          manual. These units must be updated in the system settings.
        </p>

        <table className="w-full border-collapse border border-black" style={{ fontSize: '8.5pt' }}>
          <thead>
            <tr className="bg-slate-200 text-black">
              <th className="border border-black p-2 text-center w-8 font-black uppercase">#</th>
              <th className="border border-black p-2 text-left w-28 font-black uppercase">Procedure Number</th>
              <th className="border border-black p-2 text-left font-black uppercase">Unit</th>
              <th className="border border-black p-2 text-left font-black uppercase">Procedure Manual Title</th>
              <th className="border border-black p-2 text-center w-24 font-black uppercase">No. of Processes</th>
              <th className="border border-black p-2 text-center w-20 font-black uppercase">Revision No.</th>
              <th className="border border-black p-2 text-center w-24 font-black uppercase">Revision Date</th>
              <th className="border border-black p-2 text-center w-20 font-black uppercase">Total Pages</th>
              <th className="border border-black p-2 text-center w-28 font-black uppercase">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const isNotSubmitted = row.status === 'Not Submitted' || !row.hasData;
              const isNeedsRevision = row.status === 'Needs Revision';

              return (
                <tr
                  key={row.unitId}
                  className={cn(
                    isNotSubmitted
                      ? 'bg-rose-50/80 font-medium'
                      : isNeedsRevision
                        ? 'bg-amber-50/80'
                        : idx % 2 === 1
                          ? 'bg-slate-50'
                          : 'bg-white',
                  )}
                >
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-mono font-bold">
                    {row.procedureNumber || <span className="text-slate-400 italic font-normal">—</span>}
                  </td>
                  <td className="border border-black p-1.5 font-bold">
                    <div>{row.unitName}</div>
                    {row.copiedFromUnitName && (
                      <div className="text-[7.5pt] font-normal italic text-blue-800">
                        (Inherits: {row.copiedFromUnitName})
                      </div>
                    )}
                    {row.isShared && <span className="text-[7.5pt] italic text-blue-700">(Academic Shared)</span>}
                  </td>
                  <td className="border border-black p-1.5">
                    {row.manualTitle || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.numberOfProcesses !== '' && row.numberOfProcesses !== undefined ? (
                      row.numberOfProcesses
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {row.revisionNumber || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.revisionDate || <span className="text-slate-400 italic">—</span>}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.pageCount !== '' && row.pageCount !== undefined ? (
                      row.pageCount
                    ) : (
                      <span className="text-slate-400 italic">—</span>
                    )}
                  </td>
                  <td className="border border-black p-1.5 text-center">
                    {row.status === 'Updated' ? (
                      <span className="font-black uppercase text-[7.5pt] text-emerald-800 px-1.5 py-0.5 bg-emerald-100 border border-emerald-300 rounded">
                        Updated
                      </span>
                    ) : row.status === 'Needs Revision' ? (
                      <span className="font-black uppercase text-[7.5pt] text-amber-900 px-1.5 py-0.5 bg-amber-100 border border-amber-400 rounded">
                        Needs Revision
                      </span>
                    ) : (
                      <span className="font-black uppercase text-[7.5pt] text-rose-900 px-1.5 py-0.5 bg-rose-100 border border-rose-300 rounded">
                        Not Submitted
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SIGNATORIES BLOCK */}
      <div className="mt-12 grid grid-cols-2 gap-8 text-left break-inside-avoid">
        <div className="space-y-1">
          <p className="font-bold uppercase text-[8pt] text-slate-500">PREPARED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[200px]"
            style={{ fontSize: '10pt' }}
          >
            {qmsHead}
          </p>
          <p className="font-bold uppercase text-[8.5pt]">Head, Quality Management System Unit</p>
        </div>

        <div className="space-y-1">
          <p className="font-bold uppercase text-[8pt] text-slate-500">NOTED BY:</p>
          <p
            className="font-black uppercase pt-6 border-b border-black inline-block min-w-[200px]"
            style={{ fontSize: '10pt' }}
          >
            {qaoDirector}
          </p>
          <p className="font-bold uppercase text-[8.5pt]">Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-10 pt-4 border-t border-black flex justify-between text-[8pt] text-slate-600 font-bold italic">
        <span>RSU-QAO-FOR-026 | REV 01-2026</span>
        <span>Issued via RSU EOMS Digital Portal</span>
      </div>
    </div>
  );
}
