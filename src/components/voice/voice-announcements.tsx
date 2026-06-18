'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from '@/firebase/firestore-wrapper';
import { useVoice } from './voice-provider';

export function VoiceAnnouncements() {
  const { userProfile, isUserLoading, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { speak, enabled } = useVoice();
  const announced = useRef(false);

  useEffect(() => {
    if (isUserLoading || !userProfile || !firestore || !enabled || announced.current) return;
    announced.current = true;

    const fetchAndAnnounce = async () => {
      const items: string[] = [];
      const now = new Date();
      const unitId = userProfile.unitId;
      const campusId = userProfile.campusId;

      // 1. Open CARs — fetch by unitId (single-field query, no composite index needed)
      try {
        const carsSnap = await getDocs(query(
          collection(firestore, 'correctiveActionRequests'),
          where('unitId', '==', unitId)
        ));
        const open = carsSnap.docs.filter(d => {
          const s = d.data().status;
          return s === 'Open' || s === 'Awaiting Response/Update';
        });
        if (open.length > 0) items.push(`${open.length} open corrective action request${open.length > 1 ? 's' : ''}`);
      } catch { /* silent */ }

      // 2. Overdue risks — fetch by unitId only
      try {
        const risksSnap = await getDocs(query(
          collection(firestore, 'risks'),
          where('unitId', '==', unitId)
        ));
        if (!risksSnap.empty) {
          const overdue = risksSnap.docs.filter(d => {
            const data = d.data();
            if (data.status === 'Closed' || !data.targetDate) return false;
            const target = data.targetDate instanceof Timestamp ? data.targetDate.toDate() : new Date(data.targetDate);
            return target < now;
          });
          if (overdue.length > 0) items.push(`${overdue.length} overdue risk${overdue.length > 1 ? 's' : ''}`);
        }
      } catch { /* silent */ }

      // 3. Submissions pending review (admin/supervisor)
      if (isAdmin || userRole === 'Supervisor' || userRole === 'VP') {
        try {
          const pendingQuery = isAdmin
            ? query(collection(firestore, 'submissions'), where('statusId', '==', 'submitted'))
            : query(collection(firestore, 'submissions'), where('campusId', '==', campusId));
          const pendingSnap = await getDocs(pendingQuery);
          const pending = pendingSnap.docs.filter(d => d.data().statusId === 'submitted');
          if (pending.length > 0) items.push(`${pending.length} submission${pending.length > 1 ? 's' : ''} pending review`);
        } catch { /* silent */ }
      }

      // 4. Verification-ready CARs (admin/auditor)
      if (isAdmin || userRole === 'Auditor') {
        try {
          const verifySnap = await getDocs(query(
            collection(firestore, 'correctiveActionRequests'),
            where('status', '==', 'For Final Verification')
          ));
          if (verifySnap.size > 0) items.push(`${verifySnap.size} CAR${verifySnap.size > 1 ? 's' : ''} for final verification`);
        } catch { /* silent */ }
      }

      // 5. Open MR decisions — fetch by single field
      try {
        const mroSnap = await getDocs(query(
          collection(firestore, 'managementReviewOutputs'),
          where('concernedUnitIds', 'array-contains', unitId)
        ));
        const open = mroSnap.docs.filter(d => {
          const data = d.data();
          return data.status === 'Open' || data.status === 'On-going';
        });
        if (open.length > 0) items.push(`${open.length} pending management review decision${open.length > 1 ? 's' : ''}`);
      } catch { /* silent */ }

      setTimeout(() => {
        if (items.length > 0) {
          speak(`Here is your summary. You have ${items.join('. ')}.`);
        } else {
          speak(`You have no pending items that require your attention.`);
        }
      }, 4500);
    };

    fetchAndAnnounce();
  }, [isUserLoading, userProfile, firestore, isAdmin, userRole, enabled, speak]);

  return null;
}
