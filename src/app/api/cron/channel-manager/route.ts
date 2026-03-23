import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runChannelManager } from "@/lib/agents/channelManagerAgent";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

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
