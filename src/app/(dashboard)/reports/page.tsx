
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Campus, Unit, Submission, User as AppUser, Cycle, Risk, ProgramComplianceRecord } from '@/lib/types';
import { collection, query, where, doc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Loader2, 
    School, 
    Users, 
    Printer, 
    BarChart3, 
    TrendingUp, 
    ShieldCheck, 
    Activity, 
    LayoutGrid, 
    Users2, 
    GraduationCap, 
    Briefcase,
    Info,
    Target,
    CheckCircle2,
    Zap
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactDOMServer from 'react-dom/server';
import { AdminReport } from '@/components/reports/admin-report';
import { SubmissionMatrixReport } from '@/components/reports/submission-matrix-report';
import { submissionTypes } from '@/app/(dashboard)/submissions/new/page';
import { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer, 
    Cell,
    PieChart,
    Pie,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    LabelList
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';

export default function ReportsPage() {
  const { userProfile, isAdmin, isUserLoading, isSupervisor } = useUser();
  const firestore = useFirestore();

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const canViewReports = isAdmin || isSupervisor;

  useEffect(() => {
    if (!isAdmin && userProfile?.campusId) {
      setSelectedCampusId(userProfile.campusId);
    }
  }, [isAdmin, userProfile]);

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports) return null;
    if (isAdmin) return collection(firestore, 'units');
    if (isSupervisor && userProfile?.campusId) {
        return query(collection(firestore, 'units'), where('campusIds', 'array-contains', userProfile.campusId));
    }
    return null;
  }, [firestore, canViewReports, isAdmin, isSupervisor, userProfile]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (userProfile?.campusId) {
        return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, canViewReports, isAdmin, userProfile]);
  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports) return null;
    if (isAdmin) return collection(firestore, 'risks');
    if (userProfile?.campusId) {
        return query(collection(firestore, 'risks'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, canViewReports, isAdmin, userProfile]);
  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports) return null;
    return query(collection(firestore, 'programCompliances'), where('academicYear', '==', selectedYear));
  }, [firestore, canViewReports, selectedYear]);
  const { data: allCompliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports || !userProfile) return null;
    if (isAdmin) return collection(firestore, 'users');
    if (isSupervisor && userProfile.campusId) {
        return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, canViewReports, isAdmin, isSupervisor, userProfile]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);
  
  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const processedSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    return rawSubmissions.filter(s => s.year === selectedYear);
  }, [rawSubmissions, selectedYear]);

  const matrixData = useMemo(() => {
    if (!rawSubmissions || !allCampuses || !allUnits || isUserLoading) return [];

    const submissionMap = new Map<string, Submission>(
      rawSubmissions.filter(s => s.year === selectedYear).map(s => {
        const key = `${s.campusId}-${s.unitId}-${s.reportType}-${s.cycleId}`.toLowerCase();
        return [key, s];
      })
    );
    
    const relevantCampuses = isSupervisor && !isAdmin && userProfile?.campusId
      ? allCampuses.filter(c => String(c.id).trim() === String(userProfile.campusId).trim())
      : allCampuses;

    return relevantCampuses.map(campus => {
      const cId = String(campus.id).trim();
      const campusUnits = allUnits.filter(unit => unit.campusIds?.some(id => String(id).trim() === cId));
      if (campusUnits.length === 0) return null;
      
      const unitStatuses = campusUnits.map(unit => {
        const uId = String(unit.id).trim();
        const statuses: Record<string, 'submitted' | 'missing' | 'not-applicable'> = {};
        const cycles = ['first', 'final'] as const;
        cycles.forEach(cycleId => {
            const rorKey = `${cId}-${uId}-risk and opportunity registry-${cycleId}`.toLowerCase();
            const rorSubmission = submissionMap.get(rorKey);
            const isActionPlanNA = String(rorSubmission?.riskRating || '').toLowerCase() === 'low';
            submissionTypes.forEach(reportType => {
                const submissionKey = `${cId}-${uId}-${reportType.toLowerCase()}-${cycleId}`.toLowerCase();
                if (reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA) statuses[submissionKey] = 'not-applicable';
                else if (submissionMap.has(submissionKey)) statuses[submissionKey] = 'submitted';
                else statuses[submissionKey] = 'missing';
            });
        });
        return { unitId: uId, unitName: unit.name, statuses };
      }).sort((a,b) => a.unitName.localeCompare(b.unitName));

      return { campusId: cId, campusName: campus.name, units: unitStatuses };
    }).filter(Boolean as any).sort((a:any, b:any) => a.campusName.localeCompare(b.campusName));
  }, [rawSubmissions, allCampuses, allUnits, selectedYear, isSupervisor, isAdmin, userProfile, isUserLoading]);

  const visualAnalytics = useMemo(() => {
    if (!allCampuses || !allUnits) return null;

    const filteredCompliances = allCompliances?.filter(c => {
        if (!selectedCampusId || selectedCampusId === 'all') return true;
        return c.campusId === selectedCampusId;
    }) || [];

    const campusPerf = allCampuses.map(c => {
        const campusUnits = allUnits.filter(u => u.campusIds?.includes(c.id));
        const campusSubs = processedSubmissions.filter(s => s.campusId === c.id);
        const approved = campusSubs.filter(s => s.statusId === 'approved').length;
        const totalPossible = campusUnits.length * (submissionTypes.length * 2);
        return {
            name: c.name,
            Approved: approved,
            Pending: campusSubs.filter(s => s.statusId === 'submitted').length,
            Maturity: totalPossible > 0 ? Math.round((approved / totalPossible) * 100) : 0
        };
    });

    let totalMaleEnrolled = 0;
    let totalFemaleEnrolled = 0;
    
    let totalMaleFaculty = 0;
    let totalFemaleFaculty = 0;
    let totalOthersFaculty = 0;

    let totalMaleGrads = 0;
    let totalFemaleGrads = 0;

    const uniqueFacultySet = new Set<string>();

    filteredCompliances.forEach(record => {
        const s1 = record.stats?.enrollment?.firstSemester;
        if (s1) {
            ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'].forEach((lvl: any) => {
                totalMaleEnrolled += Number(s1[lvl]?.male || 0);
                totalFemaleEnrolled += Number(s1[lvl]?.female || 0);
            });
        }
        
        if (record.faculty) {
            const roster = [...(record.faculty.members || [])];
            if (record.faculty.dean?.name) roster.push(record.faculty.dean as any);
            if (record.faculty.programChair?.name) roster.push(record.faculty.programChair as any);
            if (record.faculty.hasAssociateDean && record.faculty.associateDean?.name) {
                roster.push(record.faculty.associateDean as any);
            }
            
            roster.forEach(m => {
                if (!m.name || m.name.trim() === '') return;
                const dedupKey = `${m.name.trim()}-${record.campusId}`.toLowerCase();
                if (!uniqueFacultySet.has(dedupKey)) {
                    uniqueFacultySet.add(dedupKey);
                    if (m.sex === 'Male') totalMaleFaculty++;
                    else if (m.sex === 'Female') totalFemaleFaculty++;
                    else totalOthersFaculty++;
                }
            });
        }

        record.graduationRecords?.forEach(grad => {
            totalMaleGrads += Number(grad.maleCount || 0);
            totalFemaleGrads += Number(grad.femaleCount || 0);
        });
    });

    const createPieData = (m: number, f: number, o: number = 0) => [
        { name: 'Male', value: m, fill: 'hsl(var(--chart-1))' },
        { name: 'Female', value: f, fill: 'hsl(var(--chart-2))' },
        { name: 'Others (LGBTQI++)', value: o, fill: 'hsl(var(--chart-3))' }
    ].filter(d => d.value > 0);

    const gadEnrollmentData = createPieData(totalMaleEnrolled, totalFemaleEnrolled);
    const gadFacultyData = createPieData(totalMaleFaculty, totalFemaleFaculty, totalOthersFaculty);
    const gadGradsData = createPieData(totalMaleGrads, totalFemaleGrads);

    const yearRisks = allRisks?.filter(r => {
        const matchesYear = r.year === selectedYear;
        const matchesCampus = (!selectedCampusId || selectedCampusId === 'all') || r.campusId === selectedCampusId;
        return matchesYear && matchesCampus;
    }) || [];

    const riskRatingData = [
        { name: 'High', value: yearRisks.filter(r => r.preTreatment?.rating === 'High').length, fill: 'hsl(var(--destructive))' },
        { name: 'Medium', value: yearRisks.filter(r => r.preTreatment?.rating === 'Medium').length, fill: 'hsl(48 96% 53%)' },
        { name: 'Low', value: yearRisks.filter(r => r.preTreatment?.rating === 'Low').length, fill: 'hsl(142 71% 45%)' },
    ].filter(d => d.value >= 0);

    const radarData = campusPerf.map(c => ({
        subject: c.name,
        A: c.Maturity,
        fullMark: 100
    }));

    return { 
        campusPerf, 
        gadEnrollmentData, 
        gadFacultyData, 
        gadGradsData, 
        riskRatingData, 
        radarData, 
        totals: { 
            students: totalMaleEnrolled + totalFemaleEnrolled, 
            faculty: totalMaleFaculty + totalFemaleFaculty + totalOthersFaculty, 
            grads: totalMaleGrads + totalFemaleGrads 
        } 
    };
  }, [allCampuses, allUnits, processedSubmissions, allRisks, allCompliances, selectedYear, selectedCampusId]);

  const handlePrint = () => {
    if (!isAdmin || !rawSubmissions || !allCampuses || !allUnits) return;
    const reportHtml = ReactDOMServer.renderToStaticMarkup(<AdminReport submissions={rawSubmissions} campuses={allCampuses} units={allUnits} />);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Admin Report</title><style>body { font-family: sans-serif; margin: 2rem; } table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 10px; } th, td { border: 1px solid #ddd; padding: 6px; text-align: left; } th { background-color: #f2f2f2; } .header { text-align: center; margin-bottom: 2rem; } .footer { margin-top: 2rem; font-style: italic; color: #555; font-size: 10px; } .report-title { margin-top: 1rem; text-align: center; font-weight: bold; text-transform: uppercase; }</style></head><body>${reportHtml}<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script></body></html>`);
      printWindow.document.close();
    }
  };

  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits || isLoadingSubmissions || isLoadingUsers || isLoadingRisks || isLoadingCompliances;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Institutional Reports</h2>
          <p className="text-muted-foreground text-sm">Comprehensive university-wide analytics and system directory.</p>
        </div>
        <div className="flex items-center gap-3">
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px] h-9 bg-white font-bold shadow-sm">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {[2024, 2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                </SelectContent>
            </Select>
            {isAdmin && (
            <Button size="sm" onClick={handlePrint} className="h-9 shadow-lg shadow-primary/20">
                <Printer className="mr-2 h-4 w-4" />
                Print Data Log
            </Button>
            )}
        </div>
      </div>

      <Tabs defaultValue="visuals" className="space-y-6">
        <TabsList className="bg-muted p-1 border shadow-sm w-fit">
            <TabsTrigger value="visuals" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                <BarChart3 className="h-4 w-4" /> Strategic Insights
            </TabsTrigger>
            <TabsTrigger value="directory" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2">
                <LayoutGrid className="h-4 w-4" /> System Directory
            </TabsTrigger>
        </TabsList>

        <TabsContent value="visuals" className="space-y-6 animate-in fade-in duration-500">
            <Card className="border-primary/10 bg-primary/5">
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Info className="h-5 w-5" />
                        <span className="text-xs font-black uppercase tracking-widest">Analytics Context: {selectedYear} Registry</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Site Filter:</span>
                        <Select value={selectedCampusId || 'all'} onValueChange={setSelectedCampusId}>
                            <SelectTrigger className="w-[200px] h-8 bg-white border-primary/20 text-xs font-bold">
                                <SelectValue placeholder="All Campuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Institutional (All Sites)</SelectItem>
                                {allCampuses?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {visualAnalytics ? (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="lg:col-span-1 shadow-lg border-primary/10 overflow-hidden flex flex-col">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Institutional Maturity Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1">
                            <ChartContainer config={{}} className="h-[300px] w-full">
                                <ResponsiveContainer>
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={visualAnalytics.radarData}>
                                        <PolarGrid strokeOpacity={0.1} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <Radar name="Maturity %" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4}>
                                            <LabelList dataKey="A" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: 'hsl(var(--primary))' }} formatter={(v: any) => `${v}%`} />
                                        </Radar>
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter className="bg-muted/5 border-t py-3">
                            <div className="flex items-start gap-2">
                                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-muted-foreground italic leading-tight">
                                    <strong>Analytical Perspective:</strong> This profile tracks verified documentation maturity across different campuses.
                                </p>
                            </div>
                        </CardFooter>
                    </Card>

                    <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden flex flex-col">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Campus Compliance Benchmarking
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 flex-1">
                            <ChartContainer config={{}} className="h-[350px] w-full">
                                <ResponsiveContainer>
                                    <BarChart data={visualAnalytics.campusPerf}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <YAxis tick={{ fontSize: 10 }} />
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black', paddingTop: '10px' }} />
                                        <Bar dataKey="Approved" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Approved" position="top" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                        <Bar dataKey="Pending" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="Pending" position="top" style={{ fontSize: '10px', fontWeight: 'bold' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter className="bg-muted/5 border-t py-3">
                            <div className="flex items-start gap-2">
                                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-muted-foreground italic leading-tight">
                                    <strong>Analytical Perspective:</strong> Benchmarks total approved documents against those awaiting verification.
                                </p>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Users2 className="h-5 w-5" />
                        <h3 className="text-lg font-black uppercase tracking-tight">Gender & Development (GAD) Summary</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="shadow-md border-primary/10 flex flex-col">
                            <CardHeader className="pb-2 border-b bg-blue-50/30">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-blue-600" /> Student Sex Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadEnrollmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadEnrollmentData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.students}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Enrollment</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md border-primary/10 flex flex-col">
                            <CardHeader className="pb-2 border-b bg-emerald-50/30">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <Briefcase className="h-4 w-4 text-emerald-600" /> SYSTEM REGISTERED USER
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadFacultyData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadFacultyData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.faculty}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Deduplicated Personnel</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md border-primary/10 flex flex-col">
                            <CardHeader className="pb-2 border-b bg-purple-50/30">
                                <CardTitle className="text-xs font-black uppercase flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-purple-600" /> Graduation GAD Audit
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadGradsData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadGradsData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.grads}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Graduates</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <Card className="shadow-lg border-primary/10 overflow-hidden flex flex-col">
                    <CardHeader className="bg-muted/10 border-b py-4">
                        <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-primary" />
                            <CardTitle className="text-sm font-black uppercase flex items-center gap-2">
                                Institutional Risk Distribution Profile
                            </CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 flex-1">
                        <ChartContainer config={{}} className="h-[250px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={visualAnalytics.riskRatingData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'black' }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <Tooltip content={<ChartTooltipContent />} />
                                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '10px' }} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                                        <LabelList dataKey="value" position="top" style={{ fontSize: '11px', fontWeight: '900' }} />
                                        {visualAnalytics.riskRatingData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                </>
            ) : (
                <div className="py-20 text-center opacity-20"><Activity className="h-12 w-12 mx-auto" /><p className="font-black uppercase text-xs mt-2">Analytical Engine Priming...</p></div>
            )}
        </TabsContent>

        <TabsContent value="directory" className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-1 border-primary/10 shadow-md">
                    <CardHeader className="bg-muted/10 border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <School className="h-5 w-5 text-primary" />
                            Site Organization Registry
                        </CardTitle>
                        <CardDescription className="text-xs">Drill down into campus units and assigned personnel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <Select onValueChange={setSelectedCampusId} value={selectedCampusId || ''} disabled={!isAdmin}>
                            <SelectTrigger className="bg-white font-bold h-10"><SelectValue placeholder="Select a campus..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sites</SelectItem>
                                {allCampuses?.map(campus => <SelectItem key={campus.id} value={campus.id}>{campus.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <ScrollArea className="h-[400px] rounded-md border p-2 bg-slate-50/50">
                            <Table>
                                <TableHeader className="bg-white">
                                    <TableRow><TableHead className="text-[10px] font-black uppercase">Units in {allCampuses?.find(c => c.id === selectedCampusId)?.name || 'Selection'}</TableHead></TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(selectedCampusId === 'all' ? allUnits : allUnits?.filter(u => u.campusIds?.includes(selectedCampusId || '')) )?.map(unit => (
                                        <TableRow key={unit.id} className="hover:bg-white transition-colors">
                                            <TableCell className="text-[11px] font-bold text-slate-700">{unit.name}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!selectedCampusId && <TableRow><TableCell className="text-center text-muted-foreground text-[10px] py-10 font-bold uppercase italic">Please select a site</TableCell></TableRow>}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>

                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-lg border-primary/10 overflow-hidden">
                        <CardHeader className="bg-muted/10 border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Users className="h-5 w-5 text-primary" />
                                Institutional User Registry
                            </CardTitle>
                            <CardDescription className="text-xs">Complete personnel directory with site mapping.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <ScrollArea className="h-[530px]">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="font-black text-[10px] uppercase pl-6 py-3">Institutional User</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase py-3">RSU Email Address</TableHead>
                                            <TableHead className="font-black text-[10px] uppercase py-3">Site / Unit Mapping</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {allUsers?.sort((a,b) => a.lastName.localeCompare(b.lastName)).map(user => (
                                            <TableRow key={user.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8 shadow-sm">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback className="text-[10px] font-black">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-black text-slate-900">{user.firstName} {user.lastName}</span>
                                                            <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">{user.role}</span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600">{user.email}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        <div className="text-[10px] font-black text-slate-800 uppercase tracking-tighter">{allCampuses?.find(c => c.id === user.campusId)?.name || 'N/A'}</div>
                                                        <div className="text-[9px] text-muted-foreground font-bold italic truncate max-w-[150px]">{allUnits?.find(u => u.id === user.unitId)?.name || ''}</div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="pt-6 border-t">
                <SubmissionMatrixReport 
                    matrixData={matrixData}
                    allCycles={allCycles}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
