'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import {
  Award,
  TrendingUp,
  GraduationCap,
  BookOpen,
  FlaskConical,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Zap,
  Info,
  ChevronRight,
  Sparkles,
  Layers,
  BarChart3,
  Globe,
  Printer,
  FolderOpen,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import type {
  AcademicProgram,
  ProgramComplianceRecord,
  Submission,
  Campus,
  Unit,
  SucLevellingCycle,
  SucIndicatorSubmission,
  CorrectiveActionRequest,
  Risk,
} from '@/lib/types';
import {
  calculateBaselineKraScores,
  evaluateSucClassification,
  DEFAULT_SUC_INDICATORS,
} from '@/lib/suc-levelling-engine';
import { isAaccupAccredited } from '@/lib/aaccup-coverage';
import { Chart3DDefs } from '@/components/ui/chart-3d-defs';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { SucClaimsManagementDialog } from '@/components/suc-levelling/suc-claims-management-dialog';
import { SucTransmutationReportDialog } from '@/components/suc-levelling/suc-transmutation-report-dialog';

interface SucLevellingDashboardTabProps {
  academicPrograms: AcademicProgram[];
  allCompliances: ProgramComplianceRecord[];
  submissions: Submission[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  cars?: CorrectiveActionRequest[];
  risks?: Risk[];
}

export function SucLevellingDashboardTab({
  academicPrograms,
  allCompliances,
  submissions,
  campuses,
  units,
  selectedYear,
  cars = [],
  risks = [],
}: SucLevellingDashboardTabProps) {
  const firestore = useFirestore();
  const { systemSettings } = useUser();
  const currentProfile = systemSettings?.sucLevellingProfile;

  // Dialog States
  const [isClaimsOpen, setIsClaimsOpen] = useState(false);
  const [isTransmutationOpen, setIsTransmutationOpen] = useState(false);

  // Firestore Queries for Cycles & Submissions
  const cyclesCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingCycles') : null),
    [firestore],
  );
  const { data: cycles } = useCollection<SucLevellingCycle>(cyclesCollectionRef);

  const activeCycle = useMemo(() => {
    if (!cycles || cycles.length === 0) return null;
    return cycles.find((c) => !c.isFinalized) || cycles[0];
  }, [cycles]);

  const submissionsCollectionRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'sucLevellingSubmissions') : null),
    [firestore],
  );
  const { data: rawSucSubmissions } = useCollection<SucIndicatorSubmission>(submissionsCollectionRef);

  // Filter Submissions for active cycle
  const verifiedSubmissions = useMemo(() => {
    if (!rawSucSubmissions || !activeCycle) return [];
    return rawSucSubmissions.filter((s) => s.cycleId === activeCycle.id);
  }, [rawSucSubmissions, activeCycle]);

  // Compute Active Programs & Metrics
  const activePrograms = useMemo(() => academicPrograms.filter((p) => p.isActive !== false), [academicPrograms]);
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

  // Real institutional statistics from database
  const stats = useMemo(() => {
    let accreditedCount = 0;
    let highAccreditedCount = 0; // Level III or IV
    let boardProgramsCount = 0;
    let boardPassedAboveNational = 0;
    let copcCount = 0;
    let accreditableActiveCount = 0;

    activePrograms.forEach((p) => {
      const comp = complianceMap.get(p.id);
      if (comp?.ched?.copcStatus === 'With COPC') {
        copcCount++;
      }

      const accRecords = comp?.accreditationRecords || [];
      const current = accRecords.find((r) => r.lifecycleStatus === 'Current') || accRecords[accRecords.length - 1];
      const lvl = (current?.level || '').toLowerCase();
      if (!p.isNewProgram) accreditableActiveCount++;
      if (isAaccupAccredited(p, comp)) accreditedCount++;
      if (!p.isNewProgram && (lvl.includes('level iii') || lvl.includes('level iv'))) {
        highAccreditedCount++;
      }

      if (p.isBoardProgram) {
        boardProgramsCount++;
        const exams = comp?.boardPerformance || [];
        const latestExam = exams[exams.length - 1];
        if (latestExam && (latestExam.overallPassRate || 0) >= (latestExam.nationalPassingRate || 0)) {
          boardPassedAboveNational++;
        }
      }
    });

    const totalActive = activePrograms.length || 1;
    const accreditedRate =
      accreditableActiveCount > 0 ? Math.round((accreditedCount / accreditableActiveCount) * 100) : 0;
    const highAccreditedRate =
      accreditableActiveCount > 0 ? Math.round((highAccreditedCount / accreditableActiveCount) * 100) : 0;
    const copcRate = Math.round((copcCount / totalActive) * 100);
    const boardRate = boardProgramsCount > 0 ? Math.round((boardPassedAboveNational / boardProgramsCount) * 100) : 0;

    const totalCars = cars.length;
    const closedCars = cars.filter((c) => c.status === 'Closed').length;
    const carRate = totalCars > 0 ? Math.round((closedCars / totalCars) * 100) : 100;

    const totalRisks = risks.length;
    const treatedRisks = risks.filter((r) => r.postTreatment !== undefined || r.status === 'Closed').length;
    const riskRate = totalRisks > 0 ? Math.round((treatedRisks / totalRisks) * 100) : 100;

    const approvedSubmissions = submissions.filter((s) => s.statusId === 'approved').length;

    return {
      totalActive,
      accreditableActiveCount,
      accreditedCount,
      highAccreditedCount,
      accreditedRate,
      highAccreditedRate,
      boardProgramsCount,
      boardPassedAboveNational,
      boardRate,
      copcCount,
      copcRate,
      totalCars,
      closedCars,
      carRate,
      totalRisks,
      treatedRisks,
      riskRate,
      approvedSubmissions,
    };
  }, [activePrograms, complianceMap, submissions, cars, risks]);

  // Actual KRA Scores calculated strictly from live database collections
  const actualKraScores = useMemo(() => {
    return calculateBaselineKraScores(
      academicPrograms,
      allCompliances,
      submissions,
      selectedYear,
      verifiedSubmissions,
      cars,
      risks,
    );
  }, [academicPrograms, allCompliances, submissions, selectedYear, verifiedSubmissions, cars, risks]);

  // SUC Classification Evaluation with hard-floor rules
  const evaluation = useMemo(() => {
    return evaluateSucClassification(actualKraScores);
  }, [actualKraScores]);

  // Filter verified claims by KRA
  const verifiedKRA2Claims = useMemo(() => {
    return verifiedSubmissions.filter((s) => s.indicatorId.startsWith('KRA2'));
  }, [verifiedSubmissions]);

  const verifiedKRA3Claims = useMemo(() => {
    return verifiedSubmissions.filter((s) => s.indicatorId.startsWith('KRA3'));
  }, [verifiedSubmissions]);

  // Radar chart data comparing real earned points against ceilings & floors
  const radarData = useMemo(
    () => [
      { kra: 'KRA 1: Higher Ed', actual: actualKraScores.kra1, max: 35, floor: 22.0 },
      { kra: 'KRA 2: Research & Ext', actual: actualKraScores.kra2, max: 30, floor: 18.0 },
      { kra: 'KRA 3: Resource Mgmt', actual: actualKraScores.kra3, max: 20, floor: 12.0 },
      { kra: 'KRA 4: Governance', actual: actualKraScores.kra4, max: 15, floor: 10.0 },
    ],
    [actualKraScores],
  );

  return (
    <div className="space-y-6">
      <Chart3DDefs />

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-900 via-amber-800 to-amber-950 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-400/20 via-transparent to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400/20 text-amber-200 border-amber-300/30 text-[10px] font-black uppercase tracking-widest">
                DBM-CHED Joint Circular Framework
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-[10px] font-mono font-bold">
                AY {selectedYear}
              </Badge>
              <Badge className="bg-blue-400/20 text-blue-200 border-blue-300/30 text-[10px] font-semibold">
                Live Database Evaluated
              </Badge>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              <Award className="h-8 w-8 text-amber-400 shrink-0" />
              SUC Levelling Institutional Scorecard
            </h2>
            <p className="text-xs text-amber-100/80 leading-relaxed font-medium">
              Official institutional standing and verified task force claims evaluated strictly against DBM-CHED Joint
              Circular criteria. All metrics are derived directly from live academic programs, task force claim
              verifications, CAR resolutions, and operational submissions.
            </p>

            {/* Quick Action Buttons for Top Officials & Delivery Units */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => setIsClaimsOpen(true)}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md uppercase tracking-wider"
              >
                <FolderOpen className="mr-1.5 h-4 w-4" />
                Encode Unit Claims & MOV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsTransmutationOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 font-bold text-xs shadow-md uppercase tracking-wider"
              >
                <Printer className="mr-1.5 h-4 w-4 text-amber-300" />
                DBM-CHED Transmutation Sheet
              </Button>
              {activeCycle && (
                <Badge variant="outline" className="text-[10px] font-mono text-amber-200 border-amber-400/30">
                  Active Cycle: {activeCycle.cycleName} ({verifiedSubmissions.length} Claims)
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20">
            {currentProfile?.currentLevel && (
              <>
                <div className="text-right">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-200 block">
                    Current Official
                  </span>
                  <span className="text-2xl font-black text-amber-300">{currentProfile.currentLevel}</span>
                  <span className="text-[9px] text-amber-100/70 block font-semibold">
                    {currentProfile.officialPoints !== undefined
                      ? `${currentProfile.officialPoints.toFixed(1)} pts (Conferred)`
                      : 'DBM-CHED Conferred'}
                  </span>
                </div>
                <div className="h-10 w-px bg-white/20 hidden sm:block" />
              </>
            )}

            <div className="text-right">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 block">
                {currentProfile?.currentLevel ? 'Projected Standing' : 'Official Standing'}
              </span>
              <span className="text-2xl font-black text-white">{evaluation.achievedLevel}</span>
              <span className="text-[9px] text-emerald-100/70 block font-semibold">
                {actualKraScores.total} / 100 Points
              </span>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300 block">
                {currentProfile?.targetNextLevel
                  ? `Target: ${currentProfile.targetNextLevel}`
                  : evaluation.nextLevelName
                    ? `Target: ${evaluation.nextLevelName}`
                    : 'Top Tier'}
              </span>
              <span className="text-2xl font-black text-emerald-300">
                {evaluation.pointsToNextLevel > 0 ? `+${evaluation.pointsToNextLevel}` : '0'} pts
              </span>
              <span className="text-[9px] text-emerald-100/80 block font-semibold">
                {evaluation.isDemotedByFloor ? 'KRA Floor Deficit' : 'Points to next level'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hard Floor Deficit Alert (Decision Support) */}
      {evaluation.deficits.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  Hard-Floor Minimum Point Criterion Notice
                </span>
                <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[9px] font-bold">
                  {evaluation.deficits.length} Area{evaluation.deficits.length > 1 ? 's' : ''} Below Floor
                </Badge>
              </div>
              {evaluation.isDemotedByFloor && (
                <Badge variant="destructive" className="text-[9px] font-black uppercase">
                  Nominal {evaluation.nominalLevel} Demoted to {evaluation.achievedLevel}
                </Badge>
              )}
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Under DBM-CHED Joint Circular rules, a State University must satisfy both the total point threshold AND
              the required minimum points across all four Key Result Areas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
              {evaluation.deficits.map((def) => (
                <div
                  key={def.kraCode}
                  className="text-[11px] bg-white/90 dark:bg-slate-900/80 p-2.5 rounded-lg border border-amber-200 space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <strong className="text-slate-900 dark:text-white font-bold">{def.kraTitle}:</strong>
                    <span className="text-rose-600 font-bold text-xs">
                      {def.earnedPoints} / {def.requiredMinimum} pts
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-600 dark:text-slate-400">{def.recommendedAction}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4 KRA Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KRA 1 */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[8px] font-black uppercase">
                Max 35 Pts
              </Badge>
              <GraduationCap className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2">
              KRA 1: Higher & Advanced Ed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-blue-700">{actualKraScores.kra1}</span>
              <span className="text-[10px] font-bold text-slate-400">/ 35.0 pts</span>
            </div>
            <Progress value={(actualKraScores.kra1 / 35) * 100} className="h-2 bg-blue-100" />
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>Accredited Programs:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {stats.accreditedCount}/{stats.accreditableActiveCount} ({stats.accreditedRate}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>High Level (III & IV):</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {stats.highAccreditedCount}/{stats.accreditableActiveCount} ({stats.highAccreditedRate}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>PRC Board Pass &gt; Nat'l:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {stats.boardPassedAboveNational}/{stats.boardProgramsCount}
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KRA 2 */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[8px] font-black uppercase">
                Max 30 Pts
              </Badge>
              <FlaskConical className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2">
              KRA 2: Research & Extension
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-700">{actualKraScores.kra2}</span>
              <span className="text-[10px] font-bold text-slate-400">/ 30.0 pts</span>
            </div>
            <Progress value={(actualKraScores.kra2 / 30) * 100} className="h-2 bg-emerald-100" />
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>Approved Submissions:</span>
                <strong className="text-slate-800 dark:text-slate-200">{stats.approvedSubmissions} reports</strong>
              </div>
              <div className="flex justify-between">
                <span>Verified KRA 2 Claims:</span>
                <strong className="text-slate-800 dark:text-slate-200">{verifiedKRA2Claims.length} recorded</strong>
              </div>
              <div className="flex justify-between">
                <span>Database Source:</span>
                <strong className="text-slate-800 dark:text-slate-200">Active Task Force Dossier</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KRA 3 */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[8px] font-black uppercase">
                Max 20 Pts
              </Badge>
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2">
              KRA 3: Management of Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-purple-700">{actualKraScores.kra3}</span>
              <span className="text-[10px] font-bold text-slate-400">/ 20.0 pts</span>
            </div>
            <Progress value={(actualKraScores.kra3 / 20) * 100} className="h-2 bg-purple-100" />
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>Delivery Unit Submissions:</span>
                <strong className="text-slate-800 dark:text-slate-200">{submissions.length} reports</strong>
              </div>
              <div className="flex justify-between">
                <span>Verified KRA 3 Claims:</span>
                <strong className="text-slate-800 dark:text-slate-200">{verifiedKRA3Claims.length} recorded</strong>
              </div>
              <div className="flex justify-between">
                <span>Campuses Monitored:</span>
                <strong className="text-slate-800 dark:text-slate-200">{campuses.length} Campuses</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KRA 4 */}
        <Card className="border-rose-200 bg-gradient-to-br from-rose-50/50 to-white dark:from-rose-950/20 dark:to-slate-900 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[8px] font-black uppercase">
                Max 15 Pts
              </Badge>
              <ShieldCheck className="h-5 w-5 text-rose-600" />
            </div>
            <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-2">
              KRA 4: Sound Governance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black text-rose-700">{actualKraScores.kra4}</span>
              <span className="text-[10px] font-bold text-slate-400">/ 15.0 pts</span>
            </div>
            <Progress value={(actualKraScores.kra4 / 15) * 100} className="h-2 bg-rose-100" />
            <div className="text-[10px] text-slate-500 space-y-0.5 pt-1">
              <div className="flex justify-between">
                <span>CARs Resolution:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {stats.closedCars}/{stats.totalCars} ({stats.carRate}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Risk Treatments:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {stats.treatedRisks}/{stats.totalRisks} ({stats.riskRate}%)
                </strong>
              </div>
              <div className="flex justify-between">
                <span>EOMS ISO 21001:2025:</span>
                <strong className="text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                  <CheckCircle2 className="h-3 w-3" /> Implemented
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis & Evidence Dossier Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar & Criteria Breakdown (7 Cols) */}
        <Card className="lg:col-span-7 border-slate-200 dark:border-slate-800 shadow-sm">
          <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/40 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  SUC Levelling Dimension Matrix
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Comparison between live institutional score, DBM-CHED ceilings, and Level IV minimum floors
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono font-bold">
                Max 100 Points
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="kra" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 35]} stroke="#cbd5e1" />
                  <Radar
                    name="Earned Score (Database)"
                    dataKey="actual"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.4}
                  />
                  <Radar
                    name="Level IV Hard-Floor"
                    dataKey="floor"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.15}
                  />
                  <Legend />
                  <RechartsTooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Threshold Guide */}
            <div className="mt-4 pt-4 border-t grid grid-cols-5 gap-2 text-center">
              <div
                className={`p-2 rounded-lg border ${evaluation.achievedLevel === 'Level I' ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-400' : 'bg-slate-50 border-slate-200'}`}
              >
                <span className="text-[9px] font-bold text-slate-500 block">Level I</span>
                <span className="text-xs font-black text-slate-700">0 - 24</span>
                {evaluation.achievedLevel === 'Level I' && (
                  <span className="text-[7px] font-black uppercase text-slate-600 block mt-0.5">ACTIVE</span>
                )}
              </div>
              <div
                className={`p-2 rounded-lg border ${evaluation.achievedLevel === 'Level II' ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400' : 'bg-slate-50 border-slate-200'}`}
              >
                <span className="text-[9px] font-bold text-slate-500 block">Level II</span>
                <span className="text-xs font-black text-slate-700">25 - 44</span>
                {evaluation.achievedLevel === 'Level II' && (
                  <span className="text-[7px] font-black uppercase text-amber-700 block mt-0.5">ACTIVE</span>
                )}
              </div>
              <div
                className={`p-2 rounded-lg border ${evaluation.achievedLevel === 'Level III' ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-500' : 'bg-slate-50 border-slate-200'}`}
              >
                <span className="text-[9px] font-bold text-blue-700 block">Level III</span>
                <span className="text-xs font-black text-blue-900">45 - 64</span>
                {evaluation.achievedLevel === 'Level III' && (
                  <span className="text-[7px] font-black uppercase text-blue-600 block mt-0.5">ACTIVE</span>
                )}
              </div>
              <div
                className={`p-2 rounded-lg border ${evaluation.achievedLevel === 'Level IV' ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500' : 'bg-slate-50 border-slate-200'}`}
              >
                <span className="text-[9px] font-bold text-emerald-700 block">Level IV</span>
                <span className="text-xs font-black text-emerald-900">65 - 84</span>
                {evaluation.achievedLevel === 'Level IV' && (
                  <span className="text-[7px] font-black uppercase text-emerald-600 block mt-0.5">ACTIVE</span>
                )}
              </div>
              <div
                className={`p-2 rounded-lg border ${evaluation.achievedLevel === 'Level V' ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-500' : 'bg-slate-50 border-slate-200'}`}
              >
                <span className="text-[9px] font-bold text-purple-700 block">Level V</span>
                <span className="text-xs font-black text-purple-900">85 - 100</span>
                {evaluation.achievedLevel === 'Level V' && (
                  <span className="text-[7px] font-black uppercase text-purple-600 block mt-0.5">ACTIVE</span>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/5 border-t py-4 px-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                <strong>Dimension Matrix Interpretation:</strong> This multi-axis matrix compares earned institutional
                points (blue) against the mandatory hard-floor ceilings (amber) stipulated under DBM-CHED Joint Circular
                No. 1, s. 2016 for Level IV qualification. To achieve and maintain Level IV status, the university must
                not only surpass the aggregate 65-point composite threshold but also satisfy minimum individual point
                floors across all four Key Result Areas, preventing over-reliance on a single dimension.
              </p>
            </div>
          </CardFooter>
        </Card>

        {/* Institutional Evidence & Verified Claims Dossier (5 Cols) */}
        <Card className="lg:col-span-5 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
                  Verified Claims & Audit Trail
                </CardTitle>
              </div>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[9px] font-mono font-bold">
                {verifiedSubmissions.length} Recorded
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Official indicator claims and documentary evidence submitted in Firestore
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 flex-1">
            {verifiedSubmissions.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Unit Claims Encoded Yet</h4>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                    SUC Levelling baseline is currently computed from institutional programs, CARs, and unit reports.
                    Encode verified indicator claims to claim official points.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsClaimsOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  Encode Unit Claim & MOV
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {verifiedSubmissions.map((sub) => {
                  const definition = DEFAULT_SUC_INDICATORS.find((d) => d.id === sub.indicatorId);
                  const isVerified = sub.validationStatus === 'Verified';
                  const isPending = sub.validationStatus === 'Pending';
                  const pts = sub.validatedPoints !== undefined ? sub.validatedPoints : sub.selfAwardedPoints || 0;
                  const firstMov = sub.movDriveLinks?.[0];
                  const driveUrl = firstMov?.directViewLink || firstMov?.driveFolderUrl;

                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300"
                            >
                              {definition?.code || sub.indicatorId}
                            </Badge>
                            <Badge
                              className={
                                isVerified
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[8px] font-bold'
                                  : isPending
                                    ? 'bg-amber-100 text-amber-800 border-amber-200 text-[8px] font-bold'
                                    : 'bg-rose-100 text-rose-800 border-rose-200 text-[8px] font-bold'
                              }
                            >
                              {isVerified ? 'Validated' : isPending ? 'Under Review' : 'Rejected'}
                            </Badge>
                          </div>
                          <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                            {definition?.title || sub.indicatorId}
                          </h5>
                        </div>
                        <span className="text-xs font-black text-emerald-600 whitespace-nowrap">
                          +{pts.toFixed(2)} pts
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span>
                          Claim: {sub.numeratorValue} {sub.denominatorValue ? `/ ${sub.denominatorValue}` : ''}
                        </span>
                        {driveUrl ? (
                          <a
                            href={driveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold"
                          >
                            <FileCheck className="h-3 w-3" />
                            Official MOV
                          </a>
                        ) : (
                          <span className="text-slate-400 italic">No MOV linked</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>

          <CardFooter className="bg-slate-50/70 dark:bg-slate-900/60 border-t p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2.5 text-slate-500">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                <strong>Audit Trail Interpretation:</strong> Each logged claim represents an institutional
                accomplishment score validated against DBM-CHED criteria. Official Means of Verification (MOVs) linked
                here form the verifiable documentary portfolio subjected to regional and national evaluation teams,
                guaranteeing that point assertions remain defensible during on-site and remote levelling validations.
              </p>
            </div>
            <div className="w-full flex justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransmutationOpen(true)}
                className="text-[11px] font-bold text-slate-700 dark:text-slate-300"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Transmutation Sheet
              </Button>
              <Button
                size="sm"
                onClick={() => setIsClaimsOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px]"
              >
                <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                Encode New Claim
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* SUC Claims & MOV Hub Dialog */}
      <SucClaimsManagementDialog
        open={isClaimsOpen}
        onOpenChange={setIsClaimsOpen}
        campuses={campuses}
        units={units}
        activeYear={selectedYear}
      />

      {/* Official Printable DBM-CHED Transmutation Sheet */}
      <SucTransmutationReportDialog
        open={isTransmutationOpen}
        onOpenChange={setIsTransmutationOpen}
        cycle={activeCycle}
        scores={{
          kra1: actualKraScores.kra1,
          kra2: actualKraScores.kra2,
          kra3: actualKraScores.kra3,
          kra4: actualKraScores.kra4,
          total: actualKraScores.total,
        }}
        submissions={verifiedSubmissions}
      />
    </div>
  );
}
