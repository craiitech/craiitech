
'use client';

import { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Signatories, Unit, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { parseDate } from '@/lib/utils';

interface ConsolidatedAuditReportTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  clauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  signatories?: Signatories;
  /** Override the displayed campus/site name. When omitted, falls back to plan.campusId lookup. */
  campusName?: string;
  /** When true, render separate sections per campus instead of one combined section. */
  perCampus?: boolean;
}

// A reusable inner component that renders the findings tables for one campus section
function CampusFindingsSection({
  campusLabel,
  schedules,
  findings,
}: {
  campusLabel: string;
  schedules: AuditSchedule[];
  findings: AuditFinding[];
}) {
  const commendableList = schedules.filter(s => s.summaryCommendable);
  const ofiList = schedules.filter(s => s.summaryOFI);
  const ncList = schedules.filter(s => s.summaryNC || findings.some(f => f.auditScheduleId === s.id && f.type === 'Non-Conformance'));

  return (
    <div className="space-y-4 break-before-page pt-8 first:pt-0">
      <h4 className="font-black text-[11pt] uppercase text-slate-800 tracking-widest border-b pb-1">
        AUDIT REPORT SITE - ({campusLabel.toUpperCase()})
      </h4>

      {/* TABLE 1: COMMENDABLE FINDINGS */}
      <table className="w-full border-collapse border-[1.5px] border-black">
        <thead>
          <tr className="bg-slate-200">
            <th className="border border-black p-2 w-[50px] text-center font-black uppercase text-[10pt]">No.</th>
            <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[10pt]">Site / Unit / Department</th>
            <th className="border border-black p-2 text-center font-black uppercase text-[10pt]">Commendable Findings</th>
          </tr>
        </thead>
        <tbody>
          {commendableList.map((s, i) => (
            <tr key={s.id}>
              <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
              <td className="border border-black p-2 text-center align-top">
                <p className="font-black uppercase text-[10pt]">{s.targetName}</p>
                <p className="text-[9pt] font-bold text-slate-500 italic uppercase">({s.officerInCharge || s.auditeeHeadName || 'Unit Head'})</p>
              </td>
              <td className="border border-black p-2 align-top">
                <div className="flex gap-2">
                  <span className="font-black">•</span>
                  <p className="whitespace-pre-wrap leading-relaxed">{s.summaryCommendable}</p>
                </div>
              </td>
            </tr>
          ))}
          {commendableList.length === 0 && (
            <tr><td colSpan={3} className="border border-black p-4 text-center italic text-slate-400">No commendable practices recorded for this cycle.</td></tr>
          )}
        </tbody>
      </table>

      {/* TABLE 2: RECOMMENDATIONS & OFI */}
      <div className="space-y-4 pt-4">
        <p className="leading-relaxed italic">
          The following recommendations and opportunities for improvement provided by the auditor are intended to contribute to the continuous improvement of the management system of the University.
        </p>
        <table className="w-full border-collapse border-[1.5px] border-black">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-2 w-[50px] text-center font-black uppercase text-[10pt]">No.</th>
              <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[10pt]">Site / Unit / Department</th>
              <th className="border border-black p-2 text-center font-black uppercase text-[10pt]">Recommendation and Opportunities for Improvement</th>
            </tr>
          </thead>
          <tbody>
            {ofiList.map((s, i) => (
              <tr key={s.id}>
                <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                <td className="border border-black p-2 text-center align-top">
                  <p className="font-black uppercase text-[10pt]">{s.targetName}</p>
                  <p className="text-[9pt] font-bold text-slate-500 italic uppercase">({s.officerInCharge || s.auditeeHeadName || 'Unit Head'})</p>
                </td>
                <td className="border border-black p-2 align-top whitespace-pre-wrap leading-relaxed italic">
                  {s.summaryOFI}
                </td>
              </tr>
            ))}
            {ofiList.length === 0 && (
              <tr><td colSpan={3} className="border border-black p-4 text-center italic text-slate-400">No opportunities for improvement recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TABLE 3: NON-CONFORMANCES */}
      <div className="space-y-4 pt-4">
        <p className="leading-relaxed">
          The following Non-Conformances were identified by the auditors that require corrective actions.
        </p>
        <table className="w-full border-collapse border-[1.5px] border-black">
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[10pt]">Site / Unit / Department</th>
              <th className="border border-black p-2 text-center font-black uppercase text-[10pt]">Non-Conformances</th>
              <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[9pt] leading-tight">ISO 21001:2018 Clauses</th>
            </tr>
          </thead>
          <tbody>
            {ncList.map((s) => {
              const ncFindings = findings.filter(f => f.auditScheduleId === s.id && f.type === 'Non-Conformance');
              return (
                <tr key={s.id}>
                  <td className="border border-black p-2 text-center align-top">
                    <p className="font-black uppercase text-[10pt]">{s.targetName}</p>
                    <p className="text-[9pt] font-bold text-slate-500 italic uppercase">({s.officerInCharge || s.auditeeHeadName || 'Unit Head'})</p>
                  </td>
                  <td className="border border-black p-2 align-top">
                    <div className="space-y-4">
                      {s.summaryNC && <p className="whitespace-pre-wrap leading-relaxed font-bold italic">"{s.summaryNC}"</p>}
                      <div className="space-y-2">
                        {ncFindings.map((f, fIdx) => (
                          <div key={fIdx} className="pl-2 border-l-2 border-slate-200">
                            <p className="text-[10pt] font-black text-primary uppercase">Finding for Clause {f.isoClause}:</p>
                            <p className="text-[11pt] leading-relaxed italic">"{f.ncStatement || f.description}"</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="border border-black p-2 text-center align-top font-black text-primary">
                    {Array.from(new Set(ncFindings.map(f => f.isoClause))).join(', ') || '--'}
                  </td>
                </tr>
              );
            })}
            {ncList.length === 0 && (
              <tr><td colSpan={3} className="border border-black p-4 text-center italic text-slate-400">Zero non-conformances identified. Full standard compliance verified.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ConsolidatedAuditReportTemplate({ 
    plan, 
    schedules, 
    findings, 
    clauses, 
    units, 
    campuses, 
    signatories,
    campusName: overrideCampusName,
    perCampus = false,
}: ConsolidatedAuditReportTemplateProps) {
  
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const auditDateRange = useMemo(() => {
    if (schedules.length === 0) return '--';
    const dates = schedules.map(s => parseDate(s.scheduledDate));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${format(min, 'MMMM dd, yyyy')} to ${format(max, 'MMMM dd, yyyy')}`;
  }, [schedules]);

  const qaoDirectorName = signatories?.qaoDirector || '____________________';

  // The display label for the site header when NOT in perCampus mode
  const displayTarget = overrideCampusName || campusMap.get(plan.campusId) || 'UNIVERSITY-WIDE';

  // For perCampus mode: gather distinct campus IDs from the schedules
  const campusSections = useMemo(() => {
    if (!perCampus) return [];
    const campusIds = Array.from(new Set(schedules.map(s => s.campusId).filter(Boolean)));
    return campusIds.map(cId => ({
      campusId: cId,
      campusLabel: campusMap.get(cId) || 'Unknown Campus',
      schedules: schedules.filter(s => s.campusId === cId),
    }));
  }, [perCampus, schedules, campusMap]);

  return (
    <div className="p-0 text-black bg-white max-w-[7.5in] mx-auto font-sans leading-tight border-none" style={{ fontSize: '12pt' }}>
      
      {/* OFFICIAL HEADER TABLE */}
      <table className="w-full border-collapse border-[1.5px] border-slate-400 mb-8">
        <tbody>
          <tr>
            <td className="border-[1.5px] border-slate-400 p-4 w-[70%] text-center align-middle space-y-1">
              <p className="text-xs font-bold text-slate-600 leading-none">Romblon State University</p>
              <p className="text-sm font-black uppercase tracking-widest text-slate-800">INTERNAL QUALITY AUDIT</p>
              <div className="h-px bg-slate-300 w-24 mx-auto my-1" />
              <p className="text-sm font-black uppercase text-slate-900">{plan.year} INTERNAL QUALITY AUDIT REPORT</p>
              <p className="text-[10pt] italic">Main Campus, Odiongan, Romblon</p>
            </td>
            <td className="border-[1.5px] border-slate-400 w-[30%] p-0">
              <table className="w-full border-collapse h-full">
                <tbody>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50 w-1/3 text-[10pt]">Doc. Num.</td>
                    <td className="p-1.5 text-[10pt]">{plan.auditNumber}</td>
                  </tr>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50 text-[10pt]">Standard</td>
                    <td className="p-1.5 font-bold text-[10pt]">ISO 21001:2018</td>
                  </tr>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50 text-[10pt]">Date of Audit</td>
                    <td className="p-1.5 text-[9pt]">{auditDateRange}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50 text-[10pt]">Page No.</td>
                    <td className="p-1.5 font-bold text-slate-400 text-[10pt]">Page 1 of 1</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SECTION: AUDIT FINDINGS */}
      <div className="space-y-10">
        <div className="space-y-2">
          <h3 className="font-black text-sm text-slate-900" style={{ fontSize: '13pt' }}>Audit Findings</h3>
          <p className="leading-relaxed">
            The following audit findings are gained during the audit and will assist the university in preparing for the next stage of the external audit.
          </p>
        </div>

        {perCampus ? (
          // Per-campus mode: render one section per campus, each starting on a new page
          campusSections.map(({ campusId, campusLabel, schedules: campusSchedules }) => (
            <CampusFindingsSection
              key={campusId}
              campusLabel={campusLabel}
              schedules={campusSchedules}
              findings={findings}
            />
          ))
        ) : (
          // Single-campus or filtered mode
          <CampusFindingsSection
            campusLabel={displayTarget}
            schedules={schedules}
            findings={findings}
          />
        )}
      </div>

      {/* V. Auditor Team Conclusion */}
      <section className="mt-12 mb-12 space-y-4 break-inside-avoid">
        <h3 className="font-black text-sm uppercase border-b border-black pb-1 flex items-center gap-2" style={{ fontSize: '13pt' }}>
          V. Auditor Team Conclusion
        </h3>
        <div className="border border-black p-6 min-h-[150px] leading-relaxed italic text-slate-700">
          Based on the objective evidence collected across the university units, the Internal Quality Audit team concludes that the Romblon State University Educational Organizations Management System (EOMS) is...
        </div>
      </section>

      {/* FINAL SIGNATORIES */}
      <div className="grid grid-cols-2 gap-16 mt-20 text-center break-inside-avoid px-10">
        <div>
          <div className="border-b border-black font-black text-sm pb-1 mb-1 min-h-[24px] uppercase" style={{ fontSize: '12pt' }}>
            {plan.leadAuditorName || '__________________________'}
          </div>
          <p className="text-[10pt] uppercase font-black text-slate-500">Lead Internal Auditor</p>
        </div>
        <div>
          <div className="border-b border-black font-black text-sm pb-1 mb-1 min-h-[24px] uppercase" style={{ fontSize: '12pt' }}>
            {qaoDirectorName}
          </div>
          <p className="text-[10pt] uppercase font-black text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-16 pt-4 border-t border-slate-200 flex justify-between items-center text-[10pt] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-CONSOLIDATED-AUDIT-REPORT | REV 03-2025</span>
        <span className="font-bold">Authenticated Institutional Record</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
