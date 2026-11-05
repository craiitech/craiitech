import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitPolicy = {
  name: string;
  limit: number;
  windowSeconds: number;
};

const limiters = new Map<string, Ratelimit>();
let redis: Redis | null = null;
let missingConfigurationLogged = false;

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!redis) {
    redis = new Redis({ url, token });
  }
  return redis;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const forwardedIp = forwardedFor?.split(',')[0]?.trim();
  return forwardedIp || request.headers.get('x-real-ip')?.trim() || 'unknown';
}

function hashIdentifier(identifier: string): string {
  return createHash('sha256').update(identifier).digest('hex');
}

function unavailableResponse(): NextResponse {
  const message = 'Rate limiting is temporarily unavailable. Please try again later.';
  return NextResponse.json(
    { code: 'rate_limit_unavailable', error: message, message, reason: message },
    { status: 503 },
  );
}

function getLimiter(policy: RateLimitPolicy, client: Redis): Ratelimit {
  const key = `${policy.name}:${policy.limit}:${policy.windowSeconds}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: client,
      limiter: Ratelimit.slidingWindow(policy.limit, `${policy.windowSeconds} s`),
      prefix: `craiitech:${policy.name}`,
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

export async function enforceRateLimit(
  request: NextRequest,
  policy: RateLimitPolicy,
  subject?: string,
): Promise<NextResponse | null> {
  const client = getRedisClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      if (!missingConfigurationLogged) {
        console.warn('Rate limiting is disabled because Upstash Redis credentials are not configured.');
        missingConfigurationLogged = true;
      }
      return null;
    }

    if (!missingConfigurationLogged) {
      console.error('Rate limiting is unavailable because Upstash Redis credentials are not configured.');
      missingConfigurationLogged = true;
    }
    return unavailableResponse();
  }

  const identifier = subject ? `subject:${subject}` : `ip:${getClientIp(request)}`;
  const hashedIdentifier = hashIdentifier(identifier);

  try {
    const result = await getLimiter(policy, client).limit(hashedIdentifier);
    if (result.success) return null;

    const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
    const message = 'Too many requests. Please wait before trying again.';
    return NextResponse.json(
      { code: 'rate_limit_exceeded', error: message, message, reason: message },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.ceil(result.reset / 1000)),
        },
      },
    );
  } catch (error) {
    console.error(`Rate-limit check failed for ${policy.name}:`, error);
    return unavailableResponse();
  }
}
