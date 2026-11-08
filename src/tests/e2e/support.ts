import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

// The seed script creates these accounts. The password is the documented demo default.
export const E2E_EMAIL = process.env.E2E_EMAIL ?? "maya.okafor@relaydesk.example";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "RelayDesk-demo-2026";

/** Where the setup project stores the signed-in session that the other tests reuse. */
export const AUTH_FILE = "playwright/.auth/user.json";

export async function logIn(page: Page): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  try {
    await expect(page).toHaveURL(/\/app\/dashboard$/);
  } catch (error) {
    const said = (await page.getByRole("alert").allTextContents()).join(" ").trim();
    throw new Error(`Log in did not reach the dashboard. The page said: ${said || "nothing"}`, {
      cause: error,
    });
  }
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
}

/** Every request these tests create carries this prefix, so leftovers are easy to find. */
export function uniqueTitle(label: string): string {
  return `E2E ${label} ${Date.now()}`;
}
