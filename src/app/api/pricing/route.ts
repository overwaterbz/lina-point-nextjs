/**
 * GET /api/pricing?checkIn=2026-04-01&checkOut=2026-04-05&roomType=overwater_suite
 * Returns dynamic pricing breakdown for a specific room type and date range.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calculateDynamicPrice } from '@/lib/dynamicPricing'
import { resolveRoomType } from '@/lib/inventory'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const checkIn = searchParams.get('checkIn')
  const checkOut = searchParams.get('checkOut')
  const roomTypeInput = searchParams.get('roomType')

  if (!checkIn || !checkOut || !roomTypeInput) {
    return NextResponse.json(
      { error: 'checkIn, checkOut, and roomType query params required' },
      { status: 400 },
    )
  }

  const ciDate = new Date(checkIn + 'T00:00:00')
  const coDate = new Date(checkOut + 'T00:00:00')
  if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime()) || coDate <= ciDate) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const roomType = resolveRoomType(roomTypeInput)
    const pricing = await calculateDynamicPrice(supabase, roomType, checkIn, checkOut)

    return NextResponse.json({ pricing }, { status: 200 })
  } catch (err) {
    console.error('[Pricing] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Pricing error' },
      { status: 500 },
    )
  }
}
