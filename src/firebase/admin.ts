
import * as admin from 'firebase-admin';
import { firebaseConfig } from './config';

/**
 * Robustly initializes the Firebase Admin SDK.
 * It uses the project ID from the configuration to ensure the SDK identifies
 * the correct project even when explicit credentials are not provided.
 */
function initializeAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Attempt to initialize with the projectId. In many cloud environments, 
  // credentials are provided automatically. If not, the Firestore calls 
  // will be caught by the error handler in the server action.
  return admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
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
