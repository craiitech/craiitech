
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  enableMultiTabIndexedDbPersistence, 
  Firestore,
  CACHE_SIZE_UNLIMITED
} from '@/firebase/firestore-wrapper'
import { useMemo, type DependencyList } from 'react';

// Singleton to hold initialized SDKs
let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null = null;

/**
 * Robustly initializes Firebase services once.
 * Implements a singleton pattern to prevent re-initialization errors.
 */
export function initializeFirebase() {
  if (cachedSdks) {
    return cachedSdks;
  }

  // Handle App initialization
  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

  // Initialize Firestore with specific settings for heavy offline use
  let firestore: Firestore;
  try {
    firestore = initializeFirestore(firebaseApp, {
      experimentalForceLongPolling: true,
      cacheSizeBytes: CACHE_SIZE_UNLIMITED, // Ensure large audit databases fit locally
    });
  } catch (e) {
    // If already initialized, get the existing instance
    firestore = getFirestore(firebaseApp);
  }

  // --- ENABLE PERSISTENT CACHE FOR OFFLINE USE ---
  // Must be called before any other Firestore operations
  if (typeof window !== 'undefined') {
    // enableMultiTabIndexedDbPersistence is preferred for PWAs
    enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time.
        console.warn('Firestore persistence: Multiple tabs open. Persistence limited to primary tab.');
      } else if (err.code === 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn('Firestore persistence: Browser not supported.');
      } else {
        console.error('Firestore persistence error:', err);
      }
    });
  }

  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore
  };

  return cachedSdks;
}

// Keep getSdks for internal compatibility if needed, though initializeFirebase is preferred
export function getSdks(firebaseApp: FirebaseApp) {
  return initializeFirebase();
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './firestore/use-get-collection';
export * from './firestore/use-get-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}
