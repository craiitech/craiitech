import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitEntries = new Map<string, RateLimitEntry>();
let lastCapacityWarningAt = 0;

function getClientIp(request: NextRequest): string {
  const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedIp || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function hashIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier).digest('hex');
}

function createRateLimitedResponse(policy: RateLimitPolicy, resetAt: number): NextResponse {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  const message = 'Too many requests. Please wait before trying again.';
  return NextResponse.json(
    { code: 'rate_limit_exceeded', error: message, message, reason: message },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Limit': String(policy.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}

function removeExpiredEntries(now: number): void {
  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) rateLimitEntries.delete(key);
  }
}

export function enforceRateLimit(request: NextRequest, policy: RateLimitPolicy, subject?: string): NextResponse | null {
  const now = Date.now();
  const identifier = subject ? `subject:${subject}` : `ip:${getClientIp(request)}`;
  const key = `${policy.name}:${hashIdentifier(identifier)}`;
  let entry = rateLimitEntries.get(key);

  if (!entry || entry.resetAt <= now) {
    if (rateLimitEntries.size >= MAX_RATE_LIMIT_ENTRIES) {
      removeExpiredEntries(now);
    }

    if (rateLimitEntries.size >= MAX_RATE_LIMIT_ENTRIES) {
      if (now - lastCapacityWarningAt >= 60_000) {
        console.error('Rate-limit entry capacity reached; rejecting requests instead of bypassing the limit.');
        lastCapacityWarningAt = now;
      }
      return NextResponse.json(
        { code: 'rate_limit_unavailable', error: 'Rate limiting is temporarily unavailable.' },
        { status: 503 },
      );
    }

    entry = { count: 0, resetAt: now + policy.windowSeconds * 1000 };
    rateLimitEntries.set(key, entry);
  }

  if (entry.count >= policy.limit) {
    return createRateLimitedResponse(policy, entry.resetAt);
  }

  entry.count += 1;
  return null;
}
