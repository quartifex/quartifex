import { defineConfig, devices } from "@playwright/test";

// The helpers are tested against synthetic pages built in each test (page.setContent),
// so no server is needed. PW_CHANNEL=chrome uses an installed browser.
const channel = process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {};

export default defineConfig({
  testDir: "./e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], ...channel } }],
});
