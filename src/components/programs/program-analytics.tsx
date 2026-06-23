
'use client';

import { useMemo, useState } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, AccreditationRecord, CurriculumRecord, CorrectiveActionRequest, ManagementReviewOutput, AuditFinding, AccreditationRecommendation, User, Signatories, Unit, Campus } from '@/lib/types';
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
    LayoutList,
    Building2,
    Filter,
    Briefcase,
    Gavel,
    BookOpen,
    Scale,
    LayoutGrid,
    CalendarDays,
    ClipboardCheck,
    Printer,
    ListChecks,
    Search,
    X,
    Check,
    Monitor,
    FileWarning,
    ArrowUpRight,
    Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, Timestamp } from '@/firebase/firestore-wrapper';
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
import { renderToStaticMarkup } from 'react-dom/server';
import { AccreditationRecommendationReport } from './recommendation-print-template';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const { toast } = useToast();
  const { userProfile, isAdmin, userRole, isMainCampusDOI, isDoi } = useUser();
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u.name])), [units]);

  // Reco State
  const [recoSearch, setRecoSearch] = useState('');
  const [recoStatusFilter, setRecoStatusFilter] = useState('all');
  const [recoUnitFilter, setRecoUnitFilter] = useState('all');

  // Roadmap State
  const [roadmapSearch, setRoadmapSearch] = useState('');
  const [roadmapCampusFilter, setRoadmapCampusFilter] = useState('all');
  const [roadmapUnitFilter, setRoadmapUnitFilter] = useState('all');

  const [selectedLevelView, setSelectedLevelView] = useState<string>('Level IV');

  const signatoryRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'signatories') : null),
    [firestore]
  );
  const { data: signatories } = useDoc<Signatories>(signatoryRef);

  const analytics = useMemo(() => {
    if (!programs.length) return null;

    const currentYearNum = new Date().getFullYear();
    let activeCount = 0;
    let activeNewCount = 0;
    let closedCount = 0;
    let activeUgCount = 0;
    let activeUgNewCount = 0;
    let activeUgAccredited = 0;
    let activeUgCopc = 0;
    let activeGradCount = 0;
    let activeGradNewCount = 0;
    let activeGradAccredited = 0;
    let activeGradCopc = 0;
    let activeAccredited = 0;
    let activeCopc = 0;
    let currentYearAccreditationCount = 0;
    let programsWithRecordThisYear = 0;

    const statusTotals = { COMPLIANT: 0, OVERDUE: 0, 'AWAITING RESULT': 0, 'NEW PROGRAM': 0 };
    const levelCounts = { L1: 0, L2: 0, L3: 0, L4: 0, Candidate: 0, NewOffering: 0, NonAccredited: 0 };
    const accreditationYearCounts: Record<string, number> = {};

    const globalPillarSums = { authority: 0, accreditation: 0, faculty: 0, curriculum: 0, outcomes: 0 };
    const roadmapData: any[] = [];
    const allRecommendations: any[] = [];
    
    // Yearly Trends Calculation
    const copcByYear: Record<number, number> = {};
    const accreditationByYear: Record<number, number> = {};
    const facultyAlignmentByYear: Record<number, { sum: number, count: number }> = {};
    
    // Faculty Educational Attainment
    const attainmentCounts = { Doctoral: 0, Masters: 0, Bachelors: 0, Others: 0 };

    const uniqueFacultySet = new Set<string>();

    // GAD Totals
    let totalMaleEnrolled = 0;
    let totalFemaleEnrolled = 0;
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalOthersFaculty = 0;
    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;

    programs.forEach(p => {
        const pId = String(p.id).toLowerCase().trim();
        const programRecords = compliances.filter(c => String(c.programId || '').toLowerCase().trim() === pId);
        const record = programRecords.find(c => c.academicYear === selectedYear);
        
        if (record) programsWithRecordThisYear++;

        const milestones = record?.accreditationRecords || [];
        const currentMilestone = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
        
        const officialCurrentMilestone = milestones.find(m => m.lifecycleStatus === 'Current');
        const certificateLink = officialCurrentMilestone?.certificateLink;

        const rawLevel = (currentMilestone?.level || 'Non Accredited').trim();
        const isAccredited = currentMilestone && rawLevel !== 'Non Accredited' && !rawLevel.includes('PSV') && rawLevel !== 'AWAITING RESULT';
        const hasCopc = record?.ched?.copcStatus === 'With COPC';

        // Flatten recommendations for the registry
        milestones.forEach(m => {
            m.recommendations?.forEach(reco => {
                allRecommendations.push({
                    id: reco.id,
                    programName: p.name,
                    abbreviation: p.abbreviation,
                    level: m.level,
                    surveyDate: m.dateOfSurvey,
                    recommendation: reco,
                    certificateLink: certificateLink,
                    college: p.collegeId,
                    campusId: p.campusId,
                    campus: campusMap.get(p.campusId) || p.campusId
                });
            });
        });

        const validityStr = currentMilestone?.statusValidityDate || (p.isNewProgram ? 'NEW PROGRAM' : 'AWAITING RESULT');
        let status = 'AWAITING RESULT';
        let sortYear = 9999;

        if (p.isActive) {
            activeCount++;
            if (p.isNewProgram) activeNewCount++;
            if (isAccredited) activeAccredited++;
            if (hasCopc) activeCopc++;
            
            if (p.level === 'Undergraduate') {
                activeUgCount++;
                if (p.isNewProgram) activeUgNewCount++;
                if (isAccredited) activeUgAccredited++;
                if (hasCopc) activeUgCopc++;
            } else if (p.level === 'Graduate') {
                activeGradCount++;
                if (p.isNewProgram) activeGradNewCount++;
                if (isAccredited) activeGradAccredited++;
                if (hasCopc) activeGradCopc++;
            }
            
            if (p.isNewProgram) levelCounts.NewOffering++;
            else if (rawLevel.includes('Level IV')) levelCounts.L4++;
            else if (rawLevel.includes('Level III')) levelCounts.L3++;
            else if (rawLevel.includes('Level II')) levelCounts.L2++;
            else if (rawLevel.includes('Level I')) levelCounts.L1++;
            else if (rawLevel.toLowerCase().includes('candidate') || rawLevel.includes('PSV')) levelCounts.Candidate++;
            else levelCounts.NonAccredited++;

            // Radar Logic
            if (hasCopc) globalPillarSums.authority += 100;
            if (isAccredited || p.isNewProgram) globalPillarSums.accreditation += 100;
            if (record?.graduationRecords?.length) globalPillarSums.outcomes += 100;
            if (record?.curriculumRecords?.some(c => c.isNotedByChed)) globalPillarSums.curriculum += 100;
            
            let currentAlignment = 100;
            if (record?.faculty?.members?.length) {
                const aligned = record.faculty.members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                currentAlignment = (aligned / (record.faculty.members.length || 1)) * 100;
                globalPillarSums.faculty += currentAlignment;

                // Educational Attainment Loop
                record.faculty.members.forEach(m => {
                    const edu = String(m.highestEducation || '').toLowerCase();
                    if (edu.includes('doctor')) attainmentCounts.Doctoral++;
                    else if (edu.includes('master')) attainmentCounts.Masters++;
                    else if (edu.includes('bachelor')) attainmentCounts.Bachelors++;
                    else attainmentCounts.Others++;
                });
            }

            programRecords.forEach(r => {
                const yr = r.academicYear;
                if (r.ched?.copcStatus === 'With COPC') copcByYear[yr] = (copcByYear[yr] || 0) + 1;
                const rCurrent = (r.accreditationRecords || []).find(m => m.lifecycleStatus === 'Current');
                if (rCurrent && rCurrent.level !== 'Non Accredited') accreditationByYear[yr] = (accreditationByYear[yr] || 0) + 1;
                if (r.faculty?.members?.length) {
                    if (!facultyAlignmentByYear[yr]) facultyAlignmentByYear[yr] = { sum: 0, count: 0 };
                    const rAligned = r.faculty.members.filter(m => m.isAlignedWithCMO === 'Aligned').length;
                    facultyAlignmentByYear[yr].sum += (rAligned / r.faculty.members.length) * 100;
                    facultyAlignmentByYear[yr].count++;
                }
            });

            const enrollmentRecords = record?.enrollmentRecords || [];
            enrollmentRecords.forEach(rec => {
                const term = rec.firstSemester;
                if (term) (['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const).forEach(lvl => {
                    totalMaleEnrolled += Number(term[lvl]?.male || 0);
                    totalFemaleEnrolled += Number(term[lvl]?.female || 0);
                });
            });

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

            if (p.isNewProgram) status = 'NEW PROGRAM';
            else if (validityStr && validityStr !== 'AWAITING RESULT' && validityStr !== 'TBA') {
                const yearMatch = validityStr.match(/\d{4}/);
                const dYear = yearMatch ? parseInt(yearMatch[0]) : 0;
                if (dYear > 0) {
                    sortYear = dYear;
                    accreditationYearCounts[dYear] = (accreditationYearCounts[dYear] || 0) + 1;
                    if (dYear === currentYearNum) currentYearAccreditationCount++;
                }
                if (dYear > 0 && dYear < currentYearNum) status = 'OVERDUE';
                else if (dYear >= currentYearNum) status = 'COMPLIANT';
            }
            statusTotals[status as keyof typeof statusTotals]++;
        } else {
            closedCount++;
            status = 'CLOSED';
        }

        roadmapData.push({
            id: p.id,
            name: p.name,
            level: p.level,
            campus: campusMap.get(p.campusId) || '...',
            campusId: p.campusId,
            unitId: p.collegeId,
            currentLevel: rawLevel || (p.isNewProgram ? 'Not Yet Subject' : 'AWAITING RESULT'),
            validity: p.isNewProgram ? 'NEW PROGRAM' : (validityStr === 'TBA' ? 'AWAITING RESULT' : validityStr),
            status,
            isActive: p.isActive,
            isNewProgram: p.isNewProgram,
            sortYear
        });
    });

    const radarData = [
        { pillar: 'Authority', score: Math.round(globalPillarSums.authority / (activeCount || 1)) },
        { pillar: 'Accreditation', score: Math.round(globalPillarSums.accreditation / (activeCount || 1)) },
        { pillar: 'Faculty', score: Math.round(globalPillarSums.faculty / (activeCount || 1)) },
        { pillar: 'Curriculum', score: Math.round(globalPillarSums.curriculum / (activeCount || 1)) },
        { pillar: 'Outcomes', score: Math.round(globalPillarSums.outcomes / (activeCount || 1)) },
    ];

    const facultyAttainmentData = [
        { name: 'Doctoral', value: attainmentCounts.Doctoral, fill: '#1B6535' },
        { name: 'Masters', value: attainmentCounts.Masters, fill: '#EAB308' },
        { name: 'Bachelors', value: attainmentCounts.Bachelors, fill: '#3b82f6' },
        { name: 'Others', value: attainmentCounts.Others, fill: '#f1f5f9' },
    ].filter(d => d.value > 0);

    const campusPerf = campuses.map(c => {
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

    const copcTrendData = Object.entries(copcByYear).map(([year, count]) => ({ year, count })).sort((a,b) => a.year.localeCompare(b.year));
    const accreditationTrendData = Object.entries(accreditationByYear).map(([year, count]) => ({ year, count })).sort((a,b) => a.year.localeCompare(b.year));
    const facultyTrendData = Object.entries(facultyAlignmentByYear).map(([year, data]) => ({ year, rate: Math.round(data.sum / data.count) })).sort((a,b) => a.year.localeCompare(b.year));
    
    return { 
        radarData,
        campusPerf,
        copcTrendData,
        accreditationTrendData,
        facultyTrendData,
        facultyAttainmentData,
        activeCount, 
        activeNewCount,
        activeUgCount,
        activeUgNewCount,
        activeUgAccredited,
        activeUgCopc,
        activeGradCount,
        activeGradNewCount,
        activeGradAccredited,
        activeGradCopc,
        closedCount,
        activeAccredited, 
        activeCopc,
        statusTotals,
        levelCounts,
        currentYearAccreditationCount,
        programsWithRecordThisYear,
        dataIntegrityIndex: Math.round((programsWithRecordThisYear / (activeCount || 1)) * 100),
        roadmapForecastData,
        accreditationYearCounts,
        roadmapData,
        allRecommendations,
        overallQualityScore: Math.round(radarData.reduce((acc, curr) => acc + curr.score, 0) / 5),
        totals: { students: totalMaleEnrolled + totalFemaleEnrolled, faculty: totalMaleFaculty + totalFemaleFaculty + totalOthersFaculty, grads: totalMaleGrads + totalFemaleGrads },
        gadData: {
            enrollment: [{ name: 'Male', value: totalMaleEnrolled, fill: COLORS[0] }, { name: 'Female', value: totalFemaleEnrolled, fill: COLORS[2] }].filter(d => d.value > 0),
            faculty: [{ name: 'Male', value: totalMaleFaculty, fill: COLORS[0] }, { name: 'Female', value: totalFemaleFaculty, fill: COLORS[2] }, { name: 'Others', value: totalOthersFaculty, fill: COLORS[1] }].filter(d => d.value > 0),
            grads: [{ name: 'Male', value: totalMaleGrads, fill: COLORS[0] }, { name: 'Female', value: totalFemaleGrads, fill: COLORS[2] }].filter(d => d.value > 0)
        }
    };
  }, [programs, compliances, campuses, campusMap, selectedYear]);

  /**
   * FILTERED ROADMAP DATA
   */
  const filteredRoadmap = useMemo(() => {
    if (!analytics?.roadmapData) return [];

    return analytics.roadmapData
        .filter(item => {
            if (!isAdmin && !isMainCampusDOI && userProfile) {
                const isSiteOversight = userRole?.includes('Director') || userRole?.includes('ODIMO') || userRole?.includes('Instruction') || userRole?.includes('DOI') || isDoi;
                if (isSiteOversight) {
                    if (item.campusId !== userProfile.campusId) return false;
                } else {
                    if (item.unitId !== userProfile.unitId) return false;
                }
            }

            if (isAdmin) {
                if (roadmapCampusFilter !== 'all' && item.campusId !== roadmapCampusFilter) return false;
                if (roadmapUnitFilter !== 'all' && item.unitId !== roadmapUnitFilter) return false;
            }

            if (roadmapSearch) {
                const lowerSearch = roadmapSearch.toLowerCase();
                return (
                    item.name.toLowerCase().includes(lowerSearch) ||
                    item.level.toLowerCase().includes(lowerSearch) ||
                    item.currentLevel.toLowerCase().includes(lowerSearch)
                );
            }

            return true;
        })
        .sort((a, b) => a.sortYear - b.sortYear || a.name.localeCompare(b.name));
  }, [analytics?.roadmapData, isAdmin, userProfile, userRole, roadmapSearch, roadmapCampusFilter, roadmapUnitFilter, isDoi]);

  const filteredRecommendations = useMemo(() => {
    if (!analytics?.allRecommendations) return [];

    return analytics.allRecommendations.filter(item => {
        const isSiteOversight = userRole?.includes('Director') || userRole?.includes('ODIMO') || userRole?.includes('Instruction') || userRole?.includes('DOI') || isDoi;

        if (!isAdmin && !isMainCampusDOI && userProfile) {
            if (isSiteOversight) {
                if (item.campusId !== userProfile.campusId) return false;
            } else if (userProfile.unitId) {
                const isAssigned = item.recommendation.assignedUnitIds?.includes(userProfile.unitId);
                if (!isAssigned) return false;
            }
        }

        if (isAdmin && recoUnitFilter !== 'all') {
            const isAssigned = item.recommendation.assignedUnitIds?.includes(recoUnitFilter);
            if (!isAssigned) return false;
        }

        if (recoStatusFilter !== 'all' && item.recommendation.status !== recoStatusFilter) return false;

        if (recoSearch) {
            const lowerSearch = recoSearch.toLowerCase();
            if (!item.programName.toLowerCase().includes(lowerSearch) && !item.recommendation.text.toLowerCase().includes(lowerSearch)) return false;
        }

        return true;
    }).map(item => ({
        ...item,
        recommendation: {
            ...item.recommendation,
            assignedUnitIds: item.recommendation.assignedUnitIds || []
        }
    }));
  }, [analytics, isAdmin, userProfile, userRole, isDoi, recoSearch, recoStatusFilter, recoUnitFilter]);

  const programsByLevel = useMemo(() => {
    if (!analytics?.roadmapData) return {};
    const groups: Record<string, typeof analytics.roadmapData> = {
      'Level IV': [],
      'Level III': [],
      'Level II': [],
      'Level I': [],
      'Candidate': [],
      'New Offering': [],
      'Non-Accredited': []
    };

    analytics.roadmapData.forEach(r => {
      if (!r.isActive) return;
      
      const pObj = programs.find(p => p.id === r.id);
      const abbr = pObj?.abbreviation || r.name;

      if (r.isNewProgram) {
        groups['New Offering'].push({ ...r, abbreviation: abbr });
      } else if (r.currentLevel.includes('Level IV')) {
        groups['Level IV'].push({ ...r, abbreviation: abbr });
      } else if (r.currentLevel.includes('Level III')) {
        groups['Level III'].push({ ...r, abbreviation: abbr });
      } else if (r.currentLevel.includes('Level II')) {
        groups['Level II'].push({ ...r, abbreviation: abbr });
      } else if (r.currentLevel.includes('Level I')) {
        groups['Level I'].push({ ...r, abbreviation: abbr });
      } else if (r.currentLevel.toLowerCase().includes('candidate') || r.currentLevel.includes('PSV')) {
        groups['Candidate'].push({ ...r, abbreviation: abbr });
      } else {
        groups['Non-Accredited'].push({ ...r, abbreviation: abbr });
      }
    });

    return groups;
  }, [analytics?.roadmapData, programs]);

  const handlePrintGaps = () => {
    if (!filteredRecommendations.length) {
        toast({ title: "No Gaps Recorded", description: "There are no active records matching the current selection.", variant: "destructive" });
        return;
    }

    try {
        const reportHtml = renderToStaticMarkup(
            <AccreditationRecommendationReport 
                items={filteredRecommendations}
                unitMap={unitMap}
                scope={isAdmin && recoUnitFilter === 'all' ? "institutional" : "unit"}
                year={selectedYear}
                unitName={!isAdmin ? unitMap.get(userProfile?.unitId || '') : (recoUnitFilter !== 'all' ? unitMap.get(recoUnitFilter) : undefined)}
            />
        );

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Accreditation Gaps Registry - AY ${selectedYear}</title>
                        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                        <style>
                            @page { size: 8.5in 13in !important; margin: 0.5in !important; }
                            @media print { body { background: white; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } } 
                            body { font-family: serif; background: #f9fafb; padding: 40px; color: black; font-size: 11pt; }
                        </style>
                    </head>
                    <body>
                        <div class="no-print mb-8 flex justify-center">
                            <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl font-black uppercase text-xs tracking-widest transition-all">Click to Print Folio Report</button>
                        </div>
                        <div id="print-content">
                            ${reportHtml}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
        }
    } catch (e) { console.error(e); }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>;
  if (!analytics) return null;

  const ugCopcRate = analytics.activeUgCount > 0 ? Math.round((analytics.activeUgCopc / analytics.activeUgCount) * 100) : 0;
  const gradCopcRate = analytics.activeGradCount > 0 ? Math.round((analytics.activeGradCopc / analytics.activeGradCount) * 100) : 0;

  const activeUgAccreditable = analytics.activeUgCount - analytics.activeUgNewCount;
  const ugAccredRate = activeUgAccreditable > 0 ? Math.round((analytics.activeUgAccredited / activeUgAccreditable) * 100) : 0;

  const activeGradAccreditable = analytics.activeGradCount - analytics.activeGradNewCount;
  const gradAccredRate = activeGradAccreditable > 0 ? Math.round((analytics.activeGradAccredited / activeGradAccreditable) * 100) : 0;

  const levelCategories = [
    { name: 'Level IV', color: 'bg-indigo-600', textColor: 'text-indigo-600', borderColor: 'border-indigo-200' },
    { name: 'Level III', color: 'bg-blue-600', textColor: 'text-blue-600', borderColor: 'border-blue-200' },
    { name: 'Level II', color: 'bg-emerald-600', textColor: 'text-emerald-600', borderColor: 'border-emerald-200' },
    { name: 'Level I', color: 'bg-emerald-400', textColor: 'text-emerald-400', borderColor: 'border-emerald-200' },
    { name: 'Candidate', color: 'bg-amber-500', textColor: 'text-amber-600', borderColor: 'border-amber-200' },
    { name: 'New Offering', color: 'bg-purple-500', textColor: 'text-purple-600', borderColor: 'border-purple-200' },
    { name: 'Non-Accredited', color: 'bg-slate-400', textColor: 'text-slate-500', borderColor: 'border-slate-200' }
  ];

  const displayedLevel = programsByLevel[selectedLevelView]?.length > 0 
    ? selectedLevelView 
    : (levelCategories.find(c => (programsByLevel[c.name]?.length || 0) > 0)?.name || 'Level IV');

  const accreditationDistData = [
    { name: 'Level IV', value: analytics.levelCounts.L4, fill: '#1e3a8a' },
    { name: 'Level III', value: analytics.levelCounts.L3, fill: '#3b82f6' },
    { name: 'Level II', value: analytics.levelCounts.L2, fill: '#10b981' },
    { name: 'Level I', value: analytics.levelCounts.L1, fill: '#34d399' },
    { name: 'Candidate', value: analytics.levelCounts.Candidate, fill: '#fbbf24' },
    { name: 'New Offering', value: analytics.levelCounts.NewOffering, fill: '#a855f7' },
    { name: 'Non-Accredited', value: analytics.levelCounts.NonAccredited, fill: '#94a3b8' },
  ].filter(d => d.value > 0);

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-slate-50/50 border-slate-200 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Scope Portfolio</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" aria-label="Scope Portfolio Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">Scope Portfolio</p>
                  <p className="text-slate-200">Tracks the ratio of active program offerings currently offered by the institution versus closed or phased-out programs.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-black text-slate-900 leading-none mb-2">{analytics.activeCount} Active</div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-slate-200/60">
              <p className="text-[10px] font-black text-slate-700 leading-tight">
                {analytics.activeCount} of {programs.length} total programs active
              </p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                {analytics.closedCount} Closed / Phased-Out Programs
              </p>
            </div>
        </Card>
        <Card className="bg-emerald-50/20 border-emerald-100 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/70">COPC Performance</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-emerald-400 hover:text-emerald-600 transition-colors focus:outline-none" aria-label="COPC Performance Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">COPC Performance</p>
                  <p className="text-slate-200">Measures the percentage of active academic programs holding a valid CHED Certificate of Program Compliance (COPC).</p>
                  <p className="text-[9px] text-emerald-400 font-bold mt-1">Regulatory Target: 100%</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-black text-emerald-600 leading-none mb-2">{analytics.activeCopc} Compliant</div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-emerald-100/60">
              <p className="text-[10px] font-black text-slate-700 leading-tight">
                {analytics.activeCopc} of {analytics.activeCount} active offerings with COPC
              </p>
              <p className="text-[9px] font-bold text-emerald-600/70 uppercase tracking-widest">
                {analytics.activeCount > 0 ? Math.round((analytics.activeCopc / analytics.activeCount) * 100) : 0}% COPC Compliance Rate
              </p>
            </div>
        </Card>
        <Card className="bg-cyan-50/20 border-cyan-100 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-600/70">COPC by Level</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-cyan-400 hover:text-cyan-600 transition-colors focus:outline-none" aria-label="COPC by Level Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">COPC by Level</p>
                  <p className="text-slate-200">Shows the percentage of active Undergraduate and Graduate programs that hold a valid Certificate of Program Compliance (COPC).</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-3 my-auto">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Undergraduate</span>
                  <span className="text-xs font-black text-cyan-600">
                    {ugCopcRate}% <span className="text-[9px] text-slate-500 font-normal">({analytics.activeUgCopc}/{analytics.activeUgCount})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100/75 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${ugCopcRate}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Graduate</span>
                  <span className="text-xs font-black text-cyan-600">
                    {gradCopcRate}% <span className="text-[9px] text-slate-500 font-normal">({analytics.activeGradCopc}/{analytics.activeGradCount})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100/75 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-cyan-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${gradCopcRate}%` }}></div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-cyan-100/60">
              <p className="text-[9px] font-bold text-cyan-600/70 uppercase tracking-widest">
                Compliance by level
              </p>
            </div>
        </Card>
        <Card className="bg-amber-50/20 border-amber-100 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70">Quality Maturity</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-amber-400 hover:text-amber-600 transition-colors focus:outline-none" aria-label="Quality Maturity Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">Quality Maturity</p>
                  <p className="text-slate-200">Measures the percentage of active academic programs (excluding new program offerings not yet subject to accreditation) that have attained AACCUP Level I or above accreditation.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-black text-amber-600 leading-none mb-2">{analytics.activeAccredited} Accredited</div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-amber-100/60">
              <p className="text-[10px] font-black text-slate-700 leading-tight">
                {analytics.activeAccredited} of {analytics.activeCount - analytics.activeNewCount} accreditable programs accredited
              </p>
              <p className="text-[9px] font-bold text-amber-600/70 uppercase tracking-widest">
                {(analytics.activeCount - analytics.activeNewCount) > 0 ? Math.round((analytics.activeAccredited / (analytics.activeCount - analytics.activeNewCount)) * 100) : 0}% Accreditation Rate
              </p>
            </div>
        </Card>
        <Card className="bg-indigo-50/20 border-indigo-100 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70">Accreditation by Level</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-indigo-400 hover:text-indigo-600 transition-colors focus:outline-none" aria-label="Accreditation by Level Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">Accreditation by Level</p>
                  <p className="text-slate-200">Measures the percentage of accreditable Undergraduate and Graduate programs that have achieved Level I or higher accreditation.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-3 my-auto">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Undergraduate</span>
                  <span className="text-xs font-black text-indigo-600">
                    {ugAccredRate}% <span className="text-[9px] text-slate-500 font-normal">({analytics.activeUgAccredited}/{activeUgAccreditable})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100/75 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${ugAccredRate}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[11px] font-bold text-slate-700">Graduate</span>
                  <span className="text-xs font-black text-indigo-600">
                    {gradAccredRate}% <span className="text-[9px] text-slate-500 font-normal">({analytics.activeGradAccredited}/{activeGradAccreditable})</span>
                  </span>
                </div>
                <div className="w-full bg-slate-100/75 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${gradAccredRate}%` }}></div>
                </div>
              </div>
            </div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-indigo-100/60">
              <p className="text-[9px] font-bold text-indigo-600/70 uppercase tracking-widest">
                Accreditation by level
              </p>
            </div>
        </Card>
        <Card className="bg-blue-50/20 border-blue-100 shadow-sm rounded-2xl overflow-hidden flex flex-col p-5 transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/70">Monitored Registry</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-blue-400 hover:text-blue-600 transition-colors focus:outline-none" aria-label="Monitored Registry Information">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium leading-relaxed bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                  <p className="font-bold border-b border-slate-700 pb-1 mb-1">Monitored Registry</p>
                  <p className="text-slate-200">Calculates active compliance cycle reporting coverage. Higher index denotes more complete data submissions.</p>
                  <p className="text-[9px] text-blue-400 font-bold mt-1">Data integrity index: submissions vs. active offerings.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-3xl font-black text-blue-600 leading-none mb-2">{analytics.dataIntegrityIndex}%</div>
            <div className="space-y-1.5 mt-auto pt-3 border-t border-blue-100/60">
              <p className="text-[10px] font-black text-slate-700 leading-tight">
                {analytics.programsWithRecordThisYear} of {analytics.activeCount} active programs reported
              </p>
              <p className="text-[9px] font-bold text-blue-600/70 uppercase tracking-widest">
                Reporting Coverage (AY {selectedYear})
              </p>
            </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 shadow-lg border-primary/10 rounded-3xl overflow-hidden flex flex-col bg-white min-h-[420px]">
              <CardHeader className="py-5 px-8 border-b flex flex-row items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/60">Strategic Maturity Profile</CardTitle></CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
                  <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer><RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.radarData}><PolarGrid strokeOpacity={0.1} /><PolarAngleAxis dataKey="pillar" tick={{ fontSize: 10, fontWeight: 'bold' }} /><PolarRadiusAxis angle={30} domain={[0, 100]} hide /><Radar name="Maturity" dataKey="score" stroke="#1B6535" fill="#1B6535" fillOpacity={0.4} /></RadarChart></ResponsiveContainer>
                  </ChartContainer>
                  <div className="text-center mt-4"><span className="text-5xl font-black tabular-nums tracking-tighter text-primary">{analytics.overallQualityScore}%</span><p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em] mt-1">Institutional Quality Score</p></div>
              </CardContent>
          </Card>
          <Card className="lg:col-span-1 shadow-lg border-primary/10 rounded-3xl overflow-hidden flex flex-col bg-white min-h-[420px]">
              <CardHeader className="py-5 px-8 border-b flex flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/60">Accreditation Distribution</CardTitle>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none" aria-label="Accreditation Distribution Information">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] text-[10px] font-medium bg-slate-900 text-white border-none p-2.5 shadow-lg rounded-md">
                    <p className="font-bold border-b border-slate-700 pb-1 mb-1">Accreditation Distribution</p>
                    <p className="text-slate-200">Visualizes active offerings per AACCUP status. Select a category below to view the corresponding academic programs.</p>
                  </TooltipContent>
                </Tooltip>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-6 overflow-hidden">
                  <ChartContainer config={{}} className="h-[150px] w-full shrink-0">
                      <ResponsiveContainer>
                          <PieChart>
                              <Pie 
                                  data={accreditationDistData} 
                                  cx="50%" 
                                  cy="50%" 
                                  innerRadius={45} 
                                  outerRadius={65} 
                                  paddingAngle={3} 
                                  dataKey="value"
                              >
                                  {accreditationDistData.map((entry, idx) => (
                                      <Cell key={idx} fill={entry.fill} className="outline-none" />
                                  ))}
                              </Pie>
                              <RechartsTooltip />
                          </PieChart>
                      </ResponsiveContainer>
                  </ChartContainer>

                  <div className="flex flex-wrap gap-1.5 justify-center py-2 border-t border-b border-slate-100 my-2 shrink-0">
                      {levelCategories.map((cat) => {
                          const count = programsByLevel[cat.name]?.length || 0;
                          const isSelected = displayedLevel === cat.name;
                          if (count === 0) return null;
                          return (
                              <button
                                  key={cat.name}
                                  onClick={() => setSelectedLevelView(cat.name)}
                                  className={cn(
                                      "px-2 py-1 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-1 border",
                                      isSelected 
                                          ? `${cat.color} text-white border-transparent shadow-sm scale-105` 
                                          : `bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100`
                                  )}
                              >
                                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isSelected ? "bg-white" : cat.color)}></span>
                                  {cat.name} ({count})
                              </button>
                          );
                      })}
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                      <ScrollArea className="flex-1">
                          <div className="flex flex-wrap gap-1.5 p-1 justify-center">
                              {programsByLevel[displayedLevel]?.map((prog: any) => (
                                  <Tooltip key={prog.id}>
                                      <TooltipTrigger asChild>
                                          <div className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-slate-100/80 transition-colors cursor-help text-center shrink-0">
                                              <span className="text-[10px] font-black text-slate-800 block leading-tight font-mono">{prog.abbreviation}</span>
                                              <span className="text-[7px] text-muted-foreground font-black uppercase tracking-tighter mt-0.5 block">{prog.campus}</span>
                                          </div>
                                      </TooltipTrigger>
                                      <TooltipContent className="bg-slate-900 border-none text-white text-[10px] p-2.5 rounded-md shadow-lg max-w-[220px]">
                                          <p className="font-bold">{prog.name}</p>
                                          <p className="text-slate-300 text-[9px] mt-0.5">{prog.campus} &bull; {prog.currentLevel}</p>
                                      </TooltipContent>
                                  </Tooltip>
                              ))}
                              {(!programsByLevel[displayedLevel] || programsByLevel[displayedLevel].length === 0) && (
                                  <p className="text-[10px] text-muted-foreground italic text-center py-6 w-full">No active programs recorded in this level.</p>
                              )}
                          </div>
                      </ScrollArea>
                  </div>
              </CardContent>
          </Card>
          <Card className="lg:col-span-1 shadow-lg border-primary/10 rounded-3xl overflow-hidden flex flex-col bg-white min-h-[420px]">
              <CardHeader className="py-5 px-8 border-b flex flex-row items-center gap-2"><BookOpen className="h-4 w-4 text-emerald-600" /><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/60">Faculty Educational Attainment (GAD)</CardTitle></CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center p-8">
                  <ChartContainer config={{}} className="h-[250px] w-full mb-8">
                      <ResponsiveContainer><PieChart><Pie data={analytics.facultyAttainmentData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.facultyAttainmentData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}</Pie><RechartsTooltip /><Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '20px' }} /></PieChart></ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
          </Card>
          <Card className="lg:col-span-1 shadow-lg border-primary/10 rounded-3xl overflow-hidden flex flex-col bg-white min-h-[420px]">
              <CardHeader className="py-5 px-8 border-b flex flex-row items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-600" /><CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-800/60">Institutional Survey Pipeline</CardTitle></CardHeader>
              <CardContent className="pt-10 flex-1">
                  <ChartContainer config={{}} className="h-[350px] w-full">
                      <ResponsiveContainer><BarChart data={analytics.roadmapForecastData} margin={{ left: 10, right: 10 }}><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} /><XAxis dataKey="year" tick={{ fontSize: 12, fontWeight: 'bold' }} axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} /><RechartsTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="#1B6535" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: '900', fill: '#1B6535' }} /></Bar></BarChart></ResponsiveContainer>
                  </ChartContainer>
              </CardContent>
          </Card>
      </div>

      <Separator className="my-8" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="shadow-md border-primary/10 overflow-hidden">
              <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-sm font-black uppercase text-primary">Authority Maturity (COPC Trend)</CardTitle></CardHeader>
              <CardContent className="pt-8"><ChartContainer config={{}} className="h-[250px] w-full"><ResponsiveContainer><BarChart data={analytics.copcTrendData}><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} /><XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} /><YAxis hide /><RechartsTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="#1B6535" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: '900', fill: '#1B6535' }} /></Bar></BarChart></ResponsiveContainer></ChartContainer></CardContent>
          </Card>
          <Card className="shadow-md border-primary/10 overflow-hidden">
              <CardHeader className="bg-muted/5 border-b"><CardTitle className="text-sm font-black uppercase text-indigo-700">Accreditation Excellence velocity</CardTitle></CardHeader>
              <CardContent className="pt-8"><ChartContainer config={{}} className="h-[250px] w-full"><ResponsiveContainer><BarChart data={analytics.accreditationTrendData}><CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} /><XAxis dataKey="year" tick={{ fontSize: 11, fontWeight: 'bold' }} axisLine={false} /><YAxis hide /><RechartsTooltip content={<ChartTooltipContent />} /><Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}><LabelList dataKey="count" position="top" style={{ fontSize: '12px', fontWeight: '900', fill: '#1e3a8a' }} /></Bar></BarChart></ResponsiveContainer></ChartContainer></CardContent>
          </Card>
      </div>

      <div className="space-y-4 pt-6">
          <div className="flex items-center gap-2 text-primary"><Users className="h-5 w-5" /><h3 className="text-lg font-black uppercase tracking-tight">Institutional GAD Reach Summary</h3></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-blue-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> Student Sex Distribution</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full"><ResponsiveContainer><PieChart><Pie data={analytics.gadData.enrollment} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadData.enrollment.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer></ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.students.toLocaleString()}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Enrollment</p></div>
                  </CardContent>
              </Card>
              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-emerald-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-600" /> System Registered User</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full"><ResponsiveContainer><PieChart><Pie data={analytics.gadData.faculty} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadData.faculty.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer></ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.faculty.toLocaleString()}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Deduplicated Personnel</p></div>
                  </CardContent>
              </Card>
              <Card className="shadow-md border-primary/10 flex flex-col">
                  <CardHeader className="pb-2 border-b bg-purple-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-600" /> Graduation Audit</CardTitle></CardHeader>
                  <CardContent className="pt-6 flex-1 flex flex-col items-center">
                      <ChartContainer config={{}} className="h-[200px] w-full"><ResponsiveContainer><PieChart><Pie data={analytics.gadData.grads} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>{analytics.gadData.grads.map((e, j) => <Cell key={j} fill={e.fill} />)}</Pie><RechartsTooltip content={<ChartTooltipContent hideLabel />} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} /></PieChart></ResponsiveContainer></ChartContainer>
                      <div className="mt-4 text-center"><p className="text-2xl font-black text-slate-800 tabular-nums">{analytics.totals.grads.toLocaleString()}</p><p className="text-[10px] font-bold text-muted-foreground uppercase">Total Graduates</p></div>
                  </CardContent>
              </Card>
          </div>
      </div>

      <Separator />

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1"><div className="flex items-center gap-2 text-primary"><ClipboardCheck className="h-6 w-6" /><CardTitle className="text-lg font-black uppercase tracking-tight">Accreditor's Recommendations & Compliance Log</CardTitle></div><CardDescription className="text-xs font-medium">Registry of accreditation gaps focused on both Academic and Non-Academic Units.</CardDescription></div>
                  <Button onClick={handlePrintGaps} variant="outline" className="h-10 bg-white border-primary/20 text-primary font-black uppercase text-[10px] tracking-widest gap-2 shadow-sm"><Printer className="h-4 w-4" /> {isAdmin ? 'Print Institutional Gaps Registry' : 'Print Unit Compliance Report'}</Button>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 p-4 rounded-xl border border-primary/5">
                <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search recommendations..." value={recoSearch} onChange={(e) => setRecoSearch(e.target.value)} className="h-9 pl-8 text-xs bg-white"/></div>
                <Select value={recoStatusFilter} onValueChange={setRecoStatusFilter}><SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="All Statuses" /></SelectTrigger><SelectContent><SelectItem value="all">All Implementation Statuses</SelectItem><SelectItem value="Open">Open (Pending)</SelectItem><SelectItem value="In Progress">In Progress</SelectItem><SelectItem value="Closed">Closed (Complied)</SelectItem></SelectContent></Select>
                {isAdmin ? (<Select value={recoUnitFilter} onValueChange={setRecoUnitFilter}><SelectTrigger className="h-9 text-xs bg-white"><SelectValue placeholder="All Units / Offices" /></SelectTrigger><SelectContent><SelectItem value="all">Institutional View (All Units)</SelectItem>{units.sort((a,b) => a.name.localeCompare(b.name)).map(u => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}</SelectContent></Select>) : (<div className="flex items-center px-4 h-9 rounded-md border bg-muted/20 text-[10px] font-black uppercase text-primary/60">Locked to: {unitMap.get(userProfile?.unitId || '')}</div>)}
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                  <Table><TableHeader className="bg-muted/30 sticky top-0 z-10"><TableRow><TableHead className="pl-8 py-4 text-[10px] font-black uppercase">Academic Offering</TableHead><TableHead className="text-[10px] font-black uppercase">Type</TableHead><TableHead className="text-[10px] font-black uppercase">Accreditor's Recommendation</TableHead><TableHead className="text-[10px] font-black uppercase">Accountable Units / Offices</TableHead><TableHead className="text-right pr-8 text-[10px] font-black uppercase">Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                          {filteredRecommendations.map((item, idx) => (
                              <TableRow key={idx} className="hover:bg-muted/20 transition-colors"><TableCell className="pl-8 py-5"><div className="flex flex-col"><span className="font-black text-xs text-slate-900 leading-tight uppercase">{item.programName}</span><Badge variant="secondary" className="bg-primary/5 text-primary border-none h-4 px-1.5 text-[8px] font-black w-fit mt-1">{item.level}</Badge></div></TableCell><TableCell><Badge variant={item.recommendation.type === 'Mandatory' ? 'destructive' : 'secondary'} className="h-5 text-[8px] font-black uppercase">{item.recommendation.type}</Badge></TableCell><TableCell className="py-5 max-w-md"><p className="text-xs font-bold text-slate-800 italic leading-relaxed">{item.recommendation.text}</p>{item.recommendation.additionalInfo && (<div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground uppercase"><Info className="h-3 w-3" /> Area: {item.recommendation.additionalInfo}</div>)}</TableCell><TableCell><div className="flex flex-wrap gap-1">{(item.recommendation.assignedUnitIds || []).map((uid: string) => (<Badge key={uid} variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 h-4 px-1.5 text-[8px] font-bold">{unitMap.get(uid) || uid}</Badge>))}{!item.recommendation.assignedUnitIds?.length && <span className="text-[9px] text-muted-foreground italic">Institutional</span>}</div></TableCell><TableCell className="text-right pr-8"><Badge className={cn("h-6 px-3 text-[9px] font-black uppercase border-none shadow-sm", item.recommendation.status === 'Open' ? "bg-rose-600 text-white" : item.recommendation.status === 'In Progress' ? "bg-amber-50 text-amber-950" : item.recommendation.status === 'Move to the Official Current Level' ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white")}>{item.recommendation.status}</Badge></TableCell></TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </ScrollArea>
          </CardContent>
      </Card>

      <Separator />

      <Card className="shadow-xl border-primary/10 overflow-hidden">
          <CardHeader className="bg-primary/5 border-b py-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1"><div className="flex items-center gap-2 text-primary"><CalendarCheck className="h-5 w-5" /><CardTitle className="text-lg font-black uppercase tracking-tight">Institutional Survey Roadmap (Pipeline)</CardTitle></div><CardDescription className="text-xs font-medium">Strategic temporal view of accreditation targets.</CardDescription></div>
                  <div className="flex flex-wrap items-center gap-3">
                      <div className="flex bg-white rounded-2xl border shadow-sm p-3 gap-6">
                          <div className="text-center px-1"><p className="text-xs font-black text-slate-900">{analytics.levelCounts.L1}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Level I</p></div>
                          <div className="text-center px-1"><p className="text-xs font-black text-slate-900">{analytics.levelCounts.L2}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Level II</p></div>
                          <div className="text-center px-1"><p className="text-xs font-black text-slate-900">{analytics.levelCounts.L3}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Level III</p></div>
                          <div className="text-center px-1 border-r pr-4 mr-2"><p className="text-xs font-black text-slate-900">{analytics.levelCounts.L4}</p><p className="text-[8px] font-bold text-muted-foreground uppercase">Level IV</p></div>
                          <div className="text-center bg-indigo-50 px-3 rounded-lg flex flex-col justify-center"><p className="text-sm font-black text-indigo-700 leading-none">{analytics.currentYearAccreditationCount}</p><p className="text-[7px] font-black text-indigo-500 uppercase tracking-tighter mt-1">CURRENT YEAR CONDUCT</p></div>
                      </div>
                  </div>
              </div>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 p-4 rounded-xl border border-primary/5">
                <div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search programs in pipeline..." value={roadmapSearch} onChange={(e) => setRoadmapSearch(e.target.value)} className="h-9 pl-8 text-xs bg-white"/></div>
                {isAdmin ? (
                    <>
                        <Select value={roadmapCampusFilter} onValueChange={setRoadmapCampusFilter}><SelectTrigger className="h-9 text-xs bg-white"><div className="flex items-center gap-1.5"><School className="h-3 w-3 opacity-50" /><SelectValue placeholder="All Campuses" /></div></SelectTrigger><SelectContent><SelectItem value="all" className="text-[10px] font-black">Institutional View (All Sites)</SelectItem>{campuses.sort((a,b) => a.name.localeCompare(b.name)).map(c => (<SelectItem key={c.id} value={c.id} className="text-[10px] font-bold">{c.name}</SelectItem>))}</SelectContent></Select>
                        <Select value={roadmapUnitFilter} onValueChange={setRoadmapUnitFilter}><SelectTrigger className="h-9 text-xs bg-white"><div className="flex items-center gap-1.5"><Building2 className="h-3 w-3 opacity-50" /><SelectValue placeholder="All Academic Units" /></div></SelectTrigger><SelectContent><SelectItem value="all" className="text-[10px] font-black">All Academic Units</SelectItem>{units.filter(u => u.category === 'Academic').sort((a,b) => a.name.localeCompare(b.name)).map(u => (<SelectItem key={u.id} value={u.id} className="text-[10px] font-bold">{u.name}</SelectItem>))}</SelectContent></Select>
                    </>
                ) : (<div className="md:col-span-2 flex items-center px-4 h-9 rounded-md border bg-muted/20 text-[10px] font-black uppercase text-primary/60"><ShieldCheck className="h-3.5 w-3.5 mr-2" />Authorized View Locked: {unitMap.get(userProfile?.unitId || '') || campusMap.get(userProfile?.campusId || '')}</div>)}
              </div>
          </CardHeader>
          <CardContent className="p-0">
              <Tabs defaultValue="active" className="w-full">
                  <div className="bg-muted/30 px-6 py-2 border-b">
                      <TabsList className="h-8 bg-background border p-0.5">
                          <TabsTrigger value="active" className="text-[10px] font-black uppercase px-6 h-7">Active Programs</TabsTrigger>
                          <TabsTrigger value="new" className="text-[10px] font-black uppercase px-6 h-7">New Programs</TabsTrigger>
                          <TabsTrigger value="closed" className="text-[10px] font-black uppercase px-6 h-7">Closed Programs</TabsTrigger>
                      </TabsList>
                  </div>
                  <TabsContent value="active" className="m-0"><RoadmapTable data={filteredRoadmap.filter(r => r.isActive && !r.isNewProgram)} campusMap={campusMap} /></TabsContent>
                  <TabsContent value="new" className="m-0"><RoadmapTable data={filteredRoadmap.filter(r => r.isActive && r.isNewProgram)} campusMap={campusMap} /></TabsContent>
                  <TabsContent value="closed" className="m-0"><RoadmapTable data={filteredRoadmap.filter(r => !r.isActive)} campusMap={campusMap} /></TabsContent>
              </Tabs>
          </CardContent>
      </Card>
      </div>
    </TooltipProvider>
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
                            <TableCell className="py-5 text-xs font-bold text-slate-600 uppercase">{campusMap.get(item.campusId) || item.campus}</TableCell>
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
                                    item.status === 'NEW PROGRAM' ? "bg-blue-600 text-white" :
                                    "bg-slate-500 text-white"
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
