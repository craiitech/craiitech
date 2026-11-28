import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/firebase/admin';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  type LoginSecurityState,
  createEmptySecurityState,
  getEffectiveSecurityState,
  getRemainingLockoutMs,
  isAccountLocked,
  normalizeLoginIdentifier,
  recordFailedCaptchaAttempt,
  recordFailedPasswordAttempt,
  resetLoginSecurityState,
} from '@/lib/login-security';

export const dynamic = 'force-dynamic';

type LoginGuardAction = 'status' | 'password_failed' | 'captcha_failed' | 'reset';

const LOGIN_GUARD_COLLECTION = 'auth_login_guards';
const LOGIN_GUARD_IP_RATE_LIMIT = { name: 'auth-login-guard-ip', limit: 60, windowSeconds: 60 };
const VALID_ACTIONS = new Set<LoginGuardAction>(['status', 'password_failed', 'captcha_failed', 'reset']);

// Process-local fallback store for environments without Firebase Admin credentials (or unit tests).
const inMemoryGuardStore = new Map<string, LoginSecurityState>();

export function resetInMemoryLoginGuardStore(): void {
  inMemoryGuardStore.clear();
}

function hashEmailIdentifier(normalizedEmail: string): string {
  return createHash('sha256').update(normalizedEmail).digest('hex');
}

async function readGuardState(docId: string, now: number): Promise<LoginSecurityState> {
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

async function writeGuardState(docId: string, state: LoginSecurityState): Promise<void> {
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

function buildGuardResponse(state: LoginSecurityState, now: number): NextResponse {
  const effective = getEffectiveSecurityState(state, now);
  return NextResponse.json({
    state: effective,
    isLocked: isAccountLocked(effective, now),
    remainingMs: getRemainingLockoutMs(effective, now),
  });
}

export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, LOGIN_GUARD_IP_RATE_LIMIT);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = (await req.json().catch(() => null)) as { action?: unknown; email?: unknown } | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid JSON request body.' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? (body.action as LoginGuardAction) : null;
    const rawEmail = typeof body.email === 'string' ? body.email : '';
    const normalizedEmail = normalizeLoginIdentifier(rawEmail);

    if (!action || !VALID_ACTIONS.has(action)) {
      return NextResponse.json({ message: 'Invalid login guard action.' }, { status: 400 });
    }

    if (!normalizedEmail) {
      return NextResponse.json({ message: 'A valid account email is required.' }, { status: 400 });
    }

    const now = Date.now();
    const docId = hashEmailIdentifier(normalizedEmail);

    if (action === 'reset') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ message: 'Unauthorized: Bearer token is required to reset.' }, { status: 401 });
      }
      const idToken = authHeader.slice('Bearer '.length).trim();
      if (!idToken) {
        return NextResponse.json({ message: 'Unauthorized: Empty token.' }, { status: 401 });
      }

      const auth = getAdminAuth();
      if (!auth) {
        return NextResponse.json({ message: 'Authentication verification service unavailable.' }, { status: 503 });
      }

      let decodedEmail = '';
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        decodedEmail = normalizeLoginIdentifier(decodedToken.email || '');
      } catch {
        return NextResponse.json({ message: 'Unauthorized: Invalid authentication token.' }, { status: 401 });
      }

      if (!decodedEmail || decodedEmail !== normalizedEmail) {
        return NextResponse.json(
          { message: 'Forbidden: Token account does not match the login identifier.' },
          { status: 403 },
        );
      }

      const cleared = resetLoginSecurityState(now);
      await writeGuardState(docId, cleared);
      return buildGuardResponse(cleared, now);
    }

    const current = await readGuardState(docId, now);

    if (action === 'status') {
      if (current.lockedUntil === null && inMemoryGuardStore.has(docId)) {
        const cached = inMemoryGuardStore.get(docId);
        if (cached?.lockedUntil && cached.lockedUntil <= now) {
          inMemoryGuardStore.delete(docId);
        }
      }
      return buildGuardResponse(current, now);
    }

    const nextState =
      action === 'password_failed'
        ? recordFailedPasswordAttempt(current, now)
        : recordFailedCaptchaAttempt(current, now);

    await writeGuardState(docId, nextState);
    return buildGuardResponse(nextState, now);
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Failed to process login security check.',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
