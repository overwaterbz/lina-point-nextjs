/**
 * API Route: GET /api/cron/daily-guest-ops
 *
 * Consolidated daily cron that handles:
 * 1. Pre-arrival packets (7 days before check-in)
 * 2. During-stay morning greetings
 * 3. Post-checkout follow-up & intelligence update
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findUpcomingArrivals, generatePreArrivalPacket, sendPreArrivalPacket } from '@/lib/agents/preArrivalAgent'
import { updateGuestIntelligence, logInteraction } from '@/lib/agents/guestIntelligenceAgent'
import { generateUpsellOffers, sendUpsellOffer } from '@/lib/upsellEngine'
import { runPostStayFlow } from '@/lib/agents/postStayLoyaltyAgent'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import type { RoomType } from '@/lib/inventory'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const results = {
      preArrival: { sent: 0, errors: 0 },
      upsells: { offered: 0 },
      morningGreeting: { sent: 0, errors: 0 },
      postCheckout: { processed: 0, loyalty: 0, reviewsSent: 0 } as Record<string, number>,
    }

    // ── 1. Pre-arrival packets (7 days out) ─────────────────
    const arrivals = await findUpcomingArrivals(supabase, 7)

    for (const res of arrivals) {
      try {
        // Check if already sent
        const { data: existing } = await supabase
          .from('pre_arrival_packets')
          .select('id')
          .eq('reservation_id', res.id)
          .maybeSingle()

        if (existing) continue

        const packet = await generatePreArrivalPacket(supabase, res)

        // Get guest contact info
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, full_name')
          .eq('user_id', res.guest_id)
          .maybeSingle()

        // Get email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(res.guest_id)
        const email = authUser?.user?.email || null

        await sendPreArrivalPacket(supabase, packet, profile?.phone_number || null, email)
        results.preArrival.sent++

        // Generate and send one upsell offer with the pre-arrival packet
        try {
          const nights = Math.round(
            (new Date(res.check_out_date).getTime() - new Date(res.check_in_date).getTime()) / (1000 * 60 * 60 * 24),
          )
          const offers = await generateUpsellOffers(supabase, {
            userId: res.guest_id,
            reservationId: res.id,
            roomType: (res.room_type || 'overwater_suite') as RoomType,
            checkIn: res.check_in_date,
            checkOut: res.check_out_date,
            nights,
          })
          if (offers.length > 0 && profile?.phone_number) {
            const topOffer = offers[0]
            await sendUpsellOffer(supabase, topOffer, { reservationId: res.id, userId: res.guest_id })
            await sendWhatsAppMessage(profile.phone_number, topOffer.whatsAppPitch)
            results.upsells.offered++
          }
        } catch (upsellErr) {
          console.error(`[DailyGuestOps] Upsell error for ${res.id}:`, upsellErr)
        }
      } catch (err) {
        console.error(`[DailyGuestOps] Pre-arrival error for ${res.id}:`, err)
        results.preArrival.errors++
      }
    }

    // ── 2. During-stay morning greetings ────────────────────
    const today = new Date().toISOString().split('T')[0]

    const { data: inHouseGuests } = await supabase
      .from('reservations')
      .select('id, guest_id, check_in_date, check_out_date, room_type')
      .eq('status', 'confirmed')
      .lte('check_in_date', today)
      .gt('check_out_date', today)

    for (const stay of inHouseGuests || []) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, full_name, ai_preferences')
          .eq('user_id', stay.guest_id)
          .maybeSingle()

        if (!profile?.phone_number) continue

        // Only send once per day — check recent outbound
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: recentMsg } = await supabase
          .from('whatsapp_messages')
          .select('id')
          .eq('phone_number', profile.phone_number)
          .eq('direction', 'outbound')
          .gte('created_at', oneDayAgo)
          .limit(1)

        // Skip if we already messaged today
        if (recentMsg && recentMsg.length > 0) continue

        const dayNumber =
          Math.floor(
            (new Date(today).getTime() - new Date(stay.check_in_date).getTime()) /
              (1000 * 60 * 60 * 24),
          ) + 1

        const firstName = profile.full_name?.split(' ')[0] || 'there'
        const aiPrefs = (profile.ai_preferences as any) || {}
        const interests = aiPrefs.activityInterests || []

        let tip = 'Enjoy complementary kayaks and paddleboards!'
        if (interests.includes('snorkeling')) tip = 'Great snorkeling conditions today at Hol Chan!'
        if (interests.includes('fishing')) tip = 'Fishing charters still have morning slots.'
        if (interests.includes('diving')) tip = 'Dive shop opens at 7:30 AM for gear rentals.'

        const greeting = `Good morning ${firstName}! ☀️ Day ${dayNumber} of your stay. ${tip} Need anything? Just reply here.`

        await sendWhatsAppMessage(profile.phone_number, greeting)
        results.morningGreeting.sent++
      } catch (err) {
        console.error(`[DailyGuestOps] Morning greeting error for ${stay.id}:`, err)
        results.morningGreeting.errors++
      }
    }

    // ── 3. Post-checkout intelligence update ────────────────
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const { data: checkedOut } = await supabase
      .from('reservations')
      .select('id, guest_id, total_amount')
      .eq('check_out_date', yesterdayStr)
      .in('status', ['confirmed', 'checked_out'])

    for (const res of checkedOut || []) {
      try {
        await updateGuestIntelligence(supabase, res.guest_id)
        await logInteraction(supabase, {
          userId: res.guest_id,
          type: 'checkout',
          channel: 'system',
          summary: 'Post-checkout intelligence profile updated',
          sentiment: 'neutral',
          reservationId: res.id,
        })

        // Run post-stay loyalty flow: points, review request, referral offer
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number, full_name')
          .eq('user_id', res.guest_id)
          .maybeSingle()

        const { data: authUser } = await supabase.auth.admin.getUserById(res.guest_id)

        try {
          const postStay = await runPostStayFlow(supabase, {
            guestId: res.guest_id,
            reservationId: res.id,
            guestName: profile?.full_name || 'Guest',
            phone: profile?.phone_number || null,
            email: authUser?.user?.email || null,
            totalAmount: Number(res.total_amount) || 0,
          })
          results.postCheckout.loyalty = (results.postCheckout.loyalty || 0) + postStay.pointsAccrued
          results.postCheckout.reviewsSent = (results.postCheckout.reviewsSent || 0) + (postStay.reviewSent ? 1 : 0)
        } catch (loyaltyErr) {
          console.error(`[DailyGuestOps] Post-stay loyalty error for ${res.id}:`, loyaltyErr)
        }

        results.postCheckout.processed++
      } catch (err) {
        console.error(`[DailyGuestOps] Post-checkout error for ${res.id}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[DailyGuestOps] Cron error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 },
    )
  }
}
