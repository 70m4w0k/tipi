import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Chores", () => {
  test("chore tab is visible in navigation", async ({ page }) => {
    await login(page);
    // Verify the chores tab exists with correct href
    const choresTab = page.locator("a[href='/chores']");
    await expect(choresTab).toBeVisible();
    await expect(choresTab).toHaveAttribute("role", "tab");
  });
});
