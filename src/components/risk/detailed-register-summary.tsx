'use client';

import { useMemo, useState } from 'react';
import type { Risk } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailedRegisterSummaryProps {
  risks: Risk[];
  currentTab: 'all' | 'risks' | 'opportunities';
  selectedYear: number;
}

export function DetailedRegisterSummary({ risks, currentTab, selectedYear }: DetailedRegisterSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter based on currently active sub-tab (all, risks, or opportunities)
  const currentDataset = useMemo(() => {
    if (currentTab === 'risks') return risks.filter((r) => r.type === 'Risk');
    if (currentTab === 'opportunities') return risks.filter((r) => r.type === 'Opportunity');
    return risks;
  }, [risks, currentTab]);

  const stats = useMemo(() => {
    const total = currentDataset.length;
    const allTotal = risks.length;
    const totalRisks = risks.filter((r) => r.type === 'Risk').length;
    const totalOpps = risks.filter((r) => r.type === 'Opportunity').length;

    // Magnitude breakdown (pre-treatment)
    const high = currentDataset.filter((r) => r.preTreatment?.rating === 'High').length;
    const medium = currentDataset.filter((r) => r.preTreatment?.rating === 'Medium').length;
    const low = currentDataset.filter((r) => r.preTreatment?.rating === 'Low').length;

    // Status breakdown
    const open = currentDataset.filter((r) => r.status === 'Open').length;
    const inProgress = currentDataset.filter((r) => r.status === 'In Progress').length;
    const closed = currentDataset.filter((r) => r.status === 'Closed').length;

    // Active high-priority items needing attention
    const activeHigh = currentDataset.filter((r) => r.preTreatment?.rating === 'High' && r.status !== 'Closed').length;

    // Completion rate
    const completionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

    // Average magnitude score
    const avgMagnitude =
      total > 0
        ? (currentDataset.reduce((acc, r) => acc + (r.preTreatment?.magnitude || 0), 0) / total).toFixed(1)
        : '0.0';

    const highPct = total > 0 ? Math.round((high / total) * 100) : 0;
    const mediumPct = total > 0 ? Math.round((medium / total) * 100) : 0;
    const lowPct = total > 0 ? Math.round((low / total) * 100) : 0;

    const openPct = total > 0 ? Math.round((open / total) * 100) : 0;
    const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
    const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0;

    return {
      total,
      allTotal,
      totalRisks,
      totalOpps,
      high,
      medium,
      low,
      highPct,
      mediumPct,
      lowPct,
      open,
      inProgress,
      closed,
      openPct,
      inProgressPct,
      closedPct,
      activeHigh,
      completionRate,
      avgMagnitude,
    };
  }, [currentDataset, risks]);

  const tabTitle =
    currentTab === 'risks'
      ? 'Risks Register'
      : currentTab === 'opportunities'
        ? 'Opportunities Register'
        : 'Risk & Opportunity Registry';

  return (
    <Card className="border border-indigo-100 dark:border-indigo-950/50 shadow-md bg-gradient-to-br from-white via-indigo-50/15 to-slate-50 dark:from-slate-900 dark:via-indigo-950/10 dark:to-slate-900 overflow-hidden">
      {/* Header bar with toggle */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-indigo-50/40 dark:bg-indigo-950/20">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {tabTitle} Visualization Overview
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 text-indigo-700 border-indigo-200"
              >
                AY {selectedYear}
              </Badge>
              {currentTab !== 'all' && (
                <Badge
                  variant="secondary"
                  className="text-[9px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800"
                >
                  {currentTab === 'risks' ? 'Filtered: Risks Only' : 'Filtered: Opportunities Only'}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Key operational metrics, magnitude distribution, and treatment status for the current register scope
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-7 px-2.5 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-indigo-600 hover:bg-white/80 gap-1.5"
        >
          <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </div>

      {/* Collapsed Compact Preview Bar */}
      {!isExpanded && (
        <div className="px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-white/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Summary:</span>
            <Badge className="bg-slate-100 text-slate-800 border-slate-200 text-[10px] font-black">
              Total: {stats.total}
            </Badge>
            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-black">
              High: {stats.high}
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] font-black">
              Medium: {stats.medium}
            </Badge>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-black">
              Low: {stats.low}
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Status:</span>
            <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Open: {stats.open}</Badge>
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">
              On-going: {stats.inProgress}
            </Badge>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Closed: {stats.closed} ({stats.completionRate}%)
            </Badge>
          </div>
        </div>
      )}

      {/* Expanded Full Visualization Content */}
      {isExpanded && (
        <CardContent className="p-5 space-y-4">
          {/* Row 1: KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Card 1: Total Volume */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Total{' '}
                  {currentTab === 'opportunities' ? 'Opportunities' : currentTab === 'risks' ? 'Risks' : 'Entries'}
                </span>
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {stats.total}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">in current filter</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {stats.totalRisks} Risks
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {stats.totalOpps} Opps
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: High Magnitude Risks */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-rose-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  High Magnitude
                </span>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-rose-600 tracking-tight">{stats.high}</span>
                  <span className="text-[11px] font-bold text-rose-500">({stats.highPct}%)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px]">
                  <span className="font-semibold text-slate-500">Rating: 10–25</span>
                  {stats.activeHigh > 0 ? (
                    <span className="font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                      {stats.activeHigh} Active
                    </span>
                  ) : (
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">All Resolved</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Medium Magnitude Risks */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-amber-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Medium Magnitude
                </span>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <Activity className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-amber-600 tracking-tight">{stats.medium}</span>
                  <span className="text-[11px] font-bold text-amber-500">({stats.mediumPct}%)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px]">
                  <span className="font-semibold text-slate-500">Rating: 5–9</span>
                  <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Monitored
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Low Magnitude Risks */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-emerald-200/80 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Low Magnitude
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">{stats.low}</span>
                  <span className="text-[11px] font-bold text-emerald-500">({stats.lowPct}%)</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[9px]">
                  <span className="font-semibold text-slate-500">Rating: 1–4</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Baseline
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Status & Magnitude Visual Distributions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Panel 1: Implementation & Treatment Status */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Implementation Status
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Completion:</span>
                    <Badge
                      className={cn(
                        'text-[10px] font-black border-none',
                        stats.completionRate >= 75
                          ? 'bg-emerald-100 text-emerald-800'
                          : stats.completionRate >= 40
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800',
                      )}
                    >
                      {stats.completionRate}% Closed
                    </Badge>
                  </div>
                </div>

                {/* Stacked Status Progress Bar */}
                <div className="mt-3 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 flex overflow-hidden border border-slate-200/60 dark:border-slate-600">
                  {stats.total > 0 ? (
                    <>
                      <div
                        style={{ width: `${stats.openPct}%` }}
                        className="bg-rose-500 h-full transition-all duration-300"
                        title={`Open: ${stats.open} (${stats.openPct}%)`}
                      />
                      <div
                        style={{ width: `${stats.inProgressPct}%` }}
                        className="bg-amber-500 h-full transition-all duration-300"
                        title={`On-going: ${stats.inProgress} (${stats.inProgressPct}%)`}
                      />
                      <div
                        style={{ width: `${stats.closedPct}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                        title={`Closed: ${stats.closed} (${stats.closedPct}%)`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200 dark:bg-slate-600 h-full" />
                  )}
                </div>

                {/* Status Indicator Tiles */}
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {/* Open */}
                  <div className="p-2 rounded-lg bg-rose-50/70 border border-rose-200/80 text-center">
                    <div className="text-[9px] font-black uppercase text-rose-700 tracking-wider">Open</div>
                    <div className="text-lg font-black text-rose-600 leading-tight mt-0.5">{stats.open}</div>
                    <div className="text-[9px] font-bold text-rose-500">{stats.openPct}% of total</div>
                  </div>

                  {/* On-going / In Progress */}
                  <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-center">
                    <div className="text-[9px] font-black uppercase text-amber-700 tracking-wider">On-going</div>
                    <div className="text-lg font-black text-amber-600 leading-tight mt-0.5">{stats.inProgress}</div>
                    <div className="text-[9px] font-bold text-amber-500">{stats.inProgressPct}% of total</div>
                  </div>

                  {/* Closed */}
                  <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-200/80 text-center">
                    <div className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Closed</div>
                    <div className="text-lg font-black text-emerald-600 leading-tight mt-0.5">{stats.closed}</div>
                    <div className="text-[9px] font-bold text-emerald-500">{stats.closedPct}% of total</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 flex items-center justify-between">
                <span>
                  Total Items Evaluated: <strong>{stats.total}</strong>
                </span>
                <span>
                  Active Workload: <strong>{stats.open + stats.inProgress}</strong>
                </span>
              </div>
            </div>

            {/* Panel 2: Magnitude & Severity Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-violet-600" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Severity Distribution
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Magnitude:</span>
                    <Badge variant="outline" className="text-[10px] font-black text-slate-800 border-slate-300">
                      {stats.avgMagnitude} / 25
                    </Badge>
                  </div>
                </div>

                {/* Stacked Magnitude Progress Bar */}
                <div className="mt-3 h-3 w-full rounded-full bg-slate-100 dark:bg-slate-700 flex overflow-hidden border border-slate-200/60 dark:border-slate-600">
                  {stats.total > 0 ? (
                    <>
                      <div
                        style={{ width: `${stats.highPct}%` }}
                        className="bg-rose-500 h-full transition-all duration-300"
                        title={`High: ${stats.high} (${stats.highPct}%)`}
                      />
                      <div
                        style={{ width: `${stats.mediumPct}%` }}
                        className="bg-amber-500 h-full transition-all duration-300"
                        title={`Medium: ${stats.medium} (${stats.mediumPct}%)`}
                      />
                      <div
                        style={{ width: `${stats.lowPct}%` }}
                        className="bg-emerald-500 h-full transition-all duration-300"
                        title={`Low: ${stats.low} (${stats.lowPct}%)`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-200 dark:bg-slate-600 h-full" />
                  )}
                </div>

                {/* Magnitude Bars List */}
                <div className="mt-3 space-y-2 text-xs">
                  {/* High */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black text-rose-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        High Magnitude (10–25)
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.high} ({stats.highPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-300"
                        style={{ width: `${stats.highPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black text-amber-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Medium Magnitude (5–9)
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.medium} ({stats.mediumPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${stats.mediumPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Low */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-black text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Low Magnitude (1–4)
                      </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {stats.low} ({stats.lowPct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                        style={{ width: `${stats.lowPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actionable Supervisory Insight Banner */}
              <div
                className={cn(
                  'p-2 rounded-lg text-[10px] font-bold flex items-center gap-2 border',
                  stats.activeHigh > 0
                    ? 'bg-rose-50/80 text-rose-800 border-rose-200'
                    : 'bg-emerald-50/80 text-emerald-800 border-emerald-200',
                )}
              >
                {stats.activeHigh > 0 ? (
                  <>
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                    <span>
                      <strong>{stats.activeHigh} High-Risk item(s)</strong> require active supervisory treatment and
                      mitigation.
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>All high-magnitude items are currently mitigated or closed.</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
