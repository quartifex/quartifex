// In-page measurement. Each function takes the window it measures, so it runs through
// Playwright's page.evaluate (self-contained bodies, no outer references) and in a
// same-origin iframe in the browser. Published as part of `@quartifex/heft/browser`.

type HeftWindow = Window & {
  __heft?: { cls: number; loaf: number[]; events: number[]; frames: number[]; running: boolean };
};

/** Start observers: layout shift, long animation frames and interactions (buffered, so load counts too). */
export function installObservers(win: Window = window): void {
  const w = win as HeftWindow;
  if (w.__heft) return;
  const state = {
    cls: 0,
    loaf: [] as number[],
    events: [] as number[],
    frames: [] as number[],
    running: false,
  };
  w.__heft = state;
  const supported = (win as unknown as { PerformanceObserver: typeof PerformanceObserver })
    .PerformanceObserver.supportedEntryTypes;
  const PO = (win as unknown as { PerformanceObserver: typeof PerformanceObserver })
    .PerformanceObserver;
  const watch = (
    type: string,
    onEntry: (entry: PerformanceEntry) => void,
    extra: Record<string, unknown> = {},
  ) => {
    if (!supported.includes(type)) return;
    new PO((list) => list.getEntries().forEach(onEntry)).observe({
      type,
      buffered: true,
      ...extra,
    });
  };
  watch("layout-shift", (e) => {
    const shift = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!shift.hadRecentInput) state.cls += shift.value;
  });
  watch("long-animation-frame", (e) => state.loaf.push(e.duration));
  watch(
    "event",
    (e) => {
      const event = e as PerformanceEntry & { interactionId?: number };
      if (event.interactionId) state.events.push(event.duration);
    },
    { durationThreshold: 16 },
  );
}

/** Scroll a window's document from top to bottom over `durationMs`, recording rAF gaps. One options argument, so Playwright can pass it. */
export function scrollThrough(options: { durationMs?: number; win?: Window } = {}): Promise<void> {
  const win = options.win ?? window;
  const durationMs = options.durationMs ?? 12_000;
  const w = win as HeftWindow;
  const state = w.__heft;
  const doc = win.document.scrollingElement ?? win.document.documentElement;
  const end = Math.max(0, doc.scrollHeight - win.innerHeight);
  return new Promise((resolve) => {
    const start = win.performance.now();
    let last = start;
    if (state) state.running = true;
    const step = (now: number) => {
      if (state) state.frames.push(now - last);
      last = now;
      const t = Math.min((now - start) / durationMs, 1);
      win.scrollTo({ top: end * t, behavior: "instant" });
      if (t < 1) win.requestAnimationFrame(step);
      else {
        if (state) state.running = false;
        resolve();
      }
    };
    win.requestAnimationFrame(step);
  });
}

/** What was transferred while loading, from resource and navigation timing. */
export function readTransfer(win: Window = window): {
  transferBytes: number;
  scriptBytes: number;
  imageBytes: number;
} {
  const entries = win.performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const nav = win.performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  // transferSize is 0 for cached responses; fall back to the encoded body size.
  const size = (e: PerformanceResourceTiming) => e.transferSize || e.encodedBodySize || 0;
  let transferBytes = nav ? size(nav) : 0;
  let scriptBytes = 0;
  let imageBytes = 0;
  for (const e of entries) {
    const bytes = size(e);
    transferBytes += bytes;
    if (e.initiatorType === "script" || /\.m?js(\?|$)/.test(e.name)) scriptBytes += bytes;
    if (
      e.initiatorType === "img" ||
      e.initiatorType === "image" ||
      /\.(avif|webp|png|jpe?g|gif|svg)(\?|$)/.test(e.name)
    ) {
      imageBytes += bytes;
    }
  }
  return { transferBytes, scriptBytes, imageBytes };
}

/** The scroll metrics collected so far. */
export function readScroll(win: Window = window): {
  frames: number;
  longFrames: number;
  p95FrameMs: number;
  cls: number;
  inp: number;
} {
  const state = (win as HeftWindow).__heft;
  if (!state) return { frames: 0, longFrames: 0, p95FrameMs: 0, cls: 0, inp: 0 };
  const frames = state.frames.slice(1);
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted.length
    ? (sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] ?? 0)
    : 0;
  // Prefer long animation frames where the browser reports them; otherwise rAF gaps over 50 ms.
  const longFrames =
    state.loaf.length > 0
      ? state.loaf.filter((d) => d > 50).length
      : frames.filter((d) => d > 50).length;
  return {
    frames: frames.length,
    longFrames,
    p95FrameMs: Math.round(p95 * 10) / 10,
    cls: Math.round(state.cls * 1000) / 1000,
    inp: Math.round(Math.max(0, ...state.events)),
  };
}
