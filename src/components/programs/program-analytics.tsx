'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit } from '@/lib/types';
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
    ShieldAlert
} from 'lucide-react';
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
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

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

    // Institutional Gaps Accumulator
    const institutionalGaps: { type: string; msg: string; priority: 'High' | 'Medium'; campus: string }[] = [];
    const currentYearNum = new Date().getFullYear();

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (category === 'Closed') inactiveCount++;
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

        if (category === 'Closed') {
            if (isAccredited(record)) inactiveAccredited++;
            if (hasCopc(record)) inactiveCopc++;
        } else {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        }

        // --- GAP ANALYSIS (Institutional Level) ---
        if (p.isActive) {
            if (!record) {
                institutionalGaps.push({ type: 'Registry Gap', msg: `${p.name}: No compliance data recorded for AY ${selectedYear}.`, priority: 'High', campus: cName });
            } else {
                if (record.ched?.copcStatus !== 'With COPC') {
                    institutionalGaps.push({ type: 'Authority', msg: `${p.name}: Operating without verified COPC status.`, priority: 'High', campus: cName });
                }
                
                // Faculty Check
                const facultyRoster = record.faculty?.members || [];
                const alignedCount = facultyRoster.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                if (facultyRoster.length > 0 && alignedCount < facultyRoster.length) {
                    institutionalGaps.push({ type: 'Resource', msg: `${p.name}: ${facultyRoster.length - alignedCount} faculty members not aligned with CMO requirements.`, priority: 'Medium', campus: cName });
                }

                // Accreditation Overdue Check
                if (!p.isNewProgram) {
                    const milestones = record.accreditationRecords || [];
                    const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                    const validityDate = current?.statusValidityDate;
                    const yearMatch = validityDate?.match(/\d{4}/);
                    if (yearMatch && parseInt(yearMatch[0]) < currentYearNum) {
                        institutionalGaps.push({ type: 'Quality', msg: `${p.name}: Accreditation is OVERDUE (Expired: ${validityDate}).`, priority: 'High', campus: cName });
                    }
                }
            }
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

            // SYSTEM REGISTERED USER Deduplication
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
        { name: 'Institutional Rate', rate: Math.round(totalSchoolRate / boardCount), fill: chartConfig.School.color },
        { name: 'National Average', rate: Math.round(totalNationalRate / boardCount), fill: chartConfig.National.color }
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

    // --- 4. Campus Performance Aggregation ---
    const campusPerformanceData = campuses.map(campus => {
        const campusPrograms = programs.filter(p => p.campusId === campus.id);
        const total = campusPrograms.length;
        
        if (total === 0) return null;

        let activeAccreditedCount = 0;
        let activeCopcCount = 0;

        campusPrograms.forEach(p => {
            const record = filteredCompliances.find(c => c.programId === p.id);
            const category = getProgramCategory(p);
            
            if (record && category !== 'Closed') {
                const hasCopc = record.ched?.copcStatus === 'With COPC';
                const milestones = record.accreditationRecords || [];
                const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                const isAccredited = current && current.level !== 'Non Accredited' && current.level !== 'Preliminary Survey Visit (PSV)';

                if (hasCopc) activeCopcCount++;
                if (isAccredited) activeAccreditedCount++;
            }
        });

        return {
            id: campus.id,
            name: campus.name,
            total,
            activeCount: campusPrograms.filter(p => p.isActive).length,
            activeAccreditedCount,
            activeCopcCount
        };
    }).filter(Boolean).sort((a: any, b: any) => b.total - a.total);

    return { 
        accreditationSummary, 
        activeCount, inactiveCount,
        activeAccredited, inactiveAccredited,
        activeCopc, inactiveCopc,
        campusPerformanceData,
        gadEnrollmentData,
        gadFacultyData,
        gadGraduationData,
        gadTracerData,
        boardPerfData,
        institutionalGaps,
        totalPrograms: programs.length, 
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campuses, campusMap, selectedYear]);

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

      {/* --- CRITICAL OVERSIGHT: INSTITUTIONAL GAPS --- */}
      {analytics && analytics.institutionalGaps.length > 0 && (
          <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive opacity-50" />
              <CardHeader className="bg-destructive/10 border-b py-4">
                  <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-destructive">
                          <ShieldAlert className="h-5 w-5 text-destructive" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Registry Gaps: AY {selectedYear}</CardTitle>
                      </div>
                      <Badge variant="destructive" className="animate-pulse shadow-sm h-5 text-[9px] font-black uppercase">SYSTEM ALERTS</Badge>
                  </div>
              </CardHeader>
              <CardContent className="p-0">
                  <ScrollArea className="max-h-[300px]">
                      <div className="p-6 space-y-4">
                          {analytics.institutionalGaps.map((gap, i) => (
                              <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl border border-destructive/10 shadow-sm hover:border-destructive/30 transition-all">
                                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                      <AlertTriangle className="h-4 w-4 text-destructive" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                          <p className="text-[10px] font-black text-destructive uppercase tracking-[0.1em]">{gap.type}</p>
                                          <Badge variant="outline" className="h-4 text-[8px] font-black uppercase bg-slate-50">{gap.campus}</Badge>
                                      </div>
                                      <p className="text-xs font-bold text-slate-800 leading-snug">{gap.msg}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </ScrollArea>
              </CardContent>
              <CardFooter className="bg-destructive/5 border-t py-2 px-6">
                  <p className="text-[9px] text-destructive font-bold uppercase italic">These flags identify systemic weaknesses across the university registry.</p>
              </CardFooter>
          </Card>
      )}

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
                  <CardFooter className="bg-muted/5 border-t py-2 px-4">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Guidance for usage:</strong> Aggregated headcount based on academic unit enrollment logs.
                      </p>
                  </CardFooter>
              </Card>

              {/* 2. FACULTY GAD (SYSTEM REGISTERED USER) */}
              <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
                  <CardHeader className="pb-2 border-b bg-muted/10">
                      <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                          <UserCircle className="h-4 w-4 text-primary" /> Sex-Aggregated SYSTEM REGISTERED USER
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
                  <CardFooter className="bg-muted/5 border-t py-2 px-4">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Guidance for usage:</strong> Unique headcount of teaching staff registered across all programs.
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
                  <CardFooter className="bg-muted/5 border-t py-2 px-4">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Guidance for usage:</strong> Institutional output distribution for the selected academic year.
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
                  <CardFooter className="bg-muted/5 border-t py-2 px-4">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Guidance for usage:</strong> Comparison of University passing rates against National benchmarks.
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
                  <CardFooter className="bg-muted/5 border-t py-2 px-4">
                      <p className="text-[9px] text-muted-foreground italic leading-tight">
                          <strong>Guidance for usage:</strong> Distribution of graduates captured in official institutional tracking studies.
                      </p>
                  </CardFooter>
              </Card>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
        {/* ACCREDITATION PROFILE */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of programs across AACCUP accreditation levels.</CardDescription>
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
            <CardFooter className="bg-muted/5 border-t py-3">
                <div className="flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        <strong>Guidance for usage:</strong> Higher segments in Level III and IV indicate mature institutional processes and excellence.
                    </p>
                </div>
            </CardFooter>
        </Card>

        {/* CAMPUS PARITY */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <School className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Parity Benchmarking</CardTitle>
                </div>
                <CardDescription className="text-xs">Active offerings with verified institutional authority per site.</CardDescription>
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
            <CardFooter className="bg-muted/5 border-t py-3">
                <div className="flex items-start gap-3">
                    <Info className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground italic leading-tight">
                        <strong>Guidance for usage:</strong> Compares site-level quality metrics to identify sites requiring accelerated accreditation support.
                    </p>
                </div>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}