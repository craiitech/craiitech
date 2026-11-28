export const MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA = 3;
export const MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT = 5;
export const ACCOUNT_LOCKOUT_DURATION_MS = 30 * 60 * 1000;
export const CAPTCHA_LENGTH = 6;

export const INVALID_CREDENTIAL_ERROR_CODES = new Set([
  'auth/wrong-password',
  'auth/user-not-found',
  'auth/invalid-credential',
]);

export interface LoginSecurityState {
  failedPasswordAttempts: number;
  captchaRequired: boolean;
  failedCaptchaAttempts: number;
  lockedUntil: number | null;
  updatedAt: number;
}

export interface AuthFeedback {
  variant: 'error' | 'warning' | 'locked' | 'info';
  title: string;
  message: string;
  hint?: string;
}

export interface AuthAccessPolicy {
  enableEmailPasswordLogin: boolean;
  enableGoogleLogin: boolean;
  allowExternalGoogleAccounts: boolean;
  allowRegisteredExternalEmails: boolean;
}

export const DEFAULT_AUTH_ACCESS_POLICY: AuthAccessPolicy = {
  enableEmailPasswordLogin: true,
  enableGoogleLogin: true,
  allowExternalGoogleAccounts: false,
  allowRegisteredExternalEmails: false,
};

/**
 * Normalizes Firestore `system/settings` auth fields with a lockout-prevention fallback
 * ensuring at least one sign-in method (email/password or Google) remains enabled.
 */
export function normalizeAuthAccessPolicy(
  data: Partial<AuthAccessPolicy> | Record<string, unknown> | null | undefined,
): AuthAccessPolicy {
  let enableEmailPasswordLogin = data?.enableEmailPasswordLogin !== false;
  let enableGoogleLogin = data?.enableGoogleLogin !== false;

  if (!enableEmailPasswordLogin && !enableGoogleLogin) {
    enableEmailPasswordLogin = true;
    enableGoogleLogin = true;
  }

  return {
    enableEmailPasswordLogin,
    enableGoogleLogin,
    allowExternalGoogleAccounts: data?.allowExternalGoogleAccounts === true,
    allowRegisteredExternalEmails: data?.allowRegisteredExternalEmails === true,
  };
}

export function getAuthMethodModeLabel(
  policy: Pick<AuthAccessPolicy, 'enableEmailPasswordLogin' | 'enableGoogleLogin'>,
): string {
  if (policy.enableEmailPasswordLogin && policy.enableGoogleLogin) {
    return 'Email & Google';
  }
  if (!policy.enableEmailPasswordLogin && policy.enableGoogleLogin) {
    return 'Google Sign-In Only';
  }
  if (policy.enableEmailPasswordLogin && !policy.enableGoogleLogin) {
    return 'Email Login Only';
  }
  return 'Email & Google';
}

const LOCAL_STORAGE_KEY = 'rsu_eoms_login_security_v1';

type StoredSecurityPayload = {
  accounts: Record<string, LoginSecurityState>;
  lastEmail?: string;
};

export function normalizeLoginIdentifier(email: string): string {
  return email.trim().toLowerCase();
}

export function createEmptySecurityState(now: number = Date.now()): LoginSecurityState {
  return {
    failedPasswordAttempts: 0,
    captchaRequired: false,
    failedCaptchaAttempts: 0,
    lockedUntil: null,
    updatedAt: now,
  };
}

/**
 * Normalizes a persisted security state against the current timestamp.
 * Automatically clears an expired 30-minute lockout so the account can log in again.
 */
export function getEffectiveSecurityState(
  state: LoginSecurityState | null | undefined,
  now: number = Date.now(),
): LoginSecurityState {
  if (!state) {
    return createEmptySecurityState(now);
  }

  const lockedUntil =
    typeof state.lockedUntil === 'number' && Number.isFinite(state.lockedUntil) ? state.lockedUntil : null;
  if (lockedUntil !== null && lockedUntil <= now) {
    return createEmptySecurityState(now);
  }

  const failedPasswordAttempts =
    typeof state.failedPasswordAttempts === 'number' && Number.isFinite(state.failedPasswordAttempts)
      ? Math.max(0, Math.floor(state.failedPasswordAttempts))
      : 0;
  const failedCaptchaAttempts =
    typeof state.failedCaptchaAttempts === 'number' && Number.isFinite(state.failedCaptchaAttempts)
      ? Math.max(0, Math.floor(state.failedCaptchaAttempts))
      : 0;
  const captchaRequired =
    Boolean(state.captchaRequired) || failedPasswordAttempts >= MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA;

  return {
    failedPasswordAttempts,
    captchaRequired,
    failedCaptchaAttempts,
    lockedUntil,
    updatedAt: typeof state.updatedAt === 'number' && Number.isFinite(state.updatedAt) ? state.updatedAt : now,
  };
}

export function isAccountLocked(state: LoginSecurityState | null | undefined, now: number = Date.now()): boolean {
  const effective = getEffectiveSecurityState(state, now);
  return effective.lockedUntil !== null && effective.lockedUntil > now;
}

export function getRemainingLockoutMs(state: LoginSecurityState | null | undefined, now: number = Date.now()): number {
  const effective = getEffectiveSecurityState(state, now);
  if (effective.lockedUntil === null) return 0;
  return Math.max(0, effective.lockedUntil - now);
}

export function formatLockoutCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatLockoutDuration(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} and ${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  }
  return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
}

export function recordFailedPasswordAttempt(
  state: LoginSecurityState | null | undefined,
  now: number = Date.now(),
): LoginSecurityState {
  const current = getEffectiveSecurityState(state, now);
  if (isAccountLocked(current, now)) {
    return { ...current, updatedAt: now };
  }

  const nextFailedPasswordAttempts = current.failedPasswordAttempts + 1;
  return {
    failedPasswordAttempts: nextFailedPasswordAttempts,
    captchaRequired:
      current.captchaRequired || nextFailedPasswordAttempts >= MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA,
    failedCaptchaAttempts: current.failedCaptchaAttempts,
    lockedUntil: null,
    updatedAt: now,
  };
}

export function recordFailedCaptchaAttempt(
  state: LoginSecurityState | null | undefined,
  now: number = Date.now(),
): LoginSecurityState {
  const current = getEffectiveSecurityState(state, now);
  if (isAccountLocked(current, now)) {
    return { ...current, updatedAt: now };
  }

  const nextFailedCaptchaAttempts = current.failedCaptchaAttempts + 1;
  const shouldLock = nextFailedCaptchaAttempts >= MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT;

  return {
    failedPasswordAttempts: Math.max(current.failedPasswordAttempts, MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA),
    captchaRequired: true,
    failedCaptchaAttempts: nextFailedCaptchaAttempts,
    lockedUntil: shouldLock ? now + ACCOUNT_LOCKOUT_DURATION_MS : null,
    updatedAt: now,
  };
}

export function resetLoginSecurityState(now: number = Date.now()): LoginSecurityState {
  return createEmptySecurityState(now);
}

/**
 * Conservatively combines local and remote states so neither stale client storage
 * nor a fresh browser tab weakens an active CAPTCHA requirement or lockout.
 */
export function mergeSecurityStates(
  localState: LoginSecurityState | null | undefined,
  remoteState: LoginSecurityState | null | undefined,
  now: number = Date.now(),
): LoginSecurityState {
  const a = getEffectiveSecurityState(localState, now);
  const b = getEffectiveSecurityState(remoteState, now);

  const lockedUntil =
    a.lockedUntil !== null && b.lockedUntil !== null
      ? Math.max(a.lockedUntil, b.lockedUntil)
      : (a.lockedUntil ?? b.lockedUntil);
  const failedPasswordAttempts = Math.max(a.failedPasswordAttempts, b.failedPasswordAttempts);

  return {
    failedPasswordAttempts,
    captchaRequired:
      a.captchaRequired || b.captchaRequired || failedPasswordAttempts >= MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA,
    failedCaptchaAttempts: Math.max(a.failedCaptchaAttempts, b.failedCaptchaAttempts),
    lockedUntil: lockedUntil !== null && lockedUntil > now ? lockedUntil : null,
    updatedAt: Math.max(a.updatedAt, b.updatedAt, now),
  };
}

function getRandomDigit(minDigit: number = 0): number {
  const span = 10 - minDigit;
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buffer);
    return minDigit + (buffer[0] % span);
  }
  return minDigit + Math.floor(Math.random() * span);
}

export function generateNumericCaptcha(length: number = CAPTCHA_LENGTH): string {
  const safeLength = Math.max(1, Math.floor(length));
  let digits = '';
  for (let i = 0; i < safeLength; i += 1) {
    // Keep the first digit in 1-9 so it always reads naturally as a N-digit number.
    digits += String(getRandomDigit(i === 0 ? 1 : 0));
  }
  return digits;
}

export function verifyNumericCaptcha(expected: string, input: string): boolean {
  const trimmedExpected = expected.trim();
  const trimmedInput = input.trim();
  return trimmedExpected.length > 0 && trimmedInput === trimmedExpected;
}

export function isInvalidCredentialErrorCode(code: string | undefined): boolean {
  return Boolean(code && INVALID_CREDENTIAL_ERROR_CODES.has(code));
}

function readStoragePayload(): StoredSecurityPayload {
  if (typeof window === 'undefined') {
    return { accounts: {} };
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return { accounts: {} };
    const parsed = JSON.parse(raw) as Partial<StoredSecurityPayload> | null;
    if (!parsed || typeof parsed !== 'object' || !parsed.accounts || typeof parsed.accounts !== 'object') {
      return { accounts: {} };
    }
    return {
      accounts: parsed.accounts,
      lastEmail: typeof parsed.lastEmail === 'string' ? parsed.lastEmail : undefined,
    };
  } catch {
    return { accounts: {} };
  }
}

function writeStoragePayload(payload: StoredSecurityPayload): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota or private browsing restrictions.
  }
}

export function readLocalSecurityState(email: string, now: number = Date.now()): LoginSecurityState {
  const normalized = normalizeLoginIdentifier(email);
  if (!normalized) return createEmptySecurityState(now);
  const payload = readStoragePayload();
  const effective = getEffectiveSecurityState(payload.accounts[normalized], now);
  if (
    payload.accounts[normalized] &&
    payload.accounts[normalized].lockedUntil !== null &&
    effective.lockedUntil === null
  ) {
    delete payload.accounts[normalized];
    if (payload.lastEmail === normalized) {
      delete payload.lastEmail;
    }
    writeStoragePayload(payload);
  }
  return effective;
}

export function writeLocalSecurityState(email: string, state: LoginSecurityState): void {
  const normalized = normalizeLoginIdentifier(email);
  if (!normalized) return;
  const payload = readStoragePayload();
  const effective = getEffectiveSecurityState(state, Date.now());
  if (
    effective.failedPasswordAttempts === 0 &&
    !effective.captchaRequired &&
    effective.failedCaptchaAttempts === 0 &&
    effective.lockedUntil === null
  ) {
    delete payload.accounts[normalized];
    if (payload.lastEmail === normalized) {
      delete payload.lastEmail;
    }
  } else {
    payload.accounts[normalized] = effective;
    payload.lastEmail = normalized;
  }
  writeStoragePayload(payload);
}

export function clearLocalSecurityState(email: string): void {
  const normalized = normalizeLoginIdentifier(email);
  if (!normalized) return;
  const payload = readStoragePayload();
  delete payload.accounts[normalized];
  if (payload.lastEmail === normalized) {
    delete payload.lastEmail;
  }
  writeStoragePayload(payload);
}

export function readLastActiveSecurityContext(
  now: number = Date.now(),
): { email: string; state: LoginSecurityState } | null {
  const payload = readStoragePayload();
  if (payload.lastEmail) {
    const state = getEffectiveSecurityState(payload.accounts[payload.lastEmail], now);
    if (isAccountLocked(state, now) || state.captchaRequired) {
      return { email: payload.lastEmail, state };
    }
  }

  for (const [email, rawState] of Object.entries(payload.accounts)) {
    const state = getEffectiveSecurityState(rawState, now);
    if (isAccountLocked(state, now) || state.captchaRequired) {
      return { email, state };
    }
  }

  return null;
}
