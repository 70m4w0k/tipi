import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

const TASK = `${TEST_PREFIX}menage-${Date.now()}`;

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

test.describe("Ménage", () => {
  test("l'onglet Ménage est présent", async ({ page }) => {
    await login(page);
    const tab = page.locator("a[href='/chores']");
    await expect(tab).toBeVisible();
    await expect(tab).toHaveAttribute("role", "tab");
  });

  test("ajouter une tâche puis renseigner une cellule", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Ménage/ }).click();

    // Ouvre le modal via le FAB.
    await page.getByTestId("chores-fab").click();
    const nameInput = page.getByPlaceholder("Nom de la tâche");
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(TASK);
    await page.getByText("Ajouter", { exact: true }).click();

    // La tâche apparaît dans la grille.
    await expect(page.getByText(TASK, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Clique la cellule de la semaine courante -> un segment coloré apparaît.
    const cell = page.getByTestId(`chore-cell-current-${TASK}`);
    await cell.click();
    await expect.poll(async () => cell.locator("div").count(), { timeout: 10_000 }).toBeGreaterThan(0);
  });

  test("renommer une tâche", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Ménage/ }).click();
    const name = `${TEST_PREFIX}rename-${Date.now()}`;
    const renamed = `${name}-b`;
    await page.getByTestId("chores-fab").click();
    await page.getByPlaceholder("Nom de la tâche").fill(name);
    await page.getByText("Ajouter", { exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Tap la tâche -> modal d'action -> Renommer.
    await page.getByText(name, { exact: true }).click();
    await page.getByText("Renommer", { exact: true }).click();
    // Le champ de renommage est pré-rempli avec le nom actuel (cible non ambiguë).
    await page.locator(`input[value="${name}"]`).fill(renamed);
    await page.getByText("Enregistrer", { exact: true }).click();
    await expect(page.getByText(renamed, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("masquer puis afficher une tâche", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Ménage/ }).click();
    const name = `${TEST_PREFIX}hide-${Date.now()}`;
    await page.getByTestId("chores-fab").click();
    await page.getByPlaceholder("Nom de la tâche").fill(name);
    await page.getByText("Ajouter", { exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Masquer -> disparaît de la grille, bouton "Afficher ... cachée(s)" apparaît.
    await page.getByText(name, { exact: true }).click();
    await page.getByText("Masquer du tableau", { exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 10_000 });
    await page.getByText(/Afficher .* tâche/).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("tâche récurrente : rappel du jour et cocher", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Ménage/ }).click();
    const name = `${TEST_PREFIX}recur-${Date.now()}`;
    await page.getByTestId("chores-fab").click();
    await page.getByPlaceholder("Nom de la tâche").fill(name);
    await page.getByText("Tâche récurrente (rappel)", { exact: true }).click();
    // Choisir aujourd'hui dans le calendrier -> la récurrence tombe aujourd'hui.
    await page.getByRole("button", { name: /Aujourd'hui/ }).click();
    await page.getByText("Ajouter", { exact: true }).click();

    // Le rappel du jour s'affiche (carte ChoreReminder), puis on le coche.
    const reminder = page.locator('[data-testid="chore-reminder"]', { hasText: name });
    await expect(reminder).toBeVisible({ timeout: 10_000 });
    await reminder.click();
    await expect(reminder.getByText("Fait", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("supprimer une tâche", async ({ page }) => {
    await login(page);
    await page.getByRole("tab", { name: /Ménage/ }).click();
    const name = `${TEST_PREFIX}taskdel-${Date.now()}`;
    await page.getByTestId("chores-fab").click();
    await page.getByPlaceholder("Nom de la tâche").fill(name);
    await page.getByText("Ajouter", { exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 10_000 });

    await page.getByText(name, { exact: true }).click();
    await page.getByText("Supprimer", { exact: true }).click();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0, { timeout: 10_000 });
  });
});
