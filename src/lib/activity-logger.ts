
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';
import { firebaseAdminConfig } from '@/firebase/config-admin';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp({
    // Use application default credentials
  });
}

const firestore = getFirestore();

/**
 * Logs a user activity to the 'activityLogs' collection in Firestore.
 * This is a server action and should only be called from the server.
 * @param userId - The ID of the user performing the action.
 * @param action - A string describing the action (e.g., 'user_login', 'create_submission').
 * @param details - An object containing additional details about the action.
 */
export async function logUserActivity(
  userId: string,
  action: string,
  details: Record<string, any> = {}
) {
  if (!userId || !action) {
    console.error('logUserActivity: userId and action are required.');
    return;
  }

  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
        // Fallback if user profile doesn't exist for some reason
        await firestore.collection('activityLogs').add({
            userId,
            userName: 'Unknown User',
            userRole: 'Unknown',
            action,
            details,
            timestamp: serverTimestamp(),
        });
        return;
    }
    
    const userData = userDoc.data();

    await firestore.collection('activityLogs').add({
      userId,
      userName: `${userData?.firstName} ${userData?.lastName}`,
      userRole: userData?.role || 'N/A',
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // Depending on the desired behavior, you might want to re-throw the error
    // or handle it silently. For an audit log, failing silently might be undesirable.
  }
}
