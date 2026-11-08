import { defineConfig, devices } from "@playwright/test";
import { AUTH_FILE } from "./src/tests/e2e/support";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Set to "chrome" or "msedge" to use a browser that is already installed instead of the one
// Playwright downloads. This helps where that download is not reachable.
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

export default defineConfig({
  testDir: "./src/tests/e2e",
  testMatch: "**/*.spec.ts",
  // The journeys share one seeded workspace, so they run one after another.
  workers: 1,
  // Every page waits on the hosted database, so a slow network needs more room than the defaults.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    // Signing in is rate limited by the hosted auth service, so the session is created once
    // and reused instead of logging in at the start of every test.
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"], channel },
    },
    {
      name: "chromium",
      testMatch: "**/*.spec.ts",
      testIgnore: "**/auth.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], channel, storageState: AUTH_FILE },
    },
    // Signing out ends the shared session, so these run after everything that relies on it.
    {
      name: "auth",
      testMatch: "**/auth.spec.ts",
      dependencies: ["chromium"],
      use: { ...devices["Desktop Chrome"], channel },
    },
  ],
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
