'use client';

import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { AttendanceActivity } from '@/lib/types';

/**
 * Automatically transitions activity status:
 * - UPCOMING → ACTIVE when startDateTime passes
 * - ACTIVE → COMPLETED when endDateTime passes
 *
 * Runs once on mount for each activity. Idempotent — only writes when
 * status actually changes. Uses the Firestore client SDK which respects
 * security rules (requires isSignedIn()).
 */
export function useActivityAutoTransition(
  firestore: Firestore | null,
  activities: AttendanceActivity[] | null | undefined,
) {
  useEffect(() => {
    if (!firestore || !activities?.length) return;

    const now = Date.now();

    for (const act of activities) {
      if (act.status === 'CANCELLED') continue;

      const startMs = act.startDateTime?.toDate
        ? act.startDateTime.toDate().getTime()
        : act.startDateTime?.seconds
          ? act.startDateTime.seconds * 1000
          : new Date(act.startDateTime).getTime();

      const endMs = act.endDateTime?.toDate
        ? act.endDateTime.toDate().getTime()
        : act.endDateTime?.seconds
          ? act.endDateTime.seconds * 1000
          : new Date(act.endDateTime).getTime();

      if (act.status === 'UPCOMING' && now >= startMs) {
        updateDoc(doc(firestore, 'unitActivities', act.id), { status: 'ACTIVE' });
      } else if (act.status === 'ACTIVE' && now >= endMs) {
        updateDoc(doc(firestore, 'unitActivities', act.id), { status: 'COMPLETED' });
      }
    }
  }, [firestore, activities]);
}
