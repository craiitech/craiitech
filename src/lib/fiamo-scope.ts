'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from '@/firebase/firestore-wrapper';
import type { FiamoSettings } from '@/lib/types';

export interface FiamoScope {
  scopeCampusId: string | null;
  isMainCampusMonitor: boolean;
  isCampusPersonnel: boolean;
  campusId?: string;
  settings: FiamoSettings | null;
  isLoading: boolean;
}

/**
 * Resolves the FIAMO campus scope for the current user.
 *
 * - Campus personnel (listed in settings.campusPersonnel[campusId] as coordinator,
 *   ODIMO, or staff) are scoped to that single campus: scopeCampusId is set.
 * - Main Campus FIAMO monitors (system admin, FIAMO admin, VPAF, or any user whose
 *   unit is the FIAMO office unit) monitor every campus: scopeCampusId is null and
 *   isMainCampusMonitor is true.
 */
export function useFiamoScope(): FiamoScope {
  const firestore = useFirestore();
  const { userProfile, isAdmin, isVpaf } = useUser();

  const fiamoSettingsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, 'system', 'fiamoSettings') : null),
    [firestore],
  );
  const { data: settings, isLoading } = useDoc<FiamoSettings>(fiamoSettingsRef);

  return useMemo((): FiamoScope => {
    const empty: FiamoScope = {
      scopeCampusId: null,
      isMainCampusMonitor: false,
      isCampusPersonnel: false,
      settings: null,
      isLoading,
    };

    if (!firestore || !userProfile || !settings) {
      return empty;
    }

    const myId = userProfile.id;
    const isFiamoAdmin = settings.fiamoAdminId === myId;
    const isOfficeUnitMember = !!settings.officeUnitId && userProfile.unitId === settings.officeUnitId;

    const isMainCampusMonitor = isAdmin || isFiamoAdmin || isVpaf || isOfficeUnitMember;

    if (isMainCampusMonitor) {
      return {
        scopeCampusId: null,
        isMainCampusMonitor: true,
        isCampusPersonnel: false,
        campusId: userProfile.campusId,
        settings,
        isLoading: false,
      };
    }

    // Find the campus (if any) that lists this user as assigned personnel.
    const campusPersonnel = settings.campusPersonnel || {};
    const assignedCampusId = Object.keys(campusPersonnel).find((campusId) => {
      const cp = campusPersonnel[campusId];
      return cp && (cp.coordinatorIds?.includes(myId) || cp.odimoIds?.includes(myId) || cp.staffIds?.includes(myId));
    });

    return {
      scopeCampusId: assignedCampusId || null,
      isMainCampusMonitor: false,
      isCampusPersonnel: !!assignedCampusId,
      campusId: assignedCampusId || userProfile.campusId,
      settings,
      isLoading: false,
    };
  }, [firestore, userProfile, isAdmin, isVpaf, settings, isLoading]);
}
