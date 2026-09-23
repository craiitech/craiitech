'use client';

import React from 'react';
import { format } from 'date-fns';

export interface UniversityHeadingProps {
  officeName?: string;
  subOffice?: string;
  reportTitle?: string;
  reportSubtitle?: string;
  refNo?: string;
  datePrinted?: string | Date;
  campusLocation?: string;
  contactDetails?: string;
  showIsoLogo?: boolean;
  showQaoLogo?: boolean;
  rsuLogoPath?: string;
  isoLogoPath?: string;
  qaoLogoPath?: string;
  variant?: 'standard' | 'formal-box' | 'banner';
  className?: string;
  children?: React.ReactNode;
}

/**
 * Standard University Heading Component for Romblon State University (RSU).
 * Provides the official institutional letterhead/heading matching university branding:
 * - Republic of the Philippines mark
 * - Romblon State University Seal
 * - Quality Assurance Office / Designated Unit Emblem
 * - ISO 9001:2015 TÜV Rheinland Certification Badge
 * - Standard address and contact lines
 * - Optional document classification banner & reference metadata
 */
export function UniversityHeading({
  officeName = 'QUALITY ASSURANCE OFFICE',
  subOffice,
  reportTitle,
  reportSubtitle,
  refNo,
  datePrinted,
  campusLocation = 'Liwanag, Odiongan, Romblon 5505',
  contactDetails = 'Telephone: (042) 567-2201 | Email: qao@rsu.edu.ph | Website: rsu.edu.ph',
  showIsoLogo = true,
  showQaoLogo = true,
  rsuLogoPath = '/rsulogo.png',
  isoLogoPath = '/ISOlogo.jpg',
  qaoLogoPath = '/qa_logo.png',
  variant = 'standard',
  className = '',
  children,
}: UniversityHeadingProps) {
  const formattedDate = React.useMemo(() => {
    if (!datePrinted) return format(new Date(), 'MMMM d, yyyy');
    if (typeof datePrinted === 'string') return datePrinted;
    try {
      return format(datePrinted, 'MMMM d, yyyy');
    } catch {
      return String(datePrinted);
    }
  }, [datePrinted]);

  return (
    <header className={`w-full text-black bg-white select-none ${className}`}>
      {/* 1. TOP INSTITUTIONAL LETTERHEAD */}
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-2">
        <div className="flex items-center gap-3">
          {/* RSU Official Seal */}
          <img
            src={rsuLogoPath}
            alt="Romblon State University Official Seal"
            style={{ height: '48px', width: '48px', objectFit: 'contain' }}
            className="flex-shrink-0"
          />

          {/* QAO / Unit Emblem (Optional) */}
          {showQaoLogo && (
            <img
              src={qaoLogoPath}
              alt="Quality Assurance Office Emblem"
              style={{ height: '46px', width: '46px', objectFit: 'contain' }}
              className="flex-shrink-0"
            />
          )}

          {/* Institutional Identification Text */}
          <div className="text-left">
            <p className="text-[7.5pt] uppercase tracking-wider text-slate-600 m-0 font-sans leading-none font-semibold">
              Republic of the Philippines
            </p>
            <h1 className="text-[12pt] font-black uppercase tracking-tight text-slate-900 leading-none m-0 mt-0.5 font-serif">
              ROMBLON STATE UNIVERSITY
            </h1>
            <h2 className="text-[9pt] font-bold uppercase tracking-wider text-slate-800 leading-tight m-0 mt-0.5 font-sans">
              {officeName}
            </h2>
            {subOffice && <p className="text-[7.5pt] font-medium text-slate-700 m-0 leading-tight">{subOffice}</p>}
            <p className="text-[6.5pt] text-slate-600 leading-tight m-0 mt-0.5 font-sans">
              {campusLocation}
              {contactDetails && (
                <>
                  <br />
                  {contactDetails}
                </>
              )}
            </p>
          </div>
        </div>

        {/* ISO Certification Badge (Optional) */}
        {showIsoLogo && (
          <div className="flex items-center pl-2 flex-shrink-0">
            <img
              src={isoLogoPath}
              alt="ISO 9001:2015 TÜV Rheinland Certified"
              style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
            />
          </div>
        )}
      </div>

      {/* 2. OPTIONAL DOCUMENT TITLE BANNER */}
      {reportTitle && (
        <div className="border-y-2 border-slate-900 py-1.5 px-3 mb-3 bg-slate-50 text-center">
          <h3 className="text-[10pt] font-black uppercase tracking-[0.12em] text-slate-900 m-0 font-sans">
            {reportTitle}
          </h3>
          {reportSubtitle && (
            <p className="text-[7.5pt] font-semibold text-slate-600 uppercase tracking-wider m-0 mt-0.5 font-sans">
              {reportSubtitle}
            </p>
          )}
        </div>
      )}

      {/* 3. OPTIONAL METADATA BAR (Ref No, Date, etc.) */}
      {(refNo || formattedDate) && (
        <div className="flex items-center justify-between text-[7.5pt] font-sans px-1 pb-1 mb-2 text-slate-600 border-b border-slate-200">
          <div>
            {refNo && (
              <span>
                <strong className="text-slate-800 font-bold">DOC REF:</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{refNo}</span>
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-500">
              Date Generated / Printed: <strong className="text-slate-800 font-semibold">{formattedDate}</strong>
            </span>
          </div>
        </div>
      )}

      {children}
    </header>
  );
}

export default UniversityHeading;
