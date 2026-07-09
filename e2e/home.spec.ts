import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Accueil — navigations", () => {
  test("carte Courses -> liste de courses", async ({ page }) => {
    await login(page);
    await page.getByTestId("home-shopping-card").click();
    await expect(page.getByPlaceholder("Ajouter un article...")).toBeVisible({ timeout: 15_000 });
  });

  test("bouton profil -> paramètres", async ({ page }) => {
    await login(page);
    await page.getByTestId("profile-button").click();
    await expect(page.getByText("Se déconnecter")).toBeVisible({ timeout: 15_000 });
  });

  test("tuile d'accès rapide -> page non-onglet", async ({ page }) => {
    await login(page);
    // "Dépenses" n'est pas un onglet -> tuile d'accès rapide.
    await page.getByText("Dépenses", { exact: true }).click();
    await expect(page.getByText("Total dépenses")).toBeVisible({ timeout: 15_000 });
  });
});
