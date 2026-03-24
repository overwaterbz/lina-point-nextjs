export const dynamic = "force-dynamic";

/**
 * Funnel A/B Analytics Endpoint
 *
 * Tracks which booking wizard step a session has reached and whether it converted.
 * Upserts to funnel_experiments table — one row per session ID (latest step wins).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    sessionId,
    variant,
    stepReached,
    converted = false,
    roomType = null,
    checkIn = null,
  } = body as Record<string, unknown>;

  if (
    typeof sessionId !== "string" ||
    !sessionId ||
    (variant !== "A" && variant !== "B") ||
    typeof stepReached !== "number"
  ) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Upsert: keep the highest step_reached for this session; if converted set it permanently
  const { data: existing } = await supabase
    .from("funnel_experiments")
    .select("id, step_reached, converted")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (existing) {
    const shouldUpdate =
      (stepReached as number) > existing.step_reached ||
      (converted && !existing.converted);
    if (shouldUpdate) {
      await supabase
        .from("funnel_experiments")
        .update({
          step_reached: Math.max(stepReached as number, existing.step_reached),
          converted: converted || existing.converted,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  } else {
    await supabase.from("funnel_experiments").insert({
      session_id: sessionId,
      variant,
      step_reached: stepReached,
      converted: Boolean(converted),
      room_type: roomType ?? null,
      check_in: checkIn ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}
