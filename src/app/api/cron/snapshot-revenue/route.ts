export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/cron/snapshot-revenue
 *
 * Daily cron that writes a revenue snapshot for yesterday into the
 * `revenue_snapshots` table. Scheduled to run at 01:00 UTC each day.
 *
 * Authorization: Bearer ${CRON_SECRET}
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Yesterday in UTC
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const snapshotDate = yesterday.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const dayStart = `${snapshotDate}T00:00:00.000Z`;
  const dayEnd = `${snapshotDate}T23:59:59.999Z`;

  try {
    // Paid reservations updated to 'paid' yesterday
    const { data: reservations, error: resErr } = await supabase
      .from("reservations")
      .select("id, total_amount")
      .eq("payment_status", "paid")
      .gte("updated_at", dayStart)
      .lte("updated_at", dayEnd);

    if (resErr) {
      console.error(
        "[SnapshotRevenue] Failed to query reservations:",
        resErr.message,
      );
      return NextResponse.json({ error: "DB query failed" }, { status: 500 });
    }

    const reservationCount = reservations?.length ?? 0;
    const totalPaid = (reservations ?? []).reduce(
      (sum, r) => sum + (Number(r.total_amount) || 0),
      0,
    );

    // Rooms booked (inventory rows with status = 'booked' or 'occupied' for that date)
    const { count: roomsBooked } = await supabase
      .from("room_inventory")
      .select("id", { count: "exact", head: true })
      .eq("date", snapshotDate)
      .in("status", ["booked", "occupied"]);

    // Upsert — idempotent re-runs are safe
    const { error: upsertErr } = await supabase
      .from("revenue_snapshots")
      .upsert(
        {
          snapshot_date: snapshotDate,
          total_paid: Math.round(totalPaid * 100) / 100,
          reservation_count: reservationCount,
          rooms_booked: roomsBooked ?? 0,
        },
        { onConflict: "snapshot_date" },
      );

    if (upsertErr) {
      console.error("[SnapshotRevenue] Upsert failed:", upsertErr.message);
      return NextResponse.json({ error: "Upsert failed" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      snapshot_date: snapshotDate,
      total_paid: totalPaid,
      reservation_count: reservationCount,
      rooms_booked: roomsBooked ?? 0,
    });
  } catch (err) {
    console.error("[SnapshotRevenue] Unexpected error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
