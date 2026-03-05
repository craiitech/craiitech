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
    LabelList
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
    FileX
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

type ProgramCategory = 'Undergraduate' | 'Graduate' | 'Inactive';

const chartConfig = {
    Undergraduate: { label: 'Undergraduate (Active)', color: 'hsl(var(--primary))' },
    Graduate: { label: 'Graduate (Active)', color: 'hsl(var(--chart-2))' },
    Inactive: { label: 'INACTIVE / SUBJECT FOR CLOSURE', color: 'hsl(var(--muted-foreground))' }
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
        if (!p.isActive) return 'Inactive';
        return p.level === 'Graduate' ? 'Graduate' : 'Undergraduate';
    };

    // --- 1. Portfolio Breakdown Stats ---
    let activeCount = 0;
    let inactiveCount = 0;
    let activeAccredited = 0;
    let inactiveAccredited = 0;
    let activeCopc = 0;
    let inactiveCopc = 0;

    programs.forEach(p => {
        const category = getProgramCategory(p);
        if (category === 'Inactive') inactiveCount++;
        else activeCount++;

        const record = filteredCompliances.find(c => c.programId === p.id);
        const isAccredited = (rec: ProgramComplianceRecord | undefined) => {
            if (!rec || !rec.accreditationRecords || rec.accreditationRecords.length === 0) return false;
            const milestones = rec.accreditationRecords;
            const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            return current && current.level !== 'Non Accredited' && !current.level.includes('PSV');
        };
        const hasCopc = (rec: ProgramComplianceRecord | undefined) => rec?.ched?.copcStatus === 'With COPC';

        if (category === 'Inactive') {
            if (isAccredited(record)) inactiveAccredited++;
            if (hasCopc(record)) inactiveCopc++;
        } else {
            if (isAccredited(record)) activeAccredited++;
            if (hasCopc(record)) activeCopc++;
        }
    });

    // --- 2. Accreditation Level Summary ---
    const accreditationDataMap: Record<string, { level: string, Undergraduate: number, Graduate: number, Inactive: number, total: number }> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => {
        accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
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

    // --- 3. COPC Recognition Momentum ---
    const copcYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number }> = {};
    filteredCompliances.forEach(c => {
        if (c.ched?.copcStatus === 'With COPC' && c.ched.copcAwardDate) {
            const yearMatch = c.ched.copcAwardDate.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                const p = programs.find(prog => prog.id === c.programId);
                if (p) {
                    const category = getProgramCategory(p);
                    if (!copcYearlyMap[year]) {
                        copcYearlyMap[year] = { year, Undergraduate: 0, Graduate: 0, Inactive: 0 };
                    }
                    copcYearlyMap[year][category]++;
                }
            }
        }
    });
    const copcHistoryData = Object.values(copcYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    // --- 4. Campus Performance Aggregation ---
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

                if (category === 'Inactive') {
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

    // --- 5. Missing Document Audit ---
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

    // --- 6. Accreditation Roadmap Logic ---
    const now = new Date();
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    const getSortValue = (validity: string) => {
        if (!validity || validity.toLowerCase().includes('no schedule') || validity.trim().toUpperCase() === 'WAITING FOR RESULT') return 0;
        const yearMatch = validity.match(/\d{4}/);
        const year = yearMatch ? parseInt(yearMatch[0]) : 0;
        const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        let month = 0;
        monthNames.forEach((m, idx) => { if (validity.toLowerCase().includes(m)) month = idx + 1; });
        return year * 100 + month;
    };

    const roadmapData = programs.flatMap(p => {
        const record = filteredCompliances.find(c => c.programId === p.id);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        const category = getProgramCategory(p);
        
        const getEntryData = (level: string, validity: string, suffix?: string) => {
            const val = getSortValue(validity);
            const dYear = Math.floor(val / 100);
            const dMonth = val % 100;
            const isWaiting = validity?.trim().toUpperCase() === 'WAITING FOR RESULT';

            let status = 'Scheduled';
            let priority = 3; 

            if (dYear > 0) {
                if (dYear < currentYearNum || (dYear === currentYearNum && dMonth < currentMonthNum && dMonth > 0)) {
                    status = 'Overdue'; priority = 1;
                } else if (dYear === currentYearNum) {
                    status = 'Upcoming'; priority = 3;
                }
            } else if (isWaiting) { status = 'Result Pending'; priority = 2; }
            else { status = 'Unscheduled'; priority = 4; }

            return {
                id: `${p.id}-${suffix || 'base'}`,
                name: suffix ? `${p.name} (${suffix})` : p.name,
                campusName,
                level,
                programLevel: p.level,
                category,
                validityText: validity || 'No schedule set',
                year: dYear > 0 ? dYear.toString() : (isWaiting ? 'Pending' : 'Other'),
                status,
                sortValue: val || 999999,
                priority
            };
        };

        if (p.isNewProgram) return [];
        const milestones = record?.accreditationRecords || [];

        if (p.hasSpecializations && p.specializations && p.specializations.length > 0) {
            const groups: Record<string, { level: string, validity: string, majorNames: string[] }> = {};
            p.specializations.forEach(spec => {
                const milestone = milestones.find(m => m.lifecycleStatus === 'Current' && m.components?.some(c => c.id === spec.id)) || 
                                milestones.find(m => m.lifecycleStatus === 'Current' && (!m.components || m.components.length === 0)) || 
                                milestones[milestones.length - 1];

                const level = milestone?.level || 'Non Accredited';
                const validity = milestone?.statusValidityDate || 'No schedule set';
                const key = `${level}|${validity}`;
                if (!groups[key]) groups[key] = { level, validity, majorNames: [] };
                groups[key].majorNames.push(spec.name);
            });
            return Object.values(groups).map(group => getEntryData(group.level, group.validity, group.majorNames.join(', ')));
        }

        const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        return [getEntryData(latest?.level || 'Non Accredited', latest?.statusValidityDate || 'No schedule set')];
    }).sort((a, b) => (a.priority !== b.priority) ? (a.priority - b.priority) : (a.sortValue - b.sortValue));

    const distributionYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number }> = {};
    roadmapData.forEach(item => {
        if (item.year !== 'Other' && item.year !== 'Pending') {
            if (!distributionYearlyMap[item.year]) distributionYearlyMap[item.year] = { year: item.year, Undergraduate: 0, Graduate: 0, Inactive: 0 };
            distributionYearlyMap[item.year][item.category]++;
        }
    });
    const distributionSummary = Object.values(distributionYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    const surveysYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number }> = {};
    filteredCompliances.forEach(c => {
        const prog = programs.find(p => p.id === c.programId);
        if (!prog) return;
        const category = getProgramCategory(prog);
        (c.accreditationRecords || []).forEach(m => {
            const yearMatch = m.dateOfSurvey?.match(/\d{4}/);
            if (yearMatch) {
                const year = yearMatch[0];
                if (!surveysYearlyMap[year]) surveysYearlyMap[year] = { year, Undergraduate: 0, Graduate: 0, Inactive: 0 };
                surveysYearlyMap[year][category]++;
            }
        });
    });
    const surveysHistoryData = Object.values(surveysYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    return { 
        accreditationSummary, 
        activeCount, inactiveCount,
        activeAccredited, inactiveAccredited,
        activeCopc, inactiveCopc,
        copcHistoryData,
        campusPerformanceData,
        missingDocs,
        roadmapData,
        distributionSummary,
        surveysHistoryData,
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

  const RoadmapTable = ({ items }: { items: any[] }) => (
    <div className="overflow-x-auto">
        <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                    <TableHead className="font-black text-[10px] uppercase py-3 pl-6 w-[250px]">Academic Program Offering</TableHead>
                    <TableHead className="font-black text-[10px] uppercase py-3">Campus Site</TableHead>
                    <TableHead className="font-black text-[10px] uppercase py-3">Current Level</TableHead>
                    <TableHead className="font-black text-[10px] uppercase py-3">Schedule / Validity</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => {
                    const style = getYearStyle(item.year);
                    return (
                        <TableRow key={item.id} className={cn("hover:bg-muted/30 transition-colors", style.row)}>
                            <TableCell className="py-4 pl-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[13px] font-black text-slate-900 leading-tight">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="h-4 text-[8px] font-black uppercase border-slate-300 text-slate-500 bg-white">
                                            {item.programLevel}
                                        </Badge>
                                        {item.category === 'Inactive' && (
                                            <Badge variant="destructive" className="h-4 text-[8px] font-black uppercase border-none">CLOSING</Badge>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-600 uppercase tracking-tighter">
                                {item.campusName}
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary" className="h-5 text-[9px] font-bold bg-primary/5 text-primary border-primary/10 uppercase">
                                    {item.level}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs font-black tabular-nums text-slate-800">{item.validityText}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                                        {item.year === 'Other' ? 'NO YEAR SET' : (item.year === 'Pending' ? 'AWAITING RESULT' : `FISCAL YEAR ${item.year}`)}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <Badge 
                                    className={cn(
                                        "h-6 px-3 text-[10px] font-black uppercase border-none shadow-sm",
                                        item.status === 'Overdue' ? "bg-rose-600 text-white animate-pulse" :
                                        item.status === 'Result Pending' ? "bg-blue-600 text-white" :
                                        item.status === 'Upcoming' ? "bg-amber-500 text-amber-950" :
                                        item.status === 'Scheduled' ? "bg-emerald-600 text-white" :
                                        "bg-slate-200 text-slate-500"
                                    )}
                                >
                                    {item.status}
                                </Badge>
                            </TableCell>
                        </TableRow>
                    );
                })}
                {items.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                            <div className="flex flex-col items-center gap-2 opacity-20">
                                <Activity className="h-10 w-10" />
                                <p className="text-xs font-black uppercase tracking-widest">Pipeline Empty</p>
                            </div>
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- STRATEGIC GAPS REGISTRY --- */}
      <Card className="border-destructive/30 bg-destructive/5 overflow-hidden shadow-md">
          <CardHeader className="bg-destructive/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Gaps Registry</CardTitle>
                  </div>
                  <Badge variant="destructive" className="animate-pulse shadow-sm h-5 text-[9px] font-black uppercase">ACTION REQUIRED</Badge>
              </div>
              <CardDescription className="text-xs font-medium text-destructive/70">Critical documentation deficiencies impacting maturity index for AY {selectedYear}.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 max-h-[300px] overflow-hidden">
              <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-destructive/10">
                      {analytics?.missingDocs.map((doc, idx) => (
                          <div key={idx} className="p-4 space-y-2 hover:bg-white/50 transition-colors group">
                              <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                      <p className="text-xs font-black text-slate-900 leading-tight truncate group-hover:text-destructive transition-colors" title={doc.programName}>{doc.programName}</p>
                                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{doc.campusName}</p>
                                  </div>
                                  <Badge variant="destructive" className="h-4 text-[8px] font-black px-1.5 shrink-0">{doc.items.length} GAPS</Badge>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                  {doc.items.map(item => (
                                      <Badge key={item} variant="outline" className="text-[8px] h-4 py-0 border-destructive/20 text-destructive bg-white">{item}</Badge>
                                  ))}
                              </div>
                          </div>
                      ))}
                      {analytics?.missingDocs.length === 0 && (
                          <div className="col-span-full py-16 text-center">
                              <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto opacity-20 mb-3" />
                              <p className="text-xs font-black uppercase text-slate-400">Institutional Parity Achieved</p>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </CardContent>
      </Card>

      {/* --- EXECUTIVE KPI PANEL --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><LayoutGrid className="h-12 w-12" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Scope Portfolio</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-primary tabular-nums">{analytics?.activeCount} Active</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">
                    {analytics?.inactiveCount} Subject for Closure
                </p>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">COPC Performance</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-green-600 tabular-nums">{analytics?.activeCopc} Active</div>
                <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase">
                    {analytics?.inactiveCopc} Inactive Awards Verified
                </p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Award className="h-12 w-12" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Quality Maturity</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-amber-600 tabular-nums">{analytics?.activeAccredited} Active</div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">
                    {analytics?.inactiveAccredited} Inactive Accredited
                </p>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Users className="h-12 w-12" /></div>
            <CardHeader className="pb-2"><CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Monitored Registry</CardTitle></CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.monitoredCount}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Total verified AY {selectedYear} data</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- ACCREDITATION MATURITY PROFILE --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Award className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle></div>
                    <Badge variant="secondary" className="bg-primary text-white text-[10px] font-black h-6 px-3">OVERALL TOTAL: {analytics?.totalPrograms || 0}</Badge>
                </div>
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
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[0, 4, 4, 0]} barSize={10}><LabelList dataKey="Inactive" position="right" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* --- COPC MOMENTUM --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle></div>
                    <Badge className="bg-emerald-600 text-white text-[10px] font-black h-6 px-3">INSTITUTIONAL TOTAL: {analytics?.activeCopc + (analytics?.inactiveCopc || 0)}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.copcHistoryData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                            <Bar dataKey="Undergraduate" fill={chartConfig.Undergraduate.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Undergraduate.color }} /></Bar>
                            <Bar dataKey="Graduate" fill={chartConfig.Graduate.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Graduate.color }} /></Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- MILESTONE VELOCITY --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle></div>
                    <Badge variant="secondary" className="bg-amber-500 text-white text-[10px] font-black h-6 px-3">OVERALL PIPELINE: {analytics?.roadmapData.length || 0}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.distributionSummary} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                            <Bar dataKey="Undergraduate" fill={chartConfig.Undergraduate.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Undergraduate.color }} /></Bar>
                            <Bar dataKey="Graduate" fill={chartConfig.Graduate.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Graduate.color }} /></Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>

        {/* --- ACHIEVEMENT HISTORY --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><History className="h-5 w-5 text-emerald-600" /><CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Achievement History</CardTitle></div>
                    <Badge variant="secondary" className="bg-emerald-600 text-white text-[10px] font-black h-6 px-3">OVERALL SURVEYS: {analytics?.monitoredCount || 0}</Badge>
                </div>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.surveysHistoryData} margin={{ top: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                            <Bar dataKey="Undergraduate" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} /></Bar>
                            <Bar dataKey="Graduate" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} /></Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[4, 4, 0, 0]} barSize={25}><LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} /></Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      {/* --- CAMPUS PARITY BENCHMARKING --- */}
      <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /><CardTitle className="text-sm font-black uppercase tracking-tight">Campus Parity Benchmarking</CardTitle></div>
              <CardDescription className="text-xs">Comparative performance of sites across active and closing tracks.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
              <Table>
                  <TableHeader className="bg-muted/50">
                      <TableRow>
                          <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Campus Site</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase py-3">Active Accredited</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase py-3">Inactive Accredited</TableHead>
                          <TableHead className="text-center font-black text-[10px] uppercase py-3">Active COPC</TableHead>
                          <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">Inactive COPC</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {analytics?.campusPerformanceData.map((campus: any) => (
                          <TableRow key={campus.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="py-3 pl-6"><span className="text-xs font-black text-slate-800 uppercase">{campus.name}</span></TableCell>
                              <TableCell className="text-center"><span className="text-xs font-black text-primary">{campus.activeAccreditedCount} / {campus.activeCount}</span></TableCell>
                              <TableCell className="text-center"><span className="text-xs font-black text-slate-400">{campus.inactiveAccreditedCount} / {campus.inactiveCount}</span></TableCell>
                              <TableCell className="text-center"><span className="text-xs font-black text-emerald-600">{campus.activeCopcCount} / {campus.activeCount}</span></TableCell>
                              <TableCell className="text-right pr-6"><span className="text-xs font-black text-slate-400">{campus.inactiveCopcCount} / {campus.inactiveCount}</span></TableCell>
                          </TableRow>
                      ))}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>

      {/* --- INSTITUTIONAL SURVEY PIPELINE (ROADMAP) --- */}
      <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2">
                          <CalendarDays className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Survey Pipeline (Roadmap)</CardTitle>
                      </div>
                      <CardDescription className="text-xs">Prioritized schedule of upcoming AACCUP surveys across all university campuses.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                      {analytics?.distributionSummary.map(total => {
                          const style = getYearStyle(total.year);
                          return (
                              <Badge key={total.year} variant="outline" className={cn("h-6 px-3 text-[10px] font-black border-none shadow-sm", style.bg, style.text)}>
                                  {total.year}: {total.Undergraduate + total.Graduate + total.Inactive} SURVEYS
                              </Badge>
                          );
                      })}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <Tabs defaultValue="active" className="w-full">
                  <div className="px-6 py-2 bg-muted/30 border-b">
                      <TabsList className="bg-background border shadow-sm">
                          <TabsTrigger value="active" className="text-[10px] font-black uppercase px-6">
                              <ShieldCheck className="h-3.5 w-3.5 mr-2" /> Active Portfolio
                          </TabsTrigger>
                          <TabsTrigger value="inactive" className="text-[10px] font-black uppercase px-6">
                              <FileX className="h-3.5 w-3.5 mr-2" /> Closure Pipeline
                          </TabsTrigger>
                      </TabsList>
                  </div>
                  <TabsContent value="active" className="m-0 border-none">
                      <ScrollArea className="h-[500px]">
                          <RoadmapTable items={analytics?.roadmapData.filter(i => i.category !== 'Inactive') || []} />
                      </ScrollArea>
                  </TabsContent>
                  <TabsContent value="inactive" className="m-0 border-none">
                      <ScrollArea className="h-[500px]">
                          <RoadmapTable items={analytics?.roadmapData.filter(i => i.category === 'Inactive') || []} />
                      </ScrollArea>
                  </TabsContent>
              </Tabs>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-3">
              <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase italic">
                  <Zap className="h-3 w-3" />
                  Note: Overdue status indicates the set validity period or target month has passed without a recorded next survey milestone.
              </div>
          </CardFooter>
      </Card>
    </div>
  );
}
