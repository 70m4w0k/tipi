import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Navigation", () => {
  test("home page shows tab bar", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Accueil")).toBeVisible();
    // Tabs exist — use role to avoid matching page content
    await expect(page.getByRole("tab", { name: /Ménage/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Courses/ })).toBeVisible();
    await expect(page.getByRole("tab", { name: /Recettes/ })).toBeVisible();
  });
});
