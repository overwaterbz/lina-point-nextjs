export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { cancelReservation } from "@/lib/bookingFulfillment";

/**
 * POST /api/reservations/[id]/cancel
 * Guest-facing cancellation endpoint. Requires authenticated session.
 * Applies refund policy and issues refund if applicable.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify the reservation belongs to this user
  const { data: reservation, error: fetchErr } = await supabase
    .from("reservations")
    .select("id, status, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  if (reservation.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (reservation.status === "cancelled") {
    return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
  }

  if (!["confirmed", "pending"].includes(reservation.status)) {
    return NextResponse.json(
      {
        error: `Cannot cancel a reservation with status: ${reservation.status}`,
      },
      { status: 400 },
    );
  }

  try {
    const { refundAmount, refundPct } = await cancelReservation(
      supabase as any,
      id,
    );
    return NextResponse.json({ ok: true, refundAmount, refundPct });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Cancellation failed" },
      { status: 500 },
    );
  }
}
