
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, collection } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useDoc } from './firestore/use-doc';
import { useCollection, type WithId } from './firestore/use-collection';
import type { User as AppUser, Role, Campus } from '@/lib/types';
import { useMemoFirebase } from './';
import { useSessionActivity, ActivityLogProvider } from '@/lib/activity-log-provider';
import { useToast } from '@/hooks/use-toast';


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
  isAdmin: boolean;
  isAdminLoading: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isVp: boolean;
  isMainCampusCoordinator: boolean;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  areServicesAvailable: true;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  userProfile: WithId<AppUser> | null;
  isProfileLoading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isVp: boolean;
  isMainCampusCoordinator: boolean;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  userProfile: WithId<AppUser> | null;
  isUserLoading: boolean; // Combines auth and profile loading
  userError: Error | null;
  isAdmin: boolean;
  userRole: string | null;
  isSupervisor: boolean;
  isVp: boolean;
  isMainCampusCoordinator: boolean;
  firestore: Firestore | null; // Added for convenience in some hooks
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
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
      setUserAuthState({ user: null, isAuthLoading: false, userError: new Error("Auth service not provided.") });
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
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isAuthLoading: false, userError: error });
        toast({
          title: 'Authentication Error',
          description: error.message || 'An unknown authentication error occurred.',
          variant: 'destructive',
        });
      }
    );
    return () => unsubscribe();
  }, [auth, toast]);


  const userDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'users', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const adminRoleDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'roles_admin', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);

  const { data: adminRoleDoc, isLoading: isAdminRoleLoading } = useDoc(adminRoleDocRef);

  const campusesQuery = useMemoFirebase(() => {
    // Wait for the user to be authenticated before trying to fetch campuses.
    if (!firestore || !userAuthState.user) return null;
    return collection(firestore, 'campuses');
  }, [firestore, userAuthState.user]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    const userRole = userProfile?.role || null;
    const isAdmin = !!adminRoleDoc;
    const isVp = !!userRole?.toLowerCase().includes('vice president');
    
    // Unit ODIMO is no longer a supervisor for approvals
    const supervisorRoles = ['Admin', 'Campus Director', 'Campus ODIMO'];
    const isSupervisor = isAdmin || (userRole ? supervisorRoles.some(role => userRole.includes(role)) : false) || isVp;

    const mainCampus = campuses?.find(c => c.name === 'Main Campus');
    const isMainCampusCoordinator = !!(
      userProfile &&
      mainCampus &&
      userProfile.campusId === mainCampus.id &&
      (userProfile.role === 'Unit Coordinator' || userProfile.role === 'Unit ODIMO')
    );

    // The user is fully loaded only when auth state is determined AND the Firestore profile is loaded.
    const isUserLoading = userAuthState.isAuthLoading || (!!userAuthState.user && (isProfileLoading || isAdminRoleLoading || isLoadingCampuses));


    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      user: userAuthState.user,
      isUserLoading: isUserLoading,
      userError: userAuthState.userError,
      userProfile,
      isProfileLoading,
      isAdmin,
      isAdminLoading: isAdminRoleLoading,
      userRole,
      isSupervisor,
      isVp,
      isMainCampusCoordinator,
    };
  }, [firebaseApp, firestore, auth, userAuthState, userProfile, isProfileLoading, adminRoleDoc, isAdminRoleLoading, campuses, isLoadingCampuses]);
  
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
export const useFirebase = (): FirebaseServicesAndUser | { areServicesAvailable: false } => {
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
    isAdmin: context.isAdmin,
    isAdminLoading: context.isAdminLoading,
    userRole: context.userRole,
    isSupervisor: context.isSupervisor,
    isVp: context.isVp,
    isMainCampusCoordinator: context.isMainCampusCoordinator,
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
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => { 
  const context = useFirebase();
   if (!context.areServicesAvailable) {
      return { user: null, userProfile: null, isUserLoading: true, userError: null, isAdmin: false, userRole: null, isSupervisor: false, isVp: false, isMainCampusCoordinator: false, firestore: null };
  }
  const { user, userProfile, isUserLoading, userError, isAdmin, userRole, isSupervisor, isVp, firestore, isMainCampusCoordinator } = context; 
  return { user, userProfile, isUserLoading, userError, isAdmin, userRole, isSupervisor, isVp, firestore, isMainCampusCoordinator };
};
