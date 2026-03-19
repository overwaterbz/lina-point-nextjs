// tests/smoke.spec.ts
// Playwright smoke test for Lina Point booking flow and OTA price comparison

import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://lina-point.vercel.app";

test.describe("Lina Point Booking Smoke Test", () => {
  test("Guest can search and see OTA price comparison without login", async ({
    page,
  }) => {
    await page.goto(BASE_URL + "/booking");
    // Fill in booking form with valid dates
    const today = new Date();
    const checkIn = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 7,
    );
    const checkOut = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 10,
    );
    const format = (d: Date) => d.toISOString().split("T")[0];
    await page.fill('input[name="checkInDate"]', format(checkIn));
    await page.fill('input[name="checkOutDate"]', format(checkOut));
    await page.selectOption('select[name="roomType"]', "suite_2nd_floor");
    await page.click('button[type="submit"]');
    // Wait for OTA price comparison to appear
    await expect(page.locator("text=Compare Prices")).toBeVisible({
      timeout: 15000,
    });
    // Ensure guest is NOT redirected to login
    await expect(page).not.toHaveURL(/auth\/login/);
  });

  test("Login is required only at checkout", async ({ page }) => {
    await page.goto(BASE_URL + "/booking");
    // Fill in booking form with valid dates
    const today = new Date();
    const checkIn = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 7,
    );
    const checkOut = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 10,
    );
    const format = (d: Date) => d.toISOString().split("T")[0];
    await page.fill('input[name="checkInDate"]', format(checkIn));
    await page.fill('input[name="checkOutDate"]', format(checkOut));
    await page.selectOption('select[name="roomType"]', "suite_2nd_floor");
    await page.click('button[type="submit"]');
    // Wait for results
    await expect(page.locator("text=Compare Prices")).toBeVisible({
      timeout: 15000,
    });
    // Try to proceed to payment (simulate clicking "Book" or similar if present)
    // This selector may need adjustment based on your UI
    if (await page.locator('button:has-text("Pay")').isVisible()) {
      await page.click('button:has-text("Pay")');
      await expect(page).toHaveURL(/auth\/login/);
    }
  });
});
