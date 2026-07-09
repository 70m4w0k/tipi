import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { resetDeleter, DELETER_EMAIL, FIX_PW } from "./fixtures";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  // (Re)crée une coloc jetable dont le deleter est admin.
  await resetDeleter();
});

test("supprimer la coloc redirige vers l'onboarding", async ({ page }) => {
  await login(page, DELETER_EMAIL, FIX_PW);
  await page.getByTestId("profile-button").click();
  await expect(page.getByText("Se déconnecter")).toBeVisible({ timeout: 15_000 });

  await page.getByText("Supprimer la coloc", { exact: true }).click();
  await expect(page.getByText("Supprimer la coloc ?")).toBeVisible({ timeout: 10_000 });
  await page.getByText("Supprimer", { exact: true }).click();

  // Plus de household -> écran de création/join.
  await expect(page.getByText("Rejoindre une coloc")).toBeVisible({ timeout: 15_000 });
});
