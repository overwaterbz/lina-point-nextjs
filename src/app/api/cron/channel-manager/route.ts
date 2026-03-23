import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runChannelManager } from "@/lib/agents/channelManagerAgent";

export const dynamic = "force-dynamic";

function verifyCronSecret(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const result = await runChannelManager(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/channel-manager]", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
