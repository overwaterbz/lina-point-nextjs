import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeAllTourPrices } from "@/lib/tourScoutAgent";
import { verifyCronSecret } from "@/lib/cronAuth";

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) console.log(...args);
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/tour-prices
 *
 * Daily tour price scraping: fetches prices from Viator, GetYourGuide,
 * TripAdvisor for all active tours and stores in tour_ota_prices.
 * Our prices are set to beat the cheapest platform by 6%.
 */
export async function GET(request: NextRequest) {
  const denied = verifyCronSecret(request.headers.get("authorization"));
  if (denied) return denied;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get all active tours
  const { data: tours, error: toursErr } = await supabase
    .from("tours")
    .select("id, name, location")
    .eq("active", true);

  if (toursErr || !tours?.length) {
    return NextResponse.json({
      ok: true,
      message: "No active tours to scrape",
    });
  }

  // Scrape all tour prices
  const priceMap = await scrapeAllTourPrices(tours);

  let totalStored = 0;
  let toursWithPrices = 0;

  for (const [tourId, prices] of priceMap) {
    if (prices.length === 0) continue;
    toursWithPrices++;

    for (const p of prices) {
      const { error } = await supabase.from("tour_ota_prices").upsert(
        {
          tour_id: tourId,
          platform: p.platform,
          ota_name: p.otaName,
          ota_url: p.otaUrl,
          ota_price: p.otaPrice,
          ota_rating: p.otaRating,
          our_price: p.ourPrice,
          scraped_at: new Date().toISOString(),
        },
        { onConflict: "tour_id,platform" },
      );

      if (!error) totalStored++;
    }
  }

  debugLog(
    `[TourPrices] Scraped ${tours.length} tours, ${toursWithPrices} with prices, ${totalStored} rows stored`,
  );

  return NextResponse.json({
    ok: true,
    toursScraped: tours.length,
    toursWithPrices,
    pricesStored: totalStored,
  });
}
