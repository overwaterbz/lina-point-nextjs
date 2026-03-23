/**
 * API Route: GET /api/cron/self-improvement
 * Runs weekly (Sunday 3 AM) via vercel.json
 *
 * Gathers real data from agent_runs, reservations, profiles, and marketing_campaigns,
 * then runs the self-improvement agent to analyze and generate prompt updates.
 * Uses autonomy-first model: operational tweaks auto-apply, directional changes need admin review.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  runSelfImprovementAndPersist,
  type SelfImproveInputs,
} from "@/lib/agents/selfImprovementAgent";
import { verifyCronSecret } from "@/lib/cronAuth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  try {
    const denied = verifyCronSecret(request.headers.get("authorization"));
    if (denied) return denied;

    // Gather real data for self-improvement analysis
    const [logsSummary, bookingSummary, prefsSummary, conversionSummary] =
      await Promise.all([
        gatherAgentLogs(),
        gatherBookingSummary(),
        gatherPreferencesSummary(),
        gatherConversionSummary(),
      ]);

    const inputs: SelfImproveInputs = {
      logsSummary,
      bookingSummary,
      prefsSummary,
      conversionSummary,
    };

    const result = await runSelfImprovementAndPersist(supabase, inputs);

    // Log the run
    await supabase.from("agent_runs").insert({
      agent_name: "self_improvement",
      status: "success",
      input: JSON.stringify({
        summaryLengths: {
          logs: logsSummary.length,
          bookings: bookingSummary.length,
          prefs: prefsSummary.length,
          conversions: conversionSummary.length,
        },
      }),
      output: JSON.stringify({
        score: result.score,
        insightsCount: result.insights.length,
        promptUpdatesCount: result.promptUpdates.length,
      }),
      duration_ms: 0,
    });

    return NextResponse.json({
      success: true,
      score: result.score,
      insights: result.insights,
      promptUpdates: result.promptUpdates.length,
      mlInsights: result.mlInsights?.length || 0,
    });
  } catch (error) {
    console.error("[Self-Improvement Cron] Failed:", error);

    try {
      await supabase.from("agent_runs").insert({
        agent_name: "self_improvement",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: 0,
      });
    } catch {
      // Best-effort error logging
    }

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Self-improvement failed",
      },
      { status: 500 },
    );
  }
}

/** Summarize agent_runs from the last 7 days */
async function gatherAgentLogs(): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("agent_runs")
    .select("agent_name, status, error, created_at")
    .gte("created_at", weekAgo)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data?.length) return "No agent runs in the past 7 days.";

  const byAgent = new Map<
    string,
    { success: number; error: number; errors: string[] }
  >();
  for (const run of data) {
    const entry = byAgent.get(run.agent_name) || {
      success: 0,
      error: 0,
      errors: [],
    };
    if (run.status === "success") entry.success++;
    else {
      entry.error++;
      if (run.error && entry.errors.length < 3) entry.errors.push(run.error);
    }
    byAgent.set(run.agent_name, entry);
  }

  const lines = Array.from(byAgent.entries()).map(([name, stats]) => {
    const errMsg = stats.errors.length
      ? ` Errors: ${stats.errors.join("; ")}`
      : "";
    return `${name}: ${stats.success} ok, ${stats.error} failed.${errMsg}`;
  });

  return `Agent runs (last 7 days, ${data.length} total):\n${lines.join("\n")}`;
}

/** Summarize recent booking patterns */
async function gatherBookingSummary(): Promise<string> {
  const monthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { data } = await supabase
    .from("reservations")
    .select("room_type, status, total_amount, created_at")
    .gte("created_at", monthAgo)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data?.length) return "No bookings in the past 30 days.";

  const byRoom = new Map<
    string,
    { count: number; revenue: number; statuses: Record<string, number> }
  >();
  for (const r of data) {
    const entry = byRoom.get(r.room_type) || {
      count: 0,
      revenue: 0,
      statuses: {},
    };
    entry.count++;
    entry.revenue += r.total_amount || 0;
    entry.statuses[r.status] = (entry.statuses[r.status] || 0) + 1;
    byRoom.set(r.room_type, entry);
  }

  const lines = Array.from(byRoom.entries()).map(([room, stats]) => {
    const statusStr = Object.entries(stats.statuses)
      .map(([s, c]) => `${s}:${c}`)
      .join(", ");
    return `${room}: ${stats.count} bookings, $${stats.revenue.toFixed(0)} revenue (${statusStr})`;
  });

  return `Booking summary (last 30 days):\n${lines.join("\n")}`;
}

/** Summarize guest preferences and AI insights */
async function gatherPreferencesSummary(): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("travel_style, loyalty_tier, ai_preferences")
    .not("ai_preferences", "is", null)
    .limit(50);

  if (!data?.length) return "No guest preference data available.";

  const styles = new Map<string, number>();
  const tiers = new Map<string, number>();
  for (const p of data) {
    if (p.travel_style)
      styles.set(p.travel_style, (styles.get(p.travel_style) || 0) + 1);
    if (p.loyalty_tier)
      tiers.set(p.loyalty_tier, (tiers.get(p.loyalty_tier) || 0) + 1);
  }

  return `Guest preferences (${data.length} profiles with AI data):\nTravel styles: ${Array.from(
    styles.entries(),
  )
    .map(([s, c]) => `${s}:${c}`)
    .join(", ")}\nLoyalty tiers: ${Array.from(tiers.entries())
    .map(([t, c]) => `${t}:${c}`)
    .join(", ")}`;
}

/** Summarize conversion funnel data — includes all guest searches via booking_analytics */
async function gatherConversionSummary(): Promise<string> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [promosResult, campaignsResult, analyticsResult, reservationsResult] =
    await Promise.all([
      // Direct booking conversion via promo usage
      supabase
        .from("promo_codes")
        .select("code, usage_count, max_uses, active")
        .limit(20),
      // Marketing campaign performance
      supabase
        .from("marketing_campaigns")
        .select("campaign_type, status, performance_metrics, created_at")
        .gte("created_at", weekAgo)
        .limit(20),
      // ALL guest searches (authenticated + anonymous) via booking_analytics
      supabase
        .from("booking_analytics")
        .select(
          "room_type, nights, savings_percent, best_ota, experiment_variant, created_at",
        )
        .gte("created_at", weekAgo)
        .limit(500),
      // Confirmed reservations (authenticated) for conversion rate calc
      supabase
        .from("reservations")
        .select("room_type, status, created_at")
        .gte("created_at", weekAgo)
        .limit(200),
    ]);

  const parts: string[] = [];

  // Promo usage
  if (promosResult.data?.length) {
    const activePromos = promosResult.data.filter((p) => p.active);
    const totalUsage = promosResult.data.reduce(
      (s, p) => s + (p.usage_count || 0),
      0,
    );
    parts.push(
      `Promo codes: ${activePromos.length} active, ${totalUsage} total uses`,
    );
  }

  // Campaign performance
  if (campaignsResult.data?.length) {
    const byType = new Map<string, number>();
    for (const c of campaignsResult.data)
      byType.set(c.campaign_type, (byType.get(c.campaign_type) || 0) + 1);
    parts.push(
      `Recent campaigns: ${Array.from(byType.entries())
        .map(([t, c]) => `${t}:${c}`)
        .join(", ")}`,
    );
  }

  // Guest search analytics — the full funnel picture including anonymous visitors
  if (analyticsResult.data?.length) {
    const searches = analyticsResult.data;
    const confirmedBookings = reservationsResult.data?.length || 0;
    const conversionRate =
      searches.length > 0
        ? ((confirmedBookings / searches.length) * 100).toFixed(1)
        : "0";
    const avgSavings =
      searches.reduce((s, a) => s + (a.savings_percent || 0), 0) /
      searches.length;

    // Top searched rooms
    const roomCounts = new Map<string, number>();
    for (const a of searches)
      roomCounts.set(a.room_type, (roomCounts.get(a.room_type) || 0) + 1);
    const topRooms = Array.from(roomCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([r, c]) => `${r}:${c}`)
      .join(", ");

    // Average stay length
    const avgNights =
      searches.reduce((s, a) => s + (a.nights || 0), 0) / searches.length;

    parts.push(
      `Booking funnel (7d): ${searches.length} searches → ${confirmedBookings} confirmed (${conversionRate}% conversion)`,
    );
    parts.push(
      `Avg savings shown: ${avgSavings.toFixed(1)}%, avg stay: ${avgNights.toFixed(1)} nights`,
    );
    parts.push(`Most searched rooms: ${topRooms || "none"}`);
  }

  // Top content calendar engagement
  const { data: topContent } = await supabase
    .from("content_calendar")
    .select("platform, title, engagements, clicks")
    .gte("created_at", monthAgo)
    .not("engagements", "is", null)
    .order("engagements", { ascending: false })
    .limit(3);

  if (topContent?.length) {
    const topPosts = topContent
      .map(
        (p) =>
          `[${p.platform}] "${p.title}" — ${p.engagements || 0} engagements`,
      )
      .join("; ");
    parts.push(`Top content (30d): ${topPosts}`);
  }

  return parts.length
    ? `Conversion data:\n${parts.join("\n")}`
    : "No conversion data available yet.";
}
