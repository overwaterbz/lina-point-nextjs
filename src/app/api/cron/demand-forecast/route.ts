/**
 * Cron: Demand Forecast
 * Recommended schedule: daily at 02:00 UTC
 * Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runDemandForecast } from "@/lib/demandForecasting";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) console.log(...args);
};

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const entries = await runDemandForecast(supabase);
    debugLog(`[DemandForecast] Computed ${entries.length} entries`);
    return NextResponse.json({ success: true, entries: entries.length });
  } catch (err) {
    console.error("[DemandForecast] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
