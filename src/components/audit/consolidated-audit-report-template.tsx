'use client';

import React, { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Signatories, Unit, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn, getDirectDriveLink } from '@/lib/utils';

interface ConsolidatedAuditReportTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  clauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  signatories?: Signatories;
  logoUrl?: string;
}

export function ConsolidatedAuditReportTemplate({ 
    plan, 
    schedules, 
    findings, 
    clauses, 
    units, 
    campuses, 
    signatories,
    logoUrl
}: ConsolidatedAuditReportTemplateProps) {
  
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const auditDateRange = useMemo(() => {
    if (schedules.length === 0) return '--';
    const dates = schedules.map(s => s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${format(min, 'MMMM dd, yyyy')} to ${format(max, 'MMMM dd, yyyy')}`;
  }, [schedules]);

  const qaoDirectorName = signatories?.qaoDirector || '____________________';

  // Grouping for the findings tables
  const commendableList = schedules.filter(s => s.summaryCommendable);
  const ofiList = schedules.filter(s => s.summaryOFI);
  const ncList = schedules.filter(s => s.summaryNC || findings.some(f => f.auditScheduleId === s.id && f.type === 'Non-Conformance'));

  return (
    <div className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans text-[11px] leading-tight border-none">
      
      {/* OFFICIAL HEADER TABLE */}
      <table className="w-full border-collapse border-[1.5px] border-slate-400 mb-8">
        <tbody>
          <tr>
            <td className="border-[1.5px] border-slate-400 p-2 w-[15%] text-center align-middle">
              <img src={getDirectDriveLink(logoUrl) || "/rsupage.png"} alt="Institutional Logo" className="h-16 w-16 mx-auto object-contain" />
            </td>
            <td className="border-[1.5px] border-slate-400 p-4 w-[55%] text-center align-middle space-y-1">
              <p className="text-xs font-bold text-slate-600 leading-none">Romblon State University</p>
              <p className="text-sm font-black uppercase tracking-widest text-slate-800">INTERNAL QUALITY AUDIT</p>
              <div className="h-px bg-slate-300 w-24 mx-auto my-1" />
              <p className="text-sm font-black uppercase text-slate-900">{plan.year} INTERNAL QUALITY AUDIT REPORT</p>
            </td>
            <td className="border-[1.5px] border-slate-400 w-[30%] p-0">
              <table className="w-full border-collapse h-full">
                <tbody>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50 w-1/3">Doc. Num.</td>
                    <td className="p-1.5">{plan.auditNumber}</td>
                  </tr>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50">Standard</td>
                    <td className="p-1.5 font-bold">ISO 21001:2018</td>
                  </tr>
                  <tr className="border-b-[1.5px] border-slate-400">
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50">Date of Audit</td>
                    <td className="p-1.5 text-[9px]">{auditDateRange}</td>
                  </tr>
                  <tr>
                    <td className="p-1.5 font-bold border-r-[1.5px] border-slate-400 bg-slate-50">Page No.</td>
                    <td className="p-1.5 font-bold text-slate-400">Page 1 of 1</td>
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
            <h3 className="font-black text-sm text-slate-900">Audit Findings</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
                The following audit findings are gained during the audit and will assist the university in preparing for the next stage of the external audit.
            </p>
        </div>

        <div className="space-y-4">
            <h4 className="font-black text-[10px] uppercase text-slate-800 tracking-widest border-b pb-1">
                AUDIT REPORT SITE - ({campusMap.get(plan.campusId) || 'UNIVERSITY-WIDE'})
            </h4>

            {/* TABLE 1: COMMENDABLE FINDINGS */}
            <table className="w-full border-collapse border-[1.5px] border-black">
                <thead>
                    <tr className="bg-slate-200">
                        <th className="border border-black p-2 w-[50px] text-center font-black uppercase text-[9px]">No.</th>
                        <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[9px]">Site / Unit / Department</th>
                        <th className="border border-black p-2 text-center font-black uppercase text-[9px]">Commendable Findings</th>
                    </tr>
                </thead>
                <tbody>
                    {commendableList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                            <td className="border border-black p-2 text-center font-bold uppercase">{s.targetName}</td>
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
        </div>

        {/* TABLE 2: RECOMMENDATIONS & OFI */}
        <div className="space-y-4 pt-4">
            <p className="text-xs text-slate-600 leading-relaxed italic">
                The following recommendations and opportunities for improvement provided by the auditor are intended to contribute to the continuous improvement of the management system of the University.
            </p>
            <table className="w-full border-collapse border-[1.5px] border-black">
                <thead>
                    <tr className="bg-slate-200">
                        <th className="border border-black p-2 w-[50px] text-center font-black uppercase text-[9px]">No.</th>
                        <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[9px]">Site / Unit / Department</th>
                        <th className="border border-black p-2 text-center font-black uppercase text-[9px]">Recommendation and Opportunities for Improvement</th>
                    </tr>
                </thead>
                <tbody>
                    {ofiList.map((s, i) => (
                        <tr key={s.id}>
                            <td className="border border-black p-2 text-center font-bold">{i + 1}</td>
                            <td className="border border-black p-2 text-center font-bold uppercase">{s.targetName}</td>
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
            <p className="text-xs text-slate-600 leading-relaxed">
                The following Non-Conformances were identified by the auditors that require corrective actions.
            </p>
            <table className="w-full border-collapse border-[1.5px] border-black">
                <thead>
                    <tr className="bg-slate-200">
                        <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[9px]">Site / Unit / Department</th>
                        <th className="border border-black p-2 text-center font-black uppercase text-[9px]">Non-Conformances</th>
                        <th className="border border-black p-2 w-[180px] text-center font-black uppercase text-[8px] leading-tight">ISO 21001:2018 Standard Clauses / Statutory / Regulatory Requirements</th>
                    </tr>
                </thead>
                <tbody>
                    {ncList.map((s) => {
                        const ncFindings = findings.filter(f => f.auditScheduleId === s.id && f.type === 'Non-Conformance');
                        return (
                            <tr key={s.id}>
                                <td className="border border-black p-2 text-center font-black uppercase align-top">{s.targetName}</td>
                                <td className="border border-black p-2 align-top">
                                    <div className="space-y-4">
                                        {s.summaryNC && <p className="whitespace-pre-wrap leading-relaxed font-bold italic">"{s.summaryNC}"</p>}
                                        <div className="space-y-2">
                                            {ncFindings.map((f, fIdx) => (
                                                <div key={fIdx} className="pl-2 border-l-2 border-slate-200">
                                                    <p className="text-[9px] font-black text-primary uppercase">Finding for Clause {f.isoClause}:</p>
                                                    <p className="text-[10px] leading-relaxed italic">"{f.ncStatement || f.description}"</p>
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

      {/* FINAL SIGNATORIES */}
      <div className="grid grid-cols-2 gap-16 mt-20 text-center break-inside-avoid px-10">
        <div>
          <div className="border-b border-black font-black text-xs pb-1 mb-1 min-h-[24px] uppercase">
            {plan.leadAuditorName || '__________________________'}
          </div>
          <p className="text-[9px] uppercase font-black text-slate-500">Lead Internal Auditor</p>
        </div>
        <div>
          <div className="border-b border-black font-black text-xs pb-1 mb-1 min-h-[24px] uppercase">
            {qaoDirectorName}
          </div>
          <p className="text-[9px] uppercase font-black text-slate-500">Director, Quality Assurance Office</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-16 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-CONSOLIDATED-AUDIT-REPORT | REV 03-2025</span>
        <span className="font-bold">Authenticated Institutional Record</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
