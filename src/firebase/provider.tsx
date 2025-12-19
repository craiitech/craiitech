
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useRef } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, collection } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import { useDoc } from './firestore/use-doc';
import { useCollection, type WithId } from './firestore/use-collection';
import type { User as AppUser, Role } from '@/lib/types';
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
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult { 
  user: User | null;
  userProfile: WithId<AppUser> | null;
  isUserLoading: boolean; // Combines auth and profile loading
  userError: Error | null;
  isAdmin: boolean;
  userRole: string | null;
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
    if (!auth) { // If no Auth service instance, cannot determine user state
      setUserAuthState({ user: null, isAuthLoading: false, userError: new Error("Auth service not provided.") });
      return;
    }

    setUserAuthState({ user: null, isAuthLoading: true, userError: null }); // Reset on auth instance change

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => { // Auth state determined
        setUserAuthState({ user: firebaseUser, isAuthLoading: false, userError: null });
        if (!firebaseUser) {
           // Reset the login logged flag when user logs out
           loginLoggedRef.current = false;
        }
      },
      (error) => { // Auth listener error
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isAuthLoading: false, userError: error });
        toast({
          title: 'Login Failed',
          description: error.message || 'An unknown authentication error occurred.',
          variant: 'destructive',
        });
      }
    );
    return () => unsubscribe(); // Cleanup
  }, [auth, toast]);


  const userDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'users', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);
  
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<AppUser>(userDocRef);

  const adminDocRef = useMemoFirebase(() => {
    if (!userAuthState.user || !firestore) return null;
    return doc(firestore, 'roles_admin', userAuthState.user.uid);
  }, [userAuthState.user, firestore]);

  const { data: adminDoc, isLoading: isAdminLoading } = useDoc(adminDocRef);

  const rolesQuery = useMemoFirebase(() => (firestore && userAuthState.user ? collection(firestore, 'roles') : null), [firestore, userAuthState.user]);
  const { data: roles, isLoading: isLoadingRoles } = useCollection<Role>(rolesQuery);
  
  // Memoize the context value
  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    const isAdmin = !!adminDoc;
    
    // Correctly determine loading state. It's loading if auth is loading, or if a user exists but their profile/role/admin status isn't confirmed yet.
    const isUserLoading = userAuthState.isAuthLoading || (!!userAuthState.user && (isProfileLoading || isAdminLoading || isLoadingRoles));

    const userRole = isAdmin ? 'Admin' : (userProfile && roles ? (roles.find(r => r.id === userProfile.roleId)?.name || null) : null);

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
      isAdminLoading,
      userRole,
    };
  }, [firebaseApp, firestore, auth, userAuthState, userProfile, isProfileLoading, adminDoc, isAdminLoading, roles, isLoadingRoles]);
  
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
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth => {
  const context = useFirebase();
   if (!context.areServicesAvailable) {
    throw new Error("useAuth called before Firebase services were available.");
  }
  return context.auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore => {
  const context = useFirebase();
  if (!context.areServicesAvailable) {
    throw new Error("useFirestore called before Firebase services were available.");
  }
  return context.firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp => {
  const context = useFirebase();
   if (!context.areServicesAvailable) {
    throw new Error("useFirebaseApp called before Firebase services were available.");
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
      return { user: null, userProfile: null, isUserLoading: true, userError: null, isAdmin: false, userRole: null };
  }
  const { user, userProfile, isUserLoading, userError, isAdmin, userRole } = context; 
  return { user, userProfile, isUserLoading, userError, isAdmin, userRole };
};

    