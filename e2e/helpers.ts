import { Page, expect } from "@playwright/test";

export const TEST_EMAIL = process.env.TEST_USER_EMAIL ?? "claude@test.com";
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "azertyuiop";

// Expo dev server streams JS bundles — "load" never fires during dev.
// Use "commit" and then wait for content.
const GOTO_OPTS = { waitUntil: "commit" as const, timeout: 30_000 };

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("about:blank");
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  await page.goto("/login", GOTO_OPTS);
  // Wait for the SPA to actually render
  await page.waitForSelector("input, [role='textbox']", { timeout: 30_000 });
}

export async function login(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await clearSession(page);

  const emailInput = page.getByPlaceholder("Email");
  await expect(emailInput).toBeVisible({ timeout: 15_000 });

  await emailInput.fill(email);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByText("Se connecter", { exact: true }).click();

  await expect(page.getByText("Accueil")).toBeVisible({ timeout: 15_000 });
}

export { GOTO_OPTS };
