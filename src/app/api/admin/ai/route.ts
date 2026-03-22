export const dynamic = "force-dynamic";

/**
 * API Route: Admin AI Prompt Management
 *
 * GET  /api/admin/ai — List pending prompts + recent history
 * POST /api/admin/ai — Approve or reject a prompt update
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import {
  getPendingPrompts,
  getPromptHistory,
  approvePrompt,
  rejectPrompt,
} from "@/lib/agents/promptManager";

async function requireAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return null;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const [pending, history] = await Promise.all([
    getPendingPrompts(),
    getPromptHistory(),
  ]);

  return NextResponse.json({ pending, history });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { promptId, action } = body;

  if (!promptId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "Invalid request: need promptId and action (approve|reject)" },
      { status: 400 },
    );
  }

  const success =
    action === "approve"
      ? await approvePrompt(promptId)
      : await rejectPrompt(promptId);

  if (!success) {
    return NextResponse.json(
      { error: "Failed to update prompt — may not be in pending_review state" },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true, action, promptId });
}
