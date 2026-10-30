'use client';

import React, { useMemo } from 'react';
import type { CorrectiveActionRequest, Signatories } from '@/lib/types';
import { UniversityHeading } from '@/components/common/university-heading';
import { format } from 'date-fns';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { getNextCarActionInfo, parseCarDate } from '@/lib/car-utils';

export interface CarYearlyPerformanceRow {
  year: number;
  NC: number;
  Open: number;
  'On-Going': number;
  Closed: number;
  iqaCount: number;
  eqaCount: number;
}

export interface CarCampusFindingRow {
  campusId: string;
  campus: string;
  NC: number;
  OFI: number;
  Compliant: number;
  Open: number;
  Ongoing: number;
  Closed: number;
}

interface CARRegistryReportPrintTemplateProps {
  cars: CorrectiveActionRequest[];
  yearlyPerformance: CarYearlyPerformanceRow[];
  yearlyPerformanceTotals: CarYearlyPerformanceRow;
  campusFindings: CarCampusFindingRow[];
  campusFindingTotals: Omit<CarCampusFindingRow, 'campusId' | 'campus'>;
  unitMap: Map<string, string>;
  campusMap: Map<string, string>;
  yearFilter: string;
  campusFilterName: string;
  auditTypeFilter: 'IQA' | 'EQA' | 'ALL';
  typeFilterLabel: string;
  generatedBy: string;
  signatories?: Signatories;
}

const safeDate = (d: any) => {
  if (!d) return '';
  const date = d instanceof Timestamp ? d.toDate() : new Date(d);
  return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
};

const pct = (value: number, total: number) => {
  if (!total || total <= 0) return 0;
  return (value / total) * 100;
};

const formatPct = (value: number, total: number) => {
  if (!total || total <= 0) return '0.0%';
  return `${((value / total) * 100).toFixed(1)}%`;
};

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-bold" style={{ fontSize: '7.5pt' }}>
      <span className="inline-block h-2.5 w-2.5 border border-slate-500" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function YearlyPerformanceChart({ rows }: { rows: CarYearlyPerformanceRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="italic text-slate-500 text-center py-3" style={{ fontSize: '8pt' }}>
        No yearly performance records available for the selected filters.
      </p>
    );
  }

  const maxNc = Math.max(...rows.map((row) => row.NC), 1);

  return (
    <div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.year} className="flex items-center gap-2">
            <span className="text-right font-black" style={{ fontSize: '8pt', width: '34px' }}>
              {row.year}
            </span>
            <div className="flex-1 border border-slate-400 bg-slate-100" style={{ height: '18px' }}>
              <div className="flex h-full" style={{ width: `${pct(row.NC, maxNc)}%` }}>
                {row.Open > 0 && (
                  <div
                    className="flex h-full items-center justify-center text-white font-black"
                    style={{ width: `${pct(row.Open, row.NC)}%`, backgroundColor: '#e11d48', fontSize: '7pt' }}
                  >
                    {row.Open}
                  </div>
                )}
                {row['On-Going'] > 0 && (
                  <div
                    className="flex h-full items-center justify-center font-black"
                    style={{
                      width: `${pct(row['On-Going'], row.NC)}%`,
                      backgroundColor: '#f59e0b',
                      color: '#451a03',
                      fontSize: '7pt',
                    }}
                  >
                    {row['On-Going']}
                  </div>
                )}
                {row.Closed > 0 && (
                  <div
                    className="flex h-full items-center justify-center text-white font-black"
                    style={{ width: `${pct(row.Closed, row.NC)}%`, backgroundColor: '#059669', fontSize: '7pt' }}
                  >
                    {row.Closed}
                  </div>
                )}
              </div>
            </div>
            <span className="font-black text-right" style={{ fontSize: '8pt', width: '34px' }}>
              {row.NC}
            </span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-3">
        <LegendItem color="#e11d48" label="Open" />
        <LegendItem color="#f59e0b" label="On-Going" />
        <LegendItem color="#059669" label="Closed" />
        <span className="text-slate-500 font-semibold" style={{ fontSize: '7pt' }}>
          Bar length is proportional to total NC count per year.
        </span>
      </div>
    </div>
  );
}

function CampusFindingsChart({ rows }: { rows: CarCampusFindingRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="italic text-slate-500 text-center py-3" style={{ fontSize: '8pt' }}>
        No campus findings data available for the selected filters.
      </p>
    );
  }

  const maxFindings = Math.max(...rows.map((row) => row.NC + row.OFI + row.Compliant), 1);
  const maxCars = Math.max(...rows.map((row) => row.Open + row.Ongoing + row.Closed), 1);

  return (
    <div>
      <div className="space-y-3">
        {rows.map((row) => {
          const findingsTotal = row.NC + row.OFI + row.Compliant;
          const carsTotal = row.Open + row.Ongoing + row.Closed;
          return (
            <div key={row.campusId}>
              <div className="flex items-start justify-between gap-3">
                <span className="font-black uppercase" style={{ fontSize: '7.5pt' }}>
                  {row.campus}
                </span>
                <span className="text-slate-600 font-semibold text-right" style={{ fontSize: '6.5pt' }}>
                  Findings: NC {row.NC} · OFI {row.OFI} · Compliant {row.Compliant} | CARs: Open {row.Open} · Ongoing{' '}
                  {row.Ongoing} · Closed {row.Closed}
                </span>
              </div>
              <div className="mt-1 space-y-1">
                <div
                  className="border border-slate-400 bg-slate-100"
                  style={{
                    height: '9px',
                    width: `${pct(findingsTotal, maxFindings)}%`,
                    minWidth: findingsTotal > 0 ? '4px' : 0,
                  }}
                >
                  <div className="flex h-full">
                    {row.NC > 0 && (
                      <div style={{ width: `${pct(row.NC, findingsTotal)}%`, backgroundColor: '#dc2626' }} />
                    )}
                    {row.OFI > 0 && (
                      <div style={{ width: `${pct(row.OFI, findingsTotal)}%`, backgroundColor: '#f59e0b' }} />
                    )}
                    {row.Compliant > 0 && (
                      <div style={{ width: `${pct(row.Compliant, findingsTotal)}%`, backgroundColor: '#16a34a' }} />
                    )}
                  </div>
                </div>
                <div
                  className="border border-slate-400 bg-slate-100"
                  style={{ height: '9px', width: `${pct(carsTotal, maxCars)}%`, minWidth: carsTotal > 0 ? '4px' : 0 }}
                >
                  <div className="flex h-full">
                    {row.Open > 0 && (
                      <div style={{ width: `${pct(row.Open, carsTotal)}%`, backgroundColor: '#be123c' }} />
                    )}
                    {row.Ongoing > 0 && (
                      <div style={{ width: `${pct(row.Ongoing, carsTotal)}%`, backgroundColor: '#2563eb' }} />
                    )}
                    {row.Closed > 0 && (
                      <div style={{ width: `${pct(row.Closed, carsTotal)}%`, backgroundColor: '#0f766e' }} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3">
        <span className="font-black uppercase text-slate-600" style={{ fontSize: '6.5pt' }}>
          Findings
        </span>
        <LegendItem color="#dc2626" label="NC" />
        <LegendItem color="#f59e0b" label="OFI" />
        <LegendItem color="#16a34a" label="Compliant" />
        <span className="font-black uppercase text-slate-600 ml-2" style={{ fontSize: '6.5pt' }}>
          CAR Status
        </span>
        <LegendItem color="#be123c" label="Open" />
        <LegendItem color="#2563eb" label="Ongoing" />
        <LegendItem color="#0f766e" label="Closed" />
      </div>
    </div>
  );
}

export function CARRegistryReportPrintTemplate({
  cars,
  yearlyPerformance,
  yearlyPerformanceTotals,
  campusFindings,
  campusFindingTotals,
  unitMap,
  campusMap,
  yearFilter,
  campusFilterName,
  auditTypeFilter,
  typeFilterLabel,
  generatedBy,
  signatories,
}: CARRegistryReportPrintTemplateProps) {
  const showIqa = auditTypeFilter !== 'EQA';
  const showEqa = auditTypeFilter !== 'IQA';

  const summary = useMemo(() => {
    const total = cars.length;
    const iqaCount = cars.filter((car) => car.auditType !== 'EQA').length;
    const eqaCount = cars.filter((car) => car.auditType === 'EQA').length;
    const open = cars.filter((car) => car.status === 'Open').length;
    const closed = cars.filter((car) => car.status === 'Closed').length;
    const ongoing = total - open - closed;
    const overdue = cars.filter((car) => {
      if (car.status === 'Closed') return false;
      const info = getNextCarActionInfo(car);
      if (info.urgency === 'overdue') return true;
      const replyDeadline = parseCarDate(car.timeLimitForReply);
      return (
        Boolean(replyDeadline) &&
        (replyDeadline as Date) < new Date() &&
        (car.status === 'Open' || car.status === 'Awaiting Response/Update')
      );
    }).length;
    return { total, iqaCount, eqaCount, open, ongoing, closed, overdue };
  }, [cars]);

  const sortedCars = useMemo(
    () => [...cars].sort((a, b) => (a.carNumber || '').localeCompare(b.carNumber || '')),
    [cars],
  );

  const now = new Date();
  const refNo = `RSU-QAO-CAR-${now.getFullYear()}-${format(now, 'MMdd')}`;
  const directorName = signatories?.qaoDirector || 'Director, Quality Assurance Office';
  const qmsHeadName = signatories?.qmsHead || 'Head, Quality Management System Unit';
  const resolutionRate = formatPct(summary.closed, summary.total);

  return (
    <div
      className="p-0 text-black bg-white mx-auto font-sans leading-tight"
      style={{ width: '12in', maxWidth: '100%', fontSize: '9pt' }}
    >
      <UniversityHeading
        officeName="QUALITY ASSURANCE OFFICE"
        subOffice="Institutional Quality Management System"
        reportTitle="CORRECTIVE ACTION REQUEST (CAR) REGISTRY ANALYTICAL REPORT"
        reportSubtitle="Visualization, Performance Tables, Graphs & Control Register"
        refNo={refNo}
        datePrinted={now}
      />

      <table className="w-full border-collapse border border-black mb-3" style={{ fontSize: '7.5pt' }}>
        <tbody>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[16%]">Audit Scope:</td>
            <td className="border border-black p-1.5 font-semibold w-[34%]">{typeFilterLabel}</td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[16%]">Year:</td>
            <td className="border border-black p-1.5 font-semibold w-[34%]">
              {yearFilter === 'all' ? 'All Years' : yearFilter}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">Campus / Site:</td>
            <td className="border border-black p-1.5 font-semibold">{campusFilterName}</td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">Generated By:</td>
            <td className="border border-black p-1.5 font-semibold">{generatedBy}</td>
          </tr>
        </tbody>
      </table>

      <div className={`grid ${showIqa && showEqa ? 'grid-cols-6' : 'grid-cols-5'} gap-2 mb-4 text-center`}>
        <div className="border border-slate-900 p-2 bg-slate-50">
          <p className="font-black uppercase text-slate-600" style={{ fontSize: '6.5pt' }}>
            Total CARs
          </p>
          <p className="font-black text-slate-900" style={{ fontSize: '16pt' }}>
            {summary.total}
          </p>
          <p className="font-semibold text-slate-500" style={{ fontSize: '6pt' }}>
            Registry Records
          </p>
        </div>
        {showIqa && (
          <div className="border border-blue-800 p-2 bg-blue-50">
            <p className="font-black uppercase text-blue-700" style={{ fontSize: '6.5pt' }}>
              IQA CARs
            </p>
            <p className="font-black text-blue-700" style={{ fontSize: '16pt' }}>
              {summary.iqaCount}
            </p>
            <p className="font-semibold text-blue-600" style={{ fontSize: '6pt' }}>
              Internal Audit
            </p>
          </div>
        )}
        {showEqa && (
          <div className="border border-violet-800 p-2 bg-violet-50">
            <p className="font-black uppercase text-violet-700" style={{ fontSize: '6.5pt' }}>
              EQA CARs
            </p>
            <p className="font-black text-violet-700" style={{ fontSize: '16pt' }}>
              {summary.eqaCount}
            </p>
            <p className="font-semibold text-violet-600" style={{ fontSize: '6pt' }}>
              External Audit
            </p>
          </div>
        )}
        <div className="border border-rose-700 p-2 bg-rose-50">
          <p className="font-black uppercase text-rose-700" style={{ fontSize: '6.5pt' }}>
            Open
          </p>
          <p className="font-black text-rose-700" style={{ fontSize: '16pt' }}>
            {summary.open}
          </p>
          <p className="font-semibold text-rose-600" style={{ fontSize: '6pt' }}>
            Awaiting Action
          </p>
        </div>
        <div className="border border-amber-700 p-2 bg-amber-50">
          <p className="font-black uppercase text-amber-700" style={{ fontSize: '6.5pt' }}>
            On-Going
          </p>
          <p className="font-black text-amber-700" style={{ fontSize: '16pt' }}>
            {summary.ongoing}
          </p>
          <p className="font-semibold text-amber-600" style={{ fontSize: '6pt' }}>
            In Resolution
          </p>
        </div>
        <div className="border border-emerald-700 p-2 bg-emerald-50">
          <p className="font-black uppercase text-emerald-700" style={{ fontSize: '6.5pt' }}>
            Closed / Resolved
          </p>
          <p className="font-black text-emerald-700" style={{ fontSize: '16pt' }}>
            {summary.closed}
          </p>
          <p className="font-semibold text-emerald-600" style={{ fontSize: '6pt' }}>
            {resolutionRate} Resolution Rate
          </p>
        </div>
      </div>

      <div className="border border-slate-400 bg-slate-50 p-2 mb-4" style={{ fontSize: '7.5pt' }}>
        <strong>Executive Interpretation:</strong> The registry contains {summary.total} corrective action request
        {summary.total === 1 ? '' : 's'} for the selected scope, of which{' '}
        {auditTypeFilter === 'IQA' ? (
          <>{summary.iqaCount} are internal audit (IQA) findings.</>
        ) : auditTypeFilter === 'EQA' ? (
          <>{summary.eqaCount} are external audit (EQA) findings.</>
        ) : (
          <>
            {summary.iqaCount} are internal audit (IQA) and {summary.eqaCount} are external audit (EQA) findings.
          </>
        )}{' '}
        {summary.closed} CAR
        {summary.closed === 1 ? ' has' : 's have'} been closed, {summary.ongoing} remain on-going, and {summary.open}{' '}
        remain open. The current resolution rate is {resolutionRate}
        {summary.overdue > 0
          ? `, with ${summary.overdue} CAR(s) flagged overdue and requiring immediate follow-up.`
          : '.'}
      </div>

      <div className="mb-4">
        <h3
          className="font-black uppercase border-b-2 border-slate-900 pb-1 mb-2 tracking-wider"
          style={{ fontSize: '9.5pt' }}
        >
          1. Yearly NC &amp; CAR Performance
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <table className="w-full border-collapse border border-black" style={{ fontSize: '7pt' }}>
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-1 text-left uppercase">Year</th>
                <th className="border border-black p-1 text-right uppercase">Total NC</th>
                {showIqa && <th className="border border-black p-1 text-right uppercase">IQA</th>}
                {showEqa && <th className="border border-black p-1 text-right uppercase">EQA</th>}
                <th className="border border-black p-1 text-right uppercase">Open</th>
                <th className="border border-black p-1 text-right uppercase">On-Going</th>
                <th className="border border-black p-1 text-right uppercase">Closed</th>
              </tr>
            </thead>
            <tbody>
              {yearlyPerformance.length === 0 ? (
                <tr>
                  <td
                    colSpan={5 + Number(showIqa) + Number(showEqa)}
                    className="border border-black p-2 text-center italic text-slate-500"
                  >
                    No records available.
                  </td>
                </tr>
              ) : (
                yearlyPerformance.map((row) => (
                  <tr key={row.year}>
                    <td className="border border-black p-1 font-black">{row.year}</td>
                    <td className="border border-black p-1 text-right font-bold">
                      {row.NC} ({formatPct(row.NC, yearlyPerformanceTotals.NC)})
                    </td>
                    {showIqa && (
                      <td className="border border-black p-1 text-right font-semibold text-blue-700">
                        {row.iqaCount} ({formatPct(row.iqaCount, row.NC)})
                      </td>
                    )}
                    {showEqa && (
                      <td className="border border-black p-1 text-right font-semibold text-violet-700">
                        {row.eqaCount} ({formatPct(row.eqaCount, row.NC)})
                      </td>
                    )}
                    <td className="border border-black p-1 text-right font-semibold text-rose-700">
                      {row.Open} ({formatPct(row.Open, row.NC)})
                    </td>
                    <td className="border border-black p-1 text-right font-semibold text-amber-700">
                      {row['On-Going']} ({formatPct(row['On-Going'], row.NC)})
                    </td>
                    <td className="border border-black p-1 text-right font-semibold text-emerald-700">
                      {row.Closed} ({formatPct(row.Closed, row.NC)})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td className="border border-black p-1 uppercase">Total</td>
                <td className="border border-black p-1 text-right">{yearlyPerformanceTotals.NC}</td>
                {showIqa && (
                  <td className="border border-black p-1 text-right text-blue-700">
                    {yearlyPerformanceTotals.iqaCount}
                  </td>
                )}
                {showEqa && (
                  <td className="border border-black p-1 text-right text-violet-700">
                    {yearlyPerformanceTotals.eqaCount}
                  </td>
                )}
                <td className="border border-black p-1 text-right text-rose-700">{yearlyPerformanceTotals.Open}</td>
                <td className="border border-black p-1 text-right text-amber-700">
                  {yearlyPerformanceTotals['On-Going']}
                </td>
                <td className="border border-black p-1 text-right text-emerald-700">
                  {yearlyPerformanceTotals.Closed}
                </td>
              </tr>
            </tfoot>
          </table>
          <div className="border border-slate-300 p-2">
            <p className="font-black uppercase text-slate-600 mb-2" style={{ fontSize: '7pt' }}>
              Stacked Resolution Graph by Year
            </p>
            <YearlyPerformanceChart rows={yearlyPerformance} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3
          className="font-black uppercase border-b-2 border-slate-900 pb-1 mb-2 tracking-wider"
          style={{ fontSize: '9.5pt' }}
        >
          2. Findings &amp; CAR Status by Site / Campus
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <table className="w-full border-collapse border border-black" style={{ fontSize: '7pt' }}>
            <thead>
              <tr className="bg-slate-200">
                <th className="border border-black p-1 text-left uppercase">Site / Campus</th>
                <th className="border border-black p-1 text-right uppercase text-rose-700">NC</th>
                <th className="border border-black p-1 text-right uppercase text-amber-700">OFI</th>
                <th className="border border-black p-1 text-right uppercase text-emerald-700">Compliant</th>
                <th className="border border-black p-1 text-right uppercase text-rose-700">Open</th>
                <th className="border border-black p-1 text-right uppercase text-blue-700">Ongoing</th>
                <th className="border border-black p-1 text-right uppercase text-emerald-700">Closed</th>
              </tr>
            </thead>
            <tbody>
              {campusFindings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-black p-2 text-center italic text-slate-500">
                    No campus records available.
                  </td>
                </tr>
              ) : (
                campusFindings.map((row) => (
                  <tr key={row.campusId}>
                    <td className="border border-black p-1 font-bold">{row.campus}</td>
                    <td className="border border-black p-1 text-right">{row.NC}</td>
                    <td className="border border-black p-1 text-right">{row.OFI}</td>
                    <td className="border border-black p-1 text-right">{row.Compliant}</td>
                    <td className="border border-black p-1 text-right">{row.Open}</td>
                    <td className="border border-black p-1 text-right">{row.Ongoing}</td>
                    <td className="border border-black p-1 text-right">{row.Closed}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-black">
                <td className="border border-black p-1 uppercase">Total</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.NC}</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.OFI}</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.Compliant}</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.Open}</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.Ongoing}</td>
                <td className="border border-black p-1 text-right">{campusFindingTotals.Closed}</td>
              </tr>
            </tfoot>
          </table>
          <div className="border border-slate-300 p-2">
            <p className="font-black uppercase text-slate-600 mb-2" style={{ fontSize: '7pt' }}>
              Comparative Findings &amp; CAR Status Graph
            </p>
            <CampusFindingsChart rows={campusFindings} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <h3
          className="font-black uppercase border-b-2 border-slate-900 pb-1 mb-2 tracking-wider"
          style={{ fontSize: '9.5pt' }}
        >
          3. Complete CAR Control Register
        </h3>
        <table className="w-full border-collapse border border-black" style={{ fontSize: '6.5pt' }}>
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-1 text-center uppercase w-[7%]">CAR No.</th>
              <th className="border border-black p-1 text-left uppercase w-[18%]">Title / Procedure</th>
              <th className="border border-black p-1 text-center uppercase w-[5%]">Type</th>
              <th className="border border-black p-1 text-center uppercase w-[14%]">Responsible Unit</th>
              <th className="border border-black p-1 text-center uppercase w-[10%]">Campus</th>
              <th className="border border-black p-1 text-center uppercase w-[8%]">Reply Limit</th>
              <th className="border border-black p-1 text-center uppercase w-[8%]">Request Date</th>
              <th className="border border-black p-1 text-center uppercase w-[8%]">Follow-up</th>
              <th className="border border-black p-1 text-center uppercase w-[8%]">Final Verif.</th>
              <th className="border border-black p-1 text-center uppercase w-[7%]">Status</th>
              <th className="border border-black p-1 text-center uppercase w-[7%]">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sortedCars.length === 0 ? (
              <tr>
                <td colSpan={11} className="border border-black p-3 text-center italic text-slate-500">
                  No CAR records available for the selected filters.
                </td>
              </tr>
            ) : (
              sortedCars.map((car) => {
                const latestFollowUp =
                  car.followUpLogs && car.followUpLogs.length > 0
                    ? car.followUpLogs[car.followUpLogs.length - 1]
                    : null;
                const latestEffectiveness =
                  car.effectivenessAudits && car.effectivenessAudits.length > 0
                    ? car.effectivenessAudits[car.effectivenessAudits.length - 1]
                    : null;
                return (
                  <tr key={car.id} style={{ pageBreakInside: 'avoid' }}>
                    <td className="border border-black p-1 text-center font-black whitespace-nowrap">
                      {car.carNumber || ''}
                    </td>
                    <td className="border border-black p-1 text-left align-top">{car.procedureTitle || ''}</td>
                    <td className="border border-black p-1 text-center font-bold">
                      {car.auditType === 'EQA' ? 'EQA' : 'IQA'}
                    </td>
                    <td className="border border-black p-1 text-center align-top font-semibold uppercase">
                      {unitMap.get(car.unitId) || car.unitId || ''}
                    </td>
                    <td className="border border-black p-1 text-center align-top">
                      {campusMap.get(car.campusId) || ''}
                    </td>
                    <td className="border border-black p-1 text-center whitespace-nowrap">
                      {safeDate(car.timeLimitForReply)}
                    </td>
                    <td className="border border-black p-1 text-center whitespace-nowrap">
                      {safeDate(car.requestDate)}
                    </td>
                    <td className="border border-black p-1 text-center whitespace-nowrap">
                      {safeDate(latestFollowUp?.date)}
                    </td>
                    <td className="border border-black p-1 text-center whitespace-nowrap">
                      {safeDate(latestEffectiveness?.date)}
                    </td>
                    <td className="border border-black p-1 text-center font-black uppercase">
                      {latestEffectiveness?.action || car.status}
                    </td>
                    <td className="border border-black p-1 text-left italic align-top">
                      {latestEffectiveness?.remarks || latestFollowUp?.remarks || ''}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 text-center" style={{ fontSize: '8pt' }}>
        <div>
          <p className="font-bold uppercase mb-8">Prepared by:</p>
          <p className="border-t border-black pt-1 font-black">{generatedBy}</p>
          <p className="text-slate-600" style={{ fontSize: '7pt' }}>
            Quality Assurance Office
          </p>
        </div>
        <div>
          <p className="font-bold uppercase mb-8">Reviewed by:</p>
          <p className="border-t border-black pt-1 font-black">{qmsHeadName}</p>
          <p className="text-slate-600" style={{ fontSize: '7pt' }}>
            Quality Management System Unit
          </p>
        </div>
        <div>
          <p className="font-bold uppercase mb-8">Approved by:</p>
          <p className="border-t border-black pt-1 font-black">{directorName}</p>
          <p className="text-slate-600" style={{ fontSize: '7pt' }}>
            Quality Assurance Office
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between mt-6 border-t border-slate-400 pt-2" style={{ fontSize: '7pt' }}>
        <div>
          <p className="font-bold">QAO-01-018</p>
          <p className="text-slate-500">Creation Date: 2021-02-14</p>
        </div>
        <p className="font-semibold text-slate-600">
          System-generated report · {refNo} · Generated {format(now, 'MMM dd, yyyy HH:mm')}
        </p>
      </div>
    </div>
  );
}
