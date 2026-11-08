import { expect, test } from "@playwright/test";
import { E2E_EMAIL, logIn } from "./support";

test.describe("authentication", () => {
  test("sends a signed-out visitor to the log in page and back after signing in", async ({
    page,
  }) => {
    await page.goto("/app/requests");

    await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Frequests$/);
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Password").fill(process.env.E2E_PASSWORD ?? "RelayDesk-demo-2026");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page).toHaveURL(/\/app\/requests$/);
    await expect(page.getByRole("heading", { name: "Requests", level: 1 })).toBeVisible();
  });

  test("explains a wrong password without leaving the page", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_EMAIL);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("opens the demo workspace without credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Try the demo" }).click();

    await expect(page).toHaveURL(/\/app\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  });

  test("signs out", async ({ page }) => {
    await logIn(page);

    await page.getByRole("button", { name: "Log out" }).first().click();

    await expect(page).toHaveURL(/\/login/);
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
