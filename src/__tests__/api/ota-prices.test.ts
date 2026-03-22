/**
 * @jest-environment node
 */

import { GET } from "@/app/api/ota-prices/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

// Mock rate limiting
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue(null),
  rateLimitKey: jest.fn().mockReturnValue("test-key"),
}));

// Mock Supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockLimit = jest.fn();
const mockGte = jest.fn();
const mockOrder = jest.fn();
const mockInsert = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "rooms") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => Promise.resolve({ data: [{ base_rate_usd: 199 }] }),
            }),
          }),
        };
      }
      if (table === "ota_price_cache") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    order: () =>
                      Promise.resolve({
                        data: [
                          {
                            ota_name: "Booking.com",
                            price: 250,
                            currency: "USD",
                            source_url: "",
                            source: "live",
                            fetched_at: new Date().toISOString(),
                          },
                          {
                            ota_name: "Expedia",
                            price: 240,
                            currency: "USD",
                            source_url: "",
                            source: "live",
                            fetched_at: new Date().toISOString(),
                          },
                        ],
                      }),
                  }),
                }),
              }),
            }),
          }),
          insert: () => Promise.resolve({}),
        };
      }
      return { select: jest.fn() };
    },
  }),
}));

// Mock OTA integration
jest.mock("@/lib/otaIntegration", () => ({
  fetchCompetitivePrices: jest.fn().mockResolvedValue([]),
  getFallbackPrices: jest.fn().mockReturnValue([
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
  ]),
}));

describe("GET /api/ota-prices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns prices with valid params", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/ota-prices?roomType=suite_1st_floor&checkIn=2026-04-01&checkOut=2026-04-05",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("otaPrices");
    expect(data).toHaveProperty("ourDirectPrice");
    expect(data).toHaveProperty("savingsPercent");
  });

  it("requires all three params", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/ota-prices?roomType=suite_1st_floor",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid room type", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/ota-prices?roomType=invalid&checkIn=2026-04-01&checkOut=2026-04-05",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/room type/i);
  });

  it("rejects invalid date range", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/ota-prices?roomType=suite_1st_floor&checkIn=2026-04-05&checkOut=2026-04-01",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
