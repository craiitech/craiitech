'use client';

import { useMemo, useState, useCallback } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, doc, updateDoc, Timestamp } from '@/firebase/firestore-wrapper';
import { Loader2, CalendarSearch, BarChart, TrendingUp, AlertTriangle, Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiScorecard, KpiScorecardGrid } from '@/components/kpi/kpi-scorecard';
import { KpiTrendChart } from '@/components/kpi/kpi-trend-chart';
import { KpiHeatmap } from '@/components/kpi/kpi-heatmap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useYear } from '@/lib/year-provider';
import type { KpiDefinition, KpiSnapshot, KpiAlert, Submission, Risk, Cycle, Unit, CorrectiveActionRequest, AuditPlan, CsmResponse } from '@/lib/types';
import { computeKpis } from '@/lib/kpi-engine';
import { KPI_CATEGORIES } from '@/lib/constants';
import { useRouter } from 'next/navigation';

export default function KpiDashboardPage() {
  const { isAdmin, isSupervisor, userProfile } = useUser();
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');

  const canView = isAdmin || isSupervisor;

  const defsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'kpiDefinitions') : null), [firestore]);
  const { data: definitions, isLoading: loadingDefs } = useCollection<KpiDefinition>(defsQuery);

  const alertsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'kpiAlerts'), where('acknowledged', '==', false), orderBy('createdAt', 'desc'), limit(20));
  }, [firestore]);
  const { data: alerts } = useCollection<KpiAlert>(alertsQuery);

  const submissionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'submissions') : null), [firestore]);
  const { data: submissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: risks } = useCollection<Risk>(risksQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: cycles } = useCollection<Cycle>(cyclesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: units } = useCollection<Unit>(unitsQuery);

  const carsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'correctiveActionRequests') : null), [firestore]);
  const { data: cars } = useCollection<CorrectiveActionRequest>(carsQuery);

  const auditsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'auditPlans') : null), [firestore]);
  const { data: auditPlans } = useCollection<AuditPlan>(auditsQuery);

  const csmQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'csmResponses') : null), [firestore]);
  const { data: csmResponses } = useCollection<CsmResponse>(csmQuery);

  const entityType = useMemo(() => {
    if (isAdmin) return 'institution';
    if (userProfile?.campusId) return 'campus';
    return 'unit';
  }, [isAdmin, userProfile]);

  const entityId = useMemo(() => {
    if (isAdmin) return 'institution';
    if (userProfile?.campusId) return userProfile.campusId;
    return userProfile?.unitId || 'unknown';
  }, [isAdmin, userProfile]);

  const snapshots = useMemo(() => {
    if (!definitions?.length) return [];
    return computeKpis({
      definitions: definitions.filter(d => d.isActive),
      submissions: (submissions || []) as any,
      risks: (risks || []) as any,
      cycles: (cycles || []) as any,
      units: (units || []) as any,
      cars: (cars || []) as any,
      auditPlans: (auditPlans || []) as any,
      csmResponses: (csmResponses || []) as any,
      selectedYear, entityType, entityId,
    });
  }, [definitions, submissions, risks, cycles, units, cars, auditPlans, csmResponses, selectedYear, entityType, entityId]);

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
      const def = definitions?.find(d => d.id === snap.kpiId);
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

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    if (!firestore) return;
    try {
      await updateDoc(doc(firestore, 'kpiAlerts', alertId), {
        acknowledged: true,
        acknowledgedBy: userProfile?.id || 'unknown',
        acknowledgedAt: Timestamp.now(),
      });
    } catch { }
  }, [firestore, userProfile]);

  const exportKpiData = useCallback(() => {
    const csvRows = ['KPI,Category,Value,Target,Status,Period'];
    for (const snap of snapshots) {
      const def = definitions?.find(d => d.id === snap.kpiId);
      csvRows.push(`${snap.kpiName},${def?.category || 'N/A'},${snap.value},${snap.target},${snap.status},${snap.period}`);
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kpi-data-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [snapshots, definitions, selectedYear]);

  const isLoading = loadingDefs;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
          <p className="text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">KPI Dashboard</h2>
          <p className="text-muted-foreground">
            Key Performance Indicators — monitoring institutional health and operational effectiveness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={() => {}}>
            <SelectTrigger className="w-[140px] h-9 bg-white font-bold shadow-sm">
              <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder={String(selectedYear)} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(selectedYear)}>AY {selectedYear}</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={exportKpiData} className="h-9 text-xs font-bold">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push('/settings/kpi-definitions')} className="h-9 text-xs font-bold">
                Manage KPIs
              </Button>
            </>
          )}
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <Card className="border-rose-200 bg-rose-50 dark:bg-rose-950/20 shadow-md">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-black uppercase tracking-wider text-rose-700">KPI Alerts ({alerts.length})</span>
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="flex items-center justify-between text-xs bg-white/60 dark:bg-slate-800/60 rounded-lg px-3 py-2">
                  <div>
                    <span className="font-bold">{alert.kpiName}:</span>{' '}
                    <span className="text-muted-foreground">{alert.message}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black" onClick={() => acknowledgeAlert(alert.id)}>
                    Dismiss
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview"><BarChart className="h-3.5 w-3.5 mr-1.5" /> Overview</TabsTrigger>
          <TabsTrigger value="trends"><TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Trends</TabsTrigger>
          <TabsTrigger value="heatmap">Unit Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {Object.entries(groupedByCategory).map(([category, kpis]) => (
            <div key={category}>
              <h3 className="text-sm font-black uppercase tracking-tight mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {KPI_CATEGORIES[category as keyof typeof KPI_CATEGORIES] || category}
                <Badge variant="outline" className="text-[9px] font-black ml-1">{kpis.length}</Badge>
              </h3>
              <KpiScorecardGrid>
                {kpis.map(snap => (
                  <KpiScorecard
                    key={snap.id}
                    name={snap.kpiName}
                    value={snap.value}
                    target={snap.target}
                    status={snap.status}
                    trend={snap.trend}
                    description={definitions?.find(d => d.id === snap.kpiId)?.description}
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
            {latestSnapshots.slice(0, 8).map(snap => (
              <KpiTrendChart
                key={snap.id}
                title={snap.kpiName}
                description={definitions?.find(d => d.id === snap.kpiId)?.description}
                data={snapshotsByKpi.get(snap.kpiId) || []}
                target={snap.target}
                height={250}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="heatmap" className="mt-4">
          {units && definitions && (
            <KpiHeatmap
              units={units}
              definitions={definitions.filter(d => d.isActive)}
              snapshots={snapshots}
              selectedYear={selectedYear}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
