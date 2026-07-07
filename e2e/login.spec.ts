import { test, expect } from "@playwright/test";
import { clearSession } from "./helpers";

test.describe("Login — inscription & mode", () => {
  test.beforeEach(async ({ page }) => {
    await clearSession(page);
  });

  test("bascule login <-> inscription", async ({ page }) => {
    // En mode login, pas de champ nom d'affichage.
    await expect(page.getByPlaceholder("Nom d'affichage")).toHaveCount(0);

    await page.getByText("Pas encore de compte ? Créer un compte").click();
    await expect(page.getByPlaceholder("Nom d'affichage")).toBeVisible();

    await page.getByText("Déjà un compte ? Se connecter").click();
    await expect(page.getByPlaceholder("Nom d'affichage")).toHaveCount(0);
  });

  test("inscription sans nom affiche une erreur", async ({ page }) => {
    await page.getByText("Pas encore de compte ? Créer un compte").click();
    await page.getByPlaceholder("Email").fill("nouveau-e2e@test.com");
    await page.getByPlaceholder("Mot de passe").fill("azertyuiop");
    await page.getByText("Créer un compte", { exact: true }).click();
    await expect(page.getByText("Choisis un nom d'affichage.")).toBeVisible();
  });

  test("lien magique sans email affiche une erreur", async ({ page }) => {
    await page.getByText("Recevoir un lien de connexion").click();
    await expect(page.getByText("Entre ton email pour recevoir le lien.")).toBeVisible();
  });
});
