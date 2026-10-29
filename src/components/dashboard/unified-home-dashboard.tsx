'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LayoutDashboard,
  Compass,
  Award,
  GraduationCap,
  ShieldCheck,
  Layers,
  AlertTriangle,
  Building2,
  Printer,
  ExternalLink,
  Briefcase,
  Settings,
  ArrowRight,
  Target,
  Landmark,
} from 'lucide-react';
import type {
  Submission,
  Risk,
  CorrectiveActionRequest,
  ProgramComplianceRecord,
  AcademicProgram,
  AuditSchedule,
  Unit,
  Campus,
  Cycle,
  User as AppUser,
  ArchipelagicStatements,
} from '@/lib/types';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from '@/firebase/firestore-wrapper';
import { ArchipelagicIntelligenceTab } from '@/components/dashboard/executive/archipelagic-intelligence-tab';
import { SucLevellingDashboardTab } from '@/components/dashboard/strategic/suc-levelling-dashboard-tab';
import { ChedMonitoringView } from '@/components/programs/ched-monitoring-view';
import { ChedIsaDashboardTab } from '@/components/dashboard/strategic/ched-isa-dashboard-tab';
import { AccreditationPerformanceTab } from '@/components/dashboard/executive/accreditation-performance-tab';
import { ExecutiveRiskIntelligence } from '@/components/dashboard/executive/executive-risk-intelligence';
import { IslandCampusEquityTab } from '@/components/dashboard/strategic/island-campus-equity-tab';
import { ExecutiveOverview } from '@/components/dashboard/executive-overview';
import { KpiDashboardTab } from '@/components/dashboard/kpi-dashboard-tab';
import { DashboardDataReviewRibbon } from '@/components/dashboard/dashboard-data-review-ribbon';
import { UnifiedDashboardPrintTemplate } from '@/components/dashboard/unified-dashboard-print-template';
import { openInstitutionalPrintPreview } from '@/lib/print-preview';
import { useToast } from '@/hooks/use-toast';
import { getUnitProgramsChedWarnings } from '@/lib/ched-compliance-warnings';
import { calculateAaccupCoverage } from '@/lib/aaccup-coverage';
import { calculateBaselineKraScores, evaluateSucClassification } from '@/lib/suc-levelling-engine';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DASHBOARD_TAB_LABELS: Record<string, string> = {
  overview: '1. Executive Overview',
  'archipelagic-intelligence': '2. Archipelagic Intelligence (AQ)',
  'suc-levelling': '3. SUC Levelling',
  'ched-monitoring': '4. CHED Program Monitoring',
  eoms: '5. EOMS (ISO 21001:2025)',
  'ched-isa': '6. CHED ISA',
  aaccup: '7. AACCUP Accreditation',
  'risk-intelligence': '8. Risk Intelligence',
  'campus-equity': '9. Island Campus Equity',
  kpis: '10. KPIs & Scorecards',
};

const DASHBOARD_PRINT_EXTRA_CSS = `
    #print-content { width: 100%; }
    #print-content *, #print-content *::before, #print-content *::after {
      animation: none !important;
      transition: none !important;
    }
    #print-content .sticky {
      position: static !important;
      top: auto !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      backdrop-filter: none !important;
    }
    #print-content .institutional-header {
      background: #fff !important;
      border-bottom: 1px solid #cbd5e1 !important;
    }
    #print-content [data-radix-scroll-area-viewport] {
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }
    #print-content div:has(> [data-radix-scroll-area-viewport]) {
      overflow: visible !important;
      height: auto !important;
      max-height: none !important;
    }
    #print-content [data-radix-scroll-area-scrollbar] { display: none !important; }
    #print-content button, #print-content select, #print-content textarea,
    #print-content input, #print-content [role="tablist"] { display: none !important; }
    #print-content table { width: 100% !important; font-size: 8pt; }
    #print-content thead { display: table-header-group; }
    #print-content tr, #print-content svg, #print-content .recharts-wrapper,
    #print-content .recharts-responsive-container { break-inside: avoid; page-break-inside: avoid; }
    #print-content svg { max-width: 100% !important; height: auto !important; }
    #print-content img { max-width: 100%; }
    #print-content a { color: inherit !important; text-decoration: none !important; }
    .print-heading { break-after: avoid; page-break-after: avoid; }
`;

export interface UnifiedHomeDashboardProps {
  submissions: Submission[];
  risks: Risk[];
  cars: CorrectiveActionRequest[];
  allCompliances: ProgramComplianceRecord[];
  academicPrograms: AcademicProgram[];
  schedules: AuditSchedule[];
  units: Unit[];
  campuses: Campus[];
  cycles?: Cycle[];
  selectedYear: number;
  defaultTab?: string;
  allowWorkspaceSwitch?: boolean;
  onSwitchToWorkspace?: () => void;
  userRole?: string | null;
  isAdmin?: boolean;
  initialScope?: 'university' | 'unit';
  userProfile?: AppUser | null;
  reviewableUnitIds?: string[];
}

export function UnifiedHomeDashboard({
  submissions = [],
  risks = [],
  cars = [],
  allCompliances = [],
  academicPrograms = [],
  schedules = [],
  units = [],
  campuses = [],
  cycles = [],
  selectedYear,
  defaultTab = 'overview',
  allowWorkspaceSwitch = true,
  onSwitchToWorkspace,
  userRole,
  isAdmin,
  initialScope = 'university',
  userProfile,
  reviewableUnitIds = [],
}: UnifiedHomeDashboardProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || 'overview');
  const [scope, setScope] = useState<'university' | 'unit'>(initialScope);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(userProfile?.unitId || units?.[0]?.id || '');
  const dashboardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const statementsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'archipelagicStatements') : null),
    [firestore],
  );
  const { data: archipelagicStatements, isLoading: isLoadingStatements } =
    useDoc<ArchipelagicStatements>(statementsRef);

  const currentUnit = useMemo(() => {
    return units.find((u) => u.id === selectedUnitId);
  }, [units, selectedUnitId]);
  const canSelectAnyUnit =
    isAdmin ||
    userRole?.toLowerCase()?.includes('director') ||
    userRole?.toLowerCase()?.includes('supervisor') ||
    userRole?.toLowerCase()?.includes('vice president') ||
    userRole?.toLowerCase()?.includes('president');
  const availableUnitOptions = canSelectAnyUnit
    ? units
    : units.filter((unit) => unit.id === userProfile?.unitId || reviewableUnitIds.includes(unit.id));

  useEffect(() => {
    if (!canSelectAnyUnit && availableUnitOptions.length === 1 && selectedUnitId !== availableUnitOptions[0].id) {
      setSelectedUnitId(availableUnitOptions[0].id);
    }
  }, [availableUnitOptions, canSelectAnyUnit, selectedUnitId]);

  // Filter metrics and datasets when in unit scope
  const scopedSubmissions = useMemo(() => {
    if (scope === 'university') return submissions;
    return submissions.filter((s) => s.unitId === selectedUnitId);
  }, [submissions, scope, selectedUnitId]);

  const scopedCars = useMemo(() => {
    if (scope === 'university') return cars;
    return cars.filter(
      (c) => c.unitId === selectedUnitId || c.assignedUnits?.some((au) => au.unitId === selectedUnitId),
    );
  }, [cars, scope, selectedUnitId]);

  const scopedRisks = useMemo(() => {
    if (scope === 'university') return risks;
    return risks.filter((r) => r.unitId === selectedUnitId);
  }, [risks, scope, selectedUnitId]);

  const scopedPrograms = useMemo(() => {
    if (scope === 'university') return academicPrograms;
    if (!currentUnit) return academicPrograms;
    const campusList = currentUnit.campusIds || [];
    const progs = academicPrograms.filter((p) => campusList.includes(p.campusId));
    return progs.length > 0 ? progs : academicPrograms;
  }, [academicPrograms, scope, currentUnit]);

  // Compute key executive pulse metrics
  const executivePulse = useMemo(() => {
    const activeProgs = scopedPrograms.filter((p) => p.isActive !== false);
    const totalPrograms = activeProgs.length;

    // Compliance lookup
    const complianceMap = new Map<string, ProgramComplianceRecord>();
    allCompliances.forEach((c) => {
      if (!complianceMap.has(c.programId) || c.academicYear === selectedYear) {
        complianceMap.set(c.programId, c);
      }
    });

    let copcCount = 0;

    activeProgs.forEach((p) => {
      const comp = complianceMap.get(p.id);
      if (comp?.ched?.copcStatus === 'With COPC') copcCount++;
    });

    const copcRate = totalPrograms > 0 ? Math.round((copcCount / totalPrograms) * 100) : 0;
    const aaccupCoverage = calculateAaccupCoverage(activeProgs, complianceMap);

    // Warnings & Enrollment from CHED Engine
    const warningSummary = getUnitProgramsChedWarnings(activeProgs, allCompliances, selectedYear);
    const totalRecordedStudents = warningSummary.summaries.reduce(
      (sum, s) => sum + (s.enrollmentSummary.firstSemCount || s.enrollmentSummary.secondSemCount || 0),
      0,
    );

    // CARs resolution rate
    const totalCars = scopedCars.length;
    const closedCars = scopedCars.filter((c) => c.status === 'Closed').length;
    const carResolutionRate = totalCars > 0 ? Math.round((closedCars / totalCars) * 100) : 100;

    // High Risks
    const highRisksCount = scopedRisks.filter(
      (r) => (r.preTreatment?.rating === 'High' || r.preTreatment?.rating === 'Very High') && r.status !== 'Closed',
    ).length;

    // Live SUC Levelling Evaluation from real database metrics
    const baselineSuc = calculateBaselineKraScores(
      scopedPrograms,
      allCompliances,
      scopedSubmissions,
      selectedYear,
      undefined,
      scopedCars,
      scopedRisks,
    );
    const sucEval = evaluateSucClassification(baselineSuc);

    return {
      totalPrograms,
      copcCount,
      copcRate,
      accreditedCount: aaccupCoverage.accreditedCount,
      accreditedRate: aaccupCoverage.rate,
      accreditableProgramCount: aaccupCoverage.eligibleCount,
      totalRecordedStudents,
      warningCount: warningSummary.warningProgramsCount,
      totalCars,
      closedCars,
      carResolutionRate,
      highRisksCount,
      sucLevel: sucEval.achievedLevel,
      sucScore: sucEval.totalScore,
    };
  }, [scopedPrograms, allCompliances, scopedCars, scopedRisks, scopedSubmissions, selectedYear]);

  const handlePrintBriefing = () => {
    const dashboardNode = dashboardRef.current;
    if (!dashboardNode) {
      toast({
        title: 'Print unavailable',
        description: 'The dashboard is not ready yet. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const clone = dashboardNode.cloneNode(true) as HTMLElement;

      clone
        .querySelectorAll('[role="tablist"], button, select, textarea, input, [role="combobox"], [data-print-hide]')
        .forEach((node) => node.remove());
      clone.querySelectorAll('[role="tabpanel"][data-state="inactive"]').forEach((node) => node.remove());
      clone.querySelectorAll('[data-radix-scroll-area-scrollbar]').forEach((node) => node.remove());
      clone.querySelectorAll('.sticky').forEach((node) => {
        const element = node as HTMLElement;
        element.style.position = 'static';
        element.style.top = 'auto';
      });

      const activeTabLabel = DASHBOARD_TAB_LABELS[activeTab] || 'Dashboard Briefing';
      const generatedAt = new Date();
      const generatedBy = userProfile
        ? [userProfile.firstName, userProfile.lastName].filter(Boolean).join(' ').trim()
        : '';

      const reportHtml = renderToStaticMarkup(
        <UnifiedDashboardPrintTemplate
          activeTabLabel={activeTabLabel}
          scope={scope}
          unitName={currentUnit?.name}
          selectedYear={selectedYear}
          generatedBy={generatedBy || undefined}
          generatedAt={generatedAt}
          contentHtml={clone.outerHTML}
        />,
      );

      const documentTitle = `${
        scope === 'university' ? 'Institutional' : 'Unit'
      } Briefing — ${activeTabLabel} — AY ${selectedYear}`;

      const printWindow = openInstitutionalPrintPreview({
        title: documentTitle,
        contentHtml: reportHtml,
        pageSize: '13in 8.5in',
        previewWidth: '13in',
        toolbarLabel: 'Print / Save as PDF',
        description: 'Preview the briefing below, then print or save it as a PDF.',
        extraCss: DASHBOARD_PRINT_EXTRA_CSS,
      });

      if (!printWindow) {
        toast({
          title: 'Print window blocked',
          description: 'Allow pop-ups for this site to generate the printable briefing.',
          variant: 'destructive',
        });
        return;
      }
    } catch (error) {
      console.error('Failed to generate dashboard print briefing', error);
      toast({
        title: 'Print generation failed',
        description: 'An error occurred while building the printable briefing. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Tabs ref={dashboardRef} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      {/* Institutional Top Control Bar */}
      <div className="sticky top-0 z-30 pt-2 pb-3 -mx-4 px-4 lg:-mx-8 lg:px-8 bg-background/95 backdrop-blur-md border-b institutional-header space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px] font-black uppercase tracking-wider">
                {scope === 'university' ? 'Institutional Decision Support' : 'Delivery Unit Operations'}
              </Badge>
              <Badge
                variant="outline"
                className="text-emerald-700 border-emerald-300 bg-emerald-50 text-[9px] font-bold"
              >
                AY {selectedYear}
              </Badge>
              <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                Romblon State University EOMS
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100 mt-1">
              {scope === 'university' ? 'Unified Institutional Home Dashboard' : 'Unit Operations & Decision Dashboard'}
            </h1>
            {scope === 'unit' && currentUnit && (
              <p className="text-xs text-slate-500 font-semibold mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span>
                  Unit View: <strong className="text-slate-800 dark:text-slate-200">{currentUnit.name}</strong>
                </span>
              </p>
            )}
          </div>

          {/* Quick Actions, Scope Switcher & Workspace Switcher */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Prominent Scope Switcher (Institutional vs Unit) */}
            <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg border border-slate-300/60 dark:border-slate-700">
              <Button
                type="button"
                variant={scope === 'university' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScope('university')}
                className={cn(
                  'h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all gap-1.5',
                  scope === 'university' && 'bg-primary text-primary-foreground shadow-sm',
                )}
              >
                <Landmark className="h-3 w-3" />
                <span>Institutional</span>
              </Button>
              <Button
                type="button"
                variant={scope === 'unit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setScope('unit')}
                className={cn(
                  'h-7 px-2.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all gap-1.5',
                  scope === 'unit' && 'bg-primary text-primary-foreground shadow-sm',
                )}
              >
                <Building2 className="h-3 w-3" />
                <span>Unit View</span>
              </Button>
            </div>

            {/* If in unit scope, allow selection if Admin/Supervisor or show unit name badge */}
            {scope === 'unit' && (
              <>
                {canSelectAnyUnit || availableUnitOptions.length > 1 ? (
                  <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                    <SelectTrigger className="h-8 text-xs font-bold w-[200px] bg-white dark:bg-slate-900 border-slate-300">
                      <SelectValue placeholder="Select Unit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnitOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-8 px-2.5 text-xs font-bold bg-white dark:bg-slate-900 border-primary/30 text-primary"
                  >
                    {currentUnit?.name || 'Assigned Unit'}
                  </Badge>
                )}
              </>
            )}

            {allowWorkspaceSwitch && onSwitchToWorkspace && (
              <Button
                onClick={onSwitchToWorkspace}
                variant="outline"
                size="sm"
                className="h-8 text-xs font-black uppercase tracking-wider gap-1.5 border-slate-300 hover:bg-slate-100"
              >
                <Briefcase className="h-3.5 w-3.5 text-primary" />
                <span>My Unit Workspace</span>
              </Button>
            )}

            {isAdmin && (
              <Link href="/settings?tab=home-dashboard">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-bold uppercase tracking-wider gap-1 text-slate-600 hover:text-primary"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            )}

            <Button
              onClick={handlePrintBriefing}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-black uppercase tracking-wider gap-1 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print Briefing</span>
            </Button>
          </div>
        </div>

        <DashboardDataReviewRibbon
          scope={scope}
          selectedUnitId={selectedUnitId}
          selectedYear={selectedYear}
          units={units}
          submissions={submissions}
          risks={risks}
          cars={cars}
          compliances={allCompliances}
          programs={academicPrograms}
          schedules={schedules}
        />

        {/* 9 Framework Tabs Navigation List */}
        <ScrollArea className="w-full">
          <TabsList className="bg-muted p-1 border shadow-sm w-max min-w-max h-10 animate-tab-highlight rounded-md whitespace-nowrap">
            <TabsTrigger
              value="overview"
              onClick={() => setActiveTab('overview')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-indigo-600" />
              1. Overview
            </TabsTrigger>

            <TabsTrigger
              value="archipelagic-intelligence"
              onClick={() => setActiveTab('archipelagic-intelligence')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-sky-600" />
              2. Archipelagic Intelligence (AQ)
            </TabsTrigger>

            <TabsTrigger
              value="suc-levelling"
              onClick={() => setActiveTab('suc-levelling')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Award className="h-3.5 w-3.5 text-amber-600" />
              3. SUC Levelling
            </TabsTrigger>

            <TabsTrigger
              value="ched-monitoring"
              onClick={() => setActiveTab('ched-monitoring')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />
              4. CHED Program Monitoring
              {executivePulse.warningCount > 0 && (
                <span className="ml-1 px-1 py-0.2 rounded-full text-[8px] bg-amber-500 text-white font-mono font-bold">
                  {executivePulse.warningCount}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="eoms"
              onClick={() => setActiveTab('eoms')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              5. EOMS (ISO 21001:2025)
            </TabsTrigger>

            <TabsTrigger
              value="ched-isa"
              onClick={() => setActiveTab('ched-isa')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Layers className="h-3.5 w-3.5 text-purple-600" />
              6. CHED ISA
            </TabsTrigger>

            <TabsTrigger
              value="aaccup"
              onClick={() => setActiveTab('aaccup')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Award className="h-3.5 w-3.5 text-rose-600" />
              7. AACCUP Accreditation
            </TabsTrigger>

            <TabsTrigger
              value="risk-intelligence"
              onClick={() => setActiveTab('risk-intelligence')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
              8. Risk Intelligence
            </TabsTrigger>

            <TabsTrigger
              value="campus-equity"
              onClick={() => setActiveTab('campus-equity')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-teal-600" />
              9. Island Campus Equity
            </TabsTrigger>

            <TabsTrigger
              value="kpis"
              onClick={() => setActiveTab('kpis')}
              className="text-[10px] font-black uppercase tracking-wider px-3.5 h-8 gap-1.5"
            >
              <Target className="h-3.5 w-3.5 text-indigo-600" />
              10. KPIs & Scorecards
            </TabsTrigger>
          </TabsList>
        </ScrollArea>
      </div>

      {/* TAB 1: OVERVIEW */}
      <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-300">
        {/* Archipelagic University Institutional Statements */}
        <section aria-label="University vision, mission, and quality policy">
          <div className="mb-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">Our Institutional Identity</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
              Bridging Islands, Building Futures.
            </h2>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
            <Card className="group overflow-hidden rounded-2xl border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-indigo-100/70 text-center shadow-sm transition-shadow hover:shadow-lg dark:border-indigo-900 dark:from-indigo-950/70 dark:via-slate-950 dark:to-indigo-900/40">
              <div className="h-1.5 bg-indigo-600" />
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-indigo-800 dark:text-indigo-300">
                  <Target className="h-4 w-4" />
                  Archipelagic University Vision
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-7">
                {isLoadingStatements ? (
                  <div className="space-y-3 py-2">
                    <div className="h-5 w-full animate-pulse rounded bg-indigo-200/70 dark:bg-indigo-800/60" />
                    <div className="h-5 w-5/6 animate-pulse rounded bg-indigo-200/70 dark:bg-indigo-800/60" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-indigo-200/70 dark:bg-indigo-800/60" />
                  </div>
                ) : (
                  <p className="text-lg font-bold leading-relaxed text-indigo-950 dark:text-indigo-100 sm:text-xl">
                    {archipelagicStatements?.vision?.trim() || 'No vision statement has been set yet.'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="group overflow-hidden rounded-2xl border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 text-center shadow-sm transition-shadow hover:shadow-lg dark:border-emerald-900 dark:from-emerald-950/70 dark:via-slate-950 dark:to-emerald-900/40">
              <div className="h-1.5 bg-emerald-600" />
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  <Compass className="h-4 w-4" />
                  Archipelagic University Mission
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-7">
                {isLoadingStatements ? (
                  <div className="space-y-3 py-2">
                    <div className="h-5 w-full animate-pulse rounded bg-emerald-200/70 dark:bg-emerald-800/60" />
                    <div className="h-5 w-5/6 animate-pulse rounded bg-emerald-200/70 dark:bg-emerald-800/60" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-emerald-200/70 dark:bg-emerald-800/60" />
                  </div>
                ) : (
                  <p className="text-lg font-bold leading-relaxed text-emerald-950 dark:text-emerald-100 sm:text-xl">
                    {archipelagicStatements?.mission?.trim() || 'No mission statement has been set yet.'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="group overflow-hidden rounded-2xl border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100/70 text-center shadow-sm transition-shadow hover:shadow-lg dark:border-amber-900 dark:from-amber-950/70 dark:via-slate-950 dark:to-amber-900/40">
              <div className="h-1.5 bg-amber-500" />
              <CardHeader className="pb-2 pt-6">
                <CardTitle className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  <ShieldCheck className="h-4 w-4" />
                  Archipelagic University Quality Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-7">
                {isLoadingStatements ? (
                  <div className="space-y-3 py-2">
                    <div className="h-5 w-full animate-pulse rounded bg-amber-200/70 dark:bg-amber-800/60" />
                    <div className="h-5 w-5/6 animate-pulse rounded bg-amber-200/70 dark:bg-amber-800/60" />
                    <div className="h-5 w-2/3 animate-pulse rounded bg-amber-200/70 dark:bg-amber-800/60" />
                  </div>
                ) : (
                  <p className="text-lg font-bold leading-relaxed text-amber-950 dark:text-amber-100 sm:text-xl">
                    {archipelagicStatements?.qualityPolicy?.trim() || 'No quality policy statement has been set yet.'}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Executive Highlight Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="p-3 border-indigo-200 bg-indigo-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-indigo-700 tracking-wider block">
              Active Programs
            </span>
            <span className="text-xl font-black text-slate-800 dark:text-slate-100">
              {executivePulse.totalPrograms}
            </span>
            <span className="text-[9px] text-slate-500 block">Across 8 Campuses</span>
          </Card>

          <Card className="p-3 border-emerald-200 bg-emerald-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider block">
              COPC Compliance
            </span>
            <span className="text-xl font-black text-emerald-700">{executivePulse.copcRate}%</span>
            <span className="text-[9px] text-slate-500 block">{executivePulse.copcCount} Awarded</span>
          </Card>

          <Card className="p-3 border-rose-200 bg-rose-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-rose-700 tracking-wider block">
              AACCUP Accredited
            </span>
            <span className="text-xl font-black text-rose-700">{executivePulse.accreditedRate}%</span>
            <span className="text-[9px] text-slate-500 block">
              {executivePulse.accreditedCount}/{executivePulse.accreditableProgramCount} eligible programs
            </span>
          </Card>

          <Card className="p-3 border-amber-200 bg-amber-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-amber-700 tracking-wider block">SUC Levelling</span>
            <span className="text-xl font-black text-amber-700">{executivePulse.sucLevel}</span>
            <span className="text-[9px] text-slate-500 block">{executivePulse.sucScore.toFixed(1)} / 100 Pts</span>
          </Card>

          <Card className="p-3 border-blue-200 bg-blue-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-blue-700 tracking-wider block">CAR Resolution</span>
            <span className="text-xl font-black text-blue-700">{executivePulse.carResolutionRate}%</span>
            <span className="text-[9px] text-slate-500 block">
              {executivePulse.closedCars}/{executivePulse.totalCars} Closed
            </span>
          </Card>

          <Card className="p-3 border-orange-200 bg-orange-50/40 shadow-sm">
            <span className="text-[9px] font-black uppercase text-orange-700 tracking-wider block">
              Data Gaps & Warnings
            </span>
            <span className="text-xl font-black text-orange-700">{executivePulse.warningCount}</span>
            <span className="text-[9px] text-slate-500 block">CHED Student Warnings</span>
          </Card>
        </div>

        {/* Institutional Crosswalk Banner */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-400/30 text-[9px] font-black uppercase">
                Institutional Alignment Matrix
              </Badge>
              <h3 className="text-base font-black uppercase tracking-tight text-white">
                Cross-Framework Institutional Decision-Making
              </h3>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Every metric in the RSU EOMS feeds directly into national regulatory frameworks:
                <strong className="text-amber-300"> SUC Levelling</strong> (DBM-CHED),
                <strong className="text-emerald-300"> CHED COPC & Student Monitoring</strong>,
                <strong className="text-blue-300"> EOMS ISO 21001:2025</strong>,
                <strong className="text-purple-300"> CHED ISA</strong>, and
                <strong className="text-rose-300"> AACCUP Accreditation</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setActiveTab('suc-levelling')}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-wider"
              >
                Explore SUC Levelling <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Embedded Full Executive Overview */}
        <ExecutiveOverview
          submissions={submissions}
          risks={risks}
          cars={cars}
          allCompliances={allCompliances}
          academicPrograms={academicPrograms}
          schedules={schedules}
          units={units}
          campuses={campuses}
          cycles={cycles}
          selectedYear={selectedYear}
          scope="university"
        />
      </TabsContent>

      {/* TAB 2: ARCHIPELAGIC INTELLIGENCE (AQ) */}
      <TabsContent value="archipelagic-intelligence" className="space-y-6 animate-in fade-in duration-300">
        <ArchipelagicIntelligenceTab
          campuses={campuses}
          allUnits={units}
          academicPrograms={academicPrograms}
          allCompliances={allCompliances}
          selectedYear={selectedYear}
        />
      </TabsContent>

      {/* TAB 3: SUC LEVELLING */}
      <TabsContent value="suc-levelling" className="space-y-6 animate-in fade-in duration-300">
        <SucLevellingDashboardTab
          academicPrograms={academicPrograms}
          allCompliances={allCompliances}
          submissions={submissions}
          campuses={campuses}
          units={units}
          selectedYear={selectedYear}
          cars={cars}
          risks={risks}
        />
      </TabsContent>

      {/* TAB 4: CHED PROGRAM MONITORING */}
      <TabsContent value="ched-monitoring" className="space-y-6 animate-in fade-in duration-300">
        <ChedMonitoringView
          programs={academicPrograms}
          compliances={allCompliances}
          campuses={campuses}
          units={units}
          selectedYear={selectedYear}
        />
      </TabsContent>

      {/* TAB 5: EOMS (ISO 21001:2025) */}
      <TabsContent value="eoms" className="space-y-6 animate-in fade-in duration-300">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <Badge className="bg-blue-400/20 text-blue-200 border-blue-300/30 text-[9px] font-black uppercase">
                International Standard
              </Badge>
              <h2 className="text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <ShieldCheck className="h-7 w-7 text-blue-400" />
                EOMS (ISO 21001:2025) Quality Management System
              </h2>
              <p className="text-xs text-blue-100/80 max-w-2xl">
                Plan-Do-Check-Act (PDCA) governance, Internal Quality Audit (IQA) performance, and Corrective Action
                Requests (CAR) aging.
              </p>
            </div>
          </div>
        </Card>

        <ExecutiveOverview
          submissions={submissions}
          risks={risks}
          cars={cars}
          allCompliances={allCompliances}
          academicPrograms={academicPrograms}
          schedules={schedules}
          units={units}
          campuses={campuses}
          cycles={cycles}
          selectedYear={selectedYear}
          scope="university"
        />
      </TabsContent>

      {/* TAB 6: CHED ISA */}
      <TabsContent value="ched-isa" className="space-y-6 animate-in fade-in duration-300">
        <ChedIsaDashboardTab
          academicPrograms={academicPrograms}
          allCompliances={allCompliances}
          submissions={submissions}
          campuses={campuses}
          units={units}
          selectedYear={selectedYear}
          cars={cars}
          risks={risks}
        />
      </TabsContent>

      {/* TAB 7: AACCUP ACCREDITATION */}
      <TabsContent value="aaccup" className="space-y-6 animate-in fade-in duration-300">
        <AccreditationPerformanceTab
          academicPrograms={academicPrograms}
          allCompliances={allCompliances}
          campuses={campuses}
          selectedYear={selectedYear}
        />
      </TabsContent>

      {/* TAB 8: RISK INTELLIGENCE */}
      <TabsContent value="risk-intelligence" className="space-y-6 animate-in fade-in duration-300">
        <ExecutiveRiskIntelligence risks={risks} allUnits={units} campuses={campuses} selectedYear={selectedYear} />
      </TabsContent>

      {/* TAB 9: ISLAND CAMPUS EQUITY */}
      <TabsContent value="campus-equity" className="space-y-6 animate-in fade-in duration-300">
        <IslandCampusEquityTab
          campuses={campuses}
          academicPrograms={academicPrograms}
          allCompliances={allCompliances}
          submissions={submissions}
          units={units}
          selectedYear={selectedYear}
        />
      </TabsContent>

      {/* TAB 10: KPIS & SCORECARDS */}
      <TabsContent value="kpis" className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md">
          <div className="space-y-1">
            <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-[9px] font-black uppercase">
              Institutional & Unit Performance
            </Badge>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-400" />
              Key Performance Indicators (KPIs) & Scorecards
            </h2>
            <p className="text-xs text-indigo-200/80 max-w-2xl">
              Continuous quality metrics, institutional targets, delivery unit performance, ISO compliance, and client
              satisfaction scorecards.
            </p>
          </div>
          <Link href="/kpi-dashboard">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-bold bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 shadow-sm"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open Dedicated KPI Studio
            </Button>
          </Link>
        </div>

        <KpiDashboardTab
          submissions={scopedSubmissions}
          risks={scopedRisks}
          allUnits={units}
          allCycles={cycles || []}
          allCars={scopedCars}
          allAuditPlans={[]}
          selectedYear={selectedYear}
          initialScope={scope === 'unit' ? 'unit' : 'institution'}
          unitId={selectedUnitId}
        />
      </TabsContent>
    </Tabs>
  );
}
