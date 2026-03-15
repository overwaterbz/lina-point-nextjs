/**
 * @jest-environment node
 */

/**
 * Admin promos API route tests
 * Tests authorization and promo listing
 */

const mockSelect = jest.fn().mockReturnThis();
const mockOrder = jest
  .fn()
  .mockResolvedValue({ data: [{ id: 1, code: "SUMMER25" }], error: null });
const mockGetUser = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({ select: mockSelect, order: mockOrder }),
  }),
}));

jest.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

jest.mock("@/lib/admin", () => ({
  isAdminEmail: (email: string) => email === "admin@linapoint.com",
}));

import { GET } from "@/app/api/admin/promos/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

const CRON_SECRET = "test-cron-secret";

describe("GET /api/admin/promos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CRON_SECRET = CRON_SECRET;
    mockSelect.mockReturnValue({ order: mockOrder });
    mockOrder.mockResolvedValue({
      data: [{ id: 1, code: "SUMMER25" }],
      error: null,
    });
  });

  it("returns 401 without auth", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/promos",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("allows access with cron secret", async () => {
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/promos",
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("promos");
  });

  it("allows admin user access", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { email: "admin@linapoint.com" } },
    });
    const req = createMockRequest({
      method: "GET",
      url: "http://localhost:3000/api/admin/promos",
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
