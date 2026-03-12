import { NextRequest, NextResponse } from 'next/server'
import { syncAllRooms } from '@/lib/icalSync'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const results = await syncAllRooms()
    const totalBlocked = results.reduce((s, r) => s + r.blocked, 0)
    const totalReleased = results.reduce((s, r) => s + r.released, 0)
    const errors = results.filter(r => r.error)

    console.log(`[iCal Sync] ${results.length} rooms synced: +${totalBlocked} blocked, -${totalReleased} released, ${errors.length} errors`)

    return NextResponse.json({
      ok: true,
      rooms: results.length,
      blocked: totalBlocked,
      released: totalReleased,
      errors: errors.map(e => ({ room: e.roomName, error: e.error })),
    })
  } catch (err: any) {
    console.error('[iCal Sync] Fatal error:', err)
    return NextResponse.json({ error: err?.message || 'Sync failed' }, { status: 500 })
  }
}
