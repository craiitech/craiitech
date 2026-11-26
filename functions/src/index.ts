import * as admin from 'firebase-admin';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
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
  userIdField: string = 'userId',
): Promise<void> {
  let lastDoc: FirebaseFirestore.DocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    let query: FirebaseFirestore.Query = db
      .collection(collectionName)
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
          promises.push(
            updateCollectionField('correctiveActionPlans', 'responsiblePersonName', newDisplayName, userId),
          );
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
  },
);

async function deleteExpiredDocs(collectionName: string, timestampField: string, cutoff: Timestamp): Promise<number> {
  let deleted = 0;
  let hasMore = true;

  while (hasMore) {
    const snap = await db.collection(collectionName).where(timestampField, '<', cutoff).limit(BATCH_LIMIT).get();

    if (snap.empty) {
      hasMore = false;
      break;
    }

    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += snap.size;
  }

  return deleted;
}

/**
 * Scheduled Data Retention & Disposal (RA 10173 Sec. 11(e))
 * - Anonymizes visitorLogs older than 365 days.
 * - Deletes unitActivityAttendanceLogs, errorReports, and activityLogs older than 730 days (2 years).
 */
export const enforceDataRetentionPolicy = onSchedule(
  { schedule: 'every sunday 02:00', timeZone: 'Asia/Manila', region: 'asia-southeast1' },
  async () => {
    const nowMs = Date.now();
    const oneYearCutoff = Timestamp.fromMillis(nowMs - 365 * 24 * 60 * 60 * 1000);
    const twoYearCutoff = Timestamp.fromMillis(nowMs - 730 * 24 * 60 * 60 * 1000);

    // 1. Anonymize visitorLogs older than 1 year
    let hasMoreVisitors = true;
    while (hasMoreVisitors) {
      const snap = await db.collection('visitorLogs').where('createdAt', '<', oneYearCutoff).limit(BATCH_LIMIT).get();

      if (snap.empty) {
        hasMoreVisitors = false;
        break;
      }

      const batch = db.batch();
      let updatedInBatch = 0;
      snap.docs.forEach((docSnap) => {
        if (!docSnap.data().isAnonymized) {
          batch.update(docSnap.ref, {
            visitorName: 'ANONYMIZED',
            sex: 'REDACTED',
            isAnonymized: true,
            anonymizedAt: FieldValue.serverTimestamp(),
          });
          updatedInBatch++;
        }
      });

      if (updatedInBatch > 0) {
        await batch.commit();
      } else {
        hasMoreVisitors = false;
      }
    }

    // 2. Purge logs older than 2 years
    await Promise.all([
      deleteExpiredDocs('unitActivityAttendanceLogs', 'scannedAt', twoYearCutoff),
      deleteExpiredDocs('errorReports', 'createdAt', twoYearCutoff),
      deleteExpiredDocs('activityLogs', 'timestamp', twoYearCutoff),
    ]);
  },
);

async function isCallerAdmin(uid: string): Promise<boolean> {
  const adminRoleDoc = await db.collection('roles_admin').doc(uid).get();
  if (adminRoleDoc.exists) return true;
  const userDoc = await db.collection('users').doc(uid).get();
  const role = userDoc.data()?.role;
  return ['Admin', 'admin', 'Administrator', 'administrator', 'System Administrator', 'Super Admin'].includes(
    String(role || ''),
  );
}

/**
 * Right to Access & Data Portability (RA 10173 Sec. 16 & 18)
 * Exports a user's personal profile and associated records in machine-readable JSON.
 */
export const exportUserData = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const targetUid = (request.data?.targetUid as string | undefined) || request.auth.uid;
  if (targetUid !== request.auth.uid && !(await isCallerAdmin(request.auth.uid))) {
    throw new HttpsError('permission-denied', 'Only admins can export another user’s data.');
  }

  const [userSnap, submissionsSnap, risksSnap, empActSnap, wfhSnap] = await Promise.all([
    db.collection('users').doc(targetUid).get(),
    db.collection('submissions').where('userId', '==', targetUid).get(),
    db.collection('risks').where('responsiblePersonId', '==', targetUid).get(),
    db.collection('employeeActivities').where('userId', '==', targetUid).get(),
    db.collection('wfhActivities').where('userId', '==', targetUid).get(),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    uid: targetUid,
    profile: userSnap.exists ? userSnap.data() : null,
    submissions: submissionsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    risks: risksSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    employeeActivities: empActSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    wfhActivities: wfhSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
  };
});

/**
 * Right to Erasure / Blocking (RA 10173 Sec. 16)
 * Admin-only callable to anonymize/erase a user profile and scrub denormalized names.
 */
export const eraseUserData = onCall({ region: 'asia-southeast1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }
  if (!(await isCallerAdmin(request.auth.uid))) {
    throw new HttpsError('permission-denied', 'Admin privileges required.');
  }

  const targetUid = request.data?.targetUid as string | undefined;
  if (!targetUid) {
    throw new HttpsError('invalid-argument', 'targetUid is required.');
  }

  await db
    .collection('users')
    .doc(targetUid)
    .set(
      {
        firstName: 'ERASED',
        lastName: 'USER',
        email: `erased-${targetUid}@redacted.local`,
        sex: 'REDACTED',
        avatar: null,
        portfolios: [],
        verified: false,
        erasedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  await Promise.all([
    updateCollectionField('activityLogs', 'userName', 'ERASED USER', targetUid),
    updateCollectionField('risks', 'responsiblePersonName', 'ERASED USER', targetUid, 'responsiblePersonId'),
    updateCollectionField('softwareEvaluations', 'userName', 'ERASED USER', targetUid),
    updateCollectionField('unitActivityAttendanceLogs', 'userName', 'ERASED USER', targetUid),
    updateCollectionField('unitFormRequests', 'submitterName', 'ERASED USER', targetUid),
    updateCollectionField('unitMonitoringRecords', 'monitorName', 'ERASED USER', targetUid),
  ]);

  return { status: 'erased', targetUid };
});

/**
 * Scheduled Auto-Logout for Previous-Day Visitors
 * Runs daily at 00:05 Asia/Manila to automatically close any visitorLogs
 * left open from prior calendar days.
 */
export const autoLogoutPreviousDayVisitors = onSchedule(
  { schedule: 'every day 00:05', timeZone: 'Asia/Manila', region: 'asia-southeast1' },
  async () => {
    // Compute start of today in Asia/Manila (UTC+8)
    const nowUtcMs = Date.now();
    const manilaOffsetMs = 8 * 60 * 60 * 1000;
    const manilaNow = new Date(nowUtcMs + manilaOffsetMs);
    const startOfTodayManilaUtcMs =
      Date.UTC(manilaNow.getUTCFullYear(), manilaNow.getUTCMonth(), manilaNow.getUTCDate()) - manilaOffsetMs;
    const cutoff = Timestamp.fromMillis(startOfTodayManilaUtcMs);

    let hasMore = true;
    while (hasMore) {
      const snap = await db
        .collection('visitorLogs')
        .where('isLoggedOut', '==', false)
        .where('createdAt', '<', cutoff)
        .limit(BATCH_LIMIT)
        .get();

      if (snap.empty) {
        hasMore = false;
        break;
      }

      const batch = db.batch();
      snap.docs.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          isLoggedOut: true,
          loggedOutAt: FieldValue.serverTimestamp(),
          autoLoggedOut: true,
        });
      });
      await batch.commit();
    }
  },
);
