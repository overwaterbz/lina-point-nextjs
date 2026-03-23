/**
 * Cron: Competitor Intelligence
 * Recommended schedule: weekly, Monday 06:00 UTC
 * Header: Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runCompetitorIntelligenceAgent } from "@/lib/agents/competitorIntelligenceAgent";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const patterns = await runCompetitorIntelligenceAgent(supabase);
    console.log(
      `[CompetitorIntelligence] Detected ${patterns.length} patterns`,
    );
    return NextResponse.json({ success: true, patterns: patterns.length });
  } catch (err) {
    console.error("[CompetitorIntelligence] Error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
