import { expect, type Page, test } from "@playwright/test";

// Behaviour tests for the P5 demos: sleeve (labels on a jar), freight (a GLB through the
// preset, with its verdict), understudy (the quality ladder and the hand-off to reel).

/** Non-background pixels in a canvas, read back through a 2D copy. */
async function litPixels(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = 200;
      copy.height = 150;
      const ctx = copy.getContext("2d");
      if (!ctx) return 0;
      ctx.drawImage(canvas, 0, 0, 200, 150);
      const { data } = ctx.getImageData(0, 0, 200, 150);
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) if ((data[i + 1] ?? 0) > 60) lit++;
      return lit;
    });
}

test.describe("sleeve", () => {
  test("wraps the label, and the die-line follows the taper", async ({ page }) => {
    await page.goto("/sleeve");
    await expect
      .poll(() => litPixels(page, '[data-demo="sleeve"] canvas'), { timeout: 15_000 })
      .toBeGreaterThan(500);
    await expect(page.getByTestId("sl-shape")).toHaveText("sector");
    await expect(page.getByTestId("sl-angle")).not.toHaveText("none");
    const dieline = page.getByRole("img", { name: /The label flat: a sector/ });
    await expect(dieline).toBeVisible();

    // A straight jar: the die-line becomes a rectangle, as wide as the circumference.
    await page.getByRole("slider", { name: "Top diameter" }).fill("0.6");
    await expect(page.getByTestId("sl-shape")).toHaveText("rectangle");
    await expect(page.getByTestId("sl-size")).toHaveText("377 x 90 mm");
    await page.getByRole("slider", { name: "Coverage" }).fill("180");
    await expect(page.getByTestId("sl-size")).toHaveText("188 x 90 mm");

    // The turn is keyboard-driven too.
    const turn = page.getByRole("slider", { name: "Turn" });
    await turn.focus();
    await page.keyboard.press("ArrowRight");
    await expect(turn).toHaveValue("1");
  });

  test("turns Play off under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sleeve");
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
    await expect(page.getByText("Reduced motion is on")).toBeVisible();
  });
});
