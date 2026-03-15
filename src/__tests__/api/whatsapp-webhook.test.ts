/**
 * @jest-environment node
 */

/**
 * WhatsApp webhook API route tests
 * Tests Twilio signature verification and message handling
 */

jest.mock("twilio/lib/webhooks/webhooks", () => ({
  validateRequest: jest.fn().mockReturnValue(true),
}));

jest.mock("@/lib/agents/whatsappConciergeAgent", () => ({
  runWhatsAppConciergeAgent: jest.fn().mockResolvedValue({
    response: "Welcome to Lina Point!",
  }),
}));

jest.mock("@/lib/whatsapp", () => ({
  normalizePhoneNumber: jest.fn((n: string) => n),
  sendWhatsAppMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/priceScoutAgent", () => ({
  runPriceScout: jest.fn(),
}));

jest.mock("@/lib/experienceCuratorAgent", () => ({
  runExperienceCurator: jest.fn(),
}));

jest.mock("@/lib/agents/agentRunLogger", () => ({
  createAgentRun: jest.fn().mockResolvedValue("run-1"),
  finishAgentRun: jest.fn(),
}));

jest.mock("@/lib/magicContent", () => ({
  generateMagicContent: jest.fn(),
}));

jest.mock("@/lib/inventory", () => ({
  checkAvailability: jest.fn(),
}));

jest.mock("@/lib/bookingFulfillment", () => ({
  getReservation: jest.fn(),
}));

jest.mock("@/lib/agents/tripPlannerAgent", () => ({
  generateTripPlan: jest.fn(),
}));

jest.mock("@/lib/agents/guestIntelligenceAgent", () => ({
  logInteraction: jest.fn(),
}));

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

import { POST } from "@/app/api/whatsapp-webhook/route";
import { NextRequest } from "next/server";

describe("POST /api/whatsapp-webhook", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
    process.env.TWILIO_WEBHOOK_URL =
      "https://linapoint.com/api/whatsapp-webhook";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
  });

  it("exports a POST handler", () => {
    expect(typeof POST).toBe("function");
  });

  it("rejects requests without Twilio auth token configured", async () => {
    delete process.env.TWILIO_AUTH_TOKEN;
    const formBody = new URLSearchParams({
      Body: "Hello",
      From: "+15551234567",
    });
    const req = new NextRequest("http://localhost/api/whatsapp-webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-twilio-signature": "invalid",
      },
      body: formBody.toString(),
    });
    const res = await POST(req);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
