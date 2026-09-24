'use client';

import React from 'react';
import type { ManagementReview, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';

interface MRAgendaPrintTemplateProps {
  review: ManagementReview;
  signatories?: Signatories | null;
  campusName?: string;
}

export function MRAgendaPrintTemplate({
  review,
  signatories,
  campusName = 'University-Wide (Institutional)',
}: MRAgendaPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MMMM dd, yyyy');
  };

  const safeDateShort = (d: any) => {
    if (!d) return '--';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '--' : format(date, 'MMM dd, yyyy');
  };

  const directorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';
  const qmsHeadName = signatories?.qmsHead || 'Head, Quality Management System Unit';
  const presidentName = signatories?.universityPresident || 'University President';

  const parts = review.agendaParts || [];
  const totalParts = parts.length;
  const totalDurationMinutes = parts.reduce((acc, p) => acc + (Number(p.durationMinutes) || 30), 0);
  const totalHours = (totalDurationMinutes / 60).toFixed(1);
  const partsWithLinks = parts.filter((p) => p.driveFolderLink && p.driveFolderLink.trim().length > 5).length;
  const readinessPercent = totalParts > 0 ? Math.round((partsWithLinks / totalParts) * 100) : 0;

  return (
    <div
      className="p-6 text-black bg-white mx-auto font-sans leading-tight print:p-0"
      style={{ width: '10.5in', minHeight: '8in', fontSize: '9pt' }}
    >
      {/* Official University Institutional Header */}
      <div className="text-center mb-3">
        <div className="flex flex-col items-center justify-center gap-0.5 mb-1.5">
          <p className="text-[8pt] font-serif uppercase tracking-widest text-gray-600">Republic of the Philippines</p>
          <h1 className="font-bold uppercase tracking-tight text-[13pt] text-black">Romblon State University</h1>
          <h2 className="font-semibold uppercase tracking-wide text-[10.5pt] text-gray-800">
            Quality Assurance Office
          </h2>
          <p className="text-[8pt] italic text-gray-600">
            Main Campus, Odiongan, Romblon, 5505 Philippines | ISO 21001:2018 EOMS Certified
          </p>
        </div>

        {/* Title Banner */}
        <div className="mt-2.5 border-y-2 border-black py-2 bg-gray-50">
          <h2 className="font-black uppercase tracking-[0.12em] text-[11.5pt] text-black">
            Management Review Conduct Agenda &amp; Presentation Matrix
          </h2>
          <p className="text-[8pt] font-semibold text-gray-700 uppercase mt-0.5 tracking-wider">
            ISO 21001:2018 Educational Organizations Management System (EOMS) Clause 9.3 Review Conduct
          </p>
        </div>
      </div>

      {/* ISO Document Metadata Strip */}
      <div className="w-full border-2 border-black border-b-0 bg-gray-100/80 text-[8pt] font-mono">
        <div className="grid grid-cols-12 divide-x divide-black py-1 px-2.5">
          <div className="col-span-4">
            <span className="font-bold font-sans">Doc Code:</span> RSU-QAO-MR-AGENDA-F01
          </div>
          <div className="col-span-3 text-center">
            <span className="font-bold font-sans">Rev No.:</span> 00
          </div>
          <div className="col-span-5 text-right">
            <span className="font-bold font-sans">Date Printed:</span> {format(new Date(), 'MMMM dd, yyyy hh:mm a')}
          </div>
        </div>
      </div>

      {/* Session Logistics & Specifications Block */}
      <div className="w-full border-2 border-black border-b-0 text-[8.5pt]">
        <div className="grid grid-cols-12 divide-x divide-black">
          <div className="col-span-8 p-2.5 bg-white">
            <p className="text-[7.5pt] font-bold text-gray-500 uppercase tracking-wider">
              Management Review Session Title
            </p>
            <p className="font-black uppercase text-[10pt] mt-0.5 text-black">
              {review.title || 'Annual EOMS Management Review'}
            </p>
            {review.theme && (
              <p className="text-[8pt] italic text-gray-700 mt-1">
                <span className="font-bold font-sans not-italic text-gray-800">Theme / Directive:</span> {review.theme}
              </p>
            )}
          </div>
          <div className="col-span-4 p-2.5 bg-gray-50/50">
            <p className="text-[7.5pt] font-bold text-gray-500 uppercase tracking-wider">
              Review Cycle &amp; Calendar Year
            </p>
            <p className="font-black text-[10pt] mt-0.5 text-black">
              CY {review.year || new Date().getFullYear()} {review.academicYear ? `(${review.academicYear})` : ''}
            </p>
            <p className="text-[8pt] text-gray-700 mt-1">
              <span className="font-bold">Status:</span> {review.status || 'Scheduled'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-12 divide-x divide-black border-t border-black bg-gray-50/40">
          <div className="col-span-4 p-2">
            <span className="text-[7.5pt] font-bold text-gray-500 uppercase block">Inclusive Dates</span>
            <span className="font-bold text-black text-[8.5pt]">
              {safeDateShort(review.startDate)} – {safeDateShort(review.endDate)}
            </span>
          </div>
          <div className="col-span-4 p-2">
            <span className="text-[7.5pt] font-bold text-gray-500 uppercase block">Venue &amp; Modality</span>
            <span className="font-bold text-black text-[8.5pt]">
              {review.venue || 'Executive Boardroom'} ({review.modality || 'Hybrid'})
            </span>
          </div>
          <div className="col-span-4 p-2">
            <span className="text-[7.5pt] font-bold text-gray-500 uppercase block">Institutional Scope</span>
            <span className="font-bold text-black text-[8.5pt]">{campusName}</span>
          </div>
        </div>

        {review.masterDriveLink && (
          <div className="p-2 border-t border-black bg-white text-[8pt]">
            <span className="font-bold text-gray-800 uppercase mr-1">Master Google Drive Repository:</span>
            <span className="font-mono text-blue-900 break-all">{review.masterDriveLink}</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-4 border-2 border-black border-b-0 bg-gray-100/90 text-center py-1.5 text-[8pt] font-bold">
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7pt] uppercase">Total Agenda Parts</span>
          <span className="text-[9.5pt] font-black text-black">{totalParts} Agenda Items</span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7pt] uppercase">Total Presentation Time</span>
          <span className="text-[9.5pt] font-black text-black">
            {totalDurationMinutes} mins ({totalHours} hrs)
          </span>
        </div>
        <div className="border-r border-black">
          <span className="text-gray-600 block text-[7pt] uppercase">Evidence Folders Uploaded</span>
          <span className="text-[9.5pt] font-black text-black">
            {partsWithLinks} / {totalParts} ({readinessPercent}%)
          </span>
        </div>
        <div>
          <span className="text-gray-600 block text-[7pt] uppercase">ISO 21001:2018 Alignment</span>
          <span className="text-[9.5pt] font-black text-emerald-800">Clause 9.3 Compliant</span>
        </div>
      </div>

      {/* Main Agenda Parts & Assigned Reporters Table */}
      <table className="w-full border-collapse border-2 border-black text-[8pt]">
        <thead>
          <tr className="bg-gray-200/90 text-black border-b-2 border-black font-black uppercase text-[7.5pt]">
            <th className="border-r border-black p-1.5 text-center w-[45px]">Part</th>
            <th className="border-r border-black p-1.5 text-left w-[240px]">Agenda Topic &amp; ISO 21001 Clause</th>
            <th className="border-r border-black p-1.5 text-left w-[180px]">Assigned Reporter(s) / Office</th>
            <th className="border-r border-black p-1.5 text-center w-[55px]">Time</th>
            <th className="border-r border-black p-1.5 text-left">Google Drive Folder Repository URL</th>
            <th className="p-1.5 text-center w-[75px]">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {parts.map((part) => (
            <tr key={part.id} className="hover:bg-gray-50">
              <td className="border-r border-black p-1.5 text-center font-black font-mono text-[8.5pt]">
                #{part.partNumber}
              </td>
              <td className="border-r border-black p-1.5 align-top">
                <p className="font-bold text-black text-[8.5pt] leading-tight">{part.title}</p>
                <p className="font-mono text-[7pt] font-bold text-gray-700 mt-0.5">[{part.clause}]</p>
                {part.description && (
                  <p className="text-[7.5pt] text-gray-600 mt-0.5 leading-snug">{part.description}</p>
                )}
              </td>
              <td className="border-r border-black p-1.5 align-top">
                <p className="font-bold text-black leading-tight">{part.assignedReporters || 'Unassigned'}</p>
                <span className="text-[7pt] text-gray-500 uppercase font-semibold">Lead Presenter</span>
              </td>
              <td className="border-r border-black p-1.5 text-center font-bold text-gray-800 align-top">
                {part.durationMinutes ? `${part.durationMinutes}m` : '30m'}
              </td>
              <td className="border-r border-black p-1.5 align-top font-mono text-[7pt] break-all">
                {part.driveFolderLink ? (
                  <span className="text-blue-900 font-semibold">{part.driveFolderLink}</span>
                ) : (
                  <span className="text-gray-400 italic">No Drive folder URL registered</span>
                )}
              </td>
              <td className="p-1.5 text-center align-top font-bold text-[7.5pt]">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[7pt] font-black uppercase ${
                    part.status === 'Presented'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                      : part.status === 'Uploaded'
                        ? 'bg-blue-100 text-blue-900 border border-blue-400'
                        : 'bg-amber-100 text-amber-900 border border-amber-400'
                  }`}
                >
                  {part.status || 'Pending'}
                </span>
              </td>
            </tr>
          ))}
          {parts.length === 0 && (
            <tr>
              <td colSpan={6} className="p-4 text-center text-gray-500 italic">
                No agenda parts registered for this Management Review session.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ISO 21001 Note */}
      <div className="mt-2 p-2 border border-black bg-gray-50 text-[7.5pt] text-gray-700 leading-snug">
        <strong>ISO 21001:2018 Clause 9.3 Standard Compliance Note:</strong> The Management Review must be planned and
        carried out taking into consideration all inputs specified in Clause 9.3.2. Retained documented information must
        include the decisions and action outputs required by Clause 9.3.3.
      </div>

      {/* Official Signatories Block */}
      <div className="mt-5 border-t-2 border-black pt-3">
        <div className="grid grid-cols-3 gap-6 text-center text-[8.5pt]">
          <div className="space-y-8">
            <p className="text-[7.5pt] font-bold text-gray-600 uppercase tracking-wider text-left">Prepared By:</p>
            <div>
              <p className="font-bold uppercase text-[9pt] border-b border-black pb-0.5 mx-auto w-4/5 text-black">
                {qmsHeadName}
              </p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Head, Quality Management System Unit</p>
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-[7.5pt] font-bold text-gray-600 uppercase tracking-wider text-left">
              Reviewed &amp; Endorsed By:
            </p>
            <div>
              <p className="font-bold uppercase text-[9pt] border-b border-black pb-0.5 mx-auto w-4/5 text-black">
                {directorName}
              </p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">Director, Quality Assurance Office</p>
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-[7.5pt] font-bold text-gray-600 uppercase tracking-wider text-left">Approved By:</p>
            <div>
              <p className="font-bold uppercase text-[9pt] border-b border-black pb-0.5 mx-auto w-4/5 text-black">
                {presidentName}
              </p>
              <p className="text-[7.5pt] text-gray-600 uppercase mt-0.5">University President / Head of Institution</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
