import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

admin.initializeApp();
const db = admin.firestore();

const BATCH_LIMIT = 500;

interface UserDocument {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  role?: string;
  unitId?: string;
  unitName?: string;
  [key: string]: unknown;
}

function getDisplayName(user: UserDocument): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Unknown User';
}

async function updateCollectionField(
  collectionName: string,
  field: string,
  value: unknown,
  userId: string,
  userIdField: string = 'userId'
): Promise<void> {
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query: FirebaseFirestore.Query = db.collection(collectionName)
      .where(userIdField, '==', userId)
      .limit(BATCH_LIMIT);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, { [field]: value, updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }
}

export const syncUserProfileChanges = onDocumentWritten(
  { document: 'users/{userId}', region: 'asia-southeast1' },
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const beforeData = snap.before.data() as UserDocument | undefined;
    const afterData = snap.after.data() as UserDocument | undefined;

    if (!beforeData || !afterData) return;

    const userId = event.params.userId;
    const changes: { field: string; oldVal: unknown; newVal: unknown }[] = [];

    for (const key of ['role', 'unitName', 'firstName', 'lastName', 'unitId'] as const) {
      if (beforeData[key] !== afterData[key]) {
        changes.push({ field: key, oldVal: beforeData[key], newVal: afterData[key] });
      }
    }

    if (changes.length === 0) return;

    const promises: Promise<void>[] = [];
    const newDisplayName = getDisplayName(afterData);

    for (const change of changes) {
      switch (change.field) {
        case 'role': {
          const newRole = change.newVal as string;
          promises.push(updateCollectionField('activityLogs', 'userRole', newRole, userId));
          promises.push(updateCollectionField('submissions', 'userRole', newRole, userId));
          break;
        }
        case 'unitName': {
          const newUnitName = change.newVal as string;
          promises.push(updateCollectionField('submissions', 'unitName', newUnitName, userId));
          promises.push(updateCollectionField('risks', 'unitName', newUnitName, userId));
          promises.push(updateCollectionField('activityAttendanceLogs', 'unitName', newUnitName, userId));
          promises.push(updateCollectionField('deviceBindings', 'unitName', newUnitName, userId));
          promises.push(updateCollectionField('unitFormRequests', 'unitName', newUnitName, userId));
          break;
        }
        case 'firstName':
        case 'lastName': {
          promises.push(updateCollectionField('activityLogs', 'userName', newDisplayName, userId));
          promises.push(updateCollectionField('risks', 'responsiblePersonName', newDisplayName, userId));
          promises.push(updateCollectionField('correctiveActionPlans', 'responsiblePersonName', newDisplayName, userId));
          promises.push(updateCollectionField('softwareEvaluations', 'userName', newDisplayName, userId));
          promises.push(updateCollectionField('activityAttendanceLogs', 'userName', newDisplayName, userId));
          promises.push(updateCollectionField('deviceBindings', 'userName', newDisplayName, userId));
          promises.push(updateCollectionField('unitFormRequests', 'submitterName', newDisplayName, userId));
          promises.push(updateCollectionField('unitMonitoringRecords', 'monitorName', newDisplayName, userId));
          break;
        }
      }
    }

    await Promise.all(promises);

    return;
  }
);
