export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(request), 100); // 100 error-logs/min per IP
  if (limited) return limited;

  const { context, error, userAgent, url, timestamp } = await request.json();

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("client_error_logs").insert({
      context: typeof context === "string" ? context : JSON.stringify(context),
      error: typeof error === "string" ? error : JSON.stringify(error),
      url,
      user_agent: userAgent,
      ts: timestamp
        ? new Date(timestamp).toISOString()
        : new Date().toISOString(),
    });
  } catch {
    // Never let logging failures surface to the client
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
