import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

function initializeAdminApp() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    adminApp = initializeApp();
  }
}

export function getAdminFirestore() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return getFirestore(adminApp);
}

export function getAdminAuth() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return getAuth(adminApp);
}
