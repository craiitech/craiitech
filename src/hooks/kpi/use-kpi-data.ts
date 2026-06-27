'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from '@/firebase/firestore-wrapper';
import type { KpiDefinition, KpiSnapshot, KpiAlert, OkrObjective, OkrKeyResult, OkrCheckIn, Submission, Risk, Cycle, Unit, CorrectiveActionRequest } from '@/lib/types';
import { useYear } from '@/lib/year-provider';

export function useKpiDefinitions() {
  const firestore = useFirestore();
  const q = useMemoFirebase(
    () => (firestore ? collection(firestore, 'kpiDefinitions') : null),
    [firestore]
  );
  return useCollection<KpiDefinition>(q);
}

export function useKpiSnapshots(kpiId?: string, entityId?: string, limitCount = 12) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'kpiSnapshots');
    if (kpiId && entityId) {
      return query(base, where('kpiId', '==', kpiId), where('entityId', '==', entityId), orderBy('timestamp', 'desc'), limit(limitCount));
    }
    return query(base, orderBy('timestamp', 'desc'), limit(limitCount));
  }, [firestore, kpiId, entityId, limitCount]);
  return useCollection<KpiSnapshot>(q);
}

export function useKpiAlerts(entityId?: string, unacknowledgedOnly = true) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'kpiAlerts');
    if (entityId) {
      if (unacknowledgedOnly) {
        return query(base, where('entityId', '==', entityId), where('acknowledged', '==', false), orderBy('createdAt', 'desc'));
      }
      return query(base, where('entityId', '==', entityId), orderBy('createdAt', 'desc'));
    }
    if (unacknowledgedOnly) {
      return query(base, where('acknowledged', '==', false), orderBy('createdAt', 'desc'));
    }
    return query(base, orderBy('createdAt', 'desc'));
  }, [firestore, entityId, unacknowledgedOnly]);
  return useCollection<KpiAlert>(q);
}

export function useOkrObjectives(entityType?: string, entityId?: string, year?: number) {
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const yr = year || selectedYear;
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'okrObjectives');
    if (entityType && entityId) {
      return query(base, where('entityType', '==', entityType), where('entityId', '==', entityId), where('year', '==', yr), orderBy('year', 'desc'));
    }
    return query(base, where('year', '==', yr), orderBy('year', 'desc'));
  }, [firestore, entityType, entityId, yr]);
  return useCollection<OkrObjective>(q);
}

export function useOkrKeyResults(objectiveId?: string) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'okrKeyResults');
    if (objectiveId) {
      return query(base, where('objectiveId', '==', objectiveId), orderBy('createdAt', 'asc'));
    }
    return query(base, orderBy('createdAt', 'asc'));
  }, [firestore, objectiveId]);
  return useCollection<OkrKeyResult>(q);
}

export function useOkrCheckIns(krId?: string) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    const base = collection(firestore, 'okrCheckIns');
    if (krId) {
      return query(base, where('krId', '==', krId), orderBy('updatedAt', 'desc'));
    }
    return query(base, orderBy('updatedAt', 'desc'));
  }, [firestore, krId]);
  return useCollection<OkrCheckIn>(q);
}

export function useUserOkrObjectives(userId: string) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return query(
      collection(firestore, 'okrObjectives'),
      where('ownerId', '==', userId)
    );
  }, [firestore, userId]);
  return useCollection<OkrObjective>(q);
}

export function useFilteredKpiSnapshots(definitions: KpiDefinition[], entityType: string, entityId: string) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore || !definitions.length) return null;
    return query(
      collection(firestore, 'kpiSnapshots'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, definitions.length, entityType, entityId]);
  return useCollection<KpiSnapshot>(q);
}

export function useLatestKpiValues(entityType: string, entityId: string) {
  const firestore = useFirestore();
  const q = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'kpiSnapshots'),
      where('entityType', '==', entityType),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [firestore, entityType, entityId]);
  const { data, isLoading } = useCollection<KpiSnapshot>(q);

  const latestByKpi = useMemo(() => {
    if (!data) return new Map<string, KpiSnapshot>();
    const map = new Map<string, KpiSnapshot>();
    for (const snap of data) {
      if (!map.has(snap.kpiId)) {
        map.set(snap.kpiId, snap);
      }
    }
    return map;
  }, [data]);

  return { latestByKpi, isLoading, allSnapshots: data || [] };
}
