'use client';

import { useMemo } from 'react';
import type { 
    Submission, 
    Risk, 
    UnitMonitoringRecord, 
    ProgramComplianceRecord, 
    AuditFinding, 
    CorrectiveActionRequest, 
    ManagementReviewOutput 
} from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    ShieldCheck, 
    ShieldAlert, 
    CheckCircle2, 
    AlertTriangle, 
    TrendingUp, 
    Activity, 
    Target, 
    FileWarning, 
    Zap,
    Info,
    Gavel,
    Users,
    Award,
    ClipboardCheck,
    ListChecks,
    School
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';

interface StrategicSwotAnalysisProps {
  submissions: Submission[];
  risks: Risk[];
  monitoringRecords: UnitMonitoringRecord[];
  programCompliances?: ProgramComplianceRecord[];
  auditFindings?: AuditFinding[];
  correctiveActionRequests?: CorrectiveActionRequest[];
  mrOutputs?: ManagementReviewOutput[];
  scope: 'unit' | 'campus';
  name: string;
  selectedYear: number;
}

type SWOTItem = {
    title: string;
    description: string;
    tag: string;
    priority?: 'High' | 'Medium' | 'Low';
    category: 'Documentation' | 'Risk' | 'Operations' | 'Academic' | 'Audit' | 'Governance';
};

export function StrategicSwotAnalysis({ 
    submissions = [], 
    risks = [], 
    monitoringRecords = [], 
    programCompliances = [],
    auditFindings = [],
    correctiveActionRequests = [],
    mrOutputs = [],
    scope, 
    name, 
    selectedYear 
}: StrategicSwotAnalysisProps) {
  
  const analysis = useMemo(() => {
    const strengths: SWOTItem[] = [];
    const weaknesses: SWOTItem[] = [];

    // Ensure all inputs are arrays before processing to prevent crashes during loading states
    const safeSubmissions = Array.isArray(submissions) ? submissions : [];
    const safeRisks = Array.isArray(risks) ? risks : [];
    const safeMonitoring = Array.isArray(monitoringRecords) ? monitoringRecords : [];
    const safeCompliances = Array.isArray(programCompliances) ? programCompliances : [];
    const safeFindings = Array.isArray(auditFindings) ? auditFindings : [];
    const safeCars = Array.isArray(correctiveActionRequests) ? correctiveActionRequests : [];
    const safeMrOutputs = Array.isArray(mrOutputs) ? mrOutputs : [];

    const yearSubmissions = safeSubmissions.filter(s => s.year === selectedYear);
    const yearRisks = safeRisks.filter(r => r.year === selectedYear);
    const yearMonitoring = safeMonitoring.filter(r => {
        const d = r.visitDate?.toDate ? r.visitDate.toDate() : new Date(r.visitDate);
        return d.getFullYear() === selectedYear;
    });

    // --- 1. EOMS DOCUMENTATION PERFORMANCE ---
    const approvedCount = new Set(yearSubmissions.filter(s => s.statusId === 'approved').map(s => `${s.reportType}-${s.cycleId}`)).size;
    
    if (scope === 'unit') {
        if (approvedCount >= 10) {
            strengths.push({ title: 'Approved Registry Maturity', description: 'Unit has achieved high-density approval of mandatory EOMS documentation.', tag: '[ISO 7.5.3]', category: 'Documentation' });
        }
        if (yearSubmissions.some(s => s.statusId === 'rejected')) {
            weaknesses.push({ title: 'Review Backlog', description: 'Evidence logs have been rejected by ODIMO and require corrective resubmission.', tag: '[Process Correction]', priority: 'High', category: 'Documentation' });
        }
        const missingCount = (TOTAL_REPORTS_PER_CYCLE * 2) - approvedCount;
        if (missingCount > 4) {
            weaknesses.push({ title: 'Documentation Gaps', description: `Significant documentation gaps detected (${missingCount} items missing/unapproved).`, tag: '[EOMS Gap]', priority: 'High', category: 'Documentation' });
        }
    }

    // --- 2. FIELD MONITORING & 7S PERFORMANCE ---
    if (yearMonitoring.length > 0) {
        const latest = [...yearMonitoring].sort((a,b) => b.visitDate.toMillis() - a.visitDate.toMillis())[0];
        const applicable = latest.observations.filter(o => o.status !== 'Not Applicable');
        const available = applicable.filter(o => o.status === 'Available');
        const score = applicable.length > 0 ? (available.length / applicable.length) * 100 : 0;

        if (score >= 90) {
            strengths.push({ title: 'Operational Excellence', description: 'Latest on-site monitoring demonstrates superior physical and documentary compliance.', tag: '[Field Verify]', category: 'Operations' });
        } else if (score < 70) {
            weaknesses.push({ title: 'Non-Conformance Risk', description: `Monitoring score (${Math.round(score)}%) is below the institutional 70% threshold.`, tag: '[Standard Breach]', priority: 'High', category: 'Operations' });
        }
    }

    // --- 3. RISK MANAGEMENT PROACTIVITY ---
    if (yearRisks.length > 0) {
        const highRisks = yearRisks.filter(r => r.type === 'Risk' && r.preTreatment.rating === 'High' && r.status !== 'Closed');
        const closureRate = Math.round((yearRisks.filter(r => r.status === 'Closed').length / yearRisks.length) * 100);

        if (closureRate >= 80) {
            strengths.push({ title: 'Risk Resilience', description: 'Unit demonstrates high velocity in mitigating and closing identified risks.', tag: '[Risk Control]', category: 'Risk' });
        }
        if (highRisks.length > 0) {
            weaknesses.push({ title: 'Strategic Vulnerability', description: `${highRisks.length} High-magnitude risks remain open without verified treatment closure.`, tag: '[Priority 1]', priority: 'High', category: 'Risk' });
        }
    }

    // --- 4. CHED & ACADEMIC QUALITY (PROGRAM COMPLIANCE) ---
    if (safeCompliances.length > 0) {
        const withCopc = safeCompliances.filter(c => c.ched?.copcStatus === 'With COPC').length;
        const totalPrograms = safeCompliances.length;
        const copcRate = Math.round((withCopc / totalPrograms) * 100);

        if (copcRate === 100) {
            strengths.push({ title: 'Full Regulatory Parity', description: '100% of academic programs within scope possess active CHED COPC authority.', tag: '[Regulatory]', category: 'Academic' });
        } else if (copcRate < 80) {
            weaknesses.push({ title: 'Authority Gaps', description: `Only ${copcRate}% of programs have verified COPCs. Risks institutional operation.`, tag: '[CHED Flag]', priority: 'High', category: 'Academic' });
        }

        // Faculty Alignment
        let totalFaculty = 0;
        let alignedFaculty = 0;
        safeCompliances.forEach(c => {
            const members = c.faculty?.members || [];
            totalFaculty += members.length;
            alignedFaculty += members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
        });
        const facultyAlignment = totalFaculty > 0 ? Math.round((alignedFaculty / totalFaculty) * 100) : 100;

        if (facultyAlignment >= 95 && totalFaculty > 0) {
            strengths.push({ title: 'Resource Alignment', description: 'Faculty staffing list demonstrates high adherence to CMO qualification requirements.', tag: '[CMO Match]', category: 'Academic' });
        } else if (facultyAlignment < 85) {
            weaknesses.push({ title: 'Qualification Gaps', description: `Faculty alignment (${facultyAlignment}%) is below institutional standard.`, tag: '[Staffing Risk]', priority: 'Medium', category: 'Academic' });
        }

        // Accreditation
        const highAccredited = safeCompliances.filter(c => {
            const current = c.accreditationRecords?.find(m => m.lifecycleStatus === 'Current');
            return current && (current.level.includes('Level III') || current.level.includes('Level IV'));
        }).length;

        if (highAccredited > 0) {
            strengths.push({ title: 'Advanced Quality Maturity', description: `${highAccredited} program(s) have reached Level III or IV AACCUP status.`, tag: '[Peak Quality]', category: 'Academic' });
        }
    }

    // --- 5. AUDIT & CORRECTIVE ACTIONS (QA REPORTS) ---
    const activeCars = safeCars.filter(c => c.status !== 'Closed');
    if (activeCars.length > 0) {
        weaknesses.push({ title: 'Open Non-Conformances', description: `${activeCars.length} Corrective Action Requests (CARs) are currently outstanding.`, tag: '[Audit Gap]', priority: 'High', category: 'Audit' });
    } else if (safeCars.length > 0) {
        strengths.push({ title: 'Audit Responsiveness', description: 'Unit has successfully closed all identified Corrective Action Requests.', tag: '[CAR Closure]', category: 'Audit' });
    }

    const ncFindings = safeFindings.filter(f => f.type === 'Non-Conformance').length;
    if (ncFindings > 3) {
        weaknesses.push({ title: 'Systemic Non-Compliance', description: `High volume of Non-Conformance findings (${ncFindings}) detected in recent audits.`, tag: '[Risk Alert]', priority: 'High', category: 'Audit' });
    }

    // --- 6. GOVERNANCE & DECISION IMPLEMENTATION (MR) ---
    const overdueDecisions = safeMrOutputs.filter(o => o.status === 'Open' || o.status === 'On-going').length;
    if (overdueDecisions > 2) {
        weaknesses.push({ title: 'Implementation Delay', description: `${overdueDecisions} Management Review decisions are pending unit-level action.`, tag: '[MR Backlog]', priority: 'Medium', category: 'Governance' });
    } else if (safeMrOutputs.length > 0 && overdueDecisions === 0) {
        strengths.push({ title: 'Governance Alignment', description: '100% implementation of actionable decisions from top management reviews.', tag: '[MR Closure]', category: 'Governance' });
    }

    return { strengths, weaknesses };
  }, [submissions, risks, monitoringRecords, programCompliances, auditFindings, correctiveActionRequests, mrOutputs, scope, selectedYear]);

  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden bg-background">
      <CardHeader className="bg-muted/30 border-b py-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Comprehensive Strategic SWOT: {name}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Cross-module performance derivation for AY {selectedYear}.</CardDescription>
            </div>
            <Badge variant="outline" className="h-6 px-3 bg-white font-black text-[10px] uppercase">
                {scope === 'unit' ? 'FULL PERFORMANCE PROFILE' : 'SITE CONSOLIDATED AUDIT'}
            </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border-b">
            {/* STRENGTHS */}
            <div className="flex flex-col">
                <div className="bg-emerald-50 px-6 py-2 border-b flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Institutional Strengths</span>
                </div>
                <div className="p-6 space-y-4">
                    {analysis.strengths.length > 0 ? (
                        analysis.strengths.map((item, idx) => (
                            <div key={idx} className="space-y-1.5 group">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {item.category === 'Academic' && <Award className="h-3 w-3 text-emerald-600" />}
                                        {item.category === 'Audit' && <ClipboardCheck className="h-3 w-3 text-emerald-600" />}
                                        {item.category === 'Risk' && <ShieldCheck className="h-3 w-3 text-emerald-600" />}
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{item.title}</span>
                                    </div>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{item.description}"</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] text-muted-foreground italic opacity-50 py-10 text-center">Calibrating institutional strengths...</p>
                    )}
                </div>
            </div>

            {/* WEAKNESSES / PRIORITY AREAS */}
            <div className="flex flex-col">
                <div className="bg-rose-50 px-6 py-2 border-b flex items-center gap-2">
                    <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Priority Areas for Improvement</span>
                </div>
                <div className="p-6 space-y-4">
                    {analysis.weaknesses.length > 0 ? (
                        analysis.weaknesses.map((item, idx) => (
                            <div key={idx} className="space-y-1.5 group">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        {item.category === 'Academic' && <School className="h-3 w-3 text-rose-600" />}
                                        {item.category === 'Audit' && <AlertTriangle className="h-3 w-3 text-rose-600" />}
                                        {item.category === 'Governance' && <Gavel className="h-3 w-3 text-rose-600" />}
                                        <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{item.title}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {item.priority === 'High' && <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Critical</Badge>}
                                        <Badge className="bg-rose-100 text-rose-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{item.description}"</p>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 flex flex-col items-center justify-center opacity-20">
                            <ShieldCheck className="h-8 w-8 text-emerald-600" />
                            <p className="text-[10px] font-black uppercase mt-2">No Gaps Detected</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/5 py-3 px-6">
          <div className="flex items-start gap-3">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div className="space-y-1">
                  <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                      <strong>Institutional Intelligence:</strong> This SWOT analysis is a cross-module derivation based on verified evidence logs, regulatory compliance (CHED), and audit outcomes. It represents the objective quality posture of {name} for the Academic Year {selectedYear}.
                  </p>
              </div>
          </div>
      </CardFooter>
    </Card>
  );
}
