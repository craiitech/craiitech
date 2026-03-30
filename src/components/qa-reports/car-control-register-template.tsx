'use client';

import React from 'react';
import type { CorrectiveActionRequest } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface CARControlRegisterTemplateProps {
  cars: CorrectiveActionRequest[];
  unitMap: Map<string, string>;
  year: string;
}

export function CARControlRegisterTemplate({ cars, unitMap, year }: CARControlRegisterTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  // Sort cars by CAR number for the registry
  const sortedCars = [...cars].sort((a, b) => a.carNumber.localeCompare(b.carNumber));

  // Ensure we show at least 15 rows for the "logbook" look, even if empty
  const displayRows = [...sortedCars];
  while (displayRows.length < 15) {
    displayRows.push({} as any);
  }

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight shadow-none border-none">
      {/* Institutional Header */}
      <div className="text-center mb-6">
        <h1 className="text-sm font-bold uppercase leading-none">Romblon State University</h1>
        <h2 className="text-xs font-bold uppercase leading-none mt-1">Quality Assurance Office</h2>
        <p className="text-[10px] italic">Odiongan, Romblon</p>
        
        <h2 className="text-xl font-black uppercase tracking-tight mt-6">CAR Control Register</h2>
        {year !== 'all' && (
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">FISCAL YEAR {year}</p>
        )}
      </div>

      {/* Main Registry Table */}
      <table className="w-full border-collapse border-2 border-black text-[9px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-black p-2 text-center font-bold w-[8%]">CAR NO.</th>
            <th className="border border-black p-2 text-center font-bold w-[18%]">Title</th>
            <th className="border border-black p-2 text-center font-bold w-[14%]">
                Action<br />Responsible
            </th>
            <th className="border border-black p-2 text-center font-bold w-[8%]">Time limit for reply</th>
            <th className="border border-black p-2 text-center font-bold w-[8%]">Request Date</th>
            <th className="border border-black p-2 text-center font-bold w-[8%]">
                (Corrective)<br />Completion Date
            </th>
            <th className="border border-black p-2 text-center font-bold w-[8%]">Date of result verification</th>
            <th className="border border-black p-2 text-center font-bold w-[8%]">Receipt Date</th>
            <th className="border border-black p-2 text-center font-bold w-[10%]">Signature</th>
            <th className="border border-black p-2 text-center font-bold w-[10%]">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((car, i) => {
            const hasData = !!car.id;
            const latestVerification = car.verificationRecords && car.verificationRecords.length > 0 
                ? car.verificationRecords[car.verificationRecords.length - 1] 
                : null;
            
            // Get completion date from long-term action or first action step
            const completionDate = car.actionSteps?.find(s => s.type === 'Long-term Corrective Action')?.completionDate 
                || car.actionSteps?.[0]?.completionDate;

            return (
              <tr key={hasData ? car.id : `empty-${i}`} className="h-10 border-b border-black">
                <td className="border-x border-black p-1 text-center font-bold">{car.carNumber || ''}</td>
                <td className="border-x border-black p-1 text-left align-top">{car.procedureTitle || ''}</td>
                <td className="border-x border-black p-1 text-center align-top">
                    {hasData ? (
                        <>
                            <div className="font-bold uppercase leading-tight">{unitMap.get(car.unitId)}</div>
                            <div className="text-[7px] mt-1 opacity-60">Head: {car.unitHead}</div>
                        </>
                    ) : ''}
                </td>
                <td className="border-x border-black p-1 text-center font-bold whitespace-nowrap">{safeDate(car.timeLimitForReply)}</td>
                <td className="border-x border-black p-1 text-center whitespace-nowrap">{safeDate(car.requestDate)}</td>
                <td className="border-x border-black p-1 text-center whitespace-nowrap">{safeDate(completionDate)}</td>
                <td className="border-x border-black p-1 text-center whitespace-nowrap">{safeDate(latestVerification?.resultVerificationDate)}</td>
                <td className="border-x border-black p-1 text-center whitespace-nowrap"></td>
                <td className="border-x border-black p-1"></td>
                <td className="border-x border-black p-1 text-[8px] italic">{latestVerification?.remarks || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer Meta */}
      <div className="mt-4 flex justify-between items-end text-[9px] font-bold">
        <div className="space-y-0.5">
          <p>QAO-00-019</p>
          <p className="font-normal opacity-60">Creation Date: 2021-02-14</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black">CCR No.: <span className="underline ml-1">________________</span></p>
        </div>
      </div>
    </div>
  );
}
