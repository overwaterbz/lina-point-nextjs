import fetch, { RequestInit, Response } from "node-fetch";
import AbortController from "abort-controller";
/**
 * OTA Integration Module — Real price scraping via Tavily Search API
 * Falls back to cached/default prices when API is unavailable
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
    // In production, escalate to error log for critical OTA issues
    if (
      args.length > 0 &&
      typeof args[0] === "string" &&
      args[0].startsWith("[OTA]")
    ) {
      console.error(...args);
    }
  }
};

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";

// Cache to avoid hitting API repeatedly for the same query
const priceCache = new Map<string, { prices: OTAPrice[]; cachedAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Search OTA sites for real hotel prices using Tavily web search.
 * Tavily returns structured results from live web pages.
 */
async function searchOTAPrices(
  roomType: string,
  checkInDate: string,
  checkOutDate: string,
  location: string,
): Promise<OTAPrice[]> {
  if (!TAVILY_API_KEY) {
    debugLog("[OTA] No TAVILY_API_KEY set, using fallback prices");
    if (isProd) {
      console.error(
        "[OTA] No TAVILY_API_KEY set in production environment! OTA price comparison will not work.",
      );
    }
    return [];
  }

  const otas = [
    { name: "expedia", domain: "expedia.com" },
    { name: "booking", domain: "booking.com" },
    { name: "agoda", domain: "agoda.com" },
  ];

  const prices: OTAPrice[] = [];

  // Single broad search to find prices across all OTAs
  const query = `${roomType} hotel ${location} price per night ${checkInDate} to ${checkOutDate} site:expedia.com OR site:booking.com OR site:agoda.com`;

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

    if (!response.ok) {
      debugLog(`[OTA] Tavily API returned ${response.status}`);
      if (isProd) {
        console.error(
          `[OTA] Tavily API returned status ${response.status} in production.`,
        );
      }
      return [];
    }

    const data = (await response.json()) as {
      results?: Array<{ url: string; content: string; title: string }>;
    };
    const results: Array<{ url: string; content: string; title: string }> =
      data.results || [];

    for (const result of results) {
      // Extract price from result content — look for dollar amounts
      const priceMatches = result.content.match(/\$\s?(\d{2,4}(?:\.\d{2})?)/g);
      if (!priceMatches || priceMatches.length === 0) continue;

      // Find which OTA this result belongs to
      const matchedOta = otas.find((ota) => result.url.includes(ota.domain));
      if (!matchedOta) continue;

      // Already have a price for this OTA? Skip duplicates
      if (prices.some((p) => p.ota === matchedOta.name)) continue;

      // Parse the first reasonable nightly price ($50–$2000 range)
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

    // Also try to extract from Tavily's AI answer
    if (data.answer && prices.length < 3) {
      const answerPrices = data.answer.match(/\$(\d{2,4}(?:\.\d{2})?)/g);
      if (answerPrices) {
        debugLog(`[OTA] Found ${answerPrices.length} prices in Tavily answer`);
      }
    }

    debugLog(`[OTA] Found ${prices.length} live OTA prices`);
  } catch (error) {
    debugLog(
      "[OTA] Tavily search failed:",
      error instanceof Error ? error.message : error,
    );
    if (isProd) {
      console.error(
        "[OTA] Tavily search failed in production:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return prices;
}

/**
 * Default prices used when live search is unavailable.
 * Based on typical San Pedro, Belize overwater resort rates.
 */
function getFallbackPrices(): OTAPrice[] {
  return [
    {
      ota: "expedia",
      price: 450,
      currency: "USD",
      url: "https://www.expedia.com/Belize-Hotels",
      lastUpdated: new Date(),
      source: "fallback",
    },
    {
      ota: "booking",
      price: 435,
      currency: "USD",
      url: "https://www.booking.com/region/bz/ambergris-caye.html",
      lastUpdated: new Date(),
      source: "fallback",
    },
    {
      ota: "agoda",
      price: 455,
      currency: "USD",
      url: "https://www.agoda.com/city/san-pedro-bz.html",
      lastUpdated: new Date(),
      source: "fallback",
    },
  ];
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
