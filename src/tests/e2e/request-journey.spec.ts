import { expect, test } from "@playwright/test";
import { logIn, uniqueTitle } from "./support";

test.describe("a request from creation to blocked and back in the lists", () => {
  test("create, block with a reason, find it by URL, see it on the dashboard and in the activity", async ({
    page,
  }) => {
    const title = uniqueTitle("blocked request");
    await logIn(page);

    // Create
    await page.goto("/app/requests/new");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Priority").selectOption("high");
    await page.getByRole("button", { name: "Create request" }).click();
    await expect(page).toHaveURL(/\/app\/requests\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    const detailUrl = page.url();

    // Blocking needs a reason
    await page.getByLabel("Status").selectOption("blocked");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Choose why this request is blocked.")).toBeVisible();

    await page.getByLabel("Reason").selectOption("technical_problem");
    await page.getByLabel("Note (optional)").fill("Vendor outage");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Request saved.")).toBeVisible();
    await expect(page.getByText("Blocked: Technical problem")).toBeVisible();

    // The timeline says what happened
    await expect(
      page.getByText("changed the status from New to Blocked", { exact: false }),
    ).toBeVisible();

    // Filters live in the URL and survive a refresh
    const listUrl = `/app/requests?status=blocked&reason=technical_problem&q=${encodeURIComponent(title)}`;
    await page.goto(listUrl);
    await expect(page.getByRole("link", { name: title }).first()).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/status=blocked/);
    await expect(page.getByRole("checkbox", { name: "Blocked" })).toBeChecked();
    await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

    // The dashboard groups blocked work by reason
    await page.goto("/app/dashboard");
    await expect(page.getByRole("heading", { name: "Blocked, by reason" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Technical problem" })).toBeVisible();

    // The workspace activity shows the change
    await page.goto("/app/activity?type=status");
    await expect(page.getByRole("link", { name: title }).first()).toBeVisible();

    // Clean up
    await page.goto(detailUrl);
    await page.getByRole("button", { name: "Delete request" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/requests$/);
  });

  test("a saved view can be created, applied and deleted", async ({ page }) => {
    const name = uniqueTitle("view");
    await logIn(page);

    await page.goto("/app/requests?priority=low");
    await page.getByLabel("Save these filters as a view").fill(name);
    await page.getByRole("button", { name: "Save view" }).click();
    await expect(page.getByText("View saved.")).toBeVisible();

    await page.goto("/app/requests");
    await page.getByRole("link", { name }).click();
    await expect(page).toHaveURL(/priority=low/);

    await page.getByRole("button", { name: `Delete ${name}` }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByRole("link", { name })).toHaveCount(0);
  });

  test("the mobile menu reaches every section", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await logIn(page);

    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "Projects" }).click();

    await expect(page).toHaveURL(/\/app\/projects$/);
    await expect(page.getByRole("heading", { name: "Projects", level: 1 })).toBeVisible();
  });
});
