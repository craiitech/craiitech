
'use client';

import { useMemo } from 'react';
import type { AuditPlan, AuditSchedule, AuditFinding, ISOClause, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    Cell,
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { 
    Trophy, 
    AlertTriangle, 
    CheckCircle2, 
    Activity, 
    ShieldCheck, 
    Target, 
    Zap, 
    Info, 
    BarChart3,
    ClipboardCheck,
    Search,
    UserCheck,
    TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AuditAnalyticsProps {
  plans: AuditPlan[];
  schedules: AuditSchedule[];
  findings: AuditFinding[];
  isoClauses: ISOClause[];
  units: Unit[];
  campuses: Campus[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = {
    Compliance: 'hsl(142 71% 45%)',
    OFI: 'hsl(48 96% 53%)',
    NC: 'hsl(var(--destructive))',
};

export function AuditAnalytics({ plans, schedules, findings, isoClauses, units, campuses, isLoading, selectedYear }: AuditAnalyticsProps) {
  
  const analytics = useMemo(() => {
    if (!schedules.length || !findings.length) return null;

    const yearPlans = plans.filter(p => p.year === selectedYear);
    const planIds = new Set(yearPlans.map(p => p.id));
    const yearSchedules = schedules.filter(s => planIds.has(s.auditPlanId));
    const scheduleIds = new Set(yearSchedules.map(s => s.id));
    const yearFindings = findings.filter(f => scheduleIds.has(f.auditScheduleId));

    if (yearFindings.length === 0) return null;

    // 1. Findings Distribution (Pie)
    const counts = { Compliance: 0, OFI: 0, NC: 0 };
    yearFindings.forEach(f => {
        if (f.type === 'Compliance') counts.Compliance++;
        else if (f.type === 'Observation for Improvement') counts.OFI++;
        else if (f.type === 'Non-Conformance') counts.NC++;
    });
    const findingsData = [
        { name: 'Compliance', value: counts.Compliance, fill: COLORS.Compliance },
        { name: 'OFI', value: counts.OFI, fill: COLORS.OFI },
        { name: 'Non-Conformance', value: counts.NC, fill: COLORS.NC },
    ].filter(d => d.value > 0);

    // 2. Clause Coverage (Bar)
    const clauseStats: Record<string, number> = {};
    yearFindings.forEach(f => {
        clauseStats[f.isoClause] = (clauseStats[f.isoClause] || 0) + 1;
    });
    const clauseData = Object.entries(clauseStats)
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    // 3. Unit Performance & Strengths
    const unitMap = new Map(units.map(u => [u.id, u.name]));
    const unitResults: Record<string, { total: number, nc: number, score: number }> = {};
    
    yearSchedules.forEach(s => {
        const unitFindings = yearFindings.filter(f => f.auditScheduleId === s.id);
        if (unitFindings.length === 0) return;

        const c = unitFindings.filter(f => f.type === 'Compliance').length;
        const total = unitFindings.length;
        const nc = unitFindings.filter(f => f.type === 'Non-Conformance').length;
        
        if (!unitResults[s.targetId]) {
            unitResults[s.targetId] = { total: 0, nc: 0, score: 0 };
        }
        unitResults[s.targetId].total += total;
        unitResults[s.targetId].nc += nc;
        unitResults[s.targetId].score = Math.round((c / (total || 1)) * 100);
    });

    const strengths = Object.entries(unitResults)
        .filter(([_, data]) => data.score >= 90)
        .map(([id, data]) => ({
            name: unitMap.get(id) || 'Unknown Unit',
            score: data.score,
            nc: data.nc
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const hotspots = Object.entries(unitResults)
        .filter(([_, data]) => data.nc > 0)
        .map(([id, data]) => ({
            name: unitMap.get(id) || 'Unknown Unit',
            nc: data.nc
        }))
        .sort((a, b) => b.nc - a.nc);

    return { totalFindings: yearFindings.length, counts, findingsData, clauseData, strengths, hotspots };
  }, [plans, schedules, findings, units, selectedYear]);

  if (isLoading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
            <Skeleton className="h-[400px] col-span-full rounded-2xl" />
        </div>
    );
  }

  if (!analytics) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed rounded-3xl bg-muted/5 opacity-40">
            <BarChart3 className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-black uppercase tracking-widest">Analytics Context Pending</h3>
            <p className="text-sm max-w-xs mt-2">Conduct and finalize audits for AY {selectedYear} to activate visual decision support.</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Evidence Logged</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-primary tabular-nums">{analytics.totalFindings}</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Standard Clauses Verified</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><ClipboardCheck className="h-12 w-12" /></div>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">Standard Compliances (C)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.counts.Compliance}</div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase">Positive conformance logs</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><CheckCircle2 className="h-12 w-12 text-emerald-600" /></div>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Improvement Areas (OFI)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics.counts.OFI}</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Opportunities for growth</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingUp className="h-12 w-12 text-amber-600" /></div>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-700">Non-Conformances (NC)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-rose-600 tabular-nums">{analytics.counts.NC}</div>
                <p className="text-[9px] font-bold text-rose-600/70 mt-1 uppercase">Standard gaps identified</p>
            </CardContent>
            <div className="absolute top-0 right-0 p-3 opacity-5"><ShieldAlert className="h-12 w-12 text-rose-600" /></div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. FINDINGS DISTRIBUTION CHART */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Standard Verification Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of audit findings across the university for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1 flex flex-col items-center justify-center">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                            <Pie 
                                data={analytics.findingsData} 
                                cx="50%" 
                                cy="50%" 
                                innerRadius={60} 
                                outerRadius={90} 
                                paddingAngle={5} 
                                dataKey="value"
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            >
                                {analytics.findingsData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                            </Pie>
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/5 border-t">
                <div className="flex items-start gap-3">
                    <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic font-medium">
                        <strong>Strategic Guideline:</strong> A higher "Compliance" percentage indicates institutional stability. OFIs and NCs provide the "Pulse" for the Continual Improvement cycle mandated by ISO 21001 Clause 10.2.
                    </p>
                </div>
            </div>
        </Card>

        {/* 3. CLAUSE COVERAGE CHART */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Clause Audit Density</CardTitle>
                </div>
                <CardDescription className="text-xs">Top 10 standard requirements prioritized in recent Evidence Logs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.clauseData} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="id" type="category" tick={{ fontSize: 10, fontWeight: 900 }} width={40} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={14}>
                                <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <div className="p-4 bg-muted/5 border-t">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed italic font-medium">
                        <strong>Auditor Focus:</strong> This chart highlights which ISO clauses are receiving the most scrutiny. High density in specific clauses (e.g., 7.5 or 8.5) signifies institutional focus on those operational pillars.
                    </p>
                </div>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. AUDIT STRENGTHS (TOP PERFORMERS) */}
        <Card className="shadow-md border-emerald-100 bg-emerald-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-emerald-50 border-b py-4">
                <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-emerald-800">Unit Quality Exemplars</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold text-emerald-700/70 uppercase">Units demonstrating 90%+ compliance in recent Evidence Logs.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="space-y-3">
                    {analytics.strengths.length > 0 ? (
                        analytics.strengths.map((unit, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-100 shadow-sm transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-xs">{idx + 1}</div>
                                    <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[180px]">{unit.name}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="h-5 border-emerald-200 text-emerald-700 font-black text-[10px]">{unit.score}% COMPLIANCE</Badge>
                                    {unit.nc === 0 && <Badge className="bg-emerald-600 text-white border-none h-5 text-[8px] font-black uppercase">ZERO NC</Badge>}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center opacity-30 italic text-xs">Awaiting verified high-performance records.</div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* 5. AUDIT HOTSPOTS (UNITS WITH NCS) */}
        <Card className="shadow-md border-rose-100 bg-rose-50/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-rose-50 border-b py-4">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-rose-600" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight text-rose-800">Unit Finding Hotspots</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold text-rose-700/70 uppercase">Priority areas identified with outstanding Non-Conformances.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <div className="space-y-3">
                    {analytics.hotspots.length > 0 ? (
                        analytics.hotspots.map((unit, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-rose-100 shadow-sm transition-all hover:scale-[1.02]">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                                    <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[180px]">{unit.name}</span>
                                </div>
                                <Badge variant="destructive" className="h-5 font-black text-[10px] uppercase shadow-none">{unit.nc} OPEN NCs</Badge>
                            </div>
                        ))
                    ) : (
                        <div className="py-10 text-center flex flex-col items-center gap-2 opacity-30">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                            <p className="text-[10px] font-black uppercase">Zero Open Non-Conformances</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
