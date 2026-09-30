import { expect, test } from "@playwright/test";

test.describe("hub", () => {
  test("lists every catalog item, grouped", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("item-card")).toHaveCount(62);
    await expect(page.getByRole("heading", { name: /Libraries\s*29/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sites\s*19/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Lab\s*14/ })).toBeVisible();
  });

  test("filters by kind, status and text", async ({ page }) => {
    await page.goto("/");
    const cards = page.getByTestId("item-card");
    const count = page.getByTestId("result-count");

    await page.getByRole("button", { name: "Sites" }).click();
    await expect(cards).toHaveCount(19);
    await expect(count).toHaveText("19 items");

    await page.getByRole("button", { name: "All" }).first().click();
    await page.getByRole("searchbox", { name: "Search the catalog" }).fill("plumb");
    await expect(cards).toHaveCount(1);
    await expect(count).toHaveText("1 item");

    await page.getByRole("searchbox", { name: "Search the catalog" }).fill("");
    await page.getByRole("button", { name: "Built" }).click();
    // Nothing is built yet; the empty state must say so rather than show a blank page.
    await expect(cards).toHaveCount(0);
    await expect(page.getByText("Nothing matches those filters.")).toBeVisible();
  });

  test("every card has an inline icon and reaches its item page", async ({ page }) => {
    await page.goto("/");
    // Root SVGs only: some icons nest a second <svg> inside.
    await expect(page.locator('[data-testid="item-card"] > div > svg')).toHaveCount(62);
    await page.getByRole("link", { name: /plumb/ }).click();
    await expect(page).toHaveURL(/\/plumb$/);
    await expect(page.getByRole("heading", { level: 1, name: "plumb" })).toBeVisible();
    await expect(page.getByText("Not built yet.")).toBeVisible();
  });

  test("is operable by keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Light theme" })).toBeFocused();
  });

  test("switches theme and remembers it", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");
    await page.getByRole("button", { name: "Light theme" }).click();
    await expect(html).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
    await expect(page.getByRole("button", { name: "Light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("honours reduced motion: icon animation is switched off", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const running = await page
      .locator('[data-testid="item-card"] svg')
      .first()
      .evaluate(
        (svg) =>
          svg.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length,
      );
    expect(running).toBe(0);
  });

  test("unknown items are a 404", async ({ page }) => {
    const response = await page.goto("/not-a-real-item");
    expect(response?.status()).toBe(404);
  });
});
