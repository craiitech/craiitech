
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
    Legend
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
import { Users, GraduationCap, UserCircle, School, Info, Activity, PieChart as PieIcon, ShieldCheck, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SDDHubProps {
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  unitName?: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export function SDDHub({ compliances, campuses, units, selectedYear, unitName }: SDDHubProps) {
  const aggregatedData = useMemo(() => {
    let s1Male = 0, s1Female = 0;
    let s2Male = 0, s2Female = 0;
    let smMale = 0, smFemale = 0;
    
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalOthersFaculty = 0;

    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;

    const uniqueFacultySet = new Set<string>();

    compliances.forEach(record => {
        const enrollmentRecords = record.enrollmentRecords || [];
        const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
        
        if (enrollmentRecords.length > 0) {
            enrollmentRecords.forEach(rec => {
                levels.forEach(level => {
                    s1Male += Number(rec.firstSemester?.[level]?.male || 0);
                    s1Female += Number(rec.firstSemester?.[level]?.female || 0);
                    s2Male += Number(rec.secondSemester?.[level]?.male || 0);
                    s2Female += Number(rec.secondSemester?.[level]?.female || 0);
                    smMale += Number(rec.midYearTerm?.[level]?.male || 0);
                    smFemale += Number(rec.midYearTerm?.[level]?.female || 0);
                });
            });
        } else {
            // Legacy fallback
            const s1 = record.stats?.enrollment?.firstSemester;
            const s2 = record.stats?.enrollment?.secondSemester;
            const sm = record.stats?.enrollment?.midYearTerm;
            levels.forEach(level => {
                if (s1) { s1Male += Number(s1[level]?.male || 0); s1Female += Number(s1[level]?.female || 0); }
                if (s2) { s2Male += Number(s2[level]?.male || 0); s2Female += Number(s2[level]?.female || 0); }
                if (sm) { smMale += Number(sm[level]?.male || 0); smFemale += Number(sm[level]?.female || 0); }
            });
        }

        // SDD: Faculty (Deduplicated with Expanded Categories)
        if (record.faculty) {
            const roster = [...(record.faculty.members || [])];
            if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
            if (record.faculty.associateDean?.name && record.faculty.hasAssociateDean) roster.push(record.faculty.associateDean as any);
            if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
            
            roster.forEach(m => {
                if (!m.name || m.name.trim() === '') return;
                const key = `${m.name.trim()}-${record.campusId}`.toLowerCase();
                if (!uniqueFacultySet.has(key)) {
                    uniqueFacultySet.add(key);
                    if (m.sex === 'Male') totalMaleFaculty++;
                    else if (m.sex === 'Female') totalFemaleFaculty++;
                    else totalOthersFaculty++;
                }
            });
        }

        // SDD: Graduation
        record.graduationRecords?.forEach(grad => {
            totalMaleGrads += Number(grad.maleCount || 0);
            totalFemaleGrads += Number(grad.femaleCount || 0);
        });
    });

    const createPieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: COLORS[0] },
        { name: 'Female', value: f, fill: COLORS[1] },
        { name: 'Others (LGBTQI++)', value: o, fill: COLORS[2] }
    ].filter(d => d.value > 0);

    return {
        s1: createPieData(s1Male, s1Female),
        s2: createPieData(s2Male, s2Female),
        sm: createPieData(smMale, smFemale),
        faculty: createPieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty),
        graduation: createPieData(totalMaleGrads, totalFemaleGrads),
        totals: {
            s1: s1Male + s1Female,
            s2: s2Male + s2Female,
            sm: smMale + smFemale,
            faculty: totalMaleFaculty + totalFemaleFaculty + totalOthersFaculty,
            grads: totalMaleGrads + totalFemaleGrads
        }
    };
  }, [compliances]);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-primary/5 shadow-sm">
        <CardHeader className="py-4">
            <div className="flex items-center gap-2 text-primary mb-1">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest">Unit SDD Registry</span>
            </div>
            <CardTitle className="text-lg font-black uppercase tracking-tight">Sex-Disaggregated Data (SDD) Hub: {unitName}</CardTitle>
            <CardDescription className="text-xs">Consolidated headcount analysis derived from verified academic monitoring records for AY {selectedYear}.</CardDescription>
        </CardHeader>
      </Card>

      {/* Term-Specific Population Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
              { title: '1st Semester Population', data: aggregatedData.s1, total: aggregatedData.totals.s1, icon: <Users className="h-5 w-5 text-primary" />, desc: '1st Sem Total' },
              { title: '2nd Semester Population', data: aggregatedData.s2, total: aggregatedData.totals.s2, icon: <CalendarRange className="h-5 w-5 text-blue-600" />, desc: '2nd Sem Total' },
              { title: 'Summer Term Population', data: aggregatedData.sm, total: aggregatedData.totals.sm, icon: <Activity className="h-5 w-5 text-amber-600" />, desc: 'Summer Total' }
          ].map((term, i) => (
              <Card key={i} className="shadow-lg flex flex-col border-primary/10 overflow-hidden group hover:shadow-xl transition-all">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0 text-center">
                      <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">{term.icon}</div>
                      <CardTitle className="text-[10px] font-black uppercase tracking-widest leading-tight">{term.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex flex-col items-center">
                      {term.data.length > 0 ? (
                          <>
                            <ChartContainer config={{}} className="h-[180px] w-full mb-4">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={term.data} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                                            {term.data.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '15px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="text-center mt-2">
                                <p className="text-2xl font-black text-slate-800 tabular-nums">{term.total.toLocaleString()}</p>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{term.desc}</p>
                            </div>
                          </>
                      ) : (
                          <div className="flex flex-col items-center justify-center text-center flex-1 opacity-20 py-10 space-y-3">
                              <PieIcon className="h-10 w-10" />
                              <p className="text-[9px] font-black uppercase tracking-widest">No Data Recorded</p>
                          </div>
                      )}
                  </CardContent>
              </Card>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
            { title: 'Faculty & Personnel Distribution', data: aggregatedData.faculty, total: aggregatedData.totals.faculty, icon: <UserCircle className="h-5 w-5 text-emerald-600" />, desc: 'Institutional Staffing Pool' },
            { title: 'Graduation Statistics', data: aggregatedData.graduation, total: aggregatedData.totals.grads, icon: <GraduationCap className="h-5 w-5 text-purple-600" />, desc: 'Degree Completion Rate' }
        ].map((hub, i) => (
            <Card key={i} className="shadow-lg flex flex-col border-primary/10 overflow-hidden group hover:shadow-xl transition-all">
                <CardHeader className="p-4 bg-muted/10 border-b shrink-0 text-center">
                    <div className="mx-auto h-10 w-10 rounded-full bg-white flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">{hub.icon}</div>
                    <CardTitle className="text-xs font-black uppercase tracking-widest leading-tight">{hub.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 flex-1 flex flex-col items-center overflow-hidden">
                    {hub.data.length > 0 ? (
                        <div className="w-full flex-1 flex flex-col items-center">
                            <ChartContainer config={{}} className="h-[220px] w-full mb-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={hub.data} 
                                            cx="50%" 
                                            cy="50%" 
                                            innerRadius={50} 
                                            outerRadius={80} 
                                            paddingAngle={5} 
                                            dataKey="value" 
                                            label={renderLabel}
                                            labelLine={false}
                                        >
                                            {hub.data.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip content={<ChartTooltipContent hideLabel />} />
                                        <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                            <div className="text-center mt-2">
                                <p className="text-3xl font-black text-slate-800 tabular-nums">{hub.total.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{hub.desc}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center flex-1 opacity-20 py-20 space-y-3">
                            <PieIcon className="h-12 w-12" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No Data for this Unit</p>
                        </div>
                    )}
                </CardContent>
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
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    Unit-specific SDD is vital for identifying localized gender gaps. Ensure your <strong>Program Compliance Records</strong> are updated quarterly to maintain accurate institutional analytics. This data directly feeds into the university's Gender and Development Plan and Budget (GPB).
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
