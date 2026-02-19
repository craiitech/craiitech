'use server';

import { getAdminFirestore } from '@/firebase/admin';
import * as admin from 'firebase-admin';

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
        if (!firestore) return { success: false, error: 'Admin SDK not initialized.' };
        
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
        return { success: true };
    } catch (error) {
        console.error('Failed to log error to Firestore:', error);
        return { success: false };
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
