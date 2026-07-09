import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, seedRecipe, TEST_PREFIX } from "./db";

const EVENT = `${TEST_PREFIX}event-${Date.now()}`;
const CAL_RECIPE = `${TEST_PREFIX}calrecipe-${Date.now()}`;
const TODAY = new Date().toISOString().slice(0, 10);

test.beforeAll(async () => {
  await seedRecipe(CAL_RECIPE);
});

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

async function openCalendar(page: Page) {
  await login(page);
  // Calendrier n'est pas un onglet par défaut -> tuile d'accès rapide.
  await page.getByText("Calendrier", { exact: true }).click();
  await expect(page.getByText("Anniversaires")).toBeVisible({ timeout: 15_000 });
}

test.describe("Calendrier", () => {
  test("ajouter, filtrer puis supprimer un événement", async ({ page }) => {
    await openCalendar(page);

    // Ajout via FAB -> menu -> Événement (date pré-remplie = aujourd'hui).
    await page.getByTestId("calendar-fab").click();
    await page.getByText("Événement", { exact: true }).click();
    await page.getByPlaceholder("Titre").fill(EVENT);
    await page.getByText("Ajouter", { exact: true }).click();

    const event = page.getByText(EVENT, { exact: true });
    await expect(event).toBeVisible({ timeout: 10_000 });

    // Filtre : masquer les événements -> l'événement disparaît, puis réapparaît.
    await page.getByText("Événements", { exact: true }).click();
    await expect(event).toHaveCount(0, { timeout: 10_000 });
    await page.getByText("Événements", { exact: true }).click();
    await expect(event).toBeVisible({ timeout: 10_000 });

    // Suppression via la corbeille de l'item.
    await page.locator('[data-testid="calendar-item"]', { hasText: EVENT }).getByTestId("event-delete").click();
    await expect(event).toHaveCount(0, { timeout: 10_000 });
  });

  test("planifier une recette", async ({ page }) => {
    await openCalendar(page);
    await page.getByTestId("calendar-fab").click();
    await page.getByText("Planifier une recette", { exact: true }).click();

    // Choisir la recette seedée, cible = aujourd'hui (étapes sans durée -> faisable).
    await page.getByText(CAL_RECIPE, { exact: true }).click();
    await page.getByPlaceholder("Prêt pour le... (AAAA-MM-JJ)").fill(TODAY);
    await page.getByText("Planifier", { exact: true }).click();

    // La recette planifiée apparaît dans la journée sélectionnée (item du jour).
    await expect(
      page.locator('[data-testid="calendar-item"]', { hasText: CAL_RECIPE })
    ).toBeVisible({ timeout: 10_000 });
  });
});
