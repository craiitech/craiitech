import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import * as admin from 'firebase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const firestore = getAdminFirestore();

        // 1. Get all admin user documents from roles_admin
        const adminRolesSnapshot = await firestore.collection('roles_admin').get();
        if (adminRolesSnapshot.empty) {
            return NextResponse.json({ isAdminOnline: false }, { status: 200 });
        }
        
        const adminUIDs = adminRolesSnapshot.docs.map(doc => doc.id);

        if (adminUIDs.length === 0) {
             return NextResponse.json({ isAdminOnline: false }, { status: 200 });
        }

        // 2. Fetch the user documents for all admins
        // Firestore 'in' queries are limited to 30 items per query.
        // Chunk the UIDs if there are more than 30 admins.
        const userPromises = [];
        for (let i = 0; i < adminUIDs.length; i += 30) {
            const chunk = adminUIDs.slice(i, i + 30);
            userPromises.push(firestore.collection('users').where(admin.firestore.FieldPath.documentId(), 'in', chunk).get());
        }
        
        const userSnapshots = await Promise.all(userPromises);
        const adminUsers = userSnapshots.flatMap(snapshot => snapshot.docs.map(doc => doc.data()));

        // 3. Check if any admin has a recent 'lastSeen' timestamp
        const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
        
        const adminIsOnline = adminUsers.some(adminUser => {
            if (!adminUser.lastSeen) return false;

            const lastSeenMillis = adminUser.lastSeen.toMillis();
            return lastSeenMillis > twoMinutesAgo;
        });

        return NextResponse.json({ isAdminOnline: adminIsOnline }, { status: 200 });

    } catch (error: any) {
        console.error('API Error in /api/admin-status:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
