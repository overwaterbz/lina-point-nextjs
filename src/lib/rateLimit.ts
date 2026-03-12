import { NextResponse } from 'next/server'

interface RateLimitEntry {
  timestamps: number[]
}

// In-memory store — resets on cold start but prevents burst abuse
const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  const cutoff = now - 120_000 // 2 min window max
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff)
    if (entry.timestamps.length === 0) store.delete(key)
  }
}

/**
 * Sliding-window rate limiter. Returns 429 NextResponse if over limit, or null if allowed.
 *
 * @param key - Unique key (e.g. IP + endpoint)
 * @param maxRequests - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 60s)
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number = 60_000,
): NextResponse | null {
  cleanup()

  const now = Date.now()
  const entry = store.get(key) || { timestamps: [] }

  // Remove timestamps outside window
  entry.timestamps = entry.timestamps.filter(t => t > now - windowMs)

  if (entry.timestamps.length >= maxRequests) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(windowMs / 1000)) } },
    )
  }

  entry.timestamps.push(now)
  store.set(key, entry)
  return null // allowed
}

/**
 * Extract a rate-limit key from a request (IP + pathname).
 */
export function rateLimitKey(request: Request): string {
  const ip =
    (request.headers as any).get?.('x-forwarded-for')?.split(',')[0]?.trim() ||
    (request.headers as any).get?.('x-real-ip') ||
    'unknown'
  const url = new URL(request.url)
  return `${ip}:${url.pathname}`
}
