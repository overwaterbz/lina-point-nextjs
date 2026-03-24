export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(request), 100); // 100 error-logs/min per IP
  if (limited) return limited;

  const { context, error, userAgent, url, timestamp } = await request.json();

  // Truncate fields to prevent oversized payloads from polluting the DB
  const safeContext =
    typeof context === "string"
      ? context.slice(0, 2000)
      : JSON.stringify(context ?? null).slice(0, 2000);
  const safeError =
    typeof error === "string"
      ? error.slice(0, 5000)
      : JSON.stringify(error ?? null).slice(0, 5000);
  const safeUrl = typeof url === "string" ? url.slice(0, 500) : null;
  const safeUserAgent =
    typeof userAgent === "string" ? userAgent.slice(0, 300) : null;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("client_error_logs").insert({
      context: safeContext,
      error: safeError,
      url: safeUrl,
      user_agent: safeUserAgent,
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
