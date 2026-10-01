import { expect, test } from "@playwright/test";

// Behaviour tests for the P2 demos: the sequence pipeline (rushes, resolve, reel) on the
// sequence rushes generated at build time, and the stillness motion policy.

test.describe("rushes", () => {
  test("shows the real manifest, report and any encoded frame", async ({ page }) => {
    await page.goto("/rushes");
    await expect(page.getByTestId("rs-frames")).toHaveText("72 at 24 fps");
    await expect(page.getByTestId("rs-tiers")).toHaveText("480 / 960 / 1600");
    await expect(page.getByTestId("rs-budget")).toHaveText("Within budget");
    await expect(page.getByTestId("rs-table").locator("tbody tr")).toHaveCount(6);

    const frame = page.getByTestId("rs-frame");
    await page.getByRole("radio", { name: "1600 px" }).check();
    await page.getByRole("radio", { name: "WebP" }).check();
    await expect(frame).toHaveAttribute("src", "/sequences/jar/w1600/webp/0000.webp");
    await expect.poll(() => frame.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1600);
    await expect(page.getByTestId("rs-bytes")).toHaveText(/kB$/);
  });

  test("a phone downloads a smaller tier than the largest", async ({ page }) => {
    await page.goto("/rushes");
    await page.getByRole("radio", { name: "9:19.5" }).check();
    await expect(page.getByTestId("rs-laddered")).toHaveText(/^w960 /);
    await expect(page.getByTestId("rs-saved")).not.toHaveText("0%");
  });
});

test.describe("resolve", () => {
  test("picks tiers from screen, pixel ratio, GPU and network, and explains why", async ({
    page,
  }) => {
    await page.goto("/resolve");
    const tier = page.getByTestId("rv-tier");
    await page.getByRole("radio", { name: "Contain" }).check();
    await page.getByRole("radio", { name: "9:19.5" }).check();
    await page.getByRole("radio", { name: "3x" }).check();
    // 390 px at the GPU tier 2 cap of 2x needs 780 px: the 960 tier.
    await expect(page.getByTestId("rv-dpr")).toHaveText("2");
    await expect(page.getByTestId("rv-needed")).toHaveText("780");
    await expect(tier).toHaveText("w960 (960 px)");
    await expect(page.getByTestId("rv-explain")).toContainText("capped at 2 for GPU tier 2");

    await page.getByRole("radio", { name: "2G", exact: true }).check();
    await expect(tier).toHaveText("w480 (480 px)");
    await expect(page.getByTestId("rv-explain")).toContainText("capped at 1 on 2g");

    await page.getByRole("radio", { name: "4G" }).check();
    await page.getByRole("radio", { name: "0", exact: true }).check();
    await expect(page.getByTestId("rv-shadow")).toHaveText("off");
    await expect(page.getByTestId("rv-dpr")).toHaveText("1");
  });

  test("resolves this browser window too", async ({ page }) => {
    await page.goto("/resolve");
    await expect(page.getByTestId("rv-own-tier")).toHaveText(/^w(480|960|1600)$/);
  });
});

test.describe("reel", () => {
  test("scrubs frames with scroll, with GSAP and with native scroll", async ({ page }) => {
    await page.goto("/reel");
    const frame = page.getByTestId("rl-frame");
    await expect(frame).toHaveText("1 / 72", { timeout: 10_000 });
    await expect(page.getByTestId("rl-format")).toHaveText(/avif|webp/);

    const scrollTo = (p: number) =>
      page.getByTestId("reel-scroller").evaluate((el, p) => {
        el.scrollTo({ top: (el.scrollHeight - el.clientHeight) * p, behavior: "instant" });
      }, p);
    // Halfway down the page is halfway through the pinned scene.
    await scrollTo(0.5);
    await expect
      .poll(async () => Number((await frame.textContent())?.split(" / ")[0]), { timeout: 10_000 })
      .toBeGreaterThan(30);
    await scrollTo(0.8);
    await expect(frame).toHaveText("72 / 72", { timeout: 10_000 });

    await page.getByRole("radio", { name: "Native scroll" }).check();
    await scrollTo(0.2);
    await expect(frame).toHaveText("1 / 72", { timeout: 10_000 });
  });

  test("follows a forced tier and format", async ({ page }) => {
    await page.goto("/reel");
    await page.getByRole("radio", { name: "480 px" }).check();
    await page.getByRole("radio", { name: "WebP" }).check();
    await expect(page.getByTestId("rl-tier")).toHaveText("w480");
    await expect(page.getByTestId("rl-format")).toHaveText("webp");
    await expect(page.getByTestId("rl-frame")).toHaveText("1 / 36", { timeout: 10_000 });
  });

  test("shows the poster and loads no frames under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/reel");
    await expect(page.getByTestId("rl-mode")).toHaveText("Reduced motion: poster", {
      timeout: 10_000,
    });
    await expect(page.getByTestId("rl-loaded")).toHaveText("0 / 72");
    const painted = await page.getByTestId("reel-canvas").evaluate((c: HTMLCanvasElement) => {
      const ctx = c.getContext("2d");
      if (!ctx) return 0;
      const { data } = ctx.getImageData(0, 0, c.width, c.height);
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) if ((data[i + 1] ?? 0) > 60) lit++;
      return lit;
    });
    expect(painted).toBeGreaterThan(100);
  });
});

test.describe("stillness", () => {
  test("switches every effect between full, reduced and static, live", async ({ page }) => {
    await page.goto("/stillness");
    const level = page.getByTestId("st-level");
    await expect(level).toHaveText("full");
    await expect(page.getByTestId("st-effect-title")).toHaveText("full");
    expect(await page.locator("#st-intro h3").evaluate((h) => h.getAnimations().length)).toBe(1);

    await page.getByRole("radio", { name: "Static" }).check();
    await expect(level).toHaveText("static");
    await expect(page.getByTestId("st-effect-turntable")).toHaveText("static");
    expect(await page.locator("#st-intro h3").evaluate((h) => h.getAnimations().length)).toBe(0);

    await page.getByRole("radio", { name: "Reduced" }).check();
    await expect(page.getByTestId("st-effect-parallax")).toHaveText("reduced");
  });

  test("follows the system preference, and Save-Data makes heavy effects static", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/stillness");
    await expect(page.getByTestId("st-level")).toHaveText("reduced");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.getByTestId("st-level")).toHaveText("full");
    await page.getByRole("checkbox", { name: "Save-Data" }).check();
    await expect(page.getByTestId("st-effect-turntable")).toHaveText("static");
    await expect(page.getByTestId("st-effect-title")).toHaveText("full");
  });

  test("chapter rail moves focus, marks the current chapter and announces it", async ({ page }) => {
    await page.goto("/stillness");
    const rail = page.getByRole("navigation", { name: "Chapters of the demo page" });
    await rail.getByRole("link", { name: /Detail/ }).click();
    await expect(page.locator("#st-detail")).toBeFocused();
    await expect(rail.getByRole("link", { name: /Detail/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expect(page.getByTestId("st-announced")).toContainText("Chapter 3 of 4: Detail");
    await expect(page.locator('[data-stillness="announcer"]')).toHaveText("Chapter 3 of 4: Detail");
  });

  test("the skip link jumps past the scene by keyboard", async ({ page }) => {
    await page.goto("/stillness");
    const skip = page.getByRole("link", { name: "Skip the turntable" });
    await skip.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#st-detail")).toBeFocused();
  });
});
