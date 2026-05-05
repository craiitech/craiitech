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
        <h2 className="font-bold uppercase tracking-tight mt-1" style={{ fontSize: '12pt' }}>({type.toUpperCase()})</h2>
      </div>

      {/* Meta Grid - Solid Borders enforced */}
      <table className="w-full border-collapse border-2 border-black mb-8">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black p-2 w-[35%] bg-white font-bold" style={{ fontSize: '12pt' }}>Name of Employee</td>
            <td className="p-2 uppercase font-bold" style={{ fontSize: '12pt' }}>{userName}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Campus/College</td>
            <td className="p-2 uppercase font-bold" style={{ fontSize: '12pt' }}>{campusName}</td>
          </tr>
          {isTeaching ? (
            <>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Teaching Load (Units)</td>
                <td className="p-2 font-bold" style={{ fontSize: '12pt' }}>{latest.teachingLoad || ''}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Nature of Appointment</td>
                <td className="p-2">
                    <div className="flex gap-6 font-bold" style={{ fontSize: '12pt' }}>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Lecturer') ? 'X' : ' ' }] Lecturer</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Part-Time') ? 'X' : ' ' }] Part-Time</span>
                    </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Subject/s Taught</td>
                <td className="p-2 italic font-bold" style={{ fontSize: '12pt' }}>{latest.subjectsTaught || ''}</td>
              </tr>
            </>
          ) : (
            <>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Office Assignment</td>
                <td className="p-2 uppercase font-bold" style={{ fontSize: '12pt' }}>{latest.officeAssignment || ''}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Nature of Appointment</td>
                <td className="p-2 font-bold" style={{ fontSize: '12pt' }}>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                    </div>
                </td>
              </tr>
            </>
          )}
          <tr>
            <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '12pt' }}>Other Designations</td>
            <td className="p-2 italic font-bold" style={{ fontSize: '12pt' }}>{latest.otherDesignations || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Content Table - Solid Grid enforced */}
      <table className="w-full border-collapse border-2 border-black mb-8">
        <thead>
          <tr className="bg-gray-100 font-black text-center uppercase border-b-2 border-black">
            <th className="border-r border-black p-2 w-[18%]" style={{ fontSize: '12pt' }}>PERIOD</th>
            <th className="border-r border-black p-2 w-[35%]" style={{ fontSize: '12pt' }}>
                DELIVERABLES
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '9pt' }}>
                    (As approved by the Dean/Chair/Campus Director)
                </p>
            </th>
            <th className="p-2" style={{ fontSize: '12pt' }}>
                ACCOMPLISHMENT
                <p className="font-normal normal-case italic mt-1" style={{ fontSize: '9pt' }}>(Attach additional proofs as needed)</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((a, i) => (
            <tr key={i} className="h-32 border-b border-black">
              <td className="border-r border-black p-2 text-center align-top font-black tabular-nums" style={{ fontSize: '12pt' }}>
                {a.date ? format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy') : ''}
              </td>
              <td className="border-r border-black p-2 align-top font-medium leading-tight" style={{ fontSize: '11pt' }}>
                {a.deliverables || ''}
              </td>
              <td className="p-2 align-top">
                {a.accomplishment && (
                  <div className="space-y-4">
                    <p className="italic leading-snug" style={{ fontSize: '11pt' }}>{a.accomplishment}</p>
                    {a.evidenceLink && (
                      <div className="pt-2">
                        <p className="font-black uppercase text-slate-800 leading-none mb-1" style={{ fontSize: '9pt' }}>ATTACHMENT/EVIDENCES:</p>
                        <a href={a.evidenceLink} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all font-bold" style={{ fontSize: '10pt' }}>
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

      <div className="mt-10 font-bold mb-12" style={{ fontSize: '12pt' }}>
        On my honor, I certify that I rendered the above services within the duration of the National State of Emergency.
      </div>

      {/* Signatures Layout */}
      <div className="flex flex-col items-center mb-20">
        <div className="min-w-[300px] w-fit text-center">
            <div className="font-black uppercase mb-1 whitespace-nowrap" style={{ fontSize: '13pt' }}>
                {userName}
            </div>
            <div className="border-t-2 border-black mt-1 pt-1">
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '10pt' }}>EMPLOYEE'S</p>
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '10pt' }}>SIGNATURE OVER</p>
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '10pt' }}>PRINTED NAME</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-16 uppercase mb-10">
        {isTeaching ? (
            <>
                <div className="text-center">
                    <p className="mb-10 font-black text-sm text-left" style={{ fontSize: '11pt' }}>VALIDATED:</p>
                    <div className="font-black text-center mb-1 min-h-[1.5rem] uppercase whitespace-nowrap" style={{ fontSize: '12pt' }}>
                        {deptChair || ''}
                    </div>
                    <div className="border-t-2 border-black pt-1">
                      <p className="text-center font-black" style={{ fontSize: '10pt' }}>DEPARTMENT CHAIR</p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="mb-10 font-black text-sm text-left" style={{ fontSize: '11pt' }}>APPROVED:</p>
                    <div className="font-black text-center mb-1 min-h-[1.5rem] uppercase whitespace-nowrap" style={{ fontSize: '12pt' }}>
                        {deanDirector || ''}
                    </div>
                    <div className="border-t-2 border-black pt-1">
                      <p className="text-center font-black" style={{ fontSize: '10pt' }}>DEAN/DIRECTOR</p>
                    </div>
                </div>
            </>
        ) : (
            <div className="col-span-2 flex flex-col items-center text-center">
                <p className="mb-10 w-full text-center font-black text-sm" style={{ fontSize: '11pt' }}>VALIDATED AND APPROVED:</p>
                <div className="min-w-[300px] w-fit">
                    <div className="font-black text-center mb-1 uppercase whitespace-nowrap" style={{ fontSize: '12pt' }}>
                        {immediateHead || ''}
                    </div>
                    <div className="border-t-2 border-black pt-1">
                      <p className="font-black" style={{ fontSize: '10pt' }}>IMMEDIATE HEAD</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
