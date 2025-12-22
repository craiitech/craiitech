
'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Risk, Submission, Cycle, Unit } from '@/lib/types';
import { collection, query, where } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { ComplianceOverTime } from '@/components/dashboard/strategic/compliance-over-time';
import { RiskMatrix } from '@/components/dashboard/strategic/risk-matrix';
import { RiskFunnel } from '@/components/dashboard/strategic/risk-funnel';

export default function StrategicDashboardPage() {
  const { isSupervisor, isAdmin } = useUser();
  const firestore = useFirestore();

  const canViewPage = isAdmin || isSupervisor;

  const submissionsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'submissions') : null), [firestore]);
  const { data: allSubmissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

  const risksQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'risks') : null), [firestore]);
  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);

  const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
  const { data: allCycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);

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
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Strategic Dashboard</h2>
        <p className="text-muted-foreground">
          A high-level overview of long-term compliance and risk management trends.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ComplianceOverTime allSubmissions={allSubmissions} allCycles={allCycles} allUnits={allUnits} />
        <RiskMatrix allRisks={allRisks} />
      </div>
      <RiskFunnel allRisks={allRisks} />
    </div>
  );
}
