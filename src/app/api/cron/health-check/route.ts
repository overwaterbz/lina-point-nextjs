export const dynamic = "force-dynamic";

/**
 * API Route: GET /api/cron/health-check
 * Runs every 6 hours via vercel.json
 *
 * Autonomous health monitoring:
 * - Checks all endpoints
 * - Reviews agent failures
 * - Analyzes error patterns with Grok
 * - Applies auto-fixes
 * - Feeds data back to self-improvement loop
 */

import { NextRequest, NextResponse } from "next/server";
import { runHealthCheck } from "@/lib/agents/healthMonitorAgent";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const denied = verifyCronSecret(request.headers.get("authorization"));
    if (denied) return denied;

    const report = await runHealthCheck();

    return NextResponse.json({
      success: true,
      status: report.overallStatus,
      summary: {
        endpoints: report.endpointChecks.length,
        healthy: report.endpointChecks.filter((e) => e.status === "healthy")
          .length,
        failures24h: report.recentFailures.length,
        autoFixes: report.autoFixesApplied.length,
        patterns: report.errorPatterns.length,
      },
      recommendations: report.recommendations,
      autoFixesApplied: report.autoFixesApplied,
      nextCheckIn: report.nextCheckIn,
    });
  } catch (error) {
    console.error("[HealthCheck Cron] Failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 },
    );
  }
}
