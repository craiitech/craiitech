
'use client';

import { useMemo } from 'react';
import type { GADInitiative, ProgramComplianceRecord } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle2, HandHeart, Target, Landmark, Info, Activity } from 'lucide-react';

interface GADOverviewProps {
  initiatives: GADInitiative[];
  compliances: ProgramComplianceRecord[];
  selectedYear: number;
  unitName?: string;
}

export function GADOverview({ initiatives, compliances, selectedYear, unitName }: GADOverviewProps) {
  const stats = useMemo(() => {
    const totalBudget = initiatives.reduce((acc, i) => acc + (i.budget || 0), 0);
    const totalUtilized = initiatives.reduce((acc, i) => acc + (i.utilizedAmount || 0), 0);
    const utilizationRate = totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0;

    const completed = initiatives.filter(i => i.status === 'Completed').length;
    const completionRate = initiatives.length > 0 ? Math.round((completed / initiatives.length) * 100) : 0;

    const maleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesMale || 0), 0);
    const femaleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesFemale || 0), 0);

    return { totalBudget, totalUtilized, utilizationRate, completionRate, completed, total: initiatives.length, maleBen, femaleBen };
  }, [initiatives]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/10 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Landmark className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Budget Registry</CardDescription>
                <CardTitle className="text-2xl font-black text-primary tabular-nums">₱{stats.totalBudget.toLocaleString()}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Allocated for FY {selectedYear}</p>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-emerald-50/10 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Activity className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Utilization Rate</CardDescription>
                <CardTitle className="text-2xl font-black text-emerald-600 tabular-nums">{stats.utilizationRate}%</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <Progress value={stats.utilizationRate} className="h-1 bg-emerald-100" />
                <p className="text-[9px] font-bold text-emerald-600 mt-2 uppercase">Actual Utilization: ₱{stats.totalUtilized.toLocaleString()}</p>
            </CardContent>
            <div className="p-3 bg-green-100/20 border-t mt-auto">
                <p className="text-[9px] text-green-800/60 italic leading-tight">
                    Percentage of the unit's allocated GAD budget used.
                </p>
            </div>
        </Card>

        <Card className="shadow-sm border-blue-100 bg-blue-50/10 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-blue-700">Target Fulfillment</CardDescription>
                <CardTitle className="text-2xl font-black text-blue-600 tabular-nums">{stats.completionRate}%</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-[10px] font-bold text-blue-800/60 uppercase tracking-tight">{stats.completed} of {stats.total} Projects Closed</p>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-purple-100 bg-purple-50/10 flex flex-col relative overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-purple-700">Unit Reach Distribution</CardDescription>
                <CardTitle className="text-2xl font-black text-purple-600 tabular-nums">{stats.maleBen + stats.femaleBen}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-[10px] font-bold text-purple-800/60 uppercase tracking-tight">M: {stats.maleBen} | F: {stats.femaleBen} Beneficiaries</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">GAD Mainstreaming Context: {unitName}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/20 border border-dashed">
                    <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h4 className="font-black text-slate-900 uppercase text-sm">Institutional Commitment: The 5% Mandate</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Following the guidelines of the <strong>Philippine Commission on Women (PCW)</strong>, each unit at Romblon State University is tasked with integrating gender-responsive planning into its operations. This unit-level dashboard tracks the local planning, execution, and disaggregated impact of GAD-aligned projects.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-1">Unit GAD Responsibilities</h5>
                        <ul className="space-y-3">
                            {[
                                { title: 'Local SDD Maintenance', desc: 'Accurate headcount of students and faculty by sex.' },
                                { title: 'Unit GPB Contribution', desc: 'Local roadmap for gender-responsive activities.' },
                                { title: 'Accomplishment Reporting', desc: 'Quarterly logs of utilized funds and reached targets.' }
                            ].map((p, i) => (
                                <li key={i} className="flex items-start gap-3 group">
                                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-slate-800">{p.title}</p>
                                        <p className="text-[10px] text-muted-foreground leading-tight">{p.desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-center items-center text-center">
                        <HandHeart className="h-12 w-12 text-indigo-600 mb-4 opacity-40" />
                        <p className="text-xs font-black text-indigo-900 uppercase mb-2">PCW Standard Alignment</p>
                        <p className="text-[10px] text-indigo-700 font-medium italic leading-relaxed">
                            "GAD integration is a unit-wide responsibility, ensuring institutional parity in quality and inclusivity."
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <Card className="shadow-lg border-amber-200 bg-amber-50/5 overflow-hidden">
            <CardHeader className="bg-amber-50 border-b py-4">
                <div className="flex items-center gap-2 text-amber-700">
                    <Target className="h-5 w-5" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Mainstreaming Maturity</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="flex flex-col items-center justify-center py-10 space-y-6">
                    <div className="relative h-40 w-40">
                        <svg className="h-full w-full" viewBox="0 0 100 100">
                            <circle className="text-slate-200 stroke-current" strokeWidth="8" fill="transparent" r="40" cx="50" cy="50" />
                            <circle className="text-amber-500 stroke-current" strokeWidth="8" strokeDasharray={`${stats.completionRate * 2.51} 251.2`} strokeLinecap="round" fill="transparent" r="40" cx="50" cy="50" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
                            <text x="50" y="55" fontFamily="sans-serif" fontWeight="900" fontSize="20" textAnchor="middle" fill="currentColor" className="text-amber-700">{stats.completionRate}%</text>
                        </svg>
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Initiative Completion Index</p>
                        <p className="text-xs font-bold text-amber-800">Unit FY {selectedYear} Accomplishment</p>
                    </div>
                </div>
                <div className="mt-6 p-4 rounded-xl bg-white border border-amber-100 flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-relaxed italic font-medium">
                        Units must update their <strong>Accomplishment Status</strong> monthly to maintain accurate institutional reporting.
                    </p>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
