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
    <div className="p-0 text-black bg-white mx-auto font-sans leading-tight border-none" style={{ width: '7.5in', fontSize: '12pt' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="font-black uppercase tracking-widest" style={{ fontSize: '14pt' }}>WORK FROM HOME MONITORING SHEET</h1>
        <h2 className="text-md font-bold uppercase tracking-tight mt-1">({type})</h2>
      </div>

      {/* Meta Grid - Solid Borders enforced */}
      <table className="w-full border-collapse border-2 border-black mb-8" style={{ fontSize: '12pt' }}>
        <tbody>
          <tr>
            <td className="border border-black p-2 w-[35%] bg-white font-bold">Name of Employee</td>
            <td className="border border-black p-2 uppercase font-bold">{userName}</td>
          </tr>
          <tr>
            <td className="border border-black p-2 bg-white font-bold">Campus/College</td>
            <td className="border border-black p-2 uppercase font-bold">{campusName}</td>
          </tr>
          {isTeaching ? (
            <>
              <tr>
                <td className="border border-black p-2 bg-white font-bold">Teaching Load (Units)</td>
                <td className="border border-black p-2 font-bold">{latest.teachingLoad || ''}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-white font-bold">Nature of Appointment</td>
                <td className="border border-black p-2">
                    <div className="flex gap-6 font-bold">
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Lecturer') ? 'X' : ' ' }] Lecturer</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Part-Time') ? 'X' : ' ' }] Part-Time</span>
                    </div>
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-white font-bold">Subject/s Taught</td>
                <td className="border border-black p-2 italic font-bold">{latest.subjectsTaught || ''}</td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="border border-black p-2 bg-white font-bold">Office Assignment</td>
                <td className="border border-black p-2 uppercase font-bold">{latest.officeAssignment || ''}</td>
              </tr>
              <tr>
                <td className="border border-black p-2 bg-white font-bold">Nature of Appointment</td>
                <td className="border border-black p-2 font-bold">
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                    </div>
                </td>
              </tr>
            </>
          )}
          <tr>
            <td className="border border-black p-2 bg-white font-bold">Other Designations</td>
            <td className="border border-black p-2 italic font-bold">{latest.otherDesignations || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Content Table - Solid Grid enforced */}
      <table className="w-full border-collapse border-2 border-black text-[11pt] mb-8">
        <thead>
          <tr className="bg-slate-50 font-black text-center uppercase border-b-2 border-black">
            <th className="border border-black p-2 w-[18%]">PERIOD</th>
            <th className="border border-black p-2 w-[35%]">
                DELIVERABLES
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '8pt' }}>
                    (As approved by the Dean/Chair/Campus Director)
                </p>
            </th>
            <th className="border border-black p-2">
                ACCOMPLISHMENT
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '8pt' }}>(Attach additional proofs as needed)</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((a, i) => (
            <tr key={i} className="h-32 border-b border-black">
              <td className="border border-black p-2 text-center align-top font-black tabular-nums">
                {a.date ? format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy') : ''}
              </td>
              <td className="border border-black p-2 align-top text-xs font-medium leading-tight">
                {a.deliverables || ''}
              </td>
              <td className="border border-black p-2 align-top">
                {a.accomplishment && (
                  <div className="space-y-4">
                    <p className="text-xs italic leading-snug">{a.accomplishment}</p>
                    {a.evidenceLink && (
                      <div className="pt-2">
                        <p className="text-[8pt] font-black uppercase text-slate-800 leading-none mb-1">ATTACHMENT/EVIDENCES:</p>
                        <a href={a.evidenceLink} target="_blank" rel="noopener noreferrer" className="text-[9pt] text-blue-700 underline break-all font-bold">
                          {a.evidenceLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-10 font-bold mb-12">
        On my honor, I certify that I rendered the above services within the duration of the National State of Emergency.
      </div>

      {/* Signatures Layout */}
      <div className="flex flex-col items-center mb-20" style={{ fontSize: '12pt' }}>
        <div className="w-80 text-center">
            <div className="font-black uppercase mb-1" style={{ fontSize: '13pt' }}>
                {userName}
            </div>
            <div className="border-t-2 border-black mt-1 pt-1">
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '9pt' }}>EMPLOYEE'S</p>
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '9pt' }}>SIGNATURE OVER</p>
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '9pt' }}>PRINTED NAME</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 uppercase mb-10" style={{ fontSize: '12pt' }}>
        {isTeaching ? (
            <>
                <div className="text-left">
                    <p className="mb-10 font-black text-sm">VALIDATED:</p>
                    <div className="font-black text-center mb-1 min-h-[1.5rem] uppercase">
                        {deptChair || ''}
                    </div>
                    <div className="border-t-2 border-black pt-1">
                      <p className="text-[10pt] text-center font-black">DEPARTMENT CHAIR</p>
                    </div>
                </div>
                <div className="text-left">
                    <p className="mb-10 font-black text-sm">APPROVED:</p>
                    <div className="font-black text-center mb-1 min-h-[1.5rem] uppercase">
                        {deanDirector || ''}
                    </div>
                    <div className="border-t-2 border-black pt-1">
                      <p className="text-[10pt] text-center font-black">DEAN/DIRECTOR</p>
                    </div>
                </div>
            </>
        ) : (
            <div className="col-span-2 flex flex-col items-center text-center">
                <p className="mb-10 w-full text-center font-black text-sm">VALIDATED AND APPROVED:</p>
                <div className="font-black text-center mb-1 w-80 min-h-[1.5rem] uppercase">
                    {immediateHead || ''}
                </div>
                <div className="border-t-2 border-black pt-1 w-80">
                  <p className="font-black text-[10pt]">IMMEDIATE HEAD</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
