'use server';

import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// This function initializes and returns the Firebase Admin App instance.
// It ensures that initialization only happens once.
function getFirebaseAdminApp(): App {
  // If the app is already initialized, return it.
  if (getApps().length > 0) {
    return getApps()[0];
  }
  
  // Otherwise, initialize the app. In a managed environment like App Hosting,
  // initializeApp() can be called without arguments.
  return initializeApp();
}

// Export singleton instances of Firestore and Auth services.
const adminApp = getFirebaseAdminApp();
export const firestore = getFirestore(adminApp);
export const auth = getAuth(adminApp);
