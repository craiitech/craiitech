'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from '@/firebase/firestore-wrapper';
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

  // Initialize Firestore with modern persistent local cache for multi-tab support
  let firestore: Firestore;
  try {
    if (typeof window !== 'undefined') {
      firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } else {
      firestore = getFirestore(firebaseApp);
    }
  } catch (e) {
    // If already initialized, get the existing instance
    firestore = getFirestore(firebaseApp);
  }

  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore,
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

type MemoFirebase<T> = T & { __memo?: boolean };

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | MemoFirebase<T> {
  const memoized = useMemo(factory, deps);

  if (typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;

  return memoized;
}
