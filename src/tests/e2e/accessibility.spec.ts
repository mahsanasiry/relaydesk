import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
}

test.describe("public pages", () => {
  // A signed-in visitor is redirected away from /login and /signup, so these run signed out.
  test.use({ storageState: { cookies: [], origins: [] } });

  for (const [path, heading] of [
    ["/", /.+/],
    ["/login", "Log in"],
    ["/signup", "Create your account"],
  ] as const) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(heading);
      await expectNoViolations(page);
    });
  }
});

test.describe("signed-in pages", () => {
  const pages = [
    ["/app/dashboard", "Dashboard"],
    ["/app/requests", "Requests"],
    ["/app/requests/new", "New request"],
    ["/app/projects", "Projects"],
    ["/app/projects/new", "New project"],
    ["/app/clients", "Clients"],
    ["/app/clients/new", "New client"],
    ["/app/activity", "Activity"],
    ["/app/reports", "Reports"],
    ["/app/notifications", "Notifications"],
    ["/app/settings", "Settings"],
  ] as const;

  for (const [path, heading] of pages) {
    test(`${path} has no accessibility violations`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
      // Data arrives after the first paint, so the scan waits for the network to settle.
      await page.waitForLoadState("networkidle");
      await expectNoViolations(page);
    });
  }
});
