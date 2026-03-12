
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, AccreditationRecord, CurriculumRecord, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
    Layout,
    Check,
    ArrowDownToLine,
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
    Undergraduate: { label: 'Undergraduate', color: 'hsl(var(--primary))' },
    Graduate: { label: 'Graduate', color: 'hsl(var(--chart-2))' },
    Inactive: { label: 'Closed Programs', color: 'hsl(var(--muted-foreground))' },
    Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
    Female: { label: 'Female', color: 'hsl(var(--chart-2))' },
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

    const filteredProgramIds = new Set(programs.map(p => p.id));
    const filteredCompliances = compliances.filter(c => filteredProgramIds.has(c.programId));

    const getProgramCategory = (p: AcademicProgram): ProgramCategory => {
        if (!p.isActive) return 'Inactive';
        return p.level === 'Graduate' ? 'Graduate' : 'Undergraduate';
    };

    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let inactiveAccredited = 0;
    let activeCopc = 0;
    let inactiveCopc = 0;

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

        const record = filteredCompliances.find(c => c.programId === p.id);
        const cName = campusMap.get(p.campusId) || 'Unknown Site';

        const isAccredited = (rec: ProgramComplianceRecord | undefined) => {
            if (!rec || !rec.accreditationRecords || rec.accreditationRecords.length === 0) return false;
            const milestones = rec.accreditationRecords;
            const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            return current && current.level !== 'Non Accredited' && !current.level.includes('PSV');
        };
        const hasCopc = (rec: ProgramComplianceRecord | undefined) => rec?.ched?.copcStatus === 'With COPC';

        if (category !== 'Inactive') {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        } else {
            if (isAccredited(record)) inactiveAccredited++;
            if (hasCopc(record)) inactiveCopc++;
        }

        if (p.isActive) {
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
                gapRegistry.push({
                    name: p.name,
                    campus: cName,
                    gapCount: tags.length,
                    tags: tags
                });
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
            const copcYear = record.ched?.copcAwardDate?.match(/\d{4}/)?.[0];
            if (copcYear) {
                if (!copcByYear[copcYear]) copcByYear[copcYear] = { year: copcYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: number = 0 };
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

            const validityYear = currentMilestone?.statusValidityDate?.match(/\d{4}/)?.[0];
            if (validityYear) {
                if (!velocityByYear[validityYear]) velocityByYear[validityYear] = { year: validityYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
                velocityByYear[validityYear][category]++;
                velocityByYear[validityYear].total++;
            }

            const s1 = record.stats?.enrollment?.firstSemester;
            const s2 = record.stats?.enrollment?.secondSemester;
            const sum = record.stats?.enrollment?.midYearTerm;

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

            if (record.faculty) {
                const roster = [...(record.faculty.members || [])];
                if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
                if (record.faculty.associateDean?.name && record.faculty.hasAssociateDean) roster.push(record.faculty.associateDean as any);
                if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
                
                roster.forEach(m => {
                    if (!m.name || m.name.trim() === '') return;
                    const key = `${m.name.trim()}-${p.campusId}`.toLowerCase();
                    if (!uniqueFacultySet.has(key)) {
                        uniqueFacultySet.add(key);
                        if (m.sex === 'Male') totalMaleFaculty++;
                        else if (m.sex === 'Female') totalFemaleFaculty++;
                    }
                });
            }
            record.graduationRecords?.forEach(g => {
                totalMaleGrads += Number(g.maleCount || 0);
                totalFemaleGrads += Number(g.femaleCount || 0);
            });
            record.tracerRecords?.forEach(t => {
                totalMaleTraced += Number(t.maleTraced || 0);
                totalFemaleTraced += Number(t.femaleTraced || 0);
            });
            if (record.boardPerformance && record.boardPerformance.length > 0) {
                const latest = record.boardPerformance[record.boardPerformance.length - 1];
                totalSchoolRate += latest.overallPassRate;
                totalNationalRate += latest.nationalPassingRate;
                boardCount++;
            }
        }
    });

    const accreditationDataMap: Record<string, any> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 });
    programs.forEach(p => {
        const cat = getProgramCategory(p);
        let lvlKey = 'AWAITING RESULT';
        if (p.isNewProgram) lvlKey = 'Not Yet Subject';
        else {
            const rec = filteredCompliances.find(c => c.programId === p.id);
            const mil = rec?.accreditationRecords || [];
            const cur = mil.find(m => m.lifecycleStatus === 'Current') || mil[mil.length - 1];
            lvlKey = cur?.level || 'AWAITING RESULT';
            if (lvlKey.includes('PSV')) lvlKey = 'PSV';
        }
        if (accreditationDataMap[lvlKey]) { accreditationDataMap[lvlKey][cat]++; accreditationDataMap[lvlKey].total++; }
    });

    const sortTimeline = (data: Record<string, any>) => Object.values(data).sort((a, b) => a.year.localeCompare(b.year));

    const roadmapYearBreakdown: Record<number, number> = {};
    roadmapData.forEach(item => {
        if (!item.isActive) return;
        const yearMatch = item.validity.match(/\d{4}/);
        if (yearMatch) {
            const y = parseInt(yearMatch[0]);
            roadmapYearBreakdown[y] = (roadmapYearBreakdown[y] || 0) + 1;
        }
    });

    const makePieData = (m: number, f: number) => {
        return [
            { name: 'Male', value: m, fill: chartConfig.Male.color },
            { name: 'Female', value: f, fill: chartConfig.Female.color }
        ].filter(d => d.value > 0);
    }

    return { 
        accreditationSummary: Object.values(accreditationDataMap).filter(d => d.total > 0),
        activeCount, inactiveCount, activeAccredited, inactiveAccredited, activeCopc, inactiveCopc,
        copcMomentumData: sortTimeline(copcByYear),
        velocityData: sortTimeline(velocityByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        roadmapData,
        roadmapYearBreakdown,
        totalEnrollment: sem1Male + sem1Female + sem2Male + sem2Female + summerMale + summerFemale,
        sem1Total: sem1Male + sem1Female,
        sem2Total: sem2Male + sem2Female,
        summerTotal: summerMale + summerFemale,
        sem1Male, sem1Female, sem2Male, sem2Female, summerMale, summerFemale,
        totalMaleFaculty, totalFemaleFaculty, totalFaculty: totalMaleFaculty + totalFemaleFaculty,
        gadEnrollment1stData: makePieData(sem1Male, sem1Female),
        gadEnrollment2ndData: makePieData(sem2Male, sem2Female),
        gadEnrollmentSummerData: makePieData(summerMale, summerFemale),
        gadFacultyData: makePieData(totalMaleFaculty, totalFemaleFaculty),
        gadGraduationData: [{ name: 'Male', value: totalMaleGrads, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleGrads, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        gadTracerData: [{ name: 'Male', value: totalMaleTraced, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleTraced, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        boardPerfData: boardCount > 0 ? [{ name: 'School', rate: Math.round(totalSchoolRate / boardCount), fill: chartConfig.School.color }, { name: 'National', rate: Math.round(totalNationalRate / boardCount), fill: chartConfig.National.color }] : [],
        gapRegistry,
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campuses, campusMap, selectedYear]);

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
                const year = match ? parseInt(match[0]) : 0;
                
                const months: Record<string, number> = { 
                    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, 
                    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 
                };
                const monthStr = s.split(' ')[0].toLowerCase().substring(0, 3);
                const monthVal = months[monthStr] || 0;
                
                return (year * 100) + monthVal;
            };
            valA = getSortValue(valA);
            valB = getSortValue(valB);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
  }, [analytics?.roadmapData, roadmapSortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roadmapSortConfig.key === key && roadmapSortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const setSortConfig = (config: { key: SortKey, direction: 'asc' | 'desc' }) => {
    setRoadmapSortConfig(config);
  };

  const getSortIcon = (key: SortKey) => {
    return (
        <ArrowUpDown className={cn(
            "h-3 w-3 transition-colors", 
            roadmapSortConfig.key === key ? "text-primary opacity-100" : "text-muted-foreground opacity-20"
        )} />
    );
  };

  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[14px] font-black">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* 1. EXECUTIVE KPI PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-primary/10 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><LayoutGrid className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope Portfolio</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-slate-900">{analytics?.activeCount} Active</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase tracking-tighter">{analytics?.inactiveCount} Subject for Closure</p>
            </CardContent>
            <CardFooter className="bg-muted/5 border-t py-2 px-4">
                <p className="text-[8px] text-muted-foreground italic leading-tight"><strong>Guidance for usage:</strong> Reflects total active program offerings versus those currently being phased out.</p>
            </CardFooter>
        </Card>

        <Card className="shadow-sm border-primary/10 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Check className="h-12 w-12 text-emerald-600" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">COPC Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-emerald-600">{analytics?.activeCopc} Active</div>
                <p className="text-[9px] font-bold text-emerald-600/70 mt-1 uppercase tracking-tighter">{analytics?.inactiveCopc} Inactive Awards Verified</p>
            </CardContent>
            <CardFooter className="bg-emerald-50/30 border-t py-2 px-4">
                <p className="text-[8px] text-emerald-800/60 italic leading-tight"><strong>Guidance for usage:</strong> Tracks programs with an official CHED Certificate of Program Compliance (COPC).</p>
            </CardFooter>
        </Card>

        <Card className="shadow-sm border-primary/10 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Award className="h-12 w-12 text-amber-600" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">Quality Maturity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600">{analytics?.activeAccredited} Active</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase tracking-tighter">{analytics?.inactiveAccredited} Inactive Accredited</p>
            </CardContent>
            <CardFooter className="bg-amber-50/30 border-t py-2 px-4">
                <p className="text-[8px] text-emerald-800/60 italic leading-tight"><strong>Guidance for usage:</strong> Measures high-level institutional quality via Level I or higher AACCUP accreditation status.</p>
            </CardFooter>
        </Card>

        <Card className="shadow-sm border-primary/10 flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Users className="h-12 w-12 text-blue-600" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">Monitored Registry</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600">{analytics?.monitoredCount}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Total Verified AY {selectedYear} Data</p>
            </CardContent>
            <CardFooter className="bg-blue-50/30 border-t py-2 px-4">
                <p className="text-[8px] text-blue-800/60 italic leading-tight"><strong>Guidance for usage:</strong> Total number of programs with finalized and verified compliance evidence for this year.</p>
            </CardFooter>
        </Card>
      </div>

      {/* 2. INSTITUTIONAL GAPS REGISTRY */}
      <Card className="border-rose-200 shadow-xl overflow-hidden bg-rose-50/10 relative">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600 opacity-50" />
          <CardHeader className="bg-rose-50 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2 text-rose-600">
                          <ShieldAlert className="h-5 w-5 text-rose-600" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Gaps Registry</CardTitle>
                      </div>
                      <CardDescription className="text-[10px] font-bold text-rose-700/70 uppercase">Critical documentation deficiencies impacting maturity index for AY {selectedYear}.</CardDescription>
                  </div>
                  <Badge variant="destructive" className="h-6 px-4 font-black uppercase text-[10px] tracking-widest shadow-sm">ACTION REQUIRED</Badge>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="max-h-[450px]">
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {analytics && analytics.gapRegistry.length > 0 ? (
                          analytics.gapRegistry.map((item, i) => (
                              <div key={i} className="flex flex-col gap-3 group transition-all">
                                  <div className="flex items-start justify-between gap-4">
                                      <div className="space-y-1 min-w-0">
                                          <p className="text-xs font-black text-slate-900 leading-tight uppercase truncate" title={item.name}>{item.name}</p>
                                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{item.campus}</p>
                                      </div>
                                      <Badge variant="destructive" className="h-4 text-[8px] font-black py-0 px-1.5 shrink-0 shadow-none border-none">{item.gapCount} GAPS</Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                      {item.tags.map((tag: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="bg-rose-50 text-[8px] font-black uppercase tracking-tighter text-rose-600 border-rose-100 rounded-full h-4.5 px-2">
                                              {tag}
                                          </Badge>
                                      ))}
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="col-span-full py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-20">
                              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
                              <p className="font-black text-slate-900 uppercase text-sm">Full Institutional Parity Reached</p>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </CardContent>
          <CardFooter className="bg-rose-100/30 border-t py-3 px-6">
              <p className="text-[10px] text-rose-800 leading-relaxed font-bold italic">
                  <span className="font-black not-italic uppercase tracking-widest mr-2">Guidance for usage:</span>
                  Identification of these gaps is mandatory for ISO 21001:2018 compliance tracking. High gap counts signify institutional risk during external audits.
              </p>
          </CardFooter>
      </Card>

      {/* 3. STRATEGIC GAD PANEL */}
      <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs border-b pb-2"><Users className="h-4 w-4" /> Gender & Development (GAD) Compliance Metrics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              <Card className="shadow-md flex flex-col border-primary/10 overflow-hidden group hover:shadow-lg transition-all h-[320px]">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 leading-tight">
                        <Users /> 1st Semester Enrollment (Total: {analytics?.sem1Total} | M: {analytics?.sem1Male}, F: {analytics?.sem1Female})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center overflow-hidden">
                      {analytics?.gadEnrollment1stData.length ? (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={analytics.gadEnrollment1stData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                        {analytics.gadEnrollment1stData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-40"><Activity className="h-8 w-8" /><p className="text-[11px] font-black uppercase tracking-widest">NO DATA YET!</p></div>
                      )}
                  </CardContent>
                  <CardFooter className="p-3 border-t bg-muted/5 shrink-0"><p className="text-[9px] text-muted-foreground italic leading-tight">1st Semester Male/Female distribution.</p></CardFooter>
              </Card>

              <Card className="shadow-md flex flex-col border-primary/10 overflow-hidden group hover:shadow-lg transition-all h-[320px]">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 leading-tight">
                        <Users /> 2nd Semester Enrollment (Total: {analytics?.sem2Total} | M: {analytics?.sem2Male}, F: {analytics?.sem2Female})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center overflow-hidden">
                      {analytics?.gadEnrollment2ndData.length ? (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={analytics.gadEnrollment2ndData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                        {analytics.gadEnrollment2ndData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-40"><Activity className="h-8 w-8" /><p className="text-[11px] font-black uppercase tracking-widest">NO DATA YET!</p></div>
                      )}
                  </CardContent>
                  <CardFooter className="p-3 border-t bg-muted/5 shrink-0"><p className="text-[9px] text-muted-foreground italic leading-tight">2nd Semester Male/Female distribution.</p></CardFooter>
              </Card>

              <Card className="shadow-md flex flex-col border-primary/10 overflow-hidden group hover:shadow-lg transition-all h-[320px]">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 leading-tight">
                        <Users /> Summer/Mid-Year Enrollment (Total: {analytics?.summerTotal} | M: {analytics?.summerMale}, F: {analytics?.summerFemale})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center overflow-hidden">
                      {analytics?.gadEnrollmentsummerData.length ? (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={analytics.gadEnrollmentSummerData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                        {analytics.gadEnrollmentSummerData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-40"><Activity className="h-8 w-8" /><p className="text-[11px] font-black uppercase tracking-widest">NO DATA YET!</p></div>
                      )}
                  </CardContent>
                  <CardFooter className="p-3 border-t bg-muted/5 shrink-0"><p className="text-[9px] text-muted-foreground italic leading-tight">Summer term Male/Female distribution.</p></CardFooter>
              </Card>

              <Card className="shadow-md flex flex-col border-primary/10 overflow-hidden group hover:shadow-lg transition-all h-[320px]">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0">
                    <CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 leading-tight">
                        <UserCircle /> Faculty Distribution (M: {analytics?.totalMaleFaculty}, F: {analytics?.totalFemaleFaculty}, Total: {analytics?.totalFaculty})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center overflow-hidden">
                      {analytics?.gadFacultyData.length ? (
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={analytics.gadFacultyData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                        {analytics.gadFacultyData.map((e, j) => <Cell key={j} fill={e.fill} />)}
                                    </Pie>
                                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-40"><Activity className="h-8 w-8" /><p className="text-[11px] font-black uppercase tracking-widest">NO DATA YET!</p></div>
                      )}
                  </CardContent>
                  <CardFooter className="p-3 border-t bg-muted/5 shrink-0"><p className="text-[9px] text-muted-foreground italic leading-tight">Unique headcount of teaching staff registered across all programs.</p></CardFooter>
              </Card>

              {[
                  { title: 'Graduation Output Analysis', data: analytics?.gadGraduationData, icon: <GraduationCap /> },
                  { title: 'Graduate Employability Tracing', data: analytics?.gadTracerData, icon: <Search /> },
                  { title: 'Institutional Board Performance', chart: 'bar', data: analytics?.boardPerfData, icon: <ShieldCheck /> }
              ].map((card, i) => (
                  <Card key={i} className="shadow-md flex flex-col border-primary/10 overflow-hidden group hover:shadow-lg transition-all h-[320px]">
                      <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase flex items-center gap-2 leading-tight">{card.icon} {card.title}</CardTitle></CardHeader>
                      <CardContent className="p-6 flex-1 flex items-center justify-center overflow-hidden">
                          {card.data && card.data.length > 0 ? (
                              card.chart === 'bar' ? (
                                <ChartContainer config={chartConfig} className="h-full w-full">
                                    <ResponsiveContainer>
                                        <BarChart data={card.data} layout="vertical" margin={{ right: 60, left: 10 }}>
                                            <XAxis type="number" hide domain={[0, 100]} />
                                            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} width={80} axisLine={false} tickLine={false} />
                                            <RechartsTooltip content={<ChartTooltipContent />} />
                                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                            <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20}>
                                                <LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '14px', fontWeight: '900', fill: 'currentColor' }} />
                                                {card.data?.map((e: any, j: any) => <Cell key={j} fill={e.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            ) : (
                                <ChartContainer config={chartConfig} className="h-full w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={card.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderPieLabel} labelLine={false}>
                                                {card.data?.map((e: any, j: any) => <Cell key={j} fill={e.fill} />)}
                                            </Pie>
                                            <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                            )
                          ) : (
                              <div className="flex flex-col items-center justify-center text-center space-y-2 opacity-40"><Activity className="h-8 w-8" /><p className="text-[11px] font-black uppercase tracking-widest">NO DATA YET!</p></div>
                          )}
                      </CardContent>
                      <CardFooter className="p-3 border-t bg-muted/5 shrink-0"><p className="text-[9px] text-muted-foreground italic leading-tight">Institutional output distribution aligned with GAD standards.</p></CardFooter>
                  </Card>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle></div>
                      <Badge variant="outline" className="h-5 text-[10px] font-black bg-primary/5 text-primary border-primary/20">OVERALL TOTAL: {analytics?.activeCount}</Badge>
                  </div>
                  <CardDescription className="text-[11px] font-medium leading-relaxed mt-1">
                      <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Guidance for usage:</span>
                      Analyzes the distribution of programs across AACCUP levels. Concentrations in levels III & IV signify advanced maturity.
                  </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics && analytics.accreditationSummary.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 40, right: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="level" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '30px' }} />
                                <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={12}>
                                    <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={12}>
                                    <LabelList dataKey="Graduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Inactive" stackId="a" fill={chartConfig.Inactive.color} radius={[0, 4, 4, 0]} barSize={12}>
                                    <LabelList dataKey="Inactive" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                    <LabelList dataKey="total" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                      <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                  )}
              </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle></div>
                      <Badge variant="outline" className="h-5 text-[10px] font-black bg-emerald-50 text-emerald-700 border-emerald-200">INSTITUTIONAL TOTAL: {analytics?.activeCopc}</Badge>
                  </div>
                  <CardDescription className="text-[11px] font-medium leading-relaxed mt-1">
                      <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Guidance for usage:</span>
                      Tracks the timeline of COPC issuance by CHED. Steady yearly growth indicates successful regulatory alignment.
                  </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics && analytics.copcMomentumData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics?.copcMomentumData} margin={{ top: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '30px' }} />
                                <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                                    <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                                    <LabelList dataKey="Graduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Inactive" stackId="a" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey="Inactive" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                    <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#059669' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                      <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                  )}
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-blue-50 text-blue-700 border-blue-200">OVERALL PIPELINE</Badge></div>
                  <CardDescription className="text-xs">
                    <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Guidance for usage:</span>
                    Projects future audit workload based on set schedules. Facilitates resource planning.
                  </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics && analytics.velocityData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics?.velocityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '30px' }} />
                                <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                                    <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                                    <LabelList dataKey="Graduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Inactive" stackId="a" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#2563eb' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                      <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                  )}
              </CardContent>
          </Card>

          <Card className="shadow-md border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="h-5 w-5 text-indigo-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Achievement History</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-indigo-50 text-indigo-700 border-indigo-200">HISTORICAL SURVEYS</Badge></div>
                  <CardDescription className="text-xs">
                    <span className="font-black text-slate-800 uppercase tracking-tighter mr-1">Guidance for usage:</span>
                    Tracks history of successful survey completions across academic cycles.
                  </CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics && analytics.achievementHistoryData.length > 0 ? (
                      <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics?.achievementHistoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '30px' }} />
                                <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30}>
                                    <LabelList dataKey="Undergraduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30}>
                                    <LabelList dataKey="Graduate" position="center" style={{ fontSize: '8px', fill: '#fff', fontWeight: 'bold' }} />
                                </Bar>
                                <Bar dataKey="Inactive" stackId="a" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={30}>
                                    <LabelList dataKey="total" position="top" style={{ fontSize: '10px', fontWeight: '900', fill: '#4f46e5' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                      <div className="h-[350px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                  )}
              </CardContent>
          </Card>
      </div>

      {/* 7. INSTITUTIONAL SURVEY PIPELINE (ROADMAP) */}
      <div className="space-y-6">
          <div className="flex items-center gap-3 border-b pb-2">
              <Flag className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Institutional Survey Pipeline (Roadmap)</h3>
          </div>

          <Tabs defaultValue="active" className="space-y-4">
            <TabsList className="bg-muted p-1 border shadow-sm w-fit">
                <TabsTrigger value="active" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                    <ShieldCheck className="h-3.5 w-3.5" /> Active Program Offerings
                </TabsTrigger>
                <TabsTrigger value="inactive" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                    <FileX className="h-3.5 w-3.5" /> Closed Program History Archive
                </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="animate-in fade-in slide-in-from-left-2 duration-300">
                <Card className="shadow-xl border-primary/10 overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b py-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <CardTitle className="text-lg font-black uppercase tracking-tight">Active Program Roadmap</CardTitle>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(analytics?.roadmapYearBreakdown || {}).sort((a,b) => Number(a[0]) - Number(b[0])).map(([y, count]) => (
                                    <Badge key={y} variant="outline" className={cn("text-[10px] font-black border-none h-6 px-3 uppercase shadow-sm", getYearBadgeStyle(y))}>
                                        {y}: {count} SURVEYS
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        <CardDescription className="text-sm font-medium mt-2">Chronological schedule of quality milestones. Ascending priority by validity date.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                            {sortedRoadmap.filter(i => i.isActive).length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="pl-8 py-4">
                                                <Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('name')}>
                                                    Academic Program Offering {getSortIcon('name')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-4">
                                                <Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('campus')}>
                                                    Campus Site {getSortIcon('campus')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-4">
                                                <Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('currentLevel')}>
                                                    Current Level {getSortIcon('currentLevel')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-4">
                                                <Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('validity')}>
                                                    Validity Date {getSortIcon('validity')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-right pr-8 py-4">
                                                <Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>
                                                    Status {getSortIcon('status')}
                                                </Button>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedRoadmap.filter(i => i.isActive).map(item => (
                                            <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                                                <TableCell className="pl-8 py-5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-black text-sm text-slate-900 leading-none group-hover:text-primary transition-colors">{item.name}</span>
                                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.level}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-tighter"><School className="h-3.5 w-3.5 opacity-40" /> {item.campus}</div></TableCell>
                                                <TableCell className="py-5"><Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 bg-primary/5 uppercase">{item.currentLevel}</Badge></TableCell>
                                                <TableCell className="py-5">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={cn("text-xs font-black uppercase tracking-tighter", item.validity === 'AWAITING RESULT' ? "text-blue-600" : "text-slate-700")}>{item.validity}</span>
                                                        {item.validity !== 'NEW PROGRAM' && item.validity !== 'AWAITING RESULT' && (
                                                            <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-tighter w-fit h-4 border-none", getYearBadgeStyle(item.validity.match(/\d{4}/)?.[0] || ''))}>
                                                                AY {item.validity.match(/\d{4}/)?.[0] || ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right pr-8 py-5">
                                                    <Badge className={cn(
                                                        "text-[10px] font-black uppercase border-none px-3 shadow-sm",
                                                        item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : 
                                                        item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : 
                                                        item.status === 'AWAITING RESULT' ? "bg-blue-600 text-white" : 
                                                        item.status === 'NEW PROGRAM' ? "bg-amber-500 text-amber-950" :
                                                        "bg-indigo-600 text-white"
                                                    )}>
                                                        {item.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                            )}
                        </ScrollArea>
                    </CardContent>
                    <CardFooter className="bg-muted/10 border-t py-4"><div className="flex items-start gap-3"><Info className="h-4 w-4 text-blue-600" /><p className="text-[10px] text-muted-foreground italic font-medium"><strong>Process Order:</strong> This roadmap is sorted chronologically by validity date. Items appearing at the top are the most urgent quality priorities for the current fiscal year cycle.</p></div></CardFooter>
                </Card>
            </TabsContent>

            <TabsContent value="inactive" className="animate-in fade-in slide-in-from-right-2 duration-300">
                <Card className="shadow-md border-slate-200 overflow-hidden bg-slate-50/50">
                    <CardHeader className="bg-slate-100 border-b py-4">
                        <div className="flex items-center gap-2">
                            <FileX className="h-5 w-5 text-slate-500" />
                            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-600">Closed Program History Archive</CardTitle>
                        </div>
                        <CardDescription className="text-[10px] font-bold uppercase">Legacy quality records for programs no longer in active operation.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                            {sortedRoadmap.filter(i => !i.isActive).length > 0 ? (
                                <Table>
                                    <TableHeader className="bg-slate-200/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="pl-8 py-4">
                                                <Button variant="ghost" className="p-0 text-[9px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('name')}>
                                                    Historical Offering {getSortIcon('name')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="py-4">
                                                <Button variant="ghost" className="p-0 text-[9px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('currentLevel')}>
                                                    Last Level Held {getSortIcon('currentLevel')}
                                                </Button>
                                            </TableHead>
                                            <TableHead className="text-right pr-8 py-4">
                                                <Button variant="ghost" className="p-0 text-[9px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('validity')}>
                                                    Legacy Validity {getSortIcon('validity')}
                                                </Button>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedRoadmap.filter(i => !i.isActive).map(item => (
                                            <TableRow key={item.id} className="opacity-60 grayscale hover:grayscale-0 transition-all">
                                                <TableCell className="pl-8 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-xs text-slate-700">{item.name}</span>
                                                        <span className="text-[8px] font-black text-muted-foreground uppercase">{item.campus}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge variant="outline" className="h-4 text-[8px] uppercase">{item.currentLevel}</Badge></TableCell>
                                                <TableCell className="text-right pr-8 text-[9px] font-mono">{item.validity}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground opacity-40"><Activity className="h-12 w-12 mb-2" /><p className="text-xl font-black uppercase tracking-[0.2em]">NO DATA YET!</p></div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
