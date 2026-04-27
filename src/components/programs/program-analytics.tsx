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
    LineChart as LucideLineChart
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
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
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
    const milestoneVelocity: Record<string, any> = {};
    const roadmapData: any[] = [];
    const currentYearNum = new Date().getFullYear();

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };
    const levelCounts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    const accreditationYearCounts: Record<string, number> = {};

    const unitImpactMap: Record<string, number> = {};
    const globalPillarSums = { authority: 0, accreditation: 0, faculty: 0, curriculum: 0, outcomes: 0 };

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
            
            // Process recommendations for unit impact
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

            // Maturity Pillar Calculations for Radar
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
                const validityYear = m.statusValidityDate?.match(/\d{4}/)?.[0];
                if (validityYear) {
                    if (!milestoneVelocity[validityYear]) milestoneVelocity[validityYear] = { year: validityYear, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
                    milestoneVelocity[validityYear][category]++;
                    milestoneVelocity[validityYear].total++;
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

    const unitImpactData = Object.entries(unitImpactMap)
        .map(([id, count]) => ({ name: unitMap.get(id) || id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    const roadmapForecastData = Object.entries(accreditationYearCounts)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year.localeCompare(b.year))
        .filter(d => parseInt(d.year) >= currentYearNum);

    const accreditationDataMap: Record<string, any> = {};
    ACCREDITATION_LEVELS_ORDER.forEach(lvl => {
        accreditationDataMap[lvl] = { level: lvl, Undergraduate: 0, Graduate: 0, Inactive: 0, total: 0 };
    });

    programs.forEach(p => {
        const cat = getProgramCategory(p);
        let lvlKey = 'AWAITING RESULT';
        if (p.isNewProgram) lvlKey = 'Not Yet Subject';
        else {
            const pId = String(p.id).toLowerCase().trim();
            const rec = compliances.find(c => String(c.programId).toLowerCase().trim() === pId);
            const mil = rec?.accreditationRecords || [];
            const cur = mil.find(m => m.lifecycleStatus === 'Current') || mil[mil.length - 1];
            const rawLevel = (cur?.level || 'AWAITING RESULT').trim();
            lvlKey = rawLevel.includes('PSV') ? 'Preliminary Survey Visit (PSV)' : rawLevel;
        }
        if (accreditationDataMap[lvlKey]) { 
            accreditationDataMap[lvlKey][cat]++; 
            accreditationDataMap[lvlKey].total++; 
        }
    });

    const sortTimeline = (data: Record<string, any>) => Object.values(data).sort((a, b) => a.year.localeCompare(b.year));
    const makePieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: chartConfig.Male.color }, 
        { name: 'Female', value: f, fill: chartConfig.Female.color }, 
        { name: 'Others', value: o, fill: chartConfig.Others.color }
    ].filter(d => d.value > 0);

    return { 
        radarData,
        accreditationSummary: Object.values(accreditationDataMap).filter(d => d.total > 0),
        activeCount, 
        inactiveCount,
        activeAccredited, 
        activeCopc,
        statusTotals,
        levelCounts,
        roadmapForecastData,
        copcMomentumData: sortTimeline(copcByYear),
        achievementHistoryData: sortTimeline(achievementByYear),
        milestoneVelocityData: sortTimeline(milestoneVelocity),
        unitImpactData,
        roadmapData,
        gadEnrollment1stData: makePieData(sem1Male, sem1Female),
        gadEnrollment2ndData: makePieData(sem2Male, sem2Female),
        gadEnrollmentSummerData: makePieData(summerMale, summerFemale),
        gadFacultyData: makePieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty),
        monitoredCount,
        integrityRate: programs.length > 0 ? Math.round((monitoredCount / programs.length) * 100) : 0
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

  const handlePrintAssignedReport = () => {
    if (!programs.length || !compliances.length) return;
    try {
        const allAssigned = compliances.flatMap(record => {
            const program = programs.find(p => String(p.id).toLowerCase().trim() === String(record.programId).toLowerCase().trim());
            if (!program) return [];
            return (record.accreditationRecords || []).flatMap(milestone => {
                return (milestone.recommendations || []).map(reco => ({
                    programName: program.name,
                    abbreviation: program.abbreviation,
                    level: milestone.level,
                    surveyDate: milestone.dateOfSurvey,
                    recommendation: reco
                }));
            });
        }).filter(item => item.recommendation.status !== 'Closed');

        const reportHtml = renderToStaticMarkup(
            <AccreditationRecommendationReport 
                items={allAssigned}
                unitMap={unitMap}
                scope="institutional"
                year={selectedYear}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>Institutional Recommendations Audit</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwindcss.min.css" rel="stylesheet"><style>@media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } } body { font-family: serif; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest">Print Institutional Registry</button></div><div id="print-content">${reportHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  const handlePrintByUnitReport = () => {
    if (!programs.length || !compliances.length) return;
    try {
        const unitsWithRecos: Record<string, any[]> = {};
        compliances.forEach(record => {
            const program = programs.find(p => String(p.id).toLowerCase().trim() === String(record.programId).toLowerCase().trim());
            if (!program) return;
            (record.accreditationRecords || []).forEach(milestone => {
                (milestone.recommendations || []).forEach(reco => {
                    if (reco.status !== 'Closed') {
                        (reco.assignedUnitIds || []).forEach(unitId => {
                            if (!unitsWithRecos[unitId]) unitsWithRecos[unitId] = [];
                            unitsWithRecos[unitId].push({
                                programName: program.name,
                                abbreviation: program.abbreviation,
                                level: milestone.level,
                                surveyDate: milestone.dateOfSurvey,
                                recommendation: reco
                            });
                        });
                    }
                });
            });
        });

        const batchHtml = Object.entries(unitsWithRecos).map(([unitId, items]) => {
            const unitName = unitMap.get(unitId) || unitId;
            return renderToStaticMarkup(
                <div key={unitId} className="print-page-break mb-12">
                    <AccreditationRecommendationReport 
                        items={items}
                        unitMap={unitMap}
                        scope="unit"
                        year={selectedYear}
                        unitName={unitName}
                    />
                </div>
            );
        }).join('');

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`<html><head><title>Accountability Registry by Unit</title><link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwindcss.min.css" rel="stylesheet"><style>@media print { body { background: white; margin: 0; padding: 0; } .no-print { display: none !important; } .print-page-break { page-break-after: always; } .print-page-break:last-child { page-break-after: auto; } } body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }</style></head><body><div class="no-print mb-8 flex justify-center"><button onclick="window.print()" class="bg-indigo-600 text-white px-8 py-3 rounded shadow-xl hover:bg-indigo-700 font-black uppercase text-xs tracking-widest transition-all">Print Unit Reports</button></div><div id="print-content">${batchHtml}</div></body></html>`);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (roadmapSortConfig.key === key && roadmapSortConfig.direction === 'asc') direction = 'desc';
    setRoadmapSortConfig({ key, direction });
  };

  const getSortIcon = (key: SortKey) => (
    <ArrowUpDown className={cn("h-3 w-3 ml-1.5 transition-colors", roadmapSortConfig.key === key ? "text-primary opacity-100" : "opacity-20")} />
  );

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>;

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-black">{`${(percent * 100).toFixed(0)}%`}</text>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Scope Portfolio</CardTitle><LayoutGrid className="h-4 w-4 text-primary opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-slate-900 tabular-nums">{analytics?.activeCount} Active</div><p className="text-[9px] font-bold text-muted-foreground uppercase">{analytics?.inactiveCount} Closed Programs</p></CardContent>
            <CardFooter className="bg-muted/10 py-2"><p className="text-[8px] text-muted-foreground italic">Total institutional degree offerings currently monitored.</p></CardFooter>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-700">COPC Performance</CardTitle><CheckCircle2 className="h-4 w-4 text-emerald-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-emerald-600 tabular-nums">{analytics?.activeCopc} Active</div><p className="text-[9px] font-bold text-emerald-600/70 uppercase">Verified Authority Awards</p></CardContent>
            <CardFooter className="bg-emerald-100/20 py-2"><p className="text-[8px] text-emerald-800/60 italic">Programs possessing active Certificates of Compliance.</p></CardFooter>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-700">Quality Maturity</CardTitle><Award className="h-4 w-4 text-amber-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-amber-600 tabular-nums">{analytics?.activeAccredited} Active</div><p className="text-[9px] font-bold text-amber-800/60 uppercase">Level I or Higher AACCUP</p></CardContent>
            <CardFooter className="bg-amber-100/20 py-2"><p className="text-[8px] text-amber-800/60 italic">Active programs with verified accreditation levels.</p></CardFooter>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-700">Monitored Registry</CardTitle><Activity className="h-4 w-4 text-blue-600 opacity-20" /></div></CardHeader>
            <CardContent className="flex-1"><div className="text-3xl font-black text-blue-600 tabular-nums">{analytics?.integrityRate}%</div><p className="text-[9px] font-bold text-blue-600/70 mt-1 uppercase">Data Integrity Index</p></CardContent>
            <CardFooter className="bg-blue-100/20 py-2"><p className="text-[8px] text-muted-foreground italic">Percentage of programs with finalized AY {selectedYear} data logs.</p></CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* STRATEGIC QUALITY PROFILE (RADAR) */}
          <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden flex flex-col relative">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Scale className="h-24 w-24 text-primary" /></div>
              <CardHeader className="bg-muted/10 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Institutional Maturity Profile
                  </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center pt-8">
                  <ChartContainer config={{}} className="h-[300px] w-full">
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
              </CardContent>
              <CardFooter className="bg-muted/5 border-t py-3">
                  <div className="flex items-start gap-3">
                      <Zap className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                          <strong>Analytical Perspective:</strong> Benchmarks overall program health across 5 core pillars.
                      </p>
                  </div>
              </CardFooter>
          </Card>

          {/* ROADMAP FORECAST (BAR) */}
          <Card className="lg:col-span-2 shadow-lg border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                      <CalendarCheck className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Institutional Survey Pipeline Forecast</CardTitle>
                  </div>
                  <CardDescription className="text-[10px]">Volume of upcoming accreditation visits per fiscal year.</CardDescription>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics?.roadmapForecastData.length ? (
                    <ChartContainer config={{}} className="h-[300px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics.roadmapForecastData} margin={{ top: 20, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={50}>
                                    <LabelList dataKey="count" position="top" style={{ fontSize: '11px', fontWeight: '900', fill: 'hsl(var(--primary))' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <CalendarCheck className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">Pipeline Empty</p>
                    </div>
                  )}
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ACCREDITATION RECOMMENDATION ACCOUNTABILITY */}
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <div className="space-y-1">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Recommendation Accountability Summary</CardTitle>
                    <CardDescription className="text-[10px]">Pending accreditor recommendations assigned to institutional units.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrintByUnitReport} className="h-8 text-[9px] font-black bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm gap-1.5 hover:bg-indigo-100">
                        <Building2 className="h-3.5 w-3.5" /> PRINT BY UNIT
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrintAssignedReport} className="h-8 text-[9px] font-black bg-white shadow-sm gap-1.5 border-primary/20 text-primary">
                        <Printer className="h-3.5 w-3.5" /> PRINT REGISTRY
                    </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics?.unitImpactData.length ? (
                    <ChartContainer config={{}} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <BarChart data={analytics.unitImpactData} layout="vertical" margin={{ left: 20, right: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} strokeOpacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={140} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} barSize={14}>
                                    <LabelList dataKey="count" position="right" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--destructive))' }} />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full opacity-20">
                        <ClipboardCheck className="h-12 w-12" />
                        <p className="text-[10px] font-black uppercase tracking-widest mt-2">Zero Assigned Actions</p>
                    </div>
                  )}
              </CardContent>
          </Card>

          {/* HISTORICAL ACHIEVEMENT MOMENTUM (LINE) */}
          <Card className="shadow-md border-primary/10 flex flex-col">
              <CardHeader className="bg-muted/10 border-b py-4">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Compliance & Accreditation Achievement Momentum</CardTitle>
                  </div>
              </CardHeader>
              <CardContent className="pt-10 flex-1">
                  {analytics?.achievementHistoryData.length ? (
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <ResponsiveContainer>
                            <LineChart data={analytics.achievementHistoryData} margin={{ top: 20, right: 30, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="year" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                <RechartsTooltip content={<ChartTooltipContent />} />
                                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', paddingBottom: '20px' }} />
                                <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                                <Line type="monotone" dataKey="Undergraduate" stroke="hsl(var(--chart-1))" strokeWidth={2} strokeDasharray="5 5" />
                                <Line type="monotone" dataKey="Graduate" stroke="hsl(var(--chart-2))" strokeWidth={2} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </ChartContainer>
                  ) : (
                      <div className="flex flex-col items-center justify-center h-full opacity-20">
                          <LucideLineChart className="h-12 w-12" />
                          <p className="text-[10px] font-black uppercase mt-2">Awaiting Longitudinal Data</p>
                      </div>
                  )}
              </CardContent>
          </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
              { title: '1st Sem Enrollment', data: analytics?.gadEnrollment1stData },
              { title: '2nd Sem Enrollment', data: analytics?.gadEnrollment2ndData },
              { title: 'Summer Enrollment', data: analytics?.gadEnrollmentSummerData },
              { title: 'Institutional Faculty Pool', data: analytics?.gadFacultyData }
          ].map((chart, i) => (
              <Card key={i} className="shadow-md h-[320px] flex flex-col border-primary/10">
                  <CardHeader className="p-4 bg-muted/10 border-b shrink-0"><CardTitle className="text-[10px] font-black uppercase text-center">{chart.title}</CardTitle></CardHeader>
                  <CardContent className="p-6 flex-1 flex items-center justify-center">
                      <ChartContainer config={chartConfig} className="h-full w-full">
                          <ResponsiveContainer>
                              <PieChart>
                                  <Pie data={chart.data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={5} dataKey="value" label={renderLabel} labelLine={false}>
                                      {chart.data?.map((e: any, j: number) => <Cell key={j} fill={e.fill} />)}
                                  </Pie>
                                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} />
                              </PieChart>
                          </ResponsiveContainer>
                      </ChartContainer>
                  </CardContent>
              </Card>
          ))}
      </div>

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap (Pipeline)</CardTitle>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 h-6 font-black text-[10px] uppercase"><CheckCircle2 className="h-3 w-3" /> {analytics?.statusTotals.COMPLIANT} Compliant</Badge>
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1.5 h-6 font-black text-[10px] uppercase animate-pulse"><ShieldAlert className="h-3 w-3" /> {analytics?.statusTotals.OVERDUE} Overdue</Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 h-6 font-black text-[10px] uppercase"><Clock className="h-3 w-3" /> {analytics?.statusTotals['AWAITING RESULT']} Pending</Badge>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 h-6 font-black text-[10px] uppercase"><PlusCircle className="h-3 w-3" /> New Program</Badge>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table>
                      <TableHeader className="bg-muted/50 sticky top-0 z-10">
                          <TableRow>
                              <TableHead className="pl-8 py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('name')}>Academic Program Offering {getSortIcon('name')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('campus')}>Campus Site {getSortIcon('campus')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('currentLevel')}>Current Level {getSortIcon('currentLevel')}</Button></TableHead>
                              <TableHead className="py-4"><Button variant="ghost" className="p-0 text-[10px] font-black uppercase hover:bg-transparent" onClick={() => requestSort('validity')}>Validity Date {getSortIcon('validity')}</Button></TableHead>
                              <TableHead className="text-right pr-8 py-4"><Button variant="ghost" className="p-0 h-auto text-[10px] font-black uppercase hover:bg-transparent ml-auto" onClick={() => requestSort('status')}>Status {getSortIcon('status')}</Button></TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {sortedRoadmapData.map(item => (
                              <TableRow key={item.id} className={cn("hover:bg-muted/20 transition-colors", !item.isActive && "opacity-50 grayscale bg-slate-50")}>
                                  <TableCell className="pl-8 py-5">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-black text-sm text-slate-900 leading-none">{item.name}</span>
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{item.level} {!item.isActive && '(CLOSED)'}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{item.campus}</TableCell>
                                  <TableCell className="py-5">
                                    <Badge variant="outline" className="h-5 text-[9px] font-black text-primary border-primary/20 uppercase bg-white">
                                        {item.currentLevel}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-5 text-xs font-black uppercase tabular-nums">{item.validity}</TableCell>
                                  <TableCell className="text-right pr-8 py-5">
                                    <Badge className={cn(
                                        "text-[10px] font-black uppercase border-none px-3 shadow-sm",
                                        !item.isActive ? "bg-slate-400 text-white" :
                                        item.status === 'COMPLIANT' ? "bg-emerald-600 text-white" : 
                                        item.status === 'OVERDUE' ? "bg-rose-600 text-white animate-pulse" : 
                                        item.status === 'AWAITING RESULT' ? "bg-blue-600 text-white" : 
                                        "bg-amber-50 text-amber-950"
                                    )}>
                                        {item.status}
                                    </Badge>
                                  </TableCell>
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
