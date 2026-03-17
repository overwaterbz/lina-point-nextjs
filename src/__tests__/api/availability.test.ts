/**
 * @jest-environment node
 */

import { GET } from "@/app/api/availability/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

// Mock rate limiting
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockReturnValue(null),
  rateLimitKey: jest.fn().mockReturnValue("test-key"),
}));

// Mock inventory
jest.mock("@/lib/inventory", () => ({
  checkAvailability: jest.fn().mockResolvedValue([
    { roomType: "suite_1st_floor", available: 2, baseRate: 199 },
    { roomType: "cabana_1br", available: 1, baseRate: 349 },
  ]),
}));

// Mock dynamic pricing
jest.mock("@/lib/dynamicPricing", () => ({
  calculateDynamicPrice: jest.fn().mockResolvedValue({
    finalRate: 189,
    totalForStay: 756,
    appliedRules: ["early_bird"],
    savingsVsBase: 10,
  }),
}));

// Mock Supabase
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({}),
}));

describe("GET /api/availability", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns availability with valid dates", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/availability?checkIn=2026-04-01&checkOut=2026-04-05",
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.availability)).toBe(true);
    expect(data.availability.length).toBe(2);
  });

  it("requires checkIn and checkOut params", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/availability",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/checkIn/i);
  });

  it("rejects invalid date format", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/availability?checkIn=not-a-date&checkOut=2026-04-05",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("rejects checkOut before checkIn", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/availability?checkIn=2026-04-05&checkOut=2026-04-01",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/after/i);
  });

  it("rejects same checkIn and checkOut", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/availability?checkIn=2026-04-01&checkOut=2026-04-01",
    });

    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
