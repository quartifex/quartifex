import { expect, test } from "@playwright/test";

// Behaviour tests for the P1 library demos. Each drives the demo the way a visitor would
// (keyboard and pointer), and checks what the library under it did.

test.describe("plumb", () => {
  test("absorbs toolbar and keyboard resizes, and emits once for a real change", async ({
    page,
  }) => {
    await page.goto("/plumb");
    const raw = page.getByTestId("raw-count");
    const layout = page.getByTestId("layout-count");
    await expect(layout).toHaveText("0");

    await page.getByRole("button", { name: "Scroll down" }).click();
    await page.getByRole("button", { name: "Scroll up" }).click();
    await page.getByRole("button", { name: "Scroll down" }).click();
    await page.getByRole("checkbox", { name: "Keyboard" }).check();
    await expect(page.getByTestId("vp-keyboard")).toHaveText("300");
    await page.waitForTimeout(400);
    expect(Number(await raw.textContent())).toBeGreaterThan(3);
    await expect(layout).toHaveText("0");
    // The stable height is the large viewport height, whatever the toolbars do.
    await expect(page.getByTestId("vp-height")).toHaveText(String(844 - 24));

    await page.getByRole("button", { name: "Rotate" }).click();
    await expect(layout).toHaveText("1");
    await expect(page.getByTestId("last-change")).toHaveText("orientation");

    await page.getByRole("radio", { name: "2x" }).check();
    await expect(layout).toHaveText("2");
    await expect(page.getByTestId("last-change")).toHaveText("dpr");
  });

  test("tracks the real window through the React adapter", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto("/plumb");
    await expect(page.getByTestId("win-size")).toHaveText("1200 x 800");
    const height = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--plumb-height"),
    );
    expect(height.trim()).toBe("800px");
    await page.setViewportSize({ width: 1000, height: 800 });
    await expect(page.getByTestId("win-size")).toHaveText("1000 x 800");
    await expect(page.getByTestId("win-changes")).toHaveText("1");
  });

  test("snaps instead of animating under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/plumb");
    await expect(page.getByRole("checkbox", { name: "Reduced motion" })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Keep scrolling" })).toBeDisabled();
    await page.getByRole("button", { name: "Scroll down" }).click();
    // One step, one raw resize: nothing animated.
    await expect(page.getByTestId("raw-count")).toHaveText("1");
  });
});

test.describe("safeframe", () => {
  test("keeps the subject whole where a centred crop cuts it", async ({ page }) => {
    await page.goto("/safeframe");
    const subject = page.getByTestId("sf-subject");
    await page.getByRole("radio", { name: "9:19.5" }).check();
    await expect(page.getByTestId("sf-bucket")).toHaveText("tall-phone");
    await expect(subject).toHaveText("Whole");
    await expect(page.getByTestId("sf-copy")).toHaveText("Clear of the subject");

    await page.getByRole("radio", { name: "Centred crop" }).check();
    await expect(subject).toHaveText("Cut by the frame");
    await page.getByRole("radio", { name: "safeframe" }).check();

    for (const [aspect, bucket] of [
      ["19.5:9", "phone-landscape"],
      ["3:4", "tablet"],
      ["16:10", "laptop"],
      ["16:9", "desktop"],
      ["32:9", "ultrawide"],
    ] as const) {
      await page.getByRole("radio", { name: aspect, exact: true }).check();
      await expect(page.getByTestId("sf-bucket")).toHaveText(bucket);
      await expect(subject).toHaveText("Whole");
    }
  });

  test("sizes the canvas by pixel ratio and is operable by keyboard", async ({ page }) => {
    await page.goto("/safeframe");
    await page.getByRole("radio", { name: "9:19.5" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "9:16" })).toBeChecked();
    await page.getByRole("radio", { name: "2x" }).check();
    await expect(page.getByTestId("sf-canvas")).toHaveText("720 x 1280 px");
    const backing = await page
      .getByTestId("scene")
      .locator("canvas")
      .evaluate((c: HTMLCanvasElement) => `${c.width}x${c.height}`);
    expect(backing).toBe("720x1280");
  });

  test("fits the 3D camera tighter on portrait with FOV compensation", async ({ page }) => {
    await page.goto("/safeframe");
    await page.getByRole("radio", { name: "9:19.5" }).check();
    const distance = page.getByTestId("cam-distance");
    const compensated = Number(await distance.textContent());
    await page.getByRole("checkbox", { name: "Portrait FOV compensation" }).uncheck();
    await expect(distance).not.toHaveText(String(compensated));
    expect(Number(await distance.textContent())).toBeGreaterThan(compensated);
  });

  test("turns Play off under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/safeframe");
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});

test.describe("dailies", () => {
  test("goes to chapters and scrubs the pinned scene", async ({ page }) => {
    await page.goto("/dailies");
    await page.getByRole("button", { name: /^scrub/ }).click();
    await expect(page.getByTestId("dl-chapter")).toHaveText("scrub");
    await page.getByRole("button", { name: /^outro/ }).click();
    await expect(page.getByTestId("dl-chapter")).toHaveText("outro");
    await expect(page.getByTestId("dl-progress")).toHaveText("1.00");
  });

  test("fails raster noise in strict mode, passes it in canvas mode, and fails a regression", async ({
    page,
  }) => {
    await page.goto("/dailies");
    const result = page.getByTestId("dl-result");
    await page.getByRole("radio", { name: "Strict" }).check();
    await expect(result).toHaveText("Fail");
    await page.getByRole("radio", { name: "Canvas-tolerant" }).check();
    await expect(result).toHaveText("Pass");
    await page.getByRole("checkbox", { name: "Introduce a regression" }).check();
    await expect(result).toHaveText("Fail");
  });

  test("measures frames while scrolling through", async ({ page }) => {
    await page.goto("/dailies");
    await page.getByRole("button", { name: "Scroll through" }).click();
    await expect(page.getByTestId("dl-frames")).toBeVisible({ timeout: 5000 });
    expect(Number(await page.getByTestId("dl-frames").textContent())).toBeGreaterThan(10);
  });
});

test.describe("contactsheet", () => {
  test("checks every phone profile and flags the centred crop", async ({ page }) => {
    await page.goto("/contactsheet");
    await expect(page.getByTestId("cs-tile")).toHaveCount(7);
    await expect(page.getByTestId("cs-summary")).toHaveText(/7 profiles, [1-7] with flags/, {
      timeout: 20_000,
    });
    await expect(page.locator('[data-kind="subject-outside-frame"]').first()).toBeVisible();
    await expect(page.locator('[data-kind="tap-target"]').first()).toBeVisible();
  });

  test("clears the phone profiles once the scene is staged by safeframe", async ({ page }) => {
    await page.goto("/contactsheet");
    await page.getByRole("radio", { name: "safeframe" }).check();
    await expect(page.getByTestId("cs-summary")).toHaveText("7 profiles, 0 with flags", {
      timeout: 20_000,
    });
  });

  test("lists 30+ profiles across the groups", async ({ page }) => {
    await page.goto("/contactsheet");
    await page.getByRole("radio", { name: "ultrawide" }).check();
    await expect(page.getByTestId("cs-tile")).toHaveCount(2);
    await expect(page.getByText(/3[0-9] profiles in 8 groups/)).toBeVisible();
  });
});
