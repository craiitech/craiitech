
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
