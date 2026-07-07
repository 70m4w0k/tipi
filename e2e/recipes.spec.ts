import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

const RECIPE = `${TEST_PREFIX}recette-${Date.now()}`;
const INSTANCE = `${RECIPE}-inst`;

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

test.describe("Recettes", () => {
  test("créer une recette, lancer une instance et avancer les étapes", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Recettes/ }).click();

    // --- Création : titre + 2 étapes ---
    await page.getByTestId("recipes-fab").click();
    await page.getByPlaceholder("Titre", { exact: true }).fill(RECIPE);
    await page.getByPlaceholder("Titre de l'étape").fill("Etape A");
    await page.getByText("Ajouter l'étape", { exact: true }).click();
    await page.getByPlaceholder("Titre de l'étape").fill("Etape B");
    await page.getByText("Ajouter l'étape", { exact: true }).click();
    await page.getByText("Enregistrer", { exact: true }).click();

    // La recette apparaît dans la liste.
    const card = page.getByText(RECIPE, { exact: true });
    await expect(card).toBeVisible({ timeout: 10_000 });

    // --- Détail : lancer une instance ---
    await card.click();
    await page.getByTestId("recipe-launch").click();
    await page.getByPlaceholder("Nom (ex: Magret d'Elise)").fill(INSTANCE);
    await page.getByTestId("recipe-start-submit").click();

    // L'instance apparaît "En cours".
    const instance = page.getByText(INSTANCE, { exact: true });
    await expect(instance).toBeVisible({ timeout: 10_000 });

    // --- Instance : avancer d'une étape ---
    await instance.click();
    await page.getByText("Étape suivante", { exact: true }).click();
    // Sur la dernière étape (2/2), le bouton devient "Terminer".
    await expect(page.getByText("Terminer", { exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
