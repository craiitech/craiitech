
import * as admin from 'firebase-admin';

const ADMIN_APP_NAME = 'firebase-admin-app';

let adminApp: admin.app.App;

function initializeAdminApp() {
    if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
        adminApp = admin.app(ADMIN_APP_NAME);
        return;
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        }, ADMIN_APP_NAME);
    } catch (error) {
        console.error('Firebase Admin Initialization Error:', error);
        // This will prevent the app from starting if creds are bad
        throw new Error('Could not initialize Firebase Admin SDK. Please check service account credentials.');
    }
}

export function getAdminFirestore() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return admin.firestore(adminApp);
}

export function getAdminAuth() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return admin.auth(adminApp);
}
