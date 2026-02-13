
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

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT;

  try {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
    } else {
      // Fallback: This works if running in a Google Cloud environment with default credentials
      return admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (error) {
    process.stdout.write("Firebase Admin initialization warning: " + String(error) + "\n");
    try {
        return admin.app();
    } catch {
        return null;
    }
  }
}

/**
 * Returns an initialized Firestore admin instance.
 */
export function getAdminFirestore() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK failed to initialize. Ensure FIREBASE_SERVICE_ACCOUNT is set in your environment variables for Admin operations.");
  }
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    throw new Error("Firebase Admin SDK failed to initialize. Ensure FIREBASE_SERVICE_ACCOUNT is set in your environment variables for Admin operations.");
  }
  return admin.auth();
}
