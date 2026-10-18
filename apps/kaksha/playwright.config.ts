import { defineConfig, devices } from "@playwright/test";

const PORT = 3500;

// Set PW_CHANNEL=chrome (or msedge) to test with an installed browser when the
// bundled Chromium cannot be downloaded. CI leaves it unset.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

// Against the production build: `pnpm build` first.
export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry", serviceWorkers: "allow" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...channel } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next start --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
