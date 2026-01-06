
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Role } from './types';
import { getApps, initializeApp, type App, credential, getApp } from 'firebase-admin/app';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';

const ADMIN_APP_NAME = 'firebase-admin';

// Helper function to initialize and get the admin app
function getAdminApp(): App {
  if (getApps().some(app => app.name === ADMIN_APP_NAME)) {
    return getApp(ADMIN_APP_NAME);
  }
  return initializeApp({
    credential: credential.applicationDefault(),
  }, ADMIN_APP_NAME);
}

const AUTH_COOKIE_NAME = 'rsu-eoms-auth';

// This function is kept for compatibility but Firebase auth is handled client-side
export async function login(role: Role) {
  // The actual login is now handled on the client with Firebase.
  // This server action could be used for other server-side logic after login if needed.
  // For now, we just redirect.
  redirect('/dashboard');
}

export async function logout() {
  // Client-side will handle Firebase signout. This is for any server-side session cleanup.
  cookies().delete(AUTH_COOKIE_NAME);
  redirect('/login');
}


// --- Error Reporting Action ---
interface ErrorReportPayload {
    errorMessage?: string;
    errorStack?: string;
    errorDigest?: string;
    url: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    userEmail?: string;
}

export async function logError(payload: ErrorReportPayload) {
    const adminApp = getAdminApp();
    const firestore = getFirestore(adminApp);
    
    try {
        const reportCollection = firestore.collection('errorReports');
        await reportCollection.add({
            ...payload,
            status: 'new',
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to log error to Firestore:', error);
        // We throw an error here so the client knows the report failed.
        throw new Error("Could not submit error report.");
    }
}
