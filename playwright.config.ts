import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:8082",
    headless: true,
    screenshot: "only-on-failure",
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npx expo start --web --port 8082",
    port: 8082,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
