import { test, expect } from "@playwright/test";
import { login, clearSession } from "./helpers";

test.describe("Authentication", () => {
  test("login page loads", async ({ page }) => {
    await clearSession(page);
    await expect(page.getByText("Tipi")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByPlaceholder("Mot de passe")).toBeVisible();
  });

  test("login with valid credentials", async ({ page }) => {
    await login(page);
    await expect(page.getByText("Accueil")).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await clearSession(page);
    await page.getByPlaceholder("Email").fill("invalid@test.com");
    await page.getByPlaceholder("Mot de passe").fill("wrongpassword");
    await page.getByText("Se connecter", { exact: true }).click();
    await expect(page.getByText(/Invalid|invalid|erreur|introuvable/i)).toBeVisible({ timeout: 10_000 });
  });

  test("empty form shows validation error", async ({ page }) => {
    await clearSession(page);
    await expect(page.getByPlaceholder("Email")).toBeVisible({ timeout: 10_000 });
    await page.getByText("Se connecter", { exact: true }).click();
    await expect(page.getByText("Email et mot de passe sont obligatoires")).toBeVisible();
  });
});
