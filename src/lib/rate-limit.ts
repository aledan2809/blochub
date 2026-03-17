/**
 * Simple in-memory rate limiter for API routes
 * Uses a sliding window approach with automatic cleanup
 */

interface RateLimitEntry {
  count: number
  firstRequest: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > windowMs) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

export interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the limit resets
}

/**
 * Check and update rate limit for a given identifier
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup(config.windowMs)

  const now = Date.now()
  const entry = rateLimitStore.get(identifier)

  if (!entry || now - entry.firstRequest > config.windowMs) {
    // New window or expired entry
    rateLimitStore.set(identifier, { count: 1, firstRequest: now })
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: Math.ceil((now + config.windowMs) / 1000),
    }
  }

  // Within window
  entry.count++
  const remaining = Math.max(0, config.max - entry.count)
  const reset = Math.ceil((entry.firstRequest + config.windowMs) / 1000)

  if (entry.count > config.max) {
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset,
    }
  }

  return {
    success: true,
    limit: config.max,
    remaining,
    reset,
  }
}

/**
 * Get client identifier from request headers
 * Prioritizes X-Forwarded-For for proxy environments (Vercel)
 */
export function getClientIdentifier(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // Take the first IP in the chain (original client)
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback - should not happen in production
  return 'unknown'
}

// Preset configurations for common use cases
export const RATE_LIMIT_CONFIGS = {
  // Strict limit for auth operations
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per 15 minutes
  },
  // Password reset - very strict
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
  },
  // Standard API limit
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per minute
  },
} as const
