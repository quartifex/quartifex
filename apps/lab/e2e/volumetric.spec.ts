import { expect, type Page, test } from "@playwright/test";

// P5V: volumetric light in both variants, one set of controls, tier-aware, still under
// reduced motion.

/** Mean red and blue, and lit pixels, of a canvas, read back through a 2D copy. */
async function sample(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = 160;
      copy.height = 90;
      const ctx = copy.getContext("2d");
      if (!ctx) return { r: 0, b: 0, lit: 0, sum: 0 };
      ctx.drawImage(canvas, 0, 0, 160, 90);
      const { data } = ctx.getImageData(0, 0, 160, 90);
      let r = 0;
      let b = 0;
      let lit = 0;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const R = data[i] ?? 0;
        const G = data[i + 1] ?? 0;
        const B = data[i + 2] ?? 0;
        r += R;
        b += B;
        sum += (R + G + B) * ((i / 4) % 89);
        if (R + G + B > 180) lit++;
      }
      const n = data.length / 4;
      return { r: r / n, b: b / n, lit, sum };
    });
}

test.describe("volumetric", () => {
  test("lights the grove with the WebGL pass, and steps quality with the GPU tier", async ({
    page,
  }) => {
    await page.goto("/volumetric");
    await expect(page.getByTestId("vl-variant")).toHaveText("WebGL pass");
    await expect
      .poll(async () => (await sample(page, '[data-testid="vl-stage"] canvas')).lit, {
        timeout: 15_000,
      })
      .toBeGreaterThan(100);
    await expect(page.getByTestId("vl-samples")).toHaveText("48");
    await page.getByRole("radio", { name: "0", exact: true }).check();
    await expect(page.getByTestId("vl-samples")).toHaveText("16");
    await page.getByRole("radio", { name: "3", exact: true }).check();
    await expect(page.getByTestId("vl-samples")).toHaveText("72");
  });

  test("draws the canvas overlay, warm or cool by colour temperature", async ({ page }) => {
    await page.goto("/volumetric");
    await page.getByRole("radio", { name: "Canvas overlay" }).check();
    await expect(page.getByTestId("vl-variant")).toHaveText("Canvas overlay");
    const overlay = '[data-volumetric="overlay"]';
    await expect
      .poll(async () => (await sample(page, overlay)).lit, { timeout: 10_000 })
      .toBeGreaterThan(50);

    const temperature = page.getByRole("slider", { name: "Colour temperature" });
    await temperature.fill("2000");
    await expect(page.getByTestId("vl-light")).toContainText("2000 K");
    await page.waitForTimeout(300);
    const warm = await sample(page, overlay);
    await temperature.fill("9500");
    await expect(page.getByTestId("vl-light")).toContainText("9500 K");
    await page.waitForTimeout(300);
    const cool = await sample(page, overlay);
    expect(warm.r / Math.max(warm.b, 1)).toBeGreaterThan(cool.r / Math.max(cool.b, 1));
  });

  test("holds the light still under reduced motion, in both variants", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/volumetric");
    await expect(page.getByTestId("vl-motion")).toHaveText("still");
    await expect(page.getByText("Reduced motion is on")).toBeVisible();
    const stage = '[data-testid="vl-stage"] canvas';
    await expect
      .poll(async () => (await sample(page, stage)).lit, { timeout: 15_000 })
      .toBeGreaterThan(100);
    const a = await sample(page, stage);
    await page.waitForTimeout(800);
    expect((await sample(page, stage)).sum).toBe(a.sum);

    await page.getByRole("radio", { name: "Canvas overlay" }).check();
    const overlay = '[data-volumetric="overlay"]';
    await expect
      .poll(async () => (await sample(page, overlay)).lit, { timeout: 10_000 })
      .toBeGreaterThan(50);
    const b = await sample(page, overlay);
    await page.waitForTimeout(800);
    expect((await sample(page, overlay)).sum).toBe(b.sum);
  });

  test("is keyboard operable", async ({ page }) => {
    await page.goto("/volumetric");
    const density = page.getByRole("slider", { name: "Density" });
    await density.focus();
    await page.keyboard.press("ArrowRight");
    await expect(density).toHaveValue("0.66");
  });
});
