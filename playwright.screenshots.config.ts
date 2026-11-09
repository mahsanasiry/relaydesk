import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const channel = process.env.E2E_BROWSER_CHANNEL || undefined;

// Separate from the test config so the end-to-end run never rewrites the README images.
export default defineConfig({
  testDir: "./scripts/screenshots",
  testMatch: "**/*.shots.ts",
  workers: 1,
  // The pages wait on a hosted database, so a slow network needs generous limits.
  timeout: 300_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: { baseURL },
  projects: [
    {
      name: "screenshots",
      use: {
        ...devices["Desktop Chrome"],
        channel,
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
        colorScheme: "light",
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
