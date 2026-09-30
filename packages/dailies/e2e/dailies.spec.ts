import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import {
  captureJank,
  compareImages,
  emulateNetwork,
  emulateReducedMotion,
  findChapters,
  screenshotChapters,
  scrollRange,
  scrollThrough,
  scrollToProgress,
} from "../src/index.js";

// A synthetic scroll page: three chapters, the middle one a 300vh pinned scene whose
// canvas redraws from scroll progress, like an image-sequence scrub.
const PAGE = `<!doctype html>
<html><head><style>
  body { margin: 0; background: #050505; color: #edeae4; font: 16px system-ui; }
  section { height: 100vh; display: grid; place-items: center; }
  #pin { height: 300vh; }
  #pin .sticky { position: sticky; top: 0; height: 100vh; display: grid; place-items: center; }
  @media (prefers-reduced-motion: reduce) { body { outline: 4px solid #3fbead; } }
</style></head><body>
  <section data-chapter="intro"><h1>Intro</h1></section>
  <section id="pin" data-chapter="scrub"><div class="sticky"><canvas width="320" height="180"></canvas></div></section>
  <section data-chapter="outro"><h1>Outro</h1></section>
  <script>
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const pin = document.getElementById("pin");
    function draw() {
      const box = pin.getBoundingClientRect();
      const p = Math.min(Math.max(-box.top / (box.height - innerHeight), 0), 1);
      ctx.fillStyle = "#050505"; ctx.fillRect(0, 0, 320, 180);
      ctx.fillStyle = "#3fbead"; ctx.fillRect(20 + p * 240, 60, 60, 60);
      canvas.dataset.progress = p.toFixed(2);
    }
    addEventListener("scroll", () => requestAnimationFrame(draw), { passive: true });
    draw();
  </script>
</body></html>`;

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.setContent(PAGE);
});

test("scrolls a section to a progress and the scene renders that frame", async ({ page }) => {
  const range = await scrollRange(page, { section: "#pin" });
  expect(range).toEqual({ start: 600, end: 600 + 1200 });
  await scrollToProgress(page, 0.5, { section: "#pin" });
  await expect(page.locator("canvas")).toHaveAttribute("data-progress", "0.50");
  await scrollToProgress(page, 1, { section: "#pin" });
  await expect(page.locator("canvas")).toHaveAttribute("data-progress", "1.00");
});

test("finds chapters and screenshots each one", async ({ page }) => {
  const chapters = await findChapters(page);
  expect(chapters.map((c) => c.name)).toEqual(["intro", "scrub", "outro"]);
  expect(chapters[1]?.end).toBeGreaterThan(chapters[1]?.start ?? 1);

  const shots = await screenshotChapters(page);
  expect(shots).toHaveLength(3);
  // Different chapters look different; the same chapter twice looks the same.
  expect(compareImages(shots[0]?.image as Buffer, shots[1]?.image as Buffer).pass).toBe(false);
  const again = await screenshotChapters(page);
  expect(
    compareImages(shots[1]?.image as Buffer, again[1]?.image as Buffer, { canvas: true }).pass,
  ).toBe(true);
});

test("captures frame timing while scrolling through", async ({ page }) => {
  const report = await captureJank(page, () => scrollThrough(page, { durationMs: 600 }));
  expect(report.frames).toBeGreaterThan(10);
  expect(report.durationMs).toBeGreaterThan(400);
  expect(report.layoutShift).toBeLessThan(0.1);
});

test("emulates reduced motion and a slow network", async ({ page }) => {
  await emulateReducedMotion(page);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  );
  await emulateReducedMotion(page, false);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    false,
  );

  const server = createServer((_, res) => {
    res.writeHead(200, { "access-control-allow-origin": "*", "cache-control": "no-store" });
    res.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const timeFetch = () =>
    page.evaluate(async (url) => {
      const start = performance.now();
      await fetch(url, { cache: "no-store" });
      return performance.now() - start;
    }, `http://127.0.0.1:${port}/`);

  const stop = await emulateNetwork(page, {
    latency: 400,
    downloadKbps: 10_000,
    uploadKbps: 10_000,
  });
  const throttled = await timeFetch();
  await stop();
  const normal = await timeFetch();
  server.close();
  expect(throttled).toBeGreaterThan(350);
  expect(normal).toBeLessThan(throttled);
});
