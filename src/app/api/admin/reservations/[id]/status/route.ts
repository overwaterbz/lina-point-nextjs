import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader === `Bearer ${process.env.CRON_SECRET}`
  )
    return null;
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();
    if (user && isAdminEmail(user.email)) return null;
  } catch {
    /* session check failed */
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/**
 * PATCH /api/admin/reservations/[id]/status
 * Body: { status: 'checked_in' | 'checked_out' | 'cancelled' | 'no_show' }
 *
 * Admin action to transition reservation status.
 * Also creates housekeeping tasks on checkout.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const body = await request.json();
  const newStatus = body.status;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    confirmed: ["checked_in", "cancelled", "no_show"],
    checked_in: ["checked_out"],
    checked_out: [],
    cancelled: [],
    no_show: [],
  };

  // Get current reservation
  const { data: reservation, error: fetchErr } = await supabase
    .from("reservations")
    .select("id, status, room_id, confirmation_number")
    .eq("id", id)
    .single();

  if (fetchErr || !reservation) {
    return NextResponse.json(
      { error: "Reservation not found" },
      { status: 404 },
    );
  }

  const allowed = VALID_TRANSITIONS[reservation.status] || [];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${reservation.status} to ${newStatus}` },
      { status: 400 },
    );
  }

  // Update status
  const { error: updateErr } = await supabase
    .from("reservations")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // Side effects
  if (newStatus === "checked_out" && reservation.room_id) {
    // Create turnover housekeeping task
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("housekeeping_tasks").insert({
      room_id: reservation.room_id,
      date: today,
      task_type: "turnover",
      status: "pending",
      priority: "high",
      notes: `Manual checkout: ${reservation.confirmation_number}`,
    });
  }

  if (newStatus === "cancelled") {
    // Release inventory dates
    const { releaseDates } = await import("@/lib/inventory");
    await releaseDates(supabase as any, id);
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
