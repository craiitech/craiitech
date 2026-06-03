'use client';

import { useMemo } from 'react';
import type { CorrectiveActionRequest, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line,
} from 'recharts';
import { ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ShieldAlert, TrendingDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

interface CorrectiveActionsTabProps {
  cars: CorrectiveActionRequest[];
  allUnits: Unit[];
  campuses: Campus[];
  selectedYear: number;
}

const STATUS_COLORS: Record<string, string> = {
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

export function CorrectiveActionsTab({ cars, allUnits, campuses, selectedYear }: CorrectiveActionsTabProps) {
  const unitMap = useMemo(() => new Map(allUnits.map(u => [u.id, u.name])), [allUnits]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  // Year-filtered cars based on createdAt
  const yearCars = useMemo(() => {
    return cars.filter(c => {
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      return date ? date.getFullYear() === selectedYear : false;
    });
  }, [cars, selectedYear]);

  const openCars = useMemo(() => cars.filter(c => c.status !== 'Closed'), [cars]);
  const awaitingResponse = useMemo(() => cars.filter(c => c.status === 'Awaiting Response/Update'), [cars]);
  const forVerification = useMemo(() => cars.filter(c => c.status === 'For Final Verification'), [cars]);
  const closedThisYear = useMemo(() => yearCars.filter(c => c.status === 'Closed'), [yearCars]);

  // Status distribution
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    cars.forEach(c => {
      counts[c.status] = (counts[c.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [cars]);

  // Source breakdown
  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    cars.forEach(c => {
      counts[c.source] = (counts[c.source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('Audit Finding', 'Audit'), value })).sort((a, b) => b.value - a.value);
  }, [cars]);

  // Nature breakdown (NC vs OFI)
  const natureData = useMemo(() => {
    const counts: Record<string, number> = { NC: 0, OFI: 0 };
    cars.forEach(c => {
      if (c.natureOfFinding === 'NC') counts['NC']++;
      else counts['OFI']++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [cars]);

  // CAR Aging
  const agingData = useMemo(() => {
    const brackets = { '0–30 days': 0, '31–60 days': 0, '61–90 days': 0, '90+ days': 0 };
    openCars.forEach(c => {
      const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (!date) return;
      const days = differenceInDays(new Date(), date);
      if (days <= 30) brackets['0–30 days']++;
      else if (days <= 60) brackets['31–60 days']++;
      else if (days <= 90) brackets['61–90 days']++;
      else brackets['90+ days']++;
    });
    return Object.entries(brackets).map(([name, value]) => ({ name, value }));
  }, [openCars]);

  // Top 8 units with most open CARs
  const topUnits = useMemo(() => {
    const counts: Record<string, { name: string; open: number; nc: number }> = {};
    openCars.forEach(c => {
      if (!counts[c.unitId]) counts[c.unitId] = { name: unitMap.get(c.unitId) || c.unitId, open: 0, nc: 0 };
      counts[c.unitId].open++;
      if (c.natureOfFinding === 'NC') counts[c.unitId].nc++;
    });
    return Object.values(counts).sort((a, b) => b.open - a.open).slice(0, 8);
  }, [openCars, unitMap]);

  // Monthly trend (created vs closed) for selected year
  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: format(new Date(selectedYear, i, 1), 'MMM'),
      Created: 0,
      Closed: 0,
    }));
    cars.forEach(c => {
      const created = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
      if (created && created.getFullYear() === selectedYear) {
        months[created.getMonth()].Created++;
      }
    });
    cars.filter(c => c.status === 'Closed').forEach(c => {
      const updated = c.updatedAt?.toDate ? c.updatedAt.toDate() : c.updatedAt ? new Date(c.updatedAt) : null;
      if (updated && updated.getFullYear() === selectedYear) {
        months[updated.getMonth()].Closed++;
      }
    });
    return months;
  }, [cars, selectedYear]);

  // CAR by campus stacked
  const byCampus = useMemo(() => {
    type CampusRecord = { campus: string; Open: number; 'In Progress': number; 'Awaiting Response/Update': number; 'For Final Verification': number; Closed: number };
    const data: Record<string, CampusRecord> = {};
    cars.forEach(c => {
      const name = (campusMap.get(c.campusId) || c.campusId).replace('Campus', '').trim();
      if (!data[name]) data[name] = { campus: name, Open: 0, 'In Progress': 0, 'Awaiting Response/Update': 0, 'For Final Verification': 0, Closed: 0 };
      const key = c.status as keyof Omit<CampusRecord, 'campus'>;
      if (key in data[name]) (data[name] as any)[key]++;
    });
    return Object.values(data).sort((a, b) => b.Open - a.Open);
  }, [cars, campusMap]);

  const correctiveActionInsights = useMemo(() => {
    // 1. Pipeline Status Insight
    const totalCount = cars.length;
    const openCount = openCars.length;
    const awaitingCount = awaitingResponse.length;
    const verificationCount = forVerification.length;
    const openPct = totalCount > 0 ? Math.round((openCount / totalCount) * 100) : 0;
    
    let pipelineText = "No corrective actions have been logged in the system.";
    if (totalCount > 0) {
      if (openCount === 0) {
        pipelineText = "Excellent! All corrective actions in the system have been successfully verified and closed.";
      } else {
        pipelineText = `Out of ${totalCount} total corrective actions, ${openCount} (${openPct}% of total) remain unresolved. The primary bottleneck is the '${awaitingCount}' items awaiting unit response, which requires departments to submit treatment actions.`;
        if (verificationCount > 0) {
          pipelineText += ` Additionally, ${verificationCount} items are awaiting final QMS verification before closure.`;
        }
      }
    }

    // 2. Nature Insight (NC vs OFI)
    const ncCount = natureData.find(d => d.name === 'NC')?.value || 0;
    const ofiCount = natureData.find(d => d.name === 'OFI')?.value || 0;
    const ncPct = (ncCount + ofiCount) > 0 ? Math.round((ncCount / (ncCount + ofiCount)) * 100) : 0;
    let natureText = "No findings recorded.";
    if (ncCount + ofiCount > 0) {
      natureText = `Mandatory Non-Conformances (NC) constitute ${ncPct}% (${ncCount} items) of findings. Focus resolution resources on NCs to ensure standard alignment, while treating the ${ofiCount} Opportunities for Improvement (OFI) as quality enhancements.`;
    }

    // 3. Source Insight
    let sourceText = "No CAR sources recorded.";
    if (sourceData.length > 0) {
      const topSource = sourceData[0];
      sourceText = `The main driver of corrective actions is '${topSource.name}' with ${topSource.value} CARs, indicating it is the most active detection channel.`;
    }

    // 4. Aging Insight
    const overdueCount = agingData.find(d => d.name === '90+ days')?.value || 0;
    const intermediateCount = (agingData.find(d => d.name === '31–60 days')?.value || 0) + (agingData.find(d => d.name === '61–90 days')?.value || 0);
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

    // 5. Top Units Insight
    let unitsText = "No departments have open corrective action requests.";
    if (topUnits.length > 0) {
      const highest = topUnits[0];
      const ncHigh = highest.nc;
      unitsText = `'${highest.name}' has the largest active workload with ${highest.open} open CARs (${ncHigh} are critical Non-Conformances). High priority should be given to support this department in completing their compliance actions.`;
    }

    // 6. Trend Insight
    const createdThisYear = monthlyTrend.reduce((sum, m) => sum + m.Created, 0);
    const closedThisYear = monthlyTrend.reduce((sum, m) => sum + m.Closed, 0);
    let trendText = "No trend data for the selected academic year.";
    if (createdThisYear > 0 || closedThisYear > 0) {
      if (closedThisYear >= createdThisYear) {
        trendText = `Outstanding Resolution Rate: In AY ${selectedYear}, the university closed ${closedThisYear} CARs while creating ${createdThisYear}, successfully reducing the active quality backlog.`;
      } else {
        const gap = createdThisYear - closedThisYear;
        trendText = `Quality Deficit: In AY ${selectedYear}, ${createdThisYear} CARs were created but only ${closedThisYear} were closed. The backlog grew by ${gap} items, indicating resolution pacing needs to be accelerated.`;
      }
    }

    // 7. Campus Insight
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

    return {
      pipelineText,
      natureText,
      sourceText,
      agingText,
      unitsText,
      trendText,
      campusText,
    };
  }, [cars, openCars, awaitingResponse, forVerification, natureData, sourceData, agingData, topUnits, monthlyTrend, selectedYear, byCampus]);

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

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Open CARs', value: openCars.length, icon: <ClipboardCheck className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Awaiting Unit Response', value: awaitingResponse.length, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'For Final Verification', value: forVerification.length, icon: <ShieldAlert className="h-5 w-5" />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: `Closed (AY ${selectedYear})`, value: closedThisYear.length, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Row 1: Status Donut + Nature Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Donut */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">CAR Pipeline Status</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Institutional corrective action pipeline health — red/orange = active backlog, green = closed
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusData.map(entry => (
                        <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 pr-2">
                {statusData.map(d => {
                  const pct = cars.length > 0 ? Math.round((d.value / cars.length) * 100) : 0;
                  return (
                    <div key={d.name} className="flex items-center justify-between border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.name] || '#94a3b8' }} />
                        <span className="text-[10px] font-extrabold uppercase text-slate-700">{d.name}</span>
                      </div>
                      <span className="text-[11px] font-black text-slate-900">{d.value} <span className="text-slate-400 font-medium font-mono text-[9px]">({pct}%)</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.pipelineText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NC vs OFI + Source Bar */}
        <div className="space-y-4">
          {/* Nature Donut */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider">NC vs OFI Split</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Non-Conformance (NC) items require mandatory closure; OFIs are improvement opportunities
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="40%" height={110}>
                  <PieChart>
                    <Pie data={natureData} innerRadius={25} outerRadius={45} paddingAngle={3} dataKey="value">
                      {natureData.map(entry => (
                        <Cell key={entry.name} fill={NATURE_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {natureData.map(d => (
                    <div key={d.name} className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full shrink-0" style={{ background: NATURE_COLORS[d.name] }} />
                      <div>
                        <p className="text-sm font-black text-slate-800">{d.value}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-0.5">{d.name === 'NC' ? 'Non-Conformance' : 'Opportunity for Improvement'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Analysis</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.natureText}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Source Bar */}
          <Card className="shadow-md bg-white border-primary/10">
            <CardHeader className="border-b bg-muted/20 pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider">CARs by Source</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Root trigger of corrective actions — most from Audit Findings indicates strong IQA linkage
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 8, fontWeight: 700 }} 
                    width={110} 
                    tickFormatter={(v) => v.length > 22 ? v.substring(0, 20) + '...' : v}
                  />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="CARs" radius={[0, 4, 4, 0]}>
                    {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-slate-100 bg-slate-50 rounded-lg p-2.5 flex items-start gap-2">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Analysis</p>
                  <p className="text-[10px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.sourceText}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CAR Aging + Top Units */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Chart */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-wider">Open CAR Aging Analysis</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  How long open CARs have been unresolved — the 90+ day bucket is a critical quality management red flag
                </CardDescription>
              </div>
              {agingData.find(d => d.name === '90+ days')?.value ? (
                <Badge variant="destructive" className="text-[8px] font-black uppercase shrink-0">
                  {agingData.find(d => d.name === '90+ days')?.value} Overdue
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={agingData} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Open CARs" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {agingData.map((entry, i) => (
                    <Cell key={i} fill={i === 3 ? '#dc2626' : i === 2 ? '#f97316' : i === 1 ? '#f59e0b' : '#6366f1'} />
                  ))}
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fontWeight: 800 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.agingText}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Units with Most Open CARs */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Top Units by Open CARs</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Units with highest unresolved corrective action workload — red bars indicate NC-dominated backlog
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {topUnits.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topUnits} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 8, fontWeight: 700 }} 
                      width={110} 
                      tickFormatter={(v) => v.length > 22 ? v.substring(0, 20) + '...' : v}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Bar dataKey="open" name="Open CARs" radius={[0, 4, 4, 0]}>
                      {topUnits.map((entry, i) => (
                        <Cell key={i} fill={entry.nc > 0 ? '#ef4444' : '#6366f1'} />
                      ))}
                      <LabelList dataKey="open" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
                    <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.unitsText}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-40 flex items-center justify-center">
                <div className="text-center">
                  <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400 mb-2" />
                  <p className="text-xs font-black text-emerald-600 uppercase">No open CARs — Excellent!</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Line */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider">Monthly CAR Trend — AY {selectedYear}</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            CARs created vs CARs closed per month — a widening gap (red above green) signals the system is falling behind
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 9, fontWeight: 700 }} />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              <Line type="monotone" dataKey="Created" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4, fill: '#ef4444' }} />
              <Line type="monotone" dataKey="Closed" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.trendText}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAR by Campus */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider">Corrective Actions by Campus</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            All-time CAR status breakdown per campus — identifies which sites need stronger quality management support
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={byCampus} margin={{ top: 10, right: 20, left: 0, bottom: 35 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="campus" tick={{ fontSize: 8, fontWeight: 700 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <Bar key={status} dataKey={status} stackId="a" fill={color}>
                  <LabelList dataKey={status} position="inside" style={{ fontSize: 7, fontWeight: 800, fill: '#fff' }} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 rounded-lg p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Analysis & Action Plan</p>
              <p className="text-[11px] font-bold text-slate-600 mt-0.5 leading-relaxed">{correctiveActionInsights.campusText}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
