import { expect, type Page, test } from "@playwright/test";

// Behaviour tests for the P3 demos: dolly and anatomy (React Three Fiber), heft (budgets
// on a live test page), spine (Lenis and ScrollTrigger on this page), viewfinder (overlay).

/** Non-background pixels in a WebGL canvas, read back through a 2D copy. */
async function litPixels(page: Page, selector: string) {
  return page.locator(selector).evaluate((canvas: HTMLCanvasElement) => {
    const copy = document.createElement("canvas");
    copy.width = 200;
    copy.height = 120;
    const ctx = copy.getContext("2d");
    if (!ctx) return 0;
    ctx.drawImage(canvas, 0, 0, 200, 120);
    const { data } = ctx.getImageData(0, 0, 200, 120);
    let lit = 0;
    for (let i = 0; i < data.length; i += 4) if ((data[i + 1] ?? 0) > 40) lit++;
    return lit;
  });
}

test.describe("dolly", () => {
  test("moves the camera through chapters as the page scrolls", async ({ page }) => {
    await page.goto("/dolly");
    const chapter = page.getByTestId("dl-chapter");
    await expect(chapter).toHaveText("Front", { timeout: 15_000 });
    await expect
      .poll(() => litPixels(page, '[data-demo="dolly"] canvas'), { timeout: 10_000 })
      .toBeGreaterThan(50);
    const start = await page.getByTestId("dl-position").textContent();

    await page.getByRole("button", { name: "Top", exact: true }).click();
    await expect(chapter).toHaveText("Top");
    await expect(page.getByTestId("dl-position")).not.toHaveText(start ?? "");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await expect(chapter).toHaveText("Close");
  });

  test("widens the FOV on a tall phone and holds poses under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/dolly");
    await expect(page.getByTestId("dl-chapter")).toHaveText("Front", { timeout: 15_000 });
    await expect(page.getByTestId("dl-fov")).toHaveText("32.0°");
    await page.getByRole("radio", { name: "9:19.5" }).check();
    await expect
      .poll(async () => Number.parseFloat((await page.getByTestId("dl-fov").textContent()) ?? "0"))
      .toBeGreaterThan(50);
    // Reduced motion: halfway into Orbit the camera sits exactly on the Orbit key.
    await page.getByRole("slider", { name: "Scroll" }).fill("0.5");
    await expect(page.getByTestId("dl-chapter")).toHaveText("Orbit");
    await expect(page.getByTestId("dl-position")).toHaveText("5.00, 2.40, 3.00");
  });
});

test.describe("anatomy", () => {
  test("explodes the pen and lists labels as parts come apart", async ({ page }) => {
    await page.goto("/anatomy");
    await expect
      .poll(() => litPixels(page, '[data-demo="anatomy"] canvas'), { timeout: 15_000 })
      .toBeGreaterThan(50);
    await page.getByRole("button", { name: "Assembled" }).click();
    await expect(page.getByTestId("an-visible")).toHaveText("0");
    await page.getByRole("button", { name: "Exploded" }).click();
    await expect(page.getByTestId("an-visible")).toHaveText("6");
    await expect(page.getByTestId("an-list")).toContainText("Nib");
    await expect(page.locator("[data-anatomy-label]")).toHaveCount(6);
  });

  test("turns Play off under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/anatomy");
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  });
});

test.describe("heft", () => {
  test("fails the heavy test page and passes the light one", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto("/heft");
    await page.getByRole("slider", { name: "Scroll duration" }).fill("2");
    await page.getByRole("radio", { name: "Heavy page" }).check();
    await page.getByRole("button", { name: "Run heft" }).click();
    await expect(page.getByTestId("hf-status")).toContainText("Done", { timeout: 20_000 });
    const table = page.getByTestId("hf-page");
    await expect(table.locator('tr[data-metric="scroll.cls"]')).toHaveAttribute(
      "data-pass",
      "false",
    );
    await expect(table.locator('tr[data-metric="scroll.longFrames"]')).toHaveAttribute(
      "data-pass",
      "false",
    );

    // A real click in the test page: its 250 ms handler shows up as interaction latency.
    await page
      .frameLocator('iframe[title="Test page under measurement"]')
      .getByRole("button", { name: "Buy" })
      .first()
      .click();
    await page.getByRole("button", { name: "Read again" }).click();
    await expect(table.locator('tr[data-metric="scroll.inp"]')).toHaveAttribute(
      "data-pass",
      "false",
    );

    await page.getByRole("radio", { name: "Light page" }).check();
    await page.getByRole("button", { name: "Run heft" }).click();
    await expect(page.getByTestId("hf-status")).toContainText("Done", { timeout: 20_000 });
    await expect(table.locator('tr[data-pass="false"]')).toHaveCount(0);
  });

  test("weighs the sequence and an exported GLB", async ({ page }) => {
    await page.goto("/heft");
    await page.getByRole("button", { name: "Weigh the sequence and a GLB" }).click();
    await expect(page.getByTestId("hf-glb")).toContainText("5 meshes");
    await expect(page.getByTestId("hf-assets").locator("tbody tr")).toHaveCount(3);
  });
});

test.describe("spine", () => {
  test("drives this page with one ticker, pins a scene, and resets cleanly on route change", async ({
    page,
  }) => {
    await page.goto("/spine");
    await expect(page.getByTestId("sp-mode")).toHaveText("Lenis", { timeout: 10_000 });
    await expect(page.getByTestId("sp-tickers")).toHaveText("1");
    await expect(page.getByTestId("sp-pins")).toHaveText("1 (1 spacer in the page)");
    await expect(page.getByTestId("sp-route")).toHaveText("/spine?");

    await page.getByTestId("sp-scene").scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 900);
    await expect
      .poll(
        async () =>
          Number.parseInt((await page.getByTestId("sp-progress").textContent()) ?? "0", 10),
        { timeout: 5000 },
      )
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: "Scene B" }).click();
    await expect(page.getByTestId("sp-route")).toHaveText("/spine?scene=b");
    await expect(page.getByTestId("sp-refreshes")).toContainText("route");
    // The old pin is gone and only the new one remains: no leftover spacers.
    await expect(page.getByTestId("sp-pins")).toHaveText("1 (1 spacer in the page)");
    expect(await page.evaluate(() => window.scrollY)).toBeLessThan(5);
  });

  test("uses native scrolling under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/spine");
    await expect(page.getByTestId("sp-mode")).toHaveText("native", { timeout: 10_000 });
    await expect(page.getByTestId("sp-tickers")).toHaveText("0");
  });
});

test.describe("viewfinder", () => {
  test("shows chapters, scene progress and the sequence buffer, and records a scroll", async ({
    page,
  }) => {
    await page.goto("/viewfinder");
    const panel = page.getByRole("region", { name: "Viewfinder", exact: true });
    // Closed on arrival (it would cover the page's links); it opens as the scene comes up.
    await expect(page.getByTestId("item-source")).toBeInViewport();
    await expect(page.getByRole("button", { name: /Show viewfinder/ })).toBeVisible({
      timeout: 10_000,
    });
    await page.mouse.wheel(0, 500);
    await expect(panel).toBeVisible({ timeout: 10_000 });
    await expect(panel.locator("[data-vf-chapter]")).toHaveCount(3);
    await expect(panel.locator('[data-vf-scene="jar sequence"]')).toBeVisible();
    await expect(panel.locator('[data-vf-sequence="jar"]')).toContainText("frame 1 / 72");

    await panel.locator('[data-vf-chapter="Sequence"]').click();
    await page.mouse.wheel(0, 1200);
    await expect(panel.locator('[data-vf-sequence="jar"]')).not.toContainText("frame 1 / 72", {
      timeout: 5000,
    });

    await page.getByRole("button", { name: "Record a scroll" }).click();
    // Wheel over the page, not over the overlay's own scrolling panel.
    // A headless wheel jumps instantly, so scroll in steps to give the path some shape.
    await page.mouse.move(400, 500);
    for (const dy of [200, 200, 200, 200]) {
      await page.mouse.wheel(0, dy);
      await page.waitForTimeout(200);
    }
    await page.getByRole("button", { name: "Stop recording" }).click();
    expect(Number(await page.getByTestId("vf-samples").textContent())).toBeGreaterThan(2);

    await page.keyboard.press("Alt+v");
    await expect(panel).toBeHidden();
    await page.keyboard.press("Alt+v");
    await expect(panel).toBeVisible();
  });
});
