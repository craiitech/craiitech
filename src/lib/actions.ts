
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

const submissionTypes = [
  'Operational Plan',
  'Quality Objectives Monitoring',
  'Risk and Opportunity Registry',
  'Risk and Opportunity Action Plan',
  'Needs and Expectation of Interested Parties',
  'SWOT Analysis',
];

/**
 * Fetches compliance matrix data for the public landing page.
 * Bypasses firestore.rules by using the Admin SDK.
 * Returns a fallback object instead of throwing to prevent landing page crashes.
 */
export async function getPublicSubmissionMatrixData(year: number) {
    try {
        const firestore = getAdminFirestore();
        
        // 1. Fetch Foundations
        const campusesSnap = await firestore.collection('campuses').get();
        const unitsSnap = await firestore.collection('units').get();
        const cyclesSnap = await firestore.collection('cycles').get(); 
        
        // 2. Fetch all submissions for the target year
        const submissionsSnap = await firestore.collection('submissions').where('year', '==', year).get();

        const campuses = campusesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const units = unitsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const allCycles = cyclesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 3. Normalize Submissions (Fuzzy Matching)
        const submissionMap = new Map<string, any>();
        submissionsSnap.forEach(doc => {
            const s = doc.data();
            const cId = String(s.campusId || '').trim().toLowerCase();
            const uId = String(s.unitId || '').trim().toLowerCase();
            const cycle = String(s.cycleId || '').trim().toLowerCase();
            
            let rType = String(s.reportType || '').trim();
            const lowerType = rType.toLowerCase();
            
            if (lowerType.includes('risk and opportunity registry')) rType = 'Risk and Opportunity Registry';
            else if (lowerType.includes('operational plan')) rType = 'Operational Plan';
            else if (lowerType.includes('objectives monitoring')) rType = 'Quality Objectives Monitoring';
            else if (lowerType.includes('needs and expectation')) rType = 'Needs and Expectation of Interested Parties';
            else if (lowerType.includes('swot')) rType = 'SWOT Analysis';
            else if (lowerType.includes('action plan') && lowerType.includes('risk')) rType = 'Risk and Opportunity Action Plan';

            const key = `${cId}-${uId}-${rType.toLowerCase()}-${cycle}`;
            submissionMap.set(key, s);
        });

        // 4. Build Matrix
        const matrix = campuses.map((campus: any) => {
            const campusUnits = units.filter((u: any) => u.campusIds?.includes(campus.id));
            if (campusUnits.length === 0) return null;

            const unitStatuses = campusUnits.map((unit: any) => {
                const statuses: Record<string, 'submitted' | 'missing' | 'not-applicable'> = {};
                
                ['first', 'final'].forEach(cycleId => {
                    const rorKey = `${String(campus.id).toLowerCase()}-${String(unit.id).toLowerCase()}-risk and opportunity registry-${cycleId}`;
                    const ror = submissionMap.get(rorKey);
                    const isActionPlanNA = String(ror?.riskRating || '').toLowerCase() === 'low';

                    submissionTypes.forEach(type => {
                        const key = `${String(campus.id).toLowerCase()}-${String(unit.id).toLowerCase()}-${type.toLowerCase()}-${cycleId}`;
                        if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) {
                            statuses[key] = 'not-applicable';
                        } else if (submissionMap.has(key)) {
                            statuses[key] = 'submitted';
                        } else {
                            statuses[key] = 'missing';
                        }
                    });
                });

                return { unitId: unit.id, unitName: unit.name || 'Unknown Unit', statuses };
            }).sort((a, b) => (a.unitName || '').localeCompare(b.unitName || ''));

            return { campusId: campus.id, campusName: campus.name || 'Unknown Campus', units: unitStatuses };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => (a.campusName || '').localeCompare(b.campusName || ''));

        // Dynamic years from cycles
        let availableYears = [...new Set(allCycles.map((c: any) => Number(c.year)))].sort((a, b) => b - a);
        if (availableYears.length === 0) availableYears = [new Date().getFullYear()];

        return { matrix, availableYears, error: null };

    } catch (error: any) {
        console.error("Public Matrix Error:", error);
        // Return a safe error state instead of crashing
        return { 
            matrix: [], 
            availableYears: [new Date().getFullYear()], 
            error: "The public transparency board is temporarily restricted. Authenticated users can still access the live compliance matrix via the dashboard." 
        };
    }
}
