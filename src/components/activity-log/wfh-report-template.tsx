'use client';

import React from 'react';
import type { WfhActivity } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface WfhReportTemplateProps {
  activities: WfhActivity[];
  userName: string;
  campusName: string;
  type: 'Teaching' | 'Non-Teaching';
  deptChair?: string;
  deanDirector?: string;
  immediateHead?: string;
}

export function WfhReportTemplate({ 
    activities, 
    userName, 
    campusName, 
    type,
    deptChair,
    deanDirector,
    immediateHead
}: WfhReportTemplateProps) {
  const latest = activities[0] || {};
  
  // Fill up to 5 rows for the "Period" section as per template images
  const displayRows = [...activities];
  while (displayRows.length < 5) {
    displayRows.push({} as any);
  }

  const isTeaching = type === 'Teaching';

  return (
    <div className="p-0 text-black bg-white mx-auto font-serif leading-tight" style={{ width: '7.5in', fontSize: '12pt' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-black uppercase tracking-widest" style={{ fontSize: '14pt' }}>WORK FROM HOME MONITORING SHEET</h1>
        <h2 className="text-md font-bold uppercase tracking-tight mt-1">({type})</h2>
      </div>

      {/* Meta Grid */}
      <table className="w-full border-collapse border-2 border-black mb-8" style={{ fontSize: '12pt' }}>
        <tbody>
          <tr>
            <td className="border border-black p-2 w-[30%] bg-gray-100 font-bold">Name of Employee</td>
            <td className="border border-black p-2 uppercase">{userName}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">Campus/College</td>
            <td className="border border-black p-2 uppercase">{campusName}</td>
          </tr>
          {isTeaching ? (
            <>
              <tr>
                <td className="border border-black p-2 bg-gray-100 font-bold">Teaching Load (Units)</td>
                <td className="border border-black p-2">{latest.teachingLoad || ''}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-gray-100 font-bold">Nature of Appointment</td>
                <td className="border border-black p-2">
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2">[{(latest.natureOfAppointment === 'Permanent') ? 'X' : ' '}] Permanent</span>
                        <span className="flex items-center gap-2">[{(latest.natureOfAppointment === 'Lecturer') ? 'X' : ' '}] Lecturer</span>
                        <span className="flex items-center gap-2">[{(latest.natureOfAppointment === 'Part-Time') ? 'X' : ' '}] Part-Time</span>
                    </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-gray-100 font-bold">Subject/s Taught</td>
                <td className="border border-black p-2 italic">{latest.subjectsTaught || ''}</td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="border border-black p-2 bg-gray-100 font-bold">Office Assignment</td>
                <td className="border border-black p-2 uppercase">{latest.officeAssignment || ''}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-gray-100 font-bold">Nature of Appointment</td>
                <td className="border border-black p-2">
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2">[{(latest.natureOfAppointment === 'Permanent') ? 'X' : ' '}] Permanent</span>
                    </div>
                </td>
              </tr>
            </>
          )}
          <tr>
            <td className="border border-black p-2 bg-gray-100 font-bold">Other Designations</td>
            <td className="border border-black p-2 italic">{latest.otherDesignations || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Content Table */}
      <table className="w-full border-collapse border-2 border-black mb-8" style={{ fontSize: '11pt' }}>
        <thead>
          <tr className="bg-gray-100 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[15%]">Period</th>
            <th className="border border-black p-2 w-[40%]">
                Deliverables
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '9pt' }}>
                    {isTeaching ? '(As approved by the Dean/Chair/Campus Director)' : '(As approved by the Immediate Head)'}
                </p>
            </th>
            <th className="border border-black p-2">
                Accomplishment
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '9pt' }}>(Attach additional proofs as needed)</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((a, i) => (
            <tr key={i} className="h-24 border-b border-black">
              <td className="border border-black p-2 text-center align-top font-bold">
                {a.date ? format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy') : ''}
              </td>
              <td className="border border-black p-2 align-top whitespace-pre-wrap leading-snug">
                {a.deliverables || ''}
              </td>
              <td className="border border-black p-2 align-top italic whitespace-pre-wrap leading-snug">
                {a.accomplishment || ''}
                {a.evidenceLink && (
                  <div className="mt-4 not-italic font-bold border-t border-black/10 pt-1 overflow-hidden" style={{ fontSize: '9pt' }}>
                    <span className="uppercase opacity-60 block mb-0.5">Attachment/Evidences:</span>
                    <span className="text-blue-700 underline truncate block">{a.evidenceLink}</span>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 font-bold" style={{ fontSize: '12pt' }}>
        On my honor, I certify that I rendered the above services within the duration of the National State of Emergency.
      </div>

      {/* Signatures */}
      <div className="mt-20 flex flex-col items-center" style={{ fontSize: '12pt' }}>
        <div className="w-80 text-center">
            <div className="border-b-2 border-black font-bold uppercase pb-1 mb-1">
                {userName}
            </div>
            <p className="uppercase font-semibold" style={{ fontSize: '10pt' }}>Employee's Signature over Printed Name</p>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-2 gap-20 uppercase" style={{ fontSize: '12pt' }}>
        {isTeaching ? (
            <>
                <div className="text-left">
                    <p className="mb-12 font-bold">VALIDATED:</p>
                    <div className="border-b-2 border-black font-bold text-center pb-1 mb-1 min-h-[1.5rem] uppercase">
                        {deptChair || ''}
                    </div>
                    <p className="text-[10pt] text-center font-semibold">Department Chair</p>
                </div>
                <div className="text-left">
                    <p className="mb-12 font-bold">APPROVED:</p>
                    <div className="border-b-2 border-black font-bold text-center pb-1 mb-1 min-h-[1.5rem] uppercase">
                        {deanDirector || ''}
                    </div>
                    <p className="text-[10pt] text-center font-semibold">Dean/Director</p>
                </div>
            </>
        ) : (
            <div className="col-span-2 flex flex-col items-center text-center">
                <p className="mb-12 w-full text-center font-bold">VALIDATED AND APPROVED:</p>
                <div className="border-b-2 border-black font-bold text-center pb-1 mb-1 w-80 min-h-[1.5rem] uppercase">
                    {immediateHead || ''}
                </div>
                <p className="font-semibold" style={{ fontSize: '10pt' }}>Immediate Head</p>
            </div>
        )}
      </div>

      <div className="mt-20 text-[10pt] text-gray-400 italic text-center border-t pt-4">
        Official WFH Monitoring Sheet &bull; RSU EOMS Portal Registry AY {new Date().getFullYear()}.
      </div>
    </div>
  );
}
