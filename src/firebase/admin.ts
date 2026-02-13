
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
      // Fallback to Project ID only - prevents crash if SA is missing during build
      return admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
  } catch (error) {
    // Avoid console.error here to prevent potential recursion if monkey-patched
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
  if (!app) throw new Error("Firebase Admin SDK failed to initialize. Check environment variables.");
  const db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  return db;
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) throw new Error("Firebase Admin SDK failed to initialize. Check environment variables.");
  return admin.auth();
}
