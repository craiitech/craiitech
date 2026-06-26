'use client';

import { useMemo } from 'react';
import type { AcademicProgram, ProgramComplianceRecord, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';
import { GraduationCap, ShieldCheck, AlertTriangle, TrendingUp, Award, ExternalLink, School, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChedProgramsTabProps {
  academicPrograms: AcademicProgram[];
  allCompliances: ProgramComplianceRecord[];
  campuses: Campus[];
  selectedYear: number;
}

const COPC_COLORS: Record<string, string> = {
  'With COPC': '#10b981',
  'In Progress': '#f59e0b',
  'No COPC': '#ef4444',
};

const LEVEL_COLORS = ['#6366f1', '#f59e0b', '#10b981'];

export function ChedProgramsTab({ academicPrograms, allCompliances, campuses, selectedYear }: ChedProgramsTabProps) {
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const activePrograms = useMemo(() => academicPrograms.filter(p => p.isActive), [academicPrograms]);

  // Build a compliance map: programId → latest compliance record
  const complianceMap = useMemo(() => {
    const map = new Map<string, ProgramComplianceRecord>();
    allCompliances.forEach(c => {
      const existing = map.get(c.programId);
      if (!existing || c.academicYear > existing.academicYear) {
        map.set(c.programId, c);
      }
    });
    return map;
  }, [allCompliances]);

  // COPC Status breakdown
  const copcStats = useMemo(() => {
    const counts = { 'With COPC': 0, 'In Progress': 0, 'No COPC': 0 };
    activePrograms.forEach(p => {
      const comp = complianceMap.get(p.id);
      const status = comp?.ched?.copcStatus || 'No COPC';
      counts[status as keyof typeof counts] = (counts[status as keyof typeof counts] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activePrograms, complianceMap]);

  // Programs by Level × COPC status
  const byLevel = useMemo(() => {
    const levels = ['Undergraduate', 'Graduate', 'TVET'] as const;
    return levels.map(level => {
      const progs = activePrograms.filter(p => p.level === level);
      const withCopc = progs.filter(p => complianceMap.get(p.id)?.ched?.copcStatus === 'With COPC').length;
      const inProgress = progs.filter(p => complianceMap.get(p.id)?.ched?.copcStatus === 'In Progress').length;
      const noCopc = progs.filter(p => {
        const s = complianceMap.get(p.id)?.ched?.copcStatus;
        return !s || s === 'No COPC';
      }).length;
      return { level, 'With COPC': withCopc, 'In Progress': inProgress, 'No COPC': noCopc, total: progs.length };
    }).filter(d => d.total > 0);
  }, [activePrograms, complianceMap]);

  // Programs by Campus × COPC status
  const byCampus = useMemo(() => {
    const campusData: Record<string, { withCopc: number; inProgress: number; noCopc: number }> = {};
    activePrograms.forEach(p => {
      const campusName = campusMap.get(p.campusId) || 'Unknown';
      if (!campusData[campusName]) campusData[campusName] = { withCopc: 0, inProgress: 0, noCopc: 0 };
      const status = complianceMap.get(p.id)?.ched?.copcStatus || 'No COPC';
      if (status === 'With COPC') campusData[campusName].withCopc++;
      else if (status === 'In Progress') campusData[campusName].inProgress++;
      else campusData[campusName].noCopc++;
    });
    return Object.entries(campusData)
      .map(([campus, d]) => ({ campus: campus.replace('Campus', '').trim(), ...d, 'With COPC': d.withCopc, 'In Progress': d.inProgress, 'No COPC': d.noCopc }))
      .sort((a, b) => b['No COPC'] - a['No COPC']);
  }, [activePrograms, complianceMap, campusMap]);

  // RQAT visit analysis
  const rqatData = useMemo(() => {
    const now = new Date();
    return activePrograms.map(p => {
      const comp = complianceMap.get(p.id);
      const visits = comp?.ched?.rqatVisits || [];
      const lastVisit = visits.length > 0 ? visits[visits.length - 1] : null;
      const lastDate = lastVisit ? new Date(lastVisit.date) : null;
      const yearsAgo = lastDate ? (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 365) : null;
      const ncCount = visits.reduce((sum, v) => sum + (v.nonCompliances ? 1 : 0), 0);
      return {
        id: p.id,
        name: p.abbreviation || p.name,
        fullName: p.name,
        campus: campusMap.get(p.campusId) || 'Unknown',
        lastVisit: lastDate ? lastDate.toLocaleDateString() : 'Never',
        yearsAgo,
        ncCount,
        isOverdue: !lastDate || yearsAgo! > 3,
        copcStatus: comp?.ched?.copcStatus || 'No COPC',
      };
    }).sort((a, b) => (b.yearsAgo ?? 999) - (a.yearsAgo ?? 999));
  }, [activePrograms, complianceMap, campusMap]);

  // Board exam performance
  const boardPerfData = useMemo(() => {
    return activePrograms
      .filter(p => p.isBoardProgram)
      .map(p => {
        const comp = complianceMap.get(p.id);
        const exams = comp?.boardPerformance || [];
        const latest = exams.length > 0 ? exams[exams.length - 1] : null;
        return {
          name: p.abbreviation || p.name,
          passRate: latest?.firstTakersPassRate || 0,
          national: latest?.nationalPassingRate || 0,
        };
      })
      .filter(d => d.passRate > 0 || d.national > 0)
      .sort((a, b) => b.passRate - a.passRate);
  }, [activePrograms, complianceMap]);

  // KPI cards
  const totalActive = activePrograms.length;
  const withCopcCount = copcStats.find(s => s.name === 'With COPC')?.value || 0;
  const noCopcCount = copcStats.find(s => s.name === 'No COPC')?.value || 0;
  const boardCount = activePrograms.filter(p => p.isBoardProgram).length;
  const overdueRqat = rqatData.filter(d => d.isOverdue).length;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-xs">
        <p className="font-black uppercase mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Programs', value: totalActive, icon: <GraduationCap className="h-5 w-5" />, color: 'text-primary', bg: 'bg-primary/5' },
          { label: 'With COPC', value: withCopcCount, icon: <ShieldCheck className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'No COPC / At Risk', value: noCopcCount, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Board Programs', value: boardCount, icon: <Award className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map(({ label, value, icon, color, bg }) => (
          <Card key={label} className="bg-white border-primary/10 shadow-md">
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
                <div className={cn('p-2 rounded-lg', bg, color)}>{icon}</div>
              </div>
              <div className={cn('text-3xl font-black tabular-nums', color)}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Row 1: Donut + Level Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COPC Status Donut */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">COPC Compliance Status</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              CHED Certificate of Program Compliance distribution across all active programs
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={copcStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {copcStats.map((entry) => (
                    <Cell key={entry.name} fill={COPC_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {copcStats.map(s => (
                <div key={s.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: COPC_COLORS[s.name] }} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{s.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Programs by Level Grouped Bar */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Programs by Level & COPC Status</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Compliance gaps by academic level — identifies which tier needs most attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byLevel} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="level" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                {Object.keys(COPC_COLORS).map((key) => (
                  <Bar key={key} dataKey={key} fill={COPC_COLORS[key]} radius={[4, 4, 0, 0]} maxBarSize={28}>
                    <LabelList dataKey={key} position="top" style={{ fontSize: 9, fontWeight: 700 }} />
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Campus Stacked Bar */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider">COPC Status by Campus</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Identifies which campuses have the highest CHED compliance risk exposure — sorted by non-compliance count
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCampus} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
              <YAxis dataKey="campus" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={90} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              {Object.keys(COPC_COLORS).map((key) => (
                <Bar key={key} dataKey={key} stackId="a" fill={COPC_COLORS[key]}>
                  <LabelList dataKey={key} position="inside" style={{ fontSize: 9, fontWeight: 800, fill: '#fff' }} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 3: RQAT Visit Status + Board Exam */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RQAT Visit Status */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider">RQAT Visit Status</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Programs overdue for CHED Regional Quality Assurance Team review ({'>'}3 years)
                </CardDescription>
              </div>
              <Badge variant="destructive" className="text-[9px] font-black uppercase shrink-0">
                {overdueRqat} Overdue
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-72 overflow-y-auto">
              {rqatData.slice(0, 12).map(prog => (
                <div key={prog.id} className={cn('flex items-center justify-between px-5 py-3 hover:bg-muted/20 transition-colors', prog.isOverdue && 'bg-red-50/30')}>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate" title={prog.fullName}>{prog.name}</p>
                    <p className="text-[9px] text-muted-foreground font-medium">{prog.campus} • Last Visit: {prog.lastVisit}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {prog.ncCount > 0 && (
                      <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-700">{prog.ncCount} NC</Badge>
                    )}
                    <Badge
                      className={cn('text-[8px] font-black', prog.isOverdue ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200')}
                      variant="outline"
                    >
                      {prog.isOverdue ? '⚠ Overdue' : '✓ Current'}
                    </Badge>
                  </div>
                </div>
              ))}
              {rqatData.length === 0 && (
                <div className="p-8 text-center text-[11px] text-muted-foreground font-bold uppercase">No RQAT data recorded</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Board Exam Pass Rate */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Board Exam Performance vs National</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              First takers pass rate compared to the national passing rate — programs below national average flagged red
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {boardPerfData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={boardPerfData} layout="vertical" margin={{ top: 0, right: 50, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 9 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={50} />
                  <RechartsTooltip formatter={(val: number) => `${val.toFixed(1)}%`} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="passRate" name="RSU Pass Rate" radius={[0, 4, 4, 0]}>
                    {boardPerfData.map((entry, i) => (
                      <Cell key={i} fill={entry.passRate >= entry.national ? '#10b981' : '#ef4444'} />
                    ))}
                    <LabelList dataKey="passRate" position="right" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                  <Bar dataKey="national" name="National Rate" fill="#94a3b8" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="national" position="right" formatter={(v: number) => `${v.toFixed(0)}%`} style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <BookOpen className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-[11px] font-bold text-muted-foreground uppercase">No board exam data recorded</p>
                  <p className="text-[10px] text-muted-foreground">Add board performance records in Program Compliance</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
