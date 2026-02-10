
import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Robustly initializes the Firebase Admin SDK.
 * Supports initialization via environment-level Service Account credentials.
 */
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // 1. Check for Service Account Key in environment variables
  // This is the "Master Key" required to fix the 500 Connection Error
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    if (serviceAccountKey) {
      // If the key is provided, parse it and initialize with full privileges
      const serviceAccount = JSON.parse(serviceAccountKey);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
    } else {
      // Fallback to Project ID only (requires environment-level auth like Google Cloud)
      return admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization warning:", error);
    // If all else fails, return the default app instance
    return admin.app();
  }
}

/**
 * Returns an initialized Firestore admin instance.
 */
export function getAdminFirestore() {
  initializeAdmin();
  const db = admin.firestore();
  // Ensure settings are optimal for server-side use
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  initializeAdmin();
  return admin.auth();
}
