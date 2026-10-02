import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// PY: the Lab seeds gallery at /lab, and the light default.

const seeds = (
  JSON.parse(
    readFileSync(new URL("../../../catalog/catalog.json", import.meta.url), "utf8"),
  ) as Array<{
    kind: string;
    name: string;
    state: string;
  }>
).filter((e) => e.kind === "lab");

test.describe("Lab gallery", () => {
  test("shows every seed with its tag, a poster for built ones, and marks recent drops", async ({
    page,
  }) => {
    await page.goto("/lab");
    await expect(page.getByRole("heading", { level: 1, name: "Lab" })).toBeVisible();
    const gallery = page.getByTestId("lab-gallery");
    await expect(gallery.locator("li")).toHaveCount(seeds.length);
    const frameguide = gallery.locator("li", {
      has: page.getByRole("link", { name: "frameguide" }),
    });
    await expect(frameguide).toContainText("Responsive scenes");
    await expect(frameguide.locator("canvas")).toHaveCount(1);
    await expect(gallery.locator("li", { hasText: "glint" })).toContainText("Shaders");
    // Seeds added in the last two weekly drops are marked new: the expected count comes from
    // git here, as it does for the page (none on a shallow clone, which has no history).
    const git = (args: string[]) =>
      execFileSync("git", args, { cwd: new URL("../../../", import.meta.url) })
        .toString()
        .trim();
    const shallow = git(["rev-parse", "--is-shallow-repository"]) !== "false";
    const recent = shallow
      ? 0
      : seeds.filter((s) => {
          if (s.state !== "built") return false;
          const dates = git([
            "log",
            "--diff-filter=A",
            "--format=%cI",
            "--",
            `apps/lab/src/seeds/${s.name}`,
          ]);
          const first = dates.split(/\r?\n/).filter(Boolean).at(-1);
          return first ? (Date.now() - new Date(first).getTime()) / 86_400_000 <= 14 : false;
        }).length;
    await expect(page.getByTestId("lab-new")).toHaveCount(recent);
  });

  test("arrow keys move between cards, Enter opens one, Escape comes back", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/lab");
    // Arrow keys work once the gallery is interactive.
    await expect(page.getByTestId("lab-gallery")).toHaveAttribute("data-ready", "true");
    // The gallery's own order (by build order), as laid out.
    const names = await page.locator("[data-card-link]").allTextContents();
    const card = (i: number) => page.getByRole("link", { name: names[i] ?? "", exact: true });
    await card(0).focus();
    await page.keyboard.press("ArrowRight");
    await expect(card(1)).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const columns = await page
      .getByTestId("lab-gallery")
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    await expect(card(1 + columns)).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(card(columns)).toBeFocused();
    await page.keyboard.press("End");
    const last = names.at(-1) ?? "";
    await expect(page.getByRole("link", { name: last, exact: true })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`/lab/${last}$`));
    await page.locator("body").press("Escape");
    await expect(page).toHaveURL(/\/lab$/);
  });

  test("has a list view that is remembered", async ({ page }) => {
    await page.goto("/lab");
    await expect(page.getByTestId("lab-gallery")).toHaveAttribute("data-ready", "true");
    await page.getByRole("radio", { name: "List" }).check();
    await expect(page.getByTestId("lab-gallery")).toHaveAttribute("data-view", "list");
    await page.reload();
    await expect(page.getByTestId("lab-gallery")).toHaveAttribute("data-view", "list");
    await expect(page.getByTestId("lab-gallery").locator("canvas")).toHaveCount(0);
  });

  test("seed pages lead back to the gallery", async ({ page }) => {
    await page.goto("/lab/frameguide");
    await expect(page.getByRole("link", { name: "Lab", exact: true }).first()).toHaveAttribute(
      "href",
      "/lab",
    );
  });
});
