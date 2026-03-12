/**
 * API Route: GET /api/cron/revenue-snapshot
 * Runs at 23:55 UTC daily via vercel.json
 *
 * Captures a daily revenue snapshot into the revenue_snapshots table.
 * Uses UPSERT on snapshot_date (UNIQUE) so re-runs are idempotent.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );

    const today = new Date().toISOString().split('T')[0];
    const todayStart = today + 'T00:00:00';
    const todayEnd = today + 'T23:59:59';
    const totalRooms = 16;

    // ── Reservations created today ───────────────────────
    const { data: todayRes } = await supabase
      .from('reservations')
      .select('id, total_amount, status')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const reservations = todayRes || [];
    const activeRes = reservations.filter((r) => r.status !== 'cancelled');
    const totalReservations = activeRes.length;
    const totalRoomRevenue = activeRes.reduce(
      (sum, r) => sum + (Number(r.total_amount) || 0),
      0,
    );

    // ── Average nightly rate from today's reservations ───
    const { data: ratesData } = await supabase
      .from('reservations')
      .select('base_rate')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd)
      .neq('status', 'cancelled');

    const rates = (ratesData || []).map((r) => Number(r.base_rate) || 0).filter((r) => r > 0);
    const avgNightlyRate = rates.length > 0
      ? rates.reduce((a, b) => a + b, 0) / rates.length
      : 0;

    // ── Tour revenue & commission today ──────────────────
    const { data: todayTours } = await supabase
      .from('tour_bookings')
      .select('price, commission_earned')
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const tours = todayTours || [];
    const totalTourRevenue = tours.reduce((sum, t) => sum + (Number(t.price) || 0), 0);
    const totalCommission = tours.reduce((sum, t) => sum + (Number(t.commission_earned) || 0), 0);

    // ── Occupancy (rooms booked for today) ───────────────
    const { count: bookedToday } = await supabase
      .from('room_inventory')
      .select('id', { count: 'exact', head: true })
      .eq('date', today)
      .eq('status', 'booked');

    const occupancyPct = Math.round(((bookedToday || 0) / totalRooms) * 100);

    // ── Guest counts ─────────────────────────────────────
    const { count: newGuests } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    const { count: totalGuests } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const returningGuests = (totalGuests || 0) - (newGuests || 0);

    // ── WhatsApp conversations today ─────────────────────
    const { count: waConversations } = await supabase
      .from('whatsapp_messages')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart)
      .lte('created_at', todayEnd);

    // ── UPSERT snapshot (idempotent on snapshot_date) ────
    const snapshot = {
      snapshot_date: today,
      total_reservations: totalReservations,
      total_room_revenue: Math.round(totalRoomRevenue * 100) / 100,
      total_tour_revenue: Math.round(totalTourRevenue * 100) / 100,
      total_commission: Math.round(totalCommission * 100) / 100,
      avg_nightly_rate: Math.round(avgNightlyRate * 100) / 100,
      occupancy_pct: occupancyPct,
      new_guests: newGuests || 0,
      returning_guests: returningGuests > 0 ? returningGuests : 0,
      whatsapp_conversations: waConversations || 0,
    };

    const { error: upsertError } = await supabase
      .from('revenue_snapshots')
      .upsert(snapshot, { onConflict: 'snapshot_date' });

    if (upsertError) {
      console.error('[RevenueSnapshot] Upsert failed:', upsertError);
      return NextResponse.json(
        { success: false, error: upsertError.message },
        { status: 500 },
      );
    }

    console.log(`[RevenueSnapshot] ${today}: ${totalReservations} reservations, $${totalRoomRevenue} room rev, ${occupancyPct}% occupancy`);

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error) {
    console.error('[RevenueSnapshot Cron] Failed:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Snapshot failed' },
      { status: 500 },
    );
  }
}
