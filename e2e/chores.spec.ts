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
});
