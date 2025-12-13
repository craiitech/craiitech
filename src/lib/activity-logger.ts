
'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, serverTimestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
    // When running in a Google Cloud environment, the SDK can automatically
    // find the service account credentials from the environment.
    initializeApp();
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
    
    let userName = 'Unknown User';
    let userRole = 'Unknown';

    if (userDoc.exists) {
        const userData = userDoc.data();
        userName = `${userData?.firstName} ${userData?.lastName}`;
        userRole = userData?.role || 'N/A';
    }

    await firestore.collection('activityLogs').add({
      userId,
      userName,
      userRole,
      action,
      details,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // In a production environment, you might want to re-throw or handle this more gracefully.
  }
}
