'use server';

import { getApps, initializeApp, type App, credential } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

function initializeAdminApp() {
  if (getApps().length > 0) {
    adminApp = getApps()[0];
  } else {
    // Use Application Default Credentials. This is the standard and secure way
    // for server-side code to authenticate in a Google Cloud environment.
    adminApp = initializeApp({
      credential: credential.applicationDefault(),
    });
  }
}

export async function getAdminFirestore() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return getFirestore(adminApp);
}

export async function getAdminAuth() {
  if (!adminApp) {
    initializeAdminApp();
  }
  return getAuth(adminApp);
}
