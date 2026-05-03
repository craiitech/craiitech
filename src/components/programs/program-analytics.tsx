'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit, User, AccreditationRecommendation, Signatories } from '@/lib/types';
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
    Star, 
    Target, 
    Zap, 
    Info, 
    BarChart3,
    ClipboardCheck,
    Search,
    Users,
    ArrowUpDown,
    Trophy,
    FileText,
    ChevronRight,
    PieChart as PieIcon,
    Loader2,
    PlusCircle,
    GraduationCap,
    HelpCircle,
    CalendarCheck,
    ShieldAlert,
    LayoutGrid,
    Clock,
    LayoutList,
    Printer,
    Building2,
    ArrowUpRight,
    Scale,
    History,
    PieChart as LucidePieChart,
    LineChart as LucideLineChart,
    BookOpen
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
    Pie,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    LineChart,
    Line
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccreditationRecommendationReport } from './recommendation-print-template';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
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

/**
 * Utility to sort timeline-based objects by year.
 */
const sortTimeline = (data: Record<string, any>) => {
    return Object.values(data).sort((a, b) => a.year.localeCompare(b.year));
};

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);
  const [roadmapSortConfig, setRoadmapSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'validity', direction: 'asc' });

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

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
    const roadmapData: any[] = [];
    const currentYearNum = new Date().getFullYear();

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };
    const levelCounts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const accreditationYearCounts: Record<string, number> = {};

    const unitImpactMap: Record<string, number> = {};
    const globalPillarSums = { authority: 0, accreditation: 0, faculty: 0, curriculum: 0, outcomes: 0 };

    const degreeCounts = { Doctoral: 0, Masters: 0, Bachelor: 0, Others: 0 };

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (p.isActive) activeCount++;
        else inactiveCount++;

        const pId = String(p.id).toLowerCase().trim();
        const record = compliances.find(c => 
            String(c.programId || '').toLowerCase().trim() === pId
        );
        
        if (record) {
            monitoredCount++;
            
            record.accreditationRecords?.forEach(milestone => {
                milestone.recommendations?.forEach(reco => {
                    if (reco.status !== 'Closed') {
                        reco.assignedUnitIds?.forEach(uid => {
                            unitImpactMap[uid] = (unitImpactMap[uid] || 0) + 1;
                        });
                    }
                });
            });
        }

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
            
            if (rawLevel.includes('Level I')) levelCounts.L1++;
            else if (rawLevel.includes('Level II')) levelCounts.L2++;
            else if (rawLevel.includes('Level III')) levelCounts.L3++;
            else if (rawLevel.includes('Level IV')) levelCounts.L4++;

            if (hasCopc) globalPillarSums.authority += 100;
            else if (record?.ched?.copcStatus === 'In Progress') globalPillarSums.authority += 50;

            if (isAccredited) globalPillarSums.accreditation += 100;
            else if (p.isNewProgram) globalPillarSums.accreditation += 100;

            if (record?.graduationRecords?.length) globalPillarSums.outcomes += 100;
            if (record?.curriculumRecords?.some(c => c.isNotedByChed)) globalPillarSums.curriculum += 100;
            
            if (record?.faculty?.members?.length) {
                const aligned = record.faculty.members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                globalPillarSums.faculty += (aligned / (record.faculty.members.length || 1)) * 100;
            }
        }

        const validityStr = currentMilestone?.statusValidityDate || (p.isNewProgram ? 'NEW PROGRAM' : 'AWAITING RESULT');
        let status = 'AWAITING RESULT';
        if (p.isActive) {
            if (p.isNewProgram) status = 'NEW PROGRAM';
            else if (validityStr && validityStr !== 'AWAITING RESULT' && validityStr !== 'TBA') {
                const yearMatch = validityStr.match(/\d{4}/);
                const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                
                if (dYear > 0) {
                    accreditationYearCounts[dYear] = (accreditationYearCounts[dYear] || 0) + 1;
                }

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
            });

            const enrollmentRecords = record.enrollmentRecords || [];
            const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
            const sumTermFromRecords = (termKey: 'firstSemester' | 'secondSemester' | 'midYearTerm') => {
                let m = 0, f = 0;
                enrollmentRecords.forEach(rec => {
                    const term = rec[termKey];
                    if (term) {
                        levels.forEach(level => {
                            m += Number(term[level]?.male || 0);
                            f += Number(term[level]?.female || 0);
                        });
                    }
                });
                return { m, f };
            };

            const sumTermLegacy = (term: any) => {
                let m = 0, f = 0;
                if (!term) return { m, f };
                levels.forEach(level => {
                    m += Number(term[level]?.male || 0);
                    f += Number(term[level]?.female || 0);
                });
                return { m, f };
            };

            if (enrollmentRecords.length > 0) {
                const t1 = sumTermFromRecords('firstSemester');
                const t2 = sumTermFromRecords('secondSemester');
                const tS = sumTermFromRecords('midYearTerm');
                sem1Male += t1.m; sem1Female += t1.f;
                sem2Male += t2.m; sem2Female += t2.f;
                summerMale += tS.m; summerFemale += tS.f;
            } else {
                const t1 = sumTermLegacy(record.stats?.enrollment?.firstSemester);
                const t2 = sumTermLegacy(record.stats?.enrollment?.secondSemester);
                const tS = sumTermLegacy(record.stats?.enrollment?.midYearTerm);
                sem1Male += t1.m; sem1Female += t1.f;
                sem2Male += t2.m; sem2Female += t2.f;
                summerMale += tS.m; summerFemale += tS.f;
            }

            if (record.faculty) {
                const roster = [...(record.faculty.members || [])];
                if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
                if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
                roster.forEach(m => {
                    if (!m.name || m.name.trim() === '') return;
                    
                    const degree = String(m.highestEducation || '').toUpperCase();
                    if (degree.includes('PHD') || degree.includes('DOCTOR')) degreeCounts.Doctoral++;
                    else if (degree.includes('MS') || degree.includes('MASTER')) degreeCounts.Masters++;
                    else if (degree.includes('BS') || degree.includes('BACHELOR')) degreeCounts.Bachelor++;
                    else degreeCounts.Others++;

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

    const radarData = [
        { pillar: 'Authority', score: Math.round(globalPillarSums.authority / (activeCount || 1)) },
        { pillar: 'Accreditation', score: Math.round(globalPillarSums.accreditation / (activeCount || 1)) },
        { pillar: 'Faculty', score: Math.round(globalPillarSums.faculty / (activeCount || 1)) },
        { pillar: 'Curriculum', score: Math.round(globalPillarSums.curriculum / (activeCount || 1)) },
        { pillar: 'Outcomes', score: Math.round(globalPillarSums.outcomes / (activeCount || 1)) },
    ];

    const degreeProfileData = [
        { name: 'Doctoral', value: degreeCounts.Doctoral, fill: 'hsl(var(--chart-1))' },
        { name: 'Master\'s', value: degreeCounts.Masters, fill: 'hsl(var(--chart-2))' },
        { name: 'Bachelor\'s', value: degreeCounts.Bachelor, fill: 'hsl(var(--chart-3))' },
        { name: 'Others', value: degreeCounts.Others, fill: 'hsl(var(--muted))' }
    ].filter(d => d.value > 0);

    const unitImpactData = Object.entries(unitImpactMap)
        .map(([id, count]) => ({ name: unitMap.get(id) || id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const roadmapForecastData = Object.entries(accreditationYearCounts)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
        .filter(d => parseInt(d.year) >= currentYearNum);

    const makePieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: chartConfig.Male.color }, 
        { name: 'Female', value: f, fill: chartConfig.Female.color }, 
        { name: 'Others', value: o, fill: chartConfig.Others.color }
    ].filter(d => d.value > 0);

    return { 
        radarData,
        degreeProfileData,
        activeCount, 
        inactiveCount,
        activeAccredited, 
        activeCopc,
        statusTotals,
        levelCounts,
        roadmapForecastData,
        copcMomentumData: sortTimeline(copcByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        unitImpactData,
        roadmapData,
        gadEnrollment1stData: makePieData(sem1Male, sem1Female),
        gadEnrollment2ndData: makePieData(sem2Male, sem2Female),
        gadEnrollmentSummerData: makePieData(summerMale, summerFemale),
        gadFacultyData: makePieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty),
        monitoredCount,
        integrityRate: programs.length > 0 ? Math.round((monitoredCount / programs.length) * 100) : 0,
        overallScore: Math.round(radarData.reduce((acc, curr) => acc + curr.score, 0) / radarData.length)
    };
  }, [programs, compliances, campusMap, unitMap]);

  const sortedRoadmapData = useMemo(() => {
    if (!analytics?.roadmapData) return [];
    return [...analytics.roadmapData].sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        const getYearVal = (item: any) => {
            if (!item.isActive) return 1000000;
            const s = item.validity;
            if (s === 'NEW PROGRAM') return 999999;
            if (s === 'AWAITING RESULT' || s === 'TBA') return 999998;
            const m = s.match(/\d{4}/);
            return m ? parseInt(m[0]) : 0;
        };
        const valA = getYearVal(a);
        const valB = getYearVal(b);
        if (valA !== valB) return valA - valB;
        return a.name.localeCompare(b.name);
    });
  }, [analytics?.roadmapData]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roadmapSortConfig.key === key && roadmapSortConfig.direction === 'asc') direction = 'desc';
    setRoadmapSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => (
    <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", roadmapSortConfig.key === key ? "text-primary opacity-100" : "opacity-20")} />
  );

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>;
  if (!analytics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scope Portfolio</CardTitle><LayoutGrid className="h-4 w-4 text-primary opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-slate-900 tabular-nums">{analytics?.activeCount} Active</div><p className="text-[9px] font-bold text-muted-foreground uppercase">{analytics?.inactiveCount} Closed Programs</p></CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">COPC Performance</CardTitle><CheckCircle2 className="h-4 w-4 text-emerald-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics?.activeCopc} Active</div><p className="text-[9px] font-bold text-emerald-600/70 uppercase">Verified Authority</p></CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Quality Maturity</CardTitle><Award className="h-4 w-4 text-amber-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-amber-600 tabular-nums">{analytics?.activeAccredited} Active</div><p className="text-[9px] font-bold text-amber-800/60 uppercase">Level I+ AACCUP</p></CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Monitored Registry</CardTitle><Activity className="h-4 w-4 text-blue-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.integrityRate}%</div><p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Data Integrity Index</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Scale className="h-24 w-24 text-primary" /></div>
              <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> Institutional Maturity Profile
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center pt-8">
                  <ChartContainer config={{}} className="h-[280px] w-full">
                      <ResponsiveContainer>
                          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics?.radarData}>
                              <PolarGrid strokeOpacity={0.2} />
                              <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Radar
                                  name="University Maturity"
                                  dataKey="score"
                                  stroke="hsl(var(--primary))"
                                  fill="hsl(var(--primary))"
                                  fillOpacity={0.4}
                              />
                          </RadarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
                  <div className="text-center mt-4">
                      <span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{analytics.overallScore}%</span>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Institutional Quality Score</p>
                  </div>
              </CardContent>
          </Card>

          <Card className="lg:col-span-1 shadow-lg border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Faculty Educational Attainment (GAD)</CardTitle>
                  </div>
              </CardHeader>
              <CardContent className="p-8 flex-1 flex flex-col items-center justify-center">
                  <ChartContainer config={{}} className="h-[220px] w-[220px]">
                      <ResponsiveContainer>
                          <PieChart>
                              <Pie data={analytics.degreeProfileData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                                  {analytics.degreeProfileData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                              </Pie>
                              <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                              <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                          </PieChart>
                      </ResponsiveContainer>
                  </ChartContainer>
                  <p className="text-[9px] text-muted-foreground italic text-center mt-6">
                      Distribution of professional qualifications across the institutional faculty pool.
                  </p>
              </CardContent>
          </Card>

          <Card className="lg:col-span-1 shadow-lg border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Survey Pipeline</CardTitle>
                  </div>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.roadmapForecastData} margin={{ top: 20, right: 30 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={50} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight">Recommendation Accountability Summary</CardTitle></CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics?.unitImpactData.length ? (
                    <ChartContainer config={{}} className="h-[350px] w-full">
                        <ResponsiveContainer><BarChart data={analytics.unitImpactData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} /><XAxis type="number" hide /><YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} /><RechartsTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} barSize={14} /></BarChart></ResponsiveContainer>
                    </ChartContainer>
                  ) : <div className="flex items-center justify-center h-full opacity-20"><ClipboardCheck className="h-12 w-12" /></div>}
              </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4"><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional GAD Enrollment Overview</CardTitle></CardHeader>
              <CardContent className="pt-10 flex-1 flex flex-col items-center justify-center">
                  <div className="flex gap-4">
                      {[{ title: '1st Sem', data: analytics.gadEnrollment1stData }, { title: '2nd Sem', data: analytics.gadEnrollment2ndData }].map((c, i) => (
                          <div key={i} className="text-center">
                              <ChartContainer config={{}} className="h-[150px] w-[150px]">
                                  <ResponsiveContainer><PieChart><Pie data={c.data} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">{c.data.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /></PieChart></ResponsiveContainer>
                              </ChartContainer>
                              <p className="text-[10px] font-black uppercase mt-2">{c.title}</p>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6"><CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap (Pipeline)</CardTitle></CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10"><TableRow><TableHead className="pl-8 py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('name')}>Academic Program Offering {getSortIcon('name')}</Button></TableHead><TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('campus')}>Campus Site {getSortIcon('campus')}</Button></TableHead><TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('currentLevel')}>Current Level {getSortIcon('currentLevel')}</Button></TableHead><TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase" onClick={() => requestSort('validity')}>Validity Date {getSortIcon('validity')}</Button></TableHead><TableHead className="text-right pr-8 py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead></TableRow></TableHeader>
                      <TableBody>
                          {sortedRoadmapData.map(item => (
                              <TableRow key={item.id} className={cn("hover:bg-muted/20 transition-colors", !item.isActive && "opacity-50 grayscale")}>
                                  <TableCell className="pl-8 py-5"><div className="flex flex-col gap-1"><span className="font-black text-sm text-slate-900">{item.name}</span><span className="text-[9px] font-black text-muted-foreground uppercase">{item.level}</span></div></TableCell>
                                  <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{item.campus}</TableCell>
                                  <TableCell className="py-5"><Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 bg-white">{item.currentLevel}</Badge></TableCell>
                                  <TableCell className="py-5 text-xs font-black uppercase tabular-nums">{item.validity}</TableCell>
                                  <TableCell className="text-right pr-8 py-5"><Badge className={cn("text-[10px] font-black uppercase border-none px-3", item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : "bg-blue-600 text-white")}>{item.status}</Badge></TableCell>
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