import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

// Crée une recette avec 2 étapes via l'UI et laisse l'utilisateur sur la liste.
async function createRecipe(page: Page, title: string) {
  await login(page);
  await page.getByRole("tab", { name: /Recettes/ }).click();
  await page.getByTestId("recipes-fab").click();
  await page.getByPlaceholder("Titre", { exact: true }).fill(title);
  await page.getByPlaceholder("Titre de l'étape").fill("Etape A");
  await page.getByText("Ajouter l'étape", { exact: true }).click();
  await page.getByPlaceholder("Titre de l'étape").fill("Etape B");
  await page.getByText("Ajouter l'étape", { exact: true }).click();
  await page.getByText("Enregistrer", { exact: true }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 10_000 });
}

test.describe("Recettes", () => {
  test("créer, déplier, lancer et faire progresser une instance", async ({ page }) => {
    const recipe = `${TEST_PREFIX}recette-${Date.now()}`;
    const instance = `${recipe}-inst`;
    await createRecipe(page, recipe);

    // Détail + déplier les étapes.
    await page.getByText(recipe, { exact: true }).click();
    await page.getByText(/Étapes \(2\)/).click();
    await expect(page.getByText("Etape A", { exact: true })).toBeVisible({ timeout: 10_000 });

    // Lancer une instance.
    await page.getByTestId("recipe-launch").click();
    await page.getByPlaceholder("Nom (ex: Magret d'Elise)").fill(instance);
    await page.getByTestId("recipe-start-submit").click();
    const inst = page.getByText(instance, { exact: true });
    await expect(inst).toBeVisible({ timeout: 10_000 });

    // Instance : avancer, revenir, avancer, terminer.
    await inst.click();
    await page.getByText("Étape suivante", { exact: true }).click();
    await expect(page.getByText("Terminer", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByTestId("recipe-step-back").click();
    await expect(page.getByText("Étape suivante", { exact: true })).toBeVisible({ timeout: 10_000 });
    await page.getByText("Étape suivante", { exact: true }).click();
    await page.getByText("Terminer", { exact: true }).click();
    await expect(page.getByText("Recette terminée !")).toBeVisible({ timeout: 10_000 });

    // Notes.
    await page.getByPlaceholder("Ajouter des notes...").fill("E2E note");
    await page.getByText("Enregistrer", { exact: true }).click();
    await expect(page.getByText("Sauvegardé")).toBeVisible({ timeout: 10_000 });
  });

  test("modifier une recette", async ({ page }) => {
    const recipe = `${TEST_PREFIX}edit-${Date.now()}`;
    const renamed = `${recipe}-b`;
    await createRecipe(page, recipe);

    await page.getByText(recipe, { exact: true }).click();
    await page.getByTestId("recipe-edit-header").click();
    // La liste reste montée sous le détail -> cible le champ pré-rempli par sa valeur.
    await page.locator(`input[value="${recipe}"]`).fill(renamed);
    await page.getByTestId("recipe-edit-save").click();
    await expect(page.getByTestId("recipe-detail-title")).toHaveText(renamed, { timeout: 10_000 });
  });

  // NB : "supprimer une recette" se fait par appui long sur la carte, mais la carte
  // est aussi navigable (onPress -> détail). En web headless, l'appui long déclenche
  // la navigation au lieu de la confirmation -> non testable de façon fiable.
  // La confirmation (ConfirmDialog) est couverte par shopping/expenses.
});
