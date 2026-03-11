
'use client';

import { useMemo } from 'react';
import type { ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
    PieChart, 
    Pie, 
    Cell, 
    ResponsiveContainer, 
    Tooltip, 
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Users, GraduationCap, UserCircle, School, Info, Activity, PieChart as PieIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SDDHubProps {
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))'];

export function SDDHub({ compliances, campuses, units, selectedYear }: SDDHubProps) {
  const aggregatedData = useMemo(() => {
    let totalMaleEnrolled = 0;
    let totalFemaleEnrolled = 0;
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;

    const uniqueFacultySet = new Set<string>();

    compliances.forEach(record => {
        // SDD: Enrollment
        const s1 = record.stats?.enrollment?.firstSemester;
        if (s1) {
            ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                totalMaleEnrolled += Number(s1[lvl]?.male || 0);
                totalFemaleEnrolled += Number(s1[lvl]?.female || 0);
            });
        }

        // SDD: Faculty (Deduplicated)
        if (record.faculty) {
            const roster = [...(record.faculty.members || [])];
            if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
            if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
            
            roster.forEach(m => {
                if (!m.name) return;
                const key = `${m.name.trim()}-${record.campusId}`.toLowerCase();
                if (!uniqueFacultySet.has(key)) {
                    uniqueFacultySet.add(key);
                    if (m.sex === 'Male') totalMaleFaculty++;
                    else if (m.sex === 'Female') totalFemaleFaculty++;
                }
            });
        }

        // SDD: Graduation
        record.graduationRecords?.forEach(grad => {
            totalMaleGrads += Number(grad.maleCount || 0);
            totalFemaleGrads += Number(grad.femaleCount || 0);
        });
    });

    const createPieData = (m: number, f: number) => [
        { name: 'Male', value: m, fill: COLORS[0] },
        { name: 'Female', value: f, fill: COLORS[1] }
    ].filter(d => d.value > 0);

    return {
        enrollment: createPieData(totalMaleEnrolled, totalFemaleEnrolled),
        faculty: createPieData(totalMaleFaculty, totalFemaleFaculty),
        graduation: createPieData(totalMaleGrads, totalFemaleGrads),
        totals: {
            students: totalMaleEnrolled + totalFemaleEnrolled,
            faculty: totalMaleFaculty + totalFemaleFaculty,
            grads: totalMaleGrads + totalFemaleGrads
        }
    };
  }, [compliances]);

  const renderLabel = ({ percent }: any) => `${(percent * 100).toFixed(0)}%`;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="py-4">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Info className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">PCW Compliance Standard</span>
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Sex-Disaggregated Data (SDD) Hub</CardTitle>
            <CardDescription className="text-xs">Consolidated headcount analysis derived from verified academic monitoring records for AY {selectedYear}.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
            { title: 'Student Population', data: aggregatedData.enrollment, total: aggregatedData.totals.students, icon: <Users className="h-5 w-5 text-primary" />, desc: 'Disaggregated Enrollment' },
            { title: 'Personnel Distribution', data: aggregatedData.faculty, total: aggregatedData.totals.faculty, icon: <UserCircle className="h-5 w-5 text-emerald-600" />, desc: 'System Registered User' },
            { title: 'Graduation Output', data: aggregatedData.graduation, total: aggregatedData.totals.grads, icon: <GraduationCap className="h-5 w-5 text-purple-600" />, desc: 'Degree Completion Audit' }
        ].map((hub, i) => (
            <Card key={i} className="shadow-lg flex flex-col border-primary/10 overflow-hidden group hover:shadow-xl transition-all h-[400px]">
                <CardHeader className="p-4 bg-muted/10 border-b shrink-0 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">{hub.icon}</div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest leading-tight">{hub.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col items-center justify-center overflow-hidden">
                    {hub.data.length > 0 ? (
                        <div className="w-full h-full flex flex-col items-center">
                            <ChartContainer config={{}} className="h-[200px] w-full">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie 
                                            data={hub.data} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={50} 
                                            outerRadius={75} 
                                            paddingAngle={5} 
                                            dataKey="value" 
                                            label={renderLabel}
                                            labelLine={false}
                                        >
                                            {hub.data.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="mt-4 text-center">
                                <p className="text-3xl font-black text-slate-800 tabular-nums">{hub.total.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{hub.desc}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center opacity-20 space-y-3">
                            <PieIcon className="h-12 w-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">NO DATA YET!</p>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="bg-muted/5 border-t py-3 px-6 shrink-0">
                    <p className="text-[9px] text-muted-foreground italic leading-tight text-center">Source: Verified Program Monitoring AY {selectedYear}</p>
                </CardFooter>
            </Card>
        ))}
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="bg-muted/10 border-b">
            <div className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional SDD Guidelines</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="p-6 flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2">
                <p className="text-sm text-slate-700 leading-relaxed">
                    Sex-disaggregated data is more than a headcount; it is the <strong>baseline for gender-responsive planning</strong>. The university uses these metrics to identify gender gaps in enrollment, degree choice, and faculty leadership roles.
                </p>
                <p className="text-xs text-muted-foreground italic">
                    Note: SDD data shown here is aggregated from <strong>Approved</strong> compliance records. Units with pending records may not be reflected in the current totals.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
