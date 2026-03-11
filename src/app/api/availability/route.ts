import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { checkAvailability } from '@/lib/inventory'

/**
 * GET /api/availability?checkIn=2026-04-01&checkOut=2026-04-05
 * Public endpoint — returns available room counts per type.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: 'checkIn and checkOut query params required (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  // Basic date validation
  const ciDate = new Date(checkIn + 'T00:00:00')
  const coDate = new Date(checkOut + 'T00:00:00')
  if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
  }
  if (coDate <= ciDate) {
    return NextResponse.json({ error: 'checkOut must be after checkIn' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const availability = await checkAvailability(supabase, checkIn, checkOut)

    return NextResponse.json({ availability }, { status: 200 })
  } catch (err) {
    console.error('[Availability] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}
