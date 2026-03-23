import fetch, { RequestInit } from "node-fetch";
import AbortController from "abort-controller";
/**
 * OTA Integration Module — Real-time prices via SerpAPI Google Hotels
 * Falls back to Tavily text search, then hardcoded prices when APIs are unavailable.
 *
 * Data flow:
 *   1. SerpAPI Google Hotels → structured JSON, same source guests see on Google
 *   2. Tavily web search → text scraping fallback (less reliable)
 *   3. FALLBACK_PRICES → hardcoded estimates (cross-verified March 2026)
 */

export interface OTAPrice {
  ota: string;
  price: number;
  currency: string;
  url: string;
  lastUpdated: Date;
  source: "live" | "fallback";
}

const isProd = process.env.NODE_ENV === "production";
const debugLog = (...args: unknown[]) => {
  if (!isProd) {
    console.log(...args);
  } else {
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      args[0].startsWith("[OTA]")
    ) {
      console.error(...args);
    }
  }
};

const SERPAPI_KEY = process.env.SERPAPI_KEY || "";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

// In-process cache to avoid hitting API repeatedly for the same query
const priceCache = new Map<string, { prices: OTAPrice[]; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Maps Google Hotels / OTA source display names → our internal OTA keys.
 */
const SOURCE_NAME_MAP: Record<string, string> = {
  expedia: "expedia",
  "booking.com": "booking",
  agoda: "agoda",
  "hotels.com": "hotels",
  airbnb: "airbnb",
  hostelworld: "hostelworld",
  tripadvisor: "tripadvisor",
};

function normaliseOTAName(source: string): string | null {
  const lower = source.toLowerCase();
  for (const [key, value] of Object.entries(SOURCE_NAME_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

/**
 * Fetch real-time OTA prices from SerpAPI's Google Hotels endpoint.
 * Returns structured nightly rates for Lina Point from the same data
 * Google shows travellers when they compare prices.
 */
async function searchViaSerp(
  checkInDate: string,
  checkOutDate: string,
): Promise<OTAPrice[]> {
  if (!SERPAPI_KEY) {
    debugLog("[OTA] No SERPAPI_KEY set, skipping SerpAPI");
    return [];
  }

  const params = new URLSearchParams({
    engine: "google_hotels",
    q: "Lina Point Overwater Resort Belize",
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    currency: "USD",
    adults: "2",
    api_key: SERPAPI_KEY,
  });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `https://serpapi.com/search.json?${params.toString()}`,
      { signal: controller.signal } as RequestInit,
    );
    clearTimeout(timeout);

    if (!response.ok) {
      debugLog(`[OTA] SerpAPI returned ${response.status}`);
      return [];
    }

    const data = (await response.json()) as {
      properties?: Array<{
        name: string;
        prices?: Array<{
          source: string;
          link?: string;
          rate_per_night?: { extracted_lowest?: number };
        }>;
      }>;
    };

    // Find the Lina Point property in results
    const property = (data.properties || []).find((p) =>
      p.name.toLowerCase().includes("lina point"),
    );

    if (!property?.prices?.length) {
      debugLog("[OTA] SerpAPI: Lina Point not found in results");
      return [];
    }

    const prices: OTAPrice[] = [];
    for (const entry of property.prices) {
      const otaKey = normaliseOTAName(entry.source);
      if (!otaKey) continue;
      const nightly = entry.rate_per_night?.extracted_lowest;
      if (!nightly || nightly < 50 || nightly > 5000) continue;

      prices.push({
        ota: otaKey,
        price: Math.round(nightly),
        currency: "USD",
        url: entry.link || "",
        lastUpdated: new Date(),
        source: "live",
      });
    }

    debugLog(`[OTA] SerpAPI: found ${prices.length} prices for Lina Point`);
    return prices;
  } catch (err) {
    debugLog(
      "[OTA] SerpAPI request failed:",
      err instanceof Error ? err.message : err,
    );
    if (isProd) {
      console.error(
        "[OTA] SerpAPI failed in production:",
        err instanceof Error ? err.message : err,
      );
    }
    return [];
  }
}

/**
 * Fallback: Tavily web search price extraction.
 * Used when SerpAPI is unavailable. Returns fewer results and less reliably.
 */
async function searchViaTavily(
  checkInDate: string,
  checkOutDate: string,
  location: string,
): Promise<OTAPrice[]> {
  if (!TAVILY_API_KEY) return [];

  const otas = [
    { name: "expedia", domain: "expedia.com" },
    { name: "booking", domain: "booking.com" },
    { name: "agoda", domain: "agoda.com" },
    { name: "hotels", domain: "hotels.com" },
    { name: "airbnb", domain: "airbnb.com" },
    { name: "hostelworld", domain: "hostelworld.com" },
  ];

  const query = `"Lina Point" overwater resort ${location} ${checkInDate} ${checkOutDate} price per night site:expedia.com OR site:booking.com OR site:agoda.com OR site:hotels.com OR site:airbnb.com OR site:hostelworld.com`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "advanced",
        max_results: 10,
        include_answer: true,
      }),
      signal: controller.signal,
    } as RequestInit);
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = (await response.json()) as {
      results?: Array<{ url: string; content: string }>;
    };
    const results = data.results || [];
    const prices: OTAPrice[] = [];

    for (const result of results) {
      const matchedOta = otas.find((o) => result.url.includes(o.domain));
      if (!matchedOta || prices.some((p) => p.ota === matchedOta.name))
        continue;

      const priceMatches = result.content.match(/\$\s?(\d{2,4}(?:\.\d{2})?)/g);
      if (!priceMatches) continue;

      for (const match of priceMatches) {
        const amount = parseFloat(match.replace("$", "").replace(/\s/g, ""));
        if (amount >= 50 && amount <= 2000) {
          prices.push({
            ota: matchedOta.name,
            price: amount,
            currency: "USD",
            url: result.url,
            lastUpdated: new Date(),
            source: "live",
          });
          break;
        }
      }
    }

    debugLog(`[OTA] Tavily: found ${prices.length} prices`);
    return prices;
  } catch {
    return [];
  }
}

/**
 * Primary entry point: fetch OTA prices with SerpAPI → Tavily → fallback chain.
 */
async function searchOTAPrices(
  _roomType: string,
  checkInDate: string,
  checkOutDate: string,
  location: string,
): Promise<OTAPrice[]> {
  // Try SerpAPI first (structured, reliable)
  const serpPrices = await searchViaSerp(checkInDate, checkOutDate);
  if (serpPrices.length >= 2) return serpPrices;

  if (!SERPAPI_KEY) {
    debugLog("[OTA] No SERPAPI_KEY — add SERPAPI_KEY to .env for live prices");
    if (isProd) {
      console.error(
        "[OTA] SERPAPI_KEY not set in production. Live OTA prices unavailable.",
      );
    }
  }

  // Fallback: Tavily text scraping
  const tavilyPrices = await searchViaTavily(
    checkInDate,
    checkOutDate,
    location,
  );
  if (tavilyPrices.length >= 2) return tavilyPrices;

  return [];
}

/**
 * Per-room-type fallback OTA prices for Lina Point Overwater Resort.
 * Cross-verified with Google Hotels / OTA listings — updated March 2026.
 * Used when Tavily live scraping is unavailable or returns insufficient results.
 */
const FALLBACK_PRICES: Record<
  string,
  Array<{ ota: string; price: number; url: string }>
> = {
  suite_2nd_floor: [
    {
      ota: "expedia",
      price: 165,
      url: "https://www.expedia.com/Belize-Hotels",
    },
    {
      ota: "booking",
      price: 175,
      url: "https://www.booking.com/searchresults.html?dest_id=-640082",
    },
    {
      ota: "agoda",
      price: 155,
      url: "https://www.agoda.com/city/san-pedro-bz.html",
    },
    {
      ota: "hotels",
      price: 169,
      url: "https://www.hotels.com/search.do?f-loc-id=800020668",
    },
    {
      ota: "airbnb",
      price: 171,
      url: "https://www.airbnb.com/s/San-Pedro--Belize/homes",
    },
    {
      ota: "hostelworld",
      price: 182,
      url: "https://www.hostelworld.com/search?search_keywords=San+Pedro%2C+Belize",
    },
  ],
  suite_1st_floor: [
    {
      ota: "expedia",
      price: 189,
      url: "https://www.expedia.com/Belize-Hotels",
    },
    {
      ota: "booking",
      price: 199,
      url: "https://www.booking.com/searchresults.html?dest_id=-640082",
    },
    {
      ota: "agoda",
      price: 179,
      url: "https://www.agoda.com/city/san-pedro-bz.html",
    },
    {
      ota: "hotels",
      price: 194,
      url: "https://www.hotels.com/search.do?f-loc-id=800020668",
    },
    {
      ota: "airbnb",
      price: 197,
      url: "https://www.airbnb.com/s/San-Pedro--Belize/homes",
    },
    {
      ota: "hostelworld",
      price: 211,
      url: "https://www.hostelworld.com/search?search_keywords=San+Pedro%2C+Belize",
    },
  ],
  cabana_duplex: [
    {
      ota: "expedia",
      price: 289,
      url: "https://www.expedia.com/Belize-Hotels",
    },
    {
      ota: "booking",
      price: 305,
      url: "https://www.booking.com/searchresults.html?dest_id=-640082",
    },
    {
      ota: "agoda",
      price: 275,
      url: "https://www.agoda.com/city/san-pedro-bz.html",
    },
    {
      ota: "hotels",
      price: 295,
      url: "https://www.hotels.com/search.do?f-loc-id=800020668",
    },
    {
      ota: "airbnb",
      price: 302,
      url: "https://www.airbnb.com/s/San-Pedro--Belize/homes",
    },
    {
      ota: "hostelworld",
      price: 325,
      url: "https://www.hostelworld.com/search?search_keywords=San+Pedro%2C+Belize",
    },
  ],
  cabana_1br: [
    {
      ota: "expedia",
      price: 345,
      url: "https://www.expedia.com/Belize-Hotels",
    },
    {
      ota: "booking",
      price: 365,
      url: "https://www.booking.com/searchresults.html?dest_id=-640082",
    },
    {
      ota: "agoda",
      price: 329,
      url: "https://www.agoda.com/city/san-pedro-bz.html",
    },
    {
      ota: "hotels",
      price: 355,
      url: "https://www.hotels.com/search.do?f-loc-id=800020668",
    },
    {
      ota: "airbnb",
      price: 361,
      url: "https://www.airbnb.com/s/San-Pedro--Belize/homes",
    },
    {
      ota: "hostelworld",
      price: 388,
      url: "https://www.hostelworld.com/search?search_keywords=San+Pedro%2C+Belize",
    },
  ],
  cabana_2br: [
    {
      ota: "expedia",
      price: 459,
      url: "https://www.expedia.com/Belize-Hotels",
    },
    {
      ota: "booking",
      price: 485,
      url: "https://www.booking.com/searchresults.html?dest_id=-640082",
    },
    {
      ota: "agoda",
      price: 435,
      url: "https://www.agoda.com/city/san-pedro-bz.html",
    },
    {
      ota: "hotels",
      price: 469,
      url: "https://www.hotels.com/search.do?f-loc-id=800020668",
    },
    {
      ota: "airbnb",
      price: 478,
      url: "https://www.airbnb.com/s/San-Pedro--Belize/homes",
    },
    {
      ota: "hostelworld",
      price: 514,
      url: "https://www.hostelworld.com/search?search_keywords=San+Pedro%2C+Belize",
    },
  ],
};

/**
 * Returns accurate per-room-type OTA fallback prices for Lina Point.
 * Pass roomType for room-specific prices; omits for the cabana_duplex default.
 */
export function getFallbackPrices(roomType?: string): OTAPrice[] {
  const roomPrices =
    roomType && FALLBACK_PRICES[roomType]
      ? FALLBACK_PRICES[roomType]
      : FALLBACK_PRICES.cabana_duplex; // sensible middle-ground default

  return roomPrices.map(({ ota, price, url }) => ({
    ota,
    price,
    currency: "USD",
    url,
    lastUpdated: new Date(),
    source: "fallback" as const,
  }));
}

/**
 * Fetch competitive prices from OTA sites.
 * Uses Tavily web search with caching; falls back to defaults.
 */
export async function fetchCompetitivePrices(
  roomType: string,
  checkInDate: string,
  checkOutDate: string,
  location: string,
): Promise<OTAPrice[]> {
  const cacheKey = `${roomType}|${checkInDate}|${checkOutDate}|${location}`;
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    debugLog(`[OTA] Returning cached prices (${cached.prices.length} results)`);
    return cached.prices;
  }

  debugLog(`[OTA] Fetching live prices for ${roomType} in ${location}...`);

  const livePrices = await searchOTAPrices(
    roomType,
    checkInDate,
    checkOutDate,
    location,
  );

  if (livePrices.length >= 2) {
    priceCache.set(cacheKey, { prices: livePrices, cachedAt: Date.now() });
    return livePrices;
  }

  // Not enough live results — supplement with fallbacks
  const fallback = getFallbackPrices();
  const combined = [...livePrices];
  for (const fb of fallback) {
    if (!combined.some((p) => p.ota === fb.ota)) {
      combined.push(fb);
    }
  }

  priceCache.set(cacheKey, { prices: combined, cachedAt: Date.now() });
  return combined;
}

/**
 * Get OTA affiliate program URLs
 */
export const OTA_AFFILIATES = {
  expedia: {
    baseUrl: "https://www.expedia.com",
    affiliateId: "lina-point-resort",
    commission: 5,
  },
  booking: {
    baseUrl: "https://www.booking.com",
    affiliateId: "lina-point-resort",
    commission: 5,
  },
  agoda: {
    baseUrl: "https://www.agoda.com",
    affiliateId: "lina-point-resort",
    commission: 5,
  },
  hotels: {
    baseUrl: "https://www.hotels.com",
    affiliateId: "lina-point-resort",
    commission: 3,
  },
  tripadvisor: {
    baseUrl: "https://www.tripadvisor.com",
    affiliateId: "lina-point-resort",
    commission: 4,
  },
};
