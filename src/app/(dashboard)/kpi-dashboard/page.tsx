'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, Timestamp } from '@/firebase/firestore-wrapper';
import {
  Loader2,
  CalendarSearch,
  BarChart,
  TrendingUp,
  AlertTriangle,
  Download,
  Landmark,
  Building2,
  Target,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiScorecard, KpiScorecardGrid } from '@/components/kpi/kpi-scorecard';
import { KpiTrendChart } from '@/components/kpi/kpi-trend-chart';
import { KpiHeatmap } from '@/components/kpi/kpi-heatmap';
import { KpiAutoGeneratorDialog } from '@/components/kpi/kpi-auto-generator-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useYear } from '@/lib/year-provider';
import type {
  KpiDefinition,
  KpiSnapshot,
  KpiAlert,
  Submission,
  Risk,
  Cycle,
  Unit,
  Campus,
  CorrectiveActionRequest,
  AuditPlan,
  AuditFinding,
  ProcedureManual,
  ProgramComplianceRecord,
  CsmResponse,
  AttendanceActivity,
  ActivityAttendanceLog,
  ActivityEvaluation,
  OperationalPlanItem,
} from '@/lib/types';
import { computeKpis } from '@/lib/kpi-engine';
import { KPI_CATEGORIES } from '@/lib/constants';
import { useRouter, useSearchParams } from 'next/navigation';

export default function KpiDashboardPage() {
  const { isAdmin, isSupervisor, userRole, userProfile } = useUser();
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const isExecOrAdmin =
    isAdmin ||
    isSupervisor ||
    (userRole
      ? ['president', 'vice president', 'campus director', 'qms head', 'director'].some((r) =>
          userRole.toLowerCase().includes(r),
        )
      : false);

  // Scope selection: 'institution' (University-Wide) vs 'unit' (Unit-Only)
  const initialScopeFromUrl = searchParams.get('scope');
  const [scopeMode, setScopeMode] = useState<'institution' | 'unit'>(() => {
    if (initialScopeFromUrl === 'unit') return 'unit';
    if (initialScopeFromUrl === 'university') return 'institution';
    return isExecOrAdmin ? 'institution' : 'unit';
  });

  const [selectedUnitId, setSelectedUnitId] = useState<string>(userProfile?.unitId || '');

  // Firestore Queries
  const defsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'kpiDefinitions') : null), [firestore]);
  const { data: definitions, isLoading: loadingDefs } = useCollection<KpiDefinition>(defsQuery);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'kpiAlerts'),
      where('acknowledged', '==', false),
      orderBy('createdAt', 'desc'),
      limit(20),
    );
  }, [firestore]);
  const { data: alerts } = useCollection<KpiAlert>(alertsQuery);

  const submissionsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'submissions') : null),
    [firestore],
  );
  const { data: submissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: risks } = useCollection<Risk>(risksQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles } = useCollection<Cycle>(cyclesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const carsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'correctiveActionRequests') : null),
    [firestore],
  );
  const { data: cars } = useCollection<CorrectiveActionRequest>(carsQuery);

  const auditsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: auditPlans } = useCollection<AuditPlan>(auditsQuery);

  const csmQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'csmResponses') : null), [firestore]);
  const { data: csmResponses } = useCollection<CsmResponse>(csmQuery);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: auditFindings } = useCollection<AuditFinding>(findingsQuery);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore],
  );
  const { data: procedureManuals } = useCollection<ProcedureManual>(manualsQuery);

  const compliancesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'programCompliances') : null),
    [firestore],
  );
  const { data: programCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const activitiesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'unitActivities') : null),
    [firestore],
  );
  const { data: activities } = useCollection<AttendanceActivity>(activitiesQuery);

  const activityLogsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'activityAttendanceLogs') : null),
    [firestore],
  );
  const { data: activityLogs } = useCollection<ActivityAttendanceLog>(activityLogsQuery);

  const evaluationsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'activityEvaluations') : null),
    [firestore],
  );
  const { data: evaluations } = useCollection<ActivityEvaluation>(evaluationsQuery);

  const opItemsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'operationalPlanItems') : null),
    [firestore],
  );
  const { data: operationalPlanItems } = useCollection<OperationalPlanItem>(opItemsQuery);

  // Initialize selectedUnitId if empty
  useEffect(() => {
    if (!selectedUnitId && userProfile?.unitId) {
      setSelectedUnitId(userProfile.unitId);
    } else if (!selectedUnitId && units && units.length > 0) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnitId, userProfile?.unitId, units]);

  // Current Unit Object
  const currentUnit = useMemo(() => {
    if (!units || !selectedUnitId) return null;
    return units.find((u) => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  const effectiveUnitName = currentUnit?.name || userProfile?.unitName || 'Delivery Unit';

  // Compute entityType and entityId based on active scope
  const entityType = scopeMode === 'institution' ? 'institution' : 'unit';
  const entityId = scopeMode === 'institution' ? 'institution' : selectedUnitId || userProfile?.unitId || 'unknown';

  const snapshots = useMemo(() => {
    if (!definitions?.length) return [];
    return computeKpis({
      definitions: definitions.filter((d) => d.isActive),
      submissions: (submissions || []) as any,
      risks: (risks || []) as any,
      cycles: (cycles || []) as any,
      units: (units || []) as any,
      cars: (cars || []) as any,
      auditPlans: (auditPlans || []) as any,
      auditFindings: (auditFindings || []) as any,
      procedureManuals: (procedureManuals || []) as any,
      programCompliances: (programCompliances || []) as any,
      csmResponses: (csmResponses || []) as any,
      activities: (activities || []) as any,
      activityLogs: (activityLogs || []) as any,
      evaluations: (evaluations || []) as any,
      operationalPlanItems: (operationalPlanItems || []) as any,
      selectedYear,
      entityType,
      entityId,
    });
  }, [
    definitions,
    submissions,
    risks,
    cycles,
    units,
    cars,
    auditPlans,
    auditFindings,
    procedureManuals,
    programCompliances,
    csmResponses,
    activities,
    activityLogs,
    evaluations,
    operationalPlanItems,
    selectedYear,
    entityType,
    entityId,
  ]);

  const latestSnapshots = useMemo(() => {
    const map = new Map<string, KpiSnapshot>();
    for (const snap of snapshots) {
      const key = snap.kpiId;
      if (!map.has(key)) map.set(key, snap);
    }
    return Array.from(map.values());
  }, [snapshots]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, KpiSnapshot[]> = {};
    for (const snap of latestSnapshots) {
      const def = definitions?.find((d) => d.id === snap.kpiId);
      const cat = def?.category || 'system_operations';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(snap);
    }
    return groups;
  }, [latestSnapshots, definitions]);

  const snapshotsByKpi = useMemo(() => {
    const map = new Map<string, KpiSnapshot[]>();
    for (const snap of snapshots) {
      const arr = map.get(snap.kpiId) || [];
      arr.push(snap);
      map.set(snap.kpiId, arr);
    }
    return map;
  }, [snapshots]);

  const acknowledgeAlert = useCallback(
    async (alertId: string) => {
      if (!firestore) return;
      try {
        await updateDoc(doc(firestore, 'kpiAlerts', alertId), {
          acknowledged: true,
          acknowledgedBy: userProfile?.id || 'unknown',
          acknowledgedAt: Timestamp.now(),
        });
      } catch {
        // Ignore error updating document
      }
    },
    [firestore, userProfile],
  );

  const exportKpiData = useCallback(() => {
    const csvRows = ['KPI,Category,Value,Target,Status,Period,Scope,Entity'];
    for (const snap of snapshots) {
      const def = definitions?.find((d) => d.id === snap.kpiId);
      csvRows.push(
        `"${snap.kpiName}","${def?.category || 'N/A'}",${snap.value},${snap.target},"${snap.status}","${snap.period}","${entityType}","${entityId}"`,
      );
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-data-${scopeMode}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshots, definitions, selectedYear, scopeMode, entityType, entityId]);

  const isLoading = loadingDefs;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card p-5 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </span>
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">
              Key Performance Indicators (KPIs)
            </h2>
            <Badge
              variant="outline"
              className={
                scopeMode === 'institution'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 text-[10px] font-bold'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold'
              }
            >
              {scopeMode === 'institution' ? '🏛️ University-Wide' : `🏢 Unit: ${effectiveUnitName}`}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-2xl">
            {scopeMode === 'institution'
              ? 'Monitoring institutional health, accreditation standards, and university-wide operational benchmarks across Romblon State University.'
              : `Operational effectiveness, submission compliance, client satisfaction, and risk mitigation scorecards for ${effectiveUnitName}.`}
          </p>
        </div>

        {/* Scope Controls & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Scope Toggle */}
          <div className="flex items-center bg-muted/80 p-1 rounded-lg border border-border/60">
            <Button
              variant={scopeMode === 'institution' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScopeMode('institution')}
              className="h-8 text-xs font-bold gap-1.5 px-3 shadow-none"
            >
              <Landmark className="h-3.5 w-3.5" />
              <span>University-Wide</span>
            </Button>
            <Button
              variant={scopeMode === 'unit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setScopeMode('unit');
                if (!selectedUnitId && userProfile?.unitId) {
                  setSelectedUnitId(userProfile.unitId);
                }
              }}
              className="h-8 text-xs font-bold gap-1.5 px-3 shadow-none"
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>{isExecOrAdmin ? 'Unit View' : 'My Unit'}</span>
            </Button>
          </div>

          {/* Unit Picker for Admins & Executives */}
          {scopeMode === 'unit' && isExecOrAdmin && units && units.length > 0 && (
            <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
              <SelectTrigger className="w-[200px] h-8 text-xs font-bold bg-background">
                <SelectValue placeholder="Select delivery unit" />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Academic Year Selector */}
          <Select value={String(selectedYear)} onValueChange={() => {}}>
            <SelectTrigger className="w-[120px] h-8 bg-background font-bold text-xs shadow-none">
              <CalendarSearch className="h-3.5 w-3.5 mr-1.5 opacity-50" />
              <SelectValue placeholder={String(selectedYear)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(selectedYear)}>AY {selectedYear}</SelectItem>
            </SelectContent>
          </Select>

          {/* Export & Admin Actions */}
          <Button variant="outline" size="sm" onClick={exportKpiData} className="h-8 text-xs font-bold gap-1">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGeneratorOpen(true)}
                className="h-8 text-xs font-bold gap-1 text-primary hover:text-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Auto-Seed</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings/kpi-definitions')}
                className="h-8 text-xs font-bold"
              >
                Definitions
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Scope Context Alert Banner */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          scopeMode === 'institution'
            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 text-blue-900 dark:text-blue-200'
            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="p-1.5 rounded-lg bg-background/80 shrink-0 font-bold">
            {scopeMode === 'institution' ? '🏛️' : '🏢'}
          </span>
          <div>
            <span className="font-bold uppercase tracking-wider block">
              {scopeMode === 'institution'
                ? 'Institutional University-Wide Evaluation'
                : `Delivery Unit Operational Evaluation: ${effectiveUnitName}`}
            </span>
            <span className="text-[11px] opacity-80 block">
              {scopeMode === 'institution'
                ? 'Data aggregates across all campuses, colleges, and operational units.'
                : 'KPI values and trend scores are calculated specifically from this unit’s submissions, CARs, customer ratings, and activities.'}
            </span>
          </div>
        </div>

        {scopeMode === 'unit' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScopeMode('institution')}
            className="h-7 text-[10px] font-black uppercase tracking-wider bg-background/80 hover:bg-background self-start sm:self-auto shrink-0"
          >
            Compare with University Benchmark
          </Button>
        )}
      </div>

      {/* KPI Alerts if any */}
      {alerts && alerts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                Active Threshold Alerts ({alerts.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 5).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between text-xs bg-white/60 dark:bg-slate-800/60 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="font-bold">{alert.kpiName}:</span>{' '}
                    <span className="text-muted-foreground">{alert.message}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[9px] font-black"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted p-1 border shadow-sm">
          <TabsTrigger value="overview" className="text-xs font-bold gap-1.5">
            <BarChart className="h-3.5 w-3.5" /> Scorecards & Overview
          </TabsTrigger>
          <TabsTrigger value="trends" className="text-xs font-bold gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Longitudinal Trends
          </TabsTrigger>
          {isExecOrAdmin && (
            <TabsTrigger value="heatmap" className="text-xs font-bold gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Cross-Unit Heatmap
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {Object.entries(groupedByCategory).map(([category, kpis]) => (
            <div key={category}>
              <h3 className="text-sm font-black uppercase tracking-tight mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {KPI_CATEGORIES[category as keyof typeof KPI_CATEGORIES] || category}
                <Badge variant="outline" className="text-[9px] font-black ml-1">
                  {kpis.length}
                </Badge>
              </h3>
              <KpiScorecardGrid>
                {kpis.map((snap, idx) => (
                  <KpiScorecard
                    key={snap.id}
                    name={snap.kpiName}
                    value={snap.value}
                    target={snap.target}
                    status={snap.status}
                    trend={snap.trend}
                    description={definitions?.find((d) => d.id === snap.kpiId)?.description}
                    rank={idx + 1}
                    totalRank={kpis.length}
                  />
                ))}
              </KpiScorecardGrid>
            </div>
          ))}
          {latestSnapshots.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card">
              <BarChart className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No KPI data calculated for this scope</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-sm">
                {scopeMode === 'unit'
                  ? `There are no active submissions or activities recorded for ${effectiveUnitName} in AY ${selectedYear}.`
                  : 'Define and activate KPIs in Settings to generate university-wide metrics.'}
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {latestSnapshots.slice(0, 8).map((snap) => (
              <KpiTrendChart
                key={snap.id}
                title={snap.kpiName}
                description={definitions?.find((d) => d.id === snap.kpiId)?.description}
                data={snapshotsByKpi.get(snap.kpiId) || []}
                target={snap.target}
                height={250}
              />
            ))}
          </div>
        </TabsContent>

        {isExecOrAdmin && (
          <TabsContent value="heatmap" className="mt-4">
            {units && definitions && (
              <KpiHeatmap
                units={units}
                definitions={definitions.filter((d) => d.isActive)}
                snapshots={snapshots}
                selectedYear={selectedYear}
              />
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Auto-Generator Dialog */}
      {isAdmin && (
        <KpiAutoGeneratorDialog
          open={isGeneratorOpen}
          onOpenChange={setIsGeneratorOpen}
          submissions={submissions || []}
          risks={risks || []}
          cars={cars || []}
          units={units || []}
          cycles={cycles || []}
          auditPlans={auditPlans || []}
          csmResponses={csmResponses || []}
          gadPlans={[]}
          gadActivities={[]}
          selectedYear={selectedYear}
        />
      )}
    </div>
  );
}
