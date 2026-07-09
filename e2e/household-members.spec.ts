import { test, expect } from "@playwright/test";
import { login } from "./helpers";
import { ensureFixtureHousehold, ADMIN_EMAIL, FIX_PW } from "./fixtures";

test.describe.configure({ mode: "serial" });

let memberUid: string;

test.beforeEach(async () => {
  // Remet le membre dans le household avec le rôle « member ».
  const f = await ensureFixtureHousehold();
  memberUid = f.memberUid;
});

async function openMembers(page: import("@playwright/test").Page) {
  await login(page, ADMIN_EMAIL, FIX_PW);
  await page.getByTestId("profile-button").click();
  const row = page.getByTestId(`member-${memberUid}`);
  await expect(row).toBeVisible({ timeout: 15_000 });
  return row;
}

test("promouvoir puis rétrograder un membre", async ({ page }) => {
  const row = await openMembers(page);
  await expect(row.getByText("Membre", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByTestId(`member-promote-${memberUid}`).click();
  await page.getByText("Promouvoir", { exact: true }).click();
  await expect(row.getByText("Admin", { exact: true })).toBeVisible({ timeout: 10_000 });

  await page.getByTestId(`member-demote-${memberUid}`).click();
  await page.getByText("Rétrograder", { exact: true }).click();
  await expect(row.getByText("Membre", { exact: true })).toBeVisible({ timeout: 10_000 });
});

test("exclure un membre", async ({ page }) => {
  const row = await openMembers(page);
  await page.getByTestId(`member-kick-${memberUid}`).click();
  await page.getByText("Exclure", { exact: true }).click();
  await expect(page.getByTestId(`member-${memberUid}`)).toHaveCount(0, { timeout: 10_000 });
});
