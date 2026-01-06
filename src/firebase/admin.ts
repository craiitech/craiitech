import * as admin from 'firebase-admin';
import { firebaseAdminConfig } from './config-admin';

const ADMIN_APP_NAME = 'firebase-admin-app-rsu-eoms';

let adminApp: admin.app.App;

function initializeAdminApp() {
    if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
        adminApp = admin.app(ADMIN_APP_NAME);
        return;
    }

    try {
        adminApp = admin.initializeApp({
            credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount)
        }, ADMIN_APP_NAME);
    } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error.message);
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
