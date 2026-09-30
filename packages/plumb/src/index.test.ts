import { describe, expect, it, vi } from "vitest";
import { syncScrollTrigger } from "./gsap.js";
import {
  type ChangeKind,
  classify,
  createPlumb,
  isLayoutChange,
  type PlumbWindow,
  type Viewport,
} from "./index.js";

/** A controllable stand-in for `window`: a phone with collapsible toolbars. */
function fakeWindow(init: { width: number; height: number; coarse?: boolean; dpr?: number }) {
  const handlers = new Map<string, Set<() => void>>();
  const vvHandlers = new Map<string, Set<() => void>>();
  const frames: Array<() => void> = [];
  const add = (map: Map<string, Set<() => void>>) => (type: string, fn: () => void) => {
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)?.add(fn);
  };
  const remove = (map: Map<string, Set<() => void>>) => (type: string, fn: () => void) => {
    map.get(type)?.delete(fn);
  };
  const visual = {
    width: init.width,
    height: init.height,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
    addEventListener: add(vvHandlers),
    removeEventListener: remove(vvHandlers),
  };
  const win: PlumbWindow & { segments: PlumbWindow["viewport"] } = {
    innerWidth: init.width,
    innerHeight: init.height,
    devicePixelRatio: init.dpr ?? 3,
    visualViewport: visual,
    matchMedia: (query: string) => ({
      matches: query === "(pointer: coarse)" ? (init.coarse ?? true) : false,
    }),
    addEventListener: add(handlers),
    removeEventListener: remove(handlers),
    requestAnimationFrame: (fn) => frames.push(fn),
    cancelAnimationFrame: () => {},
    setTimeout: (fn, ms) => setTimeout(fn, ms) as unknown as number,
    clearTimeout: (id) => clearTimeout(id),
    segments: undefined,
  };
  const fire = () => {
    for (const fn of handlers.get("resize") ?? []) fn();
    for (const fn of vvHandlers.get("resize") ?? []) fn();
    for (const fn of frames.splice(0)) fn();
  };
  return {
    win,
    listenerCount: () =>
      [...handlers.values(), ...vvHandlers.values()].reduce((sum, set) => sum + set.size, 0),
    /** Set the window size (and the visual viewport with it) and run one frame. */
    resize(width: number, height: number) {
      win.innerWidth = width;
      win.innerHeight = height;
      visual.width = width;
      visual.height = height;
      fire();
    },
    /** Open a keyboard of `px` height: only the visual viewport shrinks. */
    keyboard(px: number) {
      visual.height = win.innerHeight - px;
      fire();
    },
    fold(segments: number) {
      win.viewport = {
        segments: Array.from({ length: segments }, (_, i) => ({
          x: (i * win.innerWidth) / segments,
          y: 0,
          width: win.innerWidth / segments,
          height: win.innerHeight,
        })),
      };
      fire();
    },
    zoom(dpr: number) {
      win.devicePixelRatio = dpr;
      fire();
    },
  };
}

const base: Viewport = {
  width: 390,
  height: 844,
  svh: 750,
  lvh: 844,
  dvh: 750,
  visual: { width: 390, height: 750, offsetTop: 0, offsetLeft: 0, scale: 1 },
  keyboard: 0,
  orientation: "portrait",
  posture: "continuous",
  segments: [],
  dpr: 3,
};

describe("classify", () => {
  const cases: Array<[string, Partial<Viewport>, ChangeKind]> = [
    ["nothing", {}, "none"],
    ["sub-threshold jitter", { dvh: 751, width: 391 }, "none"],
    ["toolbars collapsing", { dvh: 844 }, "toolbar"],
    ["keyboard opening", { keyboard: 300 }, "keyboard"],
    ["width change", { width: 430 }, "resize"],
    ["the toolbar range being learned", { svh: 700, lvh: 900 }, "toolbar"],
    ["window height change", { svh: 800, lvh: 900, dvh: 800 }, "resize"],
    ["rotation", { orientation: "landscape" }, "orientation"],
    ["zoom", { dpr: 2 }, "dpr"],
    [
      "folding",
      {
        posture: "folded",
        segments: [
          { x: 0, y: 0, width: 1, height: 1 },
          { x: 1, y: 0, width: 1, height: 1 },
        ],
      },
      "posture",
    ],
  ];
  for (const [name, patch, expected] of cases) {
    it(`reads ${name} as ${expected}`, () => {
      expect(classify(base, { ...base, ...patch })).toBe(expected);
    });
  }

  it("marks only real layout changes as layout changes", () => {
    expect(
      ["resize", "orientation", "dpr", "posture"].every((k) => isLayoutChange(k as ChangeKind)),
    ).toBe(true);
    expect(["none", "toolbar", "keyboard"].some((k) => isLayoutChange(k as ChangeKind))).toBe(
      false,
    );
  });
});

describe("createPlumb", () => {
  it("ignores toolbar movement and keyboards, and emits once per real resize", () => {
    vi.useFakeTimers();
    const device = fakeWindow({ width: 390, height: 750 });
    const plumb = createPlumb({ window: device.win, target: null, debounce: 100 });
    const layout = vi.fn();
    const every = vi.fn();
    plumb.subscribe(layout);
    plumb.subscribe(every, { all: true });

    // Scrolling: toolbars collapse and expand, several times.
    for (const height of [760, 790, 844, 800, 750, 844]) device.resize(390, height);
    device.keyboard(320);
    device.keyboard(0);
    vi.advanceTimersByTime(500);
    expect(layout).not.toHaveBeenCalled();
    expect(every).toHaveBeenCalled();
    expect(plumb.viewport.svh).toBe(750);
    expect(plumb.viewport.lvh).toBe(844);
    expect(plumb.viewport.height).toBe(844);

    // A real resize arrives over several frames: one event, after the debounce.
    for (const width of [400, 420, 430]) device.resize(width, 760);
    expect(layout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(layout).toHaveBeenCalledTimes(1);
    expect(layout.mock.calls[0]?.[1]).toBe("resize");
    expect(plumb.viewport.width).toBe(430);

    plumb.destroy();
    vi.useRealTimers();
  });

  it("reports slow toolbar movement that stays under the threshold on every frame", () => {
    vi.useFakeTimers();
    const device = fakeWindow({ width: 390, height: 740 });
    const plumb = createPlumb({ window: device.win, target: null, debounce: 50 });
    const every = vi.fn();
    plumb.subscribe(every, { all: true });
    // 80 px in 1 px steps, as on a 240 Hz display.
    for (let height = 741; height <= 820; height++) device.resize(390, height);
    expect(every.mock.calls.length).toBeGreaterThanOrEqual(20);
    // The last pixel or two is reported once the movement stops.
    vi.advanceTimersByTime(50);
    expect(every.mock.calls.at(-1)?.[0].dvh).toBe(820);
    expect(plumb.viewport.lvh).toBe(820);
    plumb.destroy();
    vi.useRealTimers();
  });

  it("reports the keyboard height from the visual viewport", () => {
    const device = fakeWindow({ width: 390, height: 750 });
    const plumb = createPlumb({ window: device.win, target: null });
    device.keyboard(300);
    expect(plumb.viewport.keyboard).toBe(300);
    device.keyboard(0);
    expect(plumb.viewport.keyboard).toBe(0);
    plumb.destroy();
  });

  it("treats height changes on a desktop as a resize, not toolbars", () => {
    vi.useFakeTimers();
    const device = fakeWindow({ width: 1280, height: 800, coarse: false, dpr: 1 });
    const plumb = createPlumb({ window: device.win, target: null, debounce: 50 });
    const layout = vi.fn();
    plumb.subscribe(layout);
    device.resize(1280, 700);
    vi.advanceTimersByTime(50);
    expect(layout).toHaveBeenCalledTimes(1);
    plumb.destroy();
    vi.useRealTimers();
  });

  it("emits for rotation, zoom and folding", () => {
    vi.useFakeTimers();
    const device = fakeWindow({ width: 390, height: 750 });
    const plumb = createPlumb({ window: device.win, target: null, debounce: 10 });
    const kinds: ChangeKind[] = [];
    plumb.subscribe((_, kind) => kinds.push(kind));
    device.resize(844, 390);
    vi.advanceTimersByTime(10);
    device.zoom(2);
    vi.advanceTimersByTime(10);
    device.fold(2);
    vi.advanceTimersByTime(10);
    expect(kinds).toEqual(["orientation", "dpr", "posture"]);
    expect(plumb.viewport.posture).toBe("folded");
    plumb.destroy();
    vi.useRealTimers();
  });

  it("uses a probe when one is given, and the small height when asked", () => {
    const device = fakeWindow({ width: 390, height: 780 });
    const plumb = createPlumb({
      window: device.win,
      target: null,
      height: "small",
      probe: () => ({ svh: 700, lvh: 800 }),
    });
    expect(plumb.viewport).toMatchObject({ svh: 700, lvh: 800, dvh: 780, height: 700 });
    plumb.destroy();
  });

  it("writes CSS variables and removes them, and every listener, on destroy", () => {
    const device = fakeWindow({ width: 390, height: 750 });
    const props = new Map<string, string>();
    const target = {
      style: {
        setProperty: (name: string, value: string) => props.set(name, value),
        removeProperty: (name: string) => props.delete(name),
      },
      dataset: {} as Record<string, string>,
    } as unknown as HTMLElement;
    const plumb = createPlumb({ window: device.win, target });
    expect(props.get("--plumb-height")).toBe("750px");
    expect(props.get("--plumb-vh")).toBe("7.5px");
    expect(target.dataset.plumbOrientation).toBe("portrait");
    expect(device.listenerCount()).toBeGreaterThan(0);
    plumb.destroy();
    expect(props.size).toBe(0);
    expect(device.listenerCount()).toBe(0);
  });

  it("refresh() emits a resize immediately", () => {
    const device = fakeWindow({ width: 390, height: 750 });
    const plumb = createPlumb({ window: device.win, target: null });
    const layout = vi.fn();
    plumb.subscribe(layout);
    plumb.refresh();
    expect(layout).toHaveBeenCalledWith(plumb.viewport, "resize");
    plumb.destroy();
  });
});

describe("syncScrollTrigger", () => {
  it("turns off ScrollTrigger's raw resize refresh and refreshes on layout changes only", () => {
    vi.useFakeTimers();
    const device = fakeWindow({ width: 390, height: 750 });
    const plumb = createPlumb({ window: device.win, target: null, debounce: 10 });
    const scrollTrigger = { config: vi.fn(), refresh: vi.fn() };
    const stop = syncScrollTrigger(plumb, scrollTrigger);
    expect(scrollTrigger.config).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreMobileResize: true }),
    );
    expect(scrollTrigger.config.mock.calls[0]?.[0].autoRefreshEvents).not.toMatch(/resize/);

    device.resize(390, 844);
    vi.advanceTimersByTime(50);
    expect(scrollTrigger.refresh).not.toHaveBeenCalled();
    device.resize(430, 844);
    vi.advanceTimersByTime(50);
    expect(scrollTrigger.refresh).toHaveBeenCalledTimes(1);

    stop();
    expect(scrollTrigger.config.mock.calls[1]?.[0].autoRefreshEvents).toMatch(/resize/);
    plumb.destroy();
    vi.useRealTimers();
  });
});
