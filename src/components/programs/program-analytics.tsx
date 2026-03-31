
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '../ui/skeleton';
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
    UserCircle,
    FileWarning,
    Briefcase,
    LayoutGrid,
    Clock,
    BarChart3,
    Target,
    Zap,
    Users,
    GraduationCap,
    Search,
    AlertTriangle,
    ShieldAlert,
    Calendar,
    ChevronRight,
    Flag,
    History,
    FileX,
    Check,
    ArrowUpDown
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

const ACCREDITATION_LEVELS_ORDER = [
    'Level IV Re-accredited', 'Level IV Accredited',
    'Level III Re-accredited', 'Level III Accredited',
    'Level II Re-accredited', 'Level II Accredited',
    'Level I Re-accredited', 'Level I Accredited',
    'PSV', 'AWAITING RESULT', 'Not Yet Subject'
];

type ProgramCategory = 'Undergraduate' | 'Graduate' | 'Inactive';

const chartConfig = {
    Undergraduate: { label: 'Undergraduate', color: 'hsl(var(--chart-1))' },
    Graduate: { label: 'Graduate', color: 'hsl(var(--chart-2))' },
    Inactive: { label: 'Closed Programs', color: 'hsl(var(--muted-foreground))' },
    Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
    Female: { label: 'Female', color: 'hsl(var(--chart-2))' },
    Others: { label: 'Others (LGBTQI++)', color: 'hsl(var(--chart-3))' },
    School: { label: 'Institutional Rate', color: 'hsl(var(--primary))' },
    National: { label: 'National Average', color: 'hsl(var(--muted-foreground))' }
};

const getYearBadgeStyle = (yearStr: string) => {
    const year = parseInt(yearStr);
    if (isNaN(year)) return "bg-slate-100 text-slate-600 border-slate-200";
    
    const colors = [
        "bg-blue-50 text-blue-700 border-blue-200",
        "bg-emerald-50 text-emerald-700 border-emerald-200",
        "bg-amber-50 text-amber-700 border-amber-200",
        "bg-purple-50 text-purple-700 border-purple-200",
        "bg-rose-50 text-rose-700 border-rose-200",
        "bg-indigo-50 text-indigo-700 border-indigo-200",
        "bg-cyan-50 text-cyan-700 border-cyan-200"
    ];
    
    return colors[year % colors.length];
};

type SortKey = 'name' | 'campus' | 'currentLevel' | 'validity' | 'status';

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const [roadmapSortConfig, setRoadmapSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'validity', direction: 'asc' });

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const getProgramCategory = (p: AcademicProgram): ProgramCategory => {
        if (!p.isActive) return 'Inactive';
        return p.level === 'Graduate' ? 'Graduate' : 'Undergraduate';
    };

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let activeCopc = 0;

    let sem1Male = 0, sem1Female = 0;
    let sem2Male = 0, sem2Female = 0;
    let summerMale = 0, summerFemale = 0;

    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;
    let totalMaleTraced = 0;
    let totalFemaleTraced = 0;
    
    const uniqueFacultySet = new Set<string>();
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalOthersFaculty = 0;

    const copcByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number, total: number }> = {};
    const velocityByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number, total: number }> = {};
    const achievementByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number, total: number }> = {};
    
    let totalSchoolRate = 0;
    let totalNationalRate = 0;
    let boardCount = 0;

    const gapRegistry: any[] = [];
    const roadmapData: any[] = [];
    const currentYearNum = new Date().getFullYear();

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (category === 'Inactive') inactiveCount++;
        else activeCount++;

        const record = compliances.find(c => c.programId === p.id);
        const cName = campusMap.get(p.campusId) || 'Unknown Site';

        const isAccredited = (rec: ProgramComplianceRecord | undefined) => {
            if (!rec || !rec.accreditationRecords || rec.accreditationRecords.length === 0) return false;
            const current = rec.accreditationRecords.find(m => m.lifecycleStatus === 'Current') || rec.accreditationRecords[rec.accreditationRecords.length - 1];
            return current && current.level !== 'Non Accredited' && !current.level.includes('PSV') && current.level !== 'AWAITING RESULT';
        };
        const hasCopc = (rec: ProgramComplianceRecord | undefined) => rec?.ched?.copcStatus === 'With COPC';

        if (p.isActive) {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
            
            const tags = [];
            if (!record) {
                tags.push("Faculty Staffing List", "Graduation Outcome Data", "COPC Certificate", "Official CMO Link");
            } else {
                if (record.ched?.copcStatus !== 'With COPC') tags.push("COPC Certificate");
                if (!record.ched?.programCmoLink) tags.push("Official CMO Link");
                if (!record.faculty?.members || record.faculty.members.length === 0) tags.push("Faculty Staffing List");
                if (!record.graduationRecords || record.graduationRecords.length === 0) tags.push("Graduation Outcome Data");
            }

            if (tags.length > 0) {
                gapRegistry.push({ name: p.name, campus: cName, gapCount: tags.length, tags: tags });
            }
        }

        const milestones = record?.accreditationRecords || [];
        const milestoneWaitingResult = milestones.find(m => m.lifecycleStatus === 'Waiting for Official Result');
        const currentMilestone = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        const validityStr = currentMilestone?.statusValidityDate || 'AWAITING RESULT';

        let status: any = 'AWAITING RESULT';
        if (p.isActive) {
            if (p.isNewProgram) {
                status = 'NEW PROGRAM';
            } else if (milestoneWaitingResult) {
                status = 'AWAITING RESULT';
            } else if (validityStr && validityStr !== 'AWAITING RESULT' && validityStr !== 'TBA' && validityStr !== 'SCHEDULE PENDING') {
                const yearMatch = validityStr.match(/\d{4}/);
                const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                if (dYear > 0 && dYear < currentYearNum) status = 'OVERDUE';
                else if (dYear >= currentYearNum) status = 'COMPLIANT';
            } else {
                status = 'AWAITING RESULT';
            }
        } else {
            status = 'CLOSED';
        }

        roadmapData.push({
            id: p.id,
            name: p.name,
            level: p.level,
            campus: cName,
            currentLevel: currentMilestone?.level || (p.isNewProgram ? 'Not Yet Subject' : 'AWAITING RESULT'),
            validity: p.isNewProgram ? 'NEW PROGRAM' : (validityStr === 'TBA' ? 'AWAITING RESULT' : validityStr),
            status,
            isActive: p.isActive
        });

        if (record) {
            // Timeline chart population
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
            });

            // GAD Aggregation
            const s1 = record.stats.enrollment?.firstSemester;
            const s2 = record.stats.enrollment?.secondSemester;
            const sum = record.stats.enrollment?.midYearTerm;

            if (s1) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                    sem1Male += Number(s1[lvl]?.male || 0);
                    sem1Female += Number(s1[lvl]?.female || 0);
                });
            }
            if (s2) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                    sem2Male += Number(s2[lvl]?.male || 0);
                    sem2Female += Number(s2[lvl]?.female || 0);
                });
            }
            if (sum) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                    summerMale += Number(sum[lvl]?.male || 0);
                    summerFemale += Number(sum[lvl]?.female || 0);
                });
            }

            // Faculty
            if (record.faculty) {
                const roster = [...(record.faculty.members || [])];
                if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
                if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
                roster.forEach(m => {
                    if (!m.name || m.name.trim() === '') return;
                    const key = `${m.name.trim()}-${p.campusId}`.toLowerCase();
                    if (!uniqueFacultySet.has(key)) {
                        uniqueFacultySet.add(key);
                        if (m.sex === 'Male') totalMaleFaculty++;
                        else if (m.sex === 'Female') totalFemaleFaculty++;
                        else totalOthersFaculty++;
                    }
                });
            }

            record.graduationRecords?.forEach(g => { totalMaleGrads += Number(g.maleCount || 0); totalFemaleGrads += Number(g.femaleCount || 0); });
            record.tracerRecords?.forEach(t => { totalMaleTraced += Number(t.maleTraced || 0); totalFemaleTraced += Number(t.femaleTraced || 0); });
            
            if (record.boardPerformance?.length) {
                const latest = record.boardPerformance[record.boardPerformance.length - 1];
                totalSchoolRate += latest.overallPassRate;
                totalNationalRate += latest.nationalPassingRate;
                boardCount++;
            }
        }
    });

    // Chart Data Construction
    const accreditationDataMap: Record<string, any> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 });
    programs.forEach(p => {
        const cat = getProgramCategory(p);
        let lvlKey = 'AWAITING RESULT';
        if (p.isNewProgram) lvlKey = 'Not Yet Subject';
        else {
            const rec = compliances.find(c => c.programId === p.id);
            const mil = rec?.accreditationRecords || [];
            const cur = mil.find(m => m.lifecycleStatus === 'Current') || mil[mil.length - 1];
            lvlKey = cur?.level || 'AWAITING RESULT';
            if (lvlKey.includes('PSV')) lvlKey = 'PSV';
        }
        if (accreditationDataMap[lvlKey]) { accreditationDataMap[lvlKey][cat]++; accreditationDataMap[lvlKey].total++; }
    });

    const sortTimeline = (data: Record<string, any>) => Object.values(data).sort((a, b) => a.year.localeCompare(b.year));

    const makePieData = (m: number, f: number, o: number = 0) => {
        return [{ name: 'Male', value: m, fill: chartConfig.Male.color }, { name: 'Female', value: f, fill: chartConfig.Female.color }, { name: 'Others (LGBTQI++)', value: o, fill: chartConfig.Others.color }].filter(d => d.value > 0);
    };

    const monitoredCount = compliances.length;
    const integrityRate = programs.length > 0 ? Math.round((monitoredCount / programs.length) * 100) : 0;

    return { 
        accreditationSummary: Object.values(accreditationDataMap).filter(d => d.total > 0),
        activeCount, inactiveCount, activeAccredited, activeCopc,
        copcMomentumData: sortTimeline(copcByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        roadmapData,
        totalEnrollment: sem1Male + sem1Female + sem2Male + sem2Female + summerMale + summerFemale,
        totalFaculty: totalMaleFaculty + totalFemaleFaculty + totalOthersFaculty,
        gadEnrollment1stData: makePieData(sem1Male, sem1Female),
        gadEnrollment2ndData: makePieData(sem2Male, sem2Female),
        gadEnrollmentSummerData: makePieData(summerMale, summerFemale),
        gadFacultyData: makePieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty),
        gadGraduationData: makePieData(totalMaleGrads, totalFemaleGrads),
        gadTracerData: makePieData(totalMaleTraced, totalFemaleTraced),
        boardPerfData: boardCount > 0 ? [{ name: 'School', rate: Math.round(totalSchoolRate / boardCount), fill: chartConfig.School.color }, { name: 'National', rate: Math.round(totalNationalRate / boardCount), fill: chartConfig.National.color }] : [],
        gapRegistry,
        monitoredCount,
        integrityRate
    };
  }, [programs, compliances, campusMap, selectedYear]);

  const sortedRoadmap = useMemo(() => {
    if (!analytics?.roadmapData) return [];
    const { key, direction } = roadmapSortConfig;
    
    return [...analytics.roadmapData].sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        if (key === 'validity') {
            const getSortValue = (s: string) => {
                if (s === 'NEW PROGRAM') return 999999;
                if (s === 'AWAITING RESULT' || s === 'SCHEDULE PENDING' || s === 'TBA') return 999998;
                const match = s.match(/\d{4}/);
                return match ? parseInt(match[0]) : 0;
            };
            valA = getSortValue(valA);
            valB = getSortValue(valB);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [analytics?.roadmapData, roadmapSortConfig]);

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[14px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. EXECUTIVE KPI PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/10">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Portfolio Monitoring</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-slate-900">{analytics?.activeCount} Active</div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">{analytics?.inactiveCount} CLOSED PROGRAMS</p>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-emerald-100 bg-emerald-50/10">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">COPC Performance</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-emerald-600">{analytics?.activeCopc} Programs</div>
                <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-tighter">Verified Authority</p>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-amber-100 bg-amber-50/10">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Quality Maturity</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-amber-600">{analytics?.activeAccredited} Programs</div>
                <p className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-tighter">Level I or Higher</p>
            </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100 bg-blue-50/10">
            <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Monitored Registry</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-blue-600">{analytics?.integrityRate}%</div>
                <p className="text-[9px] font-bold text-blue-600/70 uppercase tracking-tighter">{analytics?.monitoredCount} Verified Data Logs</p>
            </CardContent>
        </Card>
      </div>

      {/* 2. GAD COMPLIANCE PIE CHARTS */}
      <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs border-b pb-2"><Users className="h-4 w-4" /> Gender & Development (GAD) Compliance Metrics</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-md h-[320px] flex flex-col border-primary/10">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase">1st Semester Enrollment</CardTitle></CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Pie data={analytics?.gadEnrollment1stData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                      {analytics?.gadEnrollment1stData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
              <Card className="shadow-md h-[320px] flex flex-col border-primary/10">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase">2nd Semester Enrollment</CardTitle></CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Pie data={analytics?.gadEnrollment2ndData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                      {analytics?.gadEnrollment2ndData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
              <Card className="shadow-md h-[320px] flex flex-col border-primary/10">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase">Institutional Faculty Pool</CardTitle></CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Pie data={analytics?.gadFacultyData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                      {analytics?.gadFacultyData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
          </div>
      </div>

      {/* 3. BAR CHARTS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle></CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 40, right: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="level" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={12} />
                            <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={12} />
                            <Bar dataKey="total" stackId="b" fill="transparent"><LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle></CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.copcMomentumData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30} />
                            <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30} />
                            <Bar dataKey="total" stackId="b" fill="transparent"><LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#059669' }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap</CardTitle></div></CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('name')}>Academic Program {getSortIcon('name')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('campus')}>Site {getSortIcon('campus')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('currentLevel')}>Level {getSortIcon('currentLevel')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('validity')}>Validity {getSortIcon('validity')}</Button></TableHead>
                              <TableHead className="text-right pr-8 py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase ml-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedRoadmap.map(item => (
                              <TableRow key={item.id} className="hover:bg-muted/20">
                                  <TableCell className="pl-8 py-5">
                                      <div className="flex flex-col gap-1">
                                          <span className="font-black text-sm text-slate-900 leading-none">{item.name}</span>
                                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.level}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{item.campus}</TableCell>
                                  <TableCell className="py-5"><Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 uppercase">{item.currentLevel}</Badge></TableCell>
                                  <TableCell className="py-5 text-xs font-black uppercase">{item.validity}</TableCell>
                                  <TableCell className="text-right pr-8 py-5">
                                      <Badge className={cn("text-[10px] font-black uppercase border-none px-3 shadow-sm", item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : item.status === 'AWAITING RESULT' ? "bg-blue-600 text-white" : "bg-amber-50 text-amber-950")}>
                                          {item.status}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
      </Card>
    </div>
  );
}
