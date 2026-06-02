'use client';

import { useMemo } from 'react';
import type { Risk, Unit, Campus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  LineChart, Line,
} from 'recharts';
import { ShieldAlert, TrendingUp, CheckCircle2, AlertTriangle, Lightbulb, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RiskOpportunityTabProps {
  risks: Risk[];
  allUnits: Unit[];
  campuses: Campus[];
  selectedYear: number;
}

const RATING_COLORS: Record<string, string> = {
  'Very High': '#dc2626',
  'High': '#f97316',
  'Medium': '#f59e0b',
  'Low': '#10b981',
};

const STATUS_COLORS: Record<string, string> = {
  'Open': '#ef4444',
  'In Progress': '#f59e0b',
  'Closed': '#10b981',
};

const HEAT_COLORS = [
  ['#d1fae5', '#a7f3d0', '#fde68a', '#fca5a5', '#fca5a5'],
  ['#a7f3d0', '#fde68a', '#fde68a', '#fca5a5', '#ef4444'],
  ['#fde68a', '#fde68a', '#fca5a5', '#ef4444', '#dc2626'],
  ['#fca5a5', '#fca5a5', '#ef4444', '#dc2626', '#7f1d1d'],
  ['#fca5a5', '#ef4444', '#dc2626', '#7f1d1d', '#450a0a'],
];

export function RiskOpportunityTab({ risks, allUnits, campuses, selectedYear }: RiskOpportunityTabProps) {
  const unitMap = useMemo(() => new Map(allUnits.map(u => [u.id, u.name])), [allUnits]);
  const campusMap = useMemo(() => new Map(campuses.map(c => [c.id, c.name])), [campuses]);

  const yearRisks = useMemo(() => risks.filter(r => r.year === selectedYear), [risks, selectedYear]);

  const openRisks = useMemo(() => yearRisks.filter(r => r.type === 'Risk' && r.status !== 'Closed'), [yearRisks]);
  const opportunities = useMemo(() => yearRisks.filter(r => r.type === 'Opportunity'), [yearRisks]);
  const criticalRisks = useMemo(() => openRisks.filter(r => r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High'), [openRisks]);
  const withTreatment = useMemo(() => yearRisks.filter(r => r.postTreatment), [yearRisks]);
  const treatmentCoverage = yearRisks.length > 0 ? Math.round((withTreatment.length / yearRisks.length) * 100) : 0;

  // Rating distribution
  const ratingData = useMemo(() => {
    const counts: Record<string, number> = { 'Very High': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
    openRisks.forEach(r => {
      const rating = r.preTreatment?.rating || 'Low';
      counts[rating] = (counts[rating] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  }, [openRisks]);

  // Risk vs Opportunity by status
  const typeStatusData = useMemo(() => {
    const statuses = ['Open', 'In Progress', 'Closed'];
    return statuses.map(status => ({
      status,
      'Risks': yearRisks.filter(r => r.type === 'Risk' && r.status === status).length,
      'Opportunities': yearRisks.filter(r => r.type === 'Opportunity' && r.status === status).length,
    }));
  }, [yearRisks]);

  // Heat map: likelihood (1–5) × consequence (1–5) grid
  const heatMapData = useMemo(() => {
    const grid: number[][] = Array(5).fill(null).map(() => Array(5).fill(0));
    openRisks.forEach(r => {
      const l = Math.min(5, Math.max(1, r.preTreatment?.likelihood || 1)) - 1;
      const c = Math.min(5, Math.max(1, r.preTreatment?.consequence || 1)) - 1;
      grid[4 - c][l]++;
    });
    return grid;
  }, [openRisks]);

  // Top 8 units by open risk count
  const topRiskyUnits = useMemo(() => {
    const counts: Record<string, { name: string; open: number; critical: number }> = {};
    openRisks.forEach(r => {
      if (!counts[r.unitId]) counts[r.unitId] = { name: unitMap.get(r.unitId) || r.unitId, open: 0, critical: 0 };
      counts[r.unitId].open++;
      if (r.preTreatment?.rating === 'Very High' || r.preTreatment?.rating === 'High') counts[r.unitId].critical++;
    });
    return Object.values(counts).sort((a, b) => b.open - a.open).slice(0, 8);
  }, [openRisks, unitMap]);

  // Pre vs Post treatment magnitude by campus
  const treatmentImpact = useMemo(() => {
    const campusData: Record<string, { pre: number[]; post: number[] }> = {};
    yearRisks.forEach(r => {
      const name = campusMap.get(r.campusId) || r.campusId;
      const short = name.replace('Campus', '').trim();
      if (!campusData[short]) campusData[short] = { pre: [], post: [] };
      if (r.preTreatment?.magnitude) campusData[short].pre.push(r.preTreatment.magnitude);
      if (r.postTreatment?.magnitude) campusData[short].post.push(r.postTreatment.magnitude);
    });
    return Object.entries(campusData).map(([campus, d]) => ({
      campus,
      'Pre-Treatment Avg': d.pre.length > 0 ? parseFloat((d.pre.reduce((a, b) => a + b, 0) / d.pre.length).toFixed(1)) : 0,
      'Post-Treatment Avg': d.post.length > 0 ? parseFloat((d.post.reduce((a, b) => a + b, 0) / d.post.length).toFixed(1)) : 0,
    })).filter(d => d['Pre-Treatment Avg'] > 0);
  }, [yearRisks, campusMap]);

  // Risk by campus stacked
  const byCampus = useMemo(() => {
    const data: Record<string, { Open: number; 'In Progress': number; Closed: number }> = {};
    yearRisks.filter(r => r.type === 'Risk').forEach(r => {
      const name = (campusMap.get(r.campusId) || r.campusId).replace('Campus', '').trim();
      if (!data[name]) data[name] = { Open: 0, 'In Progress': 0, Closed: 0 };
      data[name][r.status as keyof typeof data[string]] = (data[name][r.status as keyof typeof data[string]] || 0) + 1;
    });
    return Object.entries(data).map(([campus, d]) => ({ campus, ...d })).sort((a, b) => b.Open - a.Open);
  }, [yearRisks, campusMap]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-xl shadow-xl p-3 text-xs">
        <p className="font-black uppercase mb-1">{label}</p>
        {payload.map((entry: any) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-bold">{entry.name}: {entry.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Open Risks', value: openRisks.length, icon: <ShieldAlert className="h-5 w-5" />, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Opportunities', value: opportunities.length, icon: <Lightbulb className="h-5 w-5" />, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Critical (High/Very High)', value: criticalRisks.length, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Treatment Coverage', value: `${treatmentCoverage}%`, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Row 1: Donut + Risk vs Opportunity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Rating Donut */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Risk Rating Distribution</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Open risks grouped by pre-treatment severity — red/orange segments require immediate executive attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={ratingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                >
                  {ratingData.map(entry => (
                    <Cell key={entry.name} fill={RATING_COLORS[entry.name] || '#94a3b8'} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
            {ratingData.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">No open risks for {selectedYear}</p>
            )}
          </CardContent>
        </Card>

        {/* Risks vs Opportunities by Status */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Risks vs Opportunities by Status</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Compares the treatment pipeline for threats and opportunities side-by-side
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={typeStatusData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fontWeight: 700 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                <Bar dataKey="Risks" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  <LabelList dataKey="Risks" position="top" style={{ fontSize: 9, fontWeight: 800 }} />
                </Bar>
                <Bar dataKey="Opportunities" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={30}>
                  <LabelList dataKey="Opportunities" position="top" style={{ fontSize: 9, fontWeight: 800 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Risk Heat Map */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider">ISO 31000 Risk Heat Map — Likelihood × Consequence</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Each cell shows the number of open risks at that likelihood-consequence intersection. Darker red = higher concentration of critical risks
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-start">
            {/* Y-Axis Label */}
            <div className="flex flex-col items-center justify-center h-48 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 -rotate-90 whitespace-nowrap">Consequence (Impact)</span>
            </div>
            {/* Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-5 gap-1 mb-1">
                {['1', '2', '3', '4', '5'].map(l => (
                  <div key={l} className="text-center text-[9px] font-black text-slate-400">{l}</div>
                ))}
              </div>
              {heatMapData.map((row, ri) => (
                <div key={ri} className="grid grid-cols-5 gap-1 mb-1">
                  {row.map((count, ci) => (
                    <div
                      key={ci}
                      style={{ background: HEAT_COLORS[ri][ci] }}
                      className="h-10 rounded-lg flex items-center justify-center text-sm font-black shadow-sm border border-white/50"
                      title={`Likelihood ${ci + 1}, Consequence ${5 - ri}: ${count} risks`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-between mt-2 px-1">
                <span className="text-[9px] font-black text-slate-400">Low Likelihood</span>
                <span className="text-[9px] font-black text-slate-400">High Likelihood →</span>
              </div>
            </div>
            {/* Y labels */}
            <div className="flex flex-col justify-between h-48 shrink-0">
              {['5', '4', '3', '2', '1'].map(l => (
                <div key={l} className="text-[9px] font-black text-slate-400 flex items-center">{l}</div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 justify-center">
            {[['Low', '#d1fae5'], ['Medium', '#fde68a'], ['High', '#fca5a5'], ['Critical', '#dc2626']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-3 w-6 rounded" style={{ background: color }} />
                <span className="text-[9px] font-bold text-slate-500 uppercase">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Top Risky Units + Pre/Post Treatment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Risky Units */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Top Units by Open Risk Count</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Units with the most unresolved risks — red bars indicate units with critical/high-rated risks
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {topRiskyUnits.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topRiskyUnits} layout="vertical" margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 700 }} width={90} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="open" name="Open Risks" radius={[0, 4, 4, 0]}>
                    {topRiskyUnits.map((entry, i) => (
                      <Cell key={i} fill={entry.critical > 0 ? '#ef4444' : '#6366f1'} />
                    ))}
                    <LabelList dataKey="open" position="right" style={{ fontSize: 9, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-bold uppercase">No open risks for {selectedYear}</div>
            )}
          </CardContent>
        </Card>

        {/* Pre vs Post Treatment Impact */}
        <Card className="shadow-md bg-white border-primary/10">
          <CardHeader className="border-b bg-muted/20 pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider">Risk Reduction: Pre vs Post Treatment</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Average risk magnitude before and after treatment by campus — a lower post-treatment bar means treatments are working
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {treatmentImpact.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={treatmentImpact} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="campus" tick={{ fontSize: 8, fontWeight: 700 }} angle={-20} textAnchor="end" />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 25]} label={{ value: 'Magnitude', angle: -90, position: 'insideLeft', fontSize: 9 }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="Pre-Treatment Avg" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    <LabelList dataKey="Pre-Treatment Avg" position="top" style={{ fontSize: 8, fontWeight: 800 }} />
                  </Bar>
                  <Bar dataKey="Post-Treatment Avg" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    <LabelList dataKey="Post-Treatment Avg" position="top" style={{ fontSize: 8, fontWeight: 800 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-bold uppercase">No post-treatment data recorded</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Risk by Campus Stacked */}
      <Card className="shadow-md bg-white border-primary/10">
        <CardHeader className="border-b bg-muted/20 pb-3">
          <CardTitle className="text-sm font-black uppercase tracking-wider">Risk Treatment Status by Campus</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Compares campus-level risk management performance — more green (Closed) = better quality control
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byCampus} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="campus" tick={{ fontSize: 8, fontWeight: 700 }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
              <RechartsTooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
              {Object.keys(STATUS_COLORS).map(key => (
                <Bar key={key} dataKey={key} stackId="a" fill={STATUS_COLORS[key]}>
                  <LabelList dataKey={key} position="inside" style={{ fontSize: 8, fontWeight: 800, fill: '#fff' }} formatter={(v: number) => v > 0 ? v : ''} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
