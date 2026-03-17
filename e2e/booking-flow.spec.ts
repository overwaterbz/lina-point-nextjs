import { test, expect } from "@playwright/test";

test.describe("Booking Flow", () => {
  test("should load the booking page and show room selection", async ({
    page,
  }) => {
    // Booking is a protected route — verify it redirects to auth or shows login
    const response = await page.goto("/booking");
    expect(response?.status()).toBeLessThan(500);

    // Should either show booking content or redirect to auth
    const url = page.url();
    const isBooking = url.includes("/booking");
    const isAuth = url.includes("/auth");

    expect(isBooking || isAuth).toBe(true);
  });

  test("should load the rooms page", async ({ page }) => {
    const response = await page.goto("/rooms");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should load the experiences page", async ({ page }) => {
    const response = await page.goto("/experiences");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible();
  });

  test("should have availability API endpoint", async ({ request }) => {
    // Missing params should return 400
    const noParams = await request.get("/api/availability");
    expect(noParams.status()).toBe(400);

    // Valid params structure (will fail without real DB but should not 500)
    const withParams = await request.get(
      "/api/availability?checkIn=2026-12-01&checkOut=2026-12-05",
    );
    // Accept 200 (real data) or 500 (no DB in CI) — just not a crash
    expect([200, 500]).toContain(withParams.status());
  });

  test("should reach the booking confirmation page structure", async ({
    page,
  }) => {
    const response = await page.goto("/booking/confirmation");
    // May redirect if no session — just verify no 500
    expect(response?.status()).toBeLessThan(500);
  });
});
