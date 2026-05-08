'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus, Unit, User, AccreditationRecommendation, Signatories } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '../ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
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
    LayoutList as LayoutListIcon,
    Printer,
    Building2,
    ArrowUpRight,
    Scale,
    History,
    PieChart as LucidePieChart,
    LineChart as LucideLineChart,
    BookOpen,
    Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { renderToStaticMarkup } from 'react-dom/server';
import { AccreditationRecommendationReport } from './recommendation-print-template';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

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

    const currentYearNum = new Date().getFullYear();
    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let activeCopc = 0;
    let monitoredCount = 0;
    let currentYearAccreditationCount = 0;

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };
    const levelCounts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const accreditationYearCounts: Record<string, number> = {};

    const globalPillarSums = { authority: 0, accreditation: 0, faculty: 0, curriculum: 0, outcomes: 0 };
    const roadmapData: any[] = [];

    programs.forEach(p => {
        if (p.isActive) activeCount++;
        else inactiveCount++;

        const pId = String(p.id).toLowerCase().trim();
        const record = compliances.find(c => 
            String(c.programId || '').toLowerCase().trim() === pId
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
            
            if (rawLevel.includes('Level I')) levelCounts.L1++;
            else if (rawLevel.includes('Level II')) levelCounts.L2++;
            else if (rawLevel.includes('Level III')) levelCounts.L3++;
            else if (rawLevel.includes('Level IV')) levelCounts.L4++;

            // Pillar logic for radar
            if (hasCopc) globalPillarSums.authority += 100;
            if (isAccredited || p.isNewProgram) globalPillarSums.accreditation += 100;
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

    const roadmapForecastData = Object.entries(accreditationYearCounts)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
        .filter(d => parseInt(d.year) >= currentYearNum);

    return { 
        radarData,
        activeCount, 
        inactiveCount,
        activeAccredited, 
        activeCopc,
        statusTotals,
        levelCounts,
        currentYearAccreditationCount,
        roadmapForecastData,
        roadmapData,
        overallScore: Math.round(radarData.reduce((acc, curr) => acc + curr.score, 0) / radarData.length)
    };
  }, [programs, compliances, campusMap]);

  const activeRoadmap = useMemo(() => {
    return analytics?.roadmapData.filter(r => r.isActive).sort((a,b) => a.name.localeCompare(b.name)) || [];
  }, [analytics?.roadmapData]);

  const closedRoadmap = useMemo(() => {
    return analytics?.roadmapData.filter(r => !r.isActive).sort((a,b) => a.name.localeCompare(b.name)) || [];
  }, [analytics?.roadmapData]);

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roadmapSortConfig.key === key && roadmapSortConfig.direction === 'asc') direction = 'desc';
    setRoadmapSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => (
    <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", roadmapSortConfig.key === key ? "text-primary opacity-100" : "opacity-20")} />
  );

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
                    {analytics.roadmapForecastData.slice(1, 3).map(d => (
                        <div key={d.year} className="flex justify-between text-[11px] font-black uppercase">
                            <span className="text-amber-800/60">{d.year}:</span>
                            <span className="text-amber-700 tabular-nums">{d.count} Programs</span>
                        </div>
                    ))}
                    {analytics.roadmapForecastData.length < 2 && <p className="text-xs font-bold text-amber-700">Registry analysis ongoing...</p>}
                </div>
            </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">COPC & Authority</CardTitle><ShieldCheck className="h-4 w-4 text-emerald-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics.activeCopc} / {analytics.activeCount}</div><p className="text-[9px] font-bold text-emerald-600/70 uppercase">Institutional Parity</p></CardContent>
        </Card>
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
                      <RoadmapTable data={activeRoadmap} campusMap={campusMap} />
                  </TabsContent>
                  <TabsContent value="closed" className="m-0">
                      <RoadmapTable data={closedRoadmap} campusMap={campusMap} />
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
                                    "text-[10px] font-black uppercase border-none px-3", 
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