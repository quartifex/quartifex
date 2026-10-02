import { expect, type Page, test } from "@playwright/test";

const motion = (page: Page) => page.evaluate(() => document.documentElement.dataset.motion);

/** Collect requests for sequence frames (not the manifest or the poster). */
function frameRequests(page: Page): string[] {
  const urls: string[] = [];
  page.on("request", (r) => {
    if (/\/sequences\/dawn\/w\d+\//.test(r.url())) urls.push(r.url());
  });
  return urls;
}

test("carries its honest label, says the product is fictional, and has one h1", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("honest-label")).toHaveText("Open-source demo");
  await expect(page.getByText("Morrow is a fictional product")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Provenance" })).toContainText("concept visual");
});

test("follows the system: full by default, reduced when the system asks", async ({ browser }) => {
  const full = await browser.newPage();
  await full.goto("/");
  expect(await motion(full)).toBe("full");
  await expect(full.getByTestId("mode-now")).toHaveText("Following your system: full");
  await full.close();

  const reduced = await browser.newPage({ reducedMotion: "reduce" });
  await reduced.goto("/");
  expect(await motion(reduced)).toBe("reduced");
  await expect(reduced.getByTestId("mode-now")).toHaveText("Following your system: reduced");
  await reduced.close();
});

test("full: the dawn scrubs with the scroll and the light is drawn", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  const frames = frameRequests(page);
  await page.goto("/?motion=full");
  const hero = page.locator("#dawn");
  await expect(hero).toHaveAttribute("data-moment", "0");
  await expect.poll(() => frames.length).toBeGreaterThan(0);
  for (let i = 0; i < 8; i++) await page.mouse.wheel(0, 500);
  await expect(hero).toHaveAttribute("data-moment", "2");
  // The light canvas has been drawn on (not blank).
  const lit = await page.evaluate(() => {
    const canvas = document.querySelectorAll<HTMLCanvasElement>("#dawn canvas")[1];
    if (!canvas || canvas.width === 0) return false;
    const data = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    return Boolean(data?.some((v, i) => i % 4 === 3 && v > 0));
  });
  expect(lit).toBe(true);
});

test("reduced: one held picture, no frames loaded, no travel", async ({ page }) => {
  const frames = frameRequests(page);
  await page.goto("/?motion=reduced");
  expect(await motion(page)).toBe("reduced");
  await expect(page.locator("#dawn canvas").first()).toBeVisible();
  await page.mouse.wheel(0, 2000);
  await page.waitForTimeout(500);
  expect(frames).toEqual([]);
  // Nothing in the hero is pinned at this level.
  const position = await page
    .locator("#dawn > div")
    .first()
    .evaluate((el) => getComputedStyle(el).position);
  expect(position).not.toBe("sticky");
});

test("static: no canvas, no frames, no animations, the still as a figure", async ({ page }) => {
  const frames = frameRequests(page);
  await page.goto("/?motion=static");
  expect(await motion(page)).toBe("static");
  await expect(page.locator("#dawn canvas").first()).toBeHidden();
  const figure = page.getByRole("img", { name: /the bedroom just after sunrise/ });
  await figure.scrollIntoViewIfNeeded();
  await expect(figure).toBeVisible();
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(500);
  expect(frames).toEqual([]);
  const running = await page.evaluate(
    () => document.getAnimations().filter((a) => a.playState === "running").length,
  );
  expect(running).toBe(0);
});

test("the switch changes the level live and remembers it before first paint", async ({ page }) => {
  await page.goto("/");
  const choose = (name: string) =>
    page.getByTestId("mode-switch").getByRole("radio", { name, exact: true });
  await choose("Static").check();
  await expect.poll(() => motion(page)).toBe("static");
  await expect(page.getByTestId("mode-now")).toHaveText("Showing static");
  await choose("Reduced").check();
  await expect.poll(() => motion(page)).toBe("reduced");

  // Reload: the remembered level is on <html> before any script of the app runs.
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      (window as Window & { __level?: string | undefined }).__level =
        document.documentElement.dataset.motion;
    });
  });
  await page.reload();
  expect(
    await page.evaluate(() => (window as Window & { __level?: string | undefined }).__level),
  ).toBe("reduced");
  await expect(choose("Reduced")).toBeChecked();

  await choose("Auto").check();
  await expect.poll(() => motion(page)).toBe("full");
});

test("is usable from the keyboard: skip link, rail, switch", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip the opening scene" })).toBeFocused();

  // The rail moves focus to the chapter it names.
  const rail = page.getByRole("navigation", { name: "Chapters" });
  await rail.getByRole("link", { name: "The proof" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#proof")).toBeFocused();
  await expect(rail.getByRole("link", { name: "The proof" })).toHaveAttribute(
    "aria-current",
    "step",
  );

  // The switch is a radio group: arrow keys move between levels.
  await page.getByTestId("mode-switch").getByRole("radio", { name: "Auto" }).focus();
  for (const level of ["full", "reduced", "static"]) {
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => motion(page)).toBe(level);
  }
});

test("shows the audit: no axe violations in any level", async ({ page }) => {
  await page.goto("/?motion=static");
  const table = page.getByTestId("audit-table");
  await expect(table).toBeVisible();
  for (const level of ["full", "reduced", "static"]) {
    await expect(page.getByTestId(`axe-${level}`)).toHaveText("0");
  }
  await expect(page.getByTestId("audit-method")).toContainText("axe-core");
});
