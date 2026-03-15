/**
 * @jest-environment node
 */

/**
 * Pricing API route tests
 * Tests param validation and dynamic pricing
 */

jest.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/lib/dynamicPricing", () => ({
  calculateDynamicPrice: jest.fn().mockResolvedValue({
    finalRate: 275,
    totalForStay: 1100,
    appliedRules: ["seasonal_high"],
    savingsVsBase: 0,
  }),
}));

jest.mock("@/lib/inventory", () => ({
  resolveRoomType: jest.fn((input: string) => input),
}));

import { GET } from "@/app/api/pricing/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

describe("GET /api/pricing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when checkIn is missing", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkOut=2026-04-05&roomType=suite",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkOut is missing", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkIn=2026-04-01&roomType=suite",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when roomType is missing", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkIn=2026-04-01&checkOut=2026-04-05",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid dates", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkIn=not-a-date&checkOut=2026-04-05&roomType=suite",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when checkOut is before checkIn", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkIn=2026-04-05&checkOut=2026-04-01&roomType=suite",
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns pricing for valid request", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/pricing?checkIn=2026-04-01&checkOut=2026-04-05&roomType=suite_1st_floor",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pricing).toBeDefined();
    expect(data.pricing.finalRate).toBe(275);
  });
});
