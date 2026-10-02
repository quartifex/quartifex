import { expect, type Page, test } from "@playwright/test";

/** Record a short WebM in the page (a moving square on a canvas) and return its bytes. */
async function recordClip(page: Page): Promise<Buffer> {
  const base64 = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise((r) => {
      recorder.onstop = r;
    });
    recorder.start(100);
    const start = performance.now();
    await new Promise<void>((done) => {
      const tick = () => {
        const t = (performance.now() - start) / 1500;
        ctx.fillStyle = "#0d0c0b";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "#e9a457";
        ctx.fillRect(40 + t * 480, 140, 80, 80);
        if (t < 1) requestAnimationFrame(tick);
        else done();
      };
      tick();
    });
    recorder.stop();
    await stopped;
    const buffer = await new Blob(chunks, { type: "video/webm" }).arrayBuffer();
    let binary = "";
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return btoa(binary);
  });
  return Buffer.from(base64, "base64");
}

test("carries its honest label, provenance and one h1", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("honest-label")).toHaveText("Open-source demo");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("list", { name: "Provenance" })).toContainText("concept visual");
  await expect(page.getByRole("list", { name: "Provenance" })).toContainText("Nothing is uploaded");
});

test("the hero scrubs its sequence with the scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const readout = page.getByTestId("hero-readout");
  await expect(readout).toContainText(/frame 001 \/ \d{3} · w\d+/);
  await page.mouse.wheel(0, 900);
  await expect(readout).not.toContainText("frame 001 /");
  await expect(page.locator("section[data-step]").first()).not.toHaveAttribute("data-step", "0");
});

test("reduced motion shows the poster and loads no frames", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const frames: string[] = [];
  page.on("request", (r) => {
    if (/\/sequences\/aperture\/w\d+\//.test(r.url())) frames.push(r.url());
  });
  await page.goto("/");
  await expect(page.getByTestId("hero-readout")).toContainText("poster");
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(400);
  expect(frames).toEqual([]);
  // The playground has no autoplay under reduced motion; the scrub is still there.
  await expect(page.getByRole("button", { name: "Play", exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Scrub")).toBeVisible();
});

test("encodes the sample, plays it, and re-weighs against a new budget", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  await page.getByRole("button", { name: "Use our sample" }).click();
  await expect(page.getByTestId("pg-status")).toContainText("Encoded 72 frames into 3 tiers", {
    timeout: 60_000,
  });
  const table = page.getByTestId("pg-table");
  await expect(table.locator("tbody tr").first()).toContainText("w480");
  await expect(page.getByTestId("pg-verdict")).toContainText("Within budget");

  // Scrub: reel draws the encoded frames from memory.
  await page.getByLabel("Scrub").fill("700");
  await expect(page.getByTestId("pg-stats")).toContainText("in memory");

  // A tighter budget re-weighs the same frames: no new encode.
  const status = await page.getByTestId("pg-status").textContent();
  await page.getByLabel("Budget per tier").fill(String(256 * 1024));
  await expect(page.getByTestId("pg-verdict")).toContainText("Over budget");
  await expect(page.getByTestId("pg-status")).toHaveText(status ?? "");
  await expect(
    page.locator("#playground").getByText("--widths 480,960,1600 --budget budget.json --strict"),
  ).toBeVisible();
});

test("encodes a dropped-in video file", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  const clip = await recordClip(page);
  await page.locator("#clip").setInputFiles({
    name: "square.webm",
    mimeType: "video/webm",
    buffer: clip,
  });
  await expect(page.getByTestId("pg-status")).toContainText(/Encoded \d+ frames into 2 tiers/, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("pg-table")).toContainText("square.webm");
  await expect(page.getByText("npx rushes square.webm")).toBeVisible();
});

test("is usable from the keyboard", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to the playground" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#playground$/);
  // From the playground, the file input and the sample button are next in tab order.
  await page.locator("#clip").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Use our sample" })).toBeFocused();
});
