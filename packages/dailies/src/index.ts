// @quartifex/dailies (L17, Quality & testing). Playwright helpers for scroll-driven
// pages: scroll to a progress, find chapters, screenshot each one, compare with a
// canvas-tolerant diff, capture jank while scrolling, and emulate reduced motion and
// slow networks. Runs in Playwright tests (Node); the pixel maths is also in ./pixels.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { type JankReport, progressToScroll, type ScrollRange, summariseFrames } from "./math.js";
import { type CompareOptions, type Comparison, compareRgba, type Rgba } from "./pixels.js";

export { type JankReport, progressToScroll, type ScrollRange, summariseFrames } from "./math.js";
export {
  type CompareOptions,
  type Comparison,
  compareRgba,
  downsample,
  type Rgba,
} from "./pixels.js";

/* ------------------------------------------------------------------ scrolling */

/** What to scroll: the document (default), a section of it, or an inner scroll container. */
export type ScrollScope = {
  /** A tall section (e.g. a pinned scene): progress runs from its top reaching the top of the viewport to its bottom reaching the bottom. */
  section?: string;
  /** An element with its own overflow scrolling, instead of the document. */
  container?: string;
};

/** The scrollable range for a scope, in scroll pixels of the document or container. */
export async function scrollRange(page: Page, scope: ScrollScope = {}): Promise<ScrollRange> {
  return page.evaluate(({ section, container }) => {
    const scroller = container ? document.querySelector(container) : document.scrollingElement;
    if (!scroller) throw new Error(`dailies: no scroll container for "${container}"`);
    const viewport = container ? scroller.clientHeight : window.innerHeight;
    if (!section) return { start: 0, end: Math.max(0, scroller.scrollHeight - viewport) };
    const el = document.querySelector(section);
    if (!el) throw new Error(`dailies: no section matches "${section}"`);
    const top =
      el.getBoundingClientRect().top -
      (container ? scroller.getBoundingClientRect().top : 0) +
      scroller.scrollTop;
    return { start: top, end: top + Math.max(0, el.getBoundingClientRect().height - viewport) };
  }, scope);
}

export type SettleOptions = {
  /** Animation frames to wait after scrolling, so scroll-linked work can render. Default 2. */
  frames?: number;
};

/** Wait for `frames` animation frames in the page. */
export async function settle(page: Page, frames = 2): Promise<void> {
  await page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let left = count;
        const tick = () => (--left <= 0 ? resolve() : requestAnimationFrame(tick));
        requestAnimationFrame(tick);
      }),
    frames,
  );
}

/** Scroll to `progress` (0 to 1) of the scope and wait for the page to render it. Returns the scroll position. */
export async function scrollToProgress(
  page: Page,
  progress: number,
  options: ScrollScope & SettleOptions = {},
): Promise<number> {
  const range = await scrollRange(page, options);
  const top = progressToScroll(range, progress);
  await page.evaluate(
    ({ container, top }) => {
      const scroller = container ? document.querySelector(container) : document.scrollingElement;
      scroller?.scrollTo({ top, behavior: "instant" });
    },
    { container: options.container, top },
  );
  await settle(page, options.frames ?? 2);
  return top;
}

/* ------------------------------------------------------------------- chapters */

export type Chapter = {
  name: string;
  /** Progress (0 to 1, of the whole scope) where the chapter's top reaches the top of the viewport. */
  start: number;
  /** Progress where its bottom reaches the bottom of the viewport (or its top, if it is shorter than the viewport). */
  end: number;
};

export type ChapterOptions = Pick<ScrollScope, "container"> & {
  /** Chapters are the elements matching this selector. Default `[data-chapter]`. */
  selector?: string;
};

/** Find the chapters of a scroll page, named by `data-chapter`, `id`, or position. */
export async function findChapters(page: Page, options: ChapterOptions = {}): Promise<Chapter[]> {
  const selector = options.selector ?? "[data-chapter]";
  const range = await scrollRange(page, options.container ? { container: options.container } : {});
  const spans = await page.evaluate(
    ({ selector, container }) => {
      const scroller = container ? document.querySelector(container) : document.scrollingElement;
      if (!scroller) return [];
      const viewport = container ? scroller.clientHeight : window.innerHeight;
      const origin = container ? scroller.getBoundingClientRect().top : 0;
      return Array.from(document.querySelectorAll<HTMLElement>(selector), (el, index) => {
        const box = el.getBoundingClientRect();
        const top = box.top - origin + scroller.scrollTop;
        return {
          name: el.dataset.chapter || el.id || `chapter-${index + 1}`,
          top,
          bottom: top + Math.max(0, box.height - viewport),
        };
      });
    },
    { selector, container: options.container },
  );
  const length = Math.max(range.end - range.start, 1);
  const toProgress = (y: number) => Math.min(Math.max((y - range.start) / length, 0), 1);
  return spans.map(({ name, top, bottom }) => ({
    name,
    start: toProgress(top),
    end: toProgress(bottom),
  }));
}

export type ChapterShot = { chapter: Chapter; progress: number; image: Buffer; file?: string };

export type ScreenshotOptions = ChapterOptions & {
  /** Where in each chapter to shoot, 0 (start) to 1 (end). Default 0.5. */
  at?: number;
  /** Save PNGs here as `<prefix><chapter>.png`. Optional. */
  dir?: string;
  prefix?: string;
  /** Elements to paint over in every shot (Playwright's mask). */
  mask?: string[];
  frames?: number;
};

/** Scroll to each chapter and take one viewport screenshot per chapter. */
export async function screenshotChapters(
  page: Page,
  options: ScreenshotOptions = {},
): Promise<ChapterShot[]> {
  const chapters = await findChapters(page, options);
  const at = options.at ?? 0.5;
  if (options.dir) await mkdir(options.dir, { recursive: true });
  const shots: ChapterShot[] = [];
  for (const chapter of chapters) {
    const progress = chapter.start + (chapter.end - chapter.start) * at;
    await scrollToProgress(page, progress, {
      ...(options.container ? { container: options.container } : {}),
      frames: options.frames ?? 2,
    });
    const image = await page.screenshot({
      animations: "disabled",
      caret: "hide",
      mask: (options.mask ?? []).map((selector) => page.locator(selector)),
    });
    const shot: ChapterShot = { chapter, progress, image };
    if (options.dir) {
      const safe = chapter.name.replace(/[^\w.-]+/g, "-");
      shot.file = path.join(options.dir, `${options.prefix ?? ""}${safe}.png`);
      await writeFile(shot.file, image);
    }
    shots.push(shot);
  }
  return shots;
}

/* ---------------------------------------------------------- visual regression */

/** Decode a PNG buffer to RGBA. */
export function decodePng(buffer: Buffer): Rgba {
  const png = PNG.sync.read(buffer);
  return { data: png.data, width: png.width, height: png.height };
}

/** Encode RGBA to a PNG buffer. */
export function encodePng(image: Rgba): Buffer {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
  return PNG.sync.write(png);
}

/** Compare two PNG screenshots. See `CompareOptions` for the canvas-tolerant preset. */
export function compareImages(a: Buffer, b: Buffer, options: CompareOptions = {}): Comparison {
  return compareRgba(decodePng(a), decodePng(b), options);
}

export type SnapshotResult = Comparison & { created: boolean; baseline: string; diffFile?: string };

/**
 * Compare a screenshot with the baseline PNG at `baseline`. Writes the baseline when it
 * is missing (or when `update` is true) and passes; on a failure writes
 * `<baseline>.diff.png` next to it.
 */
export async function matchSnapshot(
  image: Buffer,
  baseline: string,
  options: CompareOptions & { update?: boolean } = {},
): Promise<SnapshotResult> {
  let previous: Buffer | null = null;
  try {
    previous = options.update ? null : await readFile(baseline);
  } catch {
    previous = null;
  }
  if (!previous) {
    await mkdir(path.dirname(baseline), { recursive: true });
    await writeFile(baseline, image);
    const { width, height } = decodePng(image);
    return {
      pass: true,
      created: true,
      baseline,
      width,
      height,
      diffPixels: 0,
      diffRatio: 0,
      diff: { data: new Uint8ClampedArray(0), width: 0, height: 0 },
    };
  }
  const result: SnapshotResult = {
    ...compareImages(previous, image, options),
    created: false,
    baseline,
  };
  if (!result.pass && result.diff.width > 0) {
    result.diffFile = `${baseline.replace(/\.png$/i, "")}.diff.png`;
    await writeFile(result.diffFile, encodePng(result.diff));
  }
  return result;
}

/* ------------------------------------------------------------------------ jank */

type JankWindow = Window & {
  __dailies?: { stamps: number[]; longTasks: number; loaf: number; cls: number; stop: () => void };
};

/**
 * Measure frame timing, long tasks and layout shift while `run` executes (for example
 * `() => scrollThrough(page)`). `budgetMs` is the slow-frame line (default 1.5 frames at 60 Hz).
 */
export async function captureJank(
  page: Page,
  run: () => Promise<unknown>,
  options: { budgetMs?: number } = {},
): Promise<JankReport> {
  await page.evaluate(() => {
    const w = window as JankWindow;
    const state = { stamps: [] as number[], longTasks: 0, loaf: 0, cls: 0, stop: () => {} };
    let raf = 0;
    const tick = (t: number) => {
      state.stamps.push(t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const observers: PerformanceObserver[] = [];
    const supported = PerformanceObserver.supportedEntryTypes ?? [];
    const watch = (type: string, onEntry: (entry: PerformanceEntry) => void) => {
      if (!supported.includes(type)) return;
      const observer = new PerformanceObserver((list) => list.getEntries().forEach(onEntry));
      observer.observe({ type, buffered: false });
      observers.push(observer);
    };
    watch("longtask", () => {
      state.longTasks += 1;
    });
    watch("long-animation-frame", () => {
      state.loaf += 1;
    });
    watch("layout-shift", (entry) => {
      const shift = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
      if (!shift.hadRecentInput) state.cls += shift.value;
    });
    state.stop = () => {
      cancelAnimationFrame(raf);
      for (const observer of observers) observer.disconnect();
    };
    w.__dailies = state;
  });

  await run();

  const raw = await page.evaluate(() => {
    const w = window as JankWindow;
    const state = w.__dailies;
    if (!state) throw new Error("dailies: capture state missing");
    state.stop();
    delete w.__dailies;
    return { stamps: state.stamps, longTasks: state.longTasks, loaf: state.loaf, cls: state.cls };
  });
  return summariseFrames(raw.stamps, {
    budgetMs: options.budgetMs ?? 25,
    longTasks: raw.longTasks,
    longAnimationFrames: raw.loaf,
    layoutShift: raw.cls,
  });
}

/** Scroll the scope from `from` to `to` progress over `durationMs`, one step per frame, like a steady swipe. */
export async function scrollThrough(
  page: Page,
  options: ScrollScope & { from?: number; to?: number; durationMs?: number } = {},
): Promise<void> {
  const range = await scrollRange(page, options);
  const from = progressToScroll(range, options.from ?? 0);
  const to = progressToScroll(range, options.to ?? 1);
  await page.evaluate(
    ({ container, from, to, duration }) =>
      new Promise<void>((resolve) => {
        const scroller = container ? document.querySelector(container) : document.scrollingElement;
        if (!scroller) return resolve();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          scroller.scrollTo({ top: from + (to - from) * t, behavior: "instant" });
          if (t < 1) requestAnimationFrame(step);
          else resolve();
        };
        requestAnimationFrame(step);
      }),
    { container: options.container, from, to, duration: options.durationMs ?? 2000 },
  );
}

/* ------------------------------------------------------------------ emulation */

/** Emulate `prefers-reduced-motion: reduce` (or turn it back off). */
export async function emulateReducedMotion(page: Page, on = true): Promise<void> {
  await page.emulateMedia({ reducedMotion: on ? "reduce" : "no-preference" });
}

export type NetworkConditions = {
  /** Added round-trip latency in ms. */
  latency: number;
  /** Kilobits per second. */
  downloadKbps: number;
  uploadKbps: number;
};

/**
 * Throttling presets, close to the ones in Chromium's DevTools and Lighthouse. Treat
 * them as repeatable test conditions, not as models of real networks.
 */
export const NETWORK_PRESETS = {
  "slow-3g": { latency: 2000, downloadKbps: 400, uploadKbps: 400 },
  "fast-3g": { latency: 562.5, downloadKbps: 1440, uploadKbps: 675 },
  "slow-4g": { latency: 150, downloadKbps: 1600, uploadKbps: 750 },
} as const satisfies Record<string, NetworkConditions>;

/**
 * Throttle the page's network. Uses the Chrome DevTools Protocol in Chromium; in other
 * browsers only the latency is emulated (by delaying each request). Returns a function
 * that removes the throttling.
 */
export async function emulateNetwork(
  page: Page,
  conditions: keyof typeof NETWORK_PRESETS | NetworkConditions,
): Promise<() => Promise<void>> {
  const c = typeof conditions === "string" ? NETWORK_PRESETS[conditions] : conditions;
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: c.latency,
      downloadThroughput: (c.downloadKbps * 1000) / 8,
      uploadThroughput: (c.uploadKbps * 1000) / 8,
    });
    return async () => {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });
      await cdp.detach();
    };
  } catch {
    const handler = async (route: { continue(): Promise<void> }) => {
      await new Promise((resolve) => setTimeout(resolve, c.latency));
      await route.continue();
    };
    await page.route("**/*", handler);
    return async () => {
      await page.unroute("**/*", handler);
    };
  }
}
