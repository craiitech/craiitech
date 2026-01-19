'use server';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import type { Submission, Unit } from '@/lib/types';
import * as admin from 'firebase-admin';

// This is to prevent Next.js from caching the response of this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        
        const decodedToken = await getAdminAuth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const firestore = getAdminFirestore();
        const userDoc = await firestore.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        const userProfile = userDoc.data();
        if (!userProfile) {
             return NextResponse.json({ message: 'User profile data is missing.' }, { status: 404 });
        }

        // Let's find the main campus ID from the campuses collection.
        const campusesSnapshot = await firestore.collection('campuses').where('name', '==', 'Main Campus').limit(1).get();
        if (campusesSnapshot.empty) {
            console.error("API Error: Main Campus not found in the database.");
            return NextResponse.json({ message: 'Configuration Error: Main Campus not found.' }, { status: 500 });
        }
        const mainCampusId = campusesSnapshot.docs[0].id;
        
        const isMainCampusCoordinator = userProfile.campusId === mainCampusId && (userProfile.role === 'Unit Coordinator' || userProfile.role === 'Unit ODIMO');
        
        if (!isMainCampusCoordinator) {
            return NextResponse.json({ message: 'Forbidden: You do not have permission to view this data.' }, { status: 403 });
        }
        
        if (!userProfile.unitId) {
             return NextResponse.json({ message: 'User profile is incomplete. Unit ID is missing.' }, { status: 400 });
        }

        const userUnitDoc = await firestore.collection('units').doc(userProfile.unitId).get();
        if (!userUnitDoc.exists) {
             return NextResponse.json({ message: 'User unit configuration not found.' }, { status: 404 });
        }
        const unitNameForQuery = userUnitDoc.data()?.name;

        const submissionsSnapshot = await firestore.collection('submissions').where('unitName', '==', unitNameForQuery).get();

        const submissions: any[] = [];
        submissionsSnapshot.forEach(doc => {
            const data = doc.data();
            // Convert Firestore Timestamps to serializable format (ISO string)
            const serializedData: Record<string, any> = { ...data, id: doc.id };
            for (const key in serializedData) {
                if (serializedData[key] instanceof admin.firestore.Timestamp) {
                    serializedData[key] = serializedData[key].toDate().toISOString();
                } else if (serializedData[key]?.toDate && typeof serializedData[key].toDate === 'function') { // Handle client-side Timestamps if they slip through
                    serializedData[key] = serializedData[key].toDate().toISOString();
                }
            }
            submissions.push(serializedData);
        });

        return NextResponse.json(submissions, { status: 200 });

    } catch (error: any) {
        console.error('API Error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return NextResponse.json({ message: 'Unauthorized: Invalid token' }, { status: 401 });
        }
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
