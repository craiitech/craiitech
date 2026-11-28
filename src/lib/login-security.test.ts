import { describe, expect, it } from 'vitest';
import {
  ACCOUNT_LOCKOUT_DURATION_MS,
  CAPTCHA_LENGTH,
  MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT,
  MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA,
  createEmptySecurityState,
  formatLockoutCountdown,
  formatLockoutDuration,
  generateNumericCaptcha,
  getEffectiveSecurityState,
  getRemainingLockoutMs,
  isAccountLocked,
  isInvalidCredentialErrorCode,
  mergeSecurityStates,
  normalizeLoginIdentifier,
  recordFailedCaptchaAttempt,
  recordFailedPasswordAttempt,
  resetLoginSecurityState,
  verifyNumericCaptcha,
} from './login-security';

describe('login-security state machine', () => {
  it('normalizes login identifiers safely', () => {
    expect(normalizeLoginIdentifier('  User.Name@RSU.EDU.PH  ')).toBe('user.name@rsu.edu.ph');
  });

  it('requires CAPTCHA after 3 failed password attempts', () => {
    const t0 = 1_700_000_000_000;
    let state = createEmptySecurityState(t0);

    state = recordFailedPasswordAttempt(state, t0 + 1000);
    expect(state.failedPasswordAttempts).toBe(1);
    expect(state.captchaRequired).toBe(false);

    state = recordFailedPasswordAttempt(state, t0 + 2000);
    expect(state.failedPasswordAttempts).toBe(2);
    expect(state.captchaRequired).toBe(false);

    state = recordFailedPasswordAttempt(state, t0 + 3000);
    expect(state.failedPasswordAttempts).toBe(MAX_FAILED_PASSWORD_ATTEMPTS_BEFORE_CAPTCHA);
    expect(state.captchaRequired).toBe(true);
    expect(isAccountLocked(state, t0 + 3000)).toBe(false);
  });

  it('locks the account for 30 minutes after 5 failed CAPTCHA attempts', () => {
    const t0 = 1_700_000_000_000;
    let state = createEmptySecurityState(t0);
    for (let i = 0; i < 3; i += 1) {
      state = recordFailedPasswordAttempt(state, t0 + i * 1000);
    }

    for (let i = 1; i <= 4; i += 1) {
      state = recordFailedCaptchaAttempt(state, t0 + 10_000 + i * 1000);
      expect(state.failedCaptchaAttempts).toBe(i);
      expect(isAccountLocked(state, t0 + 10_000 + i * 1000)).toBe(false);
    }

    const lockStart = t0 + 20_000;
    state = recordFailedCaptchaAttempt(state, lockStart);
    expect(state.failedCaptchaAttempts).toBe(MAX_FAILED_CAPTCHA_ATTEMPTS_BEFORE_LOCKOUT);
    expect(state.lockedUntil).toBe(lockStart + ACCOUNT_LOCKOUT_DURATION_MS);
    expect(isAccountLocked(state, lockStart)).toBe(true);

    // Still locked at 29 minutes and 59 seconds
    expect(isAccountLocked(state, lockStart + ACCOUNT_LOCKOUT_DURATION_MS - 1000)).toBe(true);
    expect(getRemainingLockoutMs(state, lockStart + ACCOUNT_LOCKOUT_DURATION_MS - 1000)).toBe(1000);

    // Automatically unlocks at exactly 30 minutes
    const afterLock = lockStart + ACCOUNT_LOCKOUT_DURATION_MS;
    expect(isAccountLocked(state, afterLock)).toBe(false);
    const effective = getEffectiveSecurityState(state, afterLock);
    expect(effective.failedPasswordAttempts).toBe(0);
    expect(effective.failedCaptchaAttempts).toBe(0);
    expect(effective.captchaRequired).toBe(false);
    expect(effective.lockedUntil).toBeNull();
  });

  it('resets security state cleanly', () => {
    const t0 = 1_700_000_000_000;
    const reset = resetLoginSecurityState(t0);
    expect(reset).toEqual({
      failedPasswordAttempts: 0,
      captchaRequired: false,
      failedCaptchaAttempts: 0,
      lockedUntil: null,
      updatedAt: t0,
    });
  });

  it('merges local and remote security states conservatively', () => {
    const t0 = 1_700_000_000_000;
    const local = {
      failedPasswordAttempts: 3,
      captchaRequired: true,
      failedCaptchaAttempts: 2,
      lockedUntil: null,
      updatedAt: t0,
    };
    const remote = {
      failedPasswordAttempts: 1,
      captchaRequired: false,
      failedCaptchaAttempts: 4,
      lockedUntil: t0 + 600_000,
      updatedAt: t0 + 500,
    };

    const merged = mergeSecurityStates(local, remote, t0 + 1000);
    expect(merged.failedPasswordAttempts).toBe(3);
    expect(merged.captchaRequired).toBe(true);
    expect(merged.failedCaptchaAttempts).toBe(4);
    expect(merged.lockedUntil).toBe(t0 + 600_000);
  });

  it('generates and verifies numeric CAPTCHA codes accurately', () => {
    const code = generateNumericCaptcha();
    expect(code).toMatch(new RegExp(`^[1-9]\\d{${CAPTCHA_LENGTH - 1}}$`));
    expect(verifyNumericCaptcha(code, code)).toBe(true);
    expect(verifyNumericCaptcha(code, ` ${code} `)).toBe(true);
    expect(verifyNumericCaptcha(code, '000000')).toBe(false);
    expect(verifyNumericCaptcha('', '')).toBe(false);
  });

  it('formats countdown timers and identifies invalid credential error codes', () => {
    expect(formatLockoutCountdown(29 * 60 * 1000 + 45_000)).toBe('29:45');
    expect(formatLockoutCountdown(5_000)).toBe('00:05');
    expect(formatLockoutDuration(30 * 60 * 1000)).toBe('30 minutes');
    expect(formatLockoutDuration(90 * 1000)).toBe('1 minute and 30 seconds');
    expect(formatLockoutDuration(12 * 1000)).toBe('12 seconds');

    expect(isInvalidCredentialErrorCode('auth/wrong-password')).toBe(true);
    expect(isInvalidCredentialErrorCode('auth/user-not-found')).toBe(true);
    expect(isInvalidCredentialErrorCode('auth/invalid-credential')).toBe(true);
    expect(isInvalidCredentialErrorCode('auth/network-request-failed')).toBe(false);
    expect(isInvalidCredentialErrorCode(undefined)).toBe(false);
  });
});
