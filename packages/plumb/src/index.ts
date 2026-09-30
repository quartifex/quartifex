// @quartifex/plumb (L28, Responsive scenes). A stable viewport layer.
//
// Mobile browsers change the window height while you scroll (toolbars collapse and
// expand) and when the keyboard opens. Pinned scroll scenes that listen to `resize`
// then recalculate on every twitch. plumb measures the viewport once per frame, sorts
// each change into toolbar / keyboard / real resize, keeps steady CSS variables, and
// emits one debounced change event only for changes that should move a layout.
//
// Framework-neutral core. React lives in ./react, GSAP ScrollTrigger wiring in ./gsap.

export type Segment = { x: number; y: number; width: number; height: number };

export type Viewport = {
  /** Layout viewport width in CSS pixels. */
  width: number;
  /** Stable height for layout: the large viewport height unless `height: "small"` is set. */
  height: number;
  /** Small viewport height: toolbars expanded (`100svh`). */
  svh: number;
  /** Large viewport height: toolbars collapsed (`100lvh`). */
  lvh: number;
  /** Dynamic viewport height: what is visible right now (`100dvh`). */
  dvh: number;
  /** The visual viewport (pinch zoom, keyboard). */
  visual: { width: number; height: number; offsetTop: number; offsetLeft: number; scale: number };
  /** CSS pixels hidden by an on-screen keyboard, 0 when closed. An estimate. */
  keyboard: number;
  orientation: "portrait" | "landscape";
  /** "folded" when the viewport spans more than one display segment (foldables). */
  posture: "continuous" | "folded";
  segments: Segment[];
  dpr: number;
};

/** Why the viewport changed. Only `resize`, `orientation`, `dpr` and `posture` are layout changes. */
export type ChangeKind =
  | "none"
  | "toolbar"
  | "keyboard"
  | "resize"
  | "orientation"
  | "dpr"
  | "posture";

type Listenable = {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void): void;
};

type VisualViewportLike = Listenable & {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
  scale: number;
};

type MediaQueryLike = { matches: boolean } & Partial<Listenable>;

/** The parts of `window` plumb reads. Pass a stand-in to drive plumb in tests or a simulated device. */
export type PlumbWindow = Listenable & {
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  visualViewport?: VisualViewportLike | null;
  matchMedia?: (query: string) => MediaQueryLike;
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(handle: number): void;
  setTimeout(callback: () => void, ms: number): number;
  clearTimeout(handle: number): void;
  /** Viewport Segments API, where available. */
  viewport?: { segments?: ArrayLike<Segment> | null };
};

export type Options = {
  /** Where the CSS variables go. Defaults to `document.documentElement`; `null` writes none. */
  target?: HTMLElement | null;
  /** Wait this long after the last layout change before emitting. Default 150 ms. */
  debounce?: number;
  /** Changes smaller than this (CSS px) are noise. Default 2. */
  threshold?: number;
  /** Largest height swing treated as toolbars where they cannot be measured. Default 160. */
  maxToolbar?: number;
  /** Which height `--plumb-height` follows. Default "large". */
  height?: "large" | "small";
  /** Stand-in for `window`. Defaults to the real one. */
  window?: PlumbWindow;
  /** Measures `100svh` and `100lvh` in px. Defaults to hidden probes when CSS supports the units; `null` disables. */
  probe?: (() => { svh: number; lvh: number }) | null;
};

export type Listener = (viewport: Viewport, change: ChangeKind) => void;

export type Plumb = {
  /** The latest measurement. */
  readonly viewport: Viewport;
  /**
   * Called once per settled layout change (debounced). With `{ all: true }` it is also
   * called, at most once per frame, for toolbar and keyboard movement. Returns an unsubscribe.
   */
  subscribe(listener: Listener, options?: { all?: boolean }): () => void;
  /** Measure now and emit a `resize` to layout listeners, e.g. after fonts load. */
  refresh(): void;
  /** Remove listeners, probes and CSS variables. */
  destroy(): void;
};

const LAYOUT: ReadonlySet<ChangeKind> = new Set(["resize", "orientation", "dpr", "posture"]);

/** True for the change kinds that should move a layout (and refresh ScrollTrigger). */
export function isLayoutChange(kind: ChangeKind): boolean {
  return LAYOUT.has(kind);
}

/**
 * Sort a change between two measurements. Pure: this is the rule set plumb runs on
 * every frame, exported so it can be tested and reused.
 */
export function classify(prev: Viewport, next: Viewport, threshold = 2): ChangeKind {
  if (prev.orientation !== next.orientation) return "orientation";
  if (prev.posture !== next.posture || prev.segments.length !== next.segments.length) {
    return "posture";
  }
  if (Math.abs(prev.dpr - next.dpr) > 0.001) return "dpr";
  if (Math.abs(prev.width - next.width) > threshold) return "resize";
  const rangeMoved =
    Math.abs(prev.svh - next.svh) > threshold || Math.abs(prev.lvh - next.lvh) > threshold;
  // Where svh and lvh are learned rather than measured, the range only ever widens while
  // toolbars move. Any other move of the range is the window itself changing height.
  const widened = next.svh <= prev.svh + threshold && next.lvh >= prev.lvh - threshold;
  if (rangeMoved && !widened) return "resize";
  if (Math.abs(prev.keyboard - next.keyboard) > threshold) return "keyboard";
  if (Math.abs(prev.dvh - next.dvh) > threshold || rangeMoved) return "toolbar";
  return "none";
}

function segmentsOf(win: PlumbWindow): Segment[] {
  const list = win.viewport?.segments;
  if (!list || list.length < 2) return [];
  return Array.from(list, ({ x, y, width, height }) => ({ x, y, width, height }));
}

/** Hidden fixed elements sized 100svh and 100lvh: the browser's own answer, where it has one. */
function createProbe(): { read: () => { svh: number; lvh: number }; remove: () => void } | null {
  if (typeof document === "undefined" || typeof CSS === "undefined") return null;
  if (!CSS.supports("height", "100svh")) return null;
  const make = (unit: string) => {
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;top:0;left:0;width:0;height:100${unit};visibility:hidden;pointer-events:none`;
    document.body.append(el);
    return el;
  };
  const small = make("svh");
  const large = make("lvh");
  return {
    read: () => ({ svh: small.offsetHeight, lvh: large.offsetHeight }),
    remove: () => {
      small.remove();
      large.remove();
    },
  };
}

const VARS = ["width", "height", "vh", "svh", "lvh", "dvh", "keyboard", "dpr"] as const;

/** Start watching the viewport. One instance per page is enough; share it. */
export function createPlumb(options: Options = {}): Plumb {
  const win = options.window ?? (globalThis as unknown as PlumbWindow);
  const threshold = options.threshold ?? 2;
  const debounce = options.debounce ?? 150;
  const maxToolbar = options.maxToolbar ?? 160;
  const target =
    options.target !== undefined
      ? options.target
      : typeof document === "undefined"
        ? null
        : document.documentElement;
  const ownProbe = options.probe === undefined && !options.window ? createProbe() : null;
  const probe = options.probe ?? ownProbe?.read ?? null;
  const coarse = win.matchMedia?.("(pointer: coarse)").matches ?? false;

  // Without a probe, learn svh and lvh as the smallest and largest heights seen at this
  // width, but only on touch devices and only within a toolbar-sized swing.
  let seenWidth = win.innerWidth;
  let seenMin = win.innerHeight;
  let seenMax = win.innerHeight;

  function measure(): Viewport {
    const width = win.innerWidth;
    const dvh = win.innerHeight;
    const vv = win.visualViewport;
    const visual = vv
      ? {
          width: vv.width,
          height: vv.height,
          offsetTop: vv.offsetTop,
          offsetLeft: vv.offsetLeft,
          scale: vv.scale,
        }
      : { width, height: dvh, offsetTop: 0, offsetLeft: 0, scale: 1 };

    let svh: number;
    let lvh: number;
    const probed = probe?.();
    if (probed && probed.lvh > 0) {
      svh = probed.svh;
      lvh = probed.lvh;
    } else {
      const sameWidth = Math.abs(width - seenWidth) <= threshold;
      const swing = Math.max(seenMax, dvh) - Math.min(seenMin, dvh);
      if (coarse && sameWidth && swing <= maxToolbar) {
        seenMin = Math.min(seenMin, dvh);
        seenMax = Math.max(seenMax, dvh);
      } else {
        seenWidth = width;
        seenMin = dvh;
        seenMax = dvh;
      }
      svh = seenMin;
      lvh = seenMax;
    }

    // A keyboard shrinks the visual viewport well below the layout viewport. Pinch zoom
    // also shrinks it, so only count it at scale 1.
    const covered = Math.round(dvh - (visual.height + visual.offsetTop));
    const keyboard = Math.abs(visual.scale - 1) < 0.01 && covered > 80 ? covered : 0;
    const segments = segmentsOf(win);

    return {
      width,
      height: options.height === "small" ? svh : lvh,
      svh,
      lvh,
      dvh,
      visual,
      keyboard,
      orientation: width > lvh ? "landscape" : "portrait",
      posture: segments.length > 1 ? "folded" : "continuous",
      segments,
      dpr: win.devicePixelRatio || 1,
    };
  }

  let current = measure();
  let committed = current;
  let reported = current;
  const layoutListeners = new Set<Listener>();
  const allListeners = new Set<Listener>();
  let frame = 0;
  let timer = 0;
  let trailTimer = 0;
  let pendingKind: ChangeKind = "none";

  function writeVars(v: Viewport) {
    if (!target) return;
    const values: Record<(typeof VARS)[number], string> = {
      width: `${v.width}px`,
      height: `${v.height}px`,
      vh: `${v.height / 100}px`,
      svh: `${v.svh}px`,
      lvh: `${v.lvh}px`,
      dvh: `${v.dvh}px`,
      keyboard: `${v.keyboard}px`,
      dpr: String(v.dpr),
    };
    for (const name of VARS) target.style.setProperty(`--plumb-${name}`, values[name]);
    target.dataset.plumbOrientation = v.orientation;
    target.dataset.plumbPosture = v.posture;
  }

  function report(kind: ChangeKind) {
    reported = current;
    writeVars(current);
    for (const listener of [...allListeners]) listener(current, kind);
  }

  function emitLayout(kind: ChangeKind) {
    committed = current;
    for (const listener of [...layoutListeners]) listener(current, kind);
  }

  function update() {
    frame = 0;
    current = measure();
    // Compare with the last state we reported, not the last frame: a toolbar sliding a
    // pixel per frame on a fast display is under the threshold every frame, but not in total.
    const step = classify(reported, current, threshold);
    if (step !== "none") {
      report(step);
    } else if (classify(reported, current, 0) !== "none") {
      // Movement too small to report yet: report where it settles, once it stops.
      win.clearTimeout(trailTimer);
      trailTimer = win.setTimeout(() => {
        trailTimer = 0;
        const kind = classify(reported, current, 0);
        if (kind !== "none") report(kind);
      }, debounce);
    }
    // Compare with the last emitted state, so a toolbar that moves and comes back emits
    // nothing, and a real resize emits once however many frames it takes.
    const settled = classify(committed, current, threshold);
    if (isLayoutChange(settled)) {
      pendingKind = settled;
      win.clearTimeout(timer);
      timer = win.setTimeout(() => {
        timer = 0;
        emitLayout(pendingKind);
      }, debounce);
    } else if (timer) {
      win.clearTimeout(timer);
      timer = 0;
    }
  }

  const schedule = () => {
    if (!frame) frame = win.requestAnimationFrame(update);
  };

  const queries = [
    "(orientation: portrait)",
    "(horizontal-viewport-segments: 2)",
    "(vertical-viewport-segments: 2)",
  ]
    .map((query) => win.matchMedia?.(query))
    .filter((mql): mql is MediaQueryLike => Boolean(mql?.addEventListener));

  // Resolution changes (browser zoom, moving to another screen) need a fresh query each time.
  let dprQuery: MediaQueryLike | undefined;
  function onDpr() {
    watchDpr();
    schedule();
  }
  function watchDpr() {
    dprQuery?.removeEventListener?.("change", onDpr);
    dprQuery = win.matchMedia?.(`(resolution: ${win.devicePixelRatio || 1}dppx)`);
    dprQuery?.addEventListener?.("change", onDpr);
  }

  win.addEventListener("resize", schedule, { passive: true });
  win.addEventListener("orientationchange", schedule, { passive: true });
  win.visualViewport?.addEventListener("resize", schedule, { passive: true });
  win.visualViewport?.addEventListener("scroll", schedule, { passive: true });
  for (const mql of queries) mql.addEventListener?.("change", schedule);
  watchDpr();
  writeVars(current);

  return {
    get viewport() {
      return current;
    },
    subscribe(listener, subscribeOptions = {}) {
      layoutListeners.add(listener);
      if (subscribeOptions.all) allListeners.add(listener);
      return () => {
        layoutListeners.delete(listener);
        allListeners.delete(listener);
      };
    },
    refresh() {
      current = measure();
      reported = current;
      writeVars(current);
      win.clearTimeout(timer);
      timer = 0;
      emitLayout("resize");
    },
    destroy() {
      win.removeEventListener("resize", schedule);
      win.removeEventListener("orientationchange", schedule);
      win.visualViewport?.removeEventListener("resize", schedule);
      win.visualViewport?.removeEventListener("scroll", schedule);
      for (const mql of queries) mql.removeEventListener?.("change", schedule);
      dprQuery?.removeEventListener?.("change", onDpr);
      if (frame) win.cancelAnimationFrame(frame);
      win.clearTimeout(timer);
      win.clearTimeout(trailTimer);
      ownProbe?.remove();
      layoutListeners.clear();
      allListeners.clear();
      if (target) {
        for (const name of VARS) target.style.removeProperty(`--plumb-${name}`);
        delete target.dataset.plumbOrientation;
        delete target.dataset.plumbPosture;
      }
    },
  };
}
