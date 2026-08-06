'use client';

import { addDoc, collection, serverTimestamp } from '@/firebase/firestore-wrapper';
import type { FiamoActivityLogType, FiamoActivityLog } from '@/lib/types';

/**
 * Helper to write an immutable FIAMO activity log entry.
 * Should be called on every state transition / evidence submission.
 */
export async function logFiamoActivity(params: {
  firestore: any;
  type: FiamoActivityLogType;
  module: FiamoActivityLog['module'];
  recordId: string;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  details?: Record<string, any>;
  campusId: string;
  unitId: string;
}): Promise<void> {
  const { firestore, ...data } = params;
  if (!firestore) return;
  try {
    await addDoc(collection(firestore, 'fiamoActivityLogs'), {
      ...data,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error logging FIAMO activity:', error);
  }
}
