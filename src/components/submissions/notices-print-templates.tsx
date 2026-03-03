
'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FileWarning, CheckCircle2, ShieldCheck, School } from 'lucide-react';

interface NoticeProps {
  unitName: string;
  campusName: string;
  year: number;
  missingFirst: string[];
  missingFinal: string[];
  totalApproved: number;
  totalPossible: number;
  qaoDirector: string;
}

/**
 * NOTICE OF NON-COMPLIANCE TEMPLATE
 */
export function NoticeOfNonCompliance({ unitName, campusName, year, missingFirst, missingFinal, qaoDirector }: NoticeProps) {
  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed">
      {/* Institutional Header */}
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
        <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
        <p className="text-xs italic">Main Campus, Odiongan, Romblon</p>
      </div>

      <div className="flex justify-between mb-10">
        <div className="space-y-1">
            <p className="font-bold">MEMORANDUM</p>
            <p className="text-xs">Ref No: RSU-QAO-NNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-4 mb-10">
        <div className="grid grid-cols-12 gap-2">
            <span className="col-span-2 font-bold uppercase">FOR:</span>
            <span className="col-span-10 font-bold uppercase">THE HEAD / DIRECTOR, {unitName}</span>
        </div>
        <div className="grid grid-cols-12 gap-2 border-b border-black pb-4">
            <span className="col-span-2 font-bold uppercase">THRU:</span>
            <span className="col-span-10 font-bold uppercase">THE CAMPUS DIRECTOR, {campusName}</span>
        </div>
        <div className="grid grid-cols-12 gap-2 pt-2">
            <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-10 font-black uppercase underline">NOTICE OF NON-COMPLIANCE (EOMS DOCUMENTATION)</span>
        </div>
      </div>

      <div className="space-y-6 text-sm">
        <p>
            This is to formally inform your office that as of <strong>{format(new Date(), 'PPP')}</strong>, the 
            <strong> {unitName}</strong> has failed to complete the mandatory documentation requirements for the 
            Educational Organizations Management System (EOMS) aligned with ISO 21001:2018 for the Academic Year <strong>{year}</strong>.
        </p>

        <p>
            Upon verification through the RSU EOMS Portal, the following required reports are either <strong>missing</strong> or 
            <strong>awaiting necessary corrections</strong> for final approval:
        </p>

        <div className="space-y-4 py-4">
            {missingFirst.length > 0 && (
                <div className="border border-black p-4 bg-slate-50">
                    <p className="font-bold text-xs uppercase mb-2">I. FIRST SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-decimal pl-8 space-y-1">
                        {missingFirst.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            )}
            {missingFinal.length > 0 && (
                <div className="border border-black p-4 bg-slate-50">
                    <p className="font-bold text-xs uppercase mb-2">II. FINAL SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-decimal pl-8 space-y-1">
                        {missingFinal.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            )}
        </div>

        <p>
            Please be reminded that full compliance with documentation cycles is critical for institutional quality audits and 
            the maintenance of our ISO certification. You are hereby directed to upload the corrected documents to your 
            designated Google Drive folders and notify the Quality Assurance Office within <strong>three (3) working days</strong> 
            from receipt of this notice.
        </p>

        <p>For your immediate compliance and appropriate action.</p>
      </div>

      <div className="mt-20">
        <div className="w-64 text-center">
            <div className="border-b border-black font-bold uppercase pt-8">{qaoDirector}</div>
            <p className="text-[10px] uppercase font-bold mt-1">Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-16 text-[9px] text-slate-400 italic border-t pt-4 flex justify-between">
        <span>RSU-QAO-FOR-022 | Rev 00</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE
 */
export function NoticeOfCompliance({ unitName, campusName, year, totalApproved, qaoDirector }: NoticeProps) {
  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed border-[12px] border-double border-slate-200">
      <div className="border-2 border-slate-800 p-8 min-h-[9in] flex flex-col">
        {/* Institutional Header */}
        <div className="text-center pb-6 mb-12">
            <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
            <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
            <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-8 flex-1">
            <div className="flex justify-center mb-4">
                <CheckCircle2 className="h-16 w-16 text-emerald-600" />
            </div>
            
            <h2 className="text-3xl font-black uppercase tracking-[0.1em] text-slate-900">Notice of Compliance</h2>
            
            <p className="text-lg italic text-slate-600">This is to certify that the</p>
            
            <div className="py-4">
                <h3 className="text-2xl font-black uppercase text-primary underline underline-offset-8 decoration-slate-300">{unitName}</h3>
                <p className="text-md font-bold text-slate-700 mt-2">{campusName}</p>
            </div>

            <p className="max-w-xl mx-auto text-md leading-relaxed">
                has successfully completed and fulfilled all mandatory documentation requirements for the 
                <strong> Educational Organizations Management System (EOMS)</strong> compliant with 
                <strong> ISO 21001:2018</strong> standards for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl max-w-sm mx-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">Verification Registry Status</p>
                <div className="flex items-center justify-center gap-3">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                    <span className="text-xl font-black text-emerald-800">{totalApproved} / {totalApproved} Verified Approved</span>
                </div>
            </div>

            <p className="text-sm text-slate-500 pt-8">
                Issued this <strong>{format(new Date(), 'do')}</strong> day of <strong>{format(new Date(), 'MMMM')}</strong>, 
                <strong> {format(new Date(), 'yyyy')}</strong>.
            </p>
        </div>

        <div className="mt-20 flex justify-center">
            <div className="w-80 text-center">
                <div className="font-bold text-lg uppercase">{qaoDirector}</div>
                <div className="w-full h-px bg-black my-1" />
                <p className="text-xs uppercase font-black tracking-widest text-slate-600">Director, Quality Assurance Office</p>
            </div>
        </div>

        <div className="mt-auto pt-8 flex justify-between items-end text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col">
                <span>Verification Code: VER-{year}-{format(new Date(), 'HHmm')}</span>
                <span>RSU-QAO-FOR-023 | REV 00</span>
            </div>
            <div className="text-right">
                <p>Authenticated Institutional Document</p>
                <p>Issued by RSU EOMS Digital Portal</p>
            </div>
        </div>
      </div>
    </div>
  );
}
