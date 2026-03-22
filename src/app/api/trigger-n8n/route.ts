export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runSelfImprovementAndPersist } from "@/lib/agents/selfImprovementAgent";

function requireSecret(request: NextRequest) {
  const required = process.env.N8N_WEBHOOK_SECRET || process.env.N8N_SECRET;
  if (!required) return;

  const provided = request.headers.get("x-n8n-secret");
  if (!provided || provided !== required) {
    throw new Error("Unauthorized");
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Supabase service role not configured");
  }
  return createClient(url, key);
}

/**
 * POST handler — receives inbound triggers from n8n (n8n → Lina Point)
 * Used for: self-improvement triggers, workflow orchestration
 */
export async function POST(request: NextRequest) {
  try {
    requireSecret(request);

    const body = await request.json().catch(() => ({}));
    const steps = [
      { name: "booking", status: "queued" },
      { name: "curate", status: "queued" },
      { name: "generate_content", status: "queued" },
      { name: "email_and_social", status: "queued" },
    ];

    if (body?.runSelfImprove) {
      const supabase = getSupabaseAdmin();
      await runSelfImprovementAndPersist(supabase as any, {
        logsSummary: "Triggered via n8n",
        bookingSummary: JSON.stringify(body?.booking || {}),
        prefsSummary: JSON.stringify(body?.prefs || {}),
        conversionSummary: JSON.stringify(body?.conversions || {}),
      });

      steps.push({ name: "self_improve", status: "completed" });
    }

    return NextResponse.json({
      ok: true,
      workflow: "booking-curate-content-email",
      payload: body,
      steps,
      message: "n8n workflow triggered",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow error";
    const status = message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

/**
 * GET handler — health check for n8n integration
 */
export async function GET() {
  const configured = !!(
    process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL
  );
  return NextResponse.json({
    ok: true,
    n8n_configured: configured,
    inbound: "POST /api/trigger-n8n (n8n → Lina Point)",
    outbound: "Use triggerN8nWorkflow() from @/lib/n8nClient",
  });
}
