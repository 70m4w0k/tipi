import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers";

async function gotoProfile(page: Page) {
  await login(page);
  await page.getByTestId("profile-button").click();
  await expect(page.getByText("Se déconnecter")).toBeVisible({ timeout: 15_000 });
}

test.describe("Profil / Paramètres", () => {
  test("changer le thème", async ({ page }) => {
    await gotoProfile(page);
    const dark = page.getByText("Sombre", { exact: true });
    await dark.click();
    // Ligne sélectionnée -> label en gras (fontWeight 600).
    await expect(dark).toHaveCSS("font-weight", "600", { timeout: 5_000 });
    // Restaure le mode automatique.
    await page.getByText("Automatique", { exact: true }).click();
  });

  test("configurer la barre de navigation", async ({ page }) => {
    await gotoProfile(page);
    // "Recettes" est activé par défaut : le désactiver est toujours permis.
    const label = page.getByTestId("navtab-recipes").getByText("Recettes");
    const before = await label.evaluate((el) => getComputedStyle(el).fontWeight);
    await page.getByTestId("navtab-recipes").click();
    await expect
      .poll(async () => label.evaluate((el) => getComputedStyle(el).fontWeight), { timeout: 5_000 })
      .not.toBe(before);
    // Restaure l'état initial.
    await page.getByTestId("navtab-recipes").click();
  });

  test("se déconnecter revient au login", async ({ page }) => {
    await gotoProfile(page);
    await page.getByText("Se déconnecter").click();
    await expect(page.getByPlaceholder("Email")).toBeVisible({ timeout: 15_000 });
  });
});
