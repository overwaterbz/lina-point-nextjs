export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, rateLimitKey } from "@/lib/rateLimit";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Static mid-tier fallback prices when Tavily hasn't run yet
const FALLBACK_PRICES: Record<string, number> = {
  "half-day-snorkeling": 95,
  "guided-sport-fishing": 350,
  "mainland-jungle-ruins": 120,
  "cenote-swimming": 130,
  "mangrove-kayaking": 85,
  "scuba-blue-hole": 280,
  "island-hopping": 95,
};

// Name→slug mapping for matching by name when tourId is unknown
const NAME_TO_SLUG: Record<string, string> = {
  "Half-Day Snorkeling & Coral Reef": "half-day-snorkeling",
  "Guided Sport Fishing Adventure": "guided-sport-fishing",
  "Mainland Jungle & Mayan Ruins": "mainland-jungle-ruins",
  "Cenote Swimming & Cave Exploration": "cenote-swimming",
  "Mangrove Kayaking & Wildlife": "mangrove-kayaking",
  "Scuba Diving — Blue Hole Day Trip": "scuba-blue-hole",
  "Island Hopping & Beach Picnic": "island-hopping",
};

const PLATFORM_DISPLAY: Record<string, { label: string; url: string }> = {
  viator: { label: "Viator", url: "https://viator.com" },
  getyourguide: { label: "GetYourGuide", url: "https://getyourguide.com" },
  tripadvisor: { label: "TripAdvisor", url: "https://tripadvisor.com" },
};

export async function GET(request: NextRequest) {
  const limited = checkRateLimit(rateLimitKey(request), 20);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const tourId = searchParams.get("tourId");
  const tourSlug = searchParams.get("slug");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Build base query — join tour_ota_prices with tours
    let toursQuery = supabase
      .from("tours")
      .select("id, name, slug, active")
      .eq("active", true);

    if (tourId) {
      toursQuery = toursQuery.eq("id", tourId);
    } else if (tourSlug) {
      toursQuery = toursQuery.eq("slug", tourSlug);
    }

    const { data: tours, error: toursErr } = await toursQuery;

    if (toursErr) {
      console.error("[TourOTAPrices] tours query error:", toursErr);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!tours || tours.length === 0) {
      // No tours in DB yet — return full fallback set
      const fallback = buildFallbackResponse();
      return NextResponse.json(fallback, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // Fetch OTA prices for these tours
    const tourIds = tours.map((t) => t.id);
    const { data: otaRows } = await supabase
      .from("tour_ota_prices")
      .select(
        "tour_id, platform, ota_name, ota_url, ota_price, ota_rating, our_price, scraped_at",
      )
      .in("tour_id", tourIds)
      .order("scraped_at", { ascending: false });

    // Group by tour_id
    const pricesByTour: Record<string, typeof otaRows> = {};
    for (const row of otaRows ?? []) {
      if (!pricesByTour[row.tour_id]) pricesByTour[row.tour_id] = [];
      pricesByTour[row.tour_id]!.push(row);
    }

    const results = tours.map((tour) => {
      const rows = pricesByTour[tour.id] ?? [];
      const slug = tour.slug ?? NAME_TO_SLUG[tour.name] ?? "";
      const fallbackPrice = FALLBACK_PRICES[slug] ?? 99;

      if (rows.length === 0) {
        return buildTourFallback(tour.id, tour.name, slug, fallbackPrice);
      }

      const platforms = rows.map((r) => ({
        platform: r.platform,
        label: PLATFORM_DISPLAY[r.platform]?.label ?? r.platform,
        otaName: r.ota_name,
        otaUrl: r.ota_url ?? PLATFORM_DISPLAY[r.platform]?.url ?? "#",
        otaPrice: Number(r.ota_price),
        otaRating: r.ota_rating ? Number(r.ota_rating) : null,
        ourPrice: Number(r.our_price),
        source: "live" as const,
      }));

      const lowestOtaPrice = Math.min(...platforms.map((p) => p.otaPrice));
      const ourBestPrice = Math.min(...platforms.map((p) => p.ourPrice));
      const savings = Math.round((lowestOtaPrice - ourBestPrice) * 100) / 100;
      const savingsPercent =
        lowestOtaPrice > 0
          ? Math.round((savings / lowestOtaPrice) * 100 * 10) / 10
          : 6;

      return {
        tourId: tour.id,
        tourName: tour.name,
        slug,
        platforms,
        lowestOtaPrice,
        ourBestPrice,
        savings,
        savingsPercent,
        lastUpdated: rows[0]?.scraped_at ?? null,
        source: "live" as const,
      };
    });

    // If single tour requested, unwrap from array
    const payload = tourId || tourSlug ? (results[0] ?? null) : results;

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[TourOTAPrices] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildTourFallback(
  tourId: string,
  tourName: string,
  slug: string,
  fallbackPrice: number,
) {
  // Fallback: show estimated OTA prices slightly above our price (reverse: ourPrice / 0.94)
  const estimatedOtaPrice = Math.round((fallbackPrice / 0.94) * 100) / 100;
  const savings = Math.round((estimatedOtaPrice - fallbackPrice) * 100) / 100;

  return {
    tourId,
    tourName,
    slug,
    platforms: [
      {
        platform: "viator",
        label: "Viator",
        otaName: `${tourName} — Viator`,
        otaUrl: `https://www.viator.com/searchResults/all?text=${encodeURIComponent(tourName + " belize")}`,
        otaPrice: estimatedOtaPrice,
        otaRating: 4.5,
        ourPrice: fallbackPrice,
        source: "fallback" as const,
      },
      {
        platform: "getyourguide",
        label: "GetYourGuide",
        otaName: `${tourName} — GetYourGuide`,
        otaUrl: `https://www.getyourguide.com/s/?q=${encodeURIComponent(tourName + " belize")}`,
        otaPrice: Math.round(estimatedOtaPrice * 1.03 * 100) / 100,
        otaRating: 4.4,
        ourPrice: fallbackPrice,
        source: "fallback" as const,
      },
    ],
    lowestOtaPrice: estimatedOtaPrice,
    ourBestPrice: fallbackPrice,
    savings,
    savingsPercent: 6,
    lastUpdated: null,
    source: "fallback" as const,
  };
}

function buildFallbackResponse() {
  const tours = [
    {
      id: "snorkeling",
      name: "Half-Day Snorkeling & Coral Reef",
      slug: "half-day-snorkeling",
    },
    {
      id: "fishing",
      name: "Guided Sport Fishing Adventure",
      slug: "guided-sport-fishing",
    },
    {
      id: "mainland",
      name: "Mainland Jungle & Mayan Ruins",
      slug: "mainland-jungle-ruins",
    },
    {
      id: "cenote",
      name: "Cenote Swimming & Cave Exploration",
      slug: "cenote-swimming",
    },
    {
      id: "kayaking",
      name: "Mangrove Kayaking & Wildlife",
      slug: "mangrove-kayaking",
    },
    {
      id: "diving",
      name: "Scuba Diving — Blue Hole Day Trip",
      slug: "scuba-blue-hole",
    },
    {
      id: "island",
      name: "Island Hopping & Beach Picnic",
      slug: "island-hopping",
    },
  ];

  return tours.map((t) => {
    const fp = FALLBACK_PRICES[t.slug] ?? 99;
    return buildTourFallback(t.id, t.name, t.slug, fp);
  });
}
