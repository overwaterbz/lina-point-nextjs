export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runWelcomePreparation } from "@/lib/agents/welcomeAgent";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    const stats = await runWelcomePreparation(supabase);
    return NextResponse.json({ success: true, ...stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/cron/welcome-preparation]", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
