import * as admin from 'firebase-admin';

// This is the path to the service account key file that has been securely 
// provisioned in the server environment.
const SERVICE_ACCOUNT_FILE_PATH = './firebase-admin-service-account.json';
const ADMIN_APP_NAME = 'firebase-admin-app';

let adminApp: admin.app.App;

function initializeAdminApp() {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
    adminApp = admin.app(ADMIN_APP_NAME);
    return;
  }

  try {
    // Initialize the app with a service account credential from the file path.
    // This is the most robust method and avoids all JSON parsing issues.
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(SERVICE_ACCOUNT_FILE_PATH),
    }, ADMIN_APP_NAME);
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin Initialization Error from file path.', error);
    // Throw a clear error to indicate the root cause.
    throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials.');
  }
}

/**
 * Returns an initialized Firestore admin instance.
 */
export function getAdminFirestore() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return admin.firestore(adminApp);
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return admin.auth(adminApp);
}
