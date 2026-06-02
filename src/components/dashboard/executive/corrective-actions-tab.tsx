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
import { ClipboardCheck, Clock, CheckCircle2, AlertTriangle, ShieldAlert, TrendingDown } from 'lucide-react';
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
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value, percent }) => `${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {statusData.map(entry => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
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
            <CardContent className="pt-4 flex items-center gap-6">
              <ResponsiveContainer width="40%" height={120}>
                <PieChart>
                  <Pie data={natureData} innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
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
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{d.name === 'NC' ? 'Non-Conformance' : 'Opportunity for Improvement'}</p>
                    </div>
                  </div>
                ))}
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
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: 700 }} width={80} />
                  <RechartsTooltip />
                  {sourceData.map((entry, i) => null)}
                  <Bar dataKey="value" name="CARs" radius={[0, 4, 4, 0]}>
                    {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
              <BarChart data={agingData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topUnits} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fontWeight: 700 }} width={90} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="open" name="Open CARs" radius={[0, 4, 4, 0]}>
                    {topUnits.map((entry, i) => (
                      <Cell key={i} fill={entry.nc > 0 ? '#ef4444' : '#6366f1'} />
                    ))}
                    <LabelList dataKey="open" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCampus} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="campus" tick={{ fontSize: 8, fontWeight: 700 }} angle={-20} textAnchor="end" />
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
        </CardContent>
      </Card>
    </div>
  );
}
