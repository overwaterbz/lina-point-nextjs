/**
 * @jest-environment node
 */

/**
 * Tests for /api/cron/run-daily-marketing
 * Covers: auth check, campaign processing, blog revalidation
 */

// Mock all dependencies before imports
const mockVerifyCronSecret = jest.fn();
jest.mock("@/lib/cronAuth", () => ({
  verifyCronSecret: (...args: any[]) => mockVerifyCronSecret(...args),
}));

const mockRunMarketingCrew = jest.fn();
jest.mock("@/lib/agents/marketingAgentCrew", () => ({
  runMarketingCrew: (...args: any[]) => mockRunMarketingCrew(...args),
}));

const mockRevalidatePath = jest.fn();
jest.mock("next/cache", () => ({
  revalidatePath: (...args: any[]) => mockRevalidatePath(...args),
}));

const mockFrom = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET } from "@/app/api/cron/run-daily-marketing/route";
import { NextRequest } from "next/server";

function createCronRequest(secret?: string): NextRequest {
  const headers = new Headers();
  if (secret) headers.set("authorization", `Bearer ${secret}`);
  return new NextRequest(
    new URL("http://localhost:3000/api/cron/run-daily-marketing"),
    {
      method: "GET",
      headers,
    },
  );
}

describe("GET /api/cron/run-daily-marketing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyCronSecret.mockReturnValue(null); // authorized by default
  });

  it("should reject requests without valid cron secret", async () => {
    const mockDenied = {
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    };
    mockVerifyCronSecret.mockReturnValue(mockDenied);

    const response = await GET(createCronRequest());
    expect(response.status).toBe(401);
  });

  it("should return success with 0 campaigns when none are scheduled", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        gte: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockRunMarketingCrew.mockResolvedValue({
      researchData: {},
      generatedContent: [],
      scheduleStatus: [],
      engagementCampaigns: [],
      currentMetrics: {},
      mlInsights: {},
      promptUpdates: [],
    });

    const response = await GET(createCronRequest("test-cron-secret-value"));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("should process scheduled campaigns and call runMarketingCrew", async () => {
    const mockCampaign = {
      id: "campaign-1",
      objective: "Promote summer rates",
      target_audience: "families",
      key_messages: ["Book direct"],
      platforms: ["instagram"],
      created_at: new Date().toISOString(),
    };

    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest
            .fn()
            .mockResolvedValue({ data: [mockCampaign], error: null }),
        }),
        gte: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    mockRunMarketingCrew.mockResolvedValue({
      researchData: {},
      generatedContent: [{ type: "social_post" }],
      scheduleStatus: [{ status: "posted" }],
      engagementCampaigns: [],
      currentMetrics: {},
      mlInsights: {},
      promptUpdates: [],
    });

    const response = await GET(createCronRequest("test-cron-secret-value"));
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    // Called once for the DB campaign + once for auto brand campaign
    expect(mockRunMarketingCrew).toHaveBeenCalledTimes(2);
  });

  it("should call revalidatePath for /blog after processing", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
        gte: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    });
    mockRunMarketingCrew.mockResolvedValue({
      researchData: {},
      generatedContent: [],
      scheduleStatus: [],
      engagementCampaigns: [],
      currentMetrics: {},
      mlInsights: {},
      promptUpdates: [],
    });

    await GET(createCronRequest("test-cron-secret-value"));
    expect(mockRevalidatePath).toHaveBeenCalledWith("/blog");
  });

  it("should return 500 when campaign fetch fails", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest
            .fn()
            .mockResolvedValue({ data: null, error: { message: "DB error" } }),
        }),
      }),
    });

    const response = await GET(createCronRequest("test-cron-secret-value"));
    expect(response.status).toBe(500);
  });
});
