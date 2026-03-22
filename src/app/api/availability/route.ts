export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAvailability } from "@/lib/inventory";
import { calculateDynamicPrice } from "@/lib/dynamicPricing";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";
import type { RoomType } from "@/lib/inventory";

/**
 * GET /api/availability?checkIn=2026-04-01&checkOut=2026-04-05
 * Public endpoint — returns available room counts per type with dynamic pricing.
 * Uses service role key since this is a public, unauthenticated endpoint.
 */
export async function GET(request: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(request), 30); // 30 req/min
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: "checkIn and checkOut query params required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  // Basic date validation
  const ciDate = new Date(checkIn + "T00:00:00");
  const coDate = new Date(checkOut + "T00:00:00");
  if (isNaN(ciDate.getTime()) || isNaN(coDate.getTime())) {
    return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
  }
  if (coDate <= ciDate) {
    return NextResponse.json(
      { error: "checkOut must be after checkIn" },
      { status: 400 },
    );
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    const availability = await checkAvailability(supabase, checkIn, checkOut);

    // Enrich with dynamic pricing
    const enriched = await Promise.all(
      availability.map(async (item) => {
        try {
          const pricing = await calculateDynamicPrice(
            supabase,
            item.roomType as RoomType,
            checkIn,
            checkOut,
          );
          return {
            ...item,
            dynamicRate: pricing.finalRate,
            totalForStay: pricing.totalForStay,
            appliedRules: pricing.appliedRules,
            savingsVsBase: pricing.savingsVsBase,
          };
        } catch {
          return item; // Fall back to base rate if pricing engine fails
        }
      }),
    );

    return NextResponse.json({ availability: enriched }, { status: 200 });
  } catch (err) {
    console.error("[Availability] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
