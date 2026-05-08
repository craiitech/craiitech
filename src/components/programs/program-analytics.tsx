'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit, User, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
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
    PolarRadiusAxis
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
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
    Users,
    Trophy,
    FileText,
    ChevronRight,
    PieChart as PieIcon,
    Loader2,
    GraduationCap,
    CalendarCheck,
    ShieldAlert,
    Clock,
    LayoutList as LayoutListIcon,
    Building2,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProgramAnalyticsProps {
  programs: AcademicProgram[];
  compliances: ProgramComplianceRecord[];
  campuses: Campus[];
  units: Unit[];
  isLoading: boolean;
  selectedYear: number;
}

const COLORS = ['#1B6535', '#EAB308', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6'];

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const firestore = useFirestore();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const currentYearNum = new Date().getFullYear();
    let activeCount = 0;
    let activeAccredited = 0;
    let activeCopc = 0;
    let currentYearAccreditationCount = 0;

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };
    const levelCounts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const accreditationYearCounts: Record<string, number> = {};

    const globalPillarSums = { authority: 0, accreditation: 0, faculty: 0, curriculum: 0, outcomes: 0 };
    const roadmapData: any[] = [];
    
    // GAD Totals
    let totalMaleEnrolled = 0;
    let totalFemaleEnrolled = 0;
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalOthersFaculty = 0;
    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;

    const uniqueFacultySet = new Set<string>();

    programs.forEach(p => {
        const pId = String(p.id).toLowerCase().trim();
        const record = compliances.find(c => 
            String(c.programId || '').toLowerCase().trim() === pId
        );
        
        const milestones = record?.accreditationRecords || [];
        const currentMilestone = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        const rawLevel = (currentMilestone?.level || 'Non Accredited').trim();
        const isAccredited = currentMilestone && rawLevel !== 'Non Accredited' && !rawLevel.includes('PSV') && rawLevel !== 'AWAITING RESULT';
        const hasCopc = record?.ched?.copcStatus === 'With COPC';

        if (p.isActive) {
            activeCount++;
            if (isAccredited) activeAccredited++;
            if (hasCopc) activeCopc++;
            
            if (rawLevel.includes('Level I')) levelCounts.L1++;
            else if (rawLevel.includes('Level II')) levelCounts.L2++;
            else if (rawLevel.includes('Level III')) levelCounts.L3++;
            else if (rawLevel.includes('Level IV')) levelCounts.L4++;

            // Radar Logic
            if (hasCopc) globalPillarSums.authority += 100;
            if (isAccredited || p.isNewProgram) globalPillarSums.accreditation += 100;
            if (record?.graduationRecords?.length) globalPillarSums.outcomes += 100;
            if (record?.curriculumRecords?.some(c => c.isNotedByChed)) globalPillarSums.curriculum += 100;
            if (record?.faculty?.members?.length) {
                const aligned = record.faculty.members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                globalPillarSums.faculty += (aligned / (record.faculty.members.length || 1)) * 100;
            }

            // GAD Aggregation
            const enrollmentRecords = record?.enrollmentRecords || [];
            if (enrollmentRecords.length > 0) {
                enrollmentRecords.forEach(rec => {
                    const term = rec.firstSemester;
                    if (term) {
                        ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach(level => {
                            const lData = (term as any)[level];
                            totalMaleEnrolled += Number(lData?.male || 0);
                            totalFemaleEnrolled += Number(lData?.female || 0);
                        });
                    }
                });
            }

            if (record?.faculty) {
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
                        else totalOthersFaculty++;
                    }
                });
            }

            record?.graduationRecords?.forEach(grad => {
                totalMaleGrads += Number(grad.maleCount || 0);
                totalFemaleGrads += Number(grad.femaleCount || 0);
            });
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
                    if (dYear === currentYearNum) currentYearAccreditationCount++;
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
    });

    const radarData = [
        { pillar: 'Authority', score: Math.round(globalPillarSums.authority / (activeCount || 1)) },
        { pillar: 'Accreditation', score: Math.round(globalPillarSums.accreditation / (activeCount || 1)) },
        { pillar: 'Faculty', score: Math.round(globalPillarSums.faculty / (activeCount || 1)) },
        { pillar: 'Curriculum', score: Math.round(globalPillarSums.curriculum / (activeCount || 1)) },
        { pillar: 'Outcomes', score: Math.round(globalPillarSums.outcomes / (activeCount || 1)) },
    ];

    const campusPerf = campuses.map(c => {
        const cUnits = units.filter(u => u.campusIds?.includes(c.id));
        const cPrograms = programs.filter(p => p.campusId === c.id && p.isActive);
        const cMonitored = cPrograms.filter(p => compliances.some(rec => rec.programId === p.id && rec.academicYear === selectedYear)).length;
        const totalPossible = cPrograms.length;
        return {
            name: c.name,
            Monitored: cMonitored,
            Unmonitored: Math.max(0, totalPossible - cMonitored),
            Maturity: totalPossible > 0 ? Math.round((cMonitored / totalPossible) * 100) : 0
        };
    });

    const roadmapForecastData = Object.entries(accreditationYearCounts)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
        .filter(d => parseInt(d.year) >= currentYearNum);

    const gadEnrollmentData = [
        { name: 'Male', value: totalMaleEnrolled, fill: COLORS[0] },
        { name: 'Female', value: totalFemaleEnrolled, fill: COLORS[2] }
    ].filter(d => d.value > 0);

    const gadFacultyData = [
        { name: 'Male', value: totalMaleFaculty, fill: COLORS[0] },
        { name: 'Female', value: totalFemaleFaculty, fill: COLORS[2] },
        { name: 'Others', value: totalOthersFaculty, fill: COLORS[1] }
    ].filter(d => d.value > 0);

    const gadGradsData = [
        { name: 'Male', value: totalMaleGrads, fill: COLORS[0] },
        { name: 'Female', value: totalFemaleGrads, fill: COLORS[2] }
    ].filter(d => d.value > 0);

    return { 
        radarData,
        campusPerf,
        gadEnrollmentData,
        gadFacultyData,
        gadGradsData,
        activeCount, 
        activeAccredited, 
        activeCopc,
        statusTotals,
        levelCounts,
        currentYearAccreditationCount,
        roadmapForecastData,
        roadmapData,
        totals: { students: totalMaleEnrolled + totalFemaleEnrolled, faculty: totalMaleFaculty + totalFemaleFaculty + totalOthersFaculty, grads: totalMaleGrads + totalFemaleGrads }
    };
  }, [programs, compliances, campuses, units, campusMap, selectedYear]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>;
  if (!analytics) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 1. INSTITUTIONAL KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Level Distribution</CardTitle><Award className="h-4 w-4 text-primary opacity-20" /></div></CardHeader>
            <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between text-xs font-black uppercase"><span>L-I:</span> <span className="text-primary tabular-nums">{analytics.levelCounts.L1}</span></div>
                    <div className="flex justify-between text-xs font-black uppercase"><span>L-II:</span> <span className="text-primary tabular-nums">{analytics.levelCounts.L2}</span></div>
                    <div className="flex justify-between text-xs font-black uppercase"><span>L-III:</span> <span className="text-primary tabular-nums">{analytics.levelCounts.L3}</span></div>
                    <div className="flex justify-between text-xs font-black uppercase"><span>L-IV:</span> <span className="text-primary tabular-nums">{analytics.levelCounts.L4}</span></div>
                </div>
            </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Current Year Conduct</CardTitle><CalendarCheck className="h-4 w-4 text-blue-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1">
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics.currentYearAccreditationCount} Sessions</div>
                <p className="text-[9px] font-bold text-blue-800/60 uppercase tracking-tighter">Scheduled for {new Date().getFullYear()}</p>
            </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Pipeline Forecast</CardTitle><TrendingUp className="h-4 w-4 text-amber-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1">
                <div className="space-y-1">
                    {analytics.roadmapForecastData.slice(0, 3).map(d => (
                        <div key={d.year} className="flex justify-between text-[11px] font-black uppercase">
                            <span className="text-amber-800/60">{d.year}:</span>
                            <span className="text-amber-700 tabular-nums">{d.count} Programs</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">COPC & Authority</CardTitle><ShieldCheck className="h-4 w-4 text-emerald-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.activeCopc} / {analytics.activeCount}</div><p className="text-[9px] font-bold text-emerald-600/70 uppercase">Institutional Parity</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden flex flex-col relative">
            <div className="absolute top-0 right-0 p-4 opacity-5"><TrendingUp className="h-20 w-20" /></div>
            <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Maturity Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col items-center justify-center pt-8">
                <ChartContainer config={{}} className="h-[280px] w-full">
                    <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.radarData}>
                            <PolarGrid strokeOpacity={0.2} />
                            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} hide />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Radar name="Program Maturity" dataKey="score" stroke="#1B6535" fill="#1B6535" fillOpacity={0.4} />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Compliance Benchmarking</CardTitle>
                </div>
                <CardDescription className="text-xs">Monitored vs Unmonitored programs per site for AY {selectedYear}.</CardDescription>
            </CardHeader>
            <CardContent className="pt-10 flex-1">
                <ChartContainer config={{}} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics.campusPerf}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                            <Bar dataKey="Monitored" fill="#1B6535" radius={[2, 2, 0, 0]}>
                                <LabelList dataKey="Monitored" position="top" style={{ fontSize: '10px', fontWeight: '900' }} />
                            </Bar>
                            <Bar dataKey="Unmonitored" fill="#cbd5e1" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary"><Users className="h-5 w-5" /><h3 className="text-lg font-black uppercase tracking-tight">Gender & Development (GAD) Summary</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-blue-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> Student Sex Distribution</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full">
                          <ResponsiveContainer><PieChart><Pie data={analytics.gadEnrollmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadEnrollmentData.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.students}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Enrollment</p></div>
                  </CardContent>
              </Card>

              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-emerald-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-600" /> System Registered User</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full">
                          <ResponsiveContainer><PieChart><Pie data={analytics.gadFacultyData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadFacultyData.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.faculty}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Personnel Pool</p></div>
                  </CardContent>
              </Card>

              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-purple-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-600" /> Graduation GAD Audit</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full">
                          <ResponsiveContainer><PieChart><Pie data={analytics.gadGradsData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadGradsData.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer>
                      </ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.grads}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Graduates</p></div>
                  </CardContent>
              </Card>
          </div>
      </div>

      {/* 2. INSTITUTIONAL ROADMAP WORKSPACE */}
      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
              <CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap (Pipeline)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
              <Tabs defaultValue="active" className="w-full">
                  <div className="bg-muted/30 px-6 py-2 border-b">
                      <TabsList className="h-8 bg-background border p-0.5">
                          <TabsTrigger value="active" className="text-[10px] font-black uppercase px-6 h-7">Active Programs</TabsTrigger>
                          <TabsTrigger value="closed" className="text-[10px] font-black uppercase px-6 h-7">Closed Programs</TabsTrigger>
                      </TabsList>
                  </div>

                  <TabsContent value="active" className="m-0">
                      <RoadmapTable data={analytics.roadmapData.filter(r => r.isActive)} campusMap={campusMap} />
                  </TabsContent>
                  <TabsContent value="closed" className="m-0">
                      <RoadmapTable data={analytics.roadmapData.filter(r => !r.isActive)} campusMap={campusMap} />
                  </TabsContent>
              </Tabs>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-3 px-8">
              <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                      <strong>Guidance:</strong> This roadmap is automatically generated from verified accreditation milestones. Units must ensure that the "Current Level" matches their official AACCUP certificates to maintain roadmap integrity.
                  </p>
              </div>
          </CardFooter>
      </Card>
    </div>
  );
}

function RoadmapTable({ data, campusMap }: { data: any[], campusMap: Map<string, string> }) {
    if (data.length === 0) return <div className="py-20 text-center text-muted-foreground font-black uppercase text-[10px] tracking-widest opacity-20">No matching registry records</div>;

    return (
        <ScrollArea className="h-[500px]">
            <Table>
                <TableHeader className="bg-muted/30 sticky top-0 z-10">
                    <TableRow>
                        <TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Academic Program Offering</TableHead>
                        <TableHead className="py-4 text-[10px] font-black uppercase">Campus Site</TableHead>
                        <TableHead className="py-4 text-[10px] font-black uppercase">Current Level</TableHead>
                        <TableHead className="py-4 text-[10px] font-black uppercase">Validity Date</TableHead>
                        <TableHead className="text-right pr-8 py-4 text-[10px] font-black uppercase">Status</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map(item => (
                        <TableRow key={item.id} className="hover:bg-muted/20 transition-colors group">
                            <TableCell className="pl-8 py-5">
                                <div className="flex flex-col gap-1">
                                    <span className="font-black text-sm text-slate-900 group-hover:text-primary transition-colors">{item.name}</span>
                                    <span className="text-[9px] font-black text-muted-foreground uppercase">{item.level}</span>
                                </div>
                            </TableCell>
                            <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{item.campus}</TableCell>
                            <TableCell className="py-5">
                                <Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 bg-white">
                                    {item.currentLevel}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-5 text-xs font-black uppercase tabular-nums">{item.validity}</TableCell>
                            <TableCell className="text-right pr-8 py-5">
                                <Badge className={cn(
                                    "text-[10px] font-black uppercase border-none px-3 shadow-sm", 
                                    item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : 
                                    item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : 
                                    "bg-blue-600 text-white"
                                )}>
                                    {item.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </ScrollArea>
    );
}

