
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
      // Fallback: Try initializing with just the project ID
      // This may work in some GCP environments or with ADC
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

let cachedDb: admin.firestore.Firestore | null = null;

/**
 * Returns an initialized Firestore admin instance.
 * Returns null if initialization fails instead of throwing to prevent crash loops.
 */
export function getAdminFirestore() {
  if (cachedDb) {
    return cachedDb;
  }
  const isAlreadyInitialized = admin.apps.length > 0;
  const app = initializeAdmin();
  if (!app) {
    return null;
  }
  const db = admin.firestore();
  if (!isAlreadyInitialized) {
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch (e) {
      // Settings can only be configured once, ignore if already set
    }
  }
  cachedDb = db;
  return db;
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  const app = initializeAdmin();
  if (!app) {
    return null;
  }
  return admin.auth();
}
