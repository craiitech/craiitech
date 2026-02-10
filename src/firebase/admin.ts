
import * as admin from 'firebase-admin';

// This is the path to the service account key file that has been securely 
// provisioned in the server environment.
const SERVICE_ACCOUNT_FILE_PATH = './firebase-admin-service-account.json';
const ADMIN_APP_NAME = 'firebase-admin-app';


function getAdminApp(): admin.app.App {
  // Check if the app is already initialized to prevent errors.
  if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
    return admin.app(ADMIN_APP_NAME);
  }

  try {
    // Attempt to initialize with a service account file if provided.
    // In many environments, the file might not be present, so we'll wrap this.
    return admin.initializeApp({
      credential: admin.credential.cert(SERVICE_ACCOUNT_FILE_PATH),
    }, ADMIN_APP_NAME);
  } catch (error: any) {
    // If the file is missing, try Application Default Credentials (ADC)
    // which works automatically in many Cloud environments (like Firebase App Hosting).
    try {
        return admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        }, ADMIN_APP_NAME);
    } catch (adcError) {
        console.error('CRITICAL: Firebase Admin Initialization Error.', error);
        // Throw a clear error to indicate the root cause.
        throw new Error('Could not initialize Firebase Admin SDK. Please ensure service account credentials are configured.');
    }
  }
}

/**
 * Returns an initialized Firestore admin instance.
 */
export function getAdminFirestore() {
  const app = getAdminApp();
  return admin.firestore(app);
}

/**
 * Returns an initialized Auth admin instance.
 */
export function getAdminAuth() {
  const app = getAdminApp();
  return admin.auth(app);
}
