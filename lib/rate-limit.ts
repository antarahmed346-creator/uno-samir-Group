// WHAT: Centralized rate limiting utility using Upstash Redis
// WHY:  Protects API routes and admin login from abuse, DDoS, and brute force
// KILL: Remove this and any malicious actor can spam login attempts or API calls without restriction

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Redis Client Singleton ──────────────────────────────────────────────
// WHAT: Single Redis client instance shared across all rate limiters
// WHY:  Prevents connection pool exhaustion; Upstash Redis is HTTP-based so no persistent connections
// KILL: New instance per request = slower + potential connection leaks

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// ─── Rate Limit Configurations ───────────────────────────────────────────
// WHAT: Pre-defined rate limit buckets for different use cases
// WHY:  Different endpoints need different limits (login = strict, public API = lenient)
// KILL: Wrong limits = either too restrictive (bad UX) or too loose (security risk)

export const rateLimiters = {
  // Admin Login: 5 attempts per 15 minutes per IP
  // WHAT: Prevents brute force password attacks on /admin/login
  // WHY:  5 attempts is enough for legitimate users; 15min window blocks automated tools
  // KILL: Remove this → brute force attacks possible
  adminLogin: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    analytics: true,
    prefix: 'ratelimit:admin_login',
  }),

  // AI Menu Import: 10 imports per hour per admin user
  // WHAT: Prevents excessive OCR/AI API calls (costs money per call)
  // WHY:  Claude API + Google Vision are expensive; 10/hour is generous for normal use
  // KILL: Remove this → someone can rack up thousands in API costs
  aiImport: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: 'ratelimit:ai_import',
  }),

  // Media Upload: 20 uploads per hour per admin user
  // WHAT: Prevents storage abuse and Cloudinary cost overruns
  // WHY:  20 images/hour is plenty for menu management; blocks bulk abuse
  // KILL: Remove this → someone can upload GBs of images to your Cloudinary account
  mediaUpload: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    analytics: true,
    prefix: 'ratelimit:media_upload',
  }),

  // Public Menu API: 200 requests per minute per IP
  // WHAT: Prevents scraping and DDoS on public menu endpoints
  // WHY:  200/min is generous for normal browsing; blocks automated scrapers
  // KILL: Remove this → competitors can scrape your entire menu in seconds
  publicApi: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(200, '1 m'),
    analytics: true,
    prefix: 'ratelimit:public_api',
  }),

  // General Admin API: 100 requests per minute per admin user
  // WHAT: Prevents accidental loops or malicious admin API spam
  // WHY:  100/min covers normal admin panel usage comfortably
  // KILL: Remove this → buggy admin code can hammer the database
  adminApi: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    analytics: true,
    prefix: 'ratelimit:admin_api',
  }),
}

// ─── Helper: Get client identifier ───────────────────────────────────────
// WHAT: Extracts a unique identifier from the request for rate limiting
// WHY:  We limit by IP for public routes, by user ID for authenticated routes
// KILL: Wrong identifier = rate limit applies to wrong entity (blocks innocent users)

export function getClientIdentifier(request: Request, userId?: string): string {
  // For authenticated users: use their user ID (more accurate than IP)
  if (userId) return `user:${userId}`

  // For public/anonymous: use IP address from headers
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  return `ip:${ip}`
}

// ─── Helper: Check rate limit and return response ────────────────────────
// WHAT: Unified rate limit check with consistent error response
// WHY:  Every route uses the same error format → easier to handle on frontend
// KILL: Inconsistent error responses = frontend can't handle rate limit gracefully

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<{ allowed: boolean; remaining: number; reset: number; limit: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier)

  return {
    allowed: success,
    remaining,
    reset,
    limit,
  }
}