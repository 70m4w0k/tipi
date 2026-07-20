import { test, expect, Page } from "@playwright/test";
import { login, GOTO_OPTS } from "./helpers";
import { cleanupByPrefix, seedSportLog, getShowSportLevel, TEST_PREFIX } from "./db";

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

/**
 * L'onglet Sport n'est pas dans DEFAULT_TABS : on préconfigure les préférences
 * de navigation (localStorage) avant le chargement de l'app.
 */
async function loginWithSportTab(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("tipi_nav_tabs", JSON.stringify(["home", "chores", "shopping", "recipes", "sport"]));
    } catch {}
  });
  await login(page);
}

/** Crée un exercice custom via le FAB et ouvre sa page détail. */
async function createAndOpenExercise(page: Page, name: string) {
  await page.getByRole("tab", { name: /Sport/ }).click();
  await page.getByTestId("sport-fab").click();
  const nameInput = page.getByPlaceholder("Nom de l'exercice");
  await expect(nameInput).toBeVisible({ timeout: 10_000 });
  await nameInput.fill(name);
  await page.getByText("Enregistrer", { exact: true }).click();
  const card = page.getByTestId(`sport-card-${name}`);
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  // La page détail est chargée (la carte fantôme "Ajouter une série" lui est propre).
  await expect(page.getByTestId("add-series")).toBeVisible({ timeout: 10_000 });
}

test.describe("Sport — gamification", () => {
  test("l'onglet Sport est présent", async ({ page }) => {
    await loginWithSportTab(page);
    const tab = page.locator("a[href='/sport']");
    await expect(tab).toBeVisible();
  });

  test("un exercice custom reçoit ses badges, seuls le prochain palier est révélé", async ({ page }) => {
    const EX = `${TEST_PREFIX}badges-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // Le prochain badge (palier 100) est révélé avec son titre générique.
    const nextBadge = page.getByTestId("badge-next-100");
    await expect(nextBadge).toBeVisible({ timeout: 15_000 });
    await expect(nextBadge.getByText(`${EX} — Centurion`)).toBeVisible();

    // Les 4 paliers suivants sont cachés (icône "?", pas de titre ni de seuil).
    await expect(page.getByTestId(/^badge-hidden-/)).toHaveCount(4);
    await expect(page.getByText(`${EX} — Vétéran`)).toHaveCount(0);
    await expect(page.getByText(`${EX} — Légende`)).toHaveCount(0);
    await expect(page.getByText("10000", { exact: true })).toHaveCount(0);
  });

  test("saisie clavier : franchir un seuil débloque le badge et révèle le suivant", async ({ page }) => {
    const EX = `${TEST_PREFIX}unlock-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // Ajoute une série puis saisit 120 directement au clavier.
    await page.getByTestId("add-series").click();
    const count = page.getByTestId("rep-count").first();
    await expect(count).toBeVisible({ timeout: 10_000 });
    await count.click();
    const input = page.getByTestId("rep-input");
    await expect(input).toBeVisible();
    await input.fill("120");
    await page.keyboard.press("Enter");

    // L'overlay de déblocage célèbre le badge du palier 100.
    await expect(page.getByText("Badge débloqué")).toBeVisible({ timeout: 15_000 });

    // Le badge 100 passe débloqué, le palier 500 est révélé, 3 restent cachés.
    await expect(page.getByTestId("badge-unlocked-100")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("badge-next-500").getByText(`${EX} — Vétéran`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(/^badge-hidden-/)).toHaveCount(3);
  });

  test("le niveau s'affiche et l'objectif du jour apparaît au niveau 2", async ({ page }) => {
    const EX = `${TEST_PREFIX}level-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // Historique d'hier : 200 reps -> 200 XP volume + 50 XP badge (palier 100) -> niveau >= 2
    await seedSportLog(EX, 200, 1);

    // Recharge la page Sport pour refetch avec l'historique.
    await page.goto("/sport", GOTO_OPTS);
    const chip = page.getByTestId("level-chip");
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await expect(chip).toHaveText(/Niv\. [2-9]/, { timeout: 15_000 });

    // L'objectif du jour est visible sur la carte : moyenne 200 × 1.1 = 220, rien fait aujourd'hui.
    const ring = page.getByTestId(`sport-card-${EX}`).getByTestId("daily-goal-ring");
    await expect(ring).toBeVisible({ timeout: 15_000 });
    await expect(ring.getByText("0/220")).toBeVisible();
  });

  test("le réglage « niveau visible par les colocs » se sauvegarde", async ({ page }) => {
    await loginWithSportTab(page);
    await page.goto("/other", GOTO_OPTS);
    const toggle = page.getByTestId("toggle-show-sport-level");
    await toggle.scrollIntoViewIfNeeded();
    await expect(toggle).toBeVisible({ timeout: 15_000 });

    await toggle.click();
    await expect.poll(async () => getShowSportLevel(), { timeout: 10_000 }).toBe(false);

    await toggle.click();
    await expect.poll(async () => getShowSportLevel(), { timeout: 10_000 }).toBe(true);
  });

  test("l'appui long sur + incrémente en continu", async ({ page }) => {
    const EX = `${TEST_PREFIX}hold-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    await page.getByTestId("add-series").click();
    const count = page.getByTestId("rep-count").first();
    await expect(count).toBeVisible({ timeout: 10_000 });

    // Maintien du bouton + pendant ~1s : délai 400ms puis un pas toutes les 90ms.
    await page.getByTestId("rep-plus").first().click({ delay: 1000 });

    // Le compteur a progressé de plusieurs unités (1 initial + tap + répétitions).
    await expect
      .poll(async () => parseInt((await count.textContent()) ?? "0", 10), { timeout: 10_000 })
      .toBeGreaterThan(3);
  });
});
