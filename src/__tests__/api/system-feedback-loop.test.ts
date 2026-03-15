/**
 * @jest-environment node
 */

/**
 * System feedback-loop API route tests
 * Tests authorization (cron secret + session token)
 */

const mockGetUser = jest.fn();
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest
    .fn()
    .mockResolvedValue({
      data: {
        output: { status: "healthy" },
        created_at: new Date().toISOString(),
      },
      error: null,
    }),
};
// By default, `from()` returns the mock chain, and `select()` for agent stats returns data
mockChain.select.mockReturnValue(mockChain);

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => mockChain,
    auth: {
      getUser: (token: string) => mockGetUser(token),
    },
  }),
}));

import { GET } from "@/app/api/system/feedback-loop/route";
import { NextRequest } from "next/server";

const CRON_SECRET = "test-cron-secret";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/system/feedback-loop", {
    method: "GET",
    headers,
  });
}

describe("GET /api/system/feedback-loop", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    // Reset mock chain
    mockChain.select.mockReturnValue(mockChain);
    mockChain.eq.mockReturnValue(mockChain);
    mockChain.gte.mockReturnValue(mockChain);
    mockChain.order.mockReturnValue(mockChain);
    mockChain.limit.mockReturnValue(mockChain);
    mockChain.single.mockResolvedValue({
      data: { output: { status: "healthy" } },
      error: null,
    });
    // For the second from() call that's not chained with .single()
    mockChain.gte.mockResolvedValue({ data: [], error: null });
  });

  it("returns 401 without auth", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("allows access with cron secret", async () => {
    const res = await GET(
      makeRequest({ authorization: `Bearer ${CRON_SECRET}` }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("allows access with valid user token", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const res = await GET(
      makeRequest({ authorization: "Bearer valid-jwt-token" }),
    );
    expect(res.status).toBe(200);
  });
});
