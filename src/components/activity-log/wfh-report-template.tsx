'use client';

import React from 'react';
import type { WfhActivity } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';

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
    <div className="p-0 text-black bg-white mx-auto font-sans leading-tight border-none" style={{ width: '7.5in', fontSize: '11pt' }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="font-black uppercase tracking-widest" style={{ fontSize: '13pt' }}>WORK FROM HOME MONITORING SHEET</h1>
        <h2 className="font-bold uppercase tracking-tight mt-0.5" style={{ fontSize: '11pt' }}>({type.toUpperCase()})</h2>
      </div>

      {/* Meta Grid - Solid Borders enforced */}
      <table className="w-full border-collapse border-2 border-black mb-4">
        <tbody>
          <tr className="border-b border-black">
            <td className="border-r border-black p-2 w-[35%] bg-white font-bold" style={{ fontSize: '11pt' }}>Name of Employee</td>
            <td className="p-2 uppercase font-bold" style={{ fontSize: '11pt' }}>{userName}</td>
          </tr>
          <tr className="border-b border-black">
            <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Campus/College</td>
            <td className="p-2 uppercase font-bold" style={{ fontSize: '11pt' }}>{campusName}</td>
          </tr>
          {isTeaching ? (
            <>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Teaching Load (Units)</td>
                <td className="p-2 font-bold" style={{ fontSize: '11pt' }}>{latest.teachingLoad || ''}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Nature of Appointment</td>
                <td className="p-2">
                    <div className="flex gap-6 font-bold" style={{ fontSize: '11pt' }}>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Lecturer') ? 'X' : ' ' }] Lecturer</span>
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Part-Time') ? 'X' : ' ' }] Part-Time</span>
                    </div>
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Subject/s Taught</td>
                <td className="p-2 italic font-bold" style={{ fontSize: '11pt' }}>{latest.subjectsTaught || ''}</td>
              </tr>
            </>
          ) : (
            <>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Office Assignment</td>
                <td className="p-2 uppercase font-bold" style={{ fontSize: '11pt' }}>{latest.officeAssignment || ''}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Nature of Appointment</td>
                <td className="p-2 font-bold" style={{ fontSize: '11pt' }}>
                    <div className="flex gap-6">
                        <span className="flex items-center gap-2">[{ (latest.natureOfAppointment === 'Permanent') ? 'X' : ' ' }] Permanent</span>
                    </div>
                </td>
              </tr>
            </>
          )}
          <tr>
            <td className="border-r border-black p-2 bg-white font-bold" style={{ fontSize: '11pt' }}>Other Designations</td>
            <td className="p-2 italic font-bold" style={{ fontSize: '11pt' }}>{latest.otherDesignations || ''}</td>
          </tr>
        </tbody>
      </table>

      {/* Main Content Table - Solid Grid enforced */}
      <table className="w-full border-collapse border-2 border-black mb-4">
        <thead>
          <tr className="bg-gray-100 font-black text-center uppercase border-b-2 border-black">
            <th className="border-r border-black p-2 w-[18%]" style={{ fontSize: '11pt' }}>PERIOD</th>
            <th className="border-r border-black p-2 w-[35%]" style={{ fontSize: '11pt' }}>
                DELIVERABLES
                <p className="font-normal normal-case italic mt-0.5" style={{ fontSize: '8.5pt' }}>
                    (As approved by the Dean/Chair/Campus Director)
                </p>
            </th>
            <th className="p-2" style={{ fontSize: '11pt' }}>
                ACCOMPLISHMENT
                <p className="font-normal normal-case italic mt-0.5" style={{ fontSize: '8.5pt' }}>(Attach additional proofs as needed)</p>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((a, i) => {
            const hasEntry = !!(a.date || a.deliverables || a.accomplishment);
            return (
              <tr key={i} className={`border-b border-black ${hasEntry ? 'min-h-[6rem]' : 'h-8'}`}>
                <td className="border-r border-black p-2 text-center align-top font-black tabular-nums" style={{ fontSize: '11pt' }}>
                  {a.date ? format(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date), 'MM/dd/yy') : ''}
                </td>
                <td className="border-r border-black p-2 align-top font-medium leading-tight text-left" style={{ fontSize: '10pt' }}>
                  {a.deliverables || ''}
                </td>
                <td className="p-2 align-top text-left">
                  {a.accomplishment && (
                    <div className="space-y-3">
                      <p className="italic leading-snug" style={{ fontSize: '10pt' }}>{a.accomplishment}</p>
                      {a.evidenceLink && (
                        <div className="pt-1">
                          <p className="font-black uppercase text-slate-800 leading-none mb-1" style={{ fontSize: '8.5pt' }}>ATTACHMENT/EVIDENCES:</p>
                          <a href={a.evidenceLink} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline break-all font-bold" style={{ fontSize: '9pt' }}>
                            {a.evidenceLink}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 font-bold mb-6 text-center" style={{ fontSize: '10.5pt' }}>
        On my honor, I certify that I rendered the above services within the duration of the National State of Emergency.
      </div>

      {/* Signatures Layout */}
      <div className="flex flex-col items-center mb-8">
        <div className="min-w-[260px] w-fit text-center">
            <div className="font-black uppercase mb-0.5 whitespace-nowrap" style={{ fontSize: '12pt' }}>
                {userName}
            </div>
            <div className="border-t-2 border-black mt-0.5 pt-0.5">
              <p className="uppercase font-black text-slate-900" style={{ fontSize: '9pt' }}>EMPLOYEE'S SIGNATURE OVER PRINTED NAME</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 uppercase mb-4">
        {isTeaching ? (
            <>
                <div className="text-center">
                    <p className="mb-8 font-black text-xs text-left">VALIDATED:</p>
                    <div className="font-black text-center mb-0.5 min-h-[1.2rem] uppercase whitespace-nowrap" style={{ fontSize: '11pt' }}>
                        {deptChair || ''}
                    </div>
                    <div className="border-t-2 border-black pt-0.5">
                      <p className="text-center font-black" style={{ fontSize: '9pt' }}>DEPARTMENT CHAIR</p>
                    </div>
                </div>
                <div className="text-center">
                    <p className="mb-8 font-black text-xs text-left">APPROVED:</p>
                    <div className="font-black text-center mb-0.5 min-h-[1.2rem] uppercase whitespace-nowrap" style={{ fontSize: '11pt' }}>
                        {deanDirector || ''}
                    </div>
                    <div className="border-t-2 border-black pt-0.5">
                      <p className="text-center font-black" style={{ fontSize: '9pt' }}>DEAN/DIRECTOR</p>
                    </div>
                </div>
            </>
        ) : (
            <div className="col-span-2 flex flex-col items-center text-center">
                <p className="mb-8 w-full text-center font-black text-xs">VALIDATED AND APPROVED:</p>
                <div className="min-w-[260px] w-fit">
                    <div className="font-black text-center mb-0.5 uppercase whitespace-nowrap" style={{ fontSize: '11pt' }}>
                        {immediateHead || ''}
                    </div>
                    <div className="border-t-2 border-black pt-0.5">
                      <p className="font-black" style={{ fontSize: '9pt' }}>IMMEDIATE HEAD</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
