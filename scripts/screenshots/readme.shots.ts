import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const OUT = "docs/screenshots";

// Data and web fonts arrive after the first paint, and a picture taken earlier shows gaps.
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

test("captures the images used in the README", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/home.png` });

  // The demo link signs in to the sample workspace, so no credentials are needed here.
  await page.goto("/demo");
  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Needs attention" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/dashboard.png` });

  await page.goto("/app/requests?status=blocked");
  await expect(page.getByRole("heading", { name: "Requests", level: 1 })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/requests.png` });

  // Every request in this list is blocked, so the first one shows the reason on its page.
  await page
    .locator('main a[href^="/app/requests/"]:not([href="/app/requests/new"])')
    .first()
    .click();
  await expect(page.getByText(/^Blocked: /)).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/request-detail.png` });

  await page.goto("/app/reports");
  await expect(page.getByRole("heading", { name: "Reports", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Stopped right now" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/reports.png` });

  await page.goto("/app/activity");
  await expect(page.getByRole("heading", { name: "Activity", level: 1 })).toBeVisible();
  await expect(page.getByText(/\d+ events?/).first()).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/activity.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/dashboard");
  await expect(page.getByRole("region", { name: "Needs attention" })).toBeVisible();
  await settle(page);
  await page.screenshot({ path: `${OUT}/mobile-dashboard.png` });
});
