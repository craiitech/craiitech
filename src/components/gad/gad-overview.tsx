
'use client';

import { useMemo } from 'react';
import type { GADInitiative, ProgramComplianceRecord, GADSector } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ShieldCheck, CheckCircle2, HandHeart, Target, Landmark, Info, Activity, Users, PieChart as PieIcon, Calculator } from 'lucide-react';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip, 
    Legend, 
    ResponsiveContainer,
    Cell,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';

interface GADOverviewProps {
  initiatives: GADInitiative[];
  compliances: ProgramComplianceRecord[];
  selectedYear: number;
  unitName?: string;
}

const GAD_SECTORS: GADSector[] = ['Solo Parent', 'PWD', 'Senior Citizen', 'Youth/Student', 'Employee', 'LGBTQA++', 'Indigenous People'];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export function GADOverview({ initiatives, compliances, selectedYear, unitName }: GADOverviewProps) {
  const stats = useMemo(() => {
    const totalBudget = initiatives.reduce((acc, i) => acc + (i.budget || 0), 0);
    const totalUtilized = initiatives.reduce((acc, i) => acc + (i.utilizedAmount || 0), 0);
    const utilizationRate = totalBudget > 0 ? Math.round((totalUtilized / totalBudget) * 100) : 0;

    const completed = initiatives.filter(i => i.status === 'Completed').length;
    const completionRate = initiatives.length > 0 ? Math.round((completed / initiatives.length) * 100) : 0;

    const maleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesMale || 0), 0);
    const femaleBen = initiatives.reduce((acc, i) => acc + (i.beneficiariesFemale || 0), 0);

    const sectoralStats: Record<string, { male: number, female: number }> = {};
    GAD_SECTORS.forEach(s => sectoralStats[s] = { male: 0, female: 0 });

    compliances.forEach(rec => {
        rec.enrollmentRecords?.forEach(enroll => {
            const term = enroll.firstSemester; 
            if (term) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach(level => {
                    const lData = (term as any)[level];
                    if (lData?.sectors) {
                        Object.entries(lData.sectors).forEach(([sec, counts]: any) => {
                            if (sectoralStats[sec]) {
                                sectoralStats[sec].male += Number(counts.male || 0);
                                sectoralStats[sec].female += Number(counts.female || 0);
                            }
                        });
                    }
                });
            }
        });
    });

    const sectoralChartData = Object.entries(sectoralStats).map(([name, counts]) => ({
        name,
        total: counts.male + counts.female,
        male: counts.male,
        female: counts.female
    })).filter(d => d.total > 0).sort((a,b) => b.total - a.total);

    return { totalBudget, totalUtilized, utilizationRate, completionRate, completed, total: initiatives.length, maleBen, femaleBen, sectoralChartData };
  }, [initiatives, compliances]);

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

        {/* NEW: GAD 5% Budget Mandate Thermometer */}
        <Card className="shadow-sm border-indigo-100 bg-indigo-50/10 flex flex-col relative overflow-hidden">
            <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase text-indigo-700">Fiscal Mandate Track</CardDescription>
                <CardTitle className="text-2xl font-black text-indigo-600">5% Target</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-indigo-800/60">
                        <span>Fulfillment</span>
                        <span>{stats.utilizationRate}%</span>
                    </div>
                    <Progress value={stats.utilizationRate} className="h-2 bg-indigo-100" />
                    <div className="flex items-center gap-1.5 pt-1">
                        <Calculator className="h-3 w-3 text-indigo-400" />
                        <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Based on institutional appropriations</span>
                    </div>
                </div>
            </CardContent>
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
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-purple-700">Project Reach</CardDescription>
                <CardTitle className="text-2xl font-black text-purple-600 tabular-nums">{stats.maleBen + stats.femaleBen}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-[10px] font-bold text-purple-800/60 uppercase tracking-tight">M: {stats.maleBen} | F: {stats.femaleBen} Beneficiaries</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden flex flex-col h-full bg-white">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Sectoral Distribution Analysis</CardTitle>
                </div>
                <CardDescription className="text-xs">Consolidated reach across marginalized groups for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 flex-1">
                {stats.sectoralChartData.length > 0 ? (
                    <ChartContainer config={{}} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={stats.sectoralChartData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 900 }} width={140} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="male" stackId="a" fill="hsl(var(--chart-1))" />
                                <Bar dataKey="female" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                                    <LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 opacity-20 py-10">
                        <PieIcon className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">Zero Sectoral Hits Recorded</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-3">
                <div className="flex items-start gap-3">
                    <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                        <strong>Strategic Guide:</strong> This data aggregates student enrollment and employee census sectoral tags. It identifies groups that are under-represented or receiving high institutional support.
                    </p>
                </div>
            </CardFooter>
        </Card>

        <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5 border-b py-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Mainstreaming Context: {unitName}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="flex items-start gap-4 p-6 rounded-2xl bg-muted/20 border border-dashed">
                    <Info className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div className="space-y-2">
                        <h4 className="font-black text-slate-900 dark:text-slate-100 uppercase text-sm">Institutional Commitment: The 5% Mandate</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Following PCW guidelines, RSU integrates gender-responsive planning across all units. This dashboard tracks the planning, execution, and disaggregated impact of GAD-aligned projects.
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-1">Unit GAD Responsibilities</h5>
                    <ul className="space-y-3">
                        {[
                            { title: 'Local SDD Maintenance', desc: 'Accurate headcount of students and faculty by sex and sector.' },
                            { title: 'Personnel Census', desc: 'Maintain current office employee sex-disaggregated data.' },
                            { title: 'Accomplishment Reporting', desc: 'Quarterly logs of utilized funds and reached targets.' }
                        ].map((p, i) => (
                            <li key={i} className="flex items-start gap-3 group">
                                <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition-colors">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{p.title}</p>
                                    <p className="text-[9px] text-muted-foreground leading-tight">{p.desc}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
