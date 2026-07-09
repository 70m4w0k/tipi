import { test, expect } from "@playwright/test";
import { submitLogin } from "./helpers";
import { resetSolo, ensureFixtureHousehold, seedPending, SOLO_EMAIL, FIX_PW } from "./fixtures";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

// État de l'utilisateur solo partagé -> exécution en série.
test.describe.configure({ mode: "serial" });

let inviteCode: string;
let householdId: string;

test.beforeAll(async () => {
  const f = await ensureFixtureHousehold();
  inviteCode = f.inviteCode;
  householdId = f.householdId;
});

test.beforeEach(async () => {
  await resetSolo();
});

test.afterAll(async () => {
  await resetSolo();
  await cleanupByPrefix(TEST_PREFIX);
});

// Attend l'écran /join AVEC le profil chargé (sinon create/join partent sur profile null).
async function openJoin(page: import("@playwright/test").Page) {
  await submitLogin(page, SOLO_EMAIL, FIX_PW);
  // Attendre le nom d'affichage (= profil chargé), pas juste "Bienvenue,".
  await expect(page.getByText("Bienvenue, e2e-solo !")).toBeVisible({ timeout: 15_000 });
}

test.describe("Onboarding — créer / rejoindre / claim", () => {
  test("créer une coloc affiche le code d'invitation", async ({ page }) => {
    await openJoin(page);
    await page.getByPlaceholder("Nom de la coloc (ex: Appart Belleville)").fill(`${TEST_PREFIX}solo-${Date.now()}`);
    await page.getByText("Créer", { exact: true }).click();
    // Succès (carte "Coloc créée !") puis redirection auto vers l'accueil.
    await expect(
      page.getByText("Coloc créée !").or(page.getByText("Accueil"))
    ).toBeVisible({ timeout: 15_000 });
  });

  test("rejoindre une coloc via code -> écran claim", async ({ page }) => {
    await openJoin(page);
    await page.getByPlaceholder("Code d'invitation (6 caractères)").fill(inviteCode);
    await page.getByText("Rejoindre", { exact: true }).click();
    await expect(page.getByText("Qui es-tu ?")).toBeVisible({ timeout: 15_000 });
  });

  test("claim : sélectionner un membre pré-ajouté -> accueil", async ({ page }) => {
    const pending = `${TEST_PREFIX}pending-${Date.now()}`;
    await seedPending(householdId, pending);

    await openJoin(page);
    await page.getByPlaceholder("Code d'invitation (6 caractères)").fill(inviteCode);
    await page.getByText("Rejoindre", { exact: true }).click();
    await expect(page.getByText("Qui es-tu ?")).toBeVisible({ timeout: 15_000 });

    await page.getByText(pending, { exact: true }).click();
    await page.getByText("C'est moi !", { exact: true }).click();
    await expect(page.getByText("Accueil")).toBeVisible({ timeout: 15_000 });
  });
});
