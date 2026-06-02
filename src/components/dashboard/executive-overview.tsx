'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Award,
  GraduationCap,
  TriangleAlert,
  ListChecks,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  Building,
  Flame,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import type { Submission, Risk, CorrectiveActionRequest, ProgramComplianceRecord, AcademicProgram, AuditSchedule, Unit, Campus } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ExecutiveOverviewProps {
  submissions: Submission[] | null;
  risks: Risk[] | null;
  cars: CorrectiveActionRequest[] | null;
  allCompliances: ProgramComplianceRecord[] | null;
  academicPrograms: AcademicProgram[] | null;
  schedules: AuditSchedule[] | null;
  units: Unit[] | null;
  campuses: Campus[] | null;
  selectedYear: number;
}

export function ExecutiveOverview({
  submissions = [],
  risks = [],
  cars = [],
  allCompliances = [],
  academicPrograms = [],
  schedules = [],
  units = [],
  campuses = [],
  selectedYear
}: ExecutiveOverviewProps) {

  // 1. SUBMISSION COMPLIANCE RATE
  const approvedSubs = useMemo(() => submissions?.filter(s => s.year === selectedYear && s.statusId === 'approved') || [], [submissions, selectedYear]);
  const pendingSubs = useMemo(() => submissions?.filter(s => s.year === selectedYear && s.statusId === 'submitted') || [], [submissions, selectedYear]);
  const expectedSubs = useMemo(() => (units?.length || 0) * 2, [units]); // 2 cycles per unit
  const submissionRate = useMemo(() => expectedSubs > 0 ? Math.round((approvedSubs.length / expectedSubs) * 100) : 0, [approvedSubs, expectedSubs]);

  // 2. IQA PROGRESS RATE
  const yearSchedules = useMemo(() => schedules?.filter(s => {
    if (!s.scheduledDate) return false;
    const date = s.scheduledDate.toDate ? s.scheduledDate.toDate() : new Date(s.scheduledDate);
    return date.getFullYear() === selectedYear;
  }) || [], [schedules, selectedYear]);
  const completedAudits = useMemo(() => yearSchedules.filter(s => s.status === 'Completed'), [yearSchedules]);
  const inProgressAudits = useMemo(() => yearSchedules.filter(s => s.status === 'In Progress'), [yearSchedules]);
  const iqaProgressRate = useMemo(() => yearSchedules.length > 0 ? Math.round((completedAudits.length / yearSchedules.length) * 100) : 0, [completedAudits, yearSchedules]);

  // 3. CORRECTIVE ACTION REQUEST (CAR) CLOSURE RATE
  const yearCars = useMemo(() => cars?.filter(c => {
    if (!c.createdAt) return true;
    const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
    return date.getFullYear() === selectedYear;
  }) || cars || [], [cars, selectedYear]);
  const closedCars = useMemo(() => yearCars.filter(c => c.status === 'Closed'), [yearCars]);
  const carResolutionRate = useMemo(() => yearCars.length > 0 ? Math.round((closedCars.length / yearCars.length) * 100) : 0, [closedCars, yearCars]);

  // 4. ACCREDITATION GAPS RESOLUTION RATE
  const recommendationsList = useMemo(() => allCompliances?.reduce((acc: any[], c) => {
    c.accreditationRecords?.forEach(ar => {
      ar.recommendations?.forEach(rec => {
        acc.push({
          ...rec,
          programName: units?.find(u => u.id === c.programId)?.name || 'Academic Program',
          campusId: c.campusId
        });
      });
    });
    return acc;
  }, []) || [], [allCompliances, units]);
  const closedRecs = useMemo(() => recommendationsList.filter(r => r.status === 'Closed'), [recommendationsList]);
  const accreditationResolutionRate = useMemo(() => recommendationsList.length > 0 ? Math.round((closedRecs.length / recommendationsList.length) * 100) : 0, [closedRecs, recommendationsList]);

  // 5. CHED COPC RATE
  const copcCompliant = useMemo(() => allCompliances?.filter(c => c.ched?.copcStatus === 'With COPC') || [], [allCompliances]);
  const totalProgramsCount = useMemo(() => academicPrograms?.length || 0, [academicPrograms]);
  const copcComplianceRate = useMemo(() => totalProgramsCount > 0 ? Math.round((copcCompliant.length / totalProgramsCount) * 100) : 0, [copcCompliant, totalProgramsCount]);

  // 6. RISK MITIGATION RATE
  const yearRisks = useMemo(() => risks?.filter(r => r.year === selectedYear) || [], [risks, selectedYear]);
  const mitigatedRisks = useMemo(() => yearRisks.filter(r => r.status === 'Closed' || r.preTreatment?.rating === 'low' || r.postTreatment?.rating === 'low'), [yearRisks]);
  const riskControlRate = useMemo(() => yearRisks.length > 0 ? Math.round((mitigatedRisks.length / yearRisks.length) * 100) : 0, [mitigatedRisks, yearRisks]);

  // COMPOSITE EOMS QUALITY SCORE
  const activeMetrics = useMemo(() => [
    { name: 'Submission compliance', value: submissionRate, weight: 0.25, color: 'bg-emerald-500' },
    { name: 'IQA Audit Progress', value: iqaProgressRate, weight: 0.20, color: 'bg-indigo-500' },
    { name: 'CAR Resolution Rate', value: carResolutionRate, weight: 0.20, color: 'bg-rose-500' },
    { name: 'Risk Control Index', value: riskControlRate, weight: 0.15, color: 'bg-amber-500' },
    { name: 'CHED Program COPC', value: copcComplianceRate, weight: 0.10, color: 'bg-blue-500' },
    { name: 'Accreditation Gaps Closed', value: accreditationResolutionRate, weight: 0.10, color: 'bg-teal-500' },
  ], [submissionRate, iqaProgressRate, carResolutionRate, riskControlRate, copcComplianceRate, accreditationResolutionRate]);

  const eomsQualityScore = useMemo(() => {
    const totalWeight = activeMetrics.reduce((sum, m) => sum + m.weight, 0);
    return totalWeight > 0 
      ? Math.round(activeMetrics.reduce((sum, m) => sum + (m.value * m.weight), 0) / totalWeight) 
      : 0;
  }, [activeMetrics]);

  // EOMS Quality Status Text & Badge
  const statusDetails = useMemo(() => {
    if (eomsQualityScore >= 85) return { text: 'Optimal Compliance', desc: 'The University exhibits outstanding alignment with EOMS standards.', color: 'text-emerald-600 border-emerald-200 bg-emerald-50' };
    if (eomsQualityScore >= 65) return { text: 'Good standing', desc: 'System is stable, though minor compliance gaps require correction.', color: 'text-blue-600 border-blue-200 bg-blue-50' };
    if (eomsQualityScore >= 45) return { text: 'Needs Improvement', desc: 'Active non-conformities and missing evidence registries detected.', color: 'text-amber-600 border-amber-200 bg-amber-50' };
    return { text: 'Critical Attention Required', desc: 'Substantial compliance deficiencies found across several sites.', color: 'text-rose-600 border-rose-200 bg-rose-50' };
  }, [eomsQualityScore]);

  // Campus Comparison Submissions Rate
  const campusSubmissionRates = useMemo(() => {
    if (!campuses?.length) return [];
    return campuses.map(campus => {
      const campusApproved = submissions?.filter(s => s.campusId === campus.id && s.year === selectedYear && s.statusId === 'approved').length || 0;
      const campusUnitsCount = units?.filter(u => u.campusIds?.includes(campus.id)).length || 0;
      const campusExpected = campusUnitsCount * 2;
      const rate = campusExpected > 0 ? Math.round((campusApproved / campusExpected) * 100) : 0;
      return {
        name: campus.name,
        approved: campusApproved,
        expected: campusExpected,
        rate
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [campuses, submissions, selectedYear, units]);

  // High-Priority EOMS Bottlenecks
  const bottlenecks = useMemo(() => {
    const alerts: { title: string; subtitle: string; severity: 'high' | 'medium'; icon: any; section: string }[] = [];

    // 1. Critical Overdue CARs
    const openMajorCars = yearCars.filter(c => c.status !== 'Closed' && c.natureOfFinding === 'NC');
    if (openMajorCars.length > 0) {
      alerts.push({
        title: `${openMajorCars.length} Active Non-Conformances`,
        subtitle: 'Outstanding CARs need corrective action verification.',
        severity: 'high',
        icon: Flame,
        section: 'Corrective Actions'
      });
    }

    // 2. High Risks
    const highRisks = yearRisks.filter(r => r.status !== 'Closed' && (r.preTreatment?.rating === 'high' || r.preTreatment?.rating === 'critical'));
    if (highRisks.length > 0) {
      alerts.push({
        title: `${highRisks.length} Unmitigated High Risks`,
        subtitle: 'Critical risk registers lack verified treatment plan implementations.',
        severity: 'high',
        icon: AlertTriangle,
        section: 'Risk Management'
      });
    }

    // 3. Impending Audits In Progress
    if (inProgressAudits.length > 0) {
      alerts.push({
        title: `${inProgressAudits.length} Audits Currently In Progress`,
        subtitle: 'Field IQA in progress. Awaiting findings documentation.',
        severity: 'medium',
        icon: Clock,
        section: 'Internal Quality Audit'
      });
    }

    // 4. Critical Accreditation Recommendations
    const openRecommendations = recommendationsList.filter(r => r.status !== 'Closed' && r.type === 'Mandatory');
    if (openRecommendations.length > 0) {
      alerts.push({
        title: `${openRecommendations.length} Mandatory Accreditation Gaps`,
        subtitle: 'Pending directives assigned to academic units require closure.',
        severity: 'high',
        icon: Award,
        section: 'Accreditation'
      });
    }

    // 5. Missing COPCs
    const nonCopc = academicPrograms?.filter(ap => {
      const comp = allCompliances?.find(c => c.programId === ap.id);
      return !comp || comp.ched?.copcStatus === 'No COPC';
    }) || [];
    if (nonCopc.length > 0) {
      alerts.push({
        title: `${nonCopc.length} Programs Lacking COPC Certificate`,
        subtitle: 'CHED Quality compliance review needed for degree courses.',
        severity: 'high',
        icon: GraduationCap,
        section: 'CHED Programs'
      });
    }

    return alerts.slice(0, 4); // Limit to top 4 alerts
  }, [yearCars, yearRisks, inProgressAudits, recommendationsList, academicPrograms, allCompliances]);

  return (
    <div className="space-y-6">
      {/* SECTION 1: Health Index Gauge & Campus comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        
        {/* EQI SCORECARD */}
        <Card className="lg:col-span-4 border-primary/20 bg-white shadow-lg overflow-hidden flex flex-col justify-between">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  EOMS Executive Health Score
                </CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
                  University-Wide Quality Performance Index
                </CardDescription>
              </div>
              <Badge variant="outline" className={cn("text-[9px] font-black uppercase px-2.5 py-1 border rounded-full shadow-xs", statusDetails.color)}>
                {statusDetails.text}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6 pb-6 flex flex-col sm:flex-row items-center gap-8">
            {/* SVG Radial Progress */}
            <div className="relative flex items-center justify-center shrink-0 w-[180px] h-[180px]">
              <svg className="w-full h-full transform -rotate-95" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="hsl(var(--primary) / 0.1)"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke={eomsQualityScore >= 80 ? '#10b981' : eomsQualityScore >= 60 ? '#3b82f6' : eomsQualityScore >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - eomsQualityScore / 100)}`}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Center Text */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-black text-slate-900 tracking-tight">{eomsQualityScore}%</span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">EOMS Index</span>
              </div>
            </div>

            {/* Sub-Indicators progress list */}
            <div className="w-full space-y-3">
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Metrics Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                {activeMetrics.map((metric, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-slate-600 truncate max-w-[120px]">{metric.name}</span>
                      <span className="text-slate-900 font-extrabold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className={cn("h-1.5", metric.color)} />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-primary/5 border-t py-3 px-6 text-[10px] font-medium text-slate-500 italic">
            {statusDetails.desc}
          </CardFooter>
        </Card>

        {/* CAMPUS PERFORMANCE COMPARISON */}
        <Card className="lg:col-span-3 border-primary/20 bg-white shadow-lg flex flex-col justify-between">
          <CardHeader className="bg-primary/5 pb-4 border-b">
            <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
              <Building className="h-5 w-5 text-indigo-600" />
              Campus Compliance standings
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
              Comparative submission rates per site for {selectedYear}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 pb-4 space-y-4">
            {campusSubmissionRates.map((cRate, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-800 uppercase truncate max-w-[170px]">{cRate.name}</span>
                  <span className="text-slate-900 font-black">{cRate.rate}% <span className="text-slate-400 font-medium font-mono text-[9px]">({cRate.approved}/{cRate.expected})</span></span>
                </div>
                <div className="relative w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      cRate.rate >= 80 ? "bg-emerald-500" : cRate.rate >= 60 ? "bg-blue-500" : cRate.rate >= 40 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${cRate.rate}%` }}
                  />
                </div>
              </div>
            ))}
            {campusSubmissionRates.length === 0 && (
              <div className="py-12 text-center opacity-40 text-[10px] font-bold uppercase text-slate-500">
                No campus datasets recorded
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-primary/5 border-t py-3 px-6 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
            Ranked by percentage of verified approved submissions
          </CardFooter>
        </Card>

      </div>

      {/* SECTION 2: 5 EOMS Pillars cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* PILLAR 1: INTERNAL AUDITS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Internal Audit</span>
              <Calendar className="h-4 w-4 text-indigo-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 mt-2">IQA Schedule</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{yearSchedules.length} <span className="text-[10px] text-muted-foreground font-bold">Planned</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Completed</span>
              <span className="text-slate-900 font-extrabold">{completedAudits.length} ({iqaProgressRate}%)</span>
            </div>
            <Progress value={iqaProgressRate} className="h-1 bg-slate-100" />
          </CardContent>
        </Card>

        {/* PILLAR 2: CORRECTIVE ACTIONS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">CAR Oversight</span>
              <ListChecks className="h-4 w-4 text-rose-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 mt-2">Corrective Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{yearCars.length} <span className="text-[10px] text-muted-foreground font-bold">Issued</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Closed</span>
              <span className="text-slate-900 font-extrabold">{closedCars.length} ({carResolutionRate}%)</span>
            </div>
            <Progress value={carResolutionRate} className="h-1 bg-rose-50" />
          </CardContent>
        </Card>

        {/* PILLAR 3: ACCREDITATION */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Accreditation</span>
              <Award className="h-4 w-4 text-teal-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 mt-2">Gaps Logged</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{recommendationsList.length} <span className="text-[10px] text-muted-foreground font-bold">Gaps</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Resolved</span>
              <span className="text-slate-900 font-extrabold">{closedRecs.length} ({accreditationResolutionRate}%)</span>
            </div>
            <Progress value={accreditationResolutionRate} className="h-1 bg-teal-50" />
          </CardContent>
        </Card>

        {/* PILLAR 4: RISKS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Risks & Opps</span>
              <TriangleAlert className="h-4 w-4 text-amber-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 mt-2">Risk Registers</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{yearRisks.length} <span className="text-[10px] text-muted-foreground font-bold">Identified</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>Mitigated</span>
              <span className="text-slate-900 font-extrabold">{mitigatedRisks.length} ({riskControlRate}%)</span>
            </div>
            <Progress value={riskControlRate} className="h-1 bg-amber-50" />
          </CardContent>
        </Card>

        {/* PILLAR 5: CHED PROGRAMS */}
        <Card className="border-primary/10 bg-white/50 backdrop-blur-xs shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Academic Quality</span>
              <GraduationCap className="h-4 w-4 text-blue-500" />
            </div>
            <CardTitle className="text-xs font-black uppercase text-slate-900 mt-2">CHED Compliance</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="text-2xl font-black text-slate-900 tracking-tight">{totalProgramsCount} <span className="text-[10px] text-muted-foreground font-bold">Programs</span></div>
            <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase">
              <span>With COPC</span>
              <span className="text-slate-900 font-extrabold">{copcCompliant.length} ({copcComplianceRate}%)</span>
            </div>
            <Progress value={copcComplianceRate} className="h-1 bg-blue-50" />
          </CardContent>
        </Card>

      </div>

      {/* SECTION 3: Priority alerts (Bottlenecks) */}
      {bottlenecks.length > 0 && (
        <Card className="border-rose-200/50 bg-rose-50/5 shadow-sm">
          <CardHeader className="py-3 bg-rose-500/5 border-b border-rose-200/30">
            <CardTitle className="text-xs font-black uppercase text-rose-800 tracking-wider flex items-center gap-2">
              <Flame className="h-4 w-4 text-rose-600 animate-pulse" />
              Critical EOMS Bottlenecks - Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bottlenecks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex gap-3 items-start p-3 bg-white border border-rose-100 rounded-xl shadow-xs">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      item.severity === 'high' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-800">{item.title}</span>
                        <Badge variant="outline" className={cn(
                          "text-[7px] font-black uppercase h-4 px-1.5",
                          item.severity === 'high' ? "border-rose-200 text-rose-700 bg-rose-50" : "border-amber-200 text-amber-700 bg-amber-50"
                        )}>
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-medium text-slate-500 leading-normal">{item.subtitle}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
