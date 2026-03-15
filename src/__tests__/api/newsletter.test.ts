/**
 * @jest-environment node
 */

import { POST } from "@/app/api/newsletter/route";
import { createMockRequest } from "@/__tests__/utils/test-helpers";

// Mock Supabase
const mockUpsert = jest.fn();
jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      upsert: mockUpsert,
    }),
  }),
}));

describe("POST /api/newsletter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
  });

  it("subscribes a valid email", async () => {
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "Test@Example.com", source: "website" },
      headers: { "x-forwarded-for": "10.0.0.1" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(mockUpsert).toHaveBeenCalledWith(
      { email: "test@example.com", source: "website", status: "active" },
      { onConflict: "email" },
    );
  });

  it("rejects invalid email", async () => {
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "not-an-email" },
      headers: { "x-forwarded-for": "10.0.0.2" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("rejects empty email", async () => {
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "" },
      headers: { "x-forwarded-for": "10.0.0.3" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("truncates source to 100 chars", async () => {
    const longSource = "x".repeat(200);
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "user@test.com", source: longSource },
      headers: { "x-forwarded-for": "10.0.0.4" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ source: longSource.slice(0, 100) }),
      expect.anything(),
    );
  });

  it("returns 500 on Supabase error", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "DB down" } });
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "fail@test.com" },
      headers: { "x-forwarded-for": "10.0.0.5" },
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("rate-limits after 5 requests from same IP", async () => {
    const ip = "10.0.0.99";
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest({
        method: "POST",
        url: "http://localhost:3000/api/newsletter",
        body: { email: `user${i}@test.com` },
        headers: { "x-forwarded-for": ip },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
    }

    // 6th request should be rate-limited
    const req = createMockRequest({
      method: "POST",
      url: "http://localhost:3000/api/newsletter",
      body: { email: "extra@test.com" },
      headers: { "x-forwarded-for": ip },
    });
    const res = await POST(req);
    expect(res.status).toBe(429);
  });
});
