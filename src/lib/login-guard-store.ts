import { getAdminFirestore } from '@/firebase/admin';
import { type LoginSecurityState, createEmptySecurityState, getEffectiveSecurityState } from '@/lib/login-security';

const LOGIN_GUARD_COLLECTION = 'auth_login_guards';

// Process-local fallback store for environments without Firebase Admin credentials (or unit tests).
const inMemoryGuardStore = new Map<string, LoginSecurityState>();

export function resetInMemoryLoginGuardStore(): void {
  inMemoryGuardStore.clear();
}

export function pruneExpiredInMemoryGuardState(docId: string, now: number): void {
  const cached = inMemoryGuardStore.get(docId);
  if (cached?.lockedUntil && cached.lockedUntil <= now) {
    inMemoryGuardStore.delete(docId);
  }
}

export async function readGuardState(docId: string, now: number): Promise<LoginSecurityState> {
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      const snap = await firestore.collection(LOGIN_GUARD_COLLECTION).doc(docId).get();
      if (snap.exists) {
        return getEffectiveSecurityState(snap.data() as LoginSecurityState, now);
      }
      return createEmptySecurityState(now);
    } catch {
      // Fall back to in-memory store when Admin SDK has no ADC/service account in local dev.
    }
  }
  return getEffectiveSecurityState(inMemoryGuardStore.get(docId), now);
}

export async function writeGuardState(docId: string, state: LoginSecurityState): Promise<void> {
  inMemoryGuardStore.set(docId, state);
  const firestore = getAdminFirestore();
  if (firestore) {
    try {
      await firestore.collection(LOGIN_GUARD_COLLECTION).doc(docId).set(state);
    } catch {
      // In-memory store retains the state for this process when Firestore Admin is unavailable.
    }
  }
}
