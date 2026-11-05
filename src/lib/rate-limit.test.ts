import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { enforceRateLimit } from './rate-limit';

describe('enforceRateLimit', () => {
  it('allows requests up to the configured limit and then returns 429', () => {
    const request = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '192.0.2.1' },
    });
    const policy = { name: 'test-ip-limit', limit: 1, windowSeconds: 60 };

    expect(enforceRateLimit(request, policy)).toBeNull();

    const response = enforceRateLimit(request, policy);
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBeTruthy();
    expect(response?.headers.get('X-RateLimit-Limit')).toBe('1');
  });

  it('keeps rate limits isolated between subjects', () => {
    const request = new NextRequest('http://localhost/api/test');
    const policy = { name: 'test-user-limit', limit: 1, windowSeconds: 60 };

    expect(enforceRateLimit(request, policy, 'user:one')).toBeNull();
    expect(enforceRateLimit(request, policy, 'user:two')).toBeNull();
    expect(enforceRateLimit(request, policy, 'user:one')?.status).toBe(429);
  });
});
