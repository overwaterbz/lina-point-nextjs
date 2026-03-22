/**
 * API Route: POST /api/system/feedback-loop
 *
 * Central feedback ingestion for the autonomous improvement cycle:
 * 1. Health monitor logs issues → stored here
 * 2. Self-improvement agent reads issues → generates fixes
 * 3. Fixes applied → health monitor verifies → cycle repeats
 *
 * Also serves GET for the admin dashboard to view system health.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
);

export async function GET(request: NextRequest) {
  try {
    // Auth: cron secret or valid session
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      // Check for Supabase session
      const token = authHeader?.replace("Bearer ", "");
      if (!token) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get latest health report
    const { data: latestCheck } = await supabase
      .from("agent_runs")
      .select("output, created_at")
      .eq("agent_name", "health_monitor")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Get agent performance stats (last 7 days)
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: agentStats } = await supabase
      .from("agent_runs")
      .select("agent_name, status, duration_ms")
      .gte("created_at", weekAgo);

    // Calculate per-agent metrics
    const metrics: Record<
      string,
      { total: number; success: number; failed: number; avgDurationMs: number }
    > = {};
    for (const run of agentStats || []) {
      const name = run.agent_name;
      if (!metrics[name])
        metrics[name] = { total: 0, success: 0, failed: 0, avgDurationMs: 0 };
      metrics[name].total++;
      if (run.status === "completed") metrics[name].success++;
      if (run.status === "failed") metrics[name].failed++;
      if (run.duration_ms) {
        metrics[name].avgDurationMs =
          (metrics[name].avgDurationMs * (metrics[name].total - 1) +
            run.duration_ms) /
          metrics[name].total;
      }
    }

    // Calculate success rates
    const agentHealth = Object.entries(metrics).map(([name, m]) => ({
      agent: name,
      successRate: m.total > 0 ? Math.round((m.success / m.total) * 100) : 0,
      totalRuns: m.total,
      failures: m.failed,
      avgDurationMs: Math.round(m.avgDurationMs),
    }));

    return NextResponse.json({
      success: true,
      latestHealthCheck: latestCheck?.output || null,
      lastChecked: latestCheck?.created_at || null,
      agentHealth,
      systemUptime: agentHealth.every((a) => a.successRate > 80)
        ? "healthy"
        : "degraded",
    });
  } catch (error) {
    console.error("[FeedbackLoop] GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth: cron secret only (system-level endpoint)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { type, agent_name, message, metadata } = body;

    if (!type || !message) {
      return NextResponse.json(
        { error: "Missing type or message" },
        { status: 400 },
      );
    }

    // Store the feedback event
    const { error } = await supabase.from("agent_runs").insert({
      user_id: "00000000-0000-0000-0000-000000000000",
      agent_name: agent_name || "health_monitor",
      status: "completed",
      input: { type, message, metadata },
      output: { feedback_logged: true, timestamp: new Date().toISOString() },
      finished_at: new Date().toISOString(),
    });

    if (error) throw error;

    return NextResponse.json({ success: true, logged: true });
  } catch (error) {
    console.error("[FeedbackLoop] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed",
      },
      { status: 500 },
    );
  }
}
