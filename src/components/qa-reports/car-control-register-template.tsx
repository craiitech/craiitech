
'use client';

import React from 'react';
import type { CorrectiveActionRequest } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface CARControlRegisterTemplateProps {
  cars: CorrectiveActionRequest[];
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  year: string;
}

export function CARControlRegisterTemplate({ cars, unitMap, campusMap, year }: CARControlRegisterTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const sortedCars = [...cars].sort((a, b) => a.carNumber.localeCompare(b.carNumber));

  const displayRows = [...sortedCars];
  while (displayRows.length < 15) {
    displayRows.push({} as any);
  }

  return (
    <div className="p-4 text-black bg-white max-w-[11in] mx-auto font-sans leading-tight shadow-none border-none">
      <div className="text-center mb-6">
        <h1 className="text-sm font-bold uppercase leading-none">Romblon State University</h1>
        <h2 className="text-xs font-bold uppercase leading-none mt-1">Quality Assurance Office</h2>
        <p className="text-[10px] italic">Odiongan, Romblon</p>
        
        <h2 className="text-xl font-black uppercase tracking-tight mt-6">CAR Control Register</h2>
        {year !== 'all' && (
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">FISCAL YEAR {year}</p>
        )}
      </div>

      <table className="w-full border-collapse border-2 border-black text-[9px]">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-2 border-black p-2 text-center font-bold w-[8%]">CAR NO.</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[18%]">Title</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[14%]">Action Responsible</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[8%]">Reply Limit</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[8%]">Req. Date</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[8%]">Follow-up Date</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[8%]">Final Verif. Date</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[10%]">Status Action</th>
            <th className="border-2 border-black p-2 text-center font-bold w-[10%]">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {displayRows.map((car, i) => {
            const hasData = !!car.id;
            const latestFollowUp = car.followUpLogs && car.followUpLogs.length > 0 
                ? car.followUpLogs[car.followUpLogs.length - 1] 
                : null;
            const latestEffectiveness = car.effectivenessAudits && car.effectivenessAudits.length > 0
                ? car.effectivenessAudits[car.effectivenessAudits.length - 1]
                : null;

            return (
              <tr key={hasData ? car.id : `empty-${i}`} className="h-12 border-b border-black">
                <td className="border border-black p-1 text-center font-bold">{car.carNumber || ''}</td>
                <td className="border border-black p-1 text-left align-top">{car.procedureTitle || ''}</td>
                <td className="border border-black p-1 text-center align-top font-bold uppercase">
                    {hasData ? unitMap.get(car.unitId) : ''}
                </td>
                <td className="border border-black p-1 text-center whitespace-nowrap">{safeDate(car.timeLimitForReply)}</td>
                <td className="border border-black p-1 text-center whitespace-nowrap">{safeDate(car.requestDate)}</td>
                <td className="border border-black p-1 text-center whitespace-nowrap">{safeDate(latestFollowUp?.date)}</td>
                <td className="border border-black p-1 text-center whitespace-nowrap">{safeDate(latestEffectiveness?.date)}</td>
                <td className="border border-black p-1 text-center font-black uppercase text-[7px]">{latestEffectiveness?.action || car.status}</td>
                <td className="border border-black p-1 text-[8px] italic">{latestEffectiveness?.remarks || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex justify-between items-end text-[9px] font-bold">
        <div>
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
