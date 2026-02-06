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
    }
}

// --- ISO Clause Seeding Action ---
export async function seedIsoClauses() {
    try {
        const firestore = getAdminFirestore();
        const clausesCollection = firestore.collection('isoClauses');

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
 */
export async function getOfficialServerTime(): Promise<{ iso: string; year: number; dateString: string }> {
    const now = new Date();
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const phTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + PH_OFFSET);
    
    return {
        iso: phTime.toISOString(),
        year: phTime.getFullYear(),
        dateString: phTime.toISOString().split('T')[0]
    };
}

/**
 * Saves a risk entry as an Administrator. 
 * This uses the Admin SDK to bypass client-side security rules.
 */
export async function saveRiskAdmin(riskData: any, riskId?: string) {
    try {
        const firestore = getAdminFirestore();
        const risksCollection = firestore.collection('risks');
        
        const dataToSave = {
            ...riskData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (riskId) {
            await risksCollection.doc(riskId).set(dataToSave, { merge: true });
            return { success: true, id: riskId };
        } else {
            const docRef = await risksCollection.add({
                ...dataToSave,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, id: docRef.id };
        }
    } catch (error: any) {
        console.error("Admin Risk Save Error:", error);
        throw new Error(error.message || "Failed to save risk data as admin.");
    }
}
