'use client';

import { useMemo, useState, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, Timestamp } from '@/firebase/firestore-wrapper';
import {
  Loader2,
  BarChart,
  TrendingUp,
  AlertTriangle,
  Download,
  CalendarSearch,
  Sparkles,
  Landmark,
  Building2,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiScorecard, KpiScorecardGrid } from '@/components/kpi/kpi-scorecard';
import { KpiTrendChart } from '@/components/kpi/kpi-trend-chart';
import { KpiHeatmap } from '@/components/kpi/kpi-heatmap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useYear } from '@/lib/year-provider';
import { computeKpis } from '@/lib/kpi-engine';
import { KPI_CATEGORIES } from '@/lib/constants';
import { KpiAutoGeneratorDialog } from '@/components/kpi/kpi-auto-generator-dialog';
import { cn } from '@/lib/utils';
import type {
  KpiDefinition,
  KpiSnapshot,
  KpiAlert,
  Submission,
  Risk,
  Cycle,
  Unit,
  CorrectiveActionRequest,
  AuditPlan,
  CsmResponse,
  GADPlan,
  GADActivity,
  AttendanceActivity,
  ActivityAttendanceLog,
  ActivityEvaluation,
  AuditFinding,
  ProcedureManual,
  ProgramComplianceRecord,
} from '@/lib/types';
import { useRouter } from 'next/navigation';

interface KpiDashboardTabProps {
  submissions: Submission[] | null;
  risks: Risk[] | null;
  allUnits: Unit[] | null;
  allCycles: Cycle[] | null;
  allCars: CorrectiveActionRequest[] | null;
  allAuditPlans: AuditPlan[] | null;
  selectedYear: number;
  initialScope?: 'institution' | 'unit';
  unitId?: string;
}

export function KpiDashboardTab({
  submissions,
  risks,
  allUnits,
  allCycles,
  allCars,
  allAuditPlans,
  selectedYear,
  initialScope,
  unitId,
}: KpiDashboardTabProps) {
  const { isAdmin, isSupervisor, userProfile } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [scopeMode, setScopeMode] = useState<'institution' | 'unit'>(
    initialScope || (isAdmin || isSupervisor ? 'institution' : 'unit'),
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    unitId || userProfile?.unitId || allUnits?.[0]?.id || '',
  );

  const canManage = isAdmin;

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

  const csmQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'csmResponses');
    if (isAdmin) return base;
    if (userProfile?.campusId) return query(base, where('campusId', '==', userProfile.campusId));
    if (userProfile?.unitId) return query(base, where('unitId', '==', userProfile.unitId));
    return base;
  }, [firestore, isAdmin, userProfile?.campusId, userProfile?.unitId]);
  const { data: csmResponses } = useCollection<CsmResponse>(csmQuery);

  const actQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'unitActivities');
    if (isAdmin) return base;
    if (userProfile?.campusId) return query(base, where('campusId', '==', userProfile.campusId));
    if (userProfile?.unitId) return query(base, where('unitId', '==', userProfile.unitId));
    return base;
  }, [firestore, isAdmin, userProfile?.campusId, userProfile?.unitId]);
  const { data: activities } = useCollection<AttendanceActivity>(actQuery);

  const logQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'unitActivityAttendanceLogs');
    if (isAdmin) return base;
    if (userProfile?.campusId) return query(base, where('campusId', '==', userProfile.campusId));
    if (userProfile?.unitId) return query(base, where('unitId', '==', userProfile.unitId));
    return base;
  }, [firestore, isAdmin, userProfile?.campusId, userProfile?.unitId]);
  const { data: activityLogs } = useCollection<ActivityAttendanceLog>(logQuery);

  const evalQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'unitActivityEvaluations');
    if (isAdmin) return base;
    if (userProfile?.campusId) return query(base, where('campusId', '==', userProfile.campusId));
    if (userProfile?.unitId) return query(base, where('unitId', '==', userProfile.unitId));
    return base;
  }, [firestore, isAdmin, userProfile?.campusId, userProfile?.unitId]);
  const { data: evaluations } = useCollection<ActivityEvaluation>(evalQuery);

  const findingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditFindings') : null), [firestore]);
  const { data: auditFindings } = useCollection<AuditFinding>(findingsQuery);

  const manualsQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'procedureManuals') : null),
    [firestore],
  );
  const { data: procedureManuals } = useCollection<ProcedureManual>(manualsQuery);

  const compliancesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'programCompliances');
    if (isAdmin) return query(base, where('academicYear', '==', selectedYear));
    if (userProfile?.campusId)
      return query(base, where('campusId', '==', userProfile.campusId), where('academicYear', '==', selectedYear));
    return query(base, where('academicYear', '==', selectedYear));
  }, [firestore, isAdmin, userProfile?.campusId, selectedYear]);
  const { data: programCompliances } = useCollection<ProgramComplianceRecord>(compliancesQuery);

  const entityType = useMemo(() => {
    if (scopeMode === 'institution') return 'institution';
    return 'unit';
  }, [scopeMode]);

  const entityId = useMemo(() => {
    if (scopeMode === 'institution') return 'institution';
    return selectedUnitId || userProfile?.unitId || allUnits?.[0]?.id || 'unknown';
  }, [scopeMode, selectedUnitId, userProfile?.unitId, allUnits]);

  const snapshots = useMemo(() => {
    if (!definitions?.length) return [];
    return computeKpis({
      definitions: definitions.filter((d) => d.isActive),
      submissions: (submissions || []) as any,
      risks: (risks || []) as any,
      cycles: (allCycles || []) as any,
      units: (allUnits || []) as any,
      cars: (allCars || []) as any,
      auditPlans: (allAuditPlans || []) as any,
      auditFindings: (auditFindings || []) as any,
      procedureManuals: (procedureManuals || []) as any,
      programCompliances: (programCompliances || []) as any,
      csmResponses: (csmResponses || []) as any,
      activities: (activities || []) as any,
      activityLogs: (activityLogs || []) as any,
      evaluations: (evaluations || []) as any,
      selectedYear,
      entityType,
      entityId,
    });
  }, [
    definitions,
    submissions,
    risks,
    allCycles,
    allUnits,
    allCars,
    allAuditPlans,
    auditFindings,
    procedureManuals,
    programCompliances,
    csmResponses,
    activities,
    activityLogs,
    evaluations,
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
    const csvRows = ['KPI,Category,Value,Target,Status,Period'];
    for (const snap of snapshots) {
      const def = definitions?.find((d) => d.id === snap.kpiId);
      csvRows.push(
        `${snap.kpiName},${def?.category || 'N/A'},${snap.value},${snap.target},${snap.status},${snap.period}`,
      );
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-data-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshots, definitions, selectedYear]);

  if (loadingDefs) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {alerts && alerts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                KPI Alerts ({alerts.length})
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

      {/* Scope Switcher Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-0.5 bg-slate-200/80 dark:bg-slate-800 rounded-lg">
            <Button
              type="button"
              variant={scopeMode === 'institution' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScopeMode('institution')}
              className={cn(
                'h-7 px-3 text-[10px] font-black uppercase tracking-wider rounded-md transition-all gap-1.5',
                scopeMode === 'institution' && 'bg-primary text-primary-foreground shadow-sm',
              )}
            >
              <Landmark className="h-3 w-3" />
              University-Wide KPIs
            </Button>
            <Button
              type="button"
              variant={scopeMode === 'unit' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setScopeMode('unit')}
              className={cn(
                'h-7 px-3 text-[10px] font-black uppercase tracking-wider rounded-md transition-all gap-1.5',
                scopeMode === 'unit' && 'bg-primary text-primary-foreground shadow-sm',
              )}
            >
              <Building2 className="h-3 w-3" />
              Unit KPIs
            </Button>
          </div>

          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-wider">
            {scopeMode === 'institution' ? 'Institutional Overview' : 'Delivery Unit Scope'}
          </Badge>
        </div>

        {scopeMode === 'unit' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-bold uppercase text-muted-foreground whitespace-nowrap">
              {isAdmin || isSupervisor ? 'Select Unit:' : 'My Unit:'}
            </span>
            {isAdmin || isSupervisor ? (
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger className="h-7 text-xs font-semibold w-full sm:w-[220px]">
                  <SelectValue placeholder="Choose Unit..." />
                </SelectTrigger>
                <SelectContent>
                  {(allUnits || []).map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs">
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200 border-indigo-200 text-xs font-bold py-1">
                {allUnits?.find((u) => u.id === selectedUnitId)?.name || userProfile?.unitId || 'Assigned Unit'}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGeneratorOpen(true)}
              className="h-8 text-xs font-bold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Generate
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Button variant="outline" size="sm" onClick={exportKpiData} className="h-8 text-xs font-bold">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/settings/kpi-definitions')}
                className="h-8 text-xs font-bold"
              >
                Manage KPIs
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart className="h-3.5 w-3.5 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="trends">
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Trends
          </TabsTrigger>
          <TabsTrigger value="heatmap">Unit Heatmap</TabsTrigger>
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BarChart className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm font-bold text-muted-foreground">No KPI data available</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Define KPIs in Settings to get started.</p>
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

        <TabsContent value="heatmap" className="mt-4">
          {allUnits && definitions && (
            <KpiHeatmap
              units={allUnits}
              definitions={definitions.filter((d) => d.isActive)}
              snapshots={snapshots}
              selectedYear={selectedYear}
            />
          )}
        </TabsContent>
      </Tabs>

      <KpiAutoGeneratorDialog
        open={isGeneratorOpen}
        onOpenChange={setIsGeneratorOpen}
        submissions={submissions as Submission[] | null}
        risks={risks as Risk[] | null}
        cars={allCars as CorrectiveActionRequest[] | null}
        units={allUnits as Unit[] | null}
        cycles={null}
        auditPlans={allAuditPlans as AuditPlan[] | null}
        csmResponses={null}
        gadPlans={null}
        gadActivities={null}
        selectedYear={selectedYear}
      />
    </div>
  );
}
