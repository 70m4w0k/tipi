import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

async function gotoProfile(page: Page) {
  await login(page);
  await page.getByTestId("profile-button").click();
  await expect(page.getByText("Se déconnecter")).toBeVisible({ timeout: 15_000 });
}

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

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

  test("modifier le profil (date de naissance) et enregistrer", async ({ page }) => {
    await gotoProfile(page);
    const birthday = page.getByPlaceholder("AAAA-MM-JJ");
    await birthday.fill("1990-01-01");
    await page.getByText("Enregistrer", { exact: true }).click();
    // Sauvegardé -> le bouton disparaît (plus de changement en attente).
    await expect(page.getByText("Enregistrer", { exact: true })).toHaveCount(0, { timeout: 10_000 });
    // Restaure (vide la date).
    await birthday.fill("");
    await page.getByText("Enregistrer", { exact: true }).click();
    await expect(page.getByText("Enregistrer", { exact: true })).toHaveCount(0, { timeout: 10_000 });
  });

  test("revoir le tutoriel", async ({ page }) => {
    await gotoProfile(page);
    await page.getByText("Revoir le tutoriel").click();
    await expect(page.getByText("Bienvenue sur Tipi")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Passer", { exact: true }).click();
  });

  test("gérer les membres en attente (admin)", async ({ page }) => {
    await gotoProfile(page);
    const pending = `${TEST_PREFIX}pending-${Date.now()}`;
    await page.getByPlaceholder("Nom du membre").fill(pending);
    await page.getByTestId("pending-add").click();
    await expect(page.getByText(pending, { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("pending-remove").click();
    await expect(page.getByText(pending, { exact: true })).toHaveCount(0, { timeout: 10_000 });
  });

  test("renommer la coloc (admin)", async ({ page }) => {
    await gotoProfile(page);
    const original = (await page.getByTestId("household-name-row").innerText()).trim();
    const input = page.getByTestId("household-name-input");
    await page.getByTestId("household-name-row").click();
    const renamed = `${TEST_PREFIX}house-${Date.now()}`;
    await input.fill(renamed);
    await page.getByTestId("household-name-save").click();
    await expect(page.getByText(renamed, { exact: true })).toBeVisible({ timeout: 10_000 });
    // Restaure le nom d'origine.
    await page.getByTestId("household-name-row").click();
    await input.fill(original);
    await page.getByTestId("household-name-save").click();
    await expect(page.getByText(original, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("régénérer le code — confirmation puis annulation", async ({ page }) => {
    await gotoProfile(page);
    await page.getByTestId("regen-code").click();
    await expect(page.getByText("Régénérer le code ?")).toBeVisible({ timeout: 10_000 });
    // On annule pour ne pas changer le code réel.
    await page.getByText("Annuler", { exact: true }).click();
    await expect(page.getByText("Régénérer le code ?")).toHaveCount(0, { timeout: 10_000 });
  });

  test("se déconnecter revient au login", async ({ page }) => {
    await gotoProfile(page);
    await page.getByText("Se déconnecter").click();
    await expect(page.getByPlaceholder("Email")).toBeVisible({ timeout: 15_000 });
  });
});
