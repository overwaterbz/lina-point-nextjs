import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/**
 * Timing-safe verification of CRON_SECRET for cron endpoints.
 * Returns a 401 NextResponse if unauthorized, or null if authorized.
 */
export function verifyCronSecret(authHeader: string | null): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expected = `Bearer ${cronSecret}`

  // Timing-safe comparison to prevent timing attacks
  if (authHeader.length !== expected.length) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const a = Buffer.from(authHeader, 'utf-8')
  const b = Buffer.from(expected, 'utf-8')

  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null // authorized
}
