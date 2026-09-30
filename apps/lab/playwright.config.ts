import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// Behaviour tests run against the production build (`pnpm build` first).
// Set PW_CHANNEL=chrome (or msedge) to test with an installed browser when the
// bundled Chromium cannot be downloaded. CI leaves it unset.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...channel } }],
  webServer: {
    command: "pnpm start",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
