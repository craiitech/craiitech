'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface NoticeProps {
  unitName: string;
  campusName: string;
  year: number;
  missingFirst: string[];
  missingFinal: string[];
  totalApproved: number;
  totalPossible: number;
  qaoDirector: string;
  qmsHead: string;
}

interface CampusNoticeProps {
  campusName: string;
  year: number;
  qaoDirector: string;
  qmsHead: string;
  units: {
    name: string;
    score: number;
    approvedCount: number;
    totalPossible: number;
    missingFirst: string[];
    missingFinal: string[];
  }[];
}

/**
 * NOTICE OF NON-COMPLIANCE TEMPLATE (UNIT LEVEL)
 */
export function NoticeOfNonCompliance({ unitName, campusName, year, missingFirst, missingFinal, qaoDirector, qmsHead }: NoticeProps) {
  const isPresident = unitName.toLowerCase().includes('president');
  const isVP = unitName.toLowerCase().includes('vice president');
  const isMainCampus = campusName.toLowerCase().includes('main campus');

  let forLine = '';
  let thruLine: string | null = null;

  if (isPresident) {
    forLine = "OFFICE OF THE UNIVERSITY PRESIDENT";
  } else if (isVP) {
    forLine = unitName.toUpperCase();
  } else if (isMainCampus) {
    forLine = `THE UNIT HEAD / DIRECTOR / DEAN / PROGRAM CHAIR, ${unitName.toUpperCase()}`;
  } else {
    forLine = `UNIT COORDINATORS / DEPARTMENT HEAD / PROGRAM CHAIRS, ${unitName.toUpperCase()}`;
    thruLine = `THE CAMPUS DIRECTOR, ${campusName.toUpperCase()}`;
  }

  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed">
      {/* Institutional Header */}
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        <div className="space-y-1">
            <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
            <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
            <p className="text-xs italic">Main Campus, Odiongan, Romblon</p>
        </div>
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
            <span className="col-span-2 font-bold uppercase text-xs">FOR:</span>
            <span className="col-span-10 font-bold uppercase text-xs">{forLine}</span>
        </div>
        
        {thruLine ? (
            <div className="grid grid-cols-12 gap-2 border-b border-black pb-4">
                <span className="col-span-2 font-bold uppercase text-xs">THRU:</span>
                <span className="col-span-10 font-bold uppercase text-xs">{thruLine}</span>
            </div>
        ) : (
            <div className="border-b border-black pb-4" />
        )}

        <div className="grid grid-cols-12 gap-2 pt-2">
            <span className="col-span-2 font-bold uppercase text-xs">SUBJECT:</span>
            <span className="col-span-10 font-black uppercase underline text-xs">NOTICE OF NON-COMPLIANCE (EOMS DOCUMENTATION)</span>
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

      <div className="mt-20 space-y-12">
        <div className="w-64">
            <div className="border-b border-black font-bold uppercase text-center pb-1">{qmsHead}</div>
            <p className="text-[10px] uppercase font-bold mt-1 text-center">Head, Quality Management System Unit</p>
        </div>
        
        <div className="w-64">
            <p className="text-[10px] font-bold uppercase mb-4">Noted by:</p>
            <div className="border-b border-black font-bold uppercase text-center pb-1">{qaoDirector}</div>
            <p className="text-[10px] uppercase font-bold mt-1 text-center">Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-8 text-center text-[9px] font-bold italic text-slate-500">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-16 text-[9px] text-slate-400 italic border-t pt-4 flex justify-between">
        <span>RSU-QAO-FOR-022 | Rev 00</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE (UNIT LEVEL)
 */
export function NoticeOfCompliance({ unitName, campusName, year, totalApproved, qaoDirector, qmsHead }: NoticeProps) {
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

        <div className="mt-20 grid grid-cols-2 gap-12">
            <div className="text-center">
                <div className="font-bold uppercase border-b border-black pb-1 mb-1">{qmsHead}</div>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-600">Head, QMS Unit</p>
            </div>
            <div className="text-center">
                <div className="font-bold uppercase border-b border-black pb-1 mb-1">{qaoDirector}</div>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-600">Director, QAO (Noted By)</p>
            </div>
        </div>

        <div className="mt-8 text-center text-[9px] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-8 flex justify-between items-end text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col">
                <span>Verification Code: VER-{year}-{format(new Date(), 'HHmm')}</span>
                <span>RSU-QAO-FOR-023 | REV 00</span>
            </div>
            <div className="text-right">
                <p>Institutional Excellence Record</p>
                <p>Issued by RSU EOMS Digital Portal</p>
            </div>
        </div>
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (NON-COMPLIANCE)
 */
export function CampusNoticeOfNonCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  const nonCompliantUnits = units.filter(u => u.score < 100);
  const compliantUnits = units.filter(u => u.score === 100);

  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed">
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        <div className="space-y-1">
            <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
            <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
            <p className="text-xs italic">Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-10">
        <div className="space-y-1">
            <p className="font-bold">MEMORANDUM</p>
            <p className="text-xs">Ref No: RSU-QAO-CNNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-4 mb-10">
        <div className="grid grid-cols-12 gap-2 border-b border-black pb-4">
            <span className="col-span-2 font-bold uppercase">FOR:</span>
            <span className="col-span-10 font-bold uppercase text-lg">THE CAMPUS DIRECTOR, {campusName}</span>
        </div>
        <div className="grid grid-cols-12 gap-2 pt-2">
            <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-10 font-black uppercase underline">CONSOLIDATED EOMS COMPLIANCE STATUS REPORT</span>
        </div>
      </div>

      <div className="space-y-6 text-[13px]">
        <p>
            Respectfully submitted herewith is the <strong>Consolidated Compliance Status Report</strong> for the 
            <strong> {campusName}</strong> Academic Year <strong>{year}</strong>, as verified through the 
            RSU EOMS Digital Submission and Monitoring Portal.
        </p>

        <div className="space-y-8">
            {nonCompliantUnits.length > 0 && (
                <section className="space-y-4">
                    <h3 className="font-black text-xs uppercase bg-slate-100 p-2 border-l-4 border-black">I. UNITS WITH OUTSTANDING REQUIREMENTS (NON-COMPLIANT)</h3>
                    <div className="space-y-6">
                        {nonCompliantUnits.map((unit, idx) => (
                            <div key={idx} className="border border-black/20 p-4 rounded-lg bg-slate-50/50">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="font-bold text-sm uppercase">{unit.name}</p>
                                    <span className="text-[10px] font-black bg-white border border-black px-2 py-0.5">{unit.score}% MATURITY</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {unit.missingFirst.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-500 underline mb-1">Missing (1st Cycle):</p>
                                            <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                                                {unit.missingFirst.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {unit.missingFinal.length > 0 && (
                                        <div>
                                            <p className="text-[9px] font-black uppercase text-slate-500 underline mb-1">Missing (Final Cycle):</p>
                                            <ul className="list-disc pl-4 text-[10px] space-y-0.5">
                                                {unit.missingFinal.map((m, i) => <li key={i}>{m}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {compliantUnits.length > 0 && (
                <section className="space-y-4">
                    <h3 className="font-black text-xs uppercase bg-emerald-50 p-2 border-l-4 border-emerald-600 text-emerald-800">II. FULLY COMPLIANT UNITS (100% VERIFIED)</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {compliantUnits.map((unit, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 border border-emerald-100 rounded bg-emerald-50/30">
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="font-bold text-[11px] uppercase truncate">{unit.name}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        <p className="pt-6">
            Campus Directors are urged to coordinate with the non-compliant units identified above to expedite the 
            completion of their documentation requirements. Quality and operational parity across all units is 
            essential for our institutional ISO 21001:2018 certification maintenance.
        </p>
      </div>

      <div className="mt-20 space-y-12">
        <div className="w-64">
            <div className="border-b border-black font-bold uppercase text-center pb-1">{qmsHead}</div>
            <p className="text-[10px] uppercase font-bold mt-1 text-center">Head, Quality Management System Unit</p>
        </div>
        
        <div className="w-64">
            <p className="text-[10px] font-bold uppercase mb-4">Noted by:</p>
            <div className="border-b border-black font-bold uppercase text-center pb-1">{qaoDirector}</div>
            <p className="text-[10px] uppercase font-bold mt-1 text-center">Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-8 text-center text-[9px] font-bold italic text-slate-500">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-16 text-[9px] text-slate-400 italic border-t pt-4 flex justify-between">
        <span>RSU-QAO-FOR-024 | REV 00</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (COMPLIANCE)
 */
export function CampusNoticeOfCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed border-[12px] border-double border-slate-200">
      <div className="border-2 border-slate-800 p-8 min-h-[9in] flex flex-col">
        <div className="text-center pb-6 mb-12">
            <h1 className="text-xl font-bold uppercase tracking-tight">Romblon State University</h1>
            <h2 className="text-lg font-semibold uppercase tracking-tight">Quality Assurance Office</h2>
            <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-8 flex-1">
            <div className="flex justify-center mb-4">
                <ShieldCheck className="h-16 w-16 text-emerald-600" />
            </div>
            
            <h2 className="text-3xl font-black uppercase tracking-[0.1em] text-slate-900">Institutional Notice of Compliance</h2>
            
            <p className="text-lg italic text-slate-600">This is to officially recognize that the</p>
            
            <div className="py-4">
                <h3 className="text-3xl font-black uppercase text-primary underline underline-offset-8 decoration-slate-300">{campusName}</h3>
            </div>

            <p className="max-w-xl mx-auto text-md leading-relaxed">
                under the leadership of the Campus Director, has achieved <strong>100% Quality Documentation Parity</strong> 
                across all assigned academic and administrative units for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto pt-6">
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1">Site Maturity Index</p>
                    <span className="text-3xl font-black text-emerald-800">100.0%</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>{units.length} / {units.length} Units Fully Verified</span>
                </div>
            </div>

            <p className="text-sm text-slate-500 pt-8 italic leading-relaxed">
                This achievement demonstrates the campus's profound commitment to academic excellence and 
                administrative efficiency as mandated by the EOMS ISO 21001:2018 standards.
            </p>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-12">
            <div className="text-center">
                <div className="font-bold uppercase border-b border-black pb-1 mb-1">{qmsHead}</div>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-600">Head, QMS Unit</p>
            </div>
            <div className="text-center">
                <div className="font-bold uppercase border-b border-black pb-1 mb-1">{qaoDirector}</div>
                <p className="text-[9px] uppercase font-black tracking-widest text-slate-600">Director, QAO (Noted By)</p>
            </div>
        </div>

        <div className="mt-8 text-center text-[9px] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-8 flex justify-between items-end text-[9px] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col">
                <span>Verification Code: SITE-VER-{year}-{format(new Date(), 'HHmm')}</span>
                <span>RSU-QAO-FOR-025 | REV 00</span>
            </div>
            <div className="text-right">
                <p>Institutional Excellence Record</p>
                <p>Issued by RSU EOMS Digital Portal</p>
            </div>
        </div>
      </div>
    </div>
  );
}
