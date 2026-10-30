'use client';

import { renderToStaticMarkup } from 'react-dom/server';
import { openInstitutionalPrintPreview } from '@/lib/print-preview';

export interface ManagementReviewEvidenceRow {
  title: string;
  details: string[];
  status?: string;
}

export interface ManagementReviewEvidenceSection {
  title: string;
  items: string[];
}

export interface ManagementReviewEvidenceReport {
  title: string;
  source: string;
  period: string;
  scope: string;
  summary: { label: string; value: string }[];
  sections: ManagementReviewEvidenceSection[];
  records?: ManagementReviewEvidenceRow[];
  references?: string[];
}

export function formatManagementReviewDate(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : isTimestampLike(value)
        ? value.toDate()
        : typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : null;

  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : 'Not recorded';
}

function isTimestampLike(value: unknown): value is { toDate: () => Date } {
  return typeof value === 'object' && value !== null && 'toDate' in value && typeof value.toDate === 'function';
}

function ManagementReviewEvidencePrint({ report }: { report: ManagementReviewEvidenceReport }) {
  return (
    <article className="mr-report mx-auto max-w-[12.2in] bg-white p-8 text-slate-900">
      <header className="border-b-2 border-emerald-800 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">
          Romblon State University · Educational Organization Management System
        </p>
        <h1 className="mt-3 text-2xl font-black uppercase tracking-tight">{report.title}</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Management Review evidence brief · ISO 21001:2025, clause 9.3
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <p>
            <strong>Evidence source:</strong> {report.source}
          </p>
          <p>
            <strong>Reporting period:</strong> {report.period}
          </p>
          <p>
            <strong>Scope:</strong> {report.scope}
          </p>
        </div>
      </header>

      <section className="mt-5">
        <h2 className="text-sm font-black uppercase tracking-wide">Performance snapshot</h2>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {report.summary.map((metric) => (
            <div key={metric.label} className="rounded border border-slate-300 p-2">
              <p className="text-[9px] font-bold uppercase text-slate-500">{metric.label}</p>
              <p className="mt-1 text-sm font-black">{metric.value}</p>
            </div>
          ))}
        </div>
      </section>

      {report.sections.map((section) => (
        <section key={section.title} className="mt-5 break-inside-avoid">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-black uppercase tracking-wide">{section.title}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed">
            {section.items.map((item, index) => (
              <li key={`${section.title}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      {report.records && report.records.length > 0 && (
        <section className="mt-5">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-black uppercase tracking-wide">
            Source records and evidence
          </h2>
          <div className="mt-2 space-y-2">
            {report.records.map((record, index) => (
              <article
                key={`${record.title}-${index}`}
                className="mr-record break-inside-avoid rounded border border-slate-300 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-xs font-black">{record.title}</h3>
                  {record.status && <span className="text-[9px] font-bold uppercase">{record.status}</span>}
                </div>
                <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] leading-relaxed text-slate-700">
                  {record.details.map((detail, detailIndex) => (
                    <li key={`${record.title}-${detailIndex}`}>{detail}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}

      {report.references && report.references.length > 0 && (
        <section className="mt-5 break-inside-avoid">
          <h2 className="border-b border-slate-300 pb-1 text-sm font-black uppercase tracking-wide">
            Framework and reference notes
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[10px] leading-relaxed text-slate-700">
            {report.references.map((reference, index) => (
              <li key={`reference-${index}`}>{reference}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 rounded border border-amber-400 bg-amber-50 p-3 text-[10px] leading-relaxed">
        <strong>Use in Management Review:</strong> This source-specific evidence brief supports the review of EOMS
        performance, audit/compliance results, risks and opportunities, and improvement needs. It is not a complete
        Management Review record by itself. Management should consider the other applicable clause 9.3 inputs, record
        conclusions and decisions, and assign owners, resources, and due dates in the official minutes.
      </section>

      <footer className="mt-8 grid grid-cols-3 gap-8 text-center text-[10px]">
        {['Prepared by', 'Reviewed by', 'Management Review Chair'].map((label) => (
          <div key={label} className="border-t border-slate-500 pt-2">
            {label} · Name / Signature / Date
          </div>
        ))}
      </footer>
      <p className="mt-6 border-t border-slate-200 pt-2 text-center text-[9px] text-slate-500">
        Generated {new Date().toLocaleString()} · Verify source records and applicable regulatory requirements before
        approval.
      </p>
    </article>
  );
}

export function printManagementReviewEvidenceReport(report: ManagementReviewEvidenceReport) {
  const contentHtml = renderToStaticMarkup(<ManagementReviewEvidencePrint report={report} />);
  const printWindow = openInstitutionalPrintPreview({
    title: report.title,
    contentHtml,
    pageSize: '13in 8.5in',
    previewWidth: '13in',
    toolbarLabel: 'Print Management Review Evidence Brief',
    description: 'Review the source evidence, then print or save as PDF.',
    extraCss: `
      @media print {
        .mr-report { max-width: none !important; padding: 0.1in !important; }
        .mr-record { break-inside: avoid; page-break-inside: avoid; }
      }
    `,
  });

  if (!printWindow) {
    console.error('Print window was blocked. Allow pop-ups to print the Management Review evidence brief.');
  }
}
