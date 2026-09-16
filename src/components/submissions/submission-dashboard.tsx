'use client';

import { useMemo, useState } from 'react';
import type { Submission, Cycle, Unit, User as AppUser } from '@/lib/types';
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
} from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Chart3DDefs, RenderBar3DLabel, RenderPie3DLabel } from '@/components/ui/chart-3d-defs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CalendarCheck,
  CalendarOff,
  FileWarning,
  Info,
  Activity,
  Target,
  ShieldCheck,
  Zap,
  Trophy,
  RotateCw,
  Check,
  LayoutList,
  ChevronRight,
  ChevronDown,
  Circle,
  Search,
  User,
  Building,
  ExternalLink,
} from 'lucide-react';
import { Timestamp } from '@/firebase/firestore-wrapper';
import { isBefore, isAfter, format } from 'date-fns';
import { ScrollArea } from '../ui/scroll-area';
import { Progress } from '../ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { submissionTypes } from '@/lib/constants';

interface SubmissionDashboardProps {
  submissions: Submission[];
  cycles: Cycle[];
  allUnits: Unit[];
  isLoading: boolean;
  selectedYear: string;
  allUsers?: AppUser[];
  isUnitRole?: boolean;
  isUserVpOffice?: boolean;
  userUnitId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  approved: 'hsl(142 71% 45%)', // Green
  submitted: 'hsl(var(--chart-1))', // Primary
  rejected: 'hsl(var(--destructive))', // Red
};

const TIMELINESS_COLORS: Record<string, string> = {
  'On-Time': 'hsl(142 71% 45%)',
  Early: 'hsl(var(--chart-2))',
  Late: 'hsl(var(--destructive))',
};

export function SubmissionDashboard({
  submissions,
  cycles,
  allUnits,
  isLoading,
  selectedYear,
  allUsers = [],
  isUnitRole = false,
  isUserVpOffice = false,
  userUnitId,
}: SubmissionDashboardProps) {
  const displayYear = selectedYear === 'all' ? 'All Recorded Years' : `AY ${selectedYear}`;
  const [viewMode, setViewMode] = useState<'document' | 'coordinator'>('document');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [expandedCoordinatorId, setExpandedCoordinatorId] = useState<string | null>(null);

  const analytics = useMemo(() => {
    if (!submissions || !cycles || !allUnits) return null;

    const total = submissions.length;
    const approved = submissions.filter((s) => s.statusId === 'approved').length;
    const pending = submissions.filter((s) => s.statusId === 'submitted').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const statusCounts: Record<string, number> = {};
    submissions.forEach((s) => {
      statusCounts[s.statusId] = (statusCounts[s.statusId] || 0) + 1;
    });
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({
      name: name === 'submitted' ? 'Awaiting Approval' : name.charAt(0).toUpperCase() + name.slice(1),
      value,
      statusId: name,
      fill: STATUS_COLORS[name] || '#cbd5e1',
    }));

    let onTimeCount = 0;
    let lateCount = 0;
    let earlyCount = 0;

    submissions.forEach((sub) => {
      const matchingCycle = cycles.find(
        (c) => c.name.toLowerCase() === sub.cycleId.toLowerCase() && Number(c.year) === Number(sub.year),
      );

      if (matchingCycle && matchingCycle.endDate) {
        const getMs = (val: any) => {
          if (val instanceof Timestamp) return val.toMillis();
          if (val instanceof Date) return val.getTime();
          if (val?.seconds) return val.seconds * 1000;
          return new Date(val).getTime();
        };

        const subTime = getMs(sub.submissionDate);
        const deadlineTime = getMs(matchingCycle.endDate);

        if (subTime <= deadlineTime) {
          if (matchingCycle.submissionStartDate && subTime < getMs(matchingCycle.submissionStartDate)) {
            earlyCount++;
          } else {
            onTimeCount++;
          }
        } else {
          lateCount++;
        }
      } else {
        onTimeCount++;
      }
    });

    const timelinessData = [
      { name: 'On-Time', value: onTimeCount, fill: TIMELINESS_COLORS['On-Time'] },
      { name: 'Early', value: earlyCount, fill: TIMELINESS_COLORS['Early'] },
      { name: 'Late', value: lateCount, fill: TIMELINESS_COLORS['Late'] },
    ];

    const reportCounts: Record<string, number> = {};
    submissionTypes.forEach((type) => (reportCounts[type] = 0));
    submissions.forEach((s) => {
      if (reportCounts[s.reportType] !== undefined) {
        reportCounts[s.reportType]++;
      }
    });
    const reportData = Object.entries(reportCounts).map(([name, total]) => ({ name, total }));

    const calculateMissingForCycle = (cycleId: 'first' | 'final') => {
      const cycleSubs = submissions.filter((s) => s.cycleId === cycleId);

      return submissionTypes.map((type) => {
        const submittedUnitIds = new Set(cycleSubs.filter((s) => s.reportType === type).map((s) => s.unitId));

        const exemptUnitIds = new Set<string>();
        if (type === 'Risk and Opportunity Action Plan') {
          cycleSubs
            .filter((s) => s.reportType === 'Risk and Opportunity Registry' && s.riskRating === 'low')
            .forEach((s) => {
              exemptUnitIds.add(s.unitId);
            });
        }

        const missingUnitsCount = allUnits.filter(
          (u) => !submittedUnitIds.has(u.id) && !exemptUnitIds.has(u.id),
        ).length;
        const relevantTotal = Math.max(0, allUnits.length - exemptUnitIds.size);
        const percentage =
          relevantTotal > 0 ? Math.round(((relevantTotal - missingUnitsCount) / relevantTotal) * 100) : 100;

        // JOURNEY MAP LOGIC: BASE ON FINAL FILED, NOT JUST DRAFT
        const isApproved = cycleSubs.some(
          (s) => s.reportType === type && s.statusId === 'approved' && s.isDraft !== true,
        );
        const isDraftCleared = cycleSubs.some(
          (s) => s.reportType === type && s.statusId === 'approved' && s.isDraft === true,
        );

        return {
          type,
          missingCount: missingUnitsCount,
          percentage,
          isExempt: relevantTotal === 0,
          isApproved,
          isDraftCleared,
        };
      });
    };

    const firstCycleMissing = calculateMissingForCycle('first');
    const finalCycleMissing = calculateMissingForCycle('final');

    const strengths = [];
    const timelinessRate = Math.round((onTimeCount / (total || 1)) * 100);

    if (timelinessRate >= 80) {
      strengths.push({
        title: 'Process Discipline',
        desc: `${timelinessRate}% On-Time submission rate across the university sites.`,
        icon: <CalendarCheck className="h-4 w-4 text-emerald-600" />,
        tag: 'PUNCTUALITY',
      });
    }

    if (approvalRate >= 70) {
      strengths.push({
        title: 'Verification Velocity',
        desc: `${approvalRate}% of all logged evidence reached 'Approved' status within the audit cycle.`,
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
        tag: 'QUALITY',
      });
    }

    return {
      total,
      approvalRate,
      pending,
      statusData,
      timelinessData,
      reportData,
      firstCycleMissing,
      finalCycleMissing,
      strengths,
    };
  }, [submissions, cycles, allUnits]);

  const yearlyPerformance = useMemo(() => {
    if (!submissions.length || !allUnits.length) return [];

    const yearMap = new Map<
      number,
      {
        firstCycle: Record<string, { submitted: number; approved: number; total: number }>;
        finalCycle: Record<string, { submitted: number; approved: number; total: number }>;
        totalUnits: number;
      }
    >();

    submissionTypes.forEach((type) => {
      submissions.forEach((sub) => {
        const yr = sub.year;
        if (!yearMap.has(yr)) {
          yearMap.set(yr, {
            firstCycle: Object.fromEntries(submissionTypes.map((t) => [t, { submitted: 0, approved: 0, total: 0 }])),
            finalCycle: Object.fromEntries(submissionTypes.map((t) => [t, { submitted: 0, approved: 0, total: 0 }])),
            totalUnits: allUnits.length,
          });
        }
        const entry = yearMap.get(yr)!;
        const cycleKey = sub.cycleId === 'first' ? 'firstCycle' : 'finalCycle';
        const docEntry = entry[cycleKey][sub.reportType];
        if (docEntry) {
          docEntry.submitted++;
          if (sub.statusId === 'approved') docEntry.approved++;
        }
      });
    });

    return Array.from(yearMap.entries())
      .map(([year, data]) => {
        const rows: any[] = [];
        const processCycle = (cycleKey: 'firstCycle' | 'finalCycle', cycleLabel: string) => {
          submissionTypes.forEach((type) => {
            const d = data[cycleKey][type];
            const missingUnits = data.totalUnits - d.submitted;
            const completionRate = data.totalUnits > 0 ? Math.round((d.submitted / data.totalUnits) * 100) : 0;
            const approvalRate = d.submitted > 0 ? Math.round((d.approved / d.submitted) * 100) : 0;
            rows.push({
              year,
              cycle: cycleLabel,
              type,
              submitted: d.submitted,
              approved: d.approved,
              missing: missingUnits,
              total: data.totalUnits,
              completionRate,
              approvalRate,
            });
          });
        };
        processCycle('firstCycle', 'First');
        processCycle('finalCycle', 'Final');

        const firstTotal = submissionTypes.reduce((s, t) => s + data.firstCycle[t].submitted, 0);
        const finalTotal = submissionTypes.reduce((s, t) => s + data.finalCycle[t].submitted, 0);
        const firstTotalPossible = data.totalUnits * 6;
        const finalTotalPossible = data.totalUnits * 6;

        rows.push({
          year,
          cycle: 'Total',
          type: 'Overall Completion',
          submitted: firstTotal + finalTotal,
          approved: 0,
          missing: firstTotalPossible + finalTotalPossible - (firstTotal + finalTotal),
          total: firstTotalPossible + finalTotalPossible,
          completionRate:
            firstTotalPossible + finalTotalPossible > 0
              ? Math.round(((firstTotal + finalTotal) / (firstTotalPossible + finalTotalPossible)) * 100)
              : 0,
          approvalRate: 0,
          isTotal: true,
        });

        return rows;
      })
      .flat()
      .sort(
        (a, b) =>
          b.year - a.year || (a.cycle === 'Total' ? 1 : b.cycle === 'Total' ? -1 : a.cycle.localeCompare(b.cycle)),
      );
  }, [submissions, allUnits]);

  const coordinatorPerformance = useMemo(() => {
    if (!allUnits.length) return [];

    return allUnits
      .map((unit) => {
        // Find assigned coordinator for this unit
        const coord =
          allUsers.find(
            (u) =>
              u.unitId === unit.id && (u.role === 'Unit Coordinator' || u.role?.toLowerCase().includes('coordinator')),
          ) ||
          allUsers.find(
            (u) => u.unitId === unit.id && (u.role?.toLowerCase().includes('head') || u.role === 'Unit ODIMO'),
          );

        const unitSubs = submissions.filter((s) => s.unitId === unit.id);

        // First Cycle (6 submissionTypes)
        const firstCycleSubs = unitSubs.filter((s) => s.cycleId?.toLowerCase() === 'first');
        const firstCycleTypes = new Set(firstCycleSubs.map((s) => s.reportType));
        const firstCycleSubmitted = submissionTypes.filter((t) => firstCycleTypes.has(t)).length;
        const firstCycleApproved = submissionTypes.filter((t) =>
          firstCycleSubs.some((s) => s.reportType === t && s.statusId === 'approved'),
        ).length;

        // Final Cycle (6 submissionTypes)
        const finalCycleSubs = unitSubs.filter((s) => s.cycleId?.toLowerCase() === 'final');
        const finalCycleTypes = new Set(finalCycleSubs.map((s) => s.reportType));
        const finalCycleSubmitted = submissionTypes.filter((t) => finalCycleTypes.has(t)).length;
        const finalCycleApproved = submissionTypes.filter((t) =>
          finalCycleSubs.some((s) => s.reportType === t && s.statusId === 'approved'),
        ).length;

        // Annual compliance
        const totalSubmitted = firstCycleSubmitted + finalCycleSubmitted;
        const totalPossible = 12;
        const overallCompletionRate = Math.round((totalSubmitted / totalPossible) * 100);
        const totalApproved = firstCycleApproved + finalCycleApproved;
        const approvalRate = totalSubmitted > 0 ? Math.round((totalApproved / totalSubmitted) * 100) : 0;

        // Timeliness
        let onTimeCount = 0;
        let lateCount = 0;
        unitSubs.forEach((sub) => {
          const matchingCycle = cycles.find(
            (c) => c.name.toLowerCase() === sub.cycleId?.toLowerCase() && Number(c.year) === Number(sub.year),
          );
          if (matchingCycle && matchingCycle.endDate) {
            const getMs = (val: any) => {
              if (val instanceof Timestamp) return val.toMillis();
              if (val instanceof Date) return val.getTime();
              if (val?.seconds) return val.seconds * 1000;
              return new Date(val).getTime();
            };
            const subTime = getMs(sub.submissionDate);
            const deadlineTime = getMs(matchingCycle.endDate);
            if (subTime <= deadlineTime) onTimeCount++;
            else lateCount++;
          } else {
            onTimeCount++;
          }
        });
        const timelinessRate = unitSubs.length > 0 ? Math.round((onTimeCount / unitSubs.length) * 100) : 100;

        // Missing reports
        const missingFirst = submissionTypes.filter((t) => !firstCycleTypes.has(t));
        const missingFinal = submissionTypes.filter((t) => !finalCycleTypes.has(t));

        // Detailed document status
        const docBreakdown = submissionTypes.map((type) => {
          const firstSub = firstCycleSubs.find((s) => s.reportType === type);
          const finalSub = finalCycleSubs.find((s) => s.reportType === type);
          return {
            type,
            firstSubmitted: !!firstSub,
            firstApproved: firstSub?.statusId === 'approved',
            firstStatus: firstSub ? (firstSub.statusId === 'approved' ? 'Approved' : 'Submitted') : 'Missing',
            firstDate: firstSub?.submissionDate,
            firstLink: firstSub?.googleDriveLink,
            firstIsDraft: firstSub?.isDraft,
            finalSubmitted: !!finalSub,
            finalApproved: finalSub?.statusId === 'approved',
            finalStatus: finalSub ? (finalSub.statusId === 'approved' ? 'Approved' : 'Submitted') : 'Missing',
            finalDate: finalSub?.submissionDate,
            finalLink: finalSub?.googleDriveLink,
            finalIsDraft: finalSub?.isDraft,
          };
        });

        return {
          unitId: unit.id,
          unitName: unit.name,
          coordinatorName: coord ? `${coord.firstName} ${coord.lastName}` : 'Unassigned Coordinator',
          coordinatorRole: coord?.role || 'Unit Coordinator',
          coordinatorAvatar: coord?.avatar || '',
          coordinatorEmail: coord?.email || '',
          firstCycleSubmitted,
          firstCycleApproved,
          firstCycleRate: Math.round((firstCycleSubmitted / 6) * 100),
          finalCycleSubmitted,
          finalCycleApproved,
          finalCycleRate: Math.round((finalCycleSubmitted / 6) * 100),
          totalSubmitted,
          totalPossible,
          overallCompletionRate,
          approvalRate,
          timelinessRate,
          onTimeCount,
          lateCount,
          missingFirst,
          missingFinal,
          totalMissingCount: missingFirst.length + missingFinal.length,
          docBreakdown,
        };
      })
      .sort((a, b) => b.overallCompletionRate - a.overallCompletionRate || a.unitName.localeCompare(b.unitName));
  }, [allUnits, allUsers, submissions, cycles]);

  const filteredCoordinators = useMemo(() => {
    let list = coordinatorPerformance;
    if (coordinatorSearch.trim()) {
      const q = coordinatorSearch.toLowerCase();
      list = list.filter((c) => c.coordinatorName.toLowerCase().includes(q) || c.unitName.toLowerCase().includes(q));
    }
    return list;
  }, [coordinatorPerformance, coordinatorSearch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
        <Skeleton className="h-[400px] col-span-full" />
      </div>
    );
  }

  if (!analytics || analytics.total === 0) {
    return (
      <Card className="border-dashed py-20 flex flex-col items-center justify-center text-center bg-muted/5">
        <Activity className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
        <CardTitle className="text-xl font-black uppercase tracking-widest opacity-40">
          Submission Data Pending
        </CardTitle>
        <CardDescription className="max-w-xs mx-auto">
          Visual analytics for {displayYear} will activate once units begin logging evidence through the portal.
        </CardDescription>
      </Card>
    );
  }

  const renderMissingCard = (title: string, data: any[]) => (
    <Card className="border-destructive/20 bg-destructive/5 shadow-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="bg-destructive/10 border-b py-3">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive flex items-center gap-2">
          <FileWarning className="h-3.5 w-3.5" />
          {title} ({displayYear})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="h-[240px]">
          <div className="p-4 space-y-3">
            {data.map((item, idx) => (
              <div
                key={idx}
                className="space-y-1.5 p-2 rounded bg-white border border-destructive/5 shadow-sm group hover:border-destructive/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate leading-none group-hover:text-destructive transition-colors"
                    title={item.type}
                  >
                    {item.type}
                  </span>
                  <Badge
                    variant={item.missingCount > 0 ? 'destructive' : 'default'}
                    className="h-4 text-[8px] font-black py-0 px-1.5 border-none"
                  >
                    {item.missingCount > 0 ? `${item.missingCount} GAPS` : 'PARITY REACHED'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={item.percentage} className="h-1 flex-1" />
                  <span className="text-[9px] font-black text-muted-foreground tabular-nums">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Yearly Submission Performance Table */}
      {yearlyPerformance.length > 0 && (
        <Card className="shadow-md border-primary/10 overflow-hidden bg-card">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b py-4 px-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 shadow-sm border border-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {isUnitRole ? (
                      <>
                        Unit Submission Performance:{' '}
                        <span className="text-primary">{allUnits[0]?.name || 'My Unit'}</span>
                      </>
                    ) : isUserVpOffice ? (
                      <>Supervised Cluster Submission Performance</>
                    ) : (
                      <>Submission Performance by Academic Year</>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {isUnitRole
                      ? 'Compliance checklist for your assigned unit (6 required documents per cycle, 12 per academic year)'
                      : isUserVpOffice
                        ? 'Cluster compliance tracking across supervised colleges and academic units'
                        : 'Year-over-year document submission completion by cycle and coordinator'}
                  </CardDescription>
                </div>
              </div>

              {!isUnitRole && allUnits.length > 1 && (
                <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-900/80 p-1 rounded-lg border border-primary/10 shadow-sm shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('document')}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5',
                      viewMode === 'document'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                    )}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    By Document Type
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('coordinator')}
                    className={cn(
                      'px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all flex items-center gap-1.5',
                      viewMode === 'coordinator'
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100',
                    )}
                  >
                    <User className="h-3.5 w-3.5" />
                    By Coordinator / Unit ({coordinatorPerformance.length})
                  </button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {viewMode === 'coordinator' && !isUnitRole ? (
              <div className="space-y-4 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search coordinator name or unit..."
                      value={coordinatorSearch}
                      onChange={(e) => setCoordinatorSearch(e.target.value)}
                      className="pl-8 h-8 text-xs bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-wider h-6">
                      {filteredCoordinators.length} Unit Coordinator(s)
                    </Badge>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/70 dark:bg-slate-800/30">
                        <TableHead className="pl-6 py-3.5 text-[9px] font-black uppercase text-slate-500 tracking-wider min-w-[180px]">
                          Unit Coordinator
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider min-w-[160px]">
                          Assigned Unit / College
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Cycle 1 (First)
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Cycle 2 (Final)
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Annual Compliance
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                          Punctuality
                        </TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Missing Gaps
                        </TableHead>
                        <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          Details
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCoordinators.map((row) => {
                        const isExpanded = expandedCoordinatorId === row.unitId;
                        return (
                          <div key={row.unitId} className="contents">
                            <TableRow
                              className={cn(
                                'hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-all border-b cursor-pointer',
                                isExpanded && 'bg-primary/5',
                              )}
                              onClick={() => setExpandedCoordinatorId(isExpanded ? null : row.unitId)}
                            >
                              <TableCell className="pl-6 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="h-7 w-7 border">
                                    <AvatarImage src={row.coordinatorAvatar} alt={row.coordinatorName} />
                                    <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">
                                      {row.coordinatorName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                      {row.coordinatorName}
                                      {row.coordinatorName === 'Unassigned Coordinator' && (
                                        <Badge
                                          variant="outline"
                                          className="h-3.5 text-[7px] text-amber-600 border-amber-300"
                                        >
                                          VACANT
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[9px] text-muted-foreground font-medium">
                                      {row.coordinatorRole}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="font-bold text-xs text-slate-700 dark:text-slate-300">
                                  {row.unitName}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-xs font-black tabular-nums">{row.firstCycleSubmitted}/6</span>
                                  <span className="text-[8px] font-bold text-muted-foreground">
                                    {row.firstCycleRate}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="inline-flex flex-col items-center">
                                  <span className="text-xs font-black tabular-nums">{row.finalCycleSubmitted}/6</span>
                                  <span className="text-[8px] font-bold text-muted-foreground">
                                    {row.finalCycleRate}%
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span
                                    className={cn(
                                      'text-xs font-black tabular-nums',
                                      row.overallCompletionRate === 100
                                        ? 'text-emerald-600'
                                        : row.overallCompletionRate >= 80
                                          ? 'text-blue-600'
                                          : row.overallCompletionRate >= 50
                                            ? 'text-amber-600'
                                            : 'text-rose-600',
                                    )}
                                  >
                                    {row.overallCompletionRate}%
                                  </span>
                                  <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className={cn(
                                        'h-full rounded-full transition-all',
                                        row.overallCompletionRate === 100
                                          ? 'bg-emerald-500'
                                          : row.overallCompletionRate >= 80
                                            ? 'bg-blue-500'
                                            : row.overallCompletionRate >= 50
                                              ? 'bg-amber-500'
                                              : 'bg-rose-500',
                                      )}
                                      style={{ width: `${row.overallCompletionRate}%` }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'text-[8px] font-black h-4 px-1.5',
                                    row.timelinessRate >= 90
                                      ? 'border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                                      : 'border-rose-200 text-rose-700 bg-rose-50 dark:bg-rose-950/20',
                                  )}
                                >
                                  {row.timelinessRate}% ON-TIME
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {row.totalMissingCount === 0 ? (
                                  <Badge className="bg-emerald-600 text-white text-[8px] font-black h-4 px-2 border-none">
                                    <Check className="h-2.5 w-2.5 mr-1" /> FULL COMPLIANCE
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Badge variant="destructive" className="text-[8px] font-black h-4 px-1.5">
                                      {row.totalMissingCount} MISSING
                                    </Badge>
                                    {row.missingFirst.length > 0 && (
                                      <span
                                        className="text-[8px] text-muted-foreground truncate max-w-[120px]"
                                        title={row.missingFirst.join(', ')}
                                      >
                                        C1: {row.missingFirst[0]}
                                        {row.missingFirst.length > 1 ? ` +${row.missingFirst.length - 1}` : ''}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedCoordinatorId(isExpanded ? null : row.unitId);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                  ) : (
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isExpanded && (
                              <TableRow className="bg-slate-50/90 dark:bg-slate-900/60 border-b">
                                <TableCell colSpan={8} className="p-4 pl-10">
                                  <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 shadow-inner">
                                    <div className="flex items-center justify-between border-b pb-2">
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                                          6 Required EOMS Documents — {row.unitName}
                                        </span>
                                      </div>
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase">
                                        Coordinator: {row.coordinatorName} ({row.coordinatorEmail || 'No Email'})
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {row.docBreakdown.map((docItem, dIdx) => (
                                        <div
                                          key={dIdx}
                                          className="p-2.5 rounded-lg border bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5"
                                        >
                                          <div className="flex items-center justify-between gap-1">
                                            <span
                                              className="text-[9px] font-black text-slate-800 dark:text-slate-200 truncate"
                                              title={docItem.type}
                                            >
                                              {docItem.type}
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[8px]">
                                            <div className="flex items-center justify-between p-1 rounded bg-white dark:bg-slate-800 border">
                                              <span className="font-bold text-slate-500">C1:</span>
                                              <div className="flex items-center gap-1">
                                                <Badge
                                                  variant={
                                                    docItem.firstSubmitted
                                                      ? docItem.firstApproved
                                                        ? 'default'
                                                        : 'secondary'
                                                      : 'destructive'
                                                  }
                                                  className="text-[7px] font-black px-1 py-0 h-3.5 border-none"
                                                >
                                                  {docItem.firstStatus}
                                                </Badge>
                                                {docItem.firstLink && (
                                                  <a
                                                    href={docItem.firstLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/70"
                                                  >
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between p-1 rounded bg-white dark:bg-slate-800 border">
                                              <span className="font-bold text-slate-500">C2:</span>
                                              <div className="flex items-center gap-1">
                                                <Badge
                                                  variant={
                                                    docItem.finalSubmitted
                                                      ? docItem.finalApproved
                                                        ? 'default'
                                                        : 'secondary'
                                                      : 'destructive'
                                                  }
                                                  className="text-[7px] font-black px-1 py-0 h-3.5 border-none"
                                                >
                                                  {docItem.finalStatus}
                                                </Badge>
                                                {docItem.finalLink && (
                                                  <a
                                                    href={docItem.finalLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-primary hover:text-primary/70"
                                                  >
                                                    <ExternalLink className="h-2.5 w-2.5" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </div>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 dark:bg-slate-800/20">
                      <TableHead className="pl-6 py-4 text-[9px] font-black uppercase text-slate-500 tracking-wider w-[100px]">
                        Academic Year
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider w-[70px]">
                        Cycle
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider min-w-[180px]">
                        Document Type
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        Submitted
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-emerald-700 tracking-wider text-center">
                        Approved
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-rose-700 tracking-wider text-center">
                        Missing
                      </TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-500 tracking-wider text-center">
                        Completion %
                      </TableHead>
                      <TableHead className="text-right pr-6 text-[9px] font-black uppercase text-slate-500 tracking-wider">
                        Approval Rate
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {yearlyPerformance.map((row, idx) => {
                      const isTotal = row.isTotal;
                      return (
                        <TableRow
                          key={idx}
                          className={cn(
                            'hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all border-b text-center',
                            isTotal && 'bg-primary/5 font-bold',
                          )}
                        >
                          <TableCell className="pl-6 py-3 text-left">
                            <span
                              className={cn(
                                'font-black',
                                isTotal ? 'text-sm text-primary' : 'text-xs text-slate-900 dark:text-slate-100',
                              )}
                            >
                              AY {row.year}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.cycle === 'First' ? 'outline' : row.cycle === 'Final' ? 'secondary' : 'default'
                              }
                              className={cn(
                                'text-[8px] font-black px-1.5 py-0 h-4',
                                row.cycle === 'Total' && 'bg-primary text-white border-none',
                              )}
                            >
                              {row.cycle}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-left">
                            <span
                              className={cn(
                                'text-[10px]',
                                isTotal
                                  ? 'font-black text-primary uppercase'
                                  : 'font-bold text-slate-700 dark:text-slate-300',
                              )}
                            >
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums font-black text-sm text-slate-700 dark:text-slate-300">
                            {row.submitted}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            <span
                              className={cn(
                                'font-black text-sm',
                                row.approved === row.submitted && row.approved > 0
                                  ? 'text-emerald-600'
                                  : 'text-slate-500',
                              )}
                            >
                              {row.approved}
                            </span>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            <span
                              className={cn(
                                'font-black text-sm',
                                row.missing > 0 ? 'text-rose-600' : 'text-emerald-600',
                              )}
                            >
                              {row.missing}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={cn(
                                  'text-sm font-black tabular-nums',
                                  row.completionRate >= 90
                                    ? 'text-emerald-600'
                                    : row.completionRate >= 70
                                      ? 'text-amber-600'
                                      : 'text-rose-600',
                                )}
                              >
                                {row.completionRate}%
                              </span>
                              <div className="w-14 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    row.completionRate >= 90
                                      ? 'bg-emerald-500'
                                      : row.completionRate >= 70
                                        ? 'bg-amber-500'
                                        : 'bg-rose-500',
                                  )}
                                  style={{ width: `${row.completionRate}%` }}
                                />
                              </div>
                              {row.missing > 0 && (
                                <span className="text-[7px] font-bold text-rose-500 uppercase tracking-wider">
                                  {Math.round((row.missing / row.total) * 100)}% gap
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {row.approvalRate > 0 ? (
                              <span
                                className={cn(
                                  'font-black text-sm tabular-nums',
                                  row.approvalRate >= 80
                                    ? 'text-emerald-600'
                                    : row.approvalRate >= 50
                                      ? 'text-amber-600'
                                      : 'text-rose-600',
                                )}
                              >
                                {row.approvalRate}%
                              </span>
                            ) : isTotal ? (
                              <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                                {row.completionRate}%
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-300 font-black">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-muted/5 border-t py-2.5 px-6">
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
              <Info className="h-3 w-3 text-primary/40" />
              {viewMode === 'coordinator'
                ? 'Evaluation based on 6 required EOMS document types per cycle (12 total per academic year). Click any coordinator row to inspect the 6-document compliance checklist.'
                : isUnitRole
                  ? 'Status represents required EOMS document submissions for your unit (6 documents per cycle, 12 total per academic year).'
                  : 'Missing = units without a submission for that document type. Completion % = submitted / total units. Gap % = missing / total units.'}
            </div>
          </CardFooter>
        </Card>
      )}

      <Card className="shadow-lg border-primary/10 overflow-hidden bg-primary/5">
        <CardHeader className="bg-primary/10 border-b py-4">
          <div className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm font-black uppercase tracking-tight">
              Institutional Compliance Journey Map
            </CardTitle>
          </div>
          <CardDescription className="text-[10px]">
            Strategic roadmap based on <strong>Final Official Filings</strong> (Approved PDFs).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {submissionTypes.map((type, idx) => {
              const status1 = analytics.firstCycleMissing.find((m) => m.type === type);
              const status2 = analytics.finalCycleMissing.find((m) => m.type === type);

              const isApproved = status1?.isApproved || status2?.isApproved;
              const isDraftCleared = status1?.isDraftCleared || status2?.isDraftCleared;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex flex-col items-center text-center p-4 rounded-2xl border transition-all duration-500',
                    isApproved
                      ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-200'
                      : isDraftCleared
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'bg-muted/10 border-slate-100 dark:border-slate-700 grayscale opacity-40',
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center mb-3 transition-colors shadow-sm',
                      isApproved
                        ? 'bg-emerald-600 text-white'
                        : isDraftCleared
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-500',
                    )}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : isDraftCleared ? (
                      <LayoutList className="h-5 w-5" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </div>
                  <p className="text-[9px] font-black uppercase leading-tight">{type}</p>
                  {isApproved ? (
                    <Badge
                      variant="secondary"
                      className="h-3 text-[7px] font-black uppercase bg-emerald-50 text-emerald-700 border-none mt-2"
                    >
                      OFFICIALLY FILED
                    </Badge>
                  ) : isDraftCleared ? (
                    <Badge
                      variant="secondary"
                      className="h-3 text-[7px] font-black uppercase bg-blue-100 text-blue-700 border-none mt-2"
                    >
                      DRAFT CLEARED
                    </Badge>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-primary/5 border-primary/10 shadow-sm relative overflow-hidden flex flex-col">
          <div className="absolute top-0 right-0 p-2 opacity-5">
            <FileText className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Volume Registry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-primary tabular-nums tracking-tighter">{analytics.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
              Approval Maturity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-emerald-600 tabular-nums tracking-tighter">
              {analytics.approvalRate}%
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700">
              Audit Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-amber-600 tabular-nums tracking-tighter">{analytics.pending}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
              Timeliness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-blue-600 tabular-nums tracking-tighter">
              {Math.round((analytics.timelinessData[0].value / (analytics.total || 1)) * 100)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-emerald-200 shadow-xl overflow-hidden bg-emerald-50/10 relative">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 opacity-50" />
        <CardHeader className="bg-emerald-50 border-b py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-700">
                <Zap className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-sm font-black uppercase tracking-tight">
                  Institutional Maturity Strengths
                </CardTitle>
              </div>
              <CardDescription className="text-[10px] font-bold text-emerald-800/60 uppercase">
                High-performance metrics derived from verified evidence logs for {displayYear}.
              </CardDescription>
            </div>
            <Trophy className="h-10 w-10 text-emerald-600/10" />
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analytics.strengths.length > 0 ? (
              analytics.strengths.map((strength, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 p-4 rounded-xl bg-white border border-emerald-100 shadow-sm transition-all hover:scale-105 duration-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        {strength.icon}
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter">
                        {strength.title}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="h-4 text-[7px] font-black border-emerald-200 text-emerald-700 uppercase"
                    >
                      {strength.tag}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium italic">
                    "{strength.desc}"
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-full py-10 flex flex-col items-center justify-center opacity-20">
                <Activity className="h-8 w-8" />
                <p className="text-[10px] font-black uppercase mt-2">Calibrating system strengths...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {renderMissingCard('Parity Gap Analysis: First Submission Cycle', analytics.firstCycleMissing)}
        {renderMissingCard('Parity Gap Analysis: Final Submission Cycle', analytics.finalCycleMissing)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
        <Chart3DDefs idPrefix="subdash3d" />

        <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Institutional Timeliness index (3D)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <ChartContainer config={{}} className="h-[220px] w-[220px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={analytics.timelinessData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                      label={RenderPie3DLabel}
                      labelLine={false}
                    >
                      {analytics.timelinessData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={index === 0 ? 'url(#subdash3d-grad-emerald)' : 'url(#subdash3d-grad-rose)'}
                          filter="url(#subdash3d-soft-depth)"
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Quality Maturity Lifecycle (3D)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{}} className="h-[250px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie
                    data={analytics.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={4}
                    label={RenderPie3DLabel}
                    labelLine={false}
                    dataKey="value"
                  >
                    {analytics.statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? 'url(#subdash3d-grad-emerald)'
                            : index === 1
                              ? 'url(#subdash3d-grad-amber)'
                              : 'url(#subdash3d-grad-rose)'
                        }
                        filter="url(#subdash3d-soft-depth)"
                      />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontStyle: 'bold',
                      paddingTop: '20px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-all border-primary/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
          <CardHeader className="bg-muted/10 border-b py-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-black uppercase tracking-tight">
                Documentation Density Profile (3D)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ChartContainer config={{}} className="h-[350px] w-full">
              <ResponsiveContainer>
                <BarChart data={analytics.reportData} layout="vertical" margin={{ left: 20, right: 40, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.15} />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 8, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                    width={180}
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="total"
                    fill="url(#subdash3d-grad-indigo)"
                    radius={[0, 6, 6, 0]}
                    barSize={16}
                    filter="url(#subdash3d-soft-depth)"
                  >
                    <LabelList content={<RenderBar3DLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
