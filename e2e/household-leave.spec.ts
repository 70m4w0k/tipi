import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { resetLeaver, LEAVER_EMAIL, FIX_PW } from "./fixtures";

test.describe.configure({ mode: "serial" });

test.beforeEach(async () => {
  await resetLeaver();
});

test("quitter la coloc redirige vers l'onboarding", async ({ page }) => {
  await login(page, LEAVER_EMAIL, FIX_PW);
  await page.getByTestId("profile-button").click();
  await expect(page.getByText("Se déconnecter")).toBeVisible({ timeout: 15_000 });

  await page.getByText("Quitter la coloc", { exact: true }).click();
  await expect(page.getByText("Quitter la coloc ?")).toBeVisible({ timeout: 10_000 });
  await page.getByText("Quitter", { exact: true }).click();

  // Sans household -> écran de création/join.
  await expect(page.getByText("Rejoindre une coloc")).toBeVisible({ timeout: 15_000 });
});
