import { test, expect } from "@playwright/test";
import { GOTO_OPTS } from "./helpers";

test.describe("Onboarding flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("about:blank");
    await page.evaluate(() => {
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}
    });
  });

  test("invite link redirects to login with code", async ({ page }) => {
    await page.goto("/invite?code=abc123", GOTO_OPTS);
    await page.waitForSelector("input, [role='textbox']", { timeout: 30_000 });
    await expect(page.getByPlaceholder("Email")).toBeVisible({ timeout: 10_000 });
  });

  test("join page redirects to login without session", async ({ page }) => {
    await page.goto("/join", GOTO_OPTS);
    await page.waitForSelector("input, [role='textbox']", { timeout: 30_000 });
    await expect(page.getByPlaceholder("Email")).toBeVisible({ timeout: 10_000 });
  });
});
