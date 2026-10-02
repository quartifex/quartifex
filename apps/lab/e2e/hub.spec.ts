import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// The built count comes from the catalog, so marking an item built never breaks this test.
const catalog = JSON.parse(
  readFileSync(new URL("../../../catalog/catalog.json", import.meta.url), "utf8"),
) as Array<{ state: string }>;
const built = catalog.filter((entry) => entry.state === "built").length;

test.describe("hub", () => {
  test("lists every catalog item, grouped", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("item-card")).toHaveCount(63);
    await expect(page.getByRole("heading", { name: /Libraries\s*30/ })).toBeVisible();
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
    await expect(cards).toHaveCount(built);
    await page.getByRole("searchbox", { name: "Search the catalog" }).fill("bespoke");
    // Nothing matches; the empty state must say so rather than show a blank page.
    await expect(cards).toHaveCount(0);
    await expect(page.getByText("Nothing matches those filters.")).toBeVisible();
  });

  test("every card has an inline icon and reaches its item page", async ({ page }) => {
    await page.goto("/");
    // Root SVGs only: some icons nest a second <svg> inside.
    await expect(page.locator('[data-testid="item-card"] > div > svg')).toHaveCount(63);
    await page.getByRole("link", { name: "plumb", exact: true }).click();
    await expect(page).toHaveURL(/\/plumb$/);
    await expect(page.getByRole("heading", { level: 1, name: "plumb" })).toBeVisible();
    await expect(page.getByText("pnpm add @quartifex/plumb")).toBeVisible();
    await page.goto("/bespoke");
    await expect(page.getByText("Not built yet.")).toBeVisible();
    await page.goto("/");
    await page.getByRole("link", { name: "frameguide", exact: true }).click();
    await expect(page).toHaveURL(/\/lab\/frameguide$/);
  });

  test("is operable by keyboard", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Lab gallery" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "View on GitHub" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Light theme" })).toBeFocused();
  });

  test("defaults to light without a saved choice or an OS preference, and follows a dark OS", async ({
    page,
  }) => {
    const background = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    await page.goto("/");
    // Chrome reports "no preference" as the machine's own setting, so the fallback is read
    // from the stylesheet: the base :root rule (outside any media query) is the light palette.
    const base = await page.evaluate(() => {
      for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
            const bg = rule.style.getPropertyValue("--qx-bg").trim();
            if (bg) return bg;
          }
        }
      }
      return null;
    });
    expect(base).toBe("#f4f2ee");
    await page.emulateMedia({ colorScheme: "light" });
    await expect.poll(background).toBe("rgb(244, 242, 238)");
    await expect(page.getByRole("button", { name: "Light theme" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(background).toBe("rgb(5, 5, 5)");
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

  test("unknown items are a 404, and Lab seeds live only under /lab", async ({ page }) => {
    expect((await page.goto("/not-a-real-item"))?.status()).toBe(404);
    expect((await page.goto("/frameguide"))?.status()).toBe(404);
    expect((await page.goto("/lab/plumb"))?.status()).toBe(404);
  });

  test("a built site is linked only once the catalog says it is live", async ({ page }) => {
    const anyframe = (
      JSON.parse(
        readFileSync(new URL("../../../catalog/catalog.json", import.meta.url), "utf8"),
      ) as Array<{ name: string; live?: boolean }>
    ).find((e) => e.name === "anyframe");
    await page.goto("/anyframe");
    const link = page.getByRole("link", { name: "anyframe.quartifex.com" });
    if (anyframe?.live) {
      await expect(link).toHaveAttribute("href", "https://anyframe.quartifex.com");
    } else {
      await expect(
        page.getByText("anyframe.quartifex.com (built, not deployed yet)"),
      ).toBeVisible();
      await expect(link).toHaveCount(0);
    }
  });
});
