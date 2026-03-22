export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { runPriceScout } from "@/lib/priceScoutAgent";
import { runExperienceCurator } from "@/lib/experienceCuratorAgent";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  }
};

/**
 * Test endpoint for booking flow - no auth required
 * Use for quick testing of agents without signup
 *
 * Example: GET /api/test-booking
 */
export async function GET() {
  try {
    debugLog("🧪 Starting test booking flow...");

    // Mock user preferences
    const userPreferences = {
      music_style: "EDM",
      maya_interests: ["Ruins", "Cuisine"],
      birthday: "1990-05-14",
      family_friendly: true,
    };

    // Mock booking request
    const bookingRequest = {
      roomType: "Overwater Room",
      checkInDate: "2026-03-01",
      checkOutDate: "2026-03-05",
      location: "Belize",
      groupSize: 2,
      tourBudget: 500,
      interests: ["snorkeling", "dining"],
      activityLevel: "medium" as const,
    };

    const maxIterations = 3;

    debugLog("📍 User Prefs:", userPreferences);
    debugLog("📍 Booking Request:", bookingRequest);

    // Run agents in parallel
    debugLog("\n🤖 Running PriceScoutAgent...");
    const priceScoutResult = await runPriceScout(
      bookingRequest.roomType,
      bookingRequest.checkInDate,
      bookingRequest.checkOutDate,
      bookingRequest.location,
    );
    debugLog("✅ PriceScout Result:", priceScoutResult);

    debugLog("\n🎯 Running ExperienceCuratorAgent...");
    const curatorResult = await runExperienceCurator(
      {
        interests: ["snorkeling", "dining"],
        activityLevel: "medium",
        budget: "mid",
      },
      bookingRequest.groupSize,
      bookingRequest.tourBudget,
    );
    debugLog("✅ Curator Result:", curatorResult);

    // Combine results
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      test_mode: true,
      user_prefs: userPreferences,
      booking_request: bookingRequest,
      price_scout: {
        original_price: priceScoutResult.bestPrice,
        beat_price: priceScoutResult.beatPrice,
        savings_percent: priceScoutResult.savingsPercent,
        savings_amount: priceScoutResult.savings,
        best_ota: priceScoutResult.bestOTA,
        iterations_completed: maxIterations,
      },
      experience: {
        selected_tours: curatorResult.tours.map((t: any) => t.name),
        total_tour_cost: curatorResult.totalPrice,
        recommendations: curatorResult.recommendations,
        affiliate_links: curatorResult.affiliateLinks,
      },
      curated_package: {
        room: {
          type: bookingRequest.roomType,
          price: priceScoutResult.beatPrice,
          ota: "Direct Booking",
          savings_percent: priceScoutResult.savingsPercent,
        },
        tours: curatorResult.tours.map((t: any) => t.name).join(" + "),
        dinner:
          curatorResult.tours.find((t: any) => t.type === "dining")?.name ||
          "Included",
        addons: curatorResult.tours
          .filter((t: any) => t.type !== "snorkeling")
          .map((t: any) => t.name),
        total: priceScoutResult.beatPrice + curatorResult.totalPrice,
        affiliate_links: curatorResult.affiliateLinks,
      },
      summary: {
        message: `✨ Save ${priceScoutResult.savingsPercent}% on your overwater room + ${curatorResult.tours.length} curated experiences!`,
        total_savings: priceScoutResult.savings,
        booking_url: "/booking",
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("❌ Test endpoint error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : ""
            : undefined,
      },
      { status: 500 },
    );
  }
}

/**
 * POST variant - accepts custom preferences
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      roomType = "Overwater Room",
      checkInDate = "2026-03-01",
      checkOutDate = "2026-03-05",
      musicStyle = "EDM",
      interests = ["snorkeling"],
    } = body;

    debugLog("🧪 Custom test booking:", {
      roomType,
      checkInDate,
      checkOutDate,
    });

    const priceScoutResult = await runPriceScout(
      roomType,
      checkInDate,
      checkOutDate,
      "Belize",
    );
    const curatorResult = await runExperienceCurator(
      {
        interests: interests,
        activityLevel: "medium",
        budget: "mid",
      },
      2,
      500,
    );

    return NextResponse.json(
      {
        success: true,
        beat_price: priceScoutResult.beatPrice,
        savings_percent: priceScoutResult.savingsPercent,
        tours: curatorResult.tours.map((t: any) => t.name),
        total: priceScoutResult.beatPrice + curatorResult.totalPrice,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ POST test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error",
      },
      { status: 500 },
    );
  }
}
