'use client';

import React from 'react';
import type { CorrectiveActionRequest, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

interface CARPrintTemplateProps {
  car: CorrectiveActionRequest;
  unitName: string;
  campusName: string;
  signatories?: Signatories;
}

export function CARPrintTemplate({ car, unitName, campusName, signatories }: CARPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const immediateActions = (car.actionSteps || []).filter(s => s.type === 'Immediate Correction');
  const longTermActions = (car.actionSteps || []).filter(s => s.type === 'Long-term Corrective Action');
  
  const latestFollowUp = car.followUpLogs && car.followUpLogs.length > 0 
    ? car.followUpLogs[car.followUpLogs.length - 1] 
    : null;

  const latestEffectiveness = car.effectivenessAudits && car.effectivenessAudits.length > 0
    ? car.effectivenessAudits[car.effectivenessAudits.length - 1]
    : null;

  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-0 text-black bg-white mx-auto font-sans leading-tight border-none" style={{ width: '7.5in', fontSize: '11pt' }}>
      {/* Header - Centered without logo */}
      <div className="text-center mb-4">
        <div className="flex flex-col items-center justify-center gap-1 mb-2">
            <h1 className="font-bold uppercase" style={{ fontSize: '12pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase mt-1" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p style={{ fontSize: '10pt' }} className="italic">Odiongan, Romblon</p>
        </div>
        <div className="mt-4 border-y-2 border-black py-1.5 bg-slate-50">
          <h2 className="font-black uppercase tracking-[0.2em]" style={{ fontSize: '12pt' }}>CORRECTIVE ACTION REQUEST</h2>
        </div>
      </div>

      {/* Identification Table */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-4 border-r border-black p-2 flex flex-col gap-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Source:</p>
            <div className="space-y-1 pl-2" style={{ fontSize: '10pt' }}>
              {['Audit Finding', 'Legal Non-compliance', 'Non-conforming Service', 'Others'].map(s => (
                <div key={s} className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 border border-black flex items-center justify-center", car.source === s && "bg-black")}>
                    {car.source === s && <div className="w-1 h-1 bg-white" />}
                  </div>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-5 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Title: <span className="font-normal">(Title of Procedure)</span></p>
            <p className="mt-2 font-bold uppercase" style={{ fontSize: '11pt' }}>{car.procedureTitle}</p>
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>NC Report No.:</p>
            <p className="mt-2 font-mono" style={{ fontSize: '11pt' }}>{car.ncReportNumber || '--'}</p>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Initiator:</p>
            <p className="font-bold" style={{ fontSize: '11pt' }}>{car.initiator}</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Nature of Findings:</p>
            <div className="flex gap-8 mt-1" style={{ fontSize: '10pt' }}>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 border border-black flex items-center justify-center", car.natureOfFinding === 'NC' && "bg-black")}></div>
                <span>NC</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn("w-3 h-3 border border-black flex items-center justify-center", car.natureOfFinding === 'OFI' && "bg-black")}></div>
                <span>OFI</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Concerning:</p>
            <p className="font-bold uppercase" style={{ fontSize: '11pt' }}>{car.concerningTopManagementName || 'Not Assigned'}</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Time Limit for Reply:</p>
            <p className="font-black" style={{ fontSize: '11pt' }}>{safeDate(car.timeLimitForReply)}</p>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Responsible Unit:</p>
            <p className="font-bold uppercase" style={{ fontSize: '11pt' }}>{unitName} ({campusName})</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Head of Unit:</p>
            <p className="font-bold uppercase" style={{ fontSize: '11pt' }}>{car.unitHead}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="p-2 min-h-[100px]">
          <p className="font-bold" style={{ fontSize: '10pt' }}>Description of the Nonconformance:</p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed italic" style={{ fontSize: '11pt' }}>"{car.descriptionOfNonconformance}"</p>
        </div>
      </div>

      {/* Signatories 1 */}
      <div className="w-full border-2 border-black border-b-0 overflow-hidden">
        <div className="grid grid-cols-3 text-center font-bold">
          <div className="border-r border-black p-2">
            <p className="uppercase opacity-60 mb-4" style={{ fontSize: '10pt' }}>Request Date</p>
            <p className="border-t border-black pt-1" style={{ fontSize: '11pt' }}>{safeDate(car.requestDate)}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="uppercase opacity-60 mb-4" style={{ fontSize: '10pt' }}>Prepared by</p>
            <p className="border-t border-black pt-1 uppercase" style={{ fontSize: '11pt' }}>{car.preparedBy}</p>
          </div>
          <div className="p-2">
            <p className="uppercase opacity-60 mb-4" style={{ fontSize: '10pt' }}>Approved by</p>
            <p className="border-t border-black pt-1 uppercase" style={{ fontSize: '11pt' }}>{directorName}</p>
          </div>
        </div>
      </div>

      {/* Investigation */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="p-2 min-h-[100px]">
          <p className="font-bold" style={{ fontSize: '10pt' }}>Investigate the cause of the Nonconformity:</p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed" style={{ fontSize: '11pt' }}>{car.rootCauseAnalysis || 'Awaiting Investigation...'}</p>
        </div>
      </div>

      {/* Actions Section */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[120px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Correction / Immediate Action:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1" style={{ fontSize: '11pt' }}>
              {immediateActions.map((step, i) => (
                <li key={i}>{step.description}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-3">
            <div className="h-8 border-b border-black flex items-center justify-center font-bold" style={{ fontSize: '10pt' }}>Completion Date</div>
            <div className="p-2 text-center font-bold flex flex-col items-center justify-center h-[calc(100%-2rem)]" style={{ fontSize: '11pt' }}>
              {immediateActions.length > 0 && safeDate(immediateActions[0].completionDate)}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[120px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Corrective Action:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1" style={{ fontSize: '11pt' }}>
              {longTermActions.map((step, i) => (
                <li key={i}>{step.description}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-3">
            <div className="h-8 border-b border-black flex items-center justify-center font-bold" style={{ fontSize: '10pt' }}>Completion Date</div>
            <div className="p-2 text-center font-bold flex flex-col items-center justify-center h-[calc(100%-2rem)]" style={{ fontSize: '11pt' }}>
              {longTermActions.length > 0 && safeDate(longTermActions[0].completionDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Signatories 2 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-2 text-center">
          <div className="border-r border-black p-4">
            <p className="font-bold uppercase mb-6" style={{ fontSize: '10pt' }}>Responsible Unit</p>
            <p className="border-t border-black pt-1 font-bold" style={{ fontSize: '11pt' }}>{unitName}</p>
          </div>
          <div className="p-4">
            <p className="font-bold uppercase mb-6" style={{ fontSize: '10pt' }}>Signature-Over-Printed Name / Date</p>
            <p className="border-t border-black pt-1 font-bold" style={{ fontSize: '11pt' }}>{car.unitHead}</p>
          </div>
        </div>
      </div>

      {/* III. Follow-up Result */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[100px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>III. Follow up result of the Correction and Corrective Action</p>
            <p className="mt-2 italic" style={{ fontSize: '11pt' }}>{latestFollowUp?.result || '--'}</p>
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Remarks:</p>
            <p className="mt-1 italic" style={{ fontSize: '10pt' }}>{latestFollowUp?.remarks || '--'}</p>
          </div>
        </div>
      </div>

      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-3 text-center font-bold uppercase" style={{ fontSize: '10pt' }}>
          <div className="border-r border-black p-2">
            <p className="mb-4">Verified by:</p>
            <p className="border-t border-black pt-1">{latestFollowUp?.verifiedBy || '________________'}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="mb-4">Date of Follow-up:</p>
            <p className="border-t border-black pt-1">{safeDate(latestFollowUp?.date)}</p>
          </div>
          <div className="p-2">
            <p className="mb-4">Verification Code:</p>
            <p className="border-t border-black pt-1">IQA-FU-{format(new Date(), 'yyyy')}</p>
          </div>
        </div>
      </div>

      {/* IV. Effectiveness Section */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[100px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>IV. Verification of Effectiveness of the action taken:</p>
            <p className="mt-2 italic" style={{ fontSize: '11pt' }}>{latestEffectiveness?.result || '--'}</p>
            {latestEffectiveness?.action && (
                <p className="mt-4 font-black uppercase text-primary" style={{ fontSize: '12pt' }}>DETERMINATION: {latestEffectiveness.action}</p>
            )}
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold" style={{ fontSize: '10pt' }}>Remarks:</p>
            <p className="mt-1 italic" style={{ fontSize: '10pt' }}>{latestEffectiveness?.remarks || '--'}</p>
          </div>
        </div>
      </div>

      {/* Final Verification Signatories */}
      <div className="w-full border-2 border-black">
        <div className="grid grid-cols-3 text-center font-bold uppercase" style={{ fontSize: '10pt' }}>
          <div className="border-r border-black p-2">
            <p className="mb-4">Verified by:</p>
            <p className="border-t border-black pt-1">{latestEffectiveness?.verifiedBy || '________________'}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="mb-4">Date of Verification:</p>
            <p className="border-t border-black pt-1">{safeDate(latestEffectiveness?.date)}</p>
          </div>
          <div className="p-2">
            <p className="mb-4">Approved by:</p>
            <p className="border-t border-black pt-1">{directorName}</p>
          </div>
        </div>
      </div>

      {/* System Generated Note */}
      <div className="mt-4 text-center font-bold italic text-slate-500" style={{ fontSize: '11pt' }}>
        This is a system-generated report; signature is not required.
      </div>

      {/* Pagination & Form Control Footer */}
      <div className="mt-6 flex justify-between items-end">
        <div className="font-bold" style={{ fontSize: '10pt' }}>
          <p>QAO-01-018</p>
          <p className="font-normal opacity-60">Creation Date: 2021-02-14</p>
        </div>
        <div className="font-black" style={{ fontSize: '12pt' }}>
          CAR No.: <span className="font-mono">{car.carNumber}</span>
        </div>
      </div>
    </div>
  );
}
