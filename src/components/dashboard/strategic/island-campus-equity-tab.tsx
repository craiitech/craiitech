'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  GraduationCap,
  Award,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  Compass,
  TrendingUp,
  MapPin,
  ExternalLink,
  ChevronRight,
  Filter,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { AcademicProgram, ProgramComplianceRecord, Submission, Campus, Unit } from '@/lib/types';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import { getProgramChedWarnings } from '@/lib/ched-compliance-warnings';

interface IslandCampusEquityTabProps {
  campuses: Campus[];
  academicPrograms: AcademicProgram[];
  allCompliances: ProgramComplianceRecord[];
  submissions: Submission[];
  units: Unit[];
  selectedYear: number;
}

export function IslandCampusEquityTab({
  campuses,
  academicPrograms,
  allCompliances,
  submissions,
  units,
  selectedYear,
}: IslandCampusEquityTabProps) {
  const [selectedCampusId, setSelectedCampusId] = useState<string>('all');

  const complianceMap = useMemo(() => {
    const map = new Map<string, ProgramComplianceRecord>();
    allCompliances.forEach((c) => {
      const existing = map.get(c.programId);
      if (!existing || c.academicYear === selectedYear) {
        map.set(c.programId, c);
      }
    });
    return map;
  }, [allCompliances, selectedYear]);

  // Compute metrics per campus
  const campusAnalytics = useMemo(() => {
    const activePrograms = academicPrograms.filter((p) => p.isActive !== false);

    return campuses
      .map((campus) => {
        const campusProgs = activePrograms.filter((p) => p.campusId === campus.id);
        const progCount = campusProgs.length;

        let copcCount = 0;
        let accreditedCount = 0;
        let totalEnrolled = 0;

        campusProgs.forEach((p) => {
          const comp = complianceMap.get(p.id);
          if (comp?.ched?.copcStatus === 'With COPC') copcCount++;

          const accRecords = comp?.accreditationRecords || [];
          const current = accRecords.find((r) => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
          const lvl = (current?.level || '').toLowerCase();
          if (lvl && !lvl.includes('non') && !lvl.includes('awaiting')) accreditedCount++;

          const warning = getProgramChedWarnings(p, comp, selectedYear);
          const sem = warning.enrollmentSummary.firstSemCount || warning.enrollmentSummary.secondSemCount || 0;
          totalEnrolled += sem;
        });

        const campusSubmissions = submissions.filter((s) => s.campusId === campus.id);
        const approvedSubmissions = campusSubmissions.filter((s) => s.statusId === 'approved').length;
        const subRate =
          campusSubmissions.length > 0 ? Math.round((approvedSubmissions / campusSubmissions.length) * 100) : 0;

        const copcRate = progCount > 0 ? Math.round((copcCount / progCount) * 100) : 0;
        const accRate = progCount > 0 ? Math.round((accreditedCount / progCount) * 100) : 0;

        return {
          id: campus.id,
          name: campus.name,
          code: (campus as any).code || campus.name.slice(0, 4).toUpperCase(),
          progCount,
          copcCount,
          copcRate,
          accreditedCount,
          accRate,
          totalEnrolled,
          submissionsCount: campusSubmissions.length,
          approvedSubmissions,
          subRate,
        };
      })
      .sort((a, b) => b.progCount - a.progCount);
  }, [campuses, academicPrograms, complianceMap, submissions, selectedYear]);

  // Chart dataset
  const chartData = useMemo(() => {
    return campusAnalytics.map((c) => ({
      name: c.name.replace(' Campus', ''),
      'COPC Compliance %': c.copcRate,
      'AACCUP Accredited %': c.accRate,
      'IQA Submissions %': c.subRate,
    }));
  }, [campusAnalytics]);

  return (
    <div className="space-y-6">
      <Chart3DDefs />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-teal-400/20 text-teal-200 border-teal-300/30 text-[10px] font-black uppercase tracking-widest">
                Decentralized Campus Equity
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-mono font-bold">
                {campuses.length} Island Campuses
              </Badge>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Building2 className="h-8 w-8 text-teal-400 shrink-0" />
              Multi-Island Campus Comparative Radar
            </h2>
            <p className="text-xs text-teal-100/80 leading-relaxed font-medium">
              Side-by-side performance intelligence across Romblon State University's Main and Satellite Island
              Campuses. Empowers leadership to balance development, staffing, facility investments, and accreditation
              support equitably.
            </p>
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
        <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/40 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                Cross-Campus Quality & Compliance Benchmark (%)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Comparing COPC compliance, AACCUP accredited offerings, and IQA submission fulfillment
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="COPC Compliance %" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="AACCUP Accredited %" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="IQA Submissions %" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/5 border-t py-4 px-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
              <strong>Equity Benchmark Interpretation:</strong> This comparative metric assesses institutional parity
              across geographically dispersed island and main campuses by cross-referencing CHED Certificate of Program
              Compliance (COPC), AACCUP accreditation status, and Internal Quality Assurance (IQA) submission rates.
              Discrepancies between bars highlight campuses requiring targeted resource leveling, faculty development
              support, or streamlined document management to close quality assurance gaps and ensure uniform academic
              standards.
            </p>
          </div>
        </CardFooter>
      </Card>

      {/* Campus Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campusAnalytics.map((c) => (
          <Card
            key={c.id}
            className="border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 transition-colors"
          >
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-[9px] font-mono font-bold">
                  {c.code}
                </Badge>
                <span className="text-[10px] font-bold text-slate-500">
                  {c.progCount} Program{c.progCount !== 1 ? 's' : ''}
                </span>
              </div>
              <CardTitle className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">COPC Compliance:</span>
                  <strong className="text-emerald-700 font-mono">
                    {c.copcCount}/{c.progCount} ({c.copcRate}%)
                  </strong>
                </div>
                <Progress value={c.copcRate} className="h-1.5 bg-emerald-50" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">AACCUP Accredited:</span>
                  <strong className="text-blue-700 font-mono">
                    {c.accreditedCount}/{c.progCount} ({c.accRate}%)
                  </strong>
                </div>
                <Progress value={c.accRate} className="h-1.5 bg-blue-50" />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">IQA Approved Submissions:</span>
                  <strong className="text-amber-700 font-mono">{c.subRate}%</strong>
                </div>
                <Progress value={c.subRate} className="h-1.5 bg-amber-50" />
              </div>

              {c.totalEnrolled > 0 && (
                <div className="pt-2 border-t flex justify-between items-center text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> Recorded Students:
                  </span>
                  <strong className="text-slate-800 font-mono">{c.totalEnrolled.toLocaleString()}</strong>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
