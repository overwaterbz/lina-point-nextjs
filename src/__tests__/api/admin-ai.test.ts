/**
 * @jest-environment node
 */

/**
 * Admin AI prompt management API route tests
 * Tests authorization (cron secret + admin session)
 */

const mockGetPendingPrompts = jest.fn().mockResolvedValue([]);
const mockGetPromptHistory = jest.fn().mockResolvedValue([]);
const mockApprovePrompt = jest.fn().mockResolvedValue({ success: true });
const mockRejectPrompt = jest.fn().mockResolvedValue({ success: true });
const mockGetUser = jest.fn();

jest.mock("@/lib/agents/promptManager", () => ({
  getPendingPrompts: () => mockGetPendingPrompts(),
  getPromptHistory: () => mockGetPromptHistory(),
  approvePrompt: (...args: unknown[]) => mockApprovePrompt(...args),
  rejectPrompt: (...args: unknown[]) => mockRejectPrompt(...args),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

jest.mock("@/lib/admin", () => ({
  isAdminEmail: (email: string) => email === "admin@linapoint.com",
}));

import { GET } from "@/app/api/admin/ai/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

const CRON_SECRET = "test-cron-secret";

describe("GET /api/admin/ai", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/ai",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows access with cron secret", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/ai",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("pending");
    expect(data).toHaveProperty("history");
  });

  it("allows access for admin user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "admin@linapoint.com" } },
    });
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/ai",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it("rejects non-admin users", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "guest@example.com" } },
    });
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/ai",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
