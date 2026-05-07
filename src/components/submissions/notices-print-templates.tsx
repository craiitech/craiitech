'use client';

import React from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle2, ShieldCheck, Check } from 'lucide-react';

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
 * Optimized for Folio (8.5 x 13) with 12pt typography
 */
export function NoticeOfNonCompliance({ unitName, campusName, year, missingFirst, missingFinal, qaoDirector, qmsHead }: NoticeProps) {
  const isPresident = unitName.toLowerCase().includes('president');
  const isVP = unitName.toLowerCase().includes('vice president');
  const isMainCampus = campusName.toLowerCase().includes('main campus');

  let designationLine = '';
  let unitLine = unitName.toUpperCase();
  let campusLine = campusName.toUpperCase();
  let thruLine: string | null = null;

  if (isPresident) {
    designationLine = "THE UNIVERSITY PRESIDENT";
    unitLine = "OFFICE OF THE UNIVERSITY PRESIDENT";
  } else if (isVP) {
    designationLine = "THE VICE PRESIDENT";
    unitLine = unitName.toUpperCase();
  } else if (isMainCampus) {
    designationLine = "THE UNIT HEAD / DIRECTOR / DEAN / PROGRAM CHAIR";
  } else {
    designationLine = "UNIT COORDINATORS / DEPARTMENT HEAD / PROGRAM CHAIRS";
    thruLine = `THE CAMPUS DIRECTOR, ${campusName.toUpperCase()}`;
  }

  const isFirstCompliant = missingFirst.length === 0;

  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed" style={{ fontSize: '12pt' }}>
      {/* Institutional Header */}
      <div className="text-center border-b-2 border-black pb-6 mb-10">
        <div className="space-y-1">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Quality Assurance Office</h2>
            <p className="text-sm italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-12">
        <div className="space-y-1">
            <p className="font-bold">MEMORANDUM</p>
            <p className="text-[10pt]">Ref No: RSU-QAO-NNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-4 mb-12">
        <div className="grid grid-cols-12 gap-2">
            <span className="col-span-1 font-bold uppercase">FOR:</span>
            <div className="col-span-11 space-y-1">
                <p className="font-bold uppercase">{designationLine}</p>
                <p className="font-bold uppercase">{unitLine}</p>
                <p className="font-bold uppercase">{campusLine}</p>
            </div>
        </div>
        
        {thruLine && (
            <div className="grid grid-cols-12 gap-2">
                <span className="col-span-1 font-bold uppercase">THRU:</span>
                <span className="col-span-11 font-bold uppercase">{thruLine}</span>
            </div>
        )}

        <div className="border-b border-black pb-4" />

        <div className="grid grid-cols-12 gap-2 pt-4">
            <span className="col-span-1 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-11 font-black uppercase underline decoration-2 underline-offset-4">NOTICE OF NON-COMPLIANCE (EOMS DOCUMENTATION)</span>
        </div>
      </div>

      <div className="space-y-8">
        <p>
            This is to formally inform your office that as of <strong>{format(new Date(), 'PPP')}</strong>, the 
            <strong> {unitName}</strong> has failed to complete the mandatory documentation requirements for the 
            Educational Organizations Management System (EOMS) aligned with ISO 21001:2018 for the Academic Year <strong>{year}</strong>.
        </p>

        <p>
            Upon verification through the RSU EOMS Portal, the current audit status for your unit is as follows:
        </p>

        <div className="space-y-6 py-6">
            {isFirstCompliant ? (
                <div className="border-2 border-green-600 p-6 bg-green-50/50 flex items-center justify-between rounded-lg">
                    <div className="space-y-1">
                        <p className="font-black text-green-700 uppercase" style={{ fontSize: '10pt' }}>I. FIRST SUBMISSION CYCLE:</p>
                        <p className="font-bold text-green-600 text-lg">FULLY COMPLIANT</p>
                    </div>
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
            ) : (
                <div className="border-2 border-black p-6 bg-slate-50 rounded-lg">
                    <p className="font-bold uppercase mb-4" style={{ fontSize: '10pt' }}>I. FIRST SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-disc pl-10 space-y-2">
                        {missingFirst.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            )}

            {missingFinal.length > 0 ? (
                <div className="border-2 border-black p-6 bg-slate-50 rounded-lg">
                    <p className="font-bold uppercase mb-4" style={{ fontSize: '10pt' }}>II. FINAL SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-disc pl-10 space-y-2">
                        {missingFinal.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            ) : (
                <div className="border-2 border-green-600 p-6 bg-green-50/50 flex items-center justify-between rounded-lg">
                    <div className="space-y-1">
                        <p className="font-black text-green-700 uppercase" style={{ fontSize: '10pt' }}>II. FINAL SUBMISSION CYCLE:</p>
                        <p className="font-bold text-green-600 text-lg">FULLY COMPLIANT</p>
                    </div>
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
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

      <div className="mt-24 flex justify-between gap-12 items-end">
        <div className="w-72 text-center">
            <div className="border-b-2 border-black font-bold uppercase text-center pb-1" style={{ fontSize: '13pt' }}>{qmsHead}</div>
            <p className="uppercase font-bold mt-2 text-center" style={{ fontSize: '10pt' }}>Head, Quality Management System Unit</p>
        </div>
        
        <div className="w-72 text-center">
            <p className="font-bold uppercase mb-8 text-left" style={{ fontSize: '10pt' }}>Noted by:</p>
            <div className="border-b-2 border-black font-bold uppercase text-center pb-1" style={{ fontSize: '13pt' }}>{qaoDirector}</div>
            <p className="uppercase font-bold mt-2 text-center" style={{ fontSize: '10pt' }}>Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-500">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between text-[10pt] text-slate-400 italic">
        <span>RSU-QAO-FOR-022 | Rev 01-2025</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE (UNIT LEVEL)
 * Optimized for Folio (8.5 x 13) with 12pt typography
 */
export function NoticeOfCompliance({ unitName, campusName, year, totalApproved, qaoDirector, qmsHead }: NoticeProps) {
  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed border-[16px] border-double border-slate-200" style={{ fontSize: '12pt' }}>
      <div className="border-2 border-slate-800 p-12 min-h-[11in] flex flex-col">
        {/* Institutional Header */}
        <div className="text-center pb-8 mb-16 border-b-2 border-slate-100">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '18pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Quality Assurance Office</h2>
            <div className="w-32 h-1.5 bg-primary mx-auto mt-6" />
        </div>

        <div className="text-center space-y-12 flex-1">
            <div className="flex justify-center">
                <CheckCircle2 className="h-24 w-24 text-emerald-600" />
            </div>
            
            <h2 className="font-black uppercase tracking-[0.2em] text-slate-900" style={{ fontSize: '28pt' }}>Notice of Compliance</h2>
            
            <p className="text-xl italic text-slate-600">This is to officially certify that the</p>
            
            <div className="py-6">
                <h3 className="font-black uppercase text-primary underline underline-offset-8 decoration-slate-300" style={{ fontSize: '24pt' }}>{unitName}</h3>
                <p className="font-bold text-slate-700 mt-4 uppercase tracking-widest" style={{ fontSize: '14pt' }}>{campusName}</p>
            </div>

            <p className="max-w-2xl mx-auto text-lg leading-relaxed">
                has successfully completed and fulfilled all mandatory documentation requirements for the 
                <strong> Educational Organizations Management System (EOMS)</strong> compliant with 
                <strong> ISO 21001:2018</strong> standards for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-2xl max-w-md mx-auto shadow-md space-y-6">
                <div className="border-b-2 border-emerald-200 pb-3">
                    <p className="text-[11pt] font-black uppercase tracking-widest text-emerald-700 mb-2">Institutional Verification Ledger</p>
                    <div className="flex items-center justify-center gap-4">
                        <ShieldCheck className="h-8 w-8 text-emerald-600" />
                        <span className="text-2xl font-black text-emerald-800">{totalApproved} Approved Records</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 font-black uppercase text-emerald-600" style={{ fontSize: '10pt' }}>
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 stroke-[4]" /> 1st Cycle COMPLETED
                    </div>
                    <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 stroke-[4]" /> Final Cycle COMPLETED
                    </div>
                </div>
            </div>

            <p className="text-md text-slate-500 pt-12">
                Issued this <strong>{format(new Date(), 'do')}</strong> day of <strong>{format(new Date(), 'MMMM')}</strong>, 
                <strong> {format(new Date(), 'yyyy')}</strong>.
            </p>
        </div>

        <div className="mt-24 flex justify-between gap-16 items-end">
            <div className="w-72 text-center">
                <div className="font-bold uppercase border-b-2 border-black pb-1 mb-2" style={{ fontSize: '13pt' }}>{qmsHead}</div>
                <p className="font-black uppercase tracking-widest text-slate-600" style={{ fontSize: '10pt' }}>Head, QMS Unit</p>
            </div>
            <div className="w-72 text-center">
                <div className="font-bold uppercase border-b-2 border-black pb-1 mb-2" style={{ fontSize: '13pt' }}>{qaoDirector}</div>
                <p className="font-black uppercase tracking-widest text-slate-600" style={{ fontSize: '10pt' }}>Director, QAO (Noted By)</p>
            </div>
        </div>

        <div className="mt-10 text-center text-[10pt] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-10 flex justify-between items-end text-[10pt] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col space-y-0.5">
                <span>Verification Code: VER-{year}-{format(new Date(), 'HHmm')}</span>
                <span>RSU-QAO-FOR-023 | REV 01-2025</span>
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
 * Optimized for Folio (8.5 x 13) with 12pt typography
 */
export function CampusNoticeOfNonCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  const nonCompliantUnits = units.filter(u => u.score < 100);
  const compliantUnits = units.filter(u => u.score === 100);

  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed" style={{ fontSize: '12pt' }}>
      <div className="text-center border-b-2 border-black pb-6 mb-10">
        <div className="space-y-1">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Quality Assurance Office</h2>
            <p className="text-xs italic">Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-12">
        <div className="space-y-1">
            <p className="font-bold">MEMORANDUM</p>
            <p className="text-[10pt]">Ref No: RSU-QAO-CNNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-6 mb-12">
        <div className="grid grid-cols-12 gap-2">
            <span className="col-span-1 font-bold uppercase">FOR:</span>
            <div className="col-span-11 space-y-1">
                <p className="font-black uppercase" style={{ fontSize: '14pt' }}>THE CAMPUS DIRECTOR</p>
                <p className="font-black uppercase" style={{ fontSize: '14pt' }}>{campusName}</p>
            </div>
        </div>
        <div className="grid grid-cols-12 gap-2 pt-4 border-t border-black mt-4">
            <span className="col-span-1 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-11 font-black uppercase underline decoration-2 underline-offset-4">CONSOLIDATED EOMS COMPLIANCE STATUS REPORT</span>
        </div>
      </div>

      <div className="space-y-8">
        <p>
            Respectfully submitted herewith is the <strong>Consolidated Compliance Status Report</strong> for the 
            <strong> {campusName}</strong> Academic Year <strong>{year}</strong>, as verified through the 
            RSU EOMS Digital Submission and Monitoring Portal.
        </p>

        <div className="space-y-10">
            {nonCompliantUnits.length > 0 && (
                <section className="space-y-6">
                    <h3 className="font-black text-sm uppercase bg-slate-100 p-3 border-l-[6px] border-black">I. UNITS WITH OUTSTANDING REQUIREMENTS (NON-COMPLIANT)</h3>
                    <div className="space-y-6">
                        {nonCompliantUnits.map((unit, idx) => {
                            const firstCycleDone = unit.missingFirst.length === 0;
                            return (
                                <div key={idx} className="border-2 border-black/20 p-6 rounded-xl bg-slate-50/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex flex-col">
                                            <p className="font-black text-lg uppercase">{unit.name}</p>
                                            {firstCycleDone && (
                                                <p className="font-black text-green-600 uppercase" style={{ fontSize: '9pt' }}>First Cycle Status: Fully Compliant</p>
                                            )}
                                        </div>
                                        <span className="font-black bg-white border-2 border-black px-4 py-1 rounded shadow-sm">{unit.score}% MATURITY</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        {unit.missingFirst.length > 0 && (
                                            <div className="p-3 bg-white/60 rounded border border-dashed border-slate-300">
                                                <p className="font-black uppercase text-slate-500 underline mb-2" style={{ fontSize: '9pt' }}>Missing (1st Cycle):</p>
                                                <ul className="list-disc pl-6 space-y-1.5" style={{ fontSize: '11pt' }}>
                                                    {unit.missingFirst.map((m, i) => <li key={i}>{m}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {unit.missingFinal.length > 0 && (
                                            <div className="p-3 bg-white/60 rounded border border-dashed border-slate-300">
                                                <p className="font-black uppercase text-slate-500 underline mb-2" style={{ fontSize: '9pt' }}>Missing (Final Cycle):</p>
                                                <ul className="list-disc pl-6 space-y-1.5" style={{ fontSize: '11pt' }}>
                                                    {unit.missingFinal.map((m, i) => <li key={i}>{m}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {compliantUnits.length > 0 && (
                <section className="space-y-4">
                    <h3 className="font-black text-sm uppercase bg-emerald-50 p-3 border-l-[6px] border-emerald-600 text-emerald-800">II. FULLY COMPLIANT UNITS (100% VERIFIED)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {compliantUnits.map((unit, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-4 border-2 border-emerald-100 rounded-xl bg-emerald-50/30">
                                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                <span className="font-black uppercase truncate">{unit.name}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        <p className="pt-10">
            Campus Directors are urged to coordinate with the non-compliant units identified above to expedite the 
            completion of their documentation requirements. Quality and operational parity across all units is 
            essential for our institutional ISO 21001:2018 certification maintenance.
        </p>
      </div>

      <div className="mt-24 flex justify-between gap-16 items-end">
        <div className="w-72 text-center">
            <div className="border-b-2 border-black font-bold uppercase text-center pb-1" style={{ fontSize: '13pt' }}>{qmsHead}</div>
            <p className="uppercase font-bold mt-2 text-center" style={{ fontSize: '10pt' }}>Head, Quality Management System Unit</p>
        </div>
        
        <div className="w-72 text-center">
            <p className="font-bold uppercase mb-8 text-left" style={{ fontSize: '10pt' }}>Noted by:</p>
            <div className="border-b-2 border-black font-bold uppercase text-center pb-1" style={{ fontSize: '13pt' }}>{qaoDirector}</div>
            <p className="uppercase font-bold mt-2 text-center" style={{ fontSize: '10pt' }}>Director, Quality Assurance Office</p>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-500">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-10 border-t border-slate-200 flex justify-between text-[10pt] text-slate-400 italic">
        <span>RSU-QAO-FOR-024 | REV 01-2025</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (COMPLIANCE)
 * Optimized for Folio (8.5 x 13) with 12pt typography
 */
export function CampusNoticeOfCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-serif leading-relaxed border-[16px] border-double border-slate-200" style={{ fontSize: '12pt' }}>
      <div className="border-2 border-slate-800 p-12 min-h-[11in] flex flex-col">
        <div className="text-center pb-8 mb-16 border-b-2 border-slate-100">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '20pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '16pt' }}>Quality Assurance Office</h2>
            <div className="w-40 h-2 bg-primary mx-auto mt-8" />
        </div>

        <div className="text-center space-y-12 flex-1">
            <div className="flex justify-center">
                <ShieldCheck className="h-32 w-32 text-emerald-600" />
            </div>
            
            <h2 className="font-black uppercase tracking-[0.2em] text-slate-900" style={{ fontSize: '32pt' }}>Institutional Notice of Compliance</h2>
            
            <p className="text-2xl italic text-slate-600">This is to officially recognize that the</p>
            
            <div className="py-8">
                <h3 className="font-black uppercase text-primary underline underline-offset-[12px] decoration-slate-300" style={{ fontSize: '36pt' }}>{campusName}</h3>
            </div>

            <p className="max-w-2xl mx-auto text-xl leading-relaxed">
                under the leadership of the Campus Director, has achieved <strong>100% Quality Documentation Parity</strong> 
                across all assigned academic and administrative units for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="grid grid-cols-1 gap-6 max-w-md mx-auto pt-10">
                <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-2xl shadow-md">
                    <p className="text-[11pt] font-black uppercase tracking-widest text-emerald-700 mb-2">Site Maturity Index</p>
                    <span className="text-5xl font-black text-emerald-800">100.0%</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-lg font-black text-slate-600 uppercase tracking-tight">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    <span>{units.length} Units Fully Verified</span>
                </div>
            </div>

            <p className="text-lg text-slate-500 pt-12 italic leading-relaxed">
                This achievement demonstrates the campus's profound commitment to academic excellence and 
                administrative efficiency as mandated by the EOMS ISO 21001:2018 standards.
            </p>
        </div>

        <div className="mt-24 flex justify-between gap-16 items-end">
            <div className="w-72 text-center">
                <div className="font-bold uppercase border-b-2 border-black pb-1 mb-2" style={{ fontSize: '14pt' }}>{qmsHead}</div>
                <p className="font-black uppercase tracking-widest text-slate-600" style={{ fontSize: '10pt' }}>Head, QMS Unit</p>
            </div>
            <div className="w-72 text-center">
                <div className="font-bold uppercase border-b-2 border-black pb-1 mb-2" style={{ fontSize: '14pt' }}>{qaoDirector}</div>
                <p className="font-black uppercase tracking-widest text-slate-600" style={{ fontSize: '10pt' }}>Director, QAO (Noted By)</p>
            </div>
        </div>

        <div className="mt-10 text-center text-[10pt] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-10 flex justify-between items-end text-[10pt] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col space-y-0.5">
                <span>Verification Code: SITE-VER-{year}-{format(new Date(), 'HHmm')}</span>
                <span>RSU-QAO-FOR-025 | REV 01-2025</span>
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
