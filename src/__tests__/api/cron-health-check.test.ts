/**
 * @jest-environment node
 */

/**
 * Cron health-check API route tests
 * Tests cron secret verification
 */

const mockRunHealthCheck = jest.fn().mockResolvedValue({
  overallStatus: "healthy",
  endpointChecks: [
    { endpoint: "/api/availability", status: "healthy" },
    { endpoint: "/api/pricing", status: "healthy" },
  ],
  recentFailures: [],
  autoFixesApplied: [],
  errorPatterns: [],
  recommendations: [],
  nextCheckIn: "6h",
});

jest.mock("@/lib/agents/healthMonitorAgent", () => ({
  runHealthCheck: () => mockRunHealthCheck(),
}));

jest.mock("@/lib/cronAuth", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextResponse } = require("next/server");
  return {
    verifyCronSecret: (auth: string | null) => {
      const secret = process.env.CRON_SECRET;
      if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return null;
    },
  };
});

import { GET } from "@/app/api/cron/health-check/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

const CRON_SECRET = "test-cron-secret";

describe("GET /api/cron/health-check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without cron secret", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/cron/health-check",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("runs health check with valid secret", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/cron/health-check",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.status).toBe("healthy");
    expect(data.summary.endpoints).toBe(2);
  });

  it("returns 500 when health check throws", async () => {
    mockRunHealthCheck.mockRejectedValueOnce(new Error("Agent error"));
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/cron/health-check",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
