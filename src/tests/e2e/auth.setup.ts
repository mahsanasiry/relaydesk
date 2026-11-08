import { test as setup } from "@playwright/test";
import { AUTH_FILE, logIn } from "./support";

setup("sign in once and keep the session for the other tests", async ({ page }) => {
  await logIn(page);
  await page.context().storageState({ path: AUTH_FILE });
});
