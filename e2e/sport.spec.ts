import { test, expect, Page } from "@playwright/test";
import { login, GOTO_OPTS } from "./helpers";
import { cleanupByPrefix, seedSportLog, getShowSportLevel, setSportTitle, TEST_PREFIX } from "./db";

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
  // Le titre choisi référence un badge d'exercice E2E supprimé : on le réinitialise.
  await setSportTitle(null);
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

/**
 * Ferme l'overlay « Niveau atteint » s'il se déclenche (dépend de l'historique
 * accumulé par les tests précédents du run) — il intercepte les clics sinon.
 */
async function dismissLevelUpIfShown(page: Page) {
  const overlay = page.getByText("Niveau atteint");
  try {
    await overlay.waitFor({ state: "visible", timeout: 4000 });
    await overlay.click();
    await overlay.waitFor({ state: "hidden", timeout: 5000 });
  } catch {
    // Pas d'overlay : rien à faire.
  }
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

/** Déplie la carte "Progression" (badges/titres repliés par défaut, proposition A). */
async function openProgression(page: Page) {
  // L'overlay de déblocage couvre le toggle : on attend qu'il ait disparu (auto ~3 s).
  await page.getByText("Badge débloqué").waitFor({ state: "hidden", timeout: 6_000 }).catch(() => {});
  const toggle = page.getByTestId("progression-toggle");
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  await toggle.click();
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
    await openProgression(page);

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

    // L'overlay de déblocage célèbre le badge du palier 100 puis se referme.
    await expect(page.getByText("Badge débloqué")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Badge débloqué")).toBeHidden({ timeout: 10_000 });

    // Déplie la progression : le badge 100 est débloqué, 500 révélé, 3 cachés.
    await openProgression(page);
    await expect(page.getByTestId("badge-unlocked-100")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("badge-next-500").getByText(`${EX} — Vétéran`)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId(/^badge-hidden-/)).toHaveCount(3);

    // Régression : l'overlay ne doit PAS se relancer après une modification de série.
    await expect(page.getByText("Badge débloqué")).toBeHidden({ timeout: 10_000 });
    await page.getByTestId("rep-plus").first().click();
    await page.waitForTimeout(1500);
    await expect(page.getByText("Badge débloqué")).toBeHidden();
  });

  test("le badge se re-bloque quand les répétitions repassent sous le seuil", async ({ page }) => {
    const EX = `${TEST_PREFIX}relock-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // Débloque le palier 100 (120 reps).
    await page.getByTestId("add-series").click();
    const count = page.getByTestId("rep-count").first();
    await count.click();
    await page.getByTestId("rep-input").fill("120");
    await page.keyboard.press("Enter");
    // Laisse l'overlay de déblocage apparaître puis se refermer avant de déplier.
    await expect(page.getByText("Badge débloqué")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Badge débloqué")).toBeHidden({ timeout: 10_000 });
    await openProgression(page);
    await expect(page.getByTestId("badge-unlocked-100")).toBeVisible({ timeout: 15_000 });

    // Redescend à 50 : le badge doit se re-bloquer et redevenir "prochain palier".
    await count.click();
    await page.getByTestId("rep-input").fill("50");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("badge-next-100")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("badge-unlocked-100")).toHaveCount(0);
  });

  test("l'overlay ne se relance pas en rouvrant un exercice déjà débloqué", async ({ page }) => {
    const EX = `${TEST_PREFIX}reopen-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // Débloque un badge : l'overlay apparaît puis disparaît.
    await seedSportLog(EX, 200, 1);
    await page.getByTestId("add-series").click();
    await expect(page.getByText("Badge débloqué")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Badge débloqué")).toBeHidden({ timeout: 10_000 });

    // Revient à la liste puis rouvre le même exercice : aucun overlay.
    await page.goto("/sport", GOTO_OPTS);
    await page.getByTestId(`sport-card-${EX}`).click();
    await expect(page.getByTestId("add-series")).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2000);
    await expect(page.getByText("Badge débloqué")).toBeHidden();
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
    const card = page.getByTestId(`sport-card-${EX}`);
    const ring = card.getByTestId("daily-goal-ring");
    await expect(ring).toBeVisible({ timeout: 15_000 });
    await expect(ring.getByText("0/220")).toBeVisible();

    // Tableau de bord : la carte porte sa tendance 7 jours.
    await expect(card.getByTestId("mini-sparkline")).toBeVisible();
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

  test("les records personnels apparaissent au niveau 3", async ({ page }) => {
    const EX = `${TEST_PREFIX}records-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // 400 reps hier -> 400 XP + 50 (badge 100) = 450 -> niveau 3
    await seedSportLog(EX, 400, 1);
    await page.goto("/sport", GOTO_OPTS);
    const card = page.getByTestId(`sport-card-${EX}`);
    await expect(card).toBeVisible({ timeout: 20_000 });
    await dismissLevelUpIfShown(page);
    await card.click();
    await openProgression(page);

    const records = page.getByTestId("personal-records");
    await expect(records).toBeVisible({ timeout: 15_000 });
    await expect(records.getByText("400").first()).toBeVisible();
  });

  test("un titre porté par la grâce affiche la bannière « pour garder »", async ({ page }) => {
    const EX = `${TEST_PREFIX}threat-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // 150 reps il y a 8 jours : hors fenêtre 7j mais dans la grâce 48h -> titre menacé
    await seedSportLog(EX, 150, 8);
    await page.goto("/sport", GOTO_OPTS);

    const banner = page.getByTestId("threatened-title").first();
    await expect(banner).toBeVisible({ timeout: 20_000 });
    await expect(banner.getByText(/pour garder/)).toBeVisible();
  });

  test("au niveau 5, le titre affiché se choisit depuis la carte de niveau", async ({ page }) => {
    const EX = `${TEST_PREFIX}title-${Date.now()}`;
    await loginWithSportTab(page);
    await createAndOpenExercise(page, EX);

    // 1500 reps hier -> 1500 XP + 150 (badges 100/500/1000) = 1650 -> niveau 5
    await seedSportLog(EX, 1500, 1);
    await page.goto("/sport", GOTO_OPTS);

    const chip = page.getByTestId("level-chip");
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await expect(chip).toHaveText(/Niv\. [5-9]/, { timeout: 15_000 });
    await dismissLevelUpIfShown(page);

    // Ouvre le sélecteur de titre et choisit le badge Centurion de cet exercice.
    await page.getByTestId("level-header").click();
    const option = page.getByTestId(/^title-option-/).filter({ hasText: `${EX} — Centurion` });
    await expect(option).toBeVisible({ timeout: 10_000 });
    await option.click();

    // Le chip affiche le titre choisi à la place du niveau.
    await expect(chip).toHaveText(`${EX} — Centurion`, { timeout: 15_000 });

    // Retour à « Aucun titre » pour ne pas polluer les runs suivants.
    await page.getByTestId("level-header").click();
    await page.getByTestId("title-option-none").click();
    await expect(chip).toHaveText(/Niv\. [5-9]/, { timeout: 15_000 });
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
