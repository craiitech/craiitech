'use client';

import React from 'react';
import type { ManagementReviewOutput, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { cn } from '@/lib/utils';

interface ActionableDecisionPrintTemplateProps {
  output: ManagementReviewOutput;
  reviewTitle?: string;
  reviewYear?: string;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  signatories?: Signatories;
}

export function ActionableDecisionPrintTemplate({
  output,
  reviewTitle,
  reviewYear,
  unitMap,
  campusMap,
  signatories,
}: ActionableDecisionPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MM/dd/yyyy');
  };

  const safeDateTime = (d: any) => {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MM/dd/yyyy hh:mm a');
  };

  const directorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';
  const qmsHeadName = signatories?.qmsHead || 'Head, Quality Management System Unit';
  const presidentName = signatories?.universityPresident || 'University President';

  const assignments = output.assignments || [];

  return (
    <div
      className="p-0 text-black bg-white mx-auto font-sans leading-tight"
      style={{ width: '7.5in', fontSize: '10pt' }}
    >
      {/* Header - Official Institutional Header */}
      <div className="text-center mb-4">
        <div className="flex flex-col items-center justify-center gap-0.5 mb-2">
          <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '13pt' }}>
            Romblon State University
          </h1>
          <h2 className="font-semibold uppercase tracking-wide" style={{ fontSize: '11pt' }}>
            Quality Assurance Office
          </h2>
          <p style={{ fontSize: '9pt' }} className="italic text-gray-700">
            Main Campus, Odiongan, Romblon | ISO 21001:2018 EOMS Certified
          </p>
        </div>
        <div className="mt-3 border-y-2 border-black py-2 bg-gray-50">
          <h2 className="font-black uppercase tracking-[0.15em]" style={{ fontSize: '12pt' }}>
            Management Review Actionable Decision Report
          </h2>
          <p className="text-[8.5pt] font-semibold text-gray-700 uppercase mt-0.5 tracking-wider">
            Directive Implementation &amp; Compliance Monitoring Record
          </p>
        </div>
      </div>

      {/* ISO Document Metadata Strip */}
      <div className="w-full border-2 border-black border-b-0 bg-gray-100/70 text-[8.5pt] font-mono">
        <div className="grid grid-cols-12 divide-x divide-black py-1 px-2">
          <div className="col-span-4">
            <span className="font-bold font-sans">Doc Code:</span> RSU-QAO-MRD-F01
          </div>
          <div className="col-span-3 text-center">
            <span className="font-bold font-sans">Rev No.:</span> 00
          </div>
          <div className="col-span-5 text-right">
            <span className="font-bold font-sans">Generated:</span> {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
      </div>

      {/* Primary Reference & Source Block */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 divide-x divide-black">
          <div className="col-span-7 p-2.5">
            <p className="text-[8pt] font-bold text-gray-600 uppercase tracking-wider">
              Management Review Source Session
            </p>
            <p className="font-bold uppercase text-[10.5pt] mt-0.5 text-black">
              {reviewTitle || 'Institutional Management Review'}
            </p>
            {reviewYear && (
              <span className="inline-block mt-1 bg-black text-white text-[8pt] font-black px-2 py-0.5 rounded">
                REVIEW YEAR {reviewYear}
              </span>
            )}
          </div>
          <div className="col-span-5 p-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[8pt] font-bold text-gray-600 uppercase tracking-wider">Minutes Line No.</p>
                <p className="font-mono font-bold text-[10pt] mt-0.5">
                  {output.lineNumber ? `Line ${output.lineNumber}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-[8pt] font-bold text-gray-600 uppercase tracking-wider">Current Status</p>
                <p className="font-black text-[9.5pt] uppercase mt-0.5">{output.status}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Origin & Deadline Row */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 divide-x divide-black">
          <div className="col-span-7 p-2.5">
            <p className="text-[8pt] font-bold text-gray-600 uppercase tracking-wider">
              Originating Authority / Initiator
            </p>
            <p className="font-bold text-[10pt] mt-0.5">{output.initiator}</p>
          </div>
          <div className="col-span-5 p-2.5">
            <p className="text-[8pt] font-bold text-gray-600 uppercase tracking-wider">Target Follow-Up / Deadline</p>
            <p className="font-black text-[10pt] mt-0.5 text-red-700">{safeDate(output.followUpDate)}</p>
          </div>
        </div>
      </div>

      {/* Section 1: Requirement / Directive Statement */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider">
          1. Institutional Decision &amp; Directive Statement
        </div>
        <div className="p-3 bg-white min-h-[70px]">
          <p className="text-[10.5pt] font-semibold leading-relaxed whitespace-pre-wrap italic">
            "{output.description}"
          </p>
        </div>
      </div>

      {/* Section 2: Accountability Matrix */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider">
          2. Designated Responsibility &amp; Accountability Matrix
        </div>
        <div className="p-3">
          {assignments.length > 0 ? (
            <table className="w-full border-collapse text-[9pt]">
              <thead>
                <tr className="bg-gray-100 border border-black text-left">
                  <th className="p-1.5 border-r border-black font-bold uppercase text-[8pt] w-10 text-center">#</th>
                  <th className="p-1.5 border-r border-black font-bold uppercase text-[8pt]">Campus Location</th>
                  <th className="p-1.5 font-bold uppercase text-[8pt]">Assigned Unit / Department / Scope</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i} className="border border-black">
                    <td className="p-1.5 border-r border-black text-center font-bold">{i + 1}</td>
                    <td className="p-1.5 border-r border-black font-semibold uppercase">
                      {campusMap.get(a.campusId) || a.campusId}
                    </td>
                    <td className="p-1.5 font-bold text-gray-900">{unitMap.get(a.unitId) || a.unitId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 italic text-[9pt]">No specific unit assignments specified.</p>
          )}
        </div>
      </div>

      {/* Section 3: Proposed Action Strategy */}
      {output.actionPlan && (
        <div className="w-full border-2 border-black border-b-0">
          <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider">
            3. Proposed Action Strategy / Planned Resolution
          </div>
          <div className="p-3 bg-white">
            <p className="text-[9.5pt] leading-relaxed whitespace-pre-wrap">{output.actionPlan}</p>
          </div>
        </div>
      )}

      {/* Section 4: Unit Implementation Progress & Action Log */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider">
          {output.actionPlan ? '4.' : '3.'} Unit Implementation Progress &amp; Action Log
        </div>
        <div className="p-3 space-y-3">
          {output.followUpRemarks ? (
            <div className="border border-gray-300 rounded p-2.5 bg-gray-50/50">
              <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-1.5">
                <span className="font-bold text-[8.5pt] uppercase text-gray-700">Latest Progress Summary</span>
                <div className="text-[8pt] text-gray-600">
                  <span className="font-bold">Date:</span> {safeDate(output.actionDate)}{' '}
                  {output.actionTakenBy && (
                    <span className="ml-2">
                      <span className="font-bold">By:</span> {output.actionTakenBy}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[9.5pt] leading-relaxed whitespace-pre-wrap">{output.followUpRemarks}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic text-[9pt] py-1">No overall unit progress summary logged yet.</p>
          )}

          {/* Action Entries Log */}
          {output.actionEntries && output.actionEntries.length > 0 && (
            <div className="mt-3">
              <p className="text-[8.5pt] font-black uppercase tracking-wider text-gray-800 mb-1.5">
                Itemized Action Submissions ({output.actionEntries.length} Record
                {output.actionEntries.length > 1 ? 's' : ''})
              </p>
              <table className="w-full border-collapse text-[8.5pt]">
                <thead>
                  <tr className="bg-gray-100 border border-black text-left">
                    <th className="p-1.5 border-r border-black font-bold uppercase text-[7.5pt] w-8 text-center">#</th>
                    <th className="p-1.5 border-r border-black font-bold uppercase text-[7.5pt]">
                      Action Taken &amp; Details
                    </th>
                    <th className="p-1.5 border-r border-black font-bold uppercase text-[7.5pt] w-20 text-center">
                      Implemented
                    </th>
                    <th className="p-1.5 border-r border-black font-bold uppercase text-[7.5pt] w-24">Submitted By</th>
                    <th className="p-1.5 border-r border-black font-bold uppercase text-[7.5pt] w-36">
                      Google Drive Link / Evidence
                    </th>
                    <th className="p-1.5 font-bold uppercase text-[7.5pt] w-24">Admin Status</th>
                  </tr>
                </thead>
                <tbody>
                  {output.actionEntries.map((entry, idx) => (
                    <tr key={entry.id || idx} className="border border-black align-top">
                      <td className="p-1.5 border-r border-black text-center font-bold">{idx + 1}</td>
                      <td className="p-1.5 border-r border-black">
                        <p className="font-semibold text-black leading-snug">{entry.description}</p>
                        {entry.confirmationRemarks && (
                          <div className="mt-1 pt-1 border-t border-gray-200 text-[8pt] text-emerald-900 bg-emerald-50/50 p-1 rounded">
                            <span className="font-bold">QA Feedback:</span> {entry.confirmationRemarks}
                          </div>
                        )}
                      </td>
                      <td className="p-1.5 border-r border-black whitespace-nowrap font-medium text-center">
                        {safeDate(entry.implementationDate)}
                      </td>
                      <td className="p-1.5 border-r border-black">
                        <p className="font-bold leading-tight">{entry.submittedBy}</p>
                        <p className="text-[7pt] text-gray-500">{safeDate(entry.submittedAt)}</p>
                      </td>
                      <td className="p-1.5 border-r border-black">
                        {entry.googleDriveLink ? (
                          <a
                            href={entry.googleDriveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 underline font-mono text-[7.5pt] break-all block leading-tight hover:text-blue-900"
                          >
                            {entry.googleDriveLink}
                          </a>
                        ) : (
                          <span className="text-gray-400 italic text-[7.5pt]">None Attached</span>
                        )}
                      </td>
                      <td className="p-1.5 font-semibold">
                        {entry.isConfirmed ? (
                          <div>
                            <span className="text-emerald-800 font-bold uppercase text-[8pt]">Confirmed</span>
                            {entry.confirmedBy && (
                              <p className="text-[7pt] text-gray-600 mt-0.5">By {entry.confirmedBy}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-800 font-bold uppercase text-[8pt]">Pending QA Check</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Institutional Closure & Verification Review */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider">
          {output.actionPlan ? '5.' : '4.'} Institutional Closure &amp; Verification Review
        </div>
        <div className="p-3 bg-white">
          <div className="grid grid-cols-12 gap-2 text-[9pt]">
            <div className="col-span-8">
              <p className="text-[8pt] font-bold text-gray-600 uppercase">Verification Findings / Description:</p>
              <p className="text-[9.5pt] mt-1 leading-relaxed font-medium italic">
                {output.verificationRemarks ||
                  (output.status === 'Closed'
                    ? 'Verified compliant with management directives.'
                    : 'Awaiting administrative verification audit upon completion.')}
              </p>
            </div>
            <div className="col-span-4 border-l border-gray-300 pl-3">
              <p className="text-[8pt] font-bold text-gray-600 uppercase">Verified By:</p>
              <p className="font-bold text-[9.5pt] mt-0.5">{output.verifiedBy || '--'}</p>
              <p className="text-[8pt] font-bold text-gray-600 uppercase mt-2">Verification Date:</p>
              <p className="font-bold text-[9.5pt] mt-0.5">{safeDate(output.verificationDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Official Signatories */}
      <div className="w-full border-2 border-black overflow-hidden">
        <div className="bg-gray-100 p-1.5 border-b border-black font-bold uppercase text-[8.5pt] tracking-wider text-center">
          Official Signatories &amp; Endorsement
        </div>
        <div className="grid grid-cols-3 text-center divide-x divide-black">
          <div className="p-3 flex flex-col justify-between min-h-[90px]">
            <p className="uppercase text-[8pt] font-bold text-gray-600">Action Executed By</p>
            <div>
              <p className="font-bold text-[9.5pt] uppercase underline underline-offset-4">
                {output.actionTakenBy || 'Responsible Unit Head'}
              </p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Unit Coordinator / Head</p>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between min-h-[90px]">
            <p className="uppercase text-[8pt] font-bold text-gray-600">Reviewed &amp; Verified By</p>
            <div>
              <p className="font-bold text-[9.5pt] uppercase underline underline-offset-4">
                {output.verifiedBy || qmsHeadName}
              </p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Head, QMS Unit</p>
            </div>
          </div>
          <div className="p-3 flex flex-col justify-between min-h-[90px]">
            <p className="uppercase text-[8pt] font-bold text-gray-600">Approved &amp; Noted By</p>
            <div>
              <p className="font-bold text-[9.5pt] uppercase underline underline-offset-4">{directorName}</p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Director, Quality Assurance Office</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-3 text-center text-[7.5pt] text-gray-500 font-sans italic">
        This document is an official Quality Assurance monitoring instrument under Romblon State University EOMS.
        Unauthorized alterations void this record.
      </div>
    </div>
  );
}

interface ActionableDecisionsRegisterPrintTemplateProps {
  outputs: ManagementReviewOutput[];
  reviewTitle?: string;
  year?: string;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  signatories?: Signatories;
}

export function ActionableDecisionsRegisterPrintTemplate({
  outputs,
  reviewTitle,
  year,
  unitMap,
  campusMap,
  signatories,
}: ActionableDecisionsRegisterPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MM/dd/yyyy');
  };

  const total = outputs.length;
  const closedCount = outputs.filter((o) => o.status === 'Closed').length;
  const verificationCount = outputs.filter((o) => o.status === 'Submit for Closure Verification').length;
  const ongoingCount = outputs.filter((o) => o.status === 'On-going').length;
  const openCount = outputs.filter((o) => o.status === 'Open').length;
  const completionRate = total > 0 ? Math.round((closedCount / total) * 100) : 0;

  const directorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';
  const qmsHeadName = signatories?.qmsHead || 'Head, Quality Management System Unit';

  return (
    <div
      className="p-0 text-black bg-white mx-auto font-sans leading-tight"
      style={{ width: '13in', fontSize: '8.5pt' }}
    >
      {/* Header */}
      <div className="text-center mb-3">
        <h1 className="font-bold uppercase tracking-tight text-[13pt]">Romblon State University</h1>
        <h2 className="font-semibold uppercase tracking-wide text-[11pt]">Quality Assurance Office</h2>
        <p className="text-[8.5pt] italic text-gray-600">
          Main Campus, Odiongan, Romblon | ISO 21001:2018 EOMS Certified
        </p>
        <div className="mt-2 border-y-2 border-black py-1.5 bg-gray-50">
          <h3 className="font-black uppercase tracking-[0.15em] text-[11pt]">
            Management Review Actionable Decisions Control Register
          </h3>
          <p className="text-[8pt] font-semibold text-gray-700 uppercase mt-0.5">
            {year && year !== 'all' ? `Session Year: ${year}` : 'All Management Review Sessions'}
            {reviewTitle ? ` | ${reviewTitle}` : ''}
          </p>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-6 border border-black bg-gray-100/80 text-center py-1.5 mb-3 text-[8.5pt] font-bold">
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7.5pt] uppercase">Total Decisions</span>
          <span className="text-[10pt] font-black">{total}</span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7.5pt] uppercase">Open / Pending</span>
          <span className="text-[10pt] font-black text-rose-700">{openCount}</span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7.5pt] uppercase">On-going</span>
          <span className="text-[10pt] font-black text-amber-700">{ongoingCount}</span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7.5pt] uppercase">Verification Pending</span>
          <span className="text-[10pt] font-black text-blue-700">{verificationCount}</span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7.5pt] uppercase">Closed / Verified</span>
          <span className="text-[10pt] font-black text-emerald-700">{closedCount}</span>
        </div>
        <div>
          <span className="text-gray-600 block text-[7.5pt] uppercase">Resolution Rate</span>
          <span className="text-[10pt] font-black text-emerald-800">{completionRate}%</span>
        </div>
      </div>

      {/* Register Table */}
      <table className="w-full border-collapse border-2 border-black text-[8pt]">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-black text-left font-bold uppercase text-[7.5pt]">
            <th className="p-1.5 border-r border-black text-center w-8">#</th>
            <th className="p-1.5 border-r border-black w-14 text-center">Line No.</th>
            <th className="p-1.5 border-r border-black w-[240px]">Management Directive / Decision</th>
            <th className="p-1.5 border-r border-black w-[150px]">Assigned Responsibility</th>
            <th className="p-1.5 border-r border-black w-24">Initiator</th>
            <th className="p-1.5 border-r border-black w-20 text-center">Deadline</th>
            <th className="p-1.5 border-r border-black w-[220px]">Unit Actions Taken / Latest Progress</th>
            <th className="p-1.5 border-r border-black w-[140px]">Google Drive Link / Evidence</th>
            <th className="p-1.5 border-r border-black w-24 text-center">Status</th>
            <th className="p-1.5 w-24">Verification</th>
          </tr>
        </thead>
        <tbody>
          {outputs.map((item, index) => {
            const driveEntries = (item.actionEntries || []).filter((e) => e.googleDriveLink);
            return (
              <tr key={item.id || index} className="border-b border-black align-top hover:bg-gray-50">
                <td className="p-1.5 border-r border-black text-center font-bold">{index + 1}</td>
                <td className="p-1.5 border-r border-black text-center font-mono font-semibold">
                  {item.lineNumber || '--'}
                </td>
                <td className="p-1.5 border-r border-black">
                  <p className="font-semibold leading-snug">{item.description}</p>
                  {item.actionPlan && (
                    <p className="text-[7pt] text-gray-600 mt-1 italic leading-tight">Plan: {item.actionPlan}</p>
                  )}
                </td>
                <td className="p-1.5 border-r border-black">
                  {(item.assignments || []).map((a, i) => (
                    <div key={i} className="mb-0.5 leading-tight">
                      <span className="font-bold text-[7.5pt] block text-primary">
                        {campusMap.get(a.campusId) || a.campusId}
                      </span>
                      <span className="text-[7pt] text-gray-700">{unitMap.get(a.unitId) || a.unitId}</span>
                    </div>
                  ))}
                </td>
                <td className="p-1.5 border-r border-black font-medium">{item.initiator}</td>
                <td className="p-1.5 border-r border-black text-center whitespace-nowrap font-bold">
                  {safeDate(item.followUpDate)}
                </td>
                <td className="p-1.5 border-r border-black">
                  {item.followUpRemarks ? (
                    <div>
                      <p className="leading-snug">{item.followUpRemarks}</p>
                      {item.actionTakenBy && (
                        <p className="text-[7pt] text-gray-500 mt-0.5">
                          By: {item.actionTakenBy} ({safeDate(item.actionDate)})
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">No progress logged</span>
                  )}
                  {item.actionEntries && item.actionEntries.length > 0 && (
                    <p className="text-[7pt] font-bold text-blue-700 mt-1">
                      {item.actionEntries.length} itemized action record(s)
                    </p>
                  )}
                </td>
                <td className="p-1.5 border-r border-black">
                  {driveEntries.length > 0 ? (
                    <div className="space-y-1">
                      {driveEntries.map((e, lIdx) => (
                        <a
                          key={lIdx}
                          href={e.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-700 underline font-mono text-[7pt] block truncate max-w-[130px] leading-tight hover:text-blue-900"
                          title={e.googleDriveLink}
                        >
                          Drive File {driveEntries.length > 1 ? `#${lIdx + 1}` : ''}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400 italic text-[7pt]">None</span>
                  )}
                </td>
                <td className="p-1.5 border-r border-black text-center font-bold uppercase text-[7.5pt]">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[7pt] block whitespace-nowrap',
                      item.status === 'Open'
                        ? 'bg-rose-100 text-rose-800'
                        : item.status === 'On-going'
                          ? 'bg-amber-100 text-amber-900'
                          : item.status === 'Submit for Closure Verification'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-emerald-100 text-emerald-900',
                    )}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-1.5 text-[7.5pt]">
                  {item.verifiedBy ? (
                    <div>
                      <p className="font-bold leading-tight">{item.verifiedBy}</p>
                      <p className="text-[7pt] text-gray-500">{safeDate(item.verificationDate)}</p>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
          {outputs.length === 0 && (
            <tr>
              <td colSpan={9} className="p-4 text-center text-gray-500 italic">
                No actionable decisions found matching current filter criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Signatories Footer */}
      <div className="mt-4 border-2 border-black grid grid-cols-2 text-center divide-x divide-black">
        <div className="p-3 flex flex-col justify-between min-h-[75px]">
          <p className="uppercase text-[7.5pt] font-bold text-gray-600">Prepared &amp; Maintained By</p>
          <div>
            <p className="font-bold text-[9pt] uppercase underline underline-offset-4">{qmsHeadName}</p>
            <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Head, Quality Management System Unit</p>
          </div>
        </div>
        <div className="p-3 flex flex-col justify-between min-h-[75px]">
          <p className="uppercase text-[7.5pt] font-bold text-gray-600">Approved &amp; Noted By</p>
          <div>
            <p className="font-bold text-[9pt] uppercase underline underline-offset-4">{directorName}</p>
            <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Director, Quality Assurance Office</p>
          </div>
        </div>
      </div>

      <div className="mt-2 text-center text-[7pt] text-gray-500 italic">
        Romblon State University EOMS | Management Review Directive Tracking Matrix
      </div>
    </div>
  );
}
