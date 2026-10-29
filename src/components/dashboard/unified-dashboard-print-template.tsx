'use client';

import React from 'react';
import { UniversityHeading } from '@/components/common/university-heading';

export interface UnifiedDashboardPrintTemplateProps {
  activeTabLabel: string;
  scope: 'university' | 'unit';
  unitName?: string;
  selectedYear: number;
  generatedBy?: string;
  generatedAt?: Date | string;
  contentHtml: string;
}

export function UnifiedDashboardPrintTemplate({
  activeTabLabel,
  scope,
  unitName,
  selectedYear,
  generatedBy,
  generatedAt,
  contentHtml,
}: UnifiedDashboardPrintTemplateProps) {
  const isUnitScope = scope === 'unit';
  const scopeLabel = isUnitScope ? `Unit — ${unitName || 'Assigned Unit'}` : 'Institutional (University-wide)';
  const reportTitle = isUnitScope ? 'UNIT OPERATIONS & DECISION BRIEFING' : 'INSTITUTIONAL EXECUTIVE BRIEFING';
  const moduleNumber = activeTabLabel.split('.')[0]?.trim() || '';
  const moduleCode = /^\d+$/.test(moduleNumber) ? moduleNumber.padStart(2, '0') : '00';
  const refNo = `RSU-EOMS-${isUnitScope ? 'UB' : 'IB'}-${selectedYear}-${moduleCode}`;
  const printedAt = generatedAt ?? new Date();
  const preparedBy = generatedBy?.trim() || 'Authorized EOMS User';

  return (
    <div className="w-full bg-white text-slate-900">
      <div className="print-heading">
        <UniversityHeading
          officeName="QUALITY ASSURANCE OFFICE"
          subOffice="Institutional Effectiveness, Monitoring & Evaluation"
          reportTitle={reportTitle}
          reportSubtitle={`${activeTabLabel} • Academic Year ${selectedYear}`}
          refNo={refNo}
          datePrinted={printedAt}
          variant="standard"
        />
      </div>

      <div className="my-2 grid grid-cols-4 gap-2 border-y border-slate-300 bg-slate-50 px-3 py-2 text-[8px]">
        <div>
          <p className="m-0 font-black uppercase tracking-wider text-slate-500">Reporting Scope</p>
          <p className="m-0 mt-0.5 font-bold text-slate-900">{scopeLabel}</p>
        </div>
        <div>
          <p className="m-0 font-black uppercase tracking-wider text-slate-500">Active Module</p>
          <p className="m-0 mt-0.5 font-bold text-slate-900">{activeTabLabel}</p>
        </div>
        <div>
          <p className="m-0 font-black uppercase tracking-wider text-slate-500">Academic Year</p>
          <p className="m-0 mt-0.5 font-bold text-slate-900">AY {selectedYear}</p>
        </div>
        <div>
          <p className="m-0 font-black uppercase tracking-wider text-slate-500">Prepared By</p>
          <p className="m-0 mt-0.5 font-bold text-slate-900">{preparedBy}</p>
        </div>
      </div>

      <div className="mb-3 border-l-4 border-emerald-700 bg-emerald-50 px-3 py-2 text-[7.5px] leading-relaxed text-slate-700">
        <strong className="uppercase tracking-wider text-emerald-800">Briefing coverage:</strong> This printable
        briefing captures the graphs, tables, scorecards, and informational panels currently displayed in the active{' '}
        <strong>{activeTabLabel}</strong> module. Interactive controls, navigation, filters, and action buttons are
        intentionally omitted. Switch dashboard modules and print again to capture a different framework view.
      </div>

      <div className="dashboard-print-content">
        <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
      </div>

      <footer className="mt-4 border-t-2 border-slate-900 pt-2 text-[7px] text-slate-600">
        <div className="flex items-start justify-between gap-4">
          <p className="m-0 max-w-3xl">
            <strong className="text-slate-900">Data source:</strong> RSU EOMS live dashboard snapshot generated on{' '}
            {printedAt instanceof Date ? printedAt.toLocaleString() : printedAt}. Figures reflect the records visible to
            the printing user at the time of generation and may change as operational data is updated.
          </p>
          <p className="m-0 whitespace-nowrap text-right font-mono text-[6.5px] uppercase">
            Doc control: {refNo}
            <br />
            Page 1 of 1 per module
          </p>
        </div>
      </footer>
    </div>
  );
}

export default UnifiedDashboardPrintTemplate;
