import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';

// This is to prevent Next.js from caching the response of this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ message: 'Unauthorized: No token provided' }, { status: 401 });
        }
        const idToken = authHeader.split('Bearer ')[1];
        
        const auth = getAdminAuth();
        const firestore = getAdminFirestore();
        
        if (!auth || !firestore) {
            return NextResponse.json({ message: 'Internal Server Error: Firebase services unavailable' }, { status: 500 });
        }
        
        const decodedToken = await auth.verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const userDoc = await firestore.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }
        const userProfile = userDoc.data();
        if (!userProfile) {
             return NextResponse.json({ message: 'User profile data is missing.' }, { status: 404 });
        }

        // Check if user has coordinator/odimo permissions for Main Campus
        const campusesSnapshot = await firestore.collection('campuses').where('name', '==', 'Main Campus').limit(1).get();
        if (campusesSnapshot.empty) {
            return NextResponse.json({ message: 'Configuration Error: Main Campus not found.' }, { status: 500 });
        }
        const mainCampusId = campusesSnapshot.docs[0].id;
        
        const isMainCampusCoordinator = userProfile.campusId === mainCampusId && (userProfile.role === 'Unit Coordinator' || userProfile.role === 'Unit ODIMO');
        
        if (!isMainCampusCoordinator && userProfile.role !== 'Admin') {
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

        const submissions = submissionsSnapshot.docs.map(doc => {
            const data = doc.data();
            const id = doc.id;
            
            // Clean serialization for client consumption
            const result: any = { ...data, id };
            for (const key in result) {
                if (result[key] && typeof result[key] === 'object' && '_seconds' in result[key]) {
                    result[key] = new Date(result[key]._seconds * 1000).toISOString();
                } else if (result[key] && typeof result[key].toDate === 'function') {
                    result[key] = result[key].toDate().toISOString();
                }
            }
            return result;
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
