import { expect, test } from "@playwright/test";

// The weekly-drop seeds: each page renders its demo, and the one control that defines it works.
test.describe("Lab seeds, weekly drops", () => {
  // the logo preloader is skipped, as on a return visit, so it never covers a control
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem("qx-pl", "1");
      } catch {}
    });
  });

  test("blendframes loads only the keyframes and switches its in-between", async ({ page }) => {
    await page.goto("/lab/blendframes");
    await expect(page.getByTestId("bf-keys")).toHaveText(/^12 of 12 loaded/, { timeout: 20_000 });
    await page.getByRole("radio", { name: "Every 12th" }).check();
    await expect(page.getByTestId("bf-keys")).toHaveText(/of 6 loaded/);
    await page.getByRole("radio", { name: "Cut" }).check();
    await expect(page.getByTestId("bf-mode")).toHaveText("Cut");
  });

  test("glint follows the scroll inside its stage", async ({ page }) => {
    await page.goto("/lab/glint");
    const area = page.getByTestId("gl-scroll");
    await area.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await expect(page.getByTestId("gl-pos")).toHaveText("100%");
  });

  test("ink-dissolve, odometer and draw-path advance with the scroll", async ({ page }) => {
    for (const [path, area, readout, done] of [
      ["/lab/ink-dissolve", "id-scroll", "id-t", "100%"],
      ["/lab/odometer", "od-scroll", "od-12840", "12840"],
      ["/lab/draw-path", "dp-scroll", "dp-drawn", "100%"],
    ] as const) {
      await page.goto(path);
      await page.getByTestId(area).evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await expect(page.getByTestId(readout)).toHaveText(done);
    }
  });

  test("label-peel holds a sticker peeled on tap", async ({ page }) => {
    await page.goto("/lab/label-peel");
    const sticker = page.getByTestId("lp-0");
    await sticker.click();
    await expect(sticker).toHaveAttribute("aria-pressed", "true");
  });

  test("mini-explode and logo-extrude mount a canvas", async ({ page }) => {
    await page.goto("/lab/mini-explode");
    await expect(page.getByTestId("me-stage").locator("canvas")).toHaveCount(1);
    await page.goto("/lab/logo-extrude");
    await expect(page.getByTestId("le-stage").locator("canvas")).toHaveCount(1);
  });

  test("the remaining seeds render", async ({ page }) => {
    for (const name of ["grain", "halftone", "lit-grid", "velocity"]) {
      await page.goto(`/lab/${name}`);
      await expect(page.locator(`[data-demo="${name}"]`)).toBeVisible();
    }
  });
});
