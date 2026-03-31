
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
    Award, 
    TrendingUp, 
    Activity, 
    School, 
    CheckCircle2,
    ShieldCheck,
    Info,
    LayoutGrid,
    Clock,
    BarChart3,
    Target,
    Zap,
    Users,
    ArrowUpDown,
    Trophy,
    FileText,
    ChevronRight,
    PieChart as PieIcon,
    Loader2,
    Check,
    X,
    PlusCircle,
    GraduationCap,
    HelpCircle,
    CalendarCheck,
    ShieldAlert
} from 'lucide-react';
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
    LabelList,
    PieChart,
    Pie
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

const ACCREDITATION_LEVELS_ORDER = [
  "Level IV Re-accredited",
  "Level IV Accredited",
  "Level IV - Phase 2 Re-accredited",
  "Level IV - Phase 2 Accredited",
  "Level IV - Phase 1 Re-accredited",
  "Level IV - Phase 1 Accredited",
  "Level III Re-accredited",
  "Level III Accredited",
  "Level III - Phase 2 Re-accredited",
  "Level III - Phase 2 Accredited",
  "Level III - Phase 1 Re-accredited",
  "Level III - Phase 1 Accredited",
  "Level II Re-accredited",
  "Level II Accredited",
  "Level I Re-accredited",
  "Level I Accredited",
  "Preliminary Survey Visit (PSV)",
  "AWAITING RESULT",
  "Not Yet Subject"
];

const chartConfig = {
    Undergraduate: { label: 'Undergraduate', color: 'hsl(var(--chart-1))' },
    Graduate: { label: 'Graduate', color: 'hsl(var(--chart-2))' },
    Inactive: { label: 'Closed Programs', color: 'hsl(var(--muted-foreground))' },
    Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
    Female: { label: 'Female', color: 'hsl(var(--chart-2))' },
    Others: { label: 'Others (LGBTQI++)', color: 'hsl(var(--chart-3))' }
};

type SortKey = 'name' | 'campus' | 'currentLevel' | 'validity' | 'status';

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const [roadmapSortConfig, setRoadmapSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'validity', direction: 'asc' });

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roadmapSortConfig.key === key && roadmapSortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setRoadmapSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => (
    <ArrowUpDown className={cn(
      "h-3 w-3 ml-1.5 transition-colors",
      roadmapSortConfig.key === key ? "text-primary opacity-100" : "opacity-20"
    )} />
  );

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const getProgramCategory = (p: AcademicProgram) => {
        if (!p.isActive) return 'Inactive';
        return p.level === 'Graduate' ? 'Graduate' : 'Undergraduate';
    };

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let activeCopc = 0;
    let monitoredCount = 0;

    let sem1Male = 0, sem1Female = 0;
    let sem2Male = 0, sem2Female = 0;
    let summerMale = 0, summerFemale = 0;
    let totalMaleFaculty = 0, totalFemaleFaculty = 0, totalOthersFaculty = 0;
    const uniqueFacultySet = new Set<string>();

    const copcByYear: Record<string, any> = {};
    const achievementByYear: Record<string, any> = {};
    const milestoneVelocity: Record<string, any> = {};
    const roadmapData: any[] = [];
    const currentYearNum = new Date().getFullYear();

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (p.isActive) activeCount++;
        else inactiveCount++;

        const record = compliances.find(c => 
            String(c.programId || '').toLowerCase().trim() === String(p.id || '').toLowerCase().trim()
        );
        
        if (record) monitoredCount++;

        const milestones = record?.accreditationRecords || [];
        const currentMilestone = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        
        const rawLevel = (currentMilestone?.level || 'Non Accredited').trim();
        const isAccredited = currentMilestone && 
                            rawLevel !== 'Non Accredited' && 
                            !rawLevel.includes('PSV') && 
                            rawLevel !== 'AWAITING RESULT';
        
        const hasCopc = record?.ched?.copcStatus === 'With COPC';

        if (p.isActive) {
            if (isAccredited) activeAccredited++;
            if (hasCopc) activeCopc++;
        }

        const validityStr = currentMilestone?.statusValidityDate || (p.isNewProgram ? 'NEW PROGRAM' : 'AWAITING RESULT');
        let status = 'AWAITING RESULT';
        if (p.isActive) {
            if (p.isNewProgram) status = 'NEW PROGRAM';
            else if (validityStr && validityStr !== 'AWAITING RESULT' && validityStr !== 'TBA') {
                const yearMatch = validityStr.match(/\d{4}/);
                const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                if (dYear > 0 && dYear < currentYearNum) status = 'OVERDUE';
                else if (dYear >= currentYearNum) status = 'COMPLIANT';
            }
            statusTotals[status as keyof typeof statusTotals]++;
        } else status = 'CLOSED';

        roadmapData.push({
            id: p.id,
            name: p.name,
            level: p.level,
            campus: campusMap.get(p.campusId) || '...',
            currentLevel: rawLevel || (p.isNewProgram ? 'Not Yet Subject' : 'AWAITING RESULT'),
            validity: p.isNewProgram ? 'NEW PROGRAM' : (validityStr === 'TBA' ? 'AWAITING RESULT' : validityStr),
            status,
            isActive: p.isActive
        });

        if (record) {
            const copcYear = record.ched?.copcAwardDate?.match(/\d{4}/)?.[0];
            if (copcYear) {
                if (!copcByYear[copcYear]) copcByYear[copcYear] = { year: copcYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
                copcByYear[copcYear][category]++;
                copcByYear[copcYear].total++;
            }

            milestones.forEach(m => {
                const surveyYear = m.dateOfSurvey?.match(/\d{4}/)?.[0];
                if (surveyYear) {
                    if (!achievementByYear[surveyYear]) achievementByYear[surveyYear] = { year: surveyYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
                    achievementByYear[surveyYear][category]++;
                    achievementByYear[surveyYear].total++;
                }
                const validityYear = m.statusValidityDate?.match(/\d{4}/)?.[0];
                if (validityYear) {
                    if (!milestoneVelocity[validityYear]) milestoneVelocity[validityYear] = { year: validityYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
                    milestoneVelocity[validityYear][category]++;
                    milestoneVelocity[validityYear].total++;
                }
            });

            const stats = record.stats?.enrollment;
            const sumTerm = (term: any) => {
                let m = 0, f = 0;
                if (!term) return { m, f };
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach(lvl => {
                    m += Number(term[lvl]?.male || 0);
                    f += Number(term[lvl]?.female || 0);
                });
                return { m, f };
            };

            const s1 = sumTerm(stats?.firstSemester);
            sem1Male += s1.m; sem1Female += s1.f;
            const s2 = sumTerm(stats?.secondSemester);
            sem2Male += s2.m; sem2Female += s2.f;
            const sSummer = sumTerm(stats?.midYearTerm);
            summerMale += sSummer.m; summerFemale += sSummer.f;

            if (record.faculty) {
                const roster = [...(record.faculty.members || [])];
                if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
                if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
                roster.forEach(m => {
                    if (!m.name || m.name.trim() === '') return;
                    const key = `${m.name.trim()}-${p.id}`.toLowerCase();
                    if (!uniqueFacultySet.has(key)) {
                        uniqueFacultySet.add(key);
                        if (m.sex === 'Male') totalMaleFaculty++;
                        else if (m.sex === 'Female') totalFemaleFaculty++;
                        else totalOthersFaculty++;
                    }
                });
            }
        }
    });

    const accreditationDataMap: Record<string, any> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => {
        accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
    });

    programs.forEach(p => {
        const cat = getProgramCategory(p);
        let lvlKey = 'AWAITING RESULT';
        if (p.isNewProgram) lvlKey = 'Not Yet Subject';
        else {
            const rec = compliances.find(c => String(c.programId || '').toLowerCase().trim() === String(p.id || '').toLowerCase().trim());
            const mil = rec?.accreditationRecords || [];
            const cur = mil.find(m => m.lifecycleStatus === 'Current') || mil[mil.length - 1];
            const rawLevel = (cur?.level || 'AWAITING RESULT').trim();
            lvlKey = rawLevel.includes('PSV') ? 'Preliminary Survey Visit (PSV)' : rawLevel;
        }
        if (accreditationDataMap[lvlKey]) { 
            accreditationDataMap[lvlKey][cat]++; 
            accreditationDataMap[lvlKey].total++; 
        }
    });

    const sortTimeline = (data: Record<string, any>) => Object.values(data).sort((a, b) => a.year.localeCompare(b.year));
    const makePieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: chartConfig.Male.color }, 
        { name: 'Female', value: f, fill: chartConfig.Female.color }, 
        { name: 'Others', value: o, fill: chartConfig.Others.color }
    ].filter(d => d.value > 0);

    return { 
        accreditationSummary: Object.values(accreditationDataMap).filter(d => d.total > 0),
        activeCount, 
        inactiveCount,
        activeAccredited, 
        activeCopc,
        statusTotals,
        copcMomentumData: sortTimeline(copcByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        milestoneVelocityData: sortTimeline(milestoneVelocity),
        roadmapData,
        gadEnrollment1stData: makePieData(sem1Male, sem1Female),
        gadEnrollment2ndData: makePieData(sem2Male, sem2Female),
        gadEnrollmentSummerData: makePieData(summerMale, summerFemale),
        gadFacultyData: makePieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty),
        monitoredCount,
        integrityRate: programs.length > 0 ? Math.round((monitoredCount / programs.length) * 100) : 0
    };
  }, [programs, compliances, campusMap]);

  const sortedRoadmap = useMemo(() => {
    if (!analytics?.roadmapData) return [];
    const { key, direction } = roadmapSortConfig;
    return [...analytics.roadmapData].sort((a, b) => {
        let valA = a[key], valB = b[key];
        if (key === 'validity') {
            const getVal = (s: string) => {
                if (s === 'NEW PROGRAM') return 999999;
                if (s === 'AWAITING RESULT' || s === 'TBA') return 999998;
                const m = s.match(/\d{4}/);
                return m ? parseInt(m[0]) : 0;
            };
            valA = getVal(valA); valB = getVal(valB);
        }
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [analytics?.roadmapData, roadmapSortConfig]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>;

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scope Portfolio</CardTitle>
                    <LayoutGrid className="h-4 w-4 text-primary opacity-20" />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-slate-900 tabular-nums">{analytics?.activeCount} Active</div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">{analytics?.inactiveCount} Closed Programs</p>
            </CardContent>
            <CardFooter className="bg-muted/10 py-2">
                <p className="text-[8px] text-muted-foreground italic">Total institutional degree offerings currently monitored.</p>
            </CardFooter>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">COPC Performance</CardTitle>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 opacity-20" />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics?.activeCopc} Active</div>
                <p className="text-[9px] font-bold text-emerald-600/70 uppercase">Verified Authority Awards</p>
            </CardContent>
            <CardFooter className="bg-emerald-100/20 py-2">
                <p className="text-[8px] text-emerald-800/60 italic">Programs possessing active Certificates of Compliance.</p>
            </CardFooter>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Quality Maturity</CardTitle>
                    <Award className="h-4 w-4 text-amber-600 opacity-20" />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics?.activeAccredited} Active</div>
                <p className="text-[9px] font-bold text-amber-800/60 uppercase">Level I or Higher AACCUP</p>
            </CardContent>
            <CardFooter className="bg-amber-100/20 py-2">
                <p className="text-[8px] text-amber-800/60 italic">Active programs with verified accreditation levels.</p>
            </CardFooter>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Monitored Registry</CardTitle>
                    <Activity className="h-4 w-4 text-blue-600 opacity-20" />
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.integrityRate}%</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Data Integrity Index</p>
            </CardContent>
            <CardFooter className="bg-blue-100/20 py-2">
                <p className="text-[8px] text-blue-800/60 italic">Percentage of programs with finalized AY {selectedYear} data logs.</p>
            </CardFooter>
        </Card>
      </div>

      <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs border-b pb-2"><Users className="h-4 w-4" /> Gender & Development (GAD) Compliance Metrics</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                  { title: '1st Sem Enrollment', data: analytics?.gadEnrollment1stData },
                  { title: '2nd Sem Enrollment', data: analytics?.gadEnrollment2ndData },
                  { title: 'Summer Enrollment', data: analytics?.gadEnrollmentSummerData },
                  { title: 'Institutional Faculty Pool', data: analytics?.gadFacultyData }
              ].map((chart, i) => (
                  <Card key={i} className="shadow-md h-[320px] flex flex-col border-primary/10">
                      <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase">{chart.title}</CardTitle></CardHeader>
                      <CardContent className="p-6 flex-1 flex items-center justify-center">
                          <ChartContainer config={chartConfig} className="h-full w-full">
                              <ResponsiveContainer>
                                  <PieChart>
                                      <Pie data={chart.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                                          {chart.data?.map((e: any, j: number) => <Cell key={j} fill={e.fill} />)}
                                      </Pie>
                                      <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                      <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                  </PieChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                      </CardContent>
                  </Card>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle>
                <CardDescription className="text-[10px]">Distribution of programs across AACCUP quality levels.</CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 40, right: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <YAxis dataKey="level" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                            <XAxis type="number" hide />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
                            <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={12}>
                                <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                            </Bar>
                            <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={12}>
                                <LabelList dataKey="Graduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                            </Bar>
                            <Bar dataKey="total" fill="transparent"><LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle>
                <CardDescription className="text-[10px]">CHED award certificates logged by year.</CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.copcMomentumData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
                            <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                                <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                            </Bar>
                            <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                                <LabelList dataKey="Graduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                            </Bar>
                            <Bar dataKey="total" fill="transparent"><LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#059669' }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle>
                <CardDescription className="text-[10px]">Upcoming validity expirations.</CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={analytics?.milestoneVelocityData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
                      <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                        <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                      </Bar>
                      <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                        <LabelList dataKey="Graduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                      </Bar>
                      <Bar dataKey="total" fill="transparent"><LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#ef4444' }} /></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Achievement History</CardTitle>
                <CardDescription className="text-[10px]">Total surveys recorded per year.</CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={analytics?.achievementHistoryData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                      <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
                      <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                        <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                      </Bar>
                      <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                        <LabelList dataKey="Graduate" position="center" style={{ fontSize: '9px', fontWeight: 'bold', fill: 'white' }} />
                      </Bar>
                      <Bar dataKey="total" fill="transparent"><LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#3b82f6' }} /></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap (Pipeline)</CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 h-6 font-black text-[10px] uppercase">
                        <CheckCircle2 className="h-3 w-3" /> {analytics?.statusTotals.COMPLIANT} Compliant
                    </Badge>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5 h-6 font-black text-[10px] uppercase animate-pulse">
                        <ShieldAlert className="h-3 w-3" /> {analytics?.statusTotals.OVERDUE} Overdue
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 h-6 font-black text-[10px] uppercase">
                        <Clock className="h-3 w-3" /> {analytics?.statusTotals['AWAITING RESULT']} Pending
                    </Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 h-6 font-black text-[10px] uppercase">
                        <PlusCircle className="h-3 w-3" /> {analytics?.statusTotals['NEW PROGRAM']} New
                    </Badge>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('name')}>Academic Program Offering {getSortIcon('name')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('campus')}>Campus Site {getSortIcon('campus')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('currentLevel')}>Current Level {getSortIcon('currentLevel')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('validity')}>Validity Date {getSortIcon('validity')}</Button></TableHead>
                              <TableHead className="text-right pr-8 py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedRoadmap.map(item => (
                              <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                                  <TableCell className="pl-8 py-5">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-black text-sm text-slate-900 leading-none">{item.name}</span>
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.level}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{item.campus}</TableCell>
                                  <TableCell className="py-5">
                                    <Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 uppercase bg-white">
                                        {item.currentLevel}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-5 text-xs font-black uppercase tabular-nums">{item.validity}</TableCell>
                                  <TableCell className="text-right pr-8 py-5">
                                    <Badge className={cn(
                                        "text-[10px] font-black uppercase border-none px-3 shadow-sm",
                                        item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : 
                                        item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : 
                                        item.status === 'AWAITING RESULT' ? "bg-blue-600 text-white" : 
                                        "bg-amber-50 text-amber-950"
                                    )}>
                                        {item.status}
                                    </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t p-4 flex justify-between items-center px-8">
              <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                      <HelpCircle className="h-3 w-3" /> Status Guide:
                  </div>
                  <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-bold uppercase">Compliant</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-rose-500" /><span className="text-[8px] font-bold uppercase">Expired / Overdue</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[8px] font-bold uppercase">Processing</span></div>
                      <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-amber-500" /><span className="text-[8px] font-bold uppercase">Preliminary</span></div>
                  </div>
              </div>
              <p className="text-[9px] text-muted-foreground italic font-medium flex items-center gap-2">
                <Target className="h-3 w-3" />
                Sorted chronologically by validity date.
              </p>
          </CardFooter>
      </Card>
    </div>
  );
}
