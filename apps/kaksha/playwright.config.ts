import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3500;

// Set PW_CHANNEL=chrome (or msedge) to test with an installed browser when the
// bundled Chromium cannot be downloaded. CI leaves it unset.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

// Against the local production build (`pnpm build` first), or against a deployed preview:
// KAKSHA_BASE_URL=https://… KAKSHA_SHARE_URL=https://…?_vercel_share=… pnpm e2e
const remote = process.env.KAKSHA_BASE_URL;
const state = path.join(import.meta.dirname, "test-results", "remote-state.json");

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  ...(remote ? { globalSetup: "./e2e/remote-setup.ts" } : {}),
  use: {
    baseURL: remote ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
    serviceWorkers: "allow",
    ...(remote && process.env.KAKSHA_SHARE_URL ? { storageState: state } : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...channel } }],
  ...(remote
    ? {}
    : {
        webServer: {
          command: `node node_modules/next/dist/bin/next start --port ${PORT}`,
          url: `http://localhost:${PORT}`,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }),
});
