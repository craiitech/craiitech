'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, collection } from '@/firebase/firestore-wrapper';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { useDoc } from './firestore/use-doc';
import { useCollection, type WithId } from './firestore/use-collection';
import { useGetCollection } from './firestore/use-get-collection';
import type { User as AppUser, UserAssignment, Role, Campus, SystemSettings } from '@/lib/types';
import { useMemoFirebase } from './';
import { useSessionActivity, ActivityLogProvider } from '@/lib/activity-log-provider';
import { useToast } from '@/hooks/use-toast';
import { getDefaultPermissions } from '@/lib/permissions';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isAuthLoading: boolean;
  userError: Error | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
  // User authentication state
  user: User | null;
  isUserLoading: boolean; // True during initial auth check
  userError: Error | null;
  userProfile: WithId<AppUser> | null;
  isProfileLoading: boolean;
  assignments: UserAssignment[];
  activeAssignment: UserAssignment | null;
  setActiveAssignmentId: (assignmentId: string) => void;
  isAdmin: boolean;
  isTopManagement: boolean;
  isAdminLoading: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isAuditor: boolean;
  isVp: boolean;
  isVpOffice: boolean;
  isSupervisoryViewer: boolean;
  isMainCampusCoordinator: boolean;
  isMainCampusDOI: boolean;
  isDoi: boolean;
  // FIAMO-specific role flags
  isUnitCoordinator: boolean;
  isUnitOdimo: boolean;
  isVpaf: boolean;
  isFiamoStaff: boolean;
  isUnitHead: boolean;
  isDriverMechanic: boolean;
  systemSettings: SystemSettings | null;
  can: (permission: string) => boolean;
}

// Return type for useFirebase()
export interface UseFirebaseResult {
  areServicesAvailable: true;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  userProfile: WithId<AppUser> | null;
  isProfileLoading: boolean;
  assignments: UserAssignment[];
  activeAssignment: UserAssignment | null;
  setActiveAssignmentId: (assignmentId: string) => void;
  isAdmin: boolean;
  isTopManagement: boolean;
  isAdminLoading: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isAuditor: boolean;
  isVp: boolean;
  isVpOffice: boolean;
  isSupervisoryViewer: boolean;
  isMainCampusCoordinator: boolean;
  isMainCampusDOI: boolean;
  isDoi: boolean;
  // FIAMO-specific role flags
  isUnitCoordinator: boolean;
  isUnitOdimo: boolean;
  isVpaf: boolean;
  isFiamoStaff: boolean;
  isUnitHead: boolean;
  isDriverMechanic: boolean;
  systemSettings: SystemSettings | null;
  can: (permission: string) => boolean;
}

// Return type for useUser() - specific to user auth state
export interface UseUserResult {
  user: User | null;
  userProfile: WithId<AppUser> | null;
  isUserLoading: boolean; // Combines auth and profile loading
  userError: Error | null;
  assignments: UserAssignment[];
  activeAssignment: UserAssignment | null;
  setActiveAssignmentId: (assignmentId: string) => void;
  isAdmin: boolean;
  isTopManagement: boolean;
  isAuditor: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isVp: boolean;
  isVpOffice: boolean;
  isSupervisoryViewer: boolean;
  isMainCampusCoordinator: boolean;
  isMainCampusDOI: boolean;
  isDoi: boolean;
  // FIAMO-specific role flags
  isUnitCoordinator: boolean;
  isUnitOdimo: boolean;
  isVpaf: boolean;
  isFiamoStaff: boolean;
  isUnitHead: boolean;
  isDriverMechanic: boolean;
  systemSettings: SystemSettings | null;
  firestore: Firestore | null; // Added for convenience in some hooks
  can: (permission: string) => boolean;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children, firebaseApp, firestore, auth }) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isAuthLoading: true, // Start loading until first auth event
    userError: null,
  });
  const { toast } = useToast();

  // Use a ref to track if the initial login has been logged for the session
  const loginLoggedRef = useRef(false);

  // Effect to subscribe to Firebase auth state changes
  useEffect(() => {
    if (!auth) {
      setUserAuthState({ user: null, isAuthLoading: false, userError: new Error('Auth service not provided.') });
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          setUserAuthState({ user: firebaseUser, isAuthLoading: false, userError: null });
        } else {
          // User is logged out
          setUserAuthState({ user: null, isAuthLoading: false, userError: null });
          loginLoggedRef.current = false;
        }
      },
      (error) => {
        setUserAuthState({ user: null, isAuthLoading: false, userError: error });
        toast({
          title: 'Authentication Error',
          description: error.message || 'An unknown authentication error occurred.',
          variant: 'destructive',
        });
      },
    );
    return () => unsubscribe();
  }, [auth, toast]);

  const userDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'users', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);
  const [activeAssignmentId, setActiveAssignmentIdState] = useState<string | null>(null);

  const campusesQuery = useMemoFirebase(() => {
    // Only fetch campuses if user is present to avoid permission errors on public pages
    if (!firestore || !userAuthState.user) return null;
    return collection(firestore, 'campuses');
  }, [firestore, userAuthState.user]);
  const { data: campuses, isLoading: isLoadingCampuses } = useGetCollection<Campus>(campusesQuery);

  const campusMap = useMemo(() => new Map((campuses || []).map((c) => [c.id, c.name])), [campuses]);

  const primaryUnitDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfile?.unitId) return null;
    return doc(firestore, 'units', userProfile.unitId);
  }, [firestore, userProfile?.unitId]);
  const { data: primaryUnitDoc } = useDoc<any>(primaryUnitDocRef);

  const adminRoleDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'roles_admin', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);

  const { data: adminRoleDoc, isLoading: isAdminRoleLoading } = useDoc(adminRoleDocRef, { silent: true });

  const assignments = useMemo((): UserAssignment[] => {
    if (!userProfile) return [];

    const formatOfficeLabel = (unitName?: string, campusName?: string, role?: string): string => {
      if (unitName && unitName.trim()) return unitName.trim();
      const cName = (campusName || '').trim();
      const rName = (role || '').trim();
      if (cName && rName) return `${cName} • ${rName}`;
      return cName || rName || '';
    };

    const stored = (userProfile.assignments || [])
      .filter((assignment) => assignment && (assignment.unitId || assignment.campusId || assignment.role))
      .map((assignment, index) => {
        const resolvedCampusName = assignment.campusName || campusMap.get(assignment.campusId || '') || '';
        const fallbackId = `asgn:${assignment.unitId || 'none'}:${assignment.campusId || 'none'}:${assignment.role || assignment.roleId || index}`;
        return {
          ...assignment,
          id: assignment.id || fallbackId,
          campusName: resolvedCampusName,
          unitName: formatOfficeLabel(assignment.unitName, resolvedCampusName, assignment.role),
        };
      });

    const primaryCampusName = campusMap.get(userProfile.campusId || '') || '';
    const resolvedPrimaryUnitName = userProfile.unitName || primaryUnitDoc?.name || '';
    const baseRoleLower = (userProfile.role || '').toLowerCase();
    const hasAdminPrivilege =
      Boolean(adminRoleDoc) ||
      baseRoleLower.includes('admin') ||
      userProfile.email?.toLowerCase() === 'admin@eoms.com' ||
      stored.some((a) => a.role?.toLowerCase().includes('admin'));

    const primaryId = `primary:${userProfile.unitId || 'none'}:${userProfile.role || 'none'}`;
    const primaryAssignment: UserAssignment = {
      id: primaryId,
      unitId: userProfile.unitId || '',
      unitName: formatOfficeLabel(resolvedPrimaryUnitName, primaryCampusName, userProfile.role),
      campusId: userProfile.campusId || '',
      campusName: primaryCampusName,
      role: userProfile.role || '',
      roleId: userProfile.roleId || '',
      isPrimary: !hasAdminPrivilege || baseRoleLower.includes('admin'),
      assignedAt: undefined,
    };

    const hasPrimaryEquivalent = stored.some(
      (assignment) => assignment.unitId === primaryAssignment.unitId && assignment.role === primaryAssignment.role,
    );

    const baseList = hasPrimaryEquivalent
      ? stored.map((assignment) => ({
          ...assignment,
          isPrimary:
            (!hasAdminPrivilege || baseRoleLower.includes('admin')) &&
            assignment.unitId === primaryAssignment.unitId &&
            assignment.role === primaryAssignment.role,
        }))
      : [
          primaryAssignment,
          ...stored.map((assignment) => ({
            ...assignment,
            isPrimary: false,
          })),
        ];

    const hasExplicitAdminAssignment = baseList.some((assignment) => assignment.role?.toLowerCase().includes('admin'));
    if (hasAdminPrivilege && !hasExplicitAdminAssignment) {
      const adminAssignment: UserAssignment = {
        id: `primary:admin:${userProfile.id}`,
        unitId: '',
        unitName: formatOfficeLabel('System Administration', primaryCampusName, 'Admin'),
        campusId: userProfile.campusId || '',
        campusName: primaryCampusName,
        role: 'Admin',
        roleId: 'admin',
        isPrimary: true,
        assignedAt: undefined,
      };
      return [
        adminAssignment,
        ...baseList.map((assignment) => ({
          ...assignment,
          isPrimary: false,
        })),
      ];
    }

    return baseList;
  }, [userProfile, campusMap, primaryUnitDoc?.name, adminRoleDoc]);

  useEffect(() => {
    if (!userProfile) {
      setActiveAssignmentIdState(null);
      return;
    }

    const storageKey = `rsu_active_assignment_id:${userProfile.id}`;
    const storedId = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
    const requestedId = storedId || userProfile.activeAssignmentId || null;

    setActiveAssignmentIdState((currentId) => {
      const candidateId = currentId || requestedId;
      if (candidateId && assignments.some((assignment) => assignment.id === candidateId)) {
        return candidateId;
      }
      return assignments[0]?.id || null;
    });
  }, [userProfile, assignments]);

  const activeAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === activeAssignmentId) || assignments[0] || null,
    [assignments, activeAssignmentId],
  );

  const setActiveAssignmentId = useCallback(
    (assignmentId: string) => {
      if (!assignments.some((assignment) => assignment.id === assignmentId)) return;
      if (typeof window !== 'undefined' && userProfile?.id) {
        window.localStorage.setItem(`rsu_active_assignment_id:${userProfile.id}`, assignmentId);
      }
      setActiveAssignmentIdState(assignmentId);
    },
    [assignments, userProfile?.id],
  );

  const activeUnitId = activeAssignment ? activeAssignment.unitId : userProfile?.unitId;

  const unitDocRef = useMemoFirebase(() => {
    if (!firestore || !activeUnitId) return null;
    return doc(firestore, 'units', activeUnitId);
  }, [firestore, activeUnitId]);

  const { data: unitDoc, isLoading: isUnitDocLoading } = useDoc<any>(unitDocRef);

  const userProfileWithContext = useMemo(() => {
    if (!userProfile) return null;
    if (!activeAssignment) return userProfile;

    const resolvedUnitName =
      unitDoc?.name ||
      activeAssignment.unitName ||
      (activeAssignment.unitId === userProfile.unitId ? userProfile.unitName : '');

    return {
      ...userProfile,
      unitId: activeAssignment.unitId ?? userProfile.unitId,
      unitName: resolvedUnitName,
      campusId: activeAssignment.campusId || userProfile.campusId,
      role: activeAssignment.role || userProfile.role,
      roleId: activeAssignment.roleId || userProfile.roleId,
    };
  }, [userProfile, activeAssignment, unitDoc?.name]);

  const roleDocRef = useMemoFirebase(() => {
    if (!firestore || !userProfileWithContext?.roleId) return null;
    return doc(firestore, 'roles', userProfileWithContext.roleId);
  }, [firestore, userProfileWithContext?.roleId]);

  const { data: roleDoc } = useDoc<Role>(roleDocRef);

  // System settings are now only fetched if a user is logged in to avoid Permission Denied on public pages
  const systemSettingsRef = useMemoFirebase(() => {
    if (!firestore || !userAuthState.user) return null;
    return doc(firestore, 'system', 'settings');
  }, [firestore, userAuthState.user]);

  const { data: systemSettings } = useDoc<SystemSettings>(systemSettingsRef);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    const rawUserRole = userProfileWithContext?.role || roleDoc?.name || null;
    const unitLower = (unitDoc?.name || userProfileWithContext?.unitName || '').toLowerCase();

    // Robust Role Detection (scoped to Active University Designation when switched)
    const rawRoleLower = rawUserRole?.toLowerCase() || '';
    const activeRoleIdLower = (activeAssignment?.roleId || userProfileWithContext?.roleId || '').toLowerCase();
    const roleDocNameLower = (roleDoc?.name || '').toLowerCase();
    const baseRoleLower = (userProfile?.role || '').toLowerCase();

    const hasBaseAdminPrivilege =
      !!adminRoleDoc ||
      baseRoleLower.includes('admin') ||
      userProfile?.email?.toLowerCase() === 'admin@eoms.com' ||
      assignments.some((a) => a.role?.toLowerCase().includes('admin'));

    const isAssignmentExplicitAdmin =
      Boolean(activeAssignment?.isPrimary && hasBaseAdminPrivilege) ||
      rawRoleLower.includes('admin') ||
      activeRoleIdLower === 'admin';

    const isActiveAdmin = hasBaseAdminPrivilege && (!activeAssignment || isAssignmentExplicitAdmin);
    const isActiveAssignmentAuditor =
      !isActiveAdmin &&
      (rawRoleLower.includes('auditor') ||
        activeRoleIdLower.includes('auditor') ||
        roleDocNameLower.includes('auditor') ||
        unitLower === 'internal quality audit' ||
        unitLower === 'iqa' ||
        unitLower.includes('auditor'));

    const isAdmin = isActiveAdmin;
    const isAuditor = isActiveAssignmentAuditor;
    const userRole = isActiveAdmin ? 'Admin' : isAuditor && !rawRoleLower.includes('auditor') ? 'Auditor' : rawUserRole;
    const roleLower = userRole?.toLowerCase() || '';
    const isVp = roleLower.includes('vice president');
    const isTopManagement =
      isActiveAdmin ||
      isVp ||
      roleLower.includes('president') ||
      roleLower.includes('vice president') ||
      roleLower.includes('campus director');

    const isDOI =
      roleLower.includes('dean of instruction') ||
      roleLower === 'doi' ||
      ((unitLower.includes('dean of instruction') ||
        unitLower === 'doi' ||
        userProfileWithContext?.unitId === 'W61XJkVKga3ra2JaLINg') &&
        !roleLower.includes('coordinator') &&
        roleLower !== 'faculty');

    // Anyone with "Director", "ODIMO", "President", "Head", or "Dean of Instruction / DOI" in their role is an oversight supervisor
    const isSupervisor =
      isAdmin ||
      isVp ||
      roleLower.includes('director') ||
      roleLower.includes('odimo') ||
      roleLower.includes('president') ||
      roleLower.includes('head') ||
      isDOI;

    const isVpOffice =
      isVp ||
      unitLower.includes('vice president') ||
      unitLower.includes('president') ||
      unitLower.includes('ovpaa') ||
      unitLower.includes('ovpaf') ||
      unitLower.includes('ovpredi') ||
      unitLower.includes('ovpsas') ||
      unitLower === 'vpaa' ||
      unitLower === 'vpaf' ||
      unitLower === 'vpredi' ||
      unitLower === 'vpsas';

    const isSupervisoryViewer =
      isAdmin ||
      isAuditor ||
      isVp ||
      isVpOffice ||
      isDOI ||
      roleLower.includes('president') ||
      roleLower.includes('director') ||
      roleLower.includes('odimo') ||
      roleLower.includes('head');

    // FIAMO-specific role detection
    const isUnitCoordinator = roleLower.includes('unit coordinator');
    const isUnitOdimo = roleLower.includes('unit odimo') || (roleLower.includes('odimo') && roleLower.includes('unit'));
    const isVpaf =
      roleLower.includes('vice president') && (roleLower.includes('admin') || roleLower.includes('finance'));
    const isFiamoStaff = roleLower.includes('fiamo staff') || roleLower.includes('fiamo-staff');
    const isUnitHead = roleLower.includes('unit head');
    const isDriverMechanic =
      roleLower.includes('driver') || roleLower.includes('mechanic') || roleLower.includes('operator');

    const mainCampus = campuses?.find((c) => c.name === 'Main Campus');
    const isMainCampusCoordinator = !!(
      userProfileWithContext &&
      mainCampus &&
      userProfileWithContext.campusId === mainCampus.id &&
      (roleLower.includes('coordinator') || roleLower.includes('odimo'))
    );
    const isMainCampusDOI = !!(
      userProfileWithContext &&
      mainCampus &&
      userProfileWithContext.campusId === mainCampus.id &&
      isDOI
    );

    const rolePermissions = roleDoc?.permissions || {};

    const can = (permission: string): boolean => {
      if (isAdmin) return true;
      if (rolePermissions[permission] !== undefined) {
        return rolePermissions[permission] === true;
      }
      if (userRole) {
        const defaults = getDefaultPermissions(userRole);
        return defaults[permission] === true;
      }
      return false;
    };

    // The user is fully loaded only when auth state is determined AND the Firestore profile is loaded.
    const isUserLoading =
      userAuthState.isAuthLoading ||
      (!!userAuthState.user && (isProfileLoading || isAdminRoleLoading || isLoadingCampuses || isUnitDocLoading));

    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: isUserLoading,
      userError: userAuthState.userError,
      userProfile: userProfileWithContext,
      isProfileLoading,
      assignments,
      activeAssignment,
      setActiveAssignmentId,
      isAdmin,
      isTopManagement,
      isAuditor,
      isAdminLoading: isAdminRoleLoading,
      userRole,
      isSupervisor,
      isVp,
      isVpOffice,
      isSupervisoryViewer,
      isMainCampusCoordinator,
      isMainCampusDOI,
      isDoi: isDOI,
      // FIAMO-specific role flags
      isUnitCoordinator,
      isUnitOdimo,
      isVpaf,
      isFiamoStaff,
      isUnitHead,
      isDriverMechanic,
      systemSettings: systemSettings || null,
      can,
    };
  }, [
    firebaseApp,
    firestore,
    auth,
    userAuthState,
    userProfile,
    userProfileWithContext,
    assignments,
    activeAssignment,
    setActiveAssignmentId,
    isProfileLoading,
    adminRoleDoc,
    isAdminRoleLoading,
    campuses,
    isLoadingCampuses,
    systemSettings,
    roleDoc,
    unitDoc,
    isUnitDocLoading,
  ]);

  // A separate component or hook is needed to use the Activity Log context
  function ActivityLogger() {
    const { logSessionActivity } = useSessionActivity();
    const { user, userProfile, userRole, isUserLoading } = useContext(FirebaseContext)!;

    useEffect(() => {
      // Log the login event only once per session when all user data is ready
      if (user && userProfile && userRole && !isUserLoading && !loginLoggedRef.current) {
        logSessionActivity('User logged in', {
          action: 'user_login',
          details: { method: user.providerData[0]?.providerId || 'email' },
        });
        loginLoggedRef.current = true; // Mark as logged for this session
      }
    }, [user, userProfile, userRole, isUserLoading, logSessionActivity]);

    return null; // This component does not render anything
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      <ActivityLogProvider>
        <ActivityLogger />
        {children}
      </ActivityLogProvider>
    </FirebaseContext.Provider>
  );
};

/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if used outside provider. Returns a guarded object if services are not ready.
 */
export const useFirebase = (): UseFirebaseResult | { areServicesAvailable: false } => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    return { areServicesAvailable: false };
  }

  return {
    areServicesAvailable: true,
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    userProfile: context.userProfile,
    isProfileLoading: context.isProfileLoading,
    assignments: context.assignments,
    activeAssignment: context.activeAssignment,
    setActiveAssignmentId: context.setActiveAssignmentId,
    isAdmin: context.isAdmin,
    isTopManagement: context.isTopManagement,
    isAuditor: context.isAuditor,
    isAdminLoading: context.isAdminLoading,
    userRole: context.userRole,
    isSupervisor: context.isSupervisor,
    isVp: context.isVp,
    isVpOffice: context.isVpOffice,
    isSupervisoryViewer: context.isSupervisoryViewer,
    isMainCampusCoordinator: context.isMainCampusCoordinator,
    isMainCampusDOI: context.isMainCampusDOI,
    isDoi: context.isDoi,
    // FIAMO-specific role flags
    isUnitCoordinator: context.isUnitCoordinator,
    isUnitOdimo: context.isUnitOdimo,
    isVpaf: context.isVpaf,
    isFiamoStaff: context.isFiamoStaff,
    isUnitHead: context.isUnitHead,
    isDriverMechanic: context.isDriverMechanic,
    systemSettings: context.systemSettings,
    can: context.can,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  const context = useFirebase();
  if (!context.areServicesAvailable) {
    return null;
  }
  return context.auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const context = useFirebase();
  if (!context.areServicesAvailable) {
    return null;
  }
  return context.firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useFirebase();
  if (!context.areServicesAvailable) {
    return null;
  }
  return context.firebaseApp;
};

/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UseUserResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UseUserResult => {
  const context = useFirebase();
  if (!context.areServicesAvailable) {
    return {
      user: null,
      userProfile: null,
      isUserLoading: true,
      userError: null,
      assignments: [],
      activeAssignment: null,
      setActiveAssignmentId: () => {},
      isAdmin: false,
      isTopManagement: false,
      isAuditor: false,
      userRole: null,
      isSupervisor: false,
      isVp: false,
      isVpOffice: false,
      isSupervisoryViewer: false,
      isMainCampusCoordinator: false,
      isMainCampusDOI: false,
      isDoi: false,
      // FIAMO-specific role flags
      isUnitCoordinator: false,
      isUnitOdimo: false,
      isVpaf: false,
      isFiamoStaff: false,
      isUnitHead: false,
      isDriverMechanic: false,
      systemSettings: null,
      firestore: null,
      can: () => false,
    };
  }
  const {
    user,
    userProfile,
    isUserLoading,
    userError,
    assignments,
    activeAssignment,
    setActiveAssignmentId,
    isAdmin,
    isTopManagement,
    isAuditor,
    userRole,
    isSupervisor,
    isVp,
    isVpOffice,
    isSupervisoryViewer,
    firestore,
    isMainCampusCoordinator,
    isMainCampusDOI,
    isDoi,
    // FIAMO-specific role flags
    isUnitCoordinator,
    isUnitOdimo,
    isVpaf,
    isFiamoStaff,
    isUnitHead,
    isDriverMechanic,
    systemSettings,
    can,
  } = context;
  return {
    user,
    userProfile,
    isUserLoading,
    userError,
    assignments,
    activeAssignment,
    setActiveAssignmentId,
    isAdmin,
    isTopManagement,
    isAuditor,
    userRole,
    isSupervisor,
    isVp,
    isVpOffice,
    isSupervisoryViewer,
    isMainCampusCoordinator,
    isMainCampusDOI,
    isDoi,
    // FIAMO-specific role flags
    isUnitCoordinator,
    isUnitOdimo,
    isVpaf,
    isFiamoStaff,
    isUnitHead,
    isDriverMechanic,
    systemSettings,
    firestore,
    can,
  };
};
