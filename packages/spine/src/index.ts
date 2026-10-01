// @quartifex/spine (L04, Scroll & sequence). Lenis, GSAP ScrollTrigger and a router wired
// together once: one ticker drives both, ScrollTrigger refreshes on real layout changes
// (through plumb, never on mobile toolbar jitter), after a tab wakes from sleep, and after
// a route change, and pins are torn down in a safe order. You pass gsap, ScrollTrigger and
// Lenis in: none of them is imported here. React in ./react, Next.js App Router in ./next.
import type { Plumb } from "@quartifex/plumb";

export type TickerFn = (time: number, deltaTime: number, frame: number) => void;

export type GsapLike = {
  ticker: {
    add(fn: TickerFn): void;
    remove(fn: TickerFn): void;
    lagSmoothing(threshold: number, adjusted?: number): void;
  };
  context(fn: () => void, scope?: Element | string): { revert(): void };
};

export type TriggerLike = { kill(revert?: boolean): void; pin?: Element | undefined };

export type ScrollTriggerLike = {
  update(): void;
  refresh(safe?: boolean): void;
  config(options: { ignoreMobileResize?: boolean; autoRefreshEvents?: string }): void;
  getAll(): TriggerLike[];
  clearScrollMemory?(mode?: string): void;
};

export type LenisLike = {
  raf(time: number): void;
  on(event: "scroll", fn: () => void): unknown;
  scrollTo(
    target: number | string | HTMLElement,
    options?: { immediate?: boolean; force?: boolean },
  ): void;
  resize(): void;
  destroy(): void;
};

export type LenisConstructor = new (options?: Record<string, unknown>) => LenisLike;

export type SpineOptions = {
  gsap: GsapLike;
  ScrollTrigger: ScrollTriggerLike;
  /** The Lenis class. Leave it out for native scrolling. */
  Lenis?: LenisConstructor;
  /** Options for Lenis (autoRaf is always off: spine drives it). */
  lenis?: Record<string, unknown>;
  /** A plumb instance: refresh only on settled layout changes, never on toolbar movement. */
  plumb?: Plumb;
  /** Native scroll, no Lenis. Default: the visitor's `prefers-reduced-motion`. */
  reducedMotion?: boolean;
  /** A hidden tab counts as asleep after this long. Default 1000 ms. */
  sleepAfterMs?: number;
  /** Stand-in for window and document (tests). */
  window?: Pick<Window, "scrollTo" | "requestAnimationFrame"> & {
    document: Pick<Document, "addEventListener" | "removeEventListener" | "visibilityState">;
  };
};

export type RefreshReason =
  | "start"
  | "resize"
  | "orientation"
  | "dpr"
  | "posture"
  | "wake"
  | "route"
  | "manual";

export type SpineStats = {
  lenis: boolean;
  /** Functions spine added to the GSAP ticker: always 1 with Lenis, else 0. */
  tickers: number;
  triggers: number;
  pins: number;
  route: string | null;
  scopes: number;
  refreshes: Array<{ reason: RefreshReason; at: number }>;
};

export type Spine = {
  readonly lenis: LenisLike | null;
  /** Refresh ScrollTrigger (and Lenis' sizes) on the next frame, once, however often it is asked. */
  refresh(reason?: RefreshReason): void;
  /**
   * Tell spine the route changed: animations created with `scope` for the old route are
   * reverted (pins newest first), the page goes to the top, and ScrollTrigger refreshes
   * once the new route has laid out.
   */
  route(key: string): void;
  /** Create animations in a gsap.context tied to the current route. Returns its revert. */
  scope(fn: () => void, element?: Element | string): () => void;
  /** Scroll to a target: smooth with Lenis, instant without. */
  scrollTo(target: number | string | HTMLElement, options?: { immediate?: boolean }): void;
  stats(): SpineStats;
  destroy(): void;
};

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function createSpine(options: SpineOptions): Spine {
  const { gsap, ScrollTrigger } = options;
  const win = options.window ?? window;
  const reduced = options.reducedMotion ?? prefersReducedMotion();
  const sleepAfter = options.sleepAfterMs ?? 1000;
  const refreshes: SpineStats["refreshes"] = [];
  const scopes: Array<{ revert(): void }> = [];
  let route: string | null = null;
  let destroyed = false;

  // One ticker: GSAP's drives Lenis, and Lenis tells ScrollTrigger when it scrolls.
  const lenis =
    !reduced && options.Lenis ? new options.Lenis({ ...options.lenis, autoRaf: false }) : null;
  const tick: TickerFn = (time) => lenis?.raf(time * 1000);
  if (lenis) {
    lenis.on("scroll", () => ScrollTrigger.update());
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
  }

  let pending: RefreshReason | null = null;
  const refresh = (reason: RefreshReason = "manual") => {
    if (destroyed) return;
    const first = pending === null;
    pending = reason;
    if (!first) return;
    win.requestAnimationFrame(() => {
      if (destroyed || pending === null) return;
      lenis?.resize();
      ScrollTrigger.refresh(true);
      refreshes.push({ reason: pending, at: Date.now() });
      if (refreshes.length > 20) refreshes.shift();
      pending = null;
    });
  };

  // Layout changes through plumb; ScrollTrigger's own resize refresh is turned off.
  let unsubscribe: () => void = () => {};
  if (options.plumb) {
    ScrollTrigger.config({
      ignoreMobileResize: true,
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
    });
    unsubscribe = options.plumb.subscribe((_, kind) =>
      refresh(kind === "orientation" || kind === "dpr" || kind === "posture" ? kind : "resize"),
    );
  }

  // Tab sleep: timers and rAF stop; on wake, sizes may be stale and the ticker far behind.
  let hiddenAt = 0;
  const onVisibility = () => {
    if (win.document.visibilityState === "hidden") {
      hiddenAt = Date.now();
    } else if (hiddenAt && Date.now() - hiddenAt >= sleepAfter) {
      hiddenAt = 0;
      refresh("wake");
    }
  };
  win.document.addEventListener("visibilitychange", onVisibility);

  const revertScopes = () => {
    // Newest first: a pin created later may sit inside an earlier pin's spacer.
    while (scopes.length) scopes.pop()?.revert();
  };

  return {
    lenis,
    refresh,
    route(key) {
      if (key === route) return;
      const first = route === null;
      route = key;
      if (first) {
        refresh("start");
        return;
      }
      revertScopes();
      ScrollTrigger.clearScrollMemory?.("manual");
      if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
      else win.scrollTo(0, 0);
      // Two frames: the new route renders, then it lays out.
      win.requestAnimationFrame(() => win.requestAnimationFrame(() => refresh("route")));
    },
    scope(fn, element) {
      const context = gsap.context(fn, element);
      scopes.push(context);
      return () => {
        const i = scopes.indexOf(context);
        if (i >= 0) scopes.splice(i, 1);
        context.revert();
      };
    },
    scrollTo(target, opts = {}) {
      if (lenis) lenis.scrollTo(target, { immediate: Boolean(opts.immediate) });
      else if (typeof target === "number") win.scrollTo(0, target);
      else {
        const el = typeof target === "string" ? document.querySelector(target) : target;
        el?.scrollIntoView({ behavior: "instant", block: "start" });
      }
    },
    stats() {
      const triggers = ScrollTrigger.getAll();
      return {
        lenis: lenis !== null,
        tickers: lenis ? 1 : 0,
        triggers: triggers.length,
        pins: triggers.filter((t) => t.pin).length,
        route,
        scopes: scopes.length,
        refreshes: [...refreshes],
      };
    },
    destroy() {
      destroyed = true;
      revertScopes();
      unsubscribe();
      win.document.removeEventListener("visibilitychange", onVisibility);
      if (lenis) {
        gsap.ticker.remove(tick);
        lenis.destroy();
      }
    },
  };
}
