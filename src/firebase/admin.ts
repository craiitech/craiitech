
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
  let app: admin.app.App;

  try {
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId,
      });
    } else {
      // Fallback: Try initializing with just the project ID
      // This may work in some GCP environments or with ADC
      app = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }

    // Apply settings strictly ONCE right after initialization
    try {
      admin.firestore(app).settings({
        ignoreUndefinedProperties: true,
      });
    } catch (settingError) {
      // Ignore if already set in this environment
    }

    return app;
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
  const app = initializeAdmin();
  if (!app) {
    return null;
  }
  cachedDb = admin.firestore(app);
  return cachedDb;
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
