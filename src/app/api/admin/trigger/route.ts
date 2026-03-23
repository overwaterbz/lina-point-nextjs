export const dynamic = "force-dynamic";

/**
 * POST /api/admin/trigger
 *
 * Auth-gated proxy for manually triggering agent runs from the admin dashboard.
 * Verifies a valid admin Supabase session server-side — no secrets exposed to client.
 *
 * Body: { agent: "ical-sync" | "channel-manager" | "reputation-monitor" | "in-stay-agent" | "post-stay-memory" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

export async function POST(request: NextRequest) {
  // Verify admin session — no CRON_SECRET ever sent from the browser
  try {
    const sessionSupabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let agent: string;
  try {
    const body = await request.json();
    agent = body?.agent ?? "";
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (!agent) {
    return NextResponse.json({ error: "Missing agent" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  try {
    switch (agent) {
      case "ical-sync": {
        const { syncAllRooms } = await import("@/lib/icalSync");
        const results = await syncAllRooms();
        const blocked = results.reduce((s, r) => s + r.blocked, 0);
        const released = results.reduce((s, r) => s + r.released, 0);
        const errors = results.filter((r) => r.error);
        return NextResponse.json({
          ok: true,
          rooms: results.length,
          blocked,
          released,
          errors: errors.map((e) => ({ room: e.roomName, error: e.error })),
        });
      }

      case "channel-manager": {
        const { runChannelManager } =
          await import("@/lib/agents/channelManagerAgent");
        const result = await runChannelManager(supabase);
        return NextResponse.json({ ok: true, ...result });
      }

      case "reputation-monitor": {
        const { runReputationMonitor } =
          await import("@/lib/agents/reputationAgent");
        const result = await runReputationMonitor(supabase);
        return NextResponse.json({ ok: true, ...result });
      }

      case "in-stay-agent": {
        const { runInStayAgent } = await import("@/lib/agents/inStayAgent");
        const result = await runInStayAgent(supabase);
        return NextResponse.json({ success: true, ...result });
      }

      case "post-stay-memory": {
        const { runPostStayMemoryCapture } =
          await import("@/lib/agents/postStayLoyaltyAgent");
        const result = await runPostStayMemoryCapture(supabase);
        return NextResponse.json({ ok: true, ...result });
      }

      default:
        return NextResponse.json(
          { error: `Unknown agent: ${agent}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error(`[admin/trigger] agent=${agent}`, err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
