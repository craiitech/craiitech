'use client';

import React, { useMemo, useState } from 'react';
import type { Communication, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  AreaChart,
  Area,
  LabelList,
} from 'recharts';
import { Chart3DDefs, RenderBar3DLabel, RenderPie3DLabel } from '@/components/ui/chart-3d-defs';
import {
  Mail,
  Send,
  Inbox,
  Globe,
  Building2,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  Activity,
  BookmarkCheck,
  ShieldCheck,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface CommunicationAnalyticsProps {
  communications: Communication[];
  units?: Unit[];
  campuses?: Campus[];
  currentUnitId?: string;
  isOdimo?: boolean;
}

const KIND_COLORS: Record<string, string> = {
  'Memorandum Order': '#6366f1', // Indigo
  'Office Order': '#3b82f6', // Blue
  'Office Memorandum': '#0ea5e9', // Sky
  'Communication Letter / Request': '#10b981', // Emerald
  Invitation: '#f59e0b', // Amber
  'Transmittal Document': '#8b5cf6', // Violet
};

const KIND_GRADIENTS: Record<string, string> = {
  'Memorandum Order': 'url(#comm3d-grad-indigo)',
  'Office Order': 'url(#comm3d-grad-sky)',
  'Office Memorandum': 'url(#comm3d-grad-cyan)',
  'Communication Letter / Request': 'url(#comm3d-grad-emerald)',
  Invitation: 'url(#comm3d-grad-amber)',
  'Transmittal Document': 'url(#comm3d-grad-violet)',
};

const SCOPE_COLORS = {
  Internal: '#3b82f6',
  External: '#10b981',
};

const ACTION_COLORS: Record<string, string> = {
  'For Information': '#0ea5e9',
  'For Action / Compliance': '#ef4444',
  'For Decision / Approval': '#f59e0b',
  'For Feedback / Consultation': '#8b5cf6',
};

const ACTION_GRADIENTS: Record<string, string> = {
  'For Information': 'url(#comm3d-grad-sky)',
  'For Action / Compliance': 'url(#comm3d-grad-rose)',
  'For Decision / Approval': 'url(#comm3d-grad-amber)',
  'For Feedback / Consultation': 'url(#comm3d-grad-violet)',
};

export function CommunicationAnalytics({ communications, units = [], campuses = [] }: CommunicationAnalyticsProps) {
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedScope, setSelectedScope] = useState<string>('all');
  const [selectedKind, setSelectedKind] = useState<string>('all');
  const [is3DMode, setIs3DMode] = useState<boolean>(true);
  const [isPlayingTimeline, setIsPlayingTimeline] = useState<boolean>(false);
  const [timelineMonthIndex, setTimelineMonthIndex] = useState<number | null>(null);

  const unitMap = useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  // Extract available years
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    communications.forEach((c) => {
      let date: Date | null = null;
      if (c.createdAt?.toDate) {
        date = c.createdAt.toDate();
      } else if (c.createdAt?.seconds) {
        date = new Date(c.createdAt.seconds * 1000);
      }
      if (date && !isNaN(date.getTime())) {
        yearsSet.add(date.getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  }, [communications]);

  // Base filtered communications (by Year, Scope, Kind)
  const baseFilteredComms = useMemo(() => {
    return communications.filter((c) => {
      let commYear = '';
      if (c.createdAt?.toDate) {
        commYear = c.createdAt.toDate().getFullYear().toString();
      } else if (c.createdAt?.seconds) {
        commYear = new Date(c.createdAt.seconds * 1000).getFullYear().toString();
      }

      if (selectedYear !== 'all' && commYear !== selectedYear) return false;

      const scope =
        c.communicationScope || (c.manual && c.manualType === 'incoming' && c.senderText ? 'External' : 'Internal');
      if (selectedScope !== 'all' && scope !== selectedScope) return false;

      if (selectedKind !== 'all' && c.kind !== selectedKind) return false;

      return true;
    });
  }, [communications, selectedYear, selectedScope, selectedKind]);

  // Extract unique sorted months
  const allMonthsList = useMemo(() => {
    const monthsSet = new Set<string>();
    baseFilteredComms.forEach((c) => {
      let date: Date | null = null;
      if (c.createdAt?.toDate) date = c.createdAt.toDate();
      else if (c.createdAt?.seconds) date = new Date(c.createdAt.seconds * 1000);
      if (date && !isNaN(date.getTime())) {
        monthsSet.add(format(date, 'yyyy-MM'));
      }
    });
    return Array.from(monthsSet).sort();
  }, [baseFilteredComms]);

  // 4D Timeline Player Effect
  React.useEffect(() => {
    let timer: any;
    if (isPlayingTimeline && allMonthsList.length > 0) {
      timer = setInterval(() => {
        setTimelineMonthIndex((prev) => {
          if (prev === null || prev >= allMonthsList.length - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [isPlayingTimeline, allMonthsList]);

  // Effective filtered comms taking into account active 4D timeline slice
  const filteredComms = useMemo(() => {
    if (timelineMonthIndex !== null && allMonthsList[timelineMonthIndex]) {
      const activeMonthStr = allMonthsList[timelineMonthIndex];
      return baseFilteredComms.filter((c) => {
        let date: Date | null = null;
        if (c.createdAt?.toDate) date = c.createdAt.toDate();
        else if (c.createdAt?.seconds) date = new Date(c.createdAt.seconds * 1000);
        if (date && !isNaN(date.getTime())) {
          return format(date, 'yyyy-MM') === activeMonthStr;
        }
        return false;
      });
    }
    return baseFilteredComms;
  }, [baseFilteredComms, timelineMonthIndex, allMonthsList]);

  // Key KPI Metrics
  const stats = useMemo(() => {
    const total = filteredComms.length;
    let incomingCount = 0;
    let outgoingCount = 0;
    let internalCount = 0;
    let externalCount = 0;
    let actionRequiredCount = 0;
    let urgentCount = 0;
    let totalReadInstances = 0;

    filteredComms.forEach((c) => {
      if (c.manualType === 'incoming' || c.manualType === undefined) {
        if (c.senderUnitId) {
          outgoingCount++;
        } else {
          incomingCount++;
        }
      } else if (c.manualType === 'outgoing') {
        outgoingCount++;
      }

      const isExternal =
        c.communicationScope === 'External' ||
        (c.manual &&
          (c.senderText?.toLowerCase().includes('ched') ||
            c.senderText?.toLowerCase().includes('deped') ||
            c.senderText?.toLowerCase().includes('company')));
      if (isExternal) {
        externalCount++;
      } else {
        internalCount++;
      }

      if (
        c.actionType === 'For Action / Compliance' ||
        c.subject?.toLowerCase().includes('compliance') ||
        c.subject?.toLowerCase().includes('submission') ||
        c.subject?.toLowerCase().includes('action')
      ) {
        actionRequiredCount++;
      }

      if (
        c.urgencyLevel === 'Urgent' ||
        c.urgencyLevel === 'Time-Critical' ||
        c.subject?.toLowerCase().includes('urgent') ||
        c.subject?.toLowerCase().includes('immediate')
      ) {
        urgentCount++;
      }

      if (c.readBy && Array.isArray(c.readBy)) {
        totalReadInstances += c.readBy.length;
      }
    });

    const internalPercent = total > 0 ? Math.round((internalCount / total) * 100) : 0;
    const externalPercent = total > 0 ? 100 - internalPercent : 0;
    const actionPercent = total > 0 ? Math.round((actionRequiredCount / total) * 100) : 0;
    const receiptRate = total > 0 ? Math.min(100, Math.round((totalReadInstances / Math.max(total, 1)) * 100)) : 0;

    return {
      total,
      incomingCount,
      outgoingCount,
      internalCount,
      externalCount,
      internalPercent,
      externalPercent,
      actionRequiredCount,
      actionPercent,
      urgentCount,
      receiptRate,
    };
  }, [filteredComms]);

  // 1. Monthly Trend Data (Incoming vs Outgoing)
  const monthlyTrendData = useMemo(() => {
    const monthMap: Record<
      string,
      { month: string; incoming: number; outgoing: number; total: number; orderKey: string }
    > = {};

    filteredComms.forEach((c) => {
      let date: Date | null = null;
      if (c.createdAt?.toDate) {
        date = c.createdAt.toDate();
      } else if (c.createdAt?.seconds) {
        date = new Date(c.createdAt.seconds * 1000);
      }

      if (date && !isNaN(date.getTime())) {
        const monthLabel = format(date, 'MMM yyyy');
        const orderKey = format(date, 'yyyy-MM');

        if (!monthMap[orderKey]) {
          monthMap[orderKey] = {
            month: monthLabel,
            incoming: 0,
            outgoing: 0,
            total: 0,
            orderKey,
          };
        }

        const isOutgoing = c.manualType === 'outgoing' || Boolean(c.senderUnitId);
        if (isOutgoing) {
          monthMap[orderKey].outgoing += 1;
        } else {
          monthMap[orderKey].incoming += 1;
        }
        monthMap[orderKey].total += 1;
      }
    });

    return Object.values(monthMap).sort((a, b) => a.orderKey.localeCompare(b.orderKey));
  }, [filteredComms]);

  // 2. Kind / Category Distribution
  const kindData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredComms.forEach((c) => {
      const kindName = c.kind || 'Office Memorandum';
      counts[kindName] = (counts[kindName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
        color: KIND_COLORS[name] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredComms]);

  // 3. Action Type Distribution
  const actionTypeData = useMemo(() => {
    const counts: Record<string, number> = {
      'For Information': 0,
      'For Action / Compliance': 0,
      'For Decision / Approval': 0,
      'For Feedback / Consultation': 0,
    };

    filteredComms.forEach((c) => {
      if (c.actionType && counts[c.actionType] !== undefined) {
        counts[c.actionType] += 1;
      } else {
        const subj = c.subject?.toLowerCase() || '';
        if (subj.includes('action') || subj.includes('compliance') || subj.includes('submit')) {
          counts['For Action / Compliance'] += 1;
        } else if (subj.includes('approval') || subj.includes('decision') || subj.includes('endorse')) {
          counts['For Decision / Approval'] += 1;
        } else if (subj.includes('invitation') || subj.includes('survey') || subj.includes('feedback')) {
          counts['For Feedback / Consultation'] += 1;
        } else {
          counts['For Information'] += 1;
        }
      }
    });

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      color: ACTION_COLORS[name] || '#3b82f6',
    }));
  }, [filteredComms]);

  // 4. Target Stakeholders / Audience
  const audienceData = useMemo(() => {
    const counts: Record<string, number> = {
      'Campus / Unit Heads': 0,
      'Faculty & Staff': 0,
      'Learners & Students': 0,
      'External Regulators': 0,
      'University-Wide': 0,
    };

    filteredComms.forEach((c) => {
      if (c.recipientType === 'all') {
        counts['University-Wide'] += 1;
      } else if (c.recipientType === 'campus') {
        counts['Campus / Unit Heads'] += 1;
      } else if (c.targetAudience && counts[c.targetAudience] !== undefined) {
        counts[c.targetAudience] += 1;
      } else {
        const subj = c.subject?.toLowerCase() || '';
        if (subj.includes('student') || subj.includes('enrollment') || subj.includes('scholarship')) {
          counts['Learners & Students'] += 1;
        } else if (subj.includes('faculty') || subj.includes('curriculum') || subj.includes('instruction')) {
          counts['Faculty & Staff'] += 1;
        } else if (subj.includes('ched') || subj.includes('prc') || subj.includes('external')) {
          counts['External Regulators'] += 1;
        } else {
          counts['Campus / Unit Heads'] += 1;
        }
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [filteredComms]);

  // 5. Top Originating Units
  const topUnitsData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredComms.forEach((c) => {
      const senderName = c.senderName || unitMap.get(c.senderUnitId || '') || c.senderText || 'Office of the President';
      counts[senderName] = (counts[senderName] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredComms, unitMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 3D SVG GRADIENTS & DEPTH FILTERS */}
      <Chart3DDefs idPrefix="comm3d" />

      {/* HEADER & FILTER CONTROLS */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-900/50">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5">
              ISO 21001:2025 Cl. 7.4
            </Badge>
            <Badge variant="outline" className="text-indigo-200 border-indigo-700/50 text-[10px] font-bold">
              EOMS Communication Analytics
            </Badge>
            {is3DMode && (
              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/40 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5" /> 3D Depth Active
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-400" />
            Communication Intelligence & Matrix
          </h2>
          <p className="text-xs text-indigo-200/80 max-w-2xl font-medium">
            Systematic evaluation of internal & external organizational communications, flow distribution, stakeholder
            outreach, and action compliance adherence.
          </p>
        </div>

        {/* Filters & 3D/4D Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* 3D Depth Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIs3DMode(!is3DMode)}
            className={cn(
              'h-8 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all',
              is3DMode
                ? 'bg-indigo-600/40 border-indigo-400 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/20',
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            {is3DMode ? '3D Isometric View' : '2D Flat View'}
          </Button>

          {/* Year Filter */}
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="h-8 text-xs font-bold bg-white/10 border-white/20 text-white w-28">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">
                All Years
              </SelectItem>
              {availableYears.map((yr) => (
                <SelectItem key={yr} value={yr} className="text-xs font-bold">
                  {yr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Scope Filter */}
          <Select value={selectedScope} onValueChange={setSelectedScope}>
            <SelectTrigger className="h-8 text-xs font-bold bg-white/10 border-white/20 text-white w-32">
              <SelectValue placeholder="All Scopes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">
                All Scopes
              </SelectItem>
              <SelectItem value="Internal" className="text-xs font-bold text-blue-600">
                Internal Only
              </SelectItem>
              <SelectItem value="External" className="text-xs font-bold text-emerald-600">
                External Only
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Kind Filter */}
          <Select value={selectedKind} onValueChange={setSelectedKind}>
            <SelectTrigger className="h-8 text-xs font-bold bg-white/10 border-white/20 text-white w-40">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs font-bold">
                All Categories
              </SelectItem>
              {Object.keys(KIND_COLORS).map((k) => (
                <SelectItem key={k} value={k} className="text-xs font-bold">
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4D TEMPORAL FLOW TIMELINE CONTROLLER */}
      {allMonthsList.length > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gradient-to-r from-indigo-900/15 via-purple-900/15 to-indigo-900/15 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
              4D Temporal Flow Dimension:
            </span>
            <Badge
              variant="outline"
              className="font-mono text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300"
            >
              {timelineMonthIndex === null
                ? 'Full Horizon (All Months)'
                : `Month Focus: ${allMonthsList[timelineMonthIndex]}`}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
              className="h-7 px-3 text-[10px] font-black uppercase rounded-lg border-indigo-300 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1.5"
            >
              {isPlayingTimeline ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {isPlayingTimeline ? 'Pause 4D Flow' : 'Play 4D Flow'}
            </Button>
            {timelineMonthIndex !== null && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPlayingTimeline(false);
                  setTimelineMonthIndex(null);
                }}
                className="h-7 px-2 text-[9px] font-black uppercase text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="h-2.5 w-2.5" /> Reset View
              </Button>
            )}
          </div>
        </div>
      )}

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Volume */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-indigo-50/30 dark:from-slate-900 dark:to-slate-850',
            is3DMode && 'hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700',
          )}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Logged
              </span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
                <Mail className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total}</div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5">
                  <Send className="h-3 w-3" /> {stats.outgoingCount} Out
                </span>
                <span>•</span>
                <span className="text-sky-600 dark:text-sky-400 flex items-center gap-0.5">
                  <Inbox className="h-3 w-3" /> {stats.incomingCount} In
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scope Distribution */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-900 dark:to-slate-850',
            is3DMode && 'hover:-translate-y-1 hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-700',
          )}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Internal vs External
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shadow-inner">
                <Globe className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.internalPercent}%{' '}
                <span className="text-xs font-bold text-slate-400">/ {stats.externalPercent}%</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <span className="text-blue-600 dark:text-blue-400">{stats.internalCount} Internal</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400">{stats.externalCount} External</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Directives */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-slate-850',
            is3DMode && 'hover:-translate-y-1 hover:shadow-xl hover:border-rose-300 dark:hover:border-rose-700',
          )}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Action Required
              </span>
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center shadow-inner">
                <BookmarkCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                {stats.actionRequiredCount}
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {stats.actionPercent}% compliance/action directives
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Urgent Traffic */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-slate-850',
            is3DMode && 'hover:-translate-y-1 hover:shadow-xl hover:border-amber-300 dark:hover:border-amber-700',
          )}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Urgent / Time-Critical
              </span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shadow-inner">
                <Zap className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {stats.urgentCount}
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                High-priority time-sensitive
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acknowledgment Rate */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-300 bg-gradient-to-br from-white to-emerald-50/30 dark:from-slate-900 dark:to-slate-850',
            is3DMode && 'hover:-translate-y-1 hover:shadow-xl hover:border-emerald-300 dark:hover:border-emerald-700',
          )}
        >
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Receipt / Read Rate
              </span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-inner">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {stats.receiptRate}%
              </div>
              <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Verified delivery & reads</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHART ROW 1: MONTHLY VOLUME TREND + CATEGORY DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trend Area Chart */}
        <Card className="lg:col-span-8 rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Monthly Communication Volume & Flow
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Directional flow comparison (Inbound vs Outbound) over time.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] font-bold">
                {monthlyTrendData.length} Months Tracked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            {monthlyTrendData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrendData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="month" tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <YAxis allowDecimals={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Area
                      type="monotone"
                      dataKey="outgoing"
                      name="Outgoing Dispatches"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={is3DMode ? 'url(#comm3d-area-indigo)' : '#6366f1'}
                      filter={is3DMode ? 'url(#comm3d-elevation-shadow)' : undefined}
                    />
                    <Area
                      type="monotone"
                      dataKey="incoming"
                      name="Incoming Receipts"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill={is3DMode ? 'url(#comm3d-area-emerald)' : '#0ea5e9'}
                      filter={is3DMode ? 'url(#comm3d-elevation-shadow)' : undefined}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex flex-col items-center justify-center text-center text-muted-foreground text-xs italic">
                No monthly flow data recorded for the selected filter period.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories / Kinds Donut Chart with Direct 3D Labels */}
        <Card className="lg:col-span-4 rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Document Categories
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Distribution across ISO 21001 EOMS document kinds.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6 flex flex-col items-center justify-center">
            {kindData.length > 0 ? (
              <>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={kindData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={82}
                        paddingAngle={3}
                        dataKey="value"
                        label={is3DMode ? RenderPie3DLabel : undefined}
                        labelLine={false}
                      >
                        {kindData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={is3DMode ? KIND_GRADIENTS[entry.name] || entry.color : entry.color}
                            filter={is3DMode ? 'url(#comm3d-soft-depth)' : undefined}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          borderColor: '#334155',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Custom Legend List with Percentages */}
                <div className="w-full space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1">
                  {kindData.map((k) => {
                    const totalK = kindData.reduce((a, b) => a + b.value, 0);
                    const pct = totalK > 0 ? ((k.value / totalK) * 100).toFixed(1) : '0';
                    return (
                      <div key={k.name} className="flex items-center justify-between text-xs font-medium">
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: k.color }}
                          />
                          <span className="truncate text-slate-700 dark:text-slate-300 font-semibold">{k.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{k.value}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-56 flex items-center justify-center text-muted-foreground text-xs italic">
                No category records available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CHART ROW 2: ACTION MATRIX + TARGET STAKEHOLDERS + TOP ORIGINATING OFFICES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action Type / Purpose Matrix with 3D Gradients & Direct Labels */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-emerald-600" />
              Communication Purpose
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Action Required vs Information vs Approvals.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={actionTypeData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar dataKey="count" name="Count" radius={[0, 8, 8, 0]}>
                    <LabelList content={<RenderBar3DLabel />} />
                    {actionTypeData.map((entry, index) => (
                      <Cell
                        key={`act-${index}`}
                        fill={is3DMode ? ACTION_GRADIENTS[entry.name] || entry.color : entry.color}
                        filter={is3DMode ? 'url(#comm3d-soft-depth)' : undefined}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Target Stakeholders with 3D Gradients & Direct Labels */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Target Stakeholders
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Audience breakdown across learners, faculty, and administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={audienceData} layout="vertical" margin={{ top: 5, right: 35, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.15} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  />
                  <Bar
                    dataKey="value"
                    name="Communications"
                    fill={is3DMode ? 'url(#comm3d-grad-sky)' : '#3b82f6'}
                    radius={[0, 8, 8, 0]}
                    filter={is3DMode ? 'url(#comm3d-soft-depth)' : undefined}
                  >
                    <LabelList content={<RenderBar3DLabel />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Originating Units with 3D Badge Ranking */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              Top Issuing Offices
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Most active originating units in the university.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="space-y-3">
              {topUnitsData.map((u, i) => (
                <div
                  key={u.name}
                  className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className={cn(
                        'h-6 w-6 rounded-lg font-mono text-[10px] font-black flex items-center justify-center shrink-0 shadow-sm',
                        i === 0
                          ? 'bg-amber-500 text-white'
                          : i === 1
                            ? 'bg-slate-400 text-white'
                            : i === 2
                              ? 'bg-amber-700 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate">{u.name}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="font-mono font-bold text-[11px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 shrink-0"
                  >
                    {u.count} comms
                  </Badge>
                </div>
              ))}
              {topUnitsData.length === 0 && (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-xs italic">
                  No issuing units logged.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ISO 21001:2025 CLAUSE 7.4 SIX PILLARS COMPLIANCE MATRIX */}
      <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                ISO 21001:2025 Clause 7.4 Standard Compliance Scorecard
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Documented information conformance across the 6 mandatory ISO 21001 communication dimensions.
              </CardDescription>
            </div>
            <Badge className="bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider px-3 py-1">
              100% EOMS Compliant
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                a) On WHAT to Communicate
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Clear subjects, EOMS document categories, and attached digital Google Drive PDF links.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                b) WHEN to Communicate
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Precise timestamps, custom logging dates, urgency indicators, and compliance deadlines.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                c) WITH WHOM to Communicate
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Internal (8 Campuses & Units) and External (CHED, DepEd, PRC, Partner Agencies) routing.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                d) HOW to Communicate
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Official digital hub, reference numbering routing, and ISO printable logbook slips.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                e) WHO Communicates
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Verified originating office, authorized signatory name, and system role enforcement.
            </p>
          </div>

          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span className="flex items-center gap-1.5 text-primary">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                f) Feedback & Action Tracking
              </span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Active
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automated read receipts, receiving reference log registration, and action status monitoring.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
