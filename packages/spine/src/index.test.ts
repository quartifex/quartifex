import type { Plumb } from "@quartifex/plumb";
import { describe, expect, it, vi } from "vitest";
import { createSpine, type LenisLike, type ScrollTriggerLike, type TickerFn } from "./index.js";

function fakes() {
  const tickers = new Set<TickerFn>();
  const frames: Array<() => void> = [];
  const log: string[] = [];
  const gsap = {
    ticker: {
      add: (fn: TickerFn) => tickers.add(fn),
      remove: (fn: TickerFn) => tickers.delete(fn),
      lagSmoothing: vi.fn(),
    },
    context: (fn: () => void) => {
      fn();
      const id = log.filter((l) => l.startsWith("context")).length;
      log.push(`context ${id}`);
      return { revert: () => log.push(`revert ${id}`) };
    },
  };
  const triggers: Array<{ kill: () => void; pin?: Element }> = [];
  const ScrollTrigger: ScrollTriggerLike = {
    update: vi.fn(),
    refresh: vi.fn(),
    config: vi.fn(),
    getAll: () => triggers,
    clearScrollMemory: vi.fn(),
  };
  let onScroll: () => void = () => {};
  const lenisInstance: LenisLike = {
    raf: vi.fn(),
    on: (_: "scroll", fn: () => void) => {
      onScroll = fn;
    },
    scrollTo: vi.fn(),
    resize: vi.fn(),
    destroy: vi.fn(),
  };
  const Lenis = vi.fn(function Lenis(this: unknown) {
    return lenisInstance;
  }) as unknown as new () => LenisLike;
  const doc = {
    visibilityState: "visible" as DocumentVisibilityState,
    listeners: new Set<() => void>(),
    addEventListener: (_: string, fn: () => void) => doc.listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => doc.listeners.delete(fn),
  };
  const win = {
    scrollTo: vi.fn(),
    requestAnimationFrame: (fn: () => void) => frames.push(fn),
    document: doc as unknown as Document,
  };
  const flush = () => {
    for (let i = 0; i < 4; i++) for (const fn of frames.splice(0)) fn();
  };
  return {
    gsap,
    ScrollTrigger,
    Lenis,
    lenisInstance,
    win,
    doc,
    tickers,
    triggers,
    flush,
    log,
    scroll: () => onScroll(),
  };
}

describe("createSpine", () => {
  it("drives Lenis from the one GSAP ticker and updates ScrollTrigger on scroll", () => {
    const f = fakes();
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: false });
    expect(f.tickers.size).toBe(1);
    expect(f.gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0);
    for (const fn of f.tickers) fn(1.5, 16, 1);
    expect(f.lenisInstance.raf).toHaveBeenCalledWith(1500);
    f.scroll();
    expect(f.ScrollTrigger.update).toHaveBeenCalledTimes(1);
    expect(spine.stats()).toMatchObject({ lenis: true, tickers: 1 });
    spine.destroy();
    expect(f.tickers.size).toBe(0);
    expect(f.lenisInstance.destroy).toHaveBeenCalled();
  });

  it("uses native scrolling under reduced motion", () => {
    const f = fakes();
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: true });
    expect(spine.lenis).toBeNull();
    expect(f.tickers.size).toBe(0);
    spine.scrollTo(400);
    expect(f.win.scrollTo).toHaveBeenCalledWith(0, 400);
  });

  it("coalesces refreshes into one per frame and logs the reason", () => {
    const f = fakes();
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: false });
    spine.refresh("resize");
    spine.refresh("resize");
    spine.refresh("orientation");
    f.flush();
    expect(f.ScrollTrigger.refresh).toHaveBeenCalledTimes(1);
    expect(f.lenisInstance.resize).toHaveBeenCalledTimes(1);
    expect(spine.stats().refreshes.map((r) => r.reason)).toEqual(["orientation"]);
  });

  it("refreshes on plumb's layout changes only, with ScrollTrigger's own resize refresh off", () => {
    const f = fakes();
    let listener: ((v: unknown, kind: string) => void) | undefined;
    const plumb = {
      subscribe: (fn: typeof listener) => {
        listener = fn;
        return () => {
          listener = undefined;
        };
      },
    };
    const spine = createSpine({
      ...f,
      window: f.win as never,
      plumb: plumb as unknown as Plumb,
      reducedMotion: false,
    });
    expect(f.ScrollTrigger.config).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreMobileResize: true }),
    );
    listener?.({}, "orientation");
    f.flush();
    expect(spine.stats().refreshes.at(-1)?.reason).toBe("orientation");
    spine.destroy();
    expect(listener).toBeUndefined();
  });

  it("recovers after the tab sleeps, but not after a brief switch", () => {
    vi.useFakeTimers();
    const f = fakes();
    const spine = createSpine({
      ...f,
      window: f.win as never,
      reducedMotion: false,
      sleepAfterMs: 1000,
    });
    const visibility = (state: DocumentVisibilityState) => {
      f.doc.visibilityState = state;
      for (const fn of f.doc.listeners) fn();
    };
    visibility("hidden");
    vi.advanceTimersByTime(200);
    visibility("visible");
    f.flush();
    expect(spine.stats().refreshes).toHaveLength(0);
    visibility("hidden");
    vi.advanceTimersByTime(5000);
    visibility("visible");
    f.flush();
    expect(spine.stats().refreshes.map((r) => r.reason)).toEqual(["wake"]);
    vi.useRealTimers();
  });

  it("on a route change reverts scopes newest first, goes to the top, then refreshes", () => {
    const f = fakes();
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: false });
    spine.route("/");
    f.flush();
    spine.scope(() => {});
    spine.scope(() => {});
    expect(spine.stats().scopes).toBe(2);
    spine.route("/work");
    expect(f.log).toEqual(["context 0", "context 1", "revert 1", "revert 0"]);
    expect(f.lenisInstance.scrollTo).toHaveBeenCalledWith(0, { immediate: true, force: true });
    expect(f.ScrollTrigger.clearScrollMemory).toHaveBeenCalled();
    f.flush();
    expect(spine.stats().refreshes.map((r) => r.reason)).toEqual(["start", "route"]);
    expect(spine.stats()).toMatchObject({ route: "/work", scopes: 0 });
    // Same route again: nothing happens.
    spine.route("/work");
    expect(f.log).toHaveLength(4);
  });

  it("lets a component revert its own scope early", () => {
    const f = fakes();
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: false });
    const revert = spine.scope(() => {});
    revert();
    expect(f.log).toEqual(["context 0", "revert 0"]);
    expect(spine.stats().scopes).toBe(0);
  });

  it("counts triggers and pins", () => {
    const f = fakes();
    f.triggers.push({ kill: () => {} }, { kill: () => {}, pin: {} as Element });
    const spine = createSpine({ ...f, window: f.win as never, reducedMotion: false });
    expect(spine.stats()).toMatchObject({ triggers: 2, pins: 1 });
  });
});
