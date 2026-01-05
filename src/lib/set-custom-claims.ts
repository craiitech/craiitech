'use server';

import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
    try {
        const serviceAccount = JSON.parse(
            process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
        );
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error("Firebase Admin SDK initialization failed. Ensure FIREBASE_SERVICE_ACCOUNT_KEY is set.", e);
    }
}

interface SetClaimsPayload {
    uid: string;
    role?: string | null;
    campusId?: string | null;
}

/**
 * Sets custom claims on a Firebase user.
 * This is a server action and should only be called from trusted server environments.
 * @param payload - An object containing the user's UID and the claims to set.
 */
export async function setCustomClaims(payload: SetClaimsPayload): Promise<{ success: boolean; message: string }> {
    const { uid, role, campusId } = payload;

    if (!uid) {
        return { success: false, message: 'User ID is required.' };
    }

    try {
        const auth = getAuth();
        // Fetch existing claims to avoid overwriting them
        const { customClaims: existingClaims } = await auth.getUser(uid);

        const newClaims = {
            ...existingClaims,
            role: role || null,
            campusId: campusId || null,
        };

        await auth.setCustomUserClaims(uid, newClaims);
        console.log(`Successfully set custom claims for user ${uid}:`, newClaims);
        return { success: true, message: 'Custom claims updated successfully.' };
    } catch (error) {
        console.error('Error setting custom claims:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to set custom claims: ${errorMessage}` };
    }
}
