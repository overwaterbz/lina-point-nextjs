import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["list"], ["github"]]
    : [
        ["list"],
        ["html", { outputFolder: "playwright-report", open: "never" }],
      ],
  use: {
    baseURL:
      process.env.BASE_URL ||
      process.env.E2E_BASE_URL ||
      "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "smoke",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /smoke\.spec\.ts$/,
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
