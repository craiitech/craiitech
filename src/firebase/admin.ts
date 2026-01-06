
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only if it hasn't been initialized yet.
// For managed environments like Firebase Functions or App Hosting,
// initializeApp() can be called without arguments. It will automatically
// detect the service account credentials.
if (!getApps().length) {
  initializeApp();
}

export const firestore = getFirestore();
export const auth = getAuth();
