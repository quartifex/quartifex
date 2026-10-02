import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

// The hub's layout pass: item pages lead with the item (identity strip, then the demo,
// above the fold), GitHub links are visible, credits are on every page, and safeframe's
// copy stays clear of the subject on near-square screens.

const catalog = JSON.parse(
  readFileSync(new URL("../../../catalog/catalog.json", import.meta.url), "utf8"),
) as Array<{ name: string; kind: string; state: string }>;
const built = catalog.filter((e) => e.state === "built");
const REPO = "https://github.com/quartifex/quartifex";

test.describe("hub chrome", () => {
  test("links the repository, credits what we build on, and links each built card's source", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("repo-link")).toHaveAttribute("href", REPO);
    const credits = page.getByTestId("built-on");
    for (const name of ["Three.js", "GSAP", "react-three-fiber", "drei", "detect-gpu"]) {
      await expect(credits.getByRole("link", { name, exact: true })).toBeVisible();
    }
    await expect(credits.getByRole("link", { name: "Poimandres" })).toHaveAttribute(
      "href",
      "https://pmnd.rs/",
    );
    const sources = page.getByTestId("card-source");
    await expect(sources).toHaveCount(built.length);
    await expect(
      page.getByRole("link", { name: "Source code for heft on GitHub" }),
    ).toHaveAttribute("href", `${REPO}/tree/main/packages/heft`);
    await expect(
      page.getByRole("link", { name: "Source code for frameguide on GitHub" }),
    ).toHaveAttribute("href", `${REPO}/tree/main/apps/lab/src/seeds/frameguide`);
  });
});

/** Top of an element relative to the page. */
async function top(page: Page, testid: string) {
  return page.getByTestId(testid).evaluate((el) => el.getBoundingClientRect().top + scrollY);
}

test.describe("item pages", () => {
  for (const item of built.filter((e) => e.kind !== "site")) {
    test(`${item.name}: identity and source first, then the demo above the fold, facts after`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(item.kind === "lab" ? `/lab/${item.name}` : `/${item.name}`);
      const source = page.getByTestId("item-source");
      await expect(source).toBeInViewport();
      if (item.kind === "lib") {
        await expect(page.getByTestId("item-readme")).toHaveAttribute(
          "href",
          `${REPO}/tree/main/packages/${item.name}#readme`,
        );
      }
      const demoTop = await top(page, "item-demo");
      expect(demoTop).toBeLessThan(450);
      const about = await page
        .getByRole("heading", { name: `About ${item.name}` })
        .evaluate((el) => el.getBoundingClientRect().top + scrollY);
      expect(about).toBeGreaterThan(demoTop);
    });
  }
});

test("heft leads with the budget numbers before anything is run", async ({ page }) => {
  await page.goto("/heft");
  const board = page.getByTestId("hf-scoreboard");
  await expect(board).toBeInViewport();
  await expect(board).toContainText("Transfer on load");
  await expect(board).toContainText("budget 1.46 MB");
  await expect(page.getByTestId("hf-verdict")).toContainText("Run heft");
});

/** Do the copy block and the staged subject overlap? */
async function copyOverlapsSubject(page: Page) {
  return page.getByTestId("scene").evaluate((scene) => {
    const [x, y, w, h] = (scene.getAttribute("data-sf-subject") ?? "").split(" ").map(Number);
    const copy = scene.querySelector("[data-sf-text]");
    if (!copy || x === undefined || y === undefined || w === undefined || h === undefined) {
      return "missing";
    }
    const box = scene.getBoundingClientRect();
    // Measure what is drawn, including anything that would spill out of the zone.
    let right = 0;
    let bottom = 0;
    let left = Number.POSITIVE_INFINITY;
    let topEdge = Number.POSITIVE_INFINITY;
    for (const child of Array.from(copy.children)) {
      const r = child.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      left = Math.min(left, r.left - box.left);
      topEdge = Math.min(topEdge, r.top - box.top);
      right = Math.max(right, r.right - box.left);
      bottom = Math.max(bottom, r.bottom - box.top);
    }
    const overlaps = left < x + w && right > x && topEdge < y + h && bottom > y;
    return overlaps ? `overlaps (${Math.round(left)},${Math.round(topEdge)})` : "clear";
  });
}

test.describe("safeframe near 1:1", () => {
  const sizes = [
    [900, 900],
    [720, 900],
    [800, 900],
    [1000, 800],
    [900, 800],
    [768, 1024],
    [1024, 768],
    [1280, 800],
    [1366, 1024],
  ] as const;
  for (const prop of ["watch", "jar"] as const) {
    for (const [width, height] of sizes) {
      test(`${prop} at ${width} x ${height}: the copy stays clear of the subject`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height });
        await page.goto(`/scene?prop=${prop}`);
        await expect(page.getByTestId("scene")).toBeVisible();
        await expect.poll(() => copyOverlapsSubject(page)).toBe("clear");
      });
    }
  }

  test("the demo says so at 1:1", async ({ page }) => {
    await page.goto("/safeframe");
    await page.getByRole("radio", { name: "1:1" }).check();
    await expect(page.getByTestId("sf-copy")).toHaveText("Clear of the subject");
    await expect(page.getByTestId("sf-subject")).toHaveText("Whole");
  });
});
