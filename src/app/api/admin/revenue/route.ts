/**
 * API Route: GET /api/admin/revenue
 *
 * Revenue dashboard data:
 * - Today's snapshot (occupancy, revenue, bookings)
 * - 30-day revenue trend
 * - Room type breakdown
 * - Tour commission totals
 * - Top upsell conversion rates
 * - Guest acquisition summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { isAdminEmail } from '@/lib/admin'

export async function GET(request: NextRequest) {
  try {
    // Admin auth: accept cron secret OR admin session
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    let authorized = false

    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      authorized = true
    } else {
      // Check Supabase session
      try {
        const sessionSupabase = await createServerSupabaseClient()
        const { data: { user } } = await sessionSupabase.auth.getUser()
        if (user && isAdminEmail(user.email)) {
          authorized = true
        }
      } catch {
        // session check failed
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const today = new Date().toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const totalRooms = 16

    // ── Today's occupancy ────────────────────────────────
    const { count: bookedToday } = await supabase
      .from('room_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'booked')

    const occupancyPct = Math.round(((bookedToday || 0) / totalRooms) * 100)

    // ── Reservation stats (last 30 days) ─────────────────
    const { data: recentRes } = await supabase
      .from('reservations')
      .select('id, room_type, total_amount, status, payment_status, check_in_date')
      .gte('created_at', thirtyDaysAgo + 'T00:00:00')
      .order('created_at', { ascending: false })

    const reservations = recentRes || []
    const confirmed = reservations.filter((r) => r.status !== 'cancelled')
    const totalRoomRevenue = confirmed.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)
    const paidCount = confirmed.filter((r) => r.payment_status === 'paid').length

    // Room type breakdown
    const roomBreakdown: Record<string, { count: number; revenue: number }> = {}
    for (const r of confirmed) {
      const rt = r.room_type || 'unknown'
      if (!roomBreakdown[rt]) roomBreakdown[rt] = { count: 0, revenue: 0 }
      roomBreakdown[rt].count++
      roomBreakdown[rt].revenue += Number(r.total_amount) || 0
    }

    // ── Tour commission (last 30 days) ───────────────────
    const { data: recentTours } = await supabase
      .from('tour_bookings')
      .select('price, commission_earned, status')
      .gte('created_at', thirtyDaysAgo + 'T00:00:00')

    const tours = recentTours || []
    const tourRevenue = tours.reduce((sum, t) => sum + (Number(t.price) || 0), 0)
    const tourCommission = tours.reduce((sum, t) => sum + (Number(t.commission_earned) || 0), 0)

    // ── Upsell performance ───────────────────────────────
    const { data: upsells } = await supabase
      .from('upsell_offers')
      .select('offer_type, status, offer_price')
      .gte('offered_at', thirtyDaysAgo + 'T00:00:00')

    const upsellData = upsells || []
    const upsellOffered = upsellData.length
    const upsellAccepted = upsellData.filter((u) => u.status === 'accepted').length
    const upsellRevenue = upsellData
      .filter((u) => u.status === 'accepted')
      .reduce((sum, u) => sum + (Number(u.offer_price) || 0), 0)

    // ── Guest metrics ────────────────────────────────────
    const { count: totalGuests } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })

    const { count: loyalGuests } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('loyalty_tier', ['loyal', 'vip'])

    // ── WhatsApp engagement ──────────────────────────────
    const { count: waMessages } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo + 'T00:00:00')

    return NextResponse.json({
      date: today,
      occupancy: {
        booked: bookedToday || 0,
        total: totalRooms,
        pct: occupancyPct,
      },
      revenue30d: {
        rooms: Math.round(totalRoomRevenue * 100) / 100,
        tours: Math.round(tourRevenue * 100) / 100,
        tourCommission: Math.round(tourCommission * 100) / 100,
        upsells: Math.round(upsellRevenue * 100) / 100,
        total: Math.round((totalRoomRevenue + tourRevenue + upsellRevenue) * 100) / 100,
      },
      reservations30d: {
        total: reservations.length,
        confirmed: confirmed.length,
        paid: paidCount,
        cancelled: reservations.length - confirmed.length,
      },
      roomBreakdown,
      upsells: {
        offered: upsellOffered,
        accepted: upsellAccepted,
        conversionPct: upsellOffered > 0 ? Math.round((upsellAccepted / upsellOffered) * 100) : 0,
        revenue: Math.round(upsellRevenue * 100) / 100,
      },
      guests: {
        total: totalGuests || 0,
        loyal: loyalGuests || 0,
      },
      whatsapp: {
        messages30d: waMessages || 0,
      },
    })
  } catch (error) {
    console.error('[Revenue API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Revenue data failed' },
      { status: 500 },
    )
  }
}
