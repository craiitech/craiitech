
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from '@/firebase/firestore-wrapper';
import type { CorrectiveActionRequest, ManagementReview, ManagementReviewOutput, QaAuditReport } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    LabelList,
    LineChart,
    Line,
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ClipboardCheck,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    ShieldAlert,
    Activity,
    FileText,
    CalendarCheck,
    ListTodo,
    Info,
    Zap,
    Target,
    ShieldCheck,
    Gavel,
    History,
    Clock,
    Users,
    BarChart3,
    Eye,
    Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

const CAR_STATUS_COLORS: Record<string, string> = {
  'Open': '#ef4444',
  'In Progress': '#f97316',
  'Awaiting Response/Update': '#f59e0b',
  'For Final Verification': '#6366f1',
  'Closed': '#10b981',
};

const NATURE_COLORS: Record<string, string> = {
  'NC': '#ef4444',
  'OFI': '#f59e0b',
};

const SOURCE_COLORS = ['#6366f1', '#f97316', '#10b981', '#94a3b8'];

type InsightItem = {
    title: string;
    description: string;
    tag: string;
    priority?: 'High' | 'Medium' | 'Low';
};

export function QaAnalyticsTab() {
  const { userProfile, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const isInstitutionalViewer = isAdmin || userRole === 'Auditor' || userRole?.toLowerCase().includes('president') || userRole?.toLowerCase().includes('quality management') || userRole?.toLowerCase().includes('qms');

  // Fix: single-field query only — no composite index needed
  const carQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'correctiveActionRequests');
    if (isInstitutionalViewer) return baseRef;
    if (userProfile.unitId) return query(baseRef, where('unitId', '==', userProfile.unitId));
    return query(baseRef, where('campusId', '==', userProfile.campusId));
  }, [firestore, userProfile, isInstitutionalViewer]);
  const { data: cars, isLoading: isLoadingCars } = useCollection<CorrectiveActionRequest>(carQuery);

  const mrQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'managementReviews') : null), [firestore]);
  const { data: mrs } = useCollection<ManagementReview>(mrQuery);

  const mrOutputsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    return collection(firestore, 'managementReviewOutputs');
  }, [firestore, userProfile]);
  const { data: rawMrOutputs } = useCollection<ManagementReviewOutput>(mrOutputsQuery);

  const reportsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile) return null;
    const baseRef = collection(firestore, 'qaAuditReports');
    if (isInstitutionalViewer) return baseRef;
    return query(baseRef, where('campusIds', 'array-contains', userProfile.campusId));
  }, [firestore, userProfile, isInstitutionalViewer]);
  const { data: auditReports } = useCollection<QaAuditReport>(reportsQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<any>(unitsQuery);
  const unitMap = useMemo(() => new Map((units || []).map((u: any) => [u.id, u.name])), [units]);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<any>(campusesQuery);
  const campusMap = useMemo(() => new Map((campuses || []).map((c: any) => [c.id, c.name])), [campuses]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const now = new Date().getFullYear();
    for (let y = now; y >= now - 5; y--) years.add(y);
    (cars || []).forEach(c => {
      const d = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (d) years.add(d.getFullYear());
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [cars]);

  const yearCars = useMemo(() => {
    if (selectedYear === 'all') return cars || [];
    const year = Number(selectedYear);
    return (cars || []).filter(c => {
      const d = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      return d ? d.getFullYear() === year : false;
    });
  }, [cars, selectedYear]);

  const analytics = useMemo(() => {
    if (!cars || !rawMrOutputs || !mrs || !auditReports || !userProfile) return null;

    const filteredCars = yearCars;

    const outputs = isInstitutionalViewer
        ? rawMrOutputs
        : rawMrOutputs.filter(o => o.assignments?.some((a: any) => a.unitId === userProfile.unitId || a.campusId === userProfile.campusId));

    // --- All 5 statuses ---
    const carStatusCounts: Record<string, number> = {
      'Open': 0,
      'In Progress': 0,
      'Awaiting Response/Update': 0,
      'For Final Verification': 0,
      'Closed': 0,
    };
    filteredCars.forEach(car => {
      if (carStatusCounts[car.status] !== undefined) carStatusCounts[car.status]++;
    });
    const carStatusData = Object.entries(carStatusCounts)
      .map(([name, value]) => ({ name, value, statusId: name }))
      .filter(d => d.value > 0);

    // --- Nature of Finding ---
    const findingCounts = { NC: 0, OFI: 0 };
    filteredCars.forEach(car => {
      if (findingCounts[car.natureOfFinding] !== undefined) findingCounts[car.natureOfFinding]++;
    });
    const findingData = Object.entries(findingCounts).map(([name, value]) => ({ name, value }));

    // --- Source Breakdown ---
    const sourceCounts: Record<string, number> = {};
    filteredCars.forEach(c => {
      sourceCounts[c.source] = (sourceCounts[c.source] || 0) + 1;
    });
    const sourceData = Object.entries(sourceCounts)
      .map(([name, value]) => ({ name: name.replace('Audit Finding', 'Audit'), value }))
      .sort((a, b) => b.value - a.value);

    // --- Aging Distribution (open CARs only) ---
    const openCars = filteredCars.filter(c => c.status !== 'Closed');
    const agingBuckets = { '0–30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 };
    openCars.forEach(c => {
      const d = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (!d) return;
      const days = differenceInDays(new Date(), d);
      if (days <= 30) agingBuckets['0–30 days']++;
      else if (days <= 60) agingBuckets['31–60 days']++;
      else if (days <= 90) agingBuckets['61–90 days']++;
      else agingBuckets['90+ days']++;
    });
    const agingData = Object.entries(agingBuckets).map(([name, value]) => ({ name, value }));

    // --- Top Units by Open CARs ---
    const unitCounts: Record<string, { name: string; open: number; nc: number }> = {};
    openCars.forEach(c => {
      if (!unitCounts[c.unitId]) unitCounts[c.unitId] = { name: unitMap.get(c.unitId) || c.unitId, open: 0, nc: 0 };
      unitCounts[c.unitId].open++;
      if (c.natureOfFinding === 'NC') unitCounts[c.unitId].nc++;
    });
    const topUnits = Object.values(unitCounts).sort((a, b) => b.open - a.open).slice(0, 8);

    // --- Monthly Trend (created vs closed) for selected year ---
    const trendYear = selectedYear === 'all' ? new Date().getFullYear() : Number(selectedYear);
    const monthlyTrend = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(trendYear, i, 1), 'MMM'),
      Created: 0,
      Closed: 0,
    }));
    (selectedYear === 'all' ? cars : yearCars).forEach(c => {
      const created = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (created && (selectedYear === 'all' || created.getFullYear() === Number(selectedYear))) {
        monthlyTrend[created.getMonth()].Created++;
      }
    });
    (selectedYear === 'all' ? cars : yearCars).filter(c => c.status === 'Closed').forEach(c => {
      const updated = c.updatedAt?.toDate ? c.updatedAt.toDate() : c.updatedAt ? new Date(c.updatedAt) : null;
      if (updated && (selectedYear === 'all' || updated.getFullYear() === Number(selectedYear))) {
        monthlyTrend[updated.getMonth()].Closed++;
      }
    });

    // --- Campus Breakdown ---
    type CampusRecord = { campus: string; Open: number; 'In Progress': number; 'Awaiting Response/Update': number; 'For Final Verification': number; Closed: number };
    const campusData: Record<string, CampusRecord> = {};
    filteredCars.forEach(c => {
      const name = (campusMap.get(c.campusId) || c.campusId).replace('Campus', '').trim();
      if (!campusData[name]) campusData[name] = { campus: name, Open: 0, 'In Progress': 0, 'Awaiting Response/Update': 0, 'For Final Verification': 0, Closed: 0 };
      const key = c.status as keyof Omit<CampusRecord, 'campus'>;
      if (key in campusData[name]) (campusData[name] as any)[key]++;
    });
    const byCampus = Object.values(campusData).sort((a, b) => {
      const aOpen = a.Open + a['In Progress'] + a['Awaiting Response/Update'] + a['For Final Verification'];
      const bOpen = b.Open + b['In Progress'] + b['Awaiting Response/Update'] + b['For Final Verification'];
      return bOpen - aOpen;
    });

    // --- Decision Trend ---
    const mrYearMap = new Map<string, number>();
    mrs.forEach(mr => {
        const date = mr.startDate instanceof Timestamp ? mr.startDate.toDate() : mr.startDate ? new Date(mr.startDate) : null;
        mrYearMap.set(mr.id, date && !isNaN(date.getTime()) ? date.getFullYear() : new Date().getFullYear());
    });
    const yearlyDecisionStats: Record<number, { year: number; Open: number; 'On-going': number; Closed: number }> = {};
    outputs.forEach(output => {
        const year = mrYearMap.get(output.mrId) || new Date().getFullYear();
        if (!yearlyDecisionStats[year]) yearlyDecisionStats[year] = { year, Open: 0, 'On-going': 0, Closed: 0 };
        if (output.status === 'Open') yearlyDecisionStats[year].Open++;
        else if (output.status === 'On-going') yearlyDecisionStats[year]['On-going']++;
        else if (output.status === 'Closed') yearlyDecisionStats[year].Closed++;
    });
    const decisionTrendData = Object.values(yearlyDecisionStats).sort((a, b) => a.year - b.year);

    const closedOutputs = outputs.filter(o => o.status === 'Closed').length;
    const mrResolutionRate = outputs.length > 0 ? Math.round((closedOutputs / outputs.length) * 100) : 0;

    // --- Insight Text Generation ---
    const totalCount = filteredCars.length;
    const openCount = openCars.length;
    const awaitingCount = carStatusCounts['Awaiting Response/Update'];
    const verificationCount = carStatusCounts['For Final Verification'];
    const openPct = totalCount > 0 ? Math.round((openCount / totalCount) * 100) : 0;

    let pipelineText = "No corrective actions have been logged in the system for this period.";
    if (totalCount > 0) {
      if (openCount === 0) {
        pipelineText = "Excellent — all corrective actions in the system have been successfully verified and closed.";
      } else {
        pipelineText = `Out of ${totalCount} total corrective actions, ${openCount} (${openPct}%) remain unresolved. The primary bottleneck is the ${awaitingCount} items awaiting unit response, which requires departments to submit treatment actions.`;
        if (verificationCount > 0) pipelineText += ` Additionally, ${verificationCount} items are awaiting final QMS verification before closure.`;
      }
    }

    const ncCount = findingCounts.NC;
    const ofiCount = findingCounts.OFI;
    const ncPct = (ncCount + ofiCount) > 0 ? Math.round((ncCount / (ncCount + ofiCount)) * 100) : 0;
    let natureText = "No findings recorded for this period.";
    if (ncCount + ofiCount > 0) {
      natureText = `Mandatory Non-Conformances (NC) constitute ${ncPct}% (${ncCount} items) of findings. Focus resolution resources on NCs to ensure standard alignment, while treating the ${ofiCount} Opportunities for Improvement (OFI) as quality enhancements.`;
    }

    let sourceText = "No CAR sources recorded.";
    if (sourceData.length > 0) {
      const topSource = sourceData[0];
      sourceText = `The main driver of corrective actions is '${topSource.name}' with ${topSource.value} CARs, indicating it is the most active detection channel.`;
    }

    const overdueCount = agingBuckets['90+ days'];
    const intermediateCount = agingBuckets['31–60 days'] + agingBuckets['61–90 days'];
    let agingText = "No active CARs to analyze.";
    if (openCount > 0) {
      if (overdueCount > 0) {
        agingText = `Critical Attention Required: ${overdueCount} CARs are overdue (exceeding 90 days). These represent long-standing compliance gaps and must be escalated to respective unit heads.`;
      } else if (intermediateCount > 0) {
        agingText = `Good pacing, but ${intermediateCount} active CARs are between 31-90 days old. Monitor closely to prevent them from slipping into the overdue (>90 days) category.`;
      } else {
        agingText = `All ${openCount} active CARs are under 30 days old. Resolution pacing is currently optimal and on schedule.`;
      }
    }

    let unitsText = "No departments have open corrective action requests.";
    if (topUnits.length > 0) {
      const highest = topUnits[0];
      unitsText = `'${highest.name}' has the largest active workload with ${highest.open} open CARs (${highest.nc} are critical Non-Conformances). High priority should be given to support this department in completing their compliance actions.`;
    }

    const createdThisYear = monthlyTrend.reduce((sum, m) => sum + m.Created, 0);
    const closedThisYear = monthlyTrend.reduce((sum, m) => sum + m.Closed, 0);
    let trendText = "No trend data for the selected period.";
    if (createdThisYear > 0 || closedThisYear > 0) {
      if (closedThisYear >= createdThisYear) {
        trendText = `Outstanding Resolution Rate: The university closed ${closedThisYear} CARs while creating ${createdThisYear}, successfully reducing the active quality backlog.`;
      } else {
        const gap = createdThisYear - closedThisYear;
        trendText = `Quality Deficit: ${createdThisYear} CARs were created but only ${closedThisYear} were closed. The backlog grew by ${gap} items, indicating resolution pacing needs to be accelerated.`;
      }
    }

    let campusText = "No campus-level corrective action data available.";
    if (byCampus.length > 0) {
      const highestCampus = byCampus[0];
      const totalCampusOpen = highestCampus.Open + highestCampus['In Progress'] + highestCampus['Awaiting Response/Update'] + highestCampus['For Final Verification'];
      if (totalCampusOpen > 0) {
        campusText = `'${highestCampus.campus}' Campus has the highest corrective action burden with ${totalCampusOpen} unresolved items. Site-level QMS monitoring visits should focus on this location.`;
      } else {
        campusText = "All campuses exhibit clean compliance with no active corrective action backlog.";
      }
    }

    // --- Strengths & Gaps ---
    const strengths: InsightItem[] = [];
    const gaps: InsightItem[] = [];

    if (auditReports.length > 0) {
        strengths.push({
            title: isInstitutionalViewer ? 'Audit Registry Maturity' : 'Site Transparency',
            description: `Maintaining a vault of ${auditReports.length} verified ${isInstitutionalViewer ? 'institutional' : 'local'} audit records.`,
            tag: '[ISO 9.2]'
        });
    }

    const carClosureRate = totalCount > 0 ? (carStatusCounts.Closed / totalCount) : 1;
    if (carClosureRate >= 0.75 && totalCount > 0) {
        strengths.push({
            title: 'Corrective Velocity',
            description: 'Demonstrating high efficiency in resolving and closing identified non-conformities.',
            tag: '[ISO 10.2]'
        });
    }

    if (verificationCount > 0) {
        gaps.push({
            title: 'Verification Queue Backlog',
            description: `There are ${verificationCount} unit responses awaiting official institutional verification.`,
            tag: '[Process Delay]',
            priority: 'Medium'
        });
    }

    if (mrResolutionRate > 70 && outputs.length > 0) {
        strengths.push({
            title: 'Strategic Decision Fulfillment',
            description: 'Successful implementation of the majority of actionable decisions from top management.',
            tag: '[ISO 9.3]'
        });
    }

    if (ncCount > 0 && openCars.filter(c => c.natureOfFinding === 'NC').length > 0) {
        gaps.push({
            title: 'Outstanding Non-Conformances',
            description: `${openCars.filter(c => c.natureOfFinding === 'NC').length} critical gaps in the standard remain unresolved and require priority action.`,
            tag: '[Correction Pending]',
            priority: 'High'
        });
    }

    return {
      totalCars: totalCount,
      openCars: carStatusCounts.Open,
      progressCars: carStatusCounts['In Progress'],
      awaitingCars: carStatusCounts['Awaiting Response/Update'],
      verificationCars: carStatusCounts['For Final Verification'],
      closedCars: carStatusCounts.Closed,
      totalAudits: auditReports.length,
      totalMrSessions: mrs.length,
      totalDecisions: outputs.length,
      mrResolutionRate,
      carStatusData,
      findingData,
      sourceData,
      agingData,
      topUnits,
      monthlyTrend,
      byCampus,
      decisionTrendData,
      strengths,
      gaps,
      pipelineText,
      natureText,
      sourceText,
      agingText,
      unitsText,
      trendText,
      campusText,
    };
  }, [cars, yearCars, rawMrOutputs, mrs, auditReports, userProfile, isInstitutionalViewer, selectedYear, unitMap, campusMap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-xs">
        <p className="font-black uppercase mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color || entry.fill }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  if (isLoadingCars) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        <Skeleton className="h-[400px] col-span-full" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <h3 className="text-lg font-bold">Institutional Quality Dashboard</h3>
        <p className="text-sm text-muted-foreground">Analytics will synchronize once reports, MR sessions, or CARs are registered in the system.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* === Year Filter + Executive Summary === */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Quality Management Dashboard
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">Academic Year:</span>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[160px] h-9 bg-white font-bold text-xs">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* === Strengths & Gaps Side-by-Side === */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x border rounded-2xl shadow-lg bg-background overflow-hidden">
          <div className="flex flex-col">
              <div className="bg-emerald-50 px-6 py-3 border-b flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Institutional Strength Registry</span>
              </div>
              <div className="p-6 space-y-4">
                  {analytics.strengths.length > 0 ? (
                      analytics.strengths.map((item, idx) => (
                          <div key={idx} className="space-y-1.5 group">
                              <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{item.title}</span>
                                  </div>
                                  <Badge className="bg-emerald-100 text-emerald-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic">&ldquo;{item.description}&rdquo;</p>
                          </div>
                      ))
                  ) : (
                      <p className="text-[10px] text-muted-foreground italic opacity-50 py-10 text-center">Calibrating institutional strengths...</p>
                  )}
              </div>
          </div>

          <div className="flex flex-col">
              <div className="bg-rose-50 px-6 py-3 border-b flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Priority Areas for Improvement</span>
              </div>
              <div className="p-6 space-y-4">
                  {analytics.gaps.length > 0 ? (
                      analytics.gaps.map((item, idx) => (
                          <div key={idx} className="space-y-1.5 group">
                              <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                      <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight group-hover:text-rose-600 transition-colors">{item.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      {item.priority === 'High' && <Badge variant="destructive" className="h-4 px-1 text-[7px] font-black uppercase">Critical</Badge>}
                                      <Badge className="bg-rose-100 text-rose-700 border-none h-4 px-1.5 text-[8px] font-black">{item.tag}</Badge>
                                  </div>
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-relaxed italic">&ldquo;{item.description}&rdquo;</p>
                          </div>
                      ))
                  ) : (
                      <div className="py-10 flex flex-col items-center justify-center opacity-20">
                          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                          <p className="text-[10px] font-black uppercase mt-2">No Gaps Detected</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* === KPI Metric Cards === */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-2 opacity-5"><ShieldAlert className="h-12 w-12" /></div>
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground">Total CARs Issued</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-primary tabular-nums">{analytics.totalCars}</div>
            <p className="text-[8px] font-bold text-muted-foreground mt-0.5 uppercase tracking-tighter">Institutional Registry ({selectedYear === 'all' ? 'All Time' : `AY ${selectedYear}`})</p>
          </CardContent>
        </Card>

        <Card className="bg-rose-50 border-rose-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-rose-700">Open</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-rose-600 tabular-nums">{analytics.openCars}</div>
            <p className="text-[8px] font-bold text-rose-600/70 mt-0.5 uppercase tracking-tighter">Awaiting Initial Action</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-orange-700">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-orange-600 tabular-nums">{analytics.progressCars}</div>
            <p className="text-[8px] font-bold text-orange-600/70 mt-0.5 uppercase tracking-tighter">Unit Treatment Stage</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-amber-700">Awaiting Response</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-amber-600 tabular-nums">{analytics.awaitingCars}</div>
            <p className="text-[8px] font-bold text-amber-600/70 mt-0.5 uppercase tracking-tighter">Bottleneck — Unit Action Needed</p>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-indigo-700">For Verification</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-indigo-600 tabular-nums">{analytics.verificationCars}</div>
            <p className="text-[8px] font-bold text-indigo-600/70 mt-0.5 uppercase tracking-tighter">Awaiting QMS Closure</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="text-2xl font-black text-emerald-600 tabular-nums">{analytics.totalCars > 0 ? Math.round((analytics.closedCars / analytics.totalCars) * 100) : 0}%</div>
            <p className="text-[8px] font-bold text-emerald-600/70 mt-0.5 uppercase tracking-tighter">{analytics.closedCars} of {analytics.totalCars} Closed</p>
          </CardContent>
        </Card>
      </div>

      {/* === Pipeline Insight Bar === */}
      {analytics.totalCars > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <BarChart3 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Executive Summary — Corrective Action Pipeline</p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1 leading-relaxed">{analytics.pipelineText}</p>
          </div>
        </div>
      )}

      {/* === Row 1: Status Donut + Nature / Source === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* CAR Status Pie */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">CAR Lifecycle Profile</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Full pipeline distribution — red/orange = active, blue = verification, green = closed
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {analytics.carStatusData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="h-[220px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Pie
                        data={analytics.carStatusData}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {analytics.carStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CAR_STATUS_COLORS[entry.statusId] || '#cbd5e1'} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {analytics.carStatusData.map(d => {
                    const pct = analytics.totalCars > 0 ? Math.round((d.value / analytics.totalCars) * 100) : 0;
                    return (
                      <div key={d.name} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CAR_STATUS_COLORS[d.name] || '#94a3b8' }} />
                          <span className="text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300">{d.name}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-900 dark:text-slate-100">{d.value} <span className="text-slate-400 font-medium font-mono text-[9px]">({pct}%)</span></span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <ShieldAlert className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No active CARs to visualize</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NC vs OFI + Source */}
        <div className="space-y-4">

          {/* Nature Split */}
          <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">NC vs OFI Split</CardTitle>
              </div>
              <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Non-Conformance (NC) = mandatory closure; OFI = improvement opportunity
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="40%" height={110}>
                  <PieChart>
                    <Pie data={analytics.findingData} innerRadius={25} outerRadius={45} paddingAngle={3} dataKey="value">
                      {analytics.findingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={NATURE_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {analytics.findingData.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: NATURE_COLORS[d.name] }} />
                      <div>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200">{d.value}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-0.5">{d.name === 'NC' ? 'Non-Conformance' : 'Opportunity for Improvement'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {analytics.totalCars > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Analysis</p>
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.natureText}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Source Distribution */}
          <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/10 border-b py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">CARs by Source</CardTitle>
              </div>
              <CardDescription className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                Root trigger — Audit Findings dominance signals strong IQA linkage
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              {analytics.sourceData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={analytics.sourceData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: 700 }} width={120}
                        tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '...' : v}
                      />
                      <RechartsTooltip />
                      <Bar dataKey="value" name="CARs" radius={[0, 4, 4, 0]}>
                        {analytics.sourceData.map((_: any, i: number) => (
                          <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                        ))}
                        <LabelList dataKey="value" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Analysis</p>
                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.sourceText}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-[120px] flex items-center justify-center text-muted-foreground opacity-40">
                  <p className="text-xs font-bold uppercase tracking-widest">No source data</p>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* === Row 2: Aging + Top Units === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Aging Distribution */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Open CAR Aging Analysis</CardTitle>
                </div>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                  Days since CAR was opened — 90+ day bucket is a critical quality management red flag
                </CardDescription>
              </div>
              {analytics.agingData.find(d => d.name === '90+ days')?.value ? (
                <Badge variant="destructive" className="text-[8px] font-black uppercase shrink-0">
                  {analytics.agingData.find(d => d.name === '90+ days')?.value} Overdue
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.openCars > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.agingData} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Open CARs" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {analytics.agingData.map((_: any, i: number) => (
                        <Cell key={i} fill={i === 3 ? '#dc2626' : i === 2 ? '#f97316' : i === 1 ? '#f59e0b' : '#6366f1'} />
                      ))}
                      <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.agingText}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-xs font-bold text-emerald-600 uppercase">No open CARs</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Units */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Top Units by Open CARs</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Units with highest unresolved workload — red bars = NC-dominated backlog
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.topUnits.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.topUnits} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: 700 }} width={120}
                      tickFormatter={(v: string) => v.length > 22 ? v.substring(0, 20) + '...' : v}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="open" name="Open CARs" radius={[0, 4, 4, 0]}>
                      {analytics.topUnits.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.nc > 0 ? '#ef4444' : '#6366f1'} />
                      ))}
                      <LabelList dataKey="open" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.unitsText}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2" />
                <p className="text-xs font-black text-emerald-600 uppercase">No open CARs — Excellent!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Row 3: Monthly Trend Line + MR Resolution Card === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Trend (spans 2 cols) */}
        <Card className="lg:col-span-2 shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Monthly CAR Trend — {selectedYear === 'all' ? 'All Years' : `AY ${selectedYear}`}</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              CARs created vs CARs closed per month — a widening gap signals the system is falling behind
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.monthlyTrend.some(m => m.Created > 0 || m.Closed > 0) ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={analytics.monthlyTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Line type="monotone" dataKey="Created" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
                    <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.trendText}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                <TrendingUp className="h-10 w-10 mb-2" />
                <p className="text-xs font-bold uppercase tracking-widest">No trend data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* MR Resolution */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">MR Decision Fulfillment</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Management Review decisions closed vs outstanding
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <div className="flex items-center justify-center h-[120px]">
              <div className="text-center">
                <div className="text-4xl font-black text-blue-600 tabular-nums">{analytics.mrResolutionRate}%</div>
                <p className="text-[10px] font-bold text-blue-600/70 mt-1 uppercase tracking-tighter">Resolution Rate</p>
                <p className="text-[9px] font-bold text-muted-foreground mt-1">{analytics.totalDecisions} total decisions</p>
              </div>
            </div>
            {analytics.totalDecisions > 0 && analytics.mrResolutionRate < 70 && (
              <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-700 bg-rose-50 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-rose-700 leading-relaxed">Decision backlog needs attention — less than 70% of management review outputs have been closed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Row 4: Campus Breakdown + Decision Trend === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Campus Breakdown */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">Corrective Actions by Campus</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              CAR status breakdown per campus — identifies sites needing stronger QMS support
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {analytics.byCampus.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={analytics.byCampus} margin={{ top: 10, right: 20, left: 0, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="campus" tick={{ fontSize: 8, fontWeight: 700 }} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                    {Object.entries(CAR_STATUS_COLORS).map(([status, color]) => (
                      <Bar key={status} dataKey={status} stackId="a" fill={color}>
                        <LabelList dataKey={status} position="inside" style={{ fontSize: 7, fontWeight: 800, fill: '#fff' }} formatter={(v: number) => v > 0 ? v : ''} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                    <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{analytics.campusText}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground opacity-40">
                <p className="text-xs font-bold uppercase tracking-widest">No campus data</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decision Trend */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ListTodo className="h-5 w-5 text-indigo-600" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">MR Decision Trends by Review Year</CardTitle>
            </div>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Stacked bar shows Open / On-going / Closed decisions from Management Reviews
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            {analytics.totalDecisions > 0 ? (
              <ChartContainer config={{
                  Open: { label: 'Open', color: 'hsl(var(--destructive))' },
                  'On-going': { label: 'On-going', color: 'hsl(48 96% 53%)' },
                  Closed: { label: 'Closed', color: 'hsl(142 71% 45%)' }
              }} className="h-[250px] w-full">
                  <ResponsiveContainer>
                      <BarChart data={analytics.decisionTrendData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 'bold' }} />
                          <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                          <RechartsTooltip content={<ChartTooltipContent />} />
                          <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                          <Bar dataKey="Open" stackId="a" fill="hsl(var(--destructive))" barSize={40}>
                              <LabelList dataKey="Open" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                          </Bar>
                          <Bar dataKey="On-going" stackId="a" fill="hsl(48 96% 53%)" barSize={40}>
                              <LabelList dataKey="On-going" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'hsl(var(--amber-950))' }} />
                          </Bar>
                          <Bar dataKey="Closed" stackId="a" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} barSize={40}>
                              <LabelList dataKey="Closed" position="center" style={{ fontSize: '10px', fontWeight: '900', fill: 'white' }} />
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground opacity-40">
                  <ListTodo className="h-10 w-10 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">No decision outputs logged yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === Overall Metrics Footer === */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground">Audit Reports</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{analytics.totalAudits}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground">MR Sessions</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{analytics.totalMrSessions}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <ListTodo className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground">MR Decisions</p>
              <p className="text-lg font-black text-slate-800 dark:text-slate-200">{analytics.totalDecisions}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-dashed shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Target className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-[9px] font-black uppercase text-muted-foreground">Resolution Rate</p>
              <p className="text-lg font-black text-emerald-600">{analytics.mrResolutionRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
