
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
    ShieldAlert,
    Calendar,
    ChevronRight,
    Flag,
    History
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
    Undergraduate: { label: 'Undergraduate', color: 'hsl(var(--primary))' },
    Graduate: { label: 'Graduate', color: 'hsl(var(--chart-2))' },
    Closed: { label: 'Closed Programs', color: 'hsl(var(--muted-foreground))' },
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

    // --- Aggregators ---
    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let activeCopc = 0;

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

    // Momentum/Timeline Accumulators
    const copcByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Closed: number }> = {};
    const velocityByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Closed: number }> = {};
    const achievementByYear: Record<string, { year: string, Undergraduate: number, Graduate: number, Closed: number }> = {};
    
    // Board Aggregates
    let totalSchoolRate = 0;
    let totalNationalRate = 0;
    let boardCount = 0;

    const institutionalGaps: { type: string; msg: string; priority: 'High' | 'Medium'; campus: string }[] = [];
    const roadmapData: any[] = [];
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

        if (category !== 'Closed') {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        }

        // --- MOMENTUM & HISTORY LOGIC ---
        if (record) {
            // COPC Momentum
            const copcYear = record.ched?.copcAwardDate?.match(/\d{4}/)?.[0];
            if (copcYear) {
                if (!copcByYear[copcYear]) copcByYear[copcYear] = { year: copcYear, Undergraduate: 0, Graduate: 0, Closed: 0 };
                copcByYear[copcYear][category]++;
            }

            // Accreditation Achievements & Velocity
            const milestones = record.accreditationRecords || [];
            milestones.forEach(m => {
                // History (based on survey date)
                const surveyYear = m.dateOfSurvey?.match(/\d{4}/)?.[0];
                if (surveyYear) {
                    if (!achievementByYear[surveyYear]) achievementByYear[surveyYear] = { year: surveyYear, Undergraduate: 0, Graduate: 0, Closed: 0 };
                    achievementByYear[surveyYear][category]++;
                }
            });

            // Velocity (based on next validity date)
            const currentMilestone = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            const validityYear = currentMilestone?.statusValidityDate?.match(/\d{4}/)?.[0];
            if (validityYear) {
                if (!velocityByYear[validityYear]) velocityByYear[validityYear] = { year: validityYear, Undergraduate: 0, Graduate: 0, Closed: 0 };
                velocityByYear[validityYear][category]++;
            }

            // --- ROADMAP COMPILATION ---
            if (p.isActive) {
                let status: 'COMPLIANT' | 'OVERDUE' | 'AWAITING RESULT' | 'RESULT PENDING' | 'TBA' = 'TBA';
                let validityStr = currentMilestone?.statusValidityDate || 'TBA';
                
                if (currentMilestone?.lifecycleStatus === 'Waiting for Official Result') {
                    status = 'AWAITING RESULT';
                } else {
                    const yearMatch = validityStr.match(/\d{4}/);
                    const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                    if (dYear > 0 && dYear < currentYearNum) status = 'OVERDUE';
                    else if (dYear >= currentYearNum) status = 'COMPLIANT';
                }

                roadmapData.push({
                    id: p.id,
                    name: p.name,
                    level: p.level,
                    campus: cName,
                    currentLevel: currentMilestone?.level || 'Non-Accredited',
                    validity: validityStr,
                    status
                });
            }
        }

        // --- GAP ANALYSIS (Institutional Level) ---
        if (p.isActive) {
            if (!record) {
                institutionalGaps.push({ type: 'Registry Gap', msg: `${p.name}: No compliance data recorded for AY ${selectedYear}.`, priority: 'High', campus: cName });
            } else {
                if (record.ched?.copcStatus !== 'With COPC') {
                    institutionalGaps.push({ type: 'Authority', msg: `${p.name}: Operating without verified COPC status.`, priority: 'High', campus: cName });
                }
                const facultyRoster = record.faculty?.members || [];
                const alignedCount = facultyRoster.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                if (facultyRoster.length > 0 && alignedCount < facultyRoster.length) {
                    institutionalGaps.push({ type: 'Resource', msg: `${p.name}: ${facultyRoster.length - alignedCount} faculty members not aligned with CMO requirements.`, priority: 'Medium', campus: cName });
                }
            }
        }

        // --- GAD GATHERING ---
        if (record) {
            const s1 = record.stats?.enrollment?.firstSemester;
            if (s1) {
                ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                    totalMaleEnrollment += Number(s1[lvl]?.male || 0);
                    totalFemaleEnrollment += Number(s1[lvl]?.female || 0);
                });
            }
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

    // Finalize Chart Data
    const accreditationDataMap: Record<string, any> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Closed: 0, total: 0 });
    programs.forEach(p => {
        const cat = getProgramCategory(p);
        let lvlKey = 'Non Accredited';
        if (p.isNewProgram) lvlKey = 'Not Yet Subject';
        else {
            const rec = filteredCompliances.find(c => c.programId === p.id);
            const mil = rec?.accreditationRecords || [];
            const cur = mil.find(m => m.lifecycleStatus === 'Current') || mil[mil.length - 1];
            lvlKey = cur?.level || 'Non Accredited';
            if (lvlKey.includes('PSV')) lvlKey = 'PSV';
        }
        if (accreditationDataMap[lvlKey]) { accreditationDataMap[lvlKey][cat]++; accreditationDataMap[lvlKey].total++; }
    });

    const sortTimeline = (data: Record<string, any>) => Object.values(data).sort((a, b) => a.year.localeCompare(b.year));

    return { 
        accreditationSummary: Object.values(accreditationDataMap).filter(d => d.total > 0),
        activeCount, inactiveCount, activeAccredited, activeCopc,
        copcMomentumData: sortTimeline(copcByYear),
        velocityData: sortTimeline(velocityByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        roadmapData: roadmapData.sort((a, b) => a.status === 'OVERDUE' ? -1 : 1),
        gadEnrollmentData: [{ name: 'Male', value: totalMaleEnrollment, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleEnrollment, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        gadFacultyData: [{ name: 'Male', value: totalMaleFaculty, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleFaculty, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        gadGraduationData: [{ name: 'Male', value: totalMaleGrads, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleGrads, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        gadTracerData: [{ name: 'Male', value: totalMaleTraced, fill: chartConfig.Male.color }, { name: 'Female', value: totalFemaleTraced, fill: chartConfig.Female.color }].filter(d => d.value > 0),
        boardPerfData: boardCount > 0 ? [{ name: 'School', rate: Math.round(totalSchoolRate / boardCount), fill: chartConfig.School.color }, { name: 'National', rate: Math.round(totalNationalRate / boardCount), fill: chartConfig.National.color }] : [],
        institutionalGaps,
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campuses, campusMap, selectedYear]);

  if (isLoading) return <div className="space-y-6"><Skeleton className="h-24 w-full" /><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div></div>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {/* KPI PANEL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-muted-foreground">Scope Portfolio</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-primary">{analytics?.activeCount} Active</div><p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">{analytics?.inactiveCount} Closed Programs</p></CardContent></Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-green-700">COPC Authority</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-green-600">{analytics?.activeCopc} Active</div><p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase">Institutional Authority Verified</p></CardContent></Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-amber-700">Quality Maturity</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-amber-600">{analytics?.activeAccredited} Active</div><p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Level I or Higher</p></CardContent></Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm"><CardHeader className="pb-2"><CardTitle className="text-xs uppercase font-bold text-blue-700">Monitored Data</CardTitle></CardHeader><CardContent><div className="text-3xl font-black text-blue-600">{analytics?.monitoredCount}</div><p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Total verified AY {selectedYear} data</p></CardContent></Card>
      </div>

      {/* INSTITUTIONAL GAPS */}
      {analytics && analytics.institutionalGaps.length > 0 && (
          <Card className="border-destructive/30 shadow-xl overflow-hidden bg-destructive/5 relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-destructive opacity-50" />
              <CardHeader className="bg-destructive/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-destructive"><ShieldAlert className="h-5 w-5" /><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Registry Gaps: AY {selectedYear}</CardTitle></div><Badge variant="destructive" className="animate-pulse h-5 text-[9px] font-black uppercase">ALERTS</Badge></div>
              </CardHeader>
              <CardContent className="p-0"><ScrollArea className="max-h-[300px]"><div className="p-6 space-y-4">{analytics.institutionalGaps.map((gap, i) => (<div key={i} className="flex items-start gap-4 bg-white p-4 rounded-xl border border-destructive/10"><div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0"><AlertTriangle className="h-4 w-4 text-destructive" /></div><div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2 mb-1"><p className="text-[10px] font-black text-destructive uppercase">{gap.type}</p><Badge variant="outline" className="h-4 text-[8px] font-black uppercase bg-slate-50">{gap.campus}</Badge></div><p className="text-xs font-bold text-slate-800 leading-snug">{gap.msg}</p></div></div>))}</div></ScrollArea></CardContent>
          </Card>
      )}

      {/* STRATEGIC GAD PANEL */}
      <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs border-b pb-2"><Users className="h-4 w-4" /> Gender & Development (GAD) Compliance Metrics</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                  { title: 'Student Enrollment', data: analytics?.gadEnrollmentData, icon: <Users /> },
                  { title: 'Registered Users', data: analytics?.gadFacultyData, icon: <UserCircle /> },
                  { title: 'Graduation Output', data: analytics?.gadGraduationData, icon: <GraduationCap /> },
                  { title: 'Graduate Tracing', data: analytics?.gadTracerData, icon: <Search /> },
                  { title: 'Board Performance', chart: 'bar', data: analytics?.boardPerfData, icon: <ShieldCheck /> }
              ].map((card, i) => (
                  <Card key={i} className="shadow-md flex flex-col border-primary/10 overflow-hidden">
                      <CardHeader className="p-3 bg-muted/10 border-b"><CardTitle className="text-[10px] font-black uppercase flex items-center gap-2">{card.icon} {card.title}</CardTitle></CardHeader>
                      <CardContent className="pt-4 flex-1">
                          {card.chart === 'bar' ? (
                              <ChartContainer config={chartConfig} className="h-24"><ResponsiveContainer><BarChart data={card.data} layout="vertical"><XAxis type="number" hide domain={[0, 100]} /><YAxis dataKey="name" type="category" hide /><RechartsTooltip content={<ChartTooltipContent />} /><Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={12}><LabelList dataKey="rate" position="right" formatter={(v: any) => `${v}%`} style={{ fontSize: '10px', fontWeight: '900' }} /></Bar></BarChart></ResponsiveContainer></ChartContainer>
                          ) : (
                              <ChartContainer config={chartConfig} className="h-24"><ResponsiveContainer><PieChart><Pie data={card.data} cx="50%" cy="50%" innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value"><LabelList dataKey="name" position="outside" style={{ fontSize: '8px' }} />{card.data?.map((e: any, j: any) => <Cell key={j} fill={e.fill} />)}</Pie></PieChart></ResponsiveContainer></ChartContainer>
                          )}
                      </CardContent>
                      <CardFooter className="p-2 border-t bg-muted/5"><p className="text-[8px] text-muted-foreground italic leading-tight">Institutional GAD Registry Analysis.</p></CardFooter>
                  </Card>
              ))}
          </div>
      </div>

      {/* CORE STRATEGIC REPORTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. ACCREDITATION MATURITY PROFILE */}
          <Card className="shadow-lg border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-primary/5 text-primary border-primary/20">OVERALL TOTAL: {analytics?.activeCount}</Badge></div>
                  <CardDescription className="text-xs">Distribution of programs across AACCUP accreditation levels.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ right: 60 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                              <XAxis type="number" hide />
                              <YAxis dataKey="level" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '10px' }} />
                              <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={12} />
                              <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={12} />
                              <Bar dataKey="Closed" stackId="a" fill={chartConfig.Closed.color} radius={[0, 4, 4, 0]} barSize={12} />
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3"><p className="text-[9px] text-muted-foreground italic leading-tight"><strong>Guidance for usage:</strong> High concentrations in Level III/IV indicate mature institutional excellence.</p></CardFooter>
          </Card>

          {/* 2. INSTITUTIONAL RECOGNITION MOMENTUM (COPC) */}
          <Card className="shadow-lg border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-emerald-50 text-emerald-700 border-emerald-200">INSTITUTIONAL TOTAL: {analytics?.activeCopc}</Badge></div>
                  <CardDescription className="text-xs">Timeline of COPC issuance by CHED reflecting successful regulatory alignment.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analytics?.copcMomentumData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30} />
                              <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30} />
                              <Bar dataKey="Closed" stackId="a" fill={chartConfig.Closed.color} radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3"><p className="text-[9px] text-muted-foreground italic leading-tight"><strong>Guidance for usage:</strong> Steady yearly growth indicates a healthy regulatory compliance culture.</p></CardFooter>
          </Card>

          {/* 3. ACCREDITATION MILESTONE VELOCITY */}
          <Card className="shadow-lg border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="h-5 w-5 text-blue-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-blue-50 text-blue-700 border-blue-200">OVERALL PIPELINE</Badge></div>
                  <CardDescription className="text-xs">Projects future audit workload based on set schedules. Facilitates resource planning.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analytics?.velocityData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30} />
                              <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30} />
                              <Bar dataKey="Closed" stackId="a" fill={chartConfig.Closed.color} radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3"><p className="text-[9px] text-muted-foreground italic leading-tight"><strong>Guidance for usage:</strong> High bars in future years signal periods requiring increased logistical support.</p></CardFooter>
          </Card>

          {/* 4. ACCREDITATION ACHIEVEMENT HISTORY */}
          <Card className="shadow-lg border-primary/10 flex flex-col overflow-hidden">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="h-5 w-5 text-indigo-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Achievement History</CardTitle></div><Badge variant="outline" className="h-5 text-[9px] font-black bg-indigo-50 text-indigo-700 border-indigo-200">OVERALL SURVEYS</Badge></div>
                  <CardDescription className="text-xs">Tracks history of successful survey completions across academic cycles.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex-1">
                  <ChartContainer config={chartConfig} className="h-[350px] w-full">
                      <ResponsiveContainer>
                          <BarChart data={analytics?.achievementHistoryData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 700 }} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                              <RechartsTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="Undergraduate" stackId="a" fill={chartConfig.Undergraduate.color} barSize={30} />
                              <Bar dataKey="Graduate" stackId="a" fill={chartConfig.Graduate.color} barSize={30} />
                              <Bar dataKey="Closed" stackId="a" fill={chartConfig.Closed.color} radius={[4, 4, 0, 0]} barSize={30} />
                          </BarChart>
                      </ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3"><p className="text-[9px] text-muted-foreground italic leading-tight"><strong>Guidance for usage:</strong> Documents the historical impact of quality improvement efforts.</p></CardFooter>
          </Card>
      </div>

      {/* 5. INSTITUTIONAL SURVEY PIPELINE (ROADMAP) */}
      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-6">
              <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Flag className="h-6 w-6 text-primary" /><CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Pipeline (Roadmap)</CardTitle></div><Badge className="bg-primary text-white h-6 px-4 font-black uppercase text-[10px] tracking-widest shadow-sm">ACTIVE MONITORING LIST</Badge></div>
              <CardDescription className="text-sm font-medium mt-2">Prioritized schedule of upcoming AACCUP surveys. Overdue status indicates missed quality cycle targets.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader className="bg-muted/50">
                      <TableRow>
                          <TableHead className="pl-8 text-[10px] font-black uppercase py-4">Academic Program Offering</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-4">Campus Site</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-4">Current Level</TableHead>
                          <TableHead className="text-[10px] font-black uppercase py-4">Schedule / Validity</TableHead>
                          <TableHead className="text-right pr-8 text-[10px] font-black uppercase py-4">Status</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {analytics?.roadmapData.map(item => (
                          <TableRow key={item.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="pl-8 py-5">
                                  <div className="flex flex-col gap-1">
                                      <span className="font-black text-sm text-slate-900 leading-none">{item.name}</span>
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.level}</span>
                                  </div>
                              </TableCell>
                              <TableCell className="py-5"><div className="flex items-center gap-2 text-xs font-bold text-slate-600"><School className="h-3.5 w-3.5 opacity-40" /> {item.campus}</div></TableCell>
                              <TableCell className="py-5"><Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 bg-primary/5 uppercase">{item.currentLevel}</Badge></TableCell>
                              <TableCell className="py-5"><div className="flex flex-col gap-1"><span className="text-xs font-black text-slate-700">{item.validity}</span><span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">FISCAL YEAR {item.validity.match(/\d{4}/)?.[0] || 'TBA'}</span></div></TableCell>
                              <TableCell className="text-right pr-8 py-5">
                                  <Badge className={cn(
                                      "text-[10px] font-black uppercase border-none px-3 shadow-sm",
                                      item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : 
                                      item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : 
                                      item.status === 'AWAITING RESULT' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                                  )}>
                                      {item.status}
                                  </Badge>
                              </TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4"><div className="flex items-center gap-3"><Info className="h-4 w-4 text-blue-600" /><p className="text-[10px] text-muted-foreground italic font-medium"><strong>Note:</strong> OVERDUE status indicates the set validity period or target month has passed without a recorded next survey milestone in the compliance workspace.</p></div></CardFooter>
      </Card>
    </div>
  );
}
