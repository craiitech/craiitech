
'use server';

import * as admin from 'firebase-admin';

const ADMIN_APP_NAME = 'firebase-admin-actions';

// Helper function to initialize and get the admin app
function getAdminApp(): admin.app.App {
  if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
    return admin.app(ADMIN_APP_NAME);
  }
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }, ADMIN_APP_NAME);
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
    const firestore = admin.firestore(adminApp);
    
    try {
        const reportCollection = firestore.collection('errorReports');
        await reportCollection.add({
            ...payload,
            status: 'new',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to log error to Firestore:', error);
        // We throw an error here so the client knows the report failed.
        throw new Error("Could not submit error report.");
    }
}
