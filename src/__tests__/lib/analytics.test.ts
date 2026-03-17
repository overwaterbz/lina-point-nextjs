/**
 * Tests for src/lib/analytics.ts
 * Covers: trackEvent, captureUtmParams, getUtmParams
 */

// Mock Supabase to avoid module-level createClient hitting real API
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => null),
}));

import { trackEvent, captureUtmParams, getUtmParams } from "@/lib/analytics";

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
const sessionStorageMock = {
  getItem: jest.fn((key: string) => mockSessionStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockSessionStorage[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockSessionStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockSessionStorage).forEach(
      (k) => delete mockSessionStorage[k],
    );
  }),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, "sessionStorage", { value: sessionStorageMock });

describe("analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorageMock.clear();
    delete (window as any).gtag;
  });

  describe("trackEvent", () => {
    it("should call window.gtag when available", () => {
      const gtagMock = jest.fn();
      (window as any).gtag = gtagMock;

      trackEvent("purchase", { value: 597, currency: "USD" });

      expect(gtagMock).toHaveBeenCalledWith("event", "purchase", {
        value: 597,
        currency: "USD",
      });
    });

    it("should not throw when gtag is not available", () => {
      expect(() => trackEvent("page_view")).not.toThrow();
    });

    it("should pass params as-is to gtag", () => {
      const gtagMock = jest.fn();
      (window as any).gtag = gtagMock;

      trackEvent("signup", { method: "email", success: true });

      expect(gtagMock).toHaveBeenCalledWith("event", "signup", {
        method: "email",
        success: true,
      });
    });
  });

  describe("captureUtmParams", () => {
    it("should store UTM params from URL in sessionStorage", () => {
      Object.defineProperty(window, "location", {
        value: {
          search: "?utm_source=google&utm_medium=cpc&utm_campaign=summer",
          pathname: "/booking",
        },
        writable: true,
        configurable: true,
      });

      captureUtmParams();

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        "lp_utm",
        JSON.stringify({
          utm_source: "google",
          utm_medium: "cpc",
          utm_campaign: "summer",
        }),
      );
    });

    it("should not store anything when no UTM params present", () => {
      Object.defineProperty(window, "location", {
        value: { search: "", pathname: "/booking" },
        writable: true,
        configurable: true,
      });

      captureUtmParams();

      expect(sessionStorageMock.setItem).not.toHaveBeenCalled();
    });

    it("should capture all 5 UTM params when present", () => {
      Object.defineProperty(window, "location", {
        value: {
          search:
            "?utm_source=fb&utm_medium=social&utm_campaign=winter&utm_term=resort&utm_content=ad1",
          pathname: "/",
        },
        writable: true,
        configurable: true,
      });

      captureUtmParams();

      const stored = JSON.parse(sessionStorageMock.setItem.mock.calls[0][1]);
      expect(stored).toEqual({
        utm_source: "fb",
        utm_medium: "social",
        utm_campaign: "winter",
        utm_term: "resort",
        utm_content: "ad1",
      });
    });
  });

  describe("getUtmParams", () => {
    it("should return stored UTM params", () => {
      mockSessionStorage["lp_utm"] = JSON.stringify({ utm_source: "google" });

      const result = getUtmParams();
      expect(result).toEqual({ utm_source: "google" });
    });

    it("should return empty object when no UTM stored", () => {
      const result = getUtmParams();
      expect(result).toEqual({});
    });

    it("should return empty object on invalid JSON", () => {
      mockSessionStorage["lp_utm"] = "invalid-json";

      const result = getUtmParams();
      expect(result).toEqual({});
    });
  });
});
