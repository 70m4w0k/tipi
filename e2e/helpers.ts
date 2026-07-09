import { Page, expect } from "@playwright/test";

// Utilisateur principal des tests. Créé via signUp dans le global-setup (env-agnostique :
// fonctionne sur Supabase local comme cloud, sans compte pré-existant).
import { MAIN_EMAIL, FIX_PW } from "./fixtures";
export const TEST_EMAIL = MAIN_EMAIL;
export const TEST_PASSWORD = FIX_PW;

// Expo dev server streams JS bundles — "load" never fires during dev.
// Use "commit" and then wait for content.
const GOTO_OPTS = { waitUntil: "commit" as const, timeout: 30_000 };

export async function clearSession(page: Page) {
  await page.context().clearCookies();
  await page.goto("about:blank");
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
  });
  // Force l'onboarding à "déjà vu" AVANT le chargement de l'app : sinon l'overlay
  // plein écran s'affiche et bloque tous les clics de navigation.
  await page.addInitScript(() => {
    try { localStorage.setItem("onboarding_done", "true"); } catch {}
  });
  await page.goto("/login", GOTO_OPTS);
  // Wait for the SPA to actually render
  await page.waitForSelector("input, [role='textbox']", { timeout: 30_000 });
}

// Soumet le formulaire de login sans présumer de la destination (home OU join).
export async function submitLogin(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await clearSession(page);
  const emailInput = page.getByPlaceholder("Email");
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);
  await page.getByPlaceholder("Mot de passe").fill(password);
  await page.getByText("Se connecter", { exact: true }).click();
}

// Login d'un utilisateur AVEC household (atterrit sur l'accueil).
export async function login(page: Page, email = TEST_EMAIL, password = TEST_PASSWORD) {
  await submitLogin(page, email, password);
  await expect(page.getByText("Accueil")).toBeVisible({ timeout: 15_000 });
}

export { GOTO_OPTS };
