'use client';

import React, { useState, useMemo } from 'react';
import type { ProcedureManual, Unit, Campus, ProcedureRevisionRequest } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  Building,
  Activity,
  FileCheck,
  Eye,
  ShieldCheck,
  Search,
  ExternalLink,
  Award,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProcedureManualsVisualizationProps {
  manuals: ProcedureManual[] | null | undefined;
  units: Unit[] | null | undefined;
  campuses: Campus[] | null | undefined;
  revisionRequests?: ProcedureRevisionRequest[] | null | undefined;
  onViewManual?: (unitId: string) => void;
  isLoading?: boolean;
}

const SHARED_ACADEMIC_ID = 'academic-shared';

const STATUS_COLORS: Record<string, { bg: string; text: string; fill: string; border: string }> = {
  Updated: {
    bg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    fill: '#10b981',
    border: 'border-emerald-500',
  },
  'Needs Revision': {
    bg: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    fill: '#f59e0b',
    border: 'border-amber-500',
  },
  'Not Submitted': {
    bg: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30',
    text: 'text-rose-600 dark:text-rose-400',
    fill: '#f43f5e',
    border: 'border-rose-500',
  },
};

export function ProcedureManualsVisualization({
  manuals,
  units,
  campuses,
  revisionRequests: _revisionRequests,
  onViewManual,
  isLoading: _isLoading = false,
}: ProcedureManualsVisualizationProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedCampus, setSelectedCampus] = useState<string>('All');
  const [expandedProcessUnitId, setExpandedProcessUnitId] = useState<string | null>(null);

  // Map manuals by ID (unitId)
  const manualMap = useMemo(() => {
    return new Map((manuals || []).map((m) => [m.id, m]));
  }, [manuals]);

  // Shared academic manual if present
  const sharedAcademicManual = useMemo(() => {
    return manualMap.get(SHARED_ACADEMIC_ID) || null;
  }, [manualMap]);

  // Campus mapping
  const campusMap = useMemo(() => {
    return new Map((campuses || []).map((c) => [c.id, c.name]));
  }, [campuses]);

  // Process unified list of units with their manuals
  const universityRegistry = useMemo(() => {
    if (!units) return [];

    return units.map((unit) => {
      let manual = manualMap.get(unit.id);
      let isUsingShared = false;

      if (!manual && unit.category === 'Academic' && sharedAcademicManual) {
        manual = sharedAcademicManual;
        isUsingShared = true;
      }

      const hasData = Boolean(manual && (manual.procedureNumber || manual.manualTitle || manual.googleDriveLink));
      const status: 'Updated' | 'Needs Revision' | 'Not Submitted' =
        (manual?.status as 'Updated' | 'Needs Revision' | 'Not Submitted') || (hasData ? 'Updated' : 'Not Submitted');

      const processCount =
        manual?.processes && manual.processes.length > 0
          ? manual.processes.length
          : manual?.numberOfProcesses !== undefined && manual.numberOfProcesses !== 0
            ? Number(manual.numberOfProcesses)
            : 0;

      const pageCount = manual?.pageCount ? Number(manual.pageCount) : 0;
      const revisionNo = manual?.revisionNumber ? `Rev ${manual.revisionNumber}` : 'Rev 00';
      const procedureNumber = manual?.procedureNumber || 'Pending Code';
      const manualTitle =
        manual?.manualTitle ||
        (unit.category === 'Academic' ? 'Academic Procedure Manual' : 'Standard Operating Procedure');

      const campusNames =
        unit.campusIds && unit.campusIds.length > 0
          ? unit.campusIds.map((cid) => campusMap.get(cid) || cid).join(', ')
          : 'Main Campus';

      return {
        unitId: unit.id,
        unitName: unit.name,
        category: unit.category || 'Support',
        campusIds: unit.campusIds || [],
        campusNames,
        manual,
        hasData,
        status,
        processCount,
        pageCount,
        revisionNo,
        procedureNumber,
        manualTitle,
        googleDriveLink: manual?.googleDriveLink,
        isUsingShared,
        copiedFromUnitName: manual?.copiedFromUnitName,
        processes: manual?.processes || [],
      };
    });
  }, [units, manualMap, sharedAcademicManual]);

  // Institutional KPI Metrics
  const metrics = useMemo(() => {
    const totalUnits = universityRegistry.length;
    if (totalUnits === 0) {
      return {
        totalUnits: 0,
        registeredCount: 0,
        updatedCount: 0,
        needsRevisionCount: 0,
        notSubmittedCount: 0,
        coveragePct: 0,
        totalProcesses: 0,
        totalPages: 0,
        totalWithDriveLink: 0,
        driveAccessibilityPct: 0,
      };
    }

    const updatedCount = universityRegistry.filter((r) => r.status === 'Updated').length;
    const needsRevisionCount = universityRegistry.filter((r) => r.status === 'Needs Revision').length;
    const notSubmittedCount = universityRegistry.filter((r) => r.status === 'Not Submitted').length;
    const registeredCount = updatedCount + needsRevisionCount;
    const coveragePct = Math.round((registeredCount / totalUnits) * 100);

    const totalProcesses = universityRegistry.reduce((acc, curr) => acc + curr.processCount, 0);
    const totalPages = universityRegistry.reduce((acc, curr) => acc + curr.pageCount, 0);
    const totalWithDriveLink = universityRegistry.filter((r) => Boolean(r.googleDriveLink)).length;
    const driveAccessibilityPct = Math.round((totalWithDriveLink / totalUnits) * 100);

    return {
      totalUnits,
      registeredCount,
      updatedCount,
      needsRevisionCount,
      notSubmittedCount,
      coveragePct,
      totalProcesses,
      totalPages,
      totalWithDriveLink,
      driveAccessibilityPct,
    };
  }, [universityRegistry]);

  // Chart 1: Status Distribution
  const statusPieData = useMemo(() => {
    return [
      { name: 'Updated (Active)', value: metrics.updatedCount, color: '#10b981', fill: 'url(#pm3d-grad-emerald)' },
      { name: 'Needs Revision', value: metrics.needsRevisionCount, color: '#f59e0b', fill: 'url(#pm3d-grad-amber)' },
      { name: 'Not Submitted', value: metrics.notSubmittedCount, color: '#f43f5e', fill: 'url(#pm3d-grad-rose)' },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  // Chart 2: Category Breakdown (Units & Processes)
  const categoryBarData = useMemo(() => {
    const categories = ['Academic', 'Administrative', 'Support', 'Research'];
    return categories.map((cat) => {
      const catUnits = universityRegistry.filter((r) => r.category === cat);
      const unitsCount = catUnits.length;
      const updatedCount = catUnits.filter((r) => r.status === 'Updated').length;
      const totalProcesses = catUnits.reduce((acc, curr) => acc + curr.processCount, 0);

      return {
        category: cat,
        unitsCount,
        updatedCount,
        totalProcesses,
        coverage: unitsCount > 0 ? Math.round((updatedCount / unitsCount) * 100) : 0,
      };
    });
  }, [universityRegistry]);

  // Chart 3: Top Units by Documented Processes
  const topProcessUnitsData = useMemo(() => {
    return universityRegistry
      .filter((r) => r.processCount > 0)
      .sort((a, b) => b.processCount - a.processCount)
      .slice(0, 8)
      .map((r) => ({
        unitName: r.unitName.length > 24 ? r.unitName.slice(0, 22) + '...' : r.unitName,
        fullName: r.unitName,
        processes: r.processCount,
        pages: r.pageCount,
        category: r.category,
      }));
  }, [universityRegistry]);

  // Chart 4: Revision Level Distribution (Maturity)
  const revisionMaturityData = useMemo(() => {
    const counts: Record<string, number> = { 'Rev 00': 0, 'Rev 01': 0, 'Rev 02': 0, 'Rev 03+': 0 };

    universityRegistry.forEach((r) => {
      if (r.status === 'Not Submitted' && !r.hasData) return;
      const rev = (r.manual?.revisionNumber || '00').padStart(2, '0');
      if (rev === '00') counts['Rev 00']++;
      else if (rev === '01') counts['Rev 01']++;
      else if (rev === '02') counts['Rev 02']++;
      else counts['Rev 03+']++;
    });

    return [
      { revision: 'Rev 00 (Initial Edition)', count: counts['Rev 00'], fill: 'url(#pm3d-grad-sky)' },
      { revision: 'Rev 01 (1st Revision)', count: counts['Rev 01'], fill: 'url(#pm3d-grad-indigo)' },
      { revision: 'Rev 02 (2nd Revision)', count: counts['Rev 02'], fill: 'url(#pm3d-grad-emerald)' },
      { revision: 'Rev 03+ (Advanced)', count: counts['Rev 03+'], fill: 'url(#pm3d-grad-amber)' },
    ];
  }, [universityRegistry]);

  // Filtered Registry List
  const filteredRegistry = useMemo(() => {
    return universityRegistry.filter((row) => {
      const matchesSearch =
        !searchTerm ||
        row.unitName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.procedureNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.manualTitle.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'All' || row.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || row.status === selectedStatus;

      let matchesCampus = true;
      if (selectedCampus !== 'All') {
        matchesCampus = row.campusIds.includes(selectedCampus);
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesCampus;
    });
  }, [universityRegistry, searchTerm, selectedCategory, selectedStatus, selectedCampus]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">
      {/* 3D Gradient Definitions for Recharts */}
      <Chart3DDefs idPrefix="pm3d" />

      {/* INSTITUTIONAL HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
        {/* Decorative background glows */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/90 text-white font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-primary/40 shadow-sm">
                Romblon State University
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-emerald-500/30">
                ISO 21001:2018 & ISO 9001:2015
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 border border-amber-500/30">
                Quality Assurance Office
              </Badge>
            </div>

            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <BookOpen className="h-7 w-7 text-primary" />
              University Procedure Manuals Visualization
            </h1>

            <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
              Official institutional intelligence on the codification, health, and distribution of standard operating
              procedures across all academic, administrative, and support units of the University.
            </p>
          </div>

          <div className="flex flex-col items-start md:items-end justify-center bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shrink-0 shadow-inner">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Institutional QMS Status
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-400">{metrics.coveragePct}%</span>
              <span className="text-xs font-bold text-slate-300">Registered</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {metrics.registeredCount} of {metrics.totalUnits} Units Codified
            </p>
          </div>
        </div>
      </div>

      {/* TOP 5 EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Units */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>University Units</span>
              <Building className="h-4 w-4 text-indigo-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">
              {metrics.totalUnits}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Total colleges, departments, and administrative divisions.
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Documented Processes */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Total SOP Processes</span>
              <Layers className="h-4 w-4 text-sky-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">
              {metrics.totalProcesses}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Standard operating procedures codified in official manuals.
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Updated Manuals */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Updated & Active</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black mt-1 text-emerald-600 dark:text-emerald-400">
              {metrics.updatedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Fully compliant and active operational manuals.</p>
          </CardContent>
        </Card>

        {/* KPI 4: Needs Revision */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Needs Revision</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
              {metrics.needsRevisionCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              Identified for review, process updates, or DRRF submission.
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: Digital Previews */}
        <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
          <div className="absolute top-0 left-0 right-0 h-1 bg-violet-500" />
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Digital Accessibility</span>
              <FileCheck className="h-4 w-4 text-violet-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-black mt-1 text-slate-900 dark:text-slate-100">
              {metrics.driveAccessibilityPct}%
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground">
              {metrics.totalWithDriveLink} of {metrics.totalUnits} manuals with cloud previews.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* VISUALIZATION CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CHART 1: STATUS DISTRIBUTION (DONUT) */}
        <Card className="lg:col-span-5 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-primary" />
                Manual Status Health Distribution
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono">
                {metrics.totalUnits} Total
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Compliance proportion across Updated, Needs Revision, and Not Submitted
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-center items-center pb-4">
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0];
                      const val = Number(data.value || 0);
                      const pct = Math.round((val / metrics.totalUnits) * 100);
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold text-foreground">{data.name}</p>
                          <p className="text-muted-foreground">
                            Count: <span className="font-black text-foreground">{val} units</span> ({pct}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    filter="url(#pm3d-elevation-shadow)"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Inner Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{metrics.coveragePct}%</span>
                <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Compliant</span>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="w-full grid grid-cols-3 gap-2 pt-2 border-t text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">Updated</span>
                </div>
                <span className="font-black text-emerald-900 dark:text-emerald-100">{metrics.updatedCount}</span>
              </div>

              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300">Needs Rev</span>
                </div>
                <span className="font-black text-amber-900 dark:text-amber-100">{metrics.needsRevisionCount}</span>
              </div>

              <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                <div className="flex items-center justify-center gap-1.5 mb-0.5">
                  <div className="h-2 w-2 rounded-full bg-rose-500" />
                  <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">Pending</span>
                </div>
                <span className="font-black text-rose-900 dark:text-rose-100">{metrics.notSubmittedCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CHART 2: CATEGORY BREAKDOWN (UNITS & PROCESSES) */}
        <Card className="lg:col-span-7 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                Procedure Manuals & Processes by Unit Category
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono">
                Academic vs Administrative
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Comparison of total units and documented operational processes per classification
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 pb-4">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryBarData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1.5">
                          <p className="font-bold text-foreground text-sm border-b pb-1">{label} Units</p>
                          <div className="space-y-1">
                            <p className="text-indigo-600 flex justify-between gap-4">
                              <span>Total Units:</span>
                              <span className="font-bold">{payload[0]?.value}</span>
                            </p>
                            <p className="text-emerald-600 flex justify-between gap-4">
                              <span>Updated Manuals:</span>
                              <span className="font-bold">{payload[1]?.value}</span>
                            </p>
                            <p className="text-amber-600 flex justify-between gap-4">
                              <span>Documented Processes:</span>
                              <span className="font-bold">{payload[2]?.value} SOPs</span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Bar
                    dataKey="unitsCount"
                    name="Total Units"
                    fill="url(#pm3d-grad-indigo)"
                    radius={[4, 4, 0, 0]}
                    filter="url(#pm3d-elevation-shadow)"
                  />
                  <Bar
                    dataKey="updatedCount"
                    name="Updated Manuals"
                    fill="url(#pm3d-grad-emerald)"
                    radius={[4, 4, 0, 0]}
                    filter="url(#pm3d-elevation-shadow)"
                  />
                  <Bar
                    dataKey="totalProcesses"
                    name="Documented Processes"
                    fill="url(#pm3d-grad-amber)"
                    radius={[4, 4, 0, 0]}
                    filter="url(#pm3d-elevation-shadow)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART 3: TOP UNITS BY DOCUMENTED PROCESSES */}
        <Card className="lg:col-span-7 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                Units with Most Documented Operational Processes
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono">
                Top Codified SOPs
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Offices leading in detailed operational workflow documentation and process maps
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 pb-4">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topProcessUnitsData}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="unitName" type="category" width={130} tick={{ fontSize: 10, fontWeight: 600 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold text-foreground">{item.fullName}</p>
                          <p className="text-muted-foreground">Category: {item.category}</p>
                          <p className="text-emerald-600 font-bold">
                            Processes: <span className="font-black text-foreground">{item.processes} SOPs</span>
                          </p>
                          {item.pages > 0 && <p className="text-muted-foreground">Page Count: {item.pages} pages</p>}
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="processes"
                    name="Number of Processes"
                    fill="url(#pm3d-grad-emerald)"
                    radius={[0, 4, 4, 0]}
                    filter="url(#pm3d-elevation-shadow)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* CHART 4: REVISION LEVEL MATURITY */}
        <Card className="lg:col-span-5 shadow-sm border-border/60 flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Continuous Improvement (Revision Maturity)
              </CardTitle>
              <Badge variant="outline" className="text-[9px] font-mono">
                QMS Evolution
              </Badge>
            </div>
            <CardDescription className="text-[11px]">
              Distribution of manual revisions reflecting ongoing refinement and audit updates
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 pb-4">
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revisionMaturityData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                  <XAxis
                    dataKey="revision"
                    tick={{ fontSize: 10, fontWeight: 600 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div className="rounded-lg border bg-background p-2.5 shadow-md text-xs space-y-1">
                          <p className="font-bold text-foreground">{label}</p>
                          <p className="text-muted-foreground">
                            Units: <span className="font-black text-foreground">{payload[0]?.value} manuals</span>
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" name="Manuals Count" radius={[4, 4, 0, 0]} filter="url(#pm3d-elevation-shadow)">
                    {revisionMaturityData.map((entry, index) => (
                      <Cell key={`rev-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* INSTITUTIONAL QMS INFORMATION CARDS (FOR EVERYONE) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/60 bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-indigo-950/30">
          <CardHeader className="pb-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-1">
              <BookOpen className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              What is the Procedure Manual?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            The Procedure Manual is the official codified repository of Standard Operating Procedures (SOPs) for each
            unit of Romblon State University. It establishes standardized step-by-step workflows for instructional,
            administrative, and support services.
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-emerald-950/30">
          <CardHeader className="pb-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-1">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              ISO 21001 & ISO 9001 Alignment
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Compliant with ISO 21001:2018 (EOMS) Clause 4.4 and Clause 7.5 (Documented Information). Codified manuals
            ensure consistent service delivery to students, faculty, and stakeholders while meeting statutory and
            regulatory mandates.
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-gradient-to-br from-amber-50/50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-900/80 dark:to-amber-950/30">
          <CardHeader className="pb-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 mb-1">
              <Activity className="h-4 w-4" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Revision & DRRF Process
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Operating units continuously enhance procedures via the Document Review and Revision Form (DRRF). Revision
            proposals undergo review by the QAO, validation, and presidential approval before official registration in
            the QMS.
          </CardContent>
        </Card>
      </div>

      {/* SEARCHABLE & FILTERABLE UNIVERSITY PROCEDURE MANUAL DIRECTORY */}
      <Card className="shadow-sm border-border/60">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
                <Building className="h-5 w-5 text-primary" />
                University Unit Procedure Manuals Directory
              </CardTitle>
              <CardDescription className="text-xs font-medium">
                Browse official procedure manuals, control numbers, documented processes, and revision statuses across
                all units.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs">
                Showing {filteredRegistry.length} of {universityRegistry.length} Units
              </Badge>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search unit or procedure..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 rounded-md border border-input bg-white dark:bg-slate-900 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="All">All Categories</option>
              <option value="Academic">Academic Units</option>
              <option value="Administrative">Administrative Units</option>
              <option value="Support">Support Services</option>
              <option value="Research">Research Units</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 rounded-md border border-input bg-white dark:bg-slate-900 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="All">All Statuses</option>
              <option value="Updated">Updated (Active)</option>
              <option value="Needs Revision">Needs Revision</option>
              <option value="Not Submitted">Not Submitted / Pending</option>
            </select>

            {campuses && campuses.length > 0 && (
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="h-8 rounded-md border border-input bg-white dark:bg-slate-900 px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="All">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                  <TableHead className="w-[30%]">Unit Name & Manual Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Control Number</TableHead>
                  <TableHead className="text-center">SOP Processes</TableHead>
                  <TableHead>Revision / Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistry.length > 0 ? (
                  filteredRegistry.map((row) => {
                    const statusConfig = STATUS_COLORS[row.status] || STATUS_COLORS['Not Submitted'];
                    const isExpanded = expandedProcessUnitId === row.unitId;

                    return (
                      <React.Fragment key={row.unitId}>
                        <TableRow className="hover:bg-muted/20 transition-colors text-xs">
                          {/* Unit Name & Title */}
                          <TableCell className="font-medium">
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                <span>{row.unitName}</span>
                                {row.isUsingShared && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] font-mono uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200"
                                  >
                                    Shared Academic
                                  </Badge>
                                )}
                                {row.copiedFromUnitName && (
                                  <Badge
                                    variant="outline"
                                    className="text-[8px] font-mono uppercase bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200"
                                  >
                                    Copied from {row.copiedFromUnitName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">{row.manualTitle}</p>
                            </div>
                          </TableCell>

                          {/* Category */}
                          <TableCell>
                            <div className="space-y-0.5">
                              <Badge
                                variant="outline"
                                className="text-[9px] font-bold uppercase tracking-wider font-mono border-primary/20 bg-primary/5 text-primary"
                              >
                                {row.category}
                              </Badge>
                              {row.campusNames && (
                                <p
                                  className="text-[9px] text-muted-foreground truncate max-w-[120px]"
                                  title={row.campusNames}
                                >
                                  {row.campusNames}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* Control Number */}
                          <TableCell className="font-mono text-[11px] text-muted-foreground font-semibold">
                            {row.procedureNumber}
                          </TableCell>

                          {/* SOP Processes */}
                          <TableCell className="text-center">
                            {row.processCount > 0 ? (
                              <button
                                onClick={() => setExpandedProcessUnitId(isExpanded ? null : row.unitId)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer"
                                title="Click to view processes list"
                              >
                                <Layers className="h-3 w-3" />
                                {row.processCount} Processes
                              </button>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">None codified</span>
                            )}
                          </TableCell>

                          {/* Revision / Date */}
                          <TableCell>
                            <div className="space-y-0.5 text-[11px]">
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {row.revisionNo}
                              </span>
                              {row.manual?.revisionDate && (
                                <p className="text-[10px] text-muted-foreground">{row.manual.revisionDate}</p>
                              )}
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border shadow-none',
                                statusConfig.bg,
                              )}
                            >
                              {row.status}
                            </Badge>
                          </TableCell>

                          {/* Action */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {row.googleDriveLink && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => window.open(row.googleDriveLink, '_blank')}
                                  title="Open Drive Preview"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {onViewManual && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-wider gap-1 border-primary/30 text-primary hover:bg-primary/5 shadow-xs"
                                  onClick={() => onViewManual(row.unitId)}
                                >
                                  <Eye className="h-3 w-3" />
                                  <span className="hidden sm:inline">View Manual</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expandable Process List Sub-row */}
                        {isExpanded && row.processes && row.processes.length > 0 && (
                          <TableRow className="bg-muted/10 border-b border-indigo-100 dark:border-indigo-950">
                            <TableCell colSpan={7} className="p-3 pl-8">
                              <div className="bg-background rounded-lg border border-border/80 p-3 shadow-xs space-y-2">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" />
                                    Codified Processes for {row.unitName} ({row.processes.length} Total)
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 px-2 text-[9px] text-muted-foreground"
                                    onClick={() => setExpandedProcessUnitId(null)}
                                  >
                                    Close
                                  </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                  {row.processes.map((proc, pIdx) => (
                                    <div
                                      key={pIdx}
                                      className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50 text-[11px]"
                                    >
                                      <Badge
                                        variant="outline"
                                        className="font-mono text-[9px] font-bold shrink-0 bg-primary/5 text-primary border-primary/20"
                                      >
                                        {proc.processNumber}
                                      </Badge>
                                      <span className="font-medium text-slate-800 dark:text-slate-200 line-clamp-2">
                                        {proc.processTitle}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-xs text-muted-foreground italic">
                      No procedure manuals found matching the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
