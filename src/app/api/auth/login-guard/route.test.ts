import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const verifyIdTokenMock = vi.fn();

vi.mock('@/firebase/admin', () => ({
  getAdminFirestore: () => null,
  getAdminAuth: () => ({
    verifyIdToken: verifyIdTokenMock,
  }),
}));

import { POST } from './route';
import { resetInMemoryLoginGuardStore } from '@/lib/login-guard-store';

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/auth/login-guard', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': '203.0.113.10',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login-guard', () => {
  beforeEach(() => {
    resetInMemoryLoginGuardStore();
    verifyIdTokenMock.mockReset();
  });

  it('tracks failed passwords, triggers CAPTCHA at 3 attempts, and locks out at 5 failed CAPTCHAs', async () => {
    const email = 'faculty@rsu.edu.ph';

    // Initial status
    let res = await POST(makeRequest({ action: 'status', email }));
    expect(res.status).toBe(200);
    let data = await res.json();
    expect(data.state.failedPasswordAttempts).toBe(0);
    expect(data.state.captchaRequired).toBe(false);
    expect(data.isLocked).toBe(false);

    // 3 failed password attempts
    for (let i = 1; i <= 3; i += 1) {
      res = await POST(makeRequest({ action: 'password_failed', email }));
      data = await res.json();
      expect(data.state.failedPasswordAttempts).toBe(i);
      expect(data.state.captchaRequired).toBe(i >= 3);
    }

    // 5 failed CAPTCHA attempts
    for (let i = 1; i <= 4; i += 1) {
      res = await POST(makeRequest({ action: 'captcha_failed', email }));
      data = await res.json();
      expect(data.state.failedCaptchaAttempts).toBe(i);
      expect(data.isLocked).toBe(false);
    }

    res = await POST(makeRequest({ action: 'captcha_failed', email }));
    data = await res.json();
    expect(data.state.failedCaptchaAttempts).toBe(5);
    expect(data.isLocked).toBe(true);
    expect(data.remainingMs).toBeGreaterThan(29 * 60 * 1000);
  });

  it('rejects unauthenticated resets and resets when given a matching verified ID token', async () => {
    const email = 'staff@rsu.edu.ph';
    await POST(makeRequest({ action: 'password_failed', email }));

    // Unauthenticated reset rejected
    const unauthRes = await POST(makeRequest({ action: 'reset', email }));
    expect(unauthRes.status).toBe(401);

    // Mismatched email token rejected
    verifyIdTokenMock.mockResolvedValueOnce({ email: 'other@rsu.edu.ph' });
    const mismatchRes = await POST(
      makeRequest({ action: 'reset', email }, { authorization: 'Bearer valid-other-token' }),
    );
    expect(mismatchRes.status).toBe(403);

    // Matching token resets state
    verifyIdTokenMock.mockResolvedValueOnce({ email });
    const okRes = await POST(makeRequest({ action: 'reset', email }, { authorization: 'Bearer valid-user-token' }));
    expect(okRes.status).toBe(200);
    const okData = await okRes.json();
    expect(okData.state.failedPasswordAttempts).toBe(0);
    expect(okData.state.captchaRequired).toBe(false);
    expect(okData.isLocked).toBe(false);
  });
});
