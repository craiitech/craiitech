'use client';

import { Firestore, collection, doc, writeBatch, getDocs, limit, query } from 'firebase/firestore';
import isoClausesData from './iso-clauses.json';

/**
 * Client-side utility to seed ISO 21001:2018 clauses.
 * Uses the Client SDK to avoid environment-specific Admin SDK issues.
 */
export async function seedIsoClausesClient(db: Firestore) {
    try {
        const clausesCollection = collection(db, 'isoClauses');

        // Check if already seeded
        const q = query(clausesCollection, limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            return { success: true, message: 'Clauses already exist in the database.' };
        }
        
        const batch = writeBatch(db);
        const clauses = isoClausesData.clauses;

        clauses.forEach(clause => {
            const docRef = doc(db, 'isoClauses', clause.id);
            batch.set(docRef, clause);
        });

        await batch.commit();
        return { success: true, message: `${clauses.length} ISO clauses have been successfully seeded.` };
    } catch (error) {
        console.error('Failed to seed ISO clauses:', error);
        throw error;
    }
}
