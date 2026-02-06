
'use server';

import { getAdminFirestore } from '@/firebase/admin';
import * as admin from 'firebase-admin';
import isoClausesData from './iso-clauses.json';

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
        
        const sanitizedPayload = {
            errorMessage: payload.errorMessage || 'No error message provided.',
            errorStack: payload.errorStack || 'No stack trace provided.',
            errorDigest: payload.errorDigest || null,
            url: payload.url,
            userId: payload.userId || null,
            userName: payload.userName || null,
            userRole: payload.userRole || null,
            userEmail: payload.userEmail || null,
        };

        await reportCollection.add({
            ...sanitizedPayload,
            status: 'new',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
        console.error('Failed to log error to Firestore:', error);
        // Do not re-throw. The error reporting system should fail silently
        // to avoid causing further errors. The console.error is sufficient for debugging.
    }
}

// --- ISO Clause Seeding Action ---
export async function seedIsoClauses() {
    try {
        const firestore = getAdminFirestore();
        const clausesCollection = firestore.collection('isoClauses');

        // Check if the collection is empty before seeding
        const snapshot = await clausesCollection.limit(1).get();
        if (!snapshot.empty) {
            console.log('ISO clauses collection already populated. Seeding skipped.');
            return { success: true, message: 'Clauses already exist.' };
        }
        
        const batch = firestore.batch();
        const clauses = isoClausesData.clauses;

        clauses.forEach(clause => {
            const docRef = clausesCollection.doc(clause.id);
            batch.set(docRef, clause);
        });

        await batch.commit();
        console.log('Successfully seeded ISO clauses collection.');
        return { success: true, message: `${clauses.length} ISO clauses have been seeded.` };
    } catch (error) {
        console.error('Failed to seed ISO clauses:', error);
        throw new Error("Could not seed ISO clauses to the database.");
    }
}

/**
 * Returns the current date and time adjusted to Philippine Time (UTC+8).
 * This runs on the server and cannot be altered by the user's local clock.
 */
export async function getOfficialServerTime(): Promise<{ iso: string; year: number; dateString: string }> {
    const now = new Date();
    // Offset for Philippines (UTC+8) in milliseconds
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const phTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + PH_OFFSET);
    
    return {
        iso: phTime.toISOString(),
        year: phTime.getFullYear(),
        dateString: phTime.toISOString().split('T')[0]
    };
}
