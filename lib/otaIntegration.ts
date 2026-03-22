// Web Scraping and OTA Integration Utilities
import axios from "axios";

interface OTAPriceResult {
  ota: string;
  roomType: string;
  price: number;
  originalPrice?: number;
  url: string;
  rating?: number;
  availability: boolean;
  fetchedAt: string;
}

/**
 * Simulate fetching prices from Agoda using web scraping
 * In production, integrate real API endpoints
 */
export async function fetchAgodaPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string,
): Promise<OTAPriceResult | null> {
  try {
    console.log(`🔍 Fetching Agoda price for ${roomType} in ${location}...`);

    // Simulated price lookup based on room type and dates
    const basePrice = getPriceByRoomType(roomType);
    const seasonalMultiplier = getSeasonalMultiplier(checkIn);
    const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

    // Add slight variation
    const variation = Math.random() * 20 - 10;
    const finalPrice = Math.max(price + variation, basePrice * 0.8);

    return {
      ota: "Agoda",
      roomType,
      price: Math.round(finalPrice * 100) / 100,
      url: `https://www.agoda.com/search?ss=${encodeURIComponent(location)}&checkin=${checkIn}&checkout=${checkOut}`,
      rating: 4.5,
      availability: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Agoda fetch error:", error);
    return null;
  }
}

/**
 * Simulate fetching prices from Expedia
 */
export async function fetchExpediaPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string,
): Promise<OTAPriceResult | null> {
  try {
    console.log(`🔍 Fetching Expedia price for ${roomType} in ${location}...`);

    const basePrice = getPriceByRoomType(roomType);
    const seasonalMultiplier = getSeasonalMultiplier(checkIn);
    const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

    // Expedia typically has competitive prices
    const variation = Math.random() * 25 - 12;
    const finalPrice = Math.max(price + variation, basePrice * 0.75);

    return {
      ota: "Expedia",
      roomType,
      price: Math.round(finalPrice * 100) / 100,
      url: `https://www.expedia.com/search?location=${encodeURIComponent(location)}&checkInDate=${checkIn}&checkOutDate=${checkOut}`,
      rating: 4.3,
      availability: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Expedia fetch error:", error);
    return null;
  }
}

/**
 * Simulate fetching prices from Booking.com
 */
export async function fetchBookingPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string,
): Promise<OTAPriceResult | null> {
  try {
    console.log(
      `🔍 Fetching Booking.com price for ${roomType} in ${location}...`,
    );

    const basePrice = getPriceByRoomType(roomType);
    const seasonalMultiplier = getSeasonalMultiplier(checkIn);
    const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

    // Booking.com often has mid-range pricing
    const variation = Math.random() * 15 - 7;
    const finalPrice = Math.max(price + variation, basePrice * 0.85);

    return {
      ota: "Booking.com",
      roomType,
      price: Math.round(finalPrice * 100) / 100,
      url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(location)}&checkin=${checkIn}&checkout=${checkOut}`,
      rating: 4.4,
      availability: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Booking fetch error:", error);
    return null;
  }
}

/**
 * Helper: Get base price by room type
 */
function getPriceByRoomType(roomType: string): number {
  const normalizedType = roomType.toLowerCase();

  const priceMap: Record<string, number> = {
    studio: 80,
    "standard room": 120,
    "deluxe room": 180,
    "overwater room": 250,
    "overwater bungalow": 280,
    "beachfront suite": 320,
    "luxury villa": 500,
    "penthouse suite": 600,
  };

  for (const [key, price] of Object.entries(priceMap)) {
    if (normalizedType.includes(key)) {
      return price;
    }
  }

  return 200; // Default price
}

/**
 * Helper: Apply seasonal multiplier based on date
 */
function getSeasonalMultiplier(checkInDate: string): number {
  try {
    const date = new Date(checkInDate);
    const month = date.getMonth() + 1;

    // Peak season (Dec-Mar): 1.3x
    if (month >= 12 || month <= 3) return 1.3;
    // High season (Apr, Nov): 1.15x
    if (month === 4 || month === 11) return 1.15;
    // Low season (Aug-Sep): 0.85x
    if (month === 8 || month === 9) return 0.85;
    // Regular season: 1.0x
    return 1.0;
  } catch {
    return 1.0;
  }
}

/**
 * Fetch prices from Hotels.com
 */
export async function fetchHotelsComPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string,
): Promise<OTAPriceResult | null> {
  try {
    console.log(
      `🔍 Fetching Hotels.com price for ${roomType} in ${location}...`,
    );

    const basePrice = getPriceByRoomType(roomType);
    const seasonalMultiplier = getSeasonalMultiplier(checkIn);
    const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

    // Hotels.com typically offers competitive rates
    const variation = Math.random() * 22 - 11;
    const finalPrice = Math.max(price + variation, basePrice * 0.8);

    return {
      ota: "Hotels.com",
      roomType,
      price: Math.round(finalPrice * 100) / 100,
      url: `https://www.hotels.com/search?q=${encodeURIComponent(location)}&checkIn=${checkIn}&checkOut=${checkOut}`,
      rating: 4.3,
      availability: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Hotels.com fetch error:", error);
    return null;
  }
}

/**
 * Fetch prices from Kayak (meta-search)
 */
export async function fetchKayakPrice(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string,
): Promise<OTAPriceResult | null> {
  try {
    console.log(`🔍 Fetching Kayak price for ${roomType} in ${location}...`);

    const basePrice = getPriceByRoomType(roomType);
    const seasonalMultiplier = getSeasonalMultiplier(checkIn);
    const price = Math.round(basePrice * seasonalMultiplier * 100) / 100;

    // Kayak aggregates, so pricing is usually middle-range
    const variation = Math.random() * 18 - 9;
    const finalPrice = Math.max(price + variation, basePrice * 0.82);

    return {
      ota: "Kayak",
      roomType,
      price: Math.round(finalPrice * 100) / 100,
      url: `https://www.kayak.com/hotels/${encodeURIComponent(location)}/${checkIn}/${checkOut}`,
      rating: 4.1,
      availability: true,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Kayak fetch error:", error);
    return null;
  }
}

/**
 * Fetch prices from multiple OTAs in parallel
 */
export async function fetchCompetitivePrices(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string = "Belize",
): Promise<OTAPriceResult[]> {
  console.log("💰 Fetching competitive prices from all OTAs...");

  const results = await Promise.all([
    fetchAgodaPrice(roomType, checkIn, checkOut, location),
    fetchExpediaPrice(roomType, checkIn, checkOut, location),
    fetchBookingPrice(roomType, checkIn, checkOut, location),
    fetchHotelsComPrice(roomType, checkIn, checkOut, location),
    fetchKayakPrice(roomType, checkIn, checkOut, location),
  ]);

  const validResults = results.filter((r) => r !== null) as OTAPriceResult[];

  console.log(`✅ Found ${validResults.length} competitive prices`);
  validResults.forEach((r) => {
    console.log(`  ${r.ota}: $${r.price}`);
  });

  return validResults;
}

/**
 * Calculate beat price with dynamic percentage
 */
export function calculateBeatPrice(
  prices: OTAPriceResult[],
  beatPercentage: number = 3,
): { beatPrice: number; originalPrice: number; savingsPercent: number } {
  if (prices.length === 0) {
    return { beatPrice: 0, originalPrice: 0, savingsPercent: 0 };
  }

  const originalPrice = Math.min(...prices.map((p) => p.price)) + 50; // Assume we have some markup
  const roundedPrice = Math.ceil(originalPrice * 100) / 100;

  // Beat by specified percentage
  const beatPrice =
    Math.round(((roundedPrice * (100 - beatPercentage)) / 100) * 100) / 100;

  return {
    beatPrice,
    originalPrice: roundedPrice,
    savingsPercent: beatPercentage,
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Generate booking URL for direct booking
 */
export function generateBookingUrl(
  roomType: string,
  checkIn: string,
  checkOut: string,
  location: string = "Belize",
): string {
  return `https://direct-booking.example.com/book?room=${encodeURIComponent(roomType)}&checkin=${checkIn}&checkout=${checkOut}&location=${encodeURIComponent(location)}`;
}

/**
 * Return static fallback OTA prices used when Tavily API key is unavailable.
 */
export function getFallbackPrices(): Array<{
  ota: string;
  price: number;
  currency: string;
  url: string;
  source: string;
}> {
  return [
    {
      ota: "Booking.com",
      price: 249,
      currency: "USD",
      url: "https://www.booking.com",
      source: "fallback",
    },
    {
      ota: "Expedia",
      price: 259,
      currency: "USD",
      url: "https://www.expedia.com",
      source: "fallback",
    },
    {
      ota: "Agoda",
      price: 239,
      currency: "USD",
      url: "https://www.agoda.com",
      source: "fallback",
    },
    {
      ota: "Hotels.com",
      price: 255,
      currency: "USD",
      url: "https://www.hotels.com",
      source: "fallback",
    },
  ];
}
