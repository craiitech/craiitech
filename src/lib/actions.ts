
'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { useUser } from '@/firebase';

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
    try {
        const firestore = getAdminFirestore();
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
