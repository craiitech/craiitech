
'use server';

import * as admin from 'firebase-admin';

const ADMIN_APP_NAME = 'firebase-admin-set-claims';

// Helper function to initialize and get the admin app
function getAdminApp(): admin.app.App {
    if (admin.apps.some(app => app?.name === ADMIN_APP_NAME)) {
        return admin.app(ADMIN_APP_NAME);
    }
    
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

    return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    }, ADMIN_APP_NAME);
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
        const adminApp = getAdminApp();
        const auth = admin.auth(adminApp);
        
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
