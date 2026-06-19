'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import type { Campus, Unit, Submission, User as AppUser, Cycle, Risk, ProgramComplianceRecord, CsmSettings, CsmDeployment } from '@/lib/types';
import { collection, query, where, doc, setDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { CsmReportDashboard } from '@/components/reports/csm-report-dashboard';
import { Smile, AlertTriangle } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    Zap,
    Filter,
    QrCode,
    Download,
    ExternalLink,
    Copy
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ReactDOMServer from 'react-dom/server';
import { AdminReport } from '@/components/reports/admin-report';
import { SubmissionMatrixReport } from '@/components/reports/submission-matrix-report';
import { submissionTypes } from '@/lib/constants';
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
import { normalizeReportType } from '@/lib/utils';

export default function ReportsPage() {
  const { userProfile, isAdmin, isUserLoading, isSupervisor, userRole } = useUser();
  const firestore = useFirestore();

  const [selectedCampusId, setSelectedCampusId] = useState<string | null>('all');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const csmSettingsRef = useMemoFirebase(() => firestore ? doc(firestore, 'system', 'csmSettings') : null, [firestore]);
  const { data: csmSettings, isLoading: isLoadingCsmSettings } = useDoc<CsmSettings>(csmSettingsRef);

  const isCsmManager = useMemo(() => {
    return !!(userProfile?.unitId && csmSettings?.managingUnitId && userProfile.unitId === csmSettings.managingUnitId);
  }, [userProfile, csmSettings]);

  const hasFullReportsAccess = isAdmin || isSupervisor;
  const hasAllAccess = hasFullReportsAccess || isCsmManager;
  const canViewReports = hasAllAccess || !!userProfile?.unitId;

  useEffect(() => {
    if (!isAdmin && userProfile?.campusId) {
      setSelectedCampusId(userProfile.campusId);
    }
  }, [isAdmin, userProfile]);

  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
  const { data: allCampuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => {
    if (!firestore || !hasAllAccess) return null;
    if (isAdmin || isCsmManager) return collection(firestore, 'units');
    if (isSupervisor && userProfile?.campusId) {
        return query(collection(firestore, 'units'), where('campusIds', 'array-contains', userProfile.campusId));
    }
    return null;
  }, [firestore, hasAllAccess, isAdmin, isSupervisor, isCsmManager, userProfile]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const submissionsQuery = useMemoFirebase(() => {
    if (!firestore || !hasFullReportsAccess) return null;
    if (isAdmin) return collection(firestore, 'submissions');
    if (userProfile?.campusId) {
        return query(collection(firestore, 'submissions'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, hasFullReportsAccess, isAdmin, userProfile]);
  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => {
    if (!firestore || !hasFullReportsAccess) return null;
    if (isAdmin) return collection(firestore, 'risks');
    if (userProfile?.campusId) {
        return query(collection(firestore, 'risks'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, hasFullReportsAccess, isAdmin, userProfile]);
  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore || !hasFullReportsAccess || !selectedYear) return null;
    return query(collection(firestore, 'programCompliances'), where('academicYear', '==', selectedYear));
  }, [firestore, hasFullReportsAccess, selectedYear]);
  const { data: allCompliances, isLoading: isLoadingCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !hasAllAccess || !userProfile) return null;
    if (isAdmin || isCsmManager) return collection(firestore, 'users');
    if (isSupervisor && userProfile.campusId) {
        return query(collection(firestore, 'users'), where('campusId', '==', userProfile.campusId));
    }
    return null;
  }, [firestore, hasAllAccess, isAdmin, isSupervisor, isCsmManager, userProfile]);
  const { data: allUsers, isLoading: isLoadingUsers } = useCollection<AppUser>(usersQuery);
  
  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  // CSM queries
  const csmResponsesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !canViewReports) return null;
    const base = collection(firestore, 'csmResponses');
    if (hasAllAccess || isSupervisor) {
      return base;
    }
    return query(base, where('unitId', '==', userProfile.unitId));
  }, [firestore, hasAllAccess, isSupervisor, userProfile, canViewReports]);
  const { data: rawCsmResponses, isLoading: isLoadingCsmResponses } = useCollection<any>(csmResponsesQuery);

  const visitorLogsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || !canViewReports) return null;
    const base = collection(firestore, 'visitorLogs');
    if (hasAllAccess || isSupervisor) {
      return base;
    }
    return query(base, where('unitId', '==', userProfile.unitId));
  }, [firestore, hasAllAccess, isSupervisor, userProfile, canViewReports]);
  const { data: rawVisitorLogs, isLoading: isLoadingVisitorLogs } = useCollection<any>(visitorLogsQuery);

  const csmDeploymentsQuery = useMemoFirebase(() => {
    if (!firestore || !canViewReports) return null;
    return collection(firestore, 'csmDeployments');
  }, [firestore, canViewReports]);
  const { data: csmDeployments, isLoading: isLoadingCsmDeployments } = useCollection<CsmDeployment>(csmDeploymentsQuery);

  const unitCsmSettingsQuery = useMemoFirebase(() => {
    if (!firestore || !hasAllAccess) return null;
    return collection(firestore, 'unitCsmSettings');
  }, [firestore, hasAllAccess]);
  const { data: allUnitCsmSettings, isLoading: isLoadingUnitCsmSettings } = useCollection<any>(unitCsmSettingsQuery);

  /**
   * ACADEMIC YEAR GENERATION
   */
  const years = useMemo(() => {
    const current = new Date().getFullYear();
    const yrSet = new Set<number>();
    for (let i = -2; i < 6; i++) yrSet.add(current - i);
    allCycles?.forEach(c => yrSet.add(Number(c.year)));
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [allCycles]);

  /**
   * NORMALIZED SUBMISSIONS
   */
  const submissions = useMemo(() => {
    if (!rawSubmissions) return [];
    return rawSubmissions.map(s => ({
        ...s,
        reportType: normalizeReportType(s.reportType)
    }));
  }, [rawSubmissions]);

  const processedSubmissions = useMemo(() => {
    return submissions.filter(s => s.year === selectedYear);
  }, [submissions, selectedYear]);

  const matrixData = useMemo(() => {
    if (!submissions || !allCampuses || !allUnits || isUserLoading) return [];

    const submissionMap = new Map<string, Submission>(
      submissions.filter(s => s.year === selectedYear).map(s => {
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
    }).filter((x): x is NonNullable<typeof x> => x !== null).sort((a, b) => a.campusName.localeCompare(b.campusName));
  }, [submissions, allCampuses, allUnits, selectedYear, isSupervisor, isAdmin, userProfile, isUserLoading]);

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
        const enrollmentRecords = record.enrollmentRecords || [];
        const levels = ['firstYear', 'secondYear', 'thirdYear', 'fourthYear'] as const;
        
        if (enrollmentRecords.length > 0) {
            enrollmentRecords.forEach(rec => {
                levels.forEach(level => {
                    totalMaleEnrolled += Number(rec.firstSemester?.[level]?.male || 0);
                    totalFemaleEnrolled += Number(rec.firstSemester?.[level]?.female || 0);
                });
            });
        } else {
            const s1 = record.stats?.enrollment?.firstSemester;
            if (s1) {
                levels.forEach(level => {
                    totalMaleEnrolled += Number(s1[level]?.male || 0);
                    totalFemaleEnrolled += Number(s1[level]?.female || 0);
                });
            }
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
    if (!isAdmin || !submissions || !allCampuses || !allUnits) return;
    const reportHtml = ReactDOMServer.renderToStaticMarkup(<AdminReport submissions={submissions} campuses={allCampuses} units={allUnits} />);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<html><head><title>Admin Report</title><style>body { font-family: sans-serif; margin: 2rem; } table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; font-size: 10px; } th, td { border: 1px solid #ddd; padding: 6px; text-align: left; } th { background-color: #f2f2f2; } .header { text-align: center; margin-bottom: 2rem; } .footer { margin-top: 2rem; font-style: italic; color: #555; font-size: 10px; } .report-title { margin-top: 1rem; text-align: center; font-weight: bold; text-transform: uppercase; }</style></head><body>${reportHtml}<script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script></body></html>`);
      printWindow.document.close();
    }
  };

  const isReportPublished = useMemo(() => {
    if (hasAllAccess) return true;
    return csmDeployments?.some(d => {
      if (d.academicYear !== selectedYear) return false;
      if (!d.isPublished) return false;
      if (d.publishedUnitIds) {
        return d.publishedUnitIds.includes(userProfile?.unitId || '');
      }
      return true; // Backward compatibility for global deployments
    }) || false;
  }, [csmDeployments, selectedYear, hasAllAccess, userProfile]);

  const isLoading = isUserLoading || isLoadingCampuses || isLoadingCsmSettings || 
    (hasFullReportsAccess && (isLoadingSubmissions || isLoadingRisks || isLoadingCompliances)) ||
    (hasAllAccess && (isLoadingUnits || isLoadingUsers || isLoadingCycles)) ||
    isLoadingCsmResponses || isLoadingVisitorLogs || isLoadingCsmDeployments;

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <Tabs defaultValue={hasFullReportsAccess ? "visuals" : "csm"} className="space-y-6">
        {/* Sticky Header Enforced */}
        <div className="sticky top-0 z-30 pt-2 pb-4 -mx-4 px-4 lg:-mx-8 lg:px-8 space-y-4 institutional-header print:hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Institutional Reports</h2>
                  <p className="text-muted-foreground text-sm">Comprehensive university-wide analytics and system directory.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1.5 flex items-center gap-1">
                            <Filter className="h-2.5 w-2.5" /> Registry Year
                        </label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[140px] h-9 bg-white font-bold shadow-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {isAdmin && (
                    <div className="pt-4">
                        <Button size="sm" onClick={handlePrint} className="h-9 shadow-lg shadow-primary/20">
                            <Printer className="mr-2 h-4 w-4" />
                            Print Data Log
                        </Button>
                    </div>
                    )}
                </div>
            </div>

            <ScrollArea className="w-full">
                <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md">
                    {hasFullReportsAccess && (
                      <>
                        <TabsTrigger value="visuals" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                            <BarChart3 className="h-4 w-4" /> Strategic Insights
                        </TabsTrigger>
                        <TabsTrigger value="directory" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                            <LayoutGrid className="h-4 w-4" /> System Directory
                        </TabsTrigger>
                      </>
                    )}
                    <TabsTrigger value="csm" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                        <Smile className="h-4 w-4" /> CSM Feedback
                    </TabsTrigger>
                    {hasAllAccess && (
                      <TabsTrigger value="csm-qr" className="gap-2 text-[10px] font-black uppercase tracking-widest px-6 h-8">
                          <QrCode className="h-4 w-4" /> CSM QR Codes
                      </TabsTrigger>
                    )}
                </TabsList>
            </ScrollArea>
        </div>

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
                                        <Radar name="Maturity %" dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} >
                                            <LabelList dataKey="A" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: 'hsl(var(--primary))' }} formatter={(v: any) => `${v}%`} />
                                        </Radar>
                                        <Tooltip content={<ChartTooltipContent />} />
                                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'black' }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </CardContent>
                        <CardFooter className="bg-muted/5 border-t py-3">
                            <div className="flex items-start gap-3">
                                <Zap className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[9px] text-muted-foreground italic leading-tight">
                                    <strong>Analytical Perspective:</strong> This profile tracks verified documentation maturity across different campuses.
                                </p>
                            </div>
                        </CardFooter>
                    </Card>

                    <Card className="lg:col-span-2 shadow-lg border-primary/10 overflow-hidden flex flex-col">
                        <CardHeader className="bg-muted/10 border-b py-4">
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
                            <div className="flex items-start gap-3">
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
                            <CardHeader className="pb-2 border-b bg-blue-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> Student Sex Distribution</CardTitle></CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadEnrollmentData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadEnrollmentData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.students}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Enrollment</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md border-primary/10 flex flex-col">
                            <CardHeader className="pb-2 border-b bg-emerald-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><Briefcase className="h-4 w-4 text-emerald-600" /> SYSTEM REGISTERED USER</CardTitle></CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadFacultyData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadFacultyData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.faculty}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deduplicated Personnel</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow-md border-primary/10 flex flex-col">
                            <CardHeader className="pb-2 border-b bg-purple-50/30"><CardTitle className="text-xs font-black uppercase flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-600" /> Graduation GAD Audit</CardTitle></CardHeader>
                            <CardContent className="pt-6 flex-1">
                                <ChartContainer config={{}} className="h-[250px] w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie data={visualAnalytics.gadGradsData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                {visualAnalytics.gadGradsData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                                            </Pie>
                                            <Tooltip content={<ChartTooltipContent hideLabel />} />
                                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </ChartContainer>
                                <div className="mt-4 text-center">
                                    <p className="text-2xl font-black text-slate-800 tabular-nums">{visualAnalytics.totals.grads}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total Graduates</p>
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
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
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
                    allCycles={allCycles || null}
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                />
            </div>
        </TabsContent>

        <TabsContent value="csm" className="space-y-6 animate-in fade-in duration-500">
          {isReportPublished ? (
            <CsmReportDashboard
              csmResponses={rawCsmResponses || []}
              visitorLogs={rawVisitorLogs || []}
              campuses={allCampuses || []}
              units={allUnits || []}
              selectedYear={selectedYear}
              selectedCampusId={selectedCampusId}
              userProfile={userProfile}
              isAdmin={isAdmin}
              isCsmManager={isCsmManager}
              csmDeployments={csmDeployments || []}
              cycles={allCycles || []}
            />
          ) : (
            <Card className="border-primary/10 shadow-md">
              <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="text-lg font-black uppercase text-slate-800">CSM Report Awaiting Deployment</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
                    The Client Satisfaction Measurement report for AY {selectedYear} has not been deployed to units yet.
                  </p>
                </div>
                <p className="text-xs font-medium text-slate-500 max-w-md">
                  Once the Admin or IPDU office reviews and publishes the reports, you will be able to view and print your scorecard here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="csm-qr" className="space-y-6 animate-in fade-in duration-500">
          {!allCampuses || !allUnits ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#1B6535]" />
            </div>
          ) : (
            <div className="space-y-8">
              {allCampuses
                .filter(c => allUnits.some(u => u.campusIds?.includes(c.id)))
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(campus => {
                  const campusUnits = allUnits
                    .filter(u => u.campusIds?.includes(campus.id))
                    .sort((a, b) => a.name.localeCompare(b.name));
                  return (
                    <Card key={campus.id} className="border-primary/10 shadow-md overflow-hidden">
                      <CardHeader className="bg-gradient-to-r from-[#1B6535]/5 to-transparent border-b border-primary/10 p-4">
                        <div className="flex items-center gap-2">
                          <School className="h-4 w-4 text-[#1B6535]" />
                          <CardTitle className="text-sm font-black uppercase tracking-wider text-[#1B6535]">{campus.name}</CardTitle>
                          <span className="text-[10px] font-bold text-slate-400 ml-auto">({campusUnits.length} units)</span>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        {campusUnits.map(unit => (
                          <CsmUnitQrRow
                            key={unit.id}
                            unit={unit}
                            origin={typeof window !== 'undefined' ? window.location.origin : ''}
                            csmSettings={(allUnitCsmSettings || []).find((s: any) => s.unitId === unit.id || s.id === unit.id)}
                            unitCsmSettingsId={unit.id}
                            firestore={firestore}
                            userProfile={userProfile}
                            toast={toast}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CsmUnitQrRow({ unit, origin, csmSettings, unitCsmSettingsId, firestore, userProfile, toast }: {
  unit: Unit;
  origin: string;
  csmSettings: any;
  unitCsmSettingsId: string;
  firestore: any;
  userProfile: any;
  toast: any;
}) {
  const [newService, setNewService] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const unitName = unit.name || 'Office';
  const csmPath = `/csm-evaluate?unitId=${unit.id}&campusId=${unit.campusIds?.[0] || 'N/A'}&unitName=${encodeURIComponent(unitName)}`;
  const fullCsmUrl = `${origin}${csmPath}`;
  const qrUrl = origin ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(fullCsmUrl)}` : '';
  const services: string[] = csmSettings?.services || [];

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !newService.trim()) return;
    setIsSaving(true);
    try {
      const cleanService = newService.trim();
      if (services.includes(cleanService)) {
        toast({ title: 'Duplicate', description: 'Service already exists.', variant: 'destructive' });
        setIsSaving(false);
        return;
      }
      await setDoc(doc(firestore, 'unitCsmSettings', unitCsmSettingsId), {
        unitId: unitCsmSettingsId,
        services: [...services, cleanService],
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.id || 'System',
      }, { merge: true });
      setNewService('');
      toast({ title: 'Added', description: `"${cleanService}" added.` });
    } catch (err) {
      toast({ title: 'Failed', description: 'Could not add service.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveService = async (service: string) => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(doc(firestore, 'unitCsmSettings', unitCsmSettingsId), {
        services: services.filter((s: string) => s !== service),
        updatedAt: serverTimestamp(),
        updatedBy: userProfile?.id || 'System',
      }, { merge: true });
      toast({ title: 'Removed', description: `"${service}" removed.` });
    } catch (err) {
      toast({ title: 'Failed', description: 'Could not remove service.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-black uppercase text-slate-800 flex-1">{unitName}</h4>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{unit.id}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* QR Code */}
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-inner w-[110px] h-[110px] flex items-center justify-center">
            {qrUrl ? (
              <img src={qrUrl} alt={`${unitName} CSM QR`} className="w-[100px] h-[100px] object-contain" />
            ) : (
              <Loader2 className="h-6 w-6 animate-spin text-[#1B6535]" />
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={async () => {
                try {
                  const resp = await fetch(qrUrl);
                  const blob = await resp.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `csm-qr-${unitName.replace(/\s+/g, '-')}.png`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch { }
              }}
              className="h-7 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1"
              title="Download QR"
            >
              <Download className="h-3 w-3" /> QR
            </button>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(fullCsmUrl);
                  toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
                } catch { }
              }}
              className="h-7 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1"
              title="Copy Link"
            >
              <Copy className="h-3 w-3" /> Link
            </button>
          </div>
        </div>

        {/* Link + Services */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 truncate">
            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-0.5">CSM Link</p>
            <p className="text-[9px] font-mono text-slate-700 truncate">{fullCsmUrl}</p>
          </div>

          <div className="space-y-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Services</p>
            <div className="flex flex-wrap gap-1.5">
              {services.length > 0 ? services.map((svc: string) => (
                <Badge key={svc} variant="secondary" className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 gap-1.5">
                  {svc}
                  <button onClick={() => handleRemoveService(svc)} className="text-slate-400 hover:text-rose-500 transition-colors" disabled={isSaving}>
                    &times;
                  </button>
                </Badge>
              )) : (
                <span className="text-[9px] text-slate-400 italic">No services configured</span>
              )}
            </div>
            <form onSubmit={handleAddService} className="flex gap-1.5">
              <Input
                type="text"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                placeholder="Add service..."
                className="h-8 text-xs rounded-lg border-slate-200"
                disabled={isSaving}
              />
              <Button type="submit" size="sm" disabled={isSaving || !newService.trim()} className="h-8 px-3 text-[9px] font-black uppercase tracking-wider rounded-lg bg-[#1B6535] hover:bg-[#1a5d31] text-white shrink-0">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Add'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
