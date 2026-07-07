import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

const ITEM = `${TEST_PREFIX}courses-${Date.now()}`;

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

test.describe("Courses", () => {
  test("ajouter puis cocher un article", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Courses/ }).click();

    const input = page.getByPlaceholder("Ajouter un article...");
    await expect(input).toBeVisible({ timeout: 15_000 });

    // Ajout via la touche Entrée (onSubmitEditing).
    await input.fill(ITEM);
    await input.press("Enter");

    const item = page.getByText(ITEM, { exact: true });
    await expect(item).toBeVisible({ timeout: 10_000 });

    // Cocher : clic sur la ligne -> texte barré (line-through).
    await item.click();
    await expect(item).toHaveCSS("text-decoration-line", "line-through", { timeout: 10_000 });
  });
});
