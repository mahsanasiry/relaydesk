import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Set to "chrome" or "msedge" to use a browser that is already installed instead of the one
// Playwright downloads. This helps where that download is not reachable.
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: "./src/tests/e2e",
  testMatch: "**/*.spec.ts",
  // The journeys share one seeded workspace, so they run one after another.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel } }],
  // Pointing E2E_BASE_URL at a running deployment skips starting a local server.
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
