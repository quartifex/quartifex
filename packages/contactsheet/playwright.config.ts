import { defineConfig, devices } from "@playwright/test";

// Behaviour tests run the matrix against a synthetic page written to a temp folder,
// so no server is needed. PW_CHANNEL=chrome uses an installed browser.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...channel } }],
});
