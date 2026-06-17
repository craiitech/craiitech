'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, Submission, Cycle, Unit } from '@/lib/types';
import { collection } from '@/firebase/firestore-wrapper';
import { Loader2, CalendarSearch } from 'lucide-react';
import { ComplianceOverTime } from '@/components/dashboard/strategic/compliance-over-time';
import { RiskMatrix } from '@/components/dashboard/strategic/risk-matrix';
import { RiskFunnel } from '@/components/dashboard/strategic/risk-funnel';
import { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StrategicDashboardPage() {
  const { isSupervisor, isAdmin } = useUser();
  const firestore = useFirestore();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const canViewPage = isAdmin || isSupervisor;

  const submissionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'submissions') : null), [firestore]);
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

  const yearsList = useMemo(() => {
    const current = new Date().getFullYear();
    const yrSet = new Set<number>();
    for (let i = -2; i < 6; i++) yrSet.add(current - i);
    allCycles?.forEach(c => yrSet.add(Number(c.year)));
    return Array.from(yrSet).sort((a, b) => b - a);
  }, [allCycles]);

  const isLoading = isLoadingSubmissions || isLoadingRisks || isLoadingCycles || isLoadingUnits;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!canViewPage) {
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
          <h2 className="text-2xl font-bold tracking-tight">Strategic Dashboard</h2>
          <p className="text-muted-foreground">
            A high-level overview of long-term compliance and risk management trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[140px] h-9 bg-white font-bold shadow-sm">
              <CalendarSearch className="h-4 w-4 mr-2 opacity-50" />
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {yearsList.map(y => <SelectItem key={y} value={String(y)}>AY {y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComplianceOverTime allSubmissions={allSubmissions} allCycles={allCycles} allUnits={allUnits} />
        <RiskMatrix allRisks={allRisks} selectedYear={selectedYear} />
      </div>
      <RiskFunnel allRisks={allRisks} selectedYear={selectedYear} />
    </div>
  );
}
