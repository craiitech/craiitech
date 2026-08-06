'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from '@/firebase/firestore-wrapper';
import { Badge } from '@/components/ui/badge';
import type { Campus } from '@/lib/types';

export function useCampusMap(): Record<string, string> {
  const firestore = useFirestore();
  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  return useMemo(() => {
    const map: Record<string, string> = {};
    (campuses || []).forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [campuses]);
}

export function FiamoCampusBadge({ campusId }: { campusId?: string }) {
  const campusMap = useCampusMap();
  if (!campusId) return null;
  const name = campusMap[campusId];
  if (!name) return null;
  return (
    <Badge variant="outline" className="text-[9px] uppercase border-blue-200 text-blue-700">
      {name}
    </Badge>
  );
}
