'use client';

import {
  setDoc as originalSetDoc,
  updateDoc as originalUpdateDoc,
  deleteDoc as originalDeleteDoc,
  doc,
  DocumentReference,
  CollectionReference,
  SetOptions,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { initializeFirebase } from './index';

export interface OfflineWrite {
  id: string;
  path: string;
  type: 'set' | 'update' | 'delete';
  data?: any;
  options?: any;
  timestamp: number;
}

const QUEUE_KEY = 'rsu_offline_write_queue';

function isQuotaError(err: any): boolean {
  if (!err) return false;
  const errMsg = err.message || '';
  const errCode = err.code || '';
  return (
    errMsg.includes('Quota exceeded') ||
    errMsg.includes('quota exceeded') ||
    errCode === 'resource-exhausted'
  );
}

function getQueue(): OfflineWrite[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(QUEUE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse offline write queue:', e);
    return [];
  }
}

function saveQueue(queue: OfflineWrite[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function queueOfflineWrite(write: Omit<OfflineWrite, 'id' | 'timestamp'>) {
  const queue = getQueue();
  const newWrite: OfflineWrite = {
    ...write,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now()
  };
  queue.push(newWrite);
  saveQueue(queue);
  console.log(`[RSU Offline Queue] Queued [${write.type}] for path: ${write.path}`);
}

// Custom recursive serializer to handle Dates, Timestamps, and serverTimestamp FieldValues in JSON
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (data instanceof Date) {
    return { _type: 'Date', value: data.toISOString() };
  }
  
  if (data instanceof Timestamp) {
    return { _type: 'Timestamp', seconds: data.seconds, nanoseconds: data.nanoseconds };
  }
  
  // Check for Firestore FieldValue (like serverTimestamp())
  if (typeof data === 'object') {
    if (data._methodName === 'serverTimestamp' || (data.constructor && data.constructor.name === 'FieldValue')) {
      return { _type: 'FieldValue', value: 'serverTimestamp' };
    }
    if (Array.isArray(data)) {
      return data.map(serializeData);
    }
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = serializeData(data[key]);
    }
    return result;
  }
  
  return data;
}

// Custom recursive deserializer to restore Dates, Timestamps, and serverTimestamp FieldValues
function deserializeData(data: any): any {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'object') {
    if (data._type === 'Date') {
      return new Date(data.value);
    }
    if (data._type === 'Timestamp') {
      return new Timestamp(data.seconds, data.nanoseconds);
    }
    if (data._type === 'FieldValue' && data.value === 'serverTimestamp') {
      return serverTimestamp();
    }
    if (Array.isArray(data)) {
      return data.map(deserializeData);
    }
    const result: any = {};
    for (const key of Object.keys(data)) {
      result[key] = deserializeData(data[key]);
    }
    return result;
  }
  
  return data;
}

// Wrapper for setDoc
export async function setDoc(docRef: DocumentReference, data: any, options?: SetOptions) {
  try {
    return await originalSetDoc(docRef, data, options || {});
  } catch (err: any) {
    if (isQuotaError(err)) {
      queueOfflineWrite({
        path: docRef.path,
        type: 'set',
        data: serializeData(data),
        options
      });
      return;
    }
    throw err;
  }
}

// Wrapper for updateDoc
export async function updateDoc(docRef: DocumentReference, data: any) {
  try {
    return await originalUpdateDoc(docRef, data);
  } catch (err: any) {
    if (isQuotaError(err)) {
      queueOfflineWrite({
        path: docRef.path,
        type: 'update',
        data: serializeData(data)
      });
      return;
    }
    throw err;
  }
}

// Wrapper for addDoc
export async function addDoc(colRef: CollectionReference, data: any) {
  const newDocRef = doc(colRef);
  await setDoc(newDocRef, data);
  return newDocRef;
}

// Wrapper for deleteDoc
export async function deleteDoc(docRef: DocumentReference) {
  try {
    return await originalDeleteDoc(docRef);
  } catch (err: any) {
    if (isQuotaError(err)) {
      queueOfflineWrite({
        path: docRef.path,
        type: 'delete'
      });
      return;
    }
    throw err;
  }
}

// Background sync loop manager
let isSyncing = false;

export function startGlobalOfflineSync() {
  if (typeof window === 'undefined') return;

  setInterval(async () => {
    if (isSyncing) return;
    const queue = getQueue();
    if (queue.length === 0) return;

    isSyncing = true;
    console.log(`[RSU Offline Sync] Attempting to process ${queue.length} queued writes...`);

    let firestore;
    try {
      const sdks = initializeFirebase();
      firestore = sdks.firestore;
    } catch (e) {
      console.warn('[RSU Offline Sync] Firebase not ready for offline sync yet.');
      isSyncing = false;
      return;
    }

    let syncedCount = 0;
    const remainingQueue: OfflineWrite[] = [];

    for (const write of queue) {
      try {
        const docRef = doc(firestore, write.path);
        const data = write.data ? deserializeData(write.data) : null;

        if (write.type === 'set') {
          await originalSetDoc(docRef, data, write.options || {});
        } else if (write.type === 'update') {
          await originalUpdateDoc(docRef, data);
        } else if (write.type === 'delete') {
          await originalDeleteDoc(docRef);
        }

        syncedCount++;
        console.log(`[RSU Offline Sync] Successfully synced [${write.type}] for path: ${write.path}`);
      } catch (err: any) {
        console.warn(`[RSU Offline Sync] Failed to sync write ${write.id} for path ${write.path}:`, err.message);

        if (isQuotaError(err)) {
          remainingQueue.push(write);
          // Keep all subsequent writes in queue and stop processing
          const index = queue.indexOf(write);
          remainingQueue.push(...queue.slice(index + 1));
          break;
        } else {
          // If it's a permanent validation/rules error, discard it so the queue doesn't block forever
          console.error(`[RSU Offline Sync] Discarding corrupt offline write ${write.id}:`, err);
        }
      }
    }

    if (syncedCount > 0) {
      saveQueue(remainingQueue);
    }
    isSyncing = false;
  }, 30000); // Check every 30 seconds
}

// Automatically initiate background sync loop when imported on the client side
if (typeof window !== 'undefined') {
  startGlobalOfflineSync();
}
