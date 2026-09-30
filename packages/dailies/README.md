# @quartifex/dailies

Playwright helpers for scroll-driven pages. Pinned scenes, image-sequence scrubs and WebGL
canvases are hard to test: screenshots depend on the exact scroll position, canvas pixels
vary slightly between runs and GPUs, and jank only shows up while scrolling. We give you
the missing steps: scroll to a progress, find the page's chapters, screenshot each one,
compare with a canvas-tolerant diff, capture frame timing during a scroll, and emulate
reduced motion and slow networks.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/dailies @playwright/test
```

Mark chapters in the page (`data-chapter="hero"`), then:

```ts
import { expect, test } from "@playwright/test";
import {
  captureJank,
  emulateReducedMotion,
  matchSnapshot,
  screenshotChapters,
  scrollThrough,
  scrollToProgress,
} from "@quartifex/dailies";

test("every chapter matches its baseline", async ({ page }) => {
  await page.goto("/launch");
  for (const shot of await screenshotChapters(page)) {
    const result = await matchSnapshot(shot.image, `baselines/${shot.chapter.name}.png`, {
      canvas: true, // tolerant of GPU and dithering noise
    });
    expect(result.pass, result.diffFile).toBe(true);
  }
});

test("scrolls without jank", async ({ page }) => {
  await page.goto("/launch");
  const report = await captureJank(page, () => scrollThrough(page, { durationMs: 2000 }));
  expect(report.slowFrames).toBeLessThan(3);
  expect(report.layoutShift).toBeLessThan(0.1);
});

test("the pinned scene is right at 50%, with reduced motion too", async ({ page }) => {
  await page.goto("/launch");
  await scrollToProgress(page, 0.5, { section: "#pinned-scene" });
  await expect(page.locator("#caption-2")).toBeVisible();
  await emulateReducedMotion(page);
  await expect(page.locator("#caption-2")).toBeVisible();
});
```

## API

| Export | Kind | Description |
| --- | --- | --- |
| `scrollToProgress(page, p, { section?, container?, frames? })` | function | Scroll to progress `p` (0 to 1) of the document, a tall section (its pinned range) or an inner scroller, then wait `frames` animation frames (default 2). Returns the scroll position |
| `scrollRange(page, scope?)` | function | The scroll range of a scope, in pixels |
| `findChapters(page, { selector?, container? })` | function | Chapters (default `[data-chapter]`) with the progress where each starts and ends |
| `screenshotChapters(page, { at?, dir?, prefix?, mask?, ... })` | function | One viewport screenshot per chapter (at its middle by default), optionally saved as PNGs |
| `compareImages(a, b, options?)` | function | Compare two PNG buffers: `pass`, `diffPixels`, `diffRatio` and an RGBA diff image |
| `matchSnapshot(image, baselinePath, { update?, ...options })` | function | Compare with a baseline PNG; writes it when missing (or with `update`), writes `<name>.diff.png` on failure |
| `captureJank(page, run, { budgetMs? })` | function | Frame timing (slow frames, p95, longest), long tasks, long animation frames and layout shift while `run()` executes |
| `scrollThrough(page, { from?, to?, durationMs?, section?, container? })` | function | A steady scripted scroll, one step per frame |
| `settle(page, frames?)` | function | Wait for animation frames |
| `emulateReducedMotion(page, on?)` | function | `prefers-reduced-motion: reduce` on or off |
| `emulateNetwork(page, preset \| conditions)` | function | Throttle latency and bandwidth (Chromium, via the DevTools Protocol; latency only elsewhere). Returns an undo function |
| `NETWORK_PRESETS` | data | `slow-3g`, `fast-3g`, `slow-4g` |
| `decodePng`, `encodePng` | functions | PNG buffer to RGBA and back |
| `compareRgba`, `downsample`, `progressToScroll`, `summariseFrames` (also `/browser`) | functions | The pure parts, usable in the browser |

**Compare options:** `threshold` (per-pixel colour distance, default 0.1), `maxDiffRatio`
(share of pixels allowed to differ, default 0.001), `downsample` (average n x n blocks
first), `mask` (rectangles to ignore), and `canvas: true`, the canvas-tolerant preset:
threshold 0.2, 2 x 2 averaging and 1% of pixels. Explicit options win over the preset.

## Reduced motion

`emulateReducedMotion` makes the reduced path a first-class test case: run the same chapters
with it on and assert that nothing is conveyed by motion alone. The helpers scroll instantly
(`behavior: "instant"`); only `scrollThrough` moves step by step, because measuring scroll
jank needs a scroll.

## Browser support

Runs in Playwright with Chromium, Firefox or WebKit. Bandwidth throttling needs Chromium;
long tasks, long animation frames and layout shift are reported where the browser exposes
those performance entries (Chromium) and read 0 elsewhere.

## Size

A test dependency, so size matters less, but CI still enforces `size-limit` budgets (brotli,
unminified ESM as published): helpers under 6 kB and the browser entry under 2 kB, not
counting `pixelmatch` and `pngjs`.

## Limitations

- Chapter progress assumes chapters are laid out top to bottom; horizontal scroll scenes
  are not covered yet.
- Pages that take over scrolling (smooth-scroll libraries that ignore the native scroll
  position) may need more settle frames, or their own "scroll to" call.
- The network presets are repeatable test conditions close to Chromium's DevTools presets,
  not models of real networks.
- Canvas tolerance can hide a one-pixel change inside a canvas; use strict comparison with a
  mask for pixel-exact UI.

## Licence

MIT. Uses `pixelmatch` (ISC) and `pngjs` (MIT).
