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
    Radar, 
    RadarChart, 
    PolarGrid, 
    PolarAngleAxis, 
    PolarRadiusAxis
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
    ChevronRight
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

const ACCREDITATION_COLORS: Record<string, string> = {
    'Level IV Re-accredited': '#1e3a8a',
    'Level IV Accredited': '#1e40af',
    'Level III Re-accredited': '#1d4ed8',
    'Level III Accredited': '#2563eb',
    'Level II Re-accredited': '#3b82f6',
    'Level II Accredited': '#60a5fa',
    'Level I Re-accredited': '#93c5fd',
    'Level I Accredited': '#bfdbfe',
    'PSV': '#fbbf24',
    'Non Accredited': '#ef4444',
    'Not Yet Subject': '#94a3b8'
};

export function ProgramAnalytics({ programs, compliances, campuses, units, isLoading, selectedYear }: ProgramAnalyticsProps) {
  const { userRole, isAdmin } = useUser();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const filteredProgramIds = new Set(programs.map(p => p.id));
    const filteredCompliances = compliances.filter(c => filteredProgramIds.has(c.programId));

    // 1. Accreditation Level Summary
    const accreditationMap: Record<string, number> = {
        'Level IV Re-accredited': 0, 'Level IV Accredited': 0,
        'Level III Re-accredited': 0, 'Level III Accredited': 0,
        'Level II Re-accredited': 0, 'Level II Accredited': 0,
        'Level I Re-accredited': 0, 'Level I Accredited': 0,
        'PSV': 0, 'Non Accredited': 0, 'Not Yet Subject': 0
    };
    
    programs.forEach(p => {
        if (p.isNewProgram) {
            accreditationMap['Not Yet Subject']++;
            return;
        }

        const record = filteredCompliances.find(c => c.programId === p.id);
        if (!record || !record.accreditationRecords || record.accreditationRecords.length === 0) {
            accreditationMap['Non Accredited']++;
            return;
        }

        const milestones = record.accreditationRecords;
        const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        
        let level = latest?.level || 'Non Accredited';
        if (level.includes('Preliminary Survey Visit')) level = 'PSV';
        
        if (accreditationMap[level] !== undefined) {
            accreditationMap[level]++;
        } else {
            accreditationMap['Non Accredited']++;
        }
    });

    const accreditationSummary = Object.entries(accreditationMap)
        .filter(([_, count]) => count > 0)
        .map(([level, count]) => ({
            level,
            count,
            percentage: Math.round((count / programs.length) * 100)
        })).sort((a, b) => b.count - a.count);

    // 2. COPC Percentage Summary
    const copcWith = filteredCompliances.filter(c => c.ched?.copcStatus === 'With COPC').length;
    const copcPercentage = Math.round((copcWith / programs.length) * 100);

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

    // 4. Unit Faculty Distribution (Headcount per Academic Unit)
    const unitFacultyMap: Record<string, number> = {};
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
        monthNames.forEach((m, idx) => {
            if (validity.toLowerCase().includes(m)) month = idx + 1;
        });
        
        return year * 100 + month;
    };

    const roadmapData = programs.flatMap(p => {
        const record = filteredCompliances.find(c => c.programId === p.id);
        const campusName = campusMap.get(p.campusId) || 'Unknown';
        
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
            } else if (isWaiting) {
                status = 'Result Pending';
                priority = 2; 
            } else {
                status = 'Unscheduled';
                priority = 4;
            }

            return {
                id: `${p.id}-${suffix || 'base'}`,
                name: suffix ? `${p.name} (${suffix})` : p.name,
                campusName,
                level,
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

                if (!groups[key]) {
                    groups[key] = { level, validity, majorNames: [] };
                }
                groups[key].majorNames.push(spec.name);
            });

            return Object.values(groups).map(group => {
                const suffix = group.majorNames.join(', ');
                return getEntryData(group.level, group.validity, suffix);
            });
        }

        const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        return [getEntryData(latest?.level || 'Non Accredited', latest?.statusValidityDate || 'No schedule set')];
    })
    .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
        return a.name.localeCompare(b.name);
    });

    const yearlyDistribution: Record<string, number> = {};
    roadmapData.forEach(item => {
        if (item.year !== 'Other' && item.year !== 'Pending') {
            yearlyDistribution[item.year] = (yearlyDistribution[item.year] || 0) + 1;
        }
    });
    const distributionSummary = Object.entries(yearlyDistribution)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year));

    // 8. Quality Maturity Radar Data (Institutional Parity)
    const maturityRadarData = [
        { pillar: 'Authority (COPC)', score: copcPercentage, fullMark: 100 },
        { pillar: 'Accreditation', score: Math.round((accreditationSummary.filter(s => s.level.includes('Level')).length / (accreditationSummary.length || 1)) * 100), fullMark: 100 },
        { pillar: 'Faculty Alignment', score: Math.round((alignedFacultyCount / (totalFacultyCount || 1)) * 100), fullMark: 100 },
        { pillar: 'Curriculum Notation', score: Math.round((filteredCompliances.filter(c => c.curriculumRecords?.some(cr => cr.isNotedByChed)).length / (filteredCompliances.length || 1)) * 100), fullMark: 100 },
        { pillar: 'Outcomes Registry', score: Math.round((filteredCompliances.filter(c => c.graduationRecords && c.graduationRecords.length > 0).length / (filteredCompliances.length || 1)) * 100), fullMark: 100 },
    ];

    return { 
        accreditationSummary, 
        copcPercentage, 
        facultyRankSummary, 
        unitFacultySummary,
        campusPerformanceData,
        missingDocs,
        roadmapData,
        distributionSummary,
        maturityRadarData,
        totalPrograms: programs.length, 
        monitoredCount: filteredCompliances.length 
    };
  }, [programs, compliances, campusMap, unitMap, selectedYear, campuses]);

  const discussionNotes = {
    maturity: {
        title: "Quality Maturity Discussion",
        text: "The Maturity Radar visualizes how well programs are balanced across regulatory, academic, and outcome pillars. A 'collapsed' radar (low scores) indicates a program that may have high accreditation levels but lacks valid regulatory authority (COPC) or outcome evidence."
    },
    roadmap: {
        title: "Strategic Pipeline Analysis",
        text: "Programs in the 'Overdue' category represent immediate threats to the university's institutional rating. The 'Accreditation Velocity' chart helps the Planning and Development Office anticipate budgetary requirements for task force operations over the next 24-36 months."
    },
    faculty: {
        title: "Human Capital Sufficiency",
        text: "Faculty Density vs. Rank determines whether a unit has the 'Depth' required for Graduate studies. High percentages of lower ranks (Instructors) in professional board programs may trigger CHED RQAT non-compliance flags."
    }
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
          <CardContent className="p-0">
              <ScrollArea className="max-h-[300px]">
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
                    {analytics?.accreditationSummary.filter(s => s.level.includes('Level')).reduce((acc, curr) => acc + curr.count, 0)}
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
                <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Maturity Profile</CardTitle>
                </div>
                <CardDescription className="text-xs">Distribution of programs across AACCUP accreditation levels.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.accreditationSummary} layout="vertical" margin={{ left: 20, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis 
                                dataKey="level" 
                                type="category" 
                                tick={{ fontSize: 9, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                                width={140}
                                axisLine={false}
                                tickLine={false}
                            />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14} animationDuration={1500}>
                                {analytics?.accreditationSummary.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={ACCREDITATION_COLORS[entry.level] || '#94a3b8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t p-4 flex gap-3">
                <Info className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
                <p className="text-[9px] text-slate-500 leading-relaxed italic">
                    <strong>Institutional Performance Note:</strong> High concentration in the "Level II Re-accredited" or above indicates established quality. Programs in "PSV" or "Non Accredited" are priority targets for task force activation.
                </p>
            </CardFooter>
        </Card>

        {/* --- QUALITY MATURITY RADAR --- */}
        <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Pillar-Based Quality Radar</CardTitle>
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
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Accreditation Milestone Velocity</CardTitle>
                </div>
                <CardDescription className="text-xs">Quantity of programs due for survey per year.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 flex-1">
                <ChartContainer config={{}} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={analytics?.distributionSummary}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                            <RechartsTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40}>
                                {analytics?.distributionSummary.map((entry, index) => {
                                    const style = getYearStyle(entry.year);
                                    return <Cell key={index} fill={style.text.includes('blue') ? '#3b82f6' : style.text.includes('green') ? '#10b981' : '#f59e0b'} />;
                                })}
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
                          return (
                              <Badge key={idx} variant="outline" className={cn("h-6 px-2 text-[10px] font-black gap-1.5 border-none shadow-sm", style.bg, style.text)}>
                                  <div className={cn("h-1.5 w-1.5 rounded-full", style.text.replace('text-', 'bg-'))} />
                                  YEAR {dist.year}: {dist.count} TARGETS
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
                                              <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">{item.campusName} &bull; {item.level}</span>
                                          </div>
                                      </TableCell>
                                      <TableCell className="py-3">
                                          <span className={cn("text-xs font-black tabular-nums uppercase", yearStyle.text)}>{item.validityText}</span>
                                      </TableCell>
                                      <TableCell className="py-3 text-right pr-6">
                                          <Badge 
                                              className={cn(
                                                  "text-[9px] font-black uppercase h-5 px-2 border-none shadow-sm",
                                                  item.status === 'Overdue' ? "bg-rose-600 text-white animate-pulse" : 
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
