export const dynamic = "force-dynamic";

/**
 * GET /api/cron/pricing-optimization
 *
 * Runs every 6 hours to analyze occupancy, revenue trends,
 * and pricing rules — auto-adjusts small tweaks, flags
 * strategic changes for admin review.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cronAuth";
import { runPricingOptimization } from "@/lib/agents/pricingOptimizationAgent";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  try {
    const result = await runPricingOptimization();

    return NextResponse.json({
      success: true,
      autoApplied: result.autoApplied,
      flaggedForReview: result.flaggedForReview,
      revenueTrend: result.revenueTrend,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[PricingCron] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Pricing optimization failed",
      },
      { status: 500 },
    );
  }
}
