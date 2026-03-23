/**
 * Cron: Pricing Outcome Evaluator
 *
 * Runs weekly (recommend: every Monday at 09:00).
 * For each auto-applied pricing rule change that is >7 days old and lacks a verdict,
 * it computes booking velocity before and after the change for the affected room type,
 * then records the outcome verdict: 'improved' | 'degraded' | 'neutral'.
 *
 * This feeds the self-learning loop so pricingOptimizationAgent can judge whether
 * past recommendations actually increased revenue.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyCronSecret } from "@/lib/cronAuth";

export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Fetch unresolved outcomes where at least 7 days have passed since applying
  const { data: pending, error: fetchError } = await supabase
    .from("pricing_rule_outcomes")
    .select("id, rule_id, room_type, applied_at")
    .is("verdict", null)
    .lte("applied_at", sevenDaysAgo);

  if (fetchError) {
    console.error(
      "[OutcomeEval] Failed to fetch pending outcomes:",
      fetchError,
    );
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pending?.length) {
    return NextResponse.json({
      success: true,
      evaluated: 0,
      message: "No pending outcomes",
    });
  }

  let evaluated = 0;
  let errors = 0;

  for (const outcome of pending) {
    try {
      const appliedAt = new Date(outcome.applied_at);
      const beforeStart = new Date(
        appliedAt.getTime() - 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const afterEnd = new Date(
        appliedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const appliedAtIso = appliedAt.toISOString();

      // Count reservations 7 days BEFORE the rule change
      const beforeQuery = supabase
        .from("reservations")
        .select("id, total_amount", { count: "exact" })
        .gte("created_at", beforeStart)
        .lt("created_at", appliedAtIso)
        .eq("status", "confirmed");

      // Count reservations 7 days AFTER the rule change
      const afterQuery = supabase
        .from("reservations")
        .select("id, total_amount", { count: "exact" })
        .gte("created_at", appliedAtIso)
        .lte("created_at", afterEnd)
        .eq("status", "confirmed");

      // Scope by room type if available
      if (outcome.room_type) {
        beforeQuery.eq("room_type", outcome.room_type);
        afterQuery.eq("room_type", outcome.room_type);
      }

      const [
        { data: beforeRows, count: beforeCount },
        { data: afterRows, count: afterCount },
      ] = await Promise.all([beforeQuery, afterQuery]);

      const bookingsBefore = beforeCount ?? 0;
      const bookingsAfter = afterCount ?? 0;
      const revenueBefore =
        beforeRows?.reduce(
          (sum, r) => sum + (Number(r.total_amount) || 0),
          0,
        ) ?? 0;
      const revenueAfter =
        afterRows?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) ??
        0;

      // Verdict: >5% more bookings = improved, >5% fewer = degraded, otherwise neutral
      let verdict: "improved" | "degraded" | "neutral" = "neutral";
      if (bookingsBefore > 0) {
        const pctChange = (bookingsAfter - bookingsBefore) / bookingsBefore;
        if (pctChange > 0.05) verdict = "improved";
        else if (pctChange < -0.05) verdict = "degraded";
      } else if (bookingsAfter > 0) {
        verdict = "improved"; // went from 0 bookings to some — clear win
      }

      await supabase
        .from("pricing_rule_outcomes")
        .update({
          bookings_before_7d: bookingsBefore,
          bookings_after_7d: bookingsAfter,
          revenue_before: revenueBefore,
          revenue_after: revenueAfter,
          verdict,
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", outcome.id);

      evaluated++;
    } catch (err) {
      console.error("[OutcomeEval] Error processing outcome:", outcome.id, err);
      errors++;
    }
  }

  console.log(
    `[OutcomeEval] Evaluated ${evaluated} outcomes, ${errors} errors`,
  );

  return NextResponse.json({
    success: true,
    evaluated,
    errors,
    pendingCount: pending.length,
  });
}
