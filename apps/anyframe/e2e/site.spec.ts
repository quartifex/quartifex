import { expect, type Page, test } from "@playwright/test";

/** A cheap fingerprint of a canvas's pixels, to tell frames apart. */
async function canvasPrint(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((canvas: HTMLCanvasElement) => {
      const copy = document.createElement("canvas");
      copy.width = 64;
      copy.height = 36;
      const ctx = copy.getContext("2d");
      if (!ctx) return { lit: 0, sum: 0 };
      ctx.drawImage(canvas, 0, 0, 64, 36);
      const { data } = ctx.getImageData(0, 0, 64, 36);
      let lit = 0;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = (data[i] ?? 0) + (data[i + 1] ?? 0) + (data[i + 2] ?? 0);
        sum += v * ((i / 4) % 97);
        if (v > 120) lit++;
      }
      return { lit, sum };
    });
}

test.describe("anyframe", () => {
  test("carries its honest label and provenance", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("honest-label")).toHaveText("Open-source demo");
    const provenance = page.getByRole("list", { name: "Provenance" });
    await expect(provenance).toContainText("concept visual, drawn in code");
    await expect(page.getByText("Concept visual · procedural, drawn in code")).toBeVisible();
  });

  test("the hero is staged for this window and scrubs with scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const stage = page.locator('[data-chapter="hero"] > div');
    await expect(stage).toHaveAttribute("data-sf-bucket", "laptop");
    await expect(stage).not.toHaveAttribute("data-sf-clipped", /.*/);
    await expect
      .poll(async () => (await canvasPrint(page, '[data-chapter="hero"] canvas')).lit, {
        timeout: 10_000,
      })
      .toBeGreaterThan(5);
    const first = await canvasPrint(page, '[data-chapter="hero"] canvas');
    await page.mouse.wheel(0, 1200);
    await expect
      .poll(async () => (await canvasPrint(page, '[data-chapter="hero"] canvas')).sum, {
        timeout: 10_000,
      })
      .not.toBe(first.sum);
  });

  test("restages on a tall phone: copy above or below the core", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const stage = page.locator('[data-chapter="hero"] > div');
    await expect(stage).toHaveAttribute("data-sf-bucket", "tall-phone");
    const title = await page.getByRole("heading", { level: 1 }).boundingBox();
    const [x, y, w, h] = ((await stage.getAttribute("data-sf-subject")) ?? "")
      .split(" ")
      .map(Number);
    expect(title && y !== undefined && h !== undefined).toBeTruthy();
    if (title && x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
      const overlaps =
        title.x < x + w &&
        title.x + title.width > x &&
        title.y < y + h &&
        title.y + title.height > y;
      expect(overlaps).toBe(false);
    }
  });

  test("the playground shows four screens and any aspect, with guides and decisions", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: "Four screens, one scene" }).scrollIntoViewIfNeeded();
    await expect(page.getByTestId("device")).toHaveCount(5);
    await expect(page.getByTestId("overlay")).toHaveCount(5, { timeout: 10_000 });
    const phone = page.locator('[data-device="Phone"]');
    await expect(phone).toContainText("tall-phone");
    // Cropping in around the core on a tall phone needs the top tier, at a capped 2x.
    await expect(phone.getByTestId("overlay")).toContainText("w1600 · 2x");
    await page.getByRole("radio", { name: "2G" }).check();
    await expect(phone.getByTestId("overlay")).toContainText("w480 · 1x");
    await expect(page.locator('[data-device="Ultrawide"]').getByTestId("overlay")).toContainText(
      "w480",
    );

    await page.getByRole("checkbox", { name: "Safe frame and resolution guides" }).uncheck();
    await expect(page.getByTestId("overlay")).toHaveCount(0);

    const anySlider = page.getByRole("slider", { name: "Any aspect" });
    await anySlider.fill("4");
    await expect(page.getByTestId("any-aspect")).toHaveText("3.56:1");
    await expect(page.locator('[data-device="Any aspect"]')).toContainText("ultrawide");

    await expect(page.getByTestId("plumb-size")).toHaveText("1280 x 720");
  });

  test("works by keyboard: the skip link jumps past the scene", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip the scene" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#screens-title$/);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("slider", { name: "Scene position" })).toBeFocused();
  });

  test("has a complete reduced-motion path", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect
      .poll(async () => (await canvasPrint(page, '[data-chapter="hero"] canvas')).lit, {
        timeout: 10_000,
      })
      .toBeGreaterThan(5);
    await page.getByRole("heading", { name: "Four screens, one scene" }).scrollIntoViewIfNeeded();
    await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
    await expect(page.getByText("Reduced motion is on")).toBeVisible();
  });

  test("embeds the contact sheet and ships metadata", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByTestId("matrix-summary")).toContainText("36 profiles in 8 groups");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /opengraph-image/,
    );
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute("href", /icon\.svg/);
    expect(await (await request.get("/robots.txt")).text()).toContain("sitemap.xml");
    expect((await request.get("/opengraph-image")).headers()["content-type"]).toBe("image/png");
  });
});
