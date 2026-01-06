
'use server';

import { getAdminFirestore } from '@/firebase/admin';

/**
 * Logs a user activity to the 'activityLogs' collection in Firestore.
 * This is a server action and should only be called from the server.
 * @param userId - The ID of the user performing the action.
 * @param userName - The name of the user.
 * @param userRole - The role of the user.
 * @param action - A string describing the action (e.g., 'user_login', 'create_submission').
 * @param details - An object containing additional details about the action.
 */
export async function logUserActivity(
  userId: string,
  userName: string,
  userRole: string,
  action: string,
  details: Record<string, any> = {}
) {
  if (!userId || !action || !userName || !userRole) {
    console.error('logUserActivity: userId, userName, userRole, and action are required.');
    return;
  }

  try {
    const firestore = getAdminFirestore();
    const logCollection = firestore.collection('activityLogs');
    await logCollection.add({
      userId,
      userName,
      userRole,
      action,
      details,
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log user activity:', error);
    // In a production environment, you might want to re-throw or handle this more gracefully.
  }
}
