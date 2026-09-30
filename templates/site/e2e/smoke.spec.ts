import { expect, test } from "@playwright/test";

test("shows its honest label", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("honest-label")).toHaveText("__LABEL__");
});

test("is usable with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
