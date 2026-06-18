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

      try {
        const carsSnap = await getDocs(query(
          collection(firestore, 'correctiveActionRequests'),
          where('unitId', '==', unitId),
          where('campusId', '==', campusId),
          where('status', 'in', ['Open', 'Awaiting Response/Update'])
        ));
        if (carsSnap.size > 0) items.push(`${carsSnap.size} open corrective action request${carsSnap.size > 1 ? 's' : ''}`);
      } catch { /* no index or collection */ }

      try {
        const risksSnap = await getDocs(query(
          collection(firestore, 'risks'),
          where('unitId', '==', unitId),
          where('campusId', '==', campusId)
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

      if (isAdmin || userRole === 'Supervisor' || userRole === 'VP') {
        try {
          const pendingQuery = isAdmin
            ? query(collection(firestore, 'submissions'), where('statusId', '==', 'submitted'))
            : query(collection(firestore, 'submissions'), where('campusId', '==', campusId), where('statusId', '==', 'submitted'));
          const pendingSnap = await getDocs(pendingQuery);
          if (pendingSnap.size > 0) items.push(`${pendingSnap.size} submission${pendingSnap.size > 1 ? 's' : ''} pending review`);
        } catch { /* silent */ }
      }

      if (isAdmin || userRole === 'Auditor') {
        try {
          const verifySnap = await getDocs(query(
            collection(firestore, 'correctiveActionRequests'),
            where('status', '==', 'For Final Verification')
          ));
          if (verifySnap.size > 0) items.push(`${verifySnap.size} CAR${verifySnap.size > 1 ? 's' : ''} for final verification`);
        } catch { /* silent */ }
      }

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

      // Always speak, even if nothing pending
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
