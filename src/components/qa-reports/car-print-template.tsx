
'use client';

import React from 'react';
import type { CorrectiveActionRequest, Campus, Unit, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';

interface CARPrintTemplateProps {
  car: CorrectiveActionRequest;
  unitName: string;
  campusName: string;
}

export function CARPrintTemplate({ car, unitName, campusName }: CARPrintTemplateProps) {
  const firestore = useFirestore();
  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const immediateActions = (car.actionSteps || []).filter(s => s.type === 'Immediate Correction');
  const longTermActions = (car.actionSteps || []).filter(s => s.type === 'Long-term Corrective Action');
  
  // Use the latest verification record for the bottom sections
  const latestVerification = car.verificationRecords && car.verificationRecords.length > 0 
    ? car.verificationRecords[car.verificationRecords.length - 1] 
    : null;

  const directorName = signatories?.qaoDirector || car.approvedBy || 'DR. MARVIN RICK G. FORCADO';

  return (
    <div className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans text-[11px] leading-tight border-none">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold">Romblon State University</h1>
        <h2 className="text-md font-bold">Quality Assurance Office</h2>
        <p className="text-xs italic">Odiongan, Romblon</p>
        <div className="mt-4 border-y-2 border-black py-1.5 bg-slate-50">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">CORRECTIVE ACTION REQUEST</h2>
        </div>
      </div>

      {/* Identification Table */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-4 border-r border-black p-2 flex flex-col gap-2">
            <p className="font-bold">Source:</p>
            <div className="space-y-1 pl-2">
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
            <p className="font-bold">Title: <span className="font-normal">(Title of Procedure)</span></p>
            <p className="mt-2 text-sm font-bold uppercase">{car.procedureTitle}</p>
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold">NC Report No.:</p>
            <p className="mt-2 text-sm font-mono">{car.ncReportNumber || '--'}</p>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-black p-2">
            <p className="font-bold">Initiator:</p>
            <p className="text-sm font-bold">{car.initiator}</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold">Nature of Findings:</p>
            <div className="flex gap-8 mt-1">
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
            <p className="font-bold">Concerning:</p>
            <p className="text-sm font-bold uppercase">{car.concerningTopManagementName || 'Not Assigned'}</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold">Time Limit for Reply:</p>
            <p className="text-sm font-black">{safeDate(car.timeLimitForReply)}</p>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12">
          <div className="col-span-6 border-r border-black p-2">
            <p className="font-bold">Responsible Unit:</p>
            <p className="text-sm font-bold uppercase">{unitName} ({campusName})</p>
          </div>
          <div className="col-span-6 p-2">
            <p className="font-bold">Head of Unit:</p>
            <p className="text-sm font-bold uppercase">{car.unitHead}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="p-2 min-h-[100px]">
          <p className="font-bold">Description of the Nonconformance:</p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed italic">"{car.descriptionOfNonconformance}"</p>
        </div>
      </div>

      {/* Signatories 1 */}
      <div className="w-full border-2 border-black border-b-0 overflow-hidden">
        <div className="grid grid-cols-3 text-center font-bold">
          <div className="border-r border-black p-2">
            <p className="text-[9px] uppercase opacity-60 mb-4">Request Date</p>
            <p className="border-t border-black pt-1">{safeDate(car.requestDate)}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="text-[9px] uppercase opacity-60 mb-4">Prepared by</p>
            <p className="border-t border-black pt-1 uppercase">{car.preparedBy}</p>
          </div>
          <div className="p-2">
            <p className="text-[9px] uppercase opacity-60 mb-4">Approved by</p>
            <p className="border-t border-black pt-1 uppercase">{directorName}</p>
          </div>
        </div>
      </div>

      {/* Investigation */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="p-2 min-h-[100px]">
          <p className="font-bold">Investigate the cause of the Nonconformity:</p>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed">{car.rootCauseAnalysis || 'Awaiting Investigation...'}</p>
        </div>
      </div>

      {/* Actions Section */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[120px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold">Correction / Immediate Action:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {immediateActions.map((step, i) => (
                <li key={i}>{step.description}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-3">
            <div className="h-8 border-b border-black flex items-center justify-center font-bold">Completion Date</div>
            <div className="p-2 text-center text-sm font-bold flex flex-col items-center justify-center h-[calc(100%-2rem)]">
              {immediateActions.length > 0 && safeDate(immediateActions[0].completionDate)}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[120px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold">Corrective Action:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              {longTermActions.map((step, i) => (
                <li key={i}>{step.description}</li>
              ))}
            </ul>
          </div>
          <div className="col-span-3">
            <div className="h-8 border-b border-black flex items-center justify-center font-bold">Completion Date</div>
            <div className="p-2 text-center text-sm font-bold flex flex-col items-center justify-center h-[calc(100%-2rem)]">
              {longTermActions.length > 0 && safeDate(longTermActions[0].completionDate)}
            </div>
          </div>
        </div>
      </div>

      {/* Signatories 2 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-2 text-center">
          <div className="border-r border-black p-4">
            <p className="font-bold uppercase text-[9px] mb-6">Responsible Unit</p>
            <p className="border-t border-black pt-1 font-bold">{unitName}</p>
          </div>
          <div className="p-4">
            <p className="font-bold uppercase text-[9px] mb-6">Signature-Over-Printed Name / Date</p>
            <p className="border-t border-black pt-1 font-bold">{car.unitHead}</p>
          </div>
        </div>
      </div>

      {/* Follow-up Result */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[100px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold">Follow up result of the Correction and Corrective Action</p>
            <p className="mt-2 italic">{latestVerification?.result || '--'}</p>
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold">Remarks:</p>
            <p className="mt-1 text-[10px]">{latestVerification?.remarks || '--'}</p>
          </div>
        </div>
      </div>

      {/* Verification Footer 1 */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-3 text-center font-bold text-[9px] uppercase">
          <div className="border-r border-black p-2">
            <p className="mb-4">Verified by:</p>
            <p className="border-t border-black pt-1">{latestVerification?.resultVerifiedBy || '________________'}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="mb-4">Date of Follow-up:</p>
            <p className="border-t border-black pt-1">{safeDate(latestVerification?.resultVerificationDate)}</p>
          </div>
          <div className="p-2">
            <p className="mb-4">Date of Final/Verification Visit:</p>
            <p className="border-t border-black pt-1">________________</p>
          </div>
        </div>
      </div>

      {/* Effectiveness Section */}
      <div className="w-full border-2 border-black border-b-0">
        <div className="grid grid-cols-12 min-h-[100px]">
          <div className="col-span-9 border-r border-black p-2">
            <p className="font-bold">Verification of Effectiveness of the action taken:</p>
            <p className="mt-2 italic">{latestVerification?.effectivenessResult || '--'}</p>
          </div>
          <div className="col-span-3 p-2">
            <p className="font-bold">Remarks:</p>
            <p className="mt-1 text-[10px]">{latestVerification?.remarks || '--'}</p>
          </div>
        </div>
      </div>

      {/* Final Verification Signatories */}
      <div className="w-full border-2 border-black">
        <div className="grid grid-cols-3 text-center font-bold text-[9px] uppercase">
          <div className="border-r border-black p-2">
            <p className="mb-4">Verified by:</p>
            <p className="border-t border-black pt-1">{latestVerification?.effectivenessVerifiedBy || '________________'}</p>
          </div>
          <div className="border-r border-black p-2">
            <p className="mb-4">Date of Verification:</p>
            <p className="border-t border-black pt-1">{safeDate(latestVerification?.effectivenessVerificationDate)}</p>
          </div>
          <div className="p-2">
            <p className="mb-4">Approved by:</p>
            <p className="border-t border-black pt-1">{directorName}</p>
          </div>
        </div>
      </div>

      {/* Final Footer Row */}
      <div className="grid grid-cols-2 text-[9px] mt-2 font-bold italic">
        <div className="flex gap-2">
          <span>Received by: (For Filing) _________________________</span>
        </div>
        <div className="text-right">
          <span>Date Received: ________________</span>
        </div>
      </div>

      {/* Form Identifier */}
      <div className="mt-6 flex justify-between items-end">
        <div className="text-[10px] font-bold">
          <p>QAO-01-018</p>
          <p className="font-normal opacity-60">Creation Date: 2021-02-14</p>
          <p className="font-normal opacity-60">Revision Date: 2021-10-15</p>
        </div>
        <div className="text-md font-black">
          CAR No.: <span className="font-mono">{car.carNumber}</span>
        </div>
      </div>
    </div>
  );
}
