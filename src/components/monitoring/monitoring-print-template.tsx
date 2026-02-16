'use client';

import React from 'react';
import type { UnitMonitoringRecord } from '@/lib/types';
import { monitoringGroups, statusLegend } from '@/lib/monitoring-checklist-items';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface MonitoringPrintTemplateProps {
  record: UnitMonitoringRecord;
  campusName: string;
  unitName: string;
}

export function MonitoringPrintTemplate({ record, campusName, unitName }: MonitoringPrintTemplateProps) {
  if (!record) return null;

  const visitDate = record.visitDate instanceof Timestamp 
    ? record.visitDate.toDate() 
    : (record.visitDate ? new Date(record.visitDate) : new Date());

  return (
    <div className="p-8 text-black bg-white max-w-4xl mx-auto font-sans leading-tight shadow-none border-none">
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
        <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
        <div className="mt-2 py-1 px-4 bg-black text-white inline-block uppercase text-sm font-black tracking-widest">
          Unit Monitoring Report
        </div>
      </div>

      {/* Meta Information */}
      <div className="grid grid-cols-2 gap-y-2 text-sm mb-8">
        <div><span className="font-bold">CAMPUS / SITE:</span> {campusName}</div>
        <div><span className="font-bold">DATE OF VISIT:</span> {format(visitDate, 'PPPP')}</div>
        <div><span className="font-bold">UNIT / OFFICE:</span> {unitName}</div>
        <div><span className="font-bold">BUILDING:</span> {record.building || 'N/A'}</div>
        <div><span className="font-bold">OFFICE / ROOM NO:</span> {record.roomNumber || 'N/A'}</div>
        <div className="col-span-2"><span className="font-bold">OFFICER IN CHARGE:</span> {record.officerInCharge || 'N/A'}</div>
      </div>

      {/* Checklist Table */}
      <table className="w-full border-collapse border border-black mb-8 text-xs">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left w-1/2">MONITORING ITEM / DOCUMENT</th>
            <th className="border border-black p-2 text-center w-1/6">STATUS</th>
            <th className="border border-black p-2 text-left w-1/3">REMARKS / FINDINGS</th>
          </tr>
        </thead>
        <tbody>
          {monitoringGroups.map((group) => (
            <React.Fragment key={group.category}>
              <tr className="bg-gray-200 font-bold uppercase tracking-tighter">
                <td colSpan={3} className="border border-black p-2">
                  {group.category}
                </td>
              </tr>
              {group.items.map((itemName) => {
                const obs = record.observations?.find((o) => o.item === itemName);
                return (
                  <tr key={itemName}>
                    <td className="border border-black p-2">{itemName}</td>
                    <td className="border border-black p-2 text-center font-semibold">
                      {obs?.status || 'N/A'}
                    </td>
                    <td className="border border-black p-2 italic text-[10px]">
                      {obs?.remarks || '--'}
                    </td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>

      {/* General Remarks */}
      <div className="mb-8">
        <h3 className="font-bold text-sm uppercase mb-2">Final Assessment & General Remarks:</h3>
        <div className="p-4 border border-black min-h-[100px] text-sm whitespace-pre-wrap">
          {record.generalRemarks || 'No general remarks provided.'}
        </div>
      </div>

      {/* Legend Section */}
      <div className="mb-12 pt-4 border-t-2 border-black">
        <h3 className="font-bold text-xs uppercase mb-2">Status Legend & Criteria:</h3>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[9px] leading-tight">
          {statusLegend.map((item) => (
            <div key={item.status} className="flex gap-2">
              <span className="font-bold min-w-[80px]">{item.status}:</span>
              <span className="text-gray-600 italic">{item.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-12 pt-8">
        <div className="text-center">
          <div className="border-b border-black font-bold text-sm pb-1 mb-1 min-h-[20px]">
            {record.monitorName}
          </div>
          <p className="text-[10px] uppercase font-semibold">IQA Monitor / QA Representative</p>
        </div>
        <div className="text-center">
          <div className="border-b border-black font-bold text-sm pb-1 mb-1 min-h-[20px]">
            {record.officerInCharge || '____________________________'}
          </div>
          <p className="text-[10px] uppercase font-semibold">Officer in Charge / Unit Head</p>
        </div>
      </div>

      {/* Printing Footer */}
      <div className="mt-16 text-[9px] text-gray-400 italic text-center border-t pt-4">
        This document is an official record generated by the RSU EOMS Portal on {format(new Date(), 'PPpp')}.
      </div>
    </div>
  );
}
