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
    await page.getByRole("slider", { name: "Top diameter" }).fill("0.42");
    await expect(page.getByTestId("sl-shape")).toHaveText("rectangle");
    await expect(page.getByTestId("sl-size")).toHaveText("264 x 100 mm");
    await page.getByRole("slider", { name: "Coverage" }).fill("180");
    await expect(page.getByTestId("sl-size")).toHaveText("132 x 100 mm");

    // The turn is keyboard-driven too.
    const turn = page.getByRole("slider", { name: "Turn" });
    await turn.focus();
    await page.keyboard.press("ArrowRight");
    await expect(turn).toHaveValue("1");
  });

  test("turns Play off under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/sleeve");
    // The label art is drawn on the main thread; on a software-rendered runner the demo
    // settles slowly, so wait for its own reduced-motion note first.
    await expect(page.getByText("Reduced motion is on")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});

test.describe("freight", () => {
  test("optimises the careless fan, judges it, and flips the verdict when meshes are joined", async ({
    page,
  }) => {
    await page.goto("/freight");
    const status = page.getByTestId("fr-status");
    await expect(status).toContainText("Done", { timeout: 20_000 });
    const verdict = page.getByTestId("fr-verdict");
    await expect(verdict).toHaveAttribute("data-pass", "false");
    const table = page.getByTestId("fr-table");
    await expect(table.locator('tr[data-metric="drawCalls"]')).toHaveAttribute(
      "data-pass",
      "false",
    );
    await expect(table.locator('tr[data-metric="bytes"]')).toHaveAttribute("data-pass", "true");
    await expect(table.locator('tr[data-metric="maxTextureSize"]')).toContainText(
      "1024 px, image/webp",
    );
    await expect(page.getByTestId("fr-names")).toContainText("renamed");
    await expect(page.getByTestId("fr-tsx")).toContainText("export function Fan(");
    await expect(page.getByTestId("fr-download")).toHaveAttribute("download", "fan.freight.glb");
    await expect
      .poll(() => litPixels(page, '[data-demo="freight"] canvas'), { timeout: 15_000 })
      .toBeGreaterThan(200);

    await page.getByRole("checkbox", { name: "Join meshes that share a material" }).check();
    await expect(verdict).toHaveAttribute("data-pass", "true", { timeout: 20_000 });
    await expect(table.locator('tr[data-metric="drawCalls"] td').nth(1)).toHaveText("3");
  });

  test("holds the preview still under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/freight");
    await expect(page.getByText("Reduced motion is on: the preview holds still.")).toBeVisible();
  });
});

test.describe("understudy", () => {
  test("steps quality down on slow frames, then hands off to the sequence; retries and context loss", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    await page.goto("/understudy");
    // CI renders WebGL in software, so the device is set rather than detected.
    await page.getByRole("radio", { name: "Capable GPU" }).check();
    const rung = page.getByTestId("ud-rung");
    await expect(rung).toHaveText("WebGL", { timeout: 15_000 });
    await expect
      .poll(() => litPixels(page, '[data-demo="understudy"] canvas'), { timeout: 15_000 })
      .toBeGreaterThan(200);

    await page.getByRole("slider", { name: "Simulated frame time" }).fill("45");
    await expect(page.getByTestId("ud-shadows")).toHaveText("off", { timeout: 20_000 });
    await expect(page.getByTestId("ud-log")).toContainText(/fps of \d+ Hz: "No shadows"/);
    await expect(rung).toHaveText("Image sequence", { timeout: 30_000 });
    await expect(page.getByTestId("ud-log")).toContainText("handing off to the image sequence");
    await expect(page.getByTestId("ud-reel")).toBeVisible();

    await page.getByRole("radio", { name: "Measured" }).check();
    await page.getByRole("button", { name: "Try WebGL again" }).click();
    await expect(rung).toHaveText("WebGL");
    await page.getByRole("button", { name: "Lose the WebGL context" }).click();
    await expect(rung).toHaveText("Image sequence");
    await expect(page.getByTestId("ud-log")).toContainText("The WebGL context was lost");
  });

  test("starts on the sequence without WebGL, and on the poster under reduced motion", async ({
    page,
  }) => {
    await page.goto("/understudy");
    await page.getByRole("radio", { name: "No WebGL" }).check();
    await expect(page.getByTestId("ud-rung")).toHaveText("Image sequence");
    await expect(page.getByTestId("ud-log")).toContainText("WebGL is not available");
    await page.getByRole("checkbox", { name: "Reduced motion" }).check();
    await expect(page.getByTestId("ud-rung")).toHaveText("Poster");
    await expect(page.getByRole("img", { name: /as a still poster/ })).toBeVisible();
  });
});
