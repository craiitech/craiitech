'use client';

import { useMemo } from 'react';
import type { Submission, Unit, Risk, UnitMonitoringRecord } from '@/lib/types';
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
    Clock, 
    FileWarning, 
    Zap,
    Info,
    ArrowUpRight,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { TOTAL_REPORTS_PER_CYCLE } from '@/app/(dashboard)/dashboard/page';

interface StrategicSwotAnalysisProps {
  submissions: Submission[];
  risks: Risk[];
  monitoringRecords: UnitMonitoringRecord[];
  scope: 'unit' | 'campus';
  name: string;
  selectedYear: number;
}

type SWOTItem = {
    title: string;
    description: string;
    tag: string;
    priority?: 'High' | 'Medium' | 'Low';
};

export function StrategicSwotAnalysis({ submissions, risks, monitoringRecords, scope, name, selectedYear }: StrategicSwotAnalysisProps) {
  
  const analysis = useMemo(() => {
    const strengths: SWOTItem[] = [];
    const weaknesses: SWOTItem[] = [];

    const yearSubmissions = submissions.filter(s => s.year === selectedYear);
    const yearRisks = risks.filter(r => r.year === selectedYear);
    const yearMonitoring = monitoringRecords.filter(r => {
        const d = r.visitDate?.toDate ? r.visitDate.toDate() : new Date(r.visitDate);
        return d.getFullYear() === selectedYear;
    });

    // --- 1. DOCUMENTATION LOGIC ---
    const approvedCount = new Set(yearSubmissions.filter(s => s.statusId === 'approved').map(s => `${s.reportType}-${s.cycleId}`)).size;
    const totalRequired = scope === 'unit' ? TOTAL_REPORTS_PER_CYCLE * 2 : 0; // Simplified

    if (scope === 'unit') {
        if (approvedCount >= 10) {
            strengths.push({ title: 'Approved Registry Maturity', description: 'Unit has achieved high-density approval of mandatory EOMS documentation.', tag: '[ISO 7.5.3]' });
        }
        if (yearSubmissions.some(s => s.statusId === 'rejected')) {
            weaknesses.push({ title: 'Review Backlog', description: 'Evidence logs have been rejected by ODIMO and require corrective resubmission.', tag: '[Process Correction]', priority: 'High' });
        }
        const missingCount = (TOTAL_REPORTS_PER_CYCLE * 2) - approvedCount;
        if (missingCount > 4) {
            weaknesses.push({ title: 'Documentation Gaps', description: `Significant documentation gaps detected (${missingCount} items missing/unapproved).`, tag: '[EOMS Gap]', priority: 'High' });
        }
    }

    // --- 2. MONITORING LOGIC ---
    if (yearMonitoring.length > 0) {
        const latest = [...yearMonitoring].sort((a,b) => b.visitDate.toMillis() - a.visitDate.toMillis())[0];
        const applicable = latest.observations.filter(o => o.status !== 'Not Applicable');
        const available = applicable.filter(o => o.status === 'Available');
        const score = applicable.length > 0 ? (available.length / applicable.length) * 100 : 0;

        if (score >= 90) {
            strengths.push({ title: 'Operational Excellence', description: 'Latest on-site monitoring demonstrates superior physical and documentary compliance.', tag: '[Field Verify]' });
        } else if (score < 70) {
            weaknesses.push({ title: 'Non-Conformance Risk', description: `Monitoring score (${Math.round(score)}%) is below the institutional 70% threshold.`, tag: '[Standard Breach]', priority: 'High' });
        }
    }

    // --- 3. RISK LOGIC ---
    if (yearRisks.length > 0) {
        const highRisks = yearRisks.filter(r => r.type === 'Risk' && r.preTreatment.rating === 'High' && r.status !== 'Closed');
        const closureRate = Math.round((yearRisks.filter(r => r.status === 'Closed').length / yearRisks.length) * 100);

        if (closureRate >= 80) {
            strengths.push({ title: 'Risk Resilience', description: 'Unit demonstrates high velocity in mitigating and closing identified risks.', tag: '[Risk Control]' });
        }
        if (highRisks.length > 0) {
            weaknesses.push({ title: 'Strategic Vulnerability', description: `${highRisks.length} High-magnitude risks remain open without verified treatment closure.`, tag: '[Priority 1]', priority: 'High' });
        }
    }

    // --- 4. CAMPUS SPECIFIC LOGIC ---
    if (scope === 'campus') {
        const avgScore = 0; // Calculated by parent if needed
        if (approvedCount > 50) { // Arbitrary for example
            strengths.push({ title: 'Site-Wide Maturity', description: 'Campus units show consistent documentation parity across all sectors.', tag: '[Campus Parity]' });
        }
    }

    return { strengths, weaknesses };
  }, [submissions, risks, monitoringRecords, scope, selectedYear]);

  return (
    <Card className="shadow-lg border-primary/10 overflow-hidden bg-background">
      <CardHeader className="bg-muted/30 border-b py-4">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Strategic Institutional SWOT: {name}
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Logic-driven quality health check for AY {selectedYear}.</CardDescription>
            </div>
            <Badge variant="outline" className="h-6 px-3 bg-white font-black text-[10px] uppercase">
                {scope === 'unit' ? 'UNIT PROFILE' : 'CAMPUS CONSOLIDATED'}
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
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{item.title}</span>
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed italic">"{item.description}"</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-[10px] text-muted-foreground italic opacity-50 py-10 text-center">Identifying baseline strengths...</p>
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
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{item.title}</span>
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
              <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  <strong>Strategic Note:</strong> This SWOT analysis is automatically derived from portal evidence logs (ISO 21001 Clause 4.1). Use these indicators during <strong>Management Review (MR)</strong> to align unit operations with institutional quality targets.
              </p>
          </div>
      </CardFooter>
    </Card>
  );
}
