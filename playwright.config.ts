import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 1,
  workers: 1, // Expo dev server can only bundle for one browser at a time
  use: {
    baseURL: "http://localhost:8082",
    headless: true,
    screenshot: "only-on-failure",
    navigationTimeout: 15_000,
    actionTimeout: 10_000,
    // Metro's dev-server gzip is pathologically slow (~30s for the 10MB bundle).
    // Force identity encoding so the bundle downloads uncompressed in <1s.
    extraHTTPHeaders: { "Accept-Encoding": "identity" },
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
