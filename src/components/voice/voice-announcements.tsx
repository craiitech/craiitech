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
      const messages: string[] = [];
      const now = new Date();
      const unitId = userProfile.unitId;
      const campusId = userProfile.campusId;

      try {
        const carsRef = collection(firestore, 'correctiveActionRequests');
        const carsQuery = query(
          carsRef,
          where('unitId', '==', unitId),
          where('campusId', '==', campusId),
          where('status', 'in', ['Open', 'Awaiting Response/Update'])
        );
        const carsSnap = await getDocs(carsQuery);
        const carCount = carsSnap.size;
        if (carCount > 0) {
          messages.push(`You have ${carCount} open corrective action request${carCount > 1 ? 's' : ''} that need${carCount === 1 ? 's' : ''} your response.`);
        }
      } catch { /* silent */ }

      try {
        const risksRef = collection(firestore, 'risks');
        const risksQuery = query(
          risksRef,
          where('unitId', '==', unitId),
          where('campusId', '==', campusId)
        );
        const risksSnap = await getDocs(risksQuery);
        if (!risksSnap.empty) {
          const overdue = risksSnap.docs.filter(d => {
            const data = d.data();
            if (data.status === 'Closed' || !data.targetDate) return false;
            const target = data.targetDate instanceof Timestamp ? data.targetDate.toDate() : new Date(data.targetDate);
            return target < now;
          });
          const overdueReviews = risksSnap.docs.filter(d => {
            const data = d.data();
            if (data.status === 'Closed' || !data.nextReviewDue) return false;
            const due = data.nextReviewDue instanceof Timestamp ? data.nextReviewDue.toDate() : new Date(data.nextReviewDue);
            return due < now;
          });
          const totalActionable = overdue.length + overdueReviews.length;
          if (totalActionable > 0) {
            messages.push(`You have ${totalActionable} risk item${totalActionable > 1 ? 's' : ''} requiring action.`);
          }
        }
      } catch { /* silent */ }

      if (isAdmin || userRole === 'Supervisor' || userRole === 'VP') {
        try {
          const subsRef = collection(firestore, 'submissions');
          const pendingQuery = isAdmin
            ? query(subsRef, where('statusId', '==', 'submitted'))
            : query(subsRef, where('campusId', '==', campusId), where('statusId', '==', 'submitted'));
          const pendingSnap = await getDocs(pendingQuery);
          if (pendingSnap.size > 0) {
            messages.push(`There ${pendingSnap.size === 1 ? 'is' : 'are'} ${pendingSnap.size} submission${pendingSnap.size > 1 ? 's' : ''} pending your review.`);
          }
        } catch { /* silent */ }
      }

      if (isAdmin || userRole === 'Auditor') {
        try {
          const carsRef = collection(firestore, 'correctiveActionRequests');
          const verifyQuery = query(carsRef, where('status', '==', 'For Final Verification'));
          const verifySnap = await getDocs(verifyQuery);
          if (verifySnap.size > 0) {
            messages.push(`${verifySnap.size} corrective action request${verifySnap.size > 1 ? 's are' : ' is'} ready for final verification.`);
          }
        } catch { /* silent */ }
      }

      try {
        const mroRef = collection(firestore, 'managementReviewOutputs');
        const mroQuery = query(
          mroRef,
          where('concernedUnitIds', 'array-contains', unitId)
        );
        const mroSnap = await getDocs(mroQuery);
        const open = mroSnap.docs.filter(d => {
          const data = d.data();
          return data.status === 'Open' || data.status === 'On-going';
        });
        if (open.length > 0) {
          messages.push(`You have ${open.length} pending management review decision${open.length > 1 ? 's' : ''} to address.`);
        }
      } catch { /* silent */ }

      if (messages.length > 0) {
        const timer = setTimeout(() => {
          speak(`Here is your summary. ${messages.join(' ')}`);
        }, 4500);
        return () => clearTimeout(timer);
      }
    };

    fetchAndAnnounce();
  }, [isUserLoading, userProfile, firestore, isAdmin, userRole, enabled, speak]);

  return null;
}
