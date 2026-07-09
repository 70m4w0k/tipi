import { test, expect, Page } from "@playwright/test";
import { login } from "./helpers";
import { cleanupByPrefix, TEST_PREFIX } from "./db";

const MSG = `${TEST_PREFIX}chat-${Date.now()}`;
const POLL_Q = `${TEST_PREFIX}poll-${Date.now()}`;

test.afterAll(async () => {
  await cleanupByPrefix(TEST_PREFIX);
});

async function openChat(page: Page) {
  await login(page);
  // Chat n'est pas un onglet par défaut -> tuile d'accès rapide.
  await page.getByText("Chat", { exact: true }).click();
  await expect(page.getByPlaceholder("Message...")).toBeVisible({ timeout: 15_000 });
}

test.describe("Chat", () => {
  test("envoyer un message texte", async ({ page }) => {
    await openChat(page);
    await page.getByPlaceholder("Message...").fill(MSG);
    await page.getByTestId("chat-send").click();
    await expect(page.getByText(MSG, { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("réagir à un message", async ({ page }) => {
    await openChat(page);
    const reactMsg = `${MSG}-react`;
    await page.getByPlaceholder("Message...").fill(reactMsg);
    await page.getByTestId("chat-send").click();
    const bubble = page.getByText(reactMsg, { exact: true });
    await expect(bubble).toBeVisible({ timeout: 10_000 });
    // Appui long -> sélecteur d'emoji -> 👍.
    await bubble.click({ delay: 700 });
    await page.getByText("\u{1F44D}", { exact: true }).click();
    await expect(page.getByText("\u{1F44D}", { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test("le bouton retour revient à l'accueil", async ({ page }) => {
    await openChat(page);
    await page.getByTestId("chat-back").click();
    await expect(page.getByTestId("home-shopping-card")).toBeVisible({ timeout: 15_000 });
  });

  test("créer un sondage et voter", async ({ page }) => {
    await openChat(page);
    await page.getByTestId("chat-poll").click();
    await page.getByPlaceholder("Pose ta question...").fill(POLL_Q);
    await page.getByPlaceholder("Option 1").fill("Oui");
    await page.getByPlaceholder("Option 2").fill("Non");
    await page.getByText("Creer", { exact: true }).click();

    // Le sondage apparaît dans le fil.
    await expect(page.getByText(POLL_Q, { exact: true })).toBeVisible({ timeout: 10_000 });

    // Voter "Oui" -> 1 vote (100%).
    await page.getByText("Oui", { exact: true }).click();
    await expect(page.getByText("1 (100%)")).toBeVisible({ timeout: 10_000 });
  });
});
