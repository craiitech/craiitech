'use client';

import React, { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Signatories, Unit, Campus } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { CheckCircle2, ShieldAlert, FileText, Target, BarChart3, Users, Building2, ShieldCheck } from 'lucide-react';

interface ConsolidatedAuditReportTemplateProps {
  plan: AuditPlan;
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  clauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  signatories?: Signatories;
}

export function ConsolidatedAuditReportTemplate({ 
    plan, 
    schedules, 
    findings, 
    clauses, 
    units, 
    campuses, 
    signatories 
}: ConsolidatedAuditReportTemplateProps) {
  
  const unitMap = new Map(units.map(u => [u.id, u.name]));
  const campusMap = new Map(campuses.map(c => [c.id, c.name]));
  const clauseMap = new Map(clauses.map(c => [c.id, c.title]));

  // 1. Calculate General Stats
  const stats = useMemo(() => {
    const counts = { Compliance: 0, OFI: 0, NC: 0 };
    findings.forEach(f => {
        if (f.type === 'Compliance') counts.Compliance++;
        else if (f.type === 'Observation for Improvement') counts.OFI++;
        else if (f.type === 'Non-Conformance') counts.NC++;
    });
    return counts;
  }, [findings]);

  // 2. Trend Analysis by Clause
  const clauseTrends = useMemo(() => {
    const trends: Record<string, { id: string, title: string, c: number, ofi: number, nc: number, units: string[] }> = {};
    findings.forEach(f => {
        if (!trends[f.isoClause]) {
            trends[f.isoClause] = { 
                id: f.isoClause, 
                title: clauseMap.get(f.isoClause) || 'Unknown Clause', 
                c: 0, ofi: 0, nc: 0, units: [] 
            };
        }
        if (f.type === 'Compliance') trends[f.isoClause].c++;
        else if (f.type === 'Observation for Improvement') trends[f.isoClause].ofi++;
        else if (f.type === 'Non-Conformance') trends[f.isoClause].nc++;
        
        const schedule = schedules.find(s => s.id === f.auditScheduleId);
        if (schedule) trends[f.isoClause].units.push(schedule.targetName);
    });
    return Object.values(trends).sort((a,b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [findings, schedules, clauseMap]);

  const auditDateRange = useMemo(() => {
    if (schedules.length === 0) return '--';
    const dates = schedules.map(s => s.scheduledDate instanceof Timestamp ? s.scheduledDate.toDate() : new Date(s.scheduledDate));
    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));
    return `${format(min, 'MMMM dd, yyyy')} to ${format(max, 'MMMM dd, yyyy')}`;
  }, [schedules]);

  const qaoDirectorName = signatories?.qaoDirector || '____________________';

  return (
    <div className="p-12 text-black bg-white max-w-[8.5in] mx-auto font-sans text-[11px] leading-tight border-none">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold uppercase tracking-tight leading-none">Romblon State University</h1>
        <h2 className="text-md font-semibold uppercase tracking-tight leading-none mt-1">Quality Assurance Office</h2>
        <div className="mt-6 border-y-2 border-black py-2 bg-slate-50">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">CONSOLIDATED INTERNAL AUDIT SUMMARY REPORT</h2>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <section className="mb-10 space-y-4">
        <h3 className="font-black text-xs uppercase border-b border-black pb-1 flex items-center gap-2">
            <FileText className="h-4 w-4" /> I. Executive Summary
        </h3>
        <table className="w-full border-collapse border border-black text-[10px]">
            <tbody>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50 w-1/4">Audit Plan Title</td>
                    <td className="border border-black p-2 w-3/4 font-black">{plan.title}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50">Audit Number</td>
                    <td className="border border-black p-2">{plan.auditNumber}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50">Academic Year</td>
                    <td className="border border-black p-2 font-bold">{plan.year}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50">Inclusive Dates</td>
                    <td className="border border-black p-2">{auditDateRange}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50">Lead Auditor</td>
                    <td className="border border-black p-2 font-black">{plan.leadAuditorName}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-slate-50">Audit Scope</td>
                    <td className="border border-black p-2 italic leading-relaxed">"{plan.scope}"</td>
                </tr>
            </tbody>
        </table>
      </section>

      {/* SECTION 2: FINDINGS DISTRIBUTION */}
      <section className="mb-10 space-y-4">
        <h3 className="font-black text-xs uppercase border-b border-black pb-1 flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> II. Institutional Findings Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
            <div className="border border-black p-4 text-center space-y-1">
                <p className="text-[9px] font-black uppercase text-green-700">Compliances (C)</p>
                <p className="text-2xl font-black">{stats.Compliance}</p>
            </div>
            <div className="border border-black p-4 text-center space-y-1">
                <p className="text-[9px] font-black uppercase text-amber-600">Opportunities (OFI)</p>
                <p className="text-2xl font-black">{stats.OFI}</p>
            </div>
            <div className="border border-black p-4 text-center space-y-1 bg-slate-50">
                <p className="text-[9px] font-black uppercase text-red-600">Non-Conformances (NC)</p>
                <p className="text-2xl font-black">{stats.NC}</p>
            </div>
        </div>
        <p className="text-[9px] text-slate-500 italic mt-2">
            * These statistics aggregate verified findings across all monitored academic and administrative units within this audit cycle.
        </p>
      </section>

      {/* SECTION 3: SYSTEMIC ANALYSIS (BY CLAUSE) */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <h3 className="font-black text-xs uppercase border-b border-black pb-1 flex items-center gap-2">
            <Target className="h-4 w-4" /> III. Strategic Clause Trend Analysis
        </h3>
        <table className="w-full border-collapse border-2 border-black text-[9px]">
            <thead>
                <tr className="bg-slate-100 uppercase font-black text-center">
                    <th className="border border-black p-2 w-[60px]">Clause</th>
                    <th className="border border-black p-2 text-left">Requirement Description</th>
                    <th className="border border-black p-2 w-[40px]">C</th>
                    <th className="border border-black p-2 w-[40px]">OFI</th>
                    <th className="border border-black p-2 w-[40px]">NC</th>
                    <th className="border border-black p-2">Participating Units</th>
                </tr>
            </thead>
            <tbody>
                {clauseTrends.map(item => (
                    <tr key={item.id}>
                        <td className="border border-black p-2 text-center font-black">{item.id}</td>
                        <td className="border border-black p-2 font-bold">{item.title}</td>
                        <td className="border border-black p-2 text-center font-bold text-green-600">{item.c}</td>
                        <td className="border border-black p-2 text-center font-bold text-amber-600">{item.ofi}</td>
                        <td className="border border-black p-2 text-center font-bold text-red-600">{item.nc}</td>
                        <td className="border border-black p-2 text-[8px] italic leading-tight">
                            {Array.from(new Set(item.units)).join(', ')}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </section>

      {/* SECTION 4: UNIT PARTICIPATION MATRIX */}
      <section className="mb-10 space-y-4 break-inside-avoid">
        <h3 className="font-black text-xs uppercase border-b border-black pb-1 flex items-center gap-2">
            <Building2 className="h-4 w-4" /> IV. Unit Participation Matrix
        </h3>
        <table className="w-full border-collapse border border-black text-[9px]">
            <thead>
                <tr className="bg-slate-50 uppercase font-black">
                    <th className="border border-black p-2 text-left">Unit / Office Audited</th>
                    <th className="border border-black p-2 text-center w-[150px]">Auditor Assignment</th>
                    <th className="border border-black p-2 text-center w-[100px]">Status</th>
                    <th className="border border-black p-2 text-center w-[80px]">Findings</th>
                </tr>
            </thead>
            <tbody>
                {schedules.map(s => {
                    const unitFindings = findings.filter(f => f.auditScheduleId === s.id);
                    const ncs = unitFindings.filter(f => f.type === 'Non-Conformance').length;
                    const ofis = unitFindings.filter(f => f.type === 'Observation for Improvement').length;
                    
                    return (
                        <tr key={s.id}>
                            <td className="border border-black p-2 font-bold uppercase">{s.targetName}</td>
                            <td className="border border-black p-2 text-center uppercase">{s.auditorName || 'TBA'}</td>
                            <td className="border border-black p-2 text-center font-black uppercase">{s.status}</td>
                            <td className="border border-black p-2 text-center font-bold">
                                {ncs} NC | {ofis} OFI
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
      </section>

      {/* SECTION 5: CONCLUSION */}
      <section className="mb-12 space-y-4 break-inside-avoid">
        <h3 className="font-black text-xs uppercase border-b border-black pb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> V. Auditor Team Conclusion
        </h3>
        <div className="border border-black p-6 min-h-[150px] text-sm leading-relaxed italic text-slate-700">
            Based on the objective evidence collected across the university units, the Internal Quality Audit team concludes that the Romblon State University Educational Organizations Management System (EOMS) is...
            <div className="mt-4 border-t border-dashed pt-4 opacity-40">
                (Lead Auditor to provide final institutional determination here)
            </div>
        </div>
      </section>

      {/* SIGNATORIES */}
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

      <div className="mt-8 text-center text-[9px] font-bold italic text-slate-500">
        This document is an aggregated summary of individual unit evidence logs.
      </div>

      {/* FOOTER */}
      <div className="mt-16 pt-4 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400 italic uppercase tracking-widest">
        <span>RSU-QAO-CONSOLIDATED-AUDIT | AY {plan.year}</span>
        <span className="font-bold">Institutional Registry Record</span>
        <span>Generated via RSU EOMS Portal</span>
      </div>
    </div>
  );
}
