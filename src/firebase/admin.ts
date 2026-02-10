
import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';
import fs from 'fs';

// This is the path to the service account key file that might be provisioned
const SERVICE_ACCOUNT_FILE_PATH = './firebase-admin-service-account.json';

/**
 * Robustly initializes the Firebase Admin SDK.
 * It checks for a local service account file first, then falls back to Application Default Credentials.
 * Providing the projectId explicitly helps resolve token refresh errors in some environments.
 */
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const options: admin.AppOptions = {
    projectId: firebaseConfig.projectId,
  };

  try {
    // Check if service account file exists locally
    if (fs.existsSync(SERVICE_ACCOUNT_FILE_PATH)) {
      options.credential = admin.credential.cert(SERVICE_ACCOUNT_FILE_PATH);
    } else {
      // Fallback to Application Default Credentials (ADC)
      // Note: This may fail in local environments without GOOGLE_APPLICATION_CREDENTIALS
      options.credential = admin.credential.applicationDefault();
    }

    return admin.initializeApp(options);
  } catch (error) {
    console.error('Firebase Admin Initialization Warning:', error);
    // Final fallback attempt with no options if everything else fails
    // This allows the SDK to at least initialize, though it may fail on secured requests
    return admin.initializeApp({
        projectId: firebaseConfig.projectId,
    });
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
