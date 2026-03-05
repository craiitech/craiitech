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
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis,
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
    History
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

    // 1. Accreditation Level Summary (DISAGGREGATED)
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

    // 2. COPC Percentage Summary & Yearly Momentum (DISAGGREGATED)
    const copcWith = filteredCompliances.filter(c => c.ched?.copcStatus === 'With COPC').length;
    const copcPercentage = Math.round((copcWith / programs.length) * 100);

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

    // 3. Faculty Rank Distribution & Global Alignment
    const rankMap: Record<string, number> = {};
    let totalFacultyCount = 0;
    let alignedFacultyCount = 0;

    filteredCompliances.forEach(c => {
        const allFaculty = [
            c.faculty?.dean,
            c.faculty?.associateDean,
            c.faculty?.programChair,
            ...(c.faculty?.members || [])
        ].filter(f => f && f.name && f.name.trim() !== '');

        allFaculty.forEach(f => {
            const rank = f.academicRank || 'Unspecified';
            rankMap[rank] = (rankMap[rank] || 0) + 1;
            
            totalFacultyCount++;
            if (f.isAlignedWithCMO === 'Aligned') {
                alignedFacultyCount++;
            }
        });
    });
    const facultyRankSummary = Object.entries(rankMap).map(([rank, count]) => ({ rank, count }))
        .sort((a, b) => b.count - a.count);

    // 4. Unit Faculty Distribution
    const unitFacultyMap: Record<string, number> = {};
    let totalFacultyHeadcount = 0;
    filteredCompliances.forEach(c => {
        const program = programs.find(p => p.id === c.programId);
        if (!program) return;
        const unitId = program.collegeId;
        
        const count = [
            c.faculty?.dean,
            c.faculty?.associateDean,
            c.faculty?.programChair,
            ...(c.faculty?.members || [])
        ].filter(f => f && f.name && f.name.trim() !== '').length;

        unitFacultyMap[unitId] = (unitFacultyMap[unitId] || 0) + count;
        totalFacultyHeadcount += count;
    });
    const unitFacultySummary = Object.entries(unitFacultyMap).map(([id, count]) => ({
        name: unitMap.get(id) || id,
        count
    })).sort((a, b) => b.count - a.count);

    // 5. Campus Performance Aggregation
    const campusPerformanceData = campuses.map(campus => {
        const campusPrograms = programs.filter(p => p.campusId === campus.id);
        const total = campusPrograms.length;
        
        if (total === 0) return null;

        let accreditedCount = 0;
        let copcCount = 0;

        campusPrograms.forEach(p => {
            const record = filteredCompliances.find(c => c.programId === p.id);
            if (record) {
                if (record.ched?.copcStatus === 'With COPC') copcCount++;

                if (!p.isNewProgram) {
                    const milestones = record.accreditationRecords || [];
                    const current = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
                    if (current && current.level !== 'Non Accredited' && current.level !== 'Preliminary Survey Visit (PSV)') {
                        accreditedCount++;
                    }
                }
            }
        });

        const campusCopcPercentage = total > 0 ? Math.round((copcCount / total) * 100) : 0;
        const campusAccreditedPercentage = total > 0 ? Math.round((accreditedCount / total) * 100) : 0;

        return {
            id: campus.id,
            name: campus.name,
            offeringCount: total,
            accreditedCount,
            accreditedPercentage: campusAccreditedPercentage,
            copcCount,
            copcPercentage: campusCopcPercentage
        };
    }).filter(Boolean).sort((a: any, b: any) => b.offeringCount - a.offeringCount);

    // 6. Missing Document Audit
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
            
            if (!p.isNewProgram) {
                if (!record.accreditationRecords || record.accreditationRecords.length === 0) items.push("Accreditation Milestone");
            }
            
            if (!record.faculty?.members || record.faculty.members.length === 0) items.push("Faculty Staffing List");
            if (!record.graduationRecords || record.graduationRecords.length === 0) items.push("Graduation Outcome Data");
        }

        if (items.length > 0) {
            missingDocs.push({ programName: p.name, campusName, items });
        }
    });

    // 7. Accreditation Roadmap Calculation
    const now = new Date();
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;

    const getSortValue = (validity: string) => {
        if (!validity) return 0;
        if (validity.trim().toUpperCase() === 'WAITING FOR RESULT') return 0;
        if (validity.toLowerCase().includes('no schedule')) return 0;
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
            const detectedYear = Math.floor(val / 100);
            const detectedMonth = val % 100;
            const isWaiting = validity?.trim().toUpperCase() === 'WAITING FOR RESULT';

            let status = 'Scheduled';
            let priority = 3; 

            if (detectedYear > 0) {
                if (detectedYear < currentYearNum || (detectedYear === currentYearNum && detectedMonth < currentMonthNum && detectedMonth > 0)) {
                    status = 'Overdue';
                    priority = 1;
                } else if (detectedYear === currentYearNum) {
                    status = 'Upcoming';
                    priority = 3;
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
                year: detectedYear > 0 ? detectedYear.toString() : (isWaiting ? 'Pending' : 'Other'),
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
                const currentMilestone = milestones.find(m => 
                    m.lifecycleStatus === 'Current' && 
                    m.components?.some(c => c.id === spec.id)
                ) || milestones.find(m => 
                    m.lifecycleStatus === 'Current' && 
                    (!m.components || m.components.length === 0)
                ) || milestones[milestones.length - 1];

                const level = currentMilestone?.level || 'Non Accredited';
                const validity = currentMilestone?.statusValidityDate || 'No schedule set';
                const key = `${level}|${validity}`;
                if (!groups[key]) groups[key] = { level, validity, majorNames: [] };
                groups[key].majorNames.push(spec.name);
            });
            return Object.values(groups).map(group => getEntryData(group.level, group.validity, group.majorNames.join(', ')));
        }

        const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        return [getEntryData(latest?.level || 'Non Accredited', latest?.statusValidityDate || 'No schedule set')];
    }).sort((a, b) => (a.priority !== b.priority) ? (a.priority - b.priority) : (a.sortValue - b.sortValue));

    // Distribution (DISAGGREGATED)
    const distributionYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number }> = {};
    let totalScheduledCount = 0;
    roadmapData.forEach(item => {
        if (item.year !== 'Other' && item.year !== 'Pending') {
            if (!distributionYearlyMap[item.year]) {
                distributionYearlyMap[item.year] = { year: item.year, Undergraduate: 0, Graduate: 0, Inactive: 0 };
            }
            distributionYearlyMap[item.year][item.category]++;
            totalScheduledCount++;
        }
    });
    const distributionSummary = Object.values(distributionYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    // 8. Maturity Radar Data
    const maturityRadarData = [
        { pillar: 'Authority (COPC)', score: copcPercentage, fullMark: 100 },
        { pillar: 'Accreditation', score: Math.round((accreditationSummary.filter(s => s.level.includes('Level')).length / (accreditationSummary.length || 1)) * 100), fullMark: 100 },
        { pillar: 'Faculty Alignment', score: Math.round((alignedFacultyCount / (totalFacultyCount || 1)) * 100), fullMark: 100 },
        { pillar: 'Curriculum Notation', score: Math.round((filteredCompliances.filter(c => c.curriculumRecords?.some(cr => cr.isNotedByChed)).length / (filteredCompliances.length || 1)) * 100), fullMark: 100 },
        { pillar: 'Outcomes Registry', score: Math.round((filteredCompliances.filter(c => c.graduationRecords && c.graduationRecords.length > 0).length / (filteredCompliances.length || 1)) * 100), fullMark: 100 },
    ];

    // 9. Achieved Accreditations per Year (DISAGGREGATED)
    const surveysYearlyMap: Record<string, { year: string, Undergraduate: number, Graduate: number, Inactive: number }> = {};
    let totalAchievedCount = 0;
    filteredCompliances.forEach(c => {
        const prog = programs.find(p => p.id === c.programId);
        if (!prog) return;
        const category = getProgramCategory(prog);
        const milestones = c.accreditationRecords || [];
        milestones.forEach(m => {
            if (m.dateOfSurvey) {
                const yearMatch = m.dateOfSurvey.match(/\d{4}/);
                if (yearMatch) {
                    const year = yearMatch[0];
                    if (!surveysYearlyMap[year]) {
                        surveysYearlyMap[year] = { year, Undergraduate: 0, Graduate: 0, Inactive: 0 };
                    }
                    surveysYearlyMap[year][category]++;
                    totalAchievedCount++;
                }
            }
        });
    });
    const surveysHistoryData = Object.values(surveysYearlyMap).sort((a, b) => a.year.localeCompare(b.year));

    return { 
        accreditationSummary, 
        copcPercentage, 
        copcTotal: copcWith,
        copcHistoryData,
        facultyRankSummary, 
        unitFacultySummary,
        totalFacultyHeadcount,
        campusPerformanceData,
        missingDocs,
        roadmapData,
        distributionSummary,
        totalScheduledCount,
        maturityRadarData,
        surveysHistoryData,
        totalAchievedCount,
        totalPrograms: programs.length, 
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campusMap, unitMap, selectedYear, campuses]);

  const discussionNotes = {
    maturity: { title: "Quality Maturity Discussion", text: "The Maturity Radar visualizes how well programs are balanced across regulatory, academic, and outcome pillars. A 'collapsed' radar indicates a program that may lack valid regulatory authority or outcome evidence." },
    roadmap: { title: "Strategic Pipeline Analysis", text: "Programs in the 'Overdue' category represent immediate threats to the university's institutional rating. The 'Accreditation Velocity' chart identifies upcoming resource mobilization needs across undergraduate, graduate, and closure tracks." },
    history: { title: "Historical Quality Output", text: "Achievements per year show institutional momentum. Disaggregation helps identify whether graduate or undergraduate programs are driving quality improvements in specific cycles." },
    copc: { title: "Regulatory Momentum", text: "Tracking COPC awards per level demonstrates the university's commitment to securing formal recognition across its entire educational portfolio." }
  };

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
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* --- STRATEGIC GAPS REGISTRY --- */}
      <Card className="border-destructive/30 bg-destructive/5 overflow-hidden shadow-md">
          <CardHeader className="bg-destructive/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-destructive">
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Administrative Gaps Registry (Major Deficiencies)</CardTitle>
                  </div>
                  <Badge variant="destructive" className="animate-pulse shadow-sm h-5 text-[9px] font-black uppercase">ACTION REQUIRED</Badge>
              </div>
              <CardDescription className="text-xs font-medium text-destructive/70">Critical documentation deficiencies impacting the university's institutional maturity index for AY {selectedYear}.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 flex-1">
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
                              <p className="text-[10px] text-muted-foreground mt-1">All programs have fulfilled minimum documentation requirements for the current audit cycle.</p>
                          </div>
                      )}
                  </div>
              </ScrollArea>
          </CardContent>
      </Card>

      {/* --- KPI PANEL --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><LayoutGrid className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Scope Context</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-primary tabular-nums">{analytics?.totalPrograms} Programs</div>
                <p className="text-[9px] font-bold text-muted-foreground mt-1 uppercase">Active offerings in current filter</p>
            </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><CheckCircle2 className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-green-700 font-bold">COPC Compliance</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-green-600 tabular-nums">{analytics?.copcPercentage}%</div>
                <p className="text-[9px] font-bold text-green-600/70 mt-1 uppercase">Regulatory operating authority</p>
            </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Award className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-amber-700 font-bold">Quality Maturity</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-amber-600 tabular-nums">
                    {analytics?.accreditationSummary.reduce((acc, curr) => acc + (curr.level.includes('Level') ? curr.total : 0), 0)}
                </div>
                <p className="text-[9px] font-bold text-amber-600/70 mt-1 uppercase">Accredited at Level I or Higher</p>
            </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Users className="h-12 w-12" /></div>
            <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase tracking-wider text-blue-700 font-bold">Monitored Registry</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.monitoredCount}</div>
                <p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Verified AY {selectedYear} data logs</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* --- ACCREDITATION MATURITY BREAKDOWN --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-primary text-white text-[10px] font-black uppercase h-6 px-3">
                        OVERALL TOTAL: {analytics?.totalPrograms || 0}
                    </Badge>
                </div>
                <CardDescription className="text-xs">Distribution of programs across AACCUP accreditation levels.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="level" 
                                type="category" 
                                tick={{ fontSize: 9, fontBold: 700, fill: 'hsl(var(--muted-foreground))' }} 
                                width={140}
                                axisLine={false}
                                tickLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '10px' }} />
                            <Bar dataKey="Undergraduate" fill={chartConfig.Undergraduate.color} radius={[0, 0, 0, 0]} barSize={10} stackId="a">
                                <LabelList dataKey="Undergraduate" position="inside" style={{ fontSize: '8px', fontWeight: '900', fill: '#fff' }} />
                            </Bar>
                            <Bar dataKey="Graduate" fill={chartConfig.Graduate.color} radius={[0, 0, 0, 0]} barSize={10} stackId="a">
                                <LabelList dataKey="Graduate" position="inside" style={{ fontSize: '8px', fontWeight: '900', fill: '#fff' }} />
                            </Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[0, 4, 4, 0]} barSize={10} stackId="a">
                                <LabelList dataKey="Inactive" position="inside" style={{ fontSize: '8px', fontWeight: '900', fill: '#fff' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4 flex gap-3">
                <Info className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    <strong>Disaggregated View:</strong> Visualizing the quality index for both active and inactive tracks ensures that historical data from programs subject for closure does not skew active growth metrics.
                </p>
            </CardFooter>
        </Card>

        {/* --- QUALITY MATURITY RADAR --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Quality Signature</CardTitle>
                </div>
                <CardDescription className="text-xs">University maturity across regulatory, resource, and outcome pillars.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics?.maturityRadarData}>
                            <PolarGrid strokeOpacity={0.1} />
                            <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                            <PolarRadiusAxis domain={[0, 100]} hide />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Radar
                                name="Maturity Score"
                                dataKey="score"
                                stroke="hsl(var(--primary))"
                                fill="hsl(var(--primary))"
                                fillOpacity={0.4}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-blue-50/50 border-t p-4 flex gap-3">
                <Zap className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-blue-800 tracking-widest">{discussionNotes.maturity.title}</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed font-medium italic">
                        {discussionNotes.maturity.text}
                    </p>
                </div>
            </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- ACCREDITATION ROADMAP VELOCITY --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-amber-500 text-white text-[10px] font-black uppercase h-6 px-3">
                        TOTAL SCHEDULED: {analytics?.totalScheduledCount || 0}
                    </Badge>
                </div>
                <CardDescription className="text-xs">Quantity of programs due for survey per year.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.distributionSummary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                            <Bar dataKey="Undergraduate" fill={chartConfig.Undergraduate.color} radius={[0, 0, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Undergraduate.color }} />
                            </Bar>
                            <Bar dataKey="Graduate" fill={chartConfig.Graduate.color} radius={[0, 0, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Graduate.color }} />
                            </Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[2, 2, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-amber-50/50 border-t p-4 flex gap-3">
                <CalendarDays className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-amber-800 tracking-widest">{discussionNotes.roadmap.title}</p>
                    <p className="text-[10px] text-amber-700 leading-relaxed font-medium italic">
                        {discussionNotes.roadmap.text}
                    </p>
                </div>
            </CardFooter>
        </Card>

        {/* --- ACCREDITATION ACHIEVEMENT HISTORY --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="h-5 w-5 text-emerald-600" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Achievement History</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-600 text-white text-[10px] font-black uppercase h-6 px-3">
                        TOTAL ACHIEVEMENTS: {analytics?.totalAchievedCount || 0}
                    </Badge>
                </div>
                <CardDescription className="text-xs">Formal surveys successfully conducted per year (Historical Data).</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.surveysHistoryData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', paddingBottom: '20px' }} />
                            <Bar dataKey="Undergraduate" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} />
                            </Bar>
                            <Bar dataKey="Graduate" fill="#6ee7b7" radius={[0, 0, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} />
                            </Bar>
                            <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[2, 2, 0, 0]} barSize={20} stackId="a">
                                <LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-emerald-50/50 border-t p-4 flex gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">{discussionNotes.history.title}</p>
                    <p className="text-[10px] text-emerald-700 leading-relaxed font-medium italic">
                        {discussionNotes.history.text}
                    </p>
                </div>
            </CardFooter>
        </Card>
      </div>

      {/* --- COPC INSTITUTIONAL MOMENTUM --- */}
      <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Recognition Momentum (COPC)</CardTitle>
                  </div>
                  <Badge className="bg-emerald-600 text-white text-[10px] font-black uppercase h-6 px-3">
                      OVERALL TOTAL: {analytics?.copcTotal || 0}
                  </Badge>
              </div>
              <CardDescription className="text-xs">Annual distribution of Certificate of Program Compliance (COPC) issuance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-10 flex-1">
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                  <ResponsiveContainer>
                      <BarChart data={analytics?.copcHistoryData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                          <RechartsTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }} />
                          <Bar dataKey="Undergraduate" fill="#10b981" radius={[0, 0, 0, 0]} barSize={30} stackId="a">
                              <LabelList dataKey="Undergraduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} />
                          </Bar>
                          <Bar dataKey="Graduate" fill="#6ee7b7" radius={[0, 0, 0, 0]} barSize={30} stackId="a">
                              <LabelList dataKey="Graduate" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: '#065f46' }} />
                          </Bar>
                          <Bar dataKey="Inactive" fill={chartConfig.Inactive.color} radius={[2, 2, 0, 0]} barSize={30} stackId="a">
                              <LabelList dataKey="Inactive" position="top" style={{ fontSize: '9px', fontWeight: '900', fill: chartConfig.Inactive.color }} />
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </ChartContainer>
          </CardContent>
          <CardFooter className="bg-emerald-50/20 border-t p-4 flex gap-3">
              <Zap className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-emerald-800 tracking-widest">{discussionNotes.copc.title}</p>
                  <p className="text-[10px] text-emerald-700 leading-relaxed font-medium italic">
                      {discussionNotes.copc.text}
                  </p>
              </div>
          </CardFooter>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* --- CAMPUS PERFORMANCE MATRIX --- */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Campus Parity Benchmarking</CardTitle>
                </div>
                <CardDescription className="text-xs">Comparative performance index for institutional resource planning.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 flex-1">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Campus Site</TableHead>
                                <TableHead className="text-center font-black text-[10px] uppercase py-3">Accreditation Rate</TableHead>
                                <TableHead className="text-right font-black text-[10px] uppercase py-3 pr-6">COPC %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analytics?.campusPerformanceData.map((campus: any) => (
                                <TableRow key={campus.id} className="hover:bg-muted/20 transition-colors">
                                    <TableCell className="py-3 pl-6">
                                        <div className="flex items-center gap-2">
                                            <School className="h-4 w-4 text-primary opacity-60" />
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{campus.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-xs font-black text-primary">{campus.accreditedPercentage}%</span>
                                            <div className="w-16"><Progress value={campus.accreditedPercentage} className="h-1" /></div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-xs font-black text-emerald-600">{campus.copcPercentage}%</span>
                                            <div className="w-16"><Progress value={campus.copcPercentage} className="h-1" /></div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4">
                <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-slate-500 leading-relaxed italic">
                        <strong>Decision Support Note:</strong> Sites with high COPC% but low Accreditation Rates indicate a need for task-force funding and survey preparation workshops to bridge the parity gap.
                    </p>
                </div>
            </CardFooter>
        </Card>

        {/* --- UNIT FACULTY HEADCOUNT --- */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        <CardTitle className="text-sm font-black uppercase tracking-tight">Unit Faculty Headcount Distribution</CardTitle>
                    </div>
                    <Badge variant="secondary" className="bg-primary text-white text-[10px] font-black uppercase h-6 px-3">
                        TOTAL HEADCOUNT: {analytics?.totalFacultyHeadcount || 0}
                    </Badge>
                </div>
                <CardDescription className="text-xs">Concentration of human resources across academic colleges.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[250px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.unitFacultySummary} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={12}>
                                <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: '#1e3a8a' }} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      {/* --- INSTITUTIONAL SURVEY PIPELINE (ROADMAP) --- */}
      <Card className="shadow-lg border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                      <div className="flex items-center gap-2">
                          <LayoutList className="h-5 w-5 text-primary" />
                          <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Survey Pipeline (Roadmap)</CardTitle>
                      </div>
                      <CardDescription className="text-xs">Strategic chronological timeline of target survey dates across all sites.</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                      {analytics?.distributionSummary.map((dist, idx) => {
                          const style = getYearStyle(dist.year);
                          const total = dist.Undergraduate + dist.Graduate + dist.Inactive;
                          return (
                              <Badge key={idx} variant="outline" className={cn("h-6 px-2 text-[10px] font-black gap-1.5 border-none shadow-sm", style.bg, style.text)}>
                                  <div className={cn("h-1.5 w-1.5 rounded-full", style.text.replace('text-', 'bg-'))} />
                                  YEAR {dist.year}: {total} TARGETS (U:{dist.Undergraduate} | G:{dist.Graduate} | I:{dist.Inactive})
                              </Badge>
                          );
                      })}
                  </div>
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <div className="overflow-x-auto">
                  <Table>
                      <TableHeader className="bg-muted/50">
                          <TableRow>
                              <TableHead className="font-black text-[10px] uppercase py-3 pl-6">Offering & Campus</TableHead>
                              <TableHead className="font-black text-[10px] uppercase py-3 text-center">Program Level</TableHead>
                              <TableHead className="font-black text-[10px] uppercase py-3">Next Target Schedule</TableHead>
                              <TableHead className="font-black text-[10px] uppercase py-3 text-right pr-6">Alert Level</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {analytics?.roadmapData.map((item: any) => {
                              const yearStyle = getYearStyle(item.year);
                              return (
                                  <TableRow key={item.id} className={cn("transition-colors", yearStyle.row)}>
                                      <TableCell className="py-3 pl-6">
                                          <div className="flex flex-col gap-0.5 min-w-0">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                                {item.category === 'Inactive' && (
                                                    <Badge variant="destructive" className="h-3 text-[7px] font-black px-1 uppercase tracking-tighter">FOR CLOSURE</Badge>
                                                )}
                                              </div>
                                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{item.campusName} &bull; {item.level}</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="py-3 text-center">
                                          <Badge variant="outline" className={cn("text-[8px] font-black uppercase h-4 px-1.5", item.programLevel === 'Graduate' ? "border-cyan-200 text-cyan-700 bg-cyan-50" : "border-blue-200 text-blue-700 bg-blue-50")}>
                                              {item.programLevel}
                                          </Badge>
                                      </TableCell>
                                      <TableCell className="py-3">
                                          <span className={cn("text-xs font-black tabular-nums uppercase", yearStyle.text)}>{item.validityText}</span>
                                      </TableCell>
                                      <TableCell className="py-3 text-right pr-6">
                                          <Badge 
                                              className={cn(
                                                  "text-[9px] font-black uppercase h-5 px-2 border-none shadow-sm",
                                                  item.status === 'Overdue' ? "bg-rose-600 text-white" : 
                                                  item.status === 'Result Pending' ? "bg-blue-600 text-white" :
                                                  item.status === 'Upcoming' ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-600"
                                              )}
                                          >
                                              {item.status === 'Overdue' && <AlertTriangle className="h-2.5 w-2.5 mr-1" />}
                                              {item.status}
                                          </Badge>
                                      </TableCell>
                                  </TableRow>
                              );
                          })}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>
    </div>
  );
}
