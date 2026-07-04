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
  cycle?: string;
}

interface CampusNoticeProps {
  campusName: string;
  year: number;
  qaoDirector: string;
  qmsHead: string;
  cycle?: string;
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
 * Optimized for Folio (8.5 x 13) with 11pt typography and single spacing.
 * Aligns Unit Name and Campus under the FOR: label.
 * Signatories: Name on first line, Title on second line, no solid line.
 */
export function NoticeOfNonCompliance({ unitName, campusName, year, missingFirst, missingFinal, qaoDirector, qmsHead }: NoticeProps) {
  const isPresident = unitName.toLowerCase().includes('president');
  const isVP = unitName.toLowerCase().includes('vice president');

  let designationLine = "THE UNIT HEAD / DIRECTOR / DEAN / PROGRAM CHAIR";
  let unitLine = unitName.toUpperCase();
  const campusLine = campusName.toUpperCase();
  let thruLine: string | null = null;

  if (isPresident) {
    designationLine = "THE UNIVERSITY PRESIDENT";
    unitLine = "OFFICE OF THE UNIVERSITY PRESIDENT";
  } else if (isVP) {
    designationLine = "THE VICE PRESIDENT";
    unitLine = unitName.toUpperCase();
  } else if (!campusName.toLowerCase().includes('main campus')) {
    thruLine = `THE CAMPUS DIRECTOR, ${campusName.toUpperCase()}`;
  }

  const isFirstCompliant = missingFirst.length === 0;

  return (
    <div className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight" style={{ fontSize: '11pt' }}>
      {/* Institutional Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <div className="space-y-1">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p className="text-[9pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="space-y-0.5">
            <p className="font-bold uppercase">MEMORANDUM</p>
            <p className="text-[9pt] font-mono">Ref No: RSU-QAO-NNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-3 mb-10">
        <div className="grid grid-cols-12 gap-2">
            <span className="col-span-1 font-bold uppercase">FOR:</span>
            <div className="col-span-11 space-y-0.5">
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

        <div className="border-b border-black pb-2" />

        <div className="grid grid-cols-12 gap-2 pt-2">
            <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-10 font-black uppercase underline decoration-2 underline-offset-4">NOTICE OF NON-COMPLIANCE (EOMS DOCUMENTATION)</span>
        </div>
      </div>

      <div className="space-y-6 text-justify">
        <p>
            This is to formally inform your office that as of <strong>{format(new Date(), 'MMMM do, yyyy')}</strong>, the 
            <strong> {unitName}</strong> has failed to complete the mandatory documentation requirements for the 
            Educational Organizations Management System (EOMS) aligned with ISO 21001:2018 for the Academic Year <strong>{year}</strong>.
        </p>

        <p>
            Upon verification through the RSU EOMS Portal, the current audit status for your unit is as follows:
        </p>

        <div className="space-y-4 py-2">
            {isFirstCompliant ? (
                <div className="border border-green-600 p-4 bg-green-50/30 flex items-center justify-between rounded-lg">
                    <div className="space-y-0.5">
                        <p className="font-black text-green-700 uppercase" style={{ fontSize: '9pt' }}>I. FIRST SUBMISSION CYCLE:</p>
                        <p className="font-bold text-green-600">FULLY COMPLIANT</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
            ) : (
                <div className="border border-black p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                    <p className="font-bold uppercase mb-2 text-primary" style={{ fontSize: '9pt' }}>I. FIRST SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-disc pl-8 space-y-1">
                        {missingFirst.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            )}

            {missingFinal.length > 0 ? (
                <div className="border border-black p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
                    <p className="font-bold uppercase mb-2 text-primary" style={{ fontSize: '9pt' }}>II. FINAL SUBMISSION CYCLE (OUTSTANDING):</p>
                    <ul className="list-disc pl-8 space-y-1">
                        {missingFinal.map((doc, i) => <li key={i}>{doc}</li>)}
                    </ul>
                </div>
            ) : (
                <div className="border border-green-600 p-4 bg-green-50/30 flex items-center justify-between rounded-lg">
                    <div className="space-y-0.5">
                        <p className="font-black text-green-700 uppercase" style={{ fontSize: '9pt' }}>II. FINAL SUBMISSION CYCLE:</p>
                        <p className="font-bold text-green-600">FULLY COMPLIANT</p>
                    </div>
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
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

      {/* SIGNATORIES BLOCK - Name on 1st line, Title on 2nd line, no solid line */}
      <div className="mt-20 space-y-8">
        <div className="w-full text-left">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qmsHead}</p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>HEAD, QUALITY MANAGEMENT SYSTEM UNIT</p>
        </div>
        
        <div className="space-y-4 text-left">
            <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
            <div className="w-full">
                <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qaoDirector}</p>
                <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>DIRECTOR, QUALITY ASSURANCE OFFICE</p>
            </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-900 dark:text-slate-100">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[9pt] text-slate-400 font-bold italic">
        <span>RSU-QAO-FOR-022 | Rev 02-2025</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * NOTICE OF COMPLIANCE TEMPLATE (UNIT LEVEL)
 */
export function NoticeOfCompliance({ unitName, campusName, year, totalApproved, totalPossible, qaoDirector, qmsHead, cycle }: NoticeProps) {
  return (
    <div className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight border-[12px] border-double border-slate-200 dark:border-slate-700" style={{ fontSize: '11pt' }}>
      <div className="border border-slate-800 p-10 min-h-[11in] flex flex-col">
        {/* Institutional Header */}
        <div className="text-center pb-6 mb-12 border-b border-slate-100 dark:border-slate-700">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-10 flex-1">
            <div className="flex justify-center">
                <ShieldCheck className="h-20 w-24 text-emerald-600" />
            </div>
            
            <div className="space-y-3">
                <h2 className="font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100" style={{ fontSize: '24pt' }}>Notice of Compliance</h2>
                {cycle && (
                    <p className="font-mono font-black text-xs uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full w-fit mx-auto border border-emerald-100">
                        {cycle}
                    </p>
                )}
            </div>
            
            <p className="text-lg italic text-slate-600 dark:text-slate-400">This is to officially certify that the</p>
            
            <div className="py-4">
                <h3 className="font-black uppercase text-primary underline underline-offset-4 decoration-slate-300" style={{ fontSize: '20pt' }}>{unitName}</h3>
                <p className="font-bold text-slate-700 dark:text-slate-300 mt-3 uppercase tracking-widest" style={{ fontSize: '12pt' }}>{campusName}</p>
            </div>

            <p className="max-w-xl mx-auto text-base leading-relaxed">
                has successfully completed and fulfilled all mandatory documentation requirements for the 
                <strong> Educational Organizations Management System (EOMS)</strong> compliant with 
                <strong> ISO 21001:2018</strong> standards for the <span className="font-bold underline">{cycle || 'First and Final'} Submission Cycle(s)</span> for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl max-w-sm mx-auto shadow-sm space-y-4">
                <div className="border-b border-emerald-200 pb-2">
                    <p className="text-[10pt] font-black uppercase tracking-widest text-emerald-700 mb-1">Institutional Verification Ledger</p>
                    <div className="flex items-center justify-center gap-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        <span className="text-xl font-black text-emerald-800">{totalApproved} / {totalPossible} Approved Records</span>
                    </div>
                </div>
            </div>

            <p className="text-sm text-slate-500 pt-8">
                Issued this <strong>{format(new Date(), 'do')}</strong> day of <strong>{format(new Date(), 'MMMM')}</strong>, 
                <strong> {format(new Date(), 'yyyy')}</strong>.
            </p>
        </div>

        {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
        <div className="mt-20 space-y-8 text-left">
            <div className="w-full">
                <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qmsHead}</p>
                <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>HEAD, QUALITY MANAGEMENT SYSTEM UNIT</p>
            </div>
            
            <div className="space-y-4">
                <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
                <div className="w-full">
                    <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qaoDirector}</p>
                    <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>DIRECTOR, QUALITY ASSURANCE OFFICE</p>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center text-[9pt] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-6 flex justify-between items-end text-[9pt] text-slate-400 uppercase font-bold tracking-tighter">
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
 */
export function CampusNoticeOfNonCompliance({ campusName, year, qaoDirector, qmsHead, units }: CampusNoticeProps) {
  const nonCompliantUnits = units.filter(u => u.score < 100);

  return (
    <div className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif leading-tight" style={{ fontSize: '11pt' }}>
      <div className="text-center border-b-2 border-black pb-4 mb-8">
        <div className="space-y-1">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '14pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <p className="text-[9pt] italic">Main Campus, Odiongan, Romblon</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="space-y-0.5">
            <p className="font-bold uppercase">MEMORANDUM</p>
            <p className="text-[9pt] font-mono">Ref No: RSU-QAO-CNNC-{year}-{format(new Date(), 'MMdd')}</p>
        </div>
        <p className="font-bold">{format(new Date(), 'MMMM d, yyyy')}</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="grid grid-cols-12 gap-2">
            <span className="col-span-1 font-bold uppercase">FOR:</span>
            <div className="col-span-11 space-y-0.5">
                <p className="font-black uppercase" style={{ fontSize: '12pt' }}>THE CAMPUS DIRECTOR</p>
                <p className="font-black uppercase" style={{ fontSize: '12pt' }}>{campusName}</p>
            </div>
        </div>
        <div className="grid grid-cols-12 gap-2 pt-2 border-t border-black mt-2">
            <span className="col-span-2 font-bold uppercase">SUBJECT:</span>
            <span className="col-span-10 font-black uppercase underline decoration-2 underline-offset-4">CONSOLIDATED EOMS COMPLIANCE STATUS REPORT</span>
        </div>
      </div>

      <div className="space-y-6 text-justify">
        <p>
            Respectfully submitted herewith is the <strong>Consolidated Compliance Status Report</strong> for the 
            <strong> {campusName}</strong> Academic Year <strong>{year}</strong>, as verified through the 
            RSU EOMS Digital Submission and Monitoring Portal.
        </p>

        <div className="space-y-8">
            {nonCompliantUnits.length > 0 && (
                <section className="space-y-4">
                    <h3 className="font-black text-[10pt] uppercase bg-slate-100 dark:bg-slate-700 p-2 border-l-[4px] border-black">I. UNITS WITH OUTSTANDING REQUIREMENTS (NON-COMPLIANT)</h3>
                    <div className="space-y-4">
                        {nonCompliantUnits.map((unit, idx) => (
                            <div key={idx} className="border border-black/20 p-4 rounded-lg bg-slate-50/30 dark:bg-slate-800/30">
                                <div className="flex justify-between items-center mb-2">
                                    <p className="font-black text-sm uppercase">{unit.name}</p>
                                    <span className="font-black bg-white border border-black px-3 py-0.5 rounded text-[10pt]">{unit.score}% MATURITY</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        <p>
            Campus Directors are urged to coordinate with the non-compliant units identified above to expedite the 
            completion of their documentation requirements.
        </p>
      </div>

      {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
      <div className="mt-20 space-y-8 text-left">
        <div className="w-full">
            <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qmsHead}</p>
            <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>HEAD, QUALITY MANAGEMENT SYSTEM UNIT</p>
        </div>
        
        <div className="space-y-4">
            <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
            <div className="w-full">
                <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qaoDirector}</p>
                <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>DIRECTOR, QUALITY ASSURANCE OFFICE</p>
            </div>
        </div>
      </div>

      <div className="mt-12 text-center text-[10pt] font-bold italic text-slate-900 dark:text-slate-100">
        This is a system-generated report; signature is not required.
      </div>

      <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-700 flex justify-between text-[9pt] text-slate-400 font-bold italic">
        <span>RSU-QAO-FOR-024 | REV 01-2025</span>
        <span>Issued via RSU EOMS Portal</span>
      </div>
    </div>
  );
}

/**
 * CONSOLIDATED CAMPUS STATUS NOTICE (COMPLIANCE)
 */
export function CampusNoticeOfCompliance({ campusName, year, qaoDirector, qmsHead, units, cycle }: CampusNoticeProps) {
  return (
    <div className="p-12 text-black dark:text-white bg-white max-w-[8.5in] mx-auto font-serif border-[10px] border-double border-slate-200 dark:border-slate-700" style={{ fontSize: '11pt' }}>
      <div className="border border-slate-800 p-10 min-h-[11in] flex flex-col">
        <div className="text-center pb-6 mb-12 border-b border-slate-100 dark:border-slate-700">
            <h1 className="font-bold uppercase tracking-tight" style={{ fontSize: '16pt' }}>Romblon State University</h1>
            <h2 className="font-semibold uppercase tracking-tight" style={{ fontSize: '12pt' }}>Quality Assurance Office</h2>
            <div className="w-24 h-1 bg-primary mx-auto mt-4" />
        </div>

        <div className="text-center space-y-10 flex-1">
            <div className="flex justify-center">
                <ShieldCheck className="h-24 w-24 text-emerald-600" />
            </div>
            
            <div className="space-y-3">
                <h2 className="font-black uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100" style={{ fontSize: '24pt' }}>Institutional Notice of Compliance</h2>
                {cycle && (
                    <p className="font-mono font-black text-xs uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full w-fit mx-auto border border-emerald-100">
                        {cycle}
                    </p>
                )}
            </div>
            
            <p className="text-xl italic text-slate-600 dark:text-slate-400">This is to officially recognize that the</p>
            
            <div className="py-6">
                <h3 className="font-black uppercase text-primary underline underline-offset-8 decoration-slate-300" style={{ fontSize: '28pt' }}>{campusName}</h3>
            </div>

            <p className="max-w-xl mx-auto text-lg leading-relaxed">
                under the leadership of the Campus Director, has achieved <strong>100% Quality Documentation Parity</strong> 
                across all assigned academic and administrative units for the <span className="font-bold underline">{cycle || 'First and Final'} Submission Cycle(s)</span> for the Academic Year <strong>{year}</strong>.
            </p>

            <div className="max-w-xs mx-auto pt-8">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-xl shadow-sm">
                    <p className="text-[10pt] font-black uppercase tracking-widest text-emerald-700 mb-1">Site Maturity Index</p>
                    <span className="text-4xl font-black text-emerald-800">100.0%</span>
                </div>
            </div>
        </div>

        {/* SIGNATORIES BLOCK - Consistent with Non-Compliance format */}
        <div className="mt-20 space-y-8 text-left">
            <div className="w-full">
                <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qmsHead}</p>
                <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>HEAD, QUALITY MANAGEMENT SYSTEM UNIT</p>
            </div>
            
            <div className="space-y-4">
                <p className="font-bold uppercase text-[9pt] opacity-60">NOTED BY:</p>
                <div className="w-full">
                    <p className="font-black uppercase" style={{ fontSize: '11pt' }}>{qaoDirector}</p>
                    <p className="font-bold uppercase" style={{ fontSize: '10pt' }}>DIRECTOR, QUALITY ASSURANCE OFFICE</p>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center text-[9pt] font-bold italic text-slate-500">
            This is a system-generated report; signature is not required.
        </div>

        <div className="mt-auto pt-6 flex justify-between items-end text-[9pt] text-slate-400 uppercase font-bold tracking-tighter">
            <div className="flex flex-col space-y-0.5">
                <span>Verification Code: SITE-VER-{year}-{format(new Date(), 'HHmm')}</span>
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
