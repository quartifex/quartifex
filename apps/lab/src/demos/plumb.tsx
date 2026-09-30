"use client";

// Hub demo for @quartifex/plumb, shown on /plumb. A simulated mobile browser whose
// toolbars collapse and expand, whose keyboard opens, and which can rotate, fold and
// change pixel ratio. A real plumb instance watches it through a stand-in `window`, and
// the counters show how many raw resize events it absorbed.
import { createPlumb, type PlumbWindow, type Viewport } from "@quartifex/plumb";
import { usePlumb } from "@quartifex/plumb/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { presetSize, Screen } from "@/components/demo/DeviceStage";
import {
  Button,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import styles from "./plumb.module.css";

const DEVICES = [
  { value: "tall-phone", label: "9:19.5" },
  { value: "phone", label: "9:16" },
  { value: "tablet", label: "3:4" },
] as const;
const DPRS = [
  { value: "2", label: "2x" },
  { value: "3", label: "3x" },
] as const;

// Toolbar heights of a typical mobile browser: expanded, and collapsed to a small pill.
const CHROME_EXPANDED = 104;
const CHROME_COLLAPSED = 24;
// Of the expanded chrome, the address bar at the top; the rest is the bottom toolbar.
const TOP_EXPANDED = 56;
const KEYBOARD = 300;

type Sim = {
  win: PlumbWindow;
  set(patch: {
    width?: number;
    height?: number;
    dpr?: number;
    keyboard?: number;
    segments?: number;
  }): void;
};

/** A stand-in `window` for a simulated browser, firing resize events the way real ones do. */
function simulatedWindow(width: number, height: number, dpr: number, onRawResize: () => void): Sim {
  const listeners = new Map<string, Set<() => void>>();
  const vvListeners = new Map<string, Set<() => void>>();
  const on = (map: typeof listeners) => (type: string, fn: () => void) => {
    if (!map.has(type)) map.set(type, new Set());
    map.get(type)?.add(fn);
  };
  const off = (map: typeof listeners) => (type: string, fn: () => void) =>
    map.get(type)?.delete(fn);
  const fire = (map: typeof listeners, type: string) => {
    for (const fn of map.get(type) ?? []) fn();
  };
  const visual = {
    width,
    height,
    offsetTop: 0,
    offsetLeft: 0,
    scale: 1,
    addEventListener: on(vvListeners),
    removeEventListener: off(vvListeners),
  };
  const win: PlumbWindow = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: dpr,
    visualViewport: visual,
    matchMedia: (query) => ({ matches: query === "(pointer: coarse)" }),
    addEventListener: on(listeners),
    removeEventListener: off(listeners),
    requestAnimationFrame: (fn) => requestAnimationFrame(fn),
    cancelAnimationFrame: (id) => cancelAnimationFrame(id),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
  let keyboard = 0;
  let segmentCount = 0;
  return {
    win,
    set(patch) {
      const before = {
        w: win.innerWidth,
        h: win.innerHeight,
        dpr: win.devicePixelRatio,
        kb: keyboard,
      };
      if (patch.width !== undefined) win.innerWidth = patch.width;
      if (patch.height !== undefined) win.innerHeight = patch.height;
      if (patch.dpr !== undefined) win.devicePixelRatio = patch.dpr;
      if (patch.keyboard !== undefined) keyboard = patch.keyboard;
      const refold = patch.segments !== undefined && patch.segments !== segmentCount;
      if (patch.segments !== undefined && refold) {
        segmentCount = patch.segments;
        const w = win.innerWidth / Math.max(patch.segments, 1);
        win.viewport = {
          segments: Array.from({ length: patch.segments }, (_, i) => ({
            x: i * w,
            y: 0,
            width: w,
            height: win.innerHeight,
          })),
        };
      }
      visual.width = win.innerWidth;
      visual.height = win.innerHeight - keyboard;
      const layoutMoved =
        before.w !== win.innerWidth ||
        before.h !== win.innerHeight ||
        before.dpr !== win.devicePixelRatio;
      if (layoutMoved || refold) {
        onRawResize();
        fire(listeners, "resize");
      }
      if (layoutMoved || before.kb !== keyboard) fire(vvListeners, "resize");
    },
  };
}

function useCount(): [number, () => void, () => void] {
  const [count, setCount] = useState(0);
  const bump = useCallback(() => setCount((c) => c + 1), []);
  const reset = useCallback(() => setCount(0), []);
  return [count, bump, reset];
}

export default function Demo() {
  const [preset, setPreset] = useState<(typeof DEVICES)[number]["value"]>("tall-phone");
  const [dpr, setDpr] = useState<"2" | "3">("3");
  const [rotated, setRotated] = useState(false);
  const [folded, setFolded] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [collapse, setCollapse] = useState(0);
  const [autoScroll, setAutoScroll] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const [raw, bumpRaw, resetRaw] = useCount();
  const [layout, bumpLayout, resetLayout] = useCount();
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [lastChange, setLastChange] = useState("none yet");
  const host = useRef<HTMLDivElement>(null);

  const base = presetSize(preset);
  const screen = rotated ? { width: base.height, height: base.width } : base;
  const chrome = CHROME_EXPANDED - (CHROME_EXPANDED - CHROME_COLLAPSED) * collapse;
  const inner = Math.round(screen.height - chrome);

  // One stand-in window for the demo's lifetime, created with the first screen's values.
  const [sim] = useState(() => simulatedWindow(screen.width, inner, Number(dpr), bumpRaw));

  useEffect(() => {
    const instance = createPlumb({
      window: sim.win,
      target: host.current,
      probe: null,
      debounce: 150,
    });
    setViewport(instance.viewport);
    const offAll = instance.subscribe((v) => setViewport(v), { all: true });
    const offLayout = instance.subscribe((v, kind) => {
      setViewport(v);
      setLastChange(kind);
      bumpLayout();
    });
    return () => {
      offAll();
      offLayout();
      instance.destroy();
    };
  }, [sim, bumpLayout]);

  // Push every simulated change into the stand-in window.
  useEffect(() => {
    sim.set({
      width: screen.width,
      height: inner,
      dpr: Number(dpr),
      keyboard: keyboard ? (rotated ? 200 : KEYBOARD) : 0,
    });
  }, [sim, screen.width, inner, dpr, keyboard, rotated]);
  useEffect(() => {
    sim.set({ segments: folded ? 2 : 0 });
  }, [sim, folded]);

  // Toolbars animate over ~250 ms per swipe, firing a resize every frame, as browsers do.
  const collapseNow = useRef(0);
  collapseNow.current = collapse;
  const target = useRef(0);
  const animateTo = useCallback(
    (value: number) => {
      target.current = value;
      if (reduced) {
        setCollapse(value);
        return;
      }
      const from = collapseNow.current;
      const start = performance.now();
      const step = (now: number) => {
        if (target.current !== value) return;
        const t = Math.min((now - start) / 250, 1);
        setCollapse(from + (value - from) * t);
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    },
    [reduced],
  );

  useEffect(() => {
    if (!autoScroll || reduced) return;
    let down = true;
    const id = window.setInterval(() => {
      animateTo(down ? 1 : 0);
      down = !down;
    }, 700);
    return () => window.clearInterval(id);
  }, [autoScroll, reduced, animateTo]);

  const saved = Math.max(raw - layout, 0);
  return (
    <div className={styles.demo} data-demo="plumb">
      <Controls label="Simulated device">
        <Segmented legend="Aspect" value={preset} choices={DEVICES} onChange={setPreset} />
        <Segmented legend="Pixel ratio" value={dpr} choices={DPRS} onChange={setDpr} />
        <Button onClick={() => setRotated((r) => !r)} pressed={rotated}>
          Rotate
        </Button>
        <Toggle label="Fold (two segments)" checked={folded} onChange={setFolded} />
      </Controls>

      <div className={styles.split}>
        <Screen device={screen} maxHeight={600} label="Simulated mobile browser">
          <div className={styles.browser}>
            <div
              className={styles.chrome}
              style={{ height: TOP_EXPANDED - (TOP_EXPANDED - CHROME_COLLAPSED) * collapse }}
            >
              <span className={styles.url} data-collapsed={collapse > 0.5 || undefined}>
                lab.quartifex.com
              </span>
            </div>
            <div className={styles.page} ref={host} style={{ height: inner }}>
              <div className={styles.raw} style={{ height: inner }} data-testid="raw-box">
                <span>height from raw resize: {inner}px</span>
              </div>
              <div className={styles.stable} data-testid="plumb-box">
                <span>--plumb-height: {viewport?.height ?? 0}px</span>
              </div>
              {folded && <div className={styles.hinge} style={{ left: screen.width / 2 }} />}
              {keyboard && (
                <div className={styles.keyboard} style={{ height: rotated ? 200 : KEYBOARD }}>
                  keyboard
                </div>
              )}
            </div>
            <div
              className={styles.toolbar}
              style={{ height: (CHROME_EXPANDED - TOP_EXPANDED) * (1 - collapse) }}
            />
          </div>
        </Screen>

        <div className={styles.side}>
          <Controls label="Browser actions">
            <Button onClick={() => animateTo(1)}>Scroll down</Button>
            <Button onClick={() => animateTo(0)}>Scroll up</Button>
            <Toggle
              label="Keep scrolling"
              checked={autoScroll && !reduced}
              disabled={reduced}
              onChange={setAutoScroll}
            />
            <Toggle label="Keyboard" checked={keyboard} onChange={setKeyboard} />
            <ReducedMotionToggle value={reduced} onChange={setReduced} />
          </Controls>
          <Readout
            label="Events"
            rows={[
              ["Raw resize events", raw, "raw-count"],
              ["plumb layout events", layout, "layout-count"],
              ["Refreshes saved", saved, "saved-count"],
              ["Last layout change", lastChange, "last-change"],
            ]}
          />
          {viewport && (
            <Readout
              label="plumb viewport"
              rows={[
                ["width", viewport.width, "vp-width"],
                ["height", viewport.height, "vp-height"],
                ["svh / lvh", `${viewport.svh} / ${viewport.lvh}`],
                ["dvh", viewport.dvh, "vp-dvh"],
                ["keyboard", viewport.keyboard, "vp-keyboard"],
                ["orientation", viewport.orientation],
                ["posture", viewport.posture],
                ["dpr", viewport.dpr],
              ]}
            />
          )}
          <Button
            onClick={() => {
              resetRaw();
              resetLayout();
              setLastChange("none yet");
            }}
          >
            Reset counters
          </Button>
        </div>
      </div>

      <ThisWindow />
      <Note>
        Scrolling a mobile page collapses the toolbars and fires a resize every frame; a pinned
        scene listening to those events recalculates each time. plumb learns the small and large
        heights, keeps --plumb-height on the large one, and emits a layout change only when the
        width, orientation, pixel ratio or posture really changes: one event, after the resize
        settles.
        {reduced
          ? " Reduced motion is on: toolbars snap instead of sliding, and auto-scroll is off."
          : ""}
      </Note>
    </div>
  );
}

/** plumb on the real window, through the React adapter. */
function ThisWindow() {
  const viewport = usePlumb();
  const [changes, bump] = useCount();
  const previous = useRef<Viewport | null>(null);
  useEffect(() => {
    if (previous.current && viewport && previous.current !== viewport) bump();
    previous.current = viewport;
  }, [viewport, bump]);
  if (!viewport) return null;
  return (
    <Readout
      label="This browser window"
      rows={[
        ["Your window", `${viewport.width} x ${viewport.height}`, "win-size"],
        ["svh / lvh / dvh", `${viewport.svh} / ${viewport.lvh} / ${viewport.dvh}`],
        ["Pixel ratio", viewport.dpr],
        ["Layout changes", changes, "win-changes"],
      ]}
    />
  );
}
