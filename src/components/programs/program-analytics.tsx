'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, AccreditationRecord, Campus, Unit } from '@/lib/types';
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
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger
} from '@/components/ui/tabs';
import { 
    Award, 
    TrendingUp, 
    Activity, 
    School, 
    CheckCircle2,
    ShieldCheck,
    ShieldAlert,
    Info,
    UserCircle,
    FileWarning,
    Briefcase,
    LayoutGrid,
    Clock,
    BarChart3,
    CalendarDays,
    AlertTriangle,
    Building,
    LayoutList,
    Target,
    Zap,
    Users,
    ChevronRight,
    History,
    FileX,
    GraduationCap,
    HeartPulse,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { useUser } from '@/firebase';
import { ScrollArea } from '../ui/scroll-area';
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

const YEAR_COLORS: Record<string, { bg: string, text: string, border: string, row: string }> = {
    '2024': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', row: 'bg-blue-50/30' },
    '2025': { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', row: 'bg-green-50/30' },
    '2026': { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', row: 'bg-amber-50/30' },
    '2027': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', row: 'bg-purple-50/30' },
    '2028': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', row: 'bg-rose-50/30' },
    'Default': { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', row: 'bg-transparent' }
};

const getYearStyle = (year: string) => {
    if (year === 'Pending') return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', row: 'bg-blue-50/30' };
    if (Number(year) <= 2024) return YEAR_COLORS['2024'];
    return YEAR_COLORS[year] || YEAR_COLORS['Default'];
};

const ACCREDITATION_LEVELS_ORDER = [
    'Level IV Re-accredited', 'Level IV Accredited',
    'Level III Re-accredited', 'Level III Accredited',
    'Level II Re-accredited', 'Level II Accredited',
    'Level I Re-accredited', 'Level I Accredited',
    'PSV', 'Non Accredited', 'Not Yet Subject'
];

type ProgramCategory = 'Undergraduate' | 'Graduate' | 'Closed';

const chartConfig = {
    Undergraduate: { label: 'Undergraduate (Active)', color: 'hsl(var(--primary))' },
    Graduate: { label: 'Graduate (Active)', color: 'hsl(var(--chart-2))' },
    Closed: { label: 'CLOSED PROGRAMS', color: 'hsl(var(--muted-foreground))' },
    Male: { label: 'Male', color: 'hsl(var(--chart-1))' },
    Female: { label: 'Female', color: 'hsl(var(--chart-2))' },
    School: { label: 'Institutional Rate', color: 'hsl(var(--primary))' },
    National: { label: 'National Average', color: 'hsl(var(--muted-foreground))' }
};

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const { userRole, isAdmin } = useUser();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const filteredProgramIds = new Set(programs.map(p => p.id));
    const filteredCompliances = compliances.filter(c => filteredProgramIds.has(c.programId));

    const getProgramCategory = (p: AcademicProgram): ProgramCategory => {
        if (!p.isActive) return 'Closed';
        return p.level === 'Graduate' ? 'Graduate' : 'Undergraduate';
    };

    // --- 1. Portfolio Breakdown Stats ---
    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let inactiveAccredited = 0;
    let activeCopc = 0;
    let inactiveCopc = 0;

    // GAD Accumulators
    let totalMaleEnrollment = 0;
    let totalFemaleEnrollment = 0;
    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;
    let totalMaleTraced = 0;
    let totalFemaleTraced = 0;
    
    const uniqueFacultySet = new Set<string>();
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;

    // Board Aggregates
    let totalSchoolRate = 0;
    let totalNationalRate = 0;
    let boardCount = 0;

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (category === 'Closed') inactiveCount++;
        else activeCount++;

        const record = filteredCompliances.find(c => c.programId === p.id);
        const isAccredited = (rec: ProgramComplianceRecord | undefined) => {
            if (!rec || !rec.accreditationRecords || rec.accreditationRecords.length === 0) return false;
            const milestones = rec.accreditationRecords;
            const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            return current && current.level !== 'Non Accredited' && !current.level.includes('PSV');
        };
        const hasCopc = (rec: ProgramComplianceRecord | undefined) => rec?.ched?.copcStatus === 'With COPC';

        if (category === 'Closed') {
            if (isAccredited(record)) inactiveAccredited++;
            if (hasCopc(record)) inactiveCopc++;
        } else {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        }

        // --- GAD GATHERING ---
        if (record) {
            // Enrollment
            const s1 = record.stats?.enrollment?.firstSemester;
            if (s1) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                    totalMaleEnrollment += Number(s1[lvl]?.male || 0);
                    totalFemaleEnrollment += Number(s1[lvl]?.female || 0);
                });
            }

            // Faculty Deduplication (Institutional scale)
            if (record.faculty) {
                const roster = [...(record.faculty.members || [])];
                if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
                if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
                
                roster.forEach(m => {
                    if (!m.name) return;
                    const key = `${m.name.trim()}-${p.campusId}`.toLowerCase();
                    if (!uniqueFacultySet.has(key)) {
                        uniqueFacultySet.add(key);
                        if (m.sex === 'Male') totalMaleFaculty++;
                        else if (m.sex === 'Female') totalFemaleFaculty++;
                    }
                });
            }

            // Graduation
            record.graduationRecords?.forEach(g => {
                totalMaleGrads += Number(g.maleCount || 0);
                totalFemaleGrads += Number(g.femaleCount || 0);
            });

            // Tracing
            record.tracerRecords?.forEach(t => {
                totalMaleTraced += Number(t.maleTraced || 0);
                totalFemaleTraced += Number(t.femaleTraced || 0);
            });

            // Board
            if (record.boardPerformance && record.boardPerformance.length > 0) {
                const latest = record.boardPerformance[record.boardPerformance.length - 1];
                totalSchoolRate += latest.overallPassRate;
                totalNationalRate += latest.nationalPassingRate;
                boardCount++;
            }
        }
    });

    // --- 2. Chart Formatting ---
    const gadEnrollmentData = [
        { name: 'Male', value: totalMaleEnrollment, fill: chartConfig.Male.color },
        { name: 'Female', value: totalFemaleEnrollment, fill: chartConfig.Female.color }
    ].filter(d => d.value > 0);

    const gadFacultyData = [
        { name: 'Male', value: totalMaleFaculty, fill: chartConfig.Male.color },
        { name: 'Female', value: totalFemaleFaculty, fill: chartConfig.Female.color }
    ].filter(d => d.value > 0);

    const gadGraduationData = [
        { name: 'Male', value: totalMaleGrads, fill: chartConfig.Male.color },
        { name: 'Female', value: totalFemaleGrads, fill: chartConfig.Female.color }
    ].filter(d => d.value > 0);

    const gadTracerData = [
        { name: 'Male', value: totalMaleTraced, fill: chartConfig.Male.color },
        { name: 'Female', value: totalFemaleTraced, fill: chartConfig.Female.color }
    ].filter(d => d.value > 0);

    const boardPerfData = boardCount > 0 ? [
        { name: 'School', rate: Math.round(totalSchoolRate / boardCount), fill: chartConfig.School.color },
        { name: 'National', rate: Math.round(totalNationalRate / boardCount), fill: chartConfig.National.color }
    ] : [];

    // --- 3. Accreditation Level Summary ---
    const accreditationDataMap: Record<string, { level: string, Undergraduate: number, Graduate: number, Closed: number, total: number }> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => {
        accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Closed: 0, total: 0 };
    });
    
    programs.forEach(p => {
        const category = getProgramCategory(p);
        let accLevelKey = 'Non Accredited';

        if (p.isNewProgram) {
            accLevelKey = 'Not Yet Subject';
        } else {
            const record = filteredCompliances.find(c => c.programId === p.id);
            if (record && record.accreditationRecords && record.accreditationRecords.length > 0) {
                const milestones = record.accreditationRecords;
                const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                accLevelKey = latest?.level || 'Non Accredited';
                if (accLevelKey.includes('Preliminary Survey Visit')) accLevelKey = 'PSV';
            }
        }

        if (accreditationDataMap[accLevelKey]) {
            accreditationDataMap[accLevelKey][category]++;
            accreditationDataMap[accLevelKey].total++;
        }
    });

    const accreditationSummary = Object.values(accreditationDataMap)
        .filter(d => d.total > 0)
        .sort((a, b) => b.total - a.total);

    // --- 4. COPC Recognition Momentum ---
    const copcYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Closed: number }> = {};
    filteredCompliances.forEach(c => {
        if (c.ched?.copcStatus === 'With COPC' && c.ched.copcAwardDate) {
            const yearMatch = c.ched.copcAwardDate.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                const p = programs.find(prog => prog.id === c.programId);
                if (p) {
                    const category = getProgramCategory(p);
                    if (!copcYearlyMap[year]) {
                        copcYearlyMap[year] = { year, Undergraduate: 0, Graduate: 0, Closed: 0 };
                    }
                    copcYearlyMap[year][category]++;
                }
            }
        }
    });
    const copcHistoryData = Object.values(copcYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    // --- 5. Campus Performance Aggregation ---
    const campusPerformanceData = campuses.map(campus => {
        const campusPrograms = programs.filter(p => p.campusId === campus.id);
        const total = campusPrograms.length;
        
        if (total === 0) return null;

        let activeAccreditedCount = 0;
        let inactiveAccreditedCount = 0;
        let activeCopcCount = 0;
        let inactiveCopcCount = 0;

        campusPrograms.forEach(p => {
            const record = filteredCompliances.find(c => c.programId === p.id);
            const category = getProgramCategory(p);
            
            if (record) {
                const hasCopc = record.ched?.copcStatus === 'With COPC';
                const milestones = record.accreditationRecords || [];
                const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                const isAccredited = current && current.level !== 'Non Accredited' && current.level !== 'Preliminary Survey Visit (PSV)';

                if (category === 'Closed') {
                    if (hasCopc) inactiveCopcCount++;
                    if (isAccredited) inactiveAccreditedCount++;
                } else {
                    if (hasCopc) activeCopcCount++;
                    if (isAccredited) activeAccreditedCount++;
                }
            }
        });

        return {
            id: campus.id,
            name: campus.name,
            total,
            activeCount: campusPrograms.filter(p => p.isActive).length,
            inactiveCount: campusPrograms.filter(p => !p.isActive).length,
            activeAccreditedCount,
            inactiveAccreditedCount,
            activeCopcCount,
            inactiveCopcCount
        };
    }).filter(Boolean).sort((a: any, b: any) => b.total - a.total);

    // --- 6. Missing Document Audit ---
    const missingDocs: { programName: string, campusName: string, items: string[] }[] = [];
    programs.forEach(p => {
        const record = filteredCompliances.find(c => c.programId === p.id);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const items: string[] = [];

        if (!record) {
            items.push(`Full AY ${selectedYear} Compliance Data`);
        } else {
            if (record.ched?.copcStatus !== 'With COPC') items.push("COPC Certificate");
            if (!record.ched?.programCmoLink) items.push("Official CMO Link");
            if (!p.isNewProgram && (!record.accreditationRecords || record.accreditationRecords.length === 0)) items.push("Accreditation Milestone");
            if (!record.faculty?.members || record.faculty.members.length === 0) items.push("Faculty Staffing List");
            if (!record.graduationRecords || record.graduationRecords.length === 0) items.push("Graduation Outcome Data");
        }

        if (items.length > 0) {
            missingDocs.push({ programName: p.name, campusName, items });
        }
    });

    return { 
        accreditationSummary, 
        activeCount, inactiveCount,
        activeAccredited, inactiveAccredited,
        activeCopc, inactiveCopc,
        copcHistoryData,
        campusPerformanceData,
        missingDocs,
        gadEnrollmentData,
        gadFacultyData,
        gadGraduationData,
        gadTracerData,
        boardPerfData,
        totalPrograms: programs.length, 
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campusMap, unitMap, selectedYear, campuses]);

  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      
      {/* KPI PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Scope Portfolio</CardTitle></CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-primary tabular-nums">{analytics?.activeCount} Active</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">{analytics?.inactiveCount} Closed Programs</p>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">COPC Performance</CardTitle></CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-green-600 tabular-nums">{analytics?.activeCopc} Active</div>
                <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase">{analytics?.inactiveCopc} Closed Awards</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Quality Maturity</CardTitle></CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics?.activeAccredited} Active</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">{analytics?.inactiveAccredited} Closed Accredited</p>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm flex flex-col">
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Monitored Registry</CardTitle></CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.monitoredCount}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Total verified AY {selectedYear} data</p>
            </CardContent>
        </Card>
      </div>

      {/* --- GAD & OUTCOMES DASHBOARD --- */}
      <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 text-primary">
              <Users className="h-5 w-5" />
              <h3 className="text-lg font-black uppercase tracking-tight">Institutional Human Resource & Student Demographics (GAD)</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 1. ENROLLMENT GAD */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" /> Sex-Aggregated Enrollment
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie 
                                    data={analytics?.gadEnrollmentData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} outerRadius={70} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                      {analytics?.gadEnrollmentData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                  </Pie>
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-2">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Insight:</strong> Real-time student distribution based on semester registry logs.
                      </p>
                  </CardFooter>
              </Card>

              {/* 2. FACULTY GAD */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-primary" /> Sex-Aggregated Faculty Profiles
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie 
                                    data={analytics?.gadFacultyData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} outerRadius={70} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                      {analytics?.gadFacultyData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                  </Pie>
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-2">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Insight:</strong> Deduplicated headcount of <strong>SYSTEM REGISTERED USERS</strong> (teaching staff).
                      </p>
                  </CardFooter>
              </Card>

              {/* 3. GRADUATION GAD */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-primary" /> Sex-Aggregated Graduation
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie 
                                    data={analytics?.gadGraduationData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} outerRadius={70} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                      {analytics?.gadGraduationData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                  </Pie>
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-2">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Insight:</strong> Accumulated graduate output distribution for the academic year.
                      </p>
                  </CardFooter>
              </Card>

              {/* 4. BOARD PERFORMANCE */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-primary" /> Institutional Board Performance
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                      {analytics?.boardPerfData.length ? (
                          <ChartContainer config={chartConfig} className="h-[250px] w-full">
                              <ResponsiveContainer>
                                  <BarChart data={analytics?.boardPerfData} layout="vertical">
                                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                      <XAxis type="number" hide domain={[0, 100]} />
                                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 700 }} width={80} axisLine={false} tickLine={false} />
                                      <RechartsTooltip content={<ChartTooltipContent />} />
                                      <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={20}>
                                          <LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fontWeight: '900' }} />
                                          {analytics.boardPerfData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                      </Bar>
                                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '10px' }} />
                                  </BarChart>
                              </ResponsiveContainer>
                          </ChartContainer>
                      ) : (
                          <div className="h-full flex items-center justify-center opacity-20"><Target className="h-12 w-12" /></div>
                      )}
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-2">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Insight:</strong> Comparison between University passing rates and National benchmarks.
                      </p>
                  </CardFooter>
              </Card>

              {/* 5. GRADUATE TRACING GAD */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <Search className="h-4 w-4 text-primary" /> Sex-Aggregated Graduate Tracing
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 flex-1">
                      <ChartContainer config={chartConfig} className="h-[250px] w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Pie 
                                    data={analytics?.gadTracerData} 
                                    cx="50%" cy="50%" 
                                    innerRadius={40} outerRadius={70} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                  >
                                      {analytics?.gadTracerData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                  </Pie>
                                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
                  <CardFooter className="bg-muted/5 border-t py-2">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Insight:</strong> Sex distribution of graduates captured in official Tracer Studies.
                      </p>
                  </CardFooter>
              </Card>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 20, right: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="level" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                            <Bar dataKey="Undergraduate" fill={chartConfig.Undergraduate.color} radius={[0, 4, 4, 0]} barSize={10}><LabelList dataKey="Undergraduate" position="right" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Undergraduate.color }} /></Bar>
                            <Bar dataKey="Graduate" fill={chartConfig.Graduate.color} radius={[0, 4, 4, 0]} barSize={10}><LabelList dataKey="Graduate" position="right" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Graduate.color }} /></Bar>
                            <Bar dataKey="Closed" fill={chartConfig.Closed.color} radius={[0, 4, 4, 0]} barSize={10}><LabelList dataKey="Closed" position="right" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Closed.color }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Parity Benchmarking</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Campus Site</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3">Active Acc.</TableHead>
                            <TableHead className="text-center font-black text-[10px] uppercase py-3">Active COPC</TableHead>
                            <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">Total Offerings</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analytics?.campusPerformanceData.map((campus: any) => (
                            <TableRow key={campus.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="py-3 pl-6"><span className="text-xs font-black text-slate-800 uppercase">{campus.name}</span></TableCell>
                                <TableCell className="text-center"><span className="text-xs font-black text-primary">{campus.activeAccreditedCount}</span></TableCell>
                                <TableCell className="text-center"><span className="text-xs font-black text-emerald-600">{campus.activeCopcCount}</span></TableCell>
                                <TableCell className="text-right pr-6"><span className="text-xs font-black text-slate-400">{campus.total}</span></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
