import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

const EXPENSE = `${TEST_PREFIX}depense-${Date.now()}`;

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

test.describe("Dépenses", () => {
  test("bascule d'onglets internes puis ajout d'une dépense", async ({ page }) => {
    await login(page);
    // Dépenses n'est pas dans la barre par défaut -> tuile d'accès rapide de l'accueil.
    await page.getByText("Dépenses", { exact: true }).click();
    await expect(page.getByText("Total dépenses")).toBeVisible({ timeout: 15_000 });

    // Bascule Liste <-> Bilans.
    await page.getByText("Bilans", { exact: true }).click();
    await page.getByText("Liste", { exact: true }).click();

    // Ajout via le FAB + formulaire.
    await page.getByTestId("expenses-fab").click();
    await page.getByPlaceholder("Ex : Courses Lidl, Loyer juillet...").fill(EXPENSE);
    await page.getByPlaceholder("0.00").fill("12");
    await page.getByText("Ajouter la dépense", { exact: true }).click();

    // La dépense apparaît dans la liste.
    await expect(page.getByText(EXPENSE, { exact: true })).toBeVisible({ timeout: 15_000 });
  });

  test("vue Bilans", async ({ page }) => {
    await login(page);
    await page.getByText("Dépenses", { exact: true }).click();
    await expect(page.getByText("Total dépenses")).toBeVisible({ timeout: 15_000 });
    await page.getByText("Bilans", { exact: true }).click();
    await expect(page.getByText("Remboursements suggérés")).toBeVisible({ timeout: 10_000 });
  });

  test("supprimer une dépense (ConfirmDialog)", async ({ page }) => {
    await login(page);
    await page.getByText("Dépenses", { exact: true }).click();
    await expect(page.getByText("Total dépenses")).toBeVisible({ timeout: 15_000 });

    const title = `${TEST_PREFIX}depdel-${Date.now()}`;
    await page.getByTestId("expenses-fab").click();
    await page.getByPlaceholder("Ex : Courses Lidl, Loyer juillet...").fill(title);
    await page.getByPlaceholder("0.00").fill("7");
    await page.getByText("Ajouter la dépense", { exact: true }).click();
    await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15_000 });

    // Supprime via la corbeille de la carte -> confirmation.
    await page.locator('[data-testid="expense-card"]', { hasText: title }).getByTestId("expense-delete").click();
    await page.getByTestId("confirm-dialog-confirm").click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0, { timeout: 10_000 });
  });
});
