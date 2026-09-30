"use client";

// Hub demo for @quartifex/dailies, shown on /dailies. A small scroll page under test,
// with the three things dailies does to it: go to a chapter or a progress, compare a
// canvas frame against a baseline with a canvas-tolerant diff, and measure frame timing
// while scrolling through. The maths is the library's own (`@quartifex/dailies/browser`);
// in a real suite the same calls run in Playwright.
import {
  type Comparison,
  compareRgba,
  type JankReport,
  progressToScroll,
  summariseFrames,
} from "@quartifex/dailies/browser";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { drawArt } from "@/scene/art";
import styles from "./dailies.module.css";
import shared from "./demos.module.css";

type Chapter = { name: string; start: number; end: number };
const W = 320;
const H = 180;

/** The same measurement dailies' findChapters makes, for a scroll container. */
function measureChapters(scroller: HTMLElement): Chapter[] {
  const max = Math.max(scroller.scrollHeight - scroller.clientHeight, 1);
  const origin = scroller.getBoundingClientRect().top;
  return Array.from(scroller.querySelectorAll<HTMLElement>("[data-chapter]"), (el) => {
    const top = el.getBoundingClientRect().top - origin + scroller.scrollTop;
    const bottom = top + Math.max(0, el.offsetHeight - scroller.clientHeight);
    return {
      name: el.dataset.chapter ?? "",
      start: Math.min(top / max, 1),
      end: Math.min(bottom / max, 1),
    };
  });
}

/** Render the scrub canvas for a progress, optionally with GPU-like noise and a regression. */
function renderFrame(ctx: CanvasRenderingContext2D, t: number, noise = 0, regression = false) {
  drawArt(ctx, W, H, t);
  if (regression) {
    // A real regression: a caption block that drifted onto the frame.
    ctx.fillStyle = "#edeae4";
    ctx.fillRect(W * 0.08, H * 0.4, W * 0.3, H * 0.1);
  }
  if (noise > 0) {
    // Sparse, strong speckle, like dithering and precision differences between GPUs:
    // `noise` percent of pixels move by up to 70 levels.
    const image = ctx.getImageData(0, 0, W, H);
    let seed = 11;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < image.data.length; i += 4) {
      if (random() * 100 >= noise) continue;
      const n = (random() - 0.5) * 140;
      image.data[i] = (image.data[i] ?? 0) + n;
      image.data[i + 1] = (image.data[i + 1] ?? 0) + n;
      image.data[i + 2] = (image.data[i + 2] ?? 0) + n;
    }
    ctx.putImageData(image, 0, 0);
  }
}

const MODES = [
  { value: "strict", label: "Strict" },
  { value: "canvas", label: "Canvas-tolerant" },
] as const;

export default function Demo() {
  const scroller = useRef<HTMLElement>(null);
  const scrub = useRef<HTMLCanvasElement>(null);
  const diffCanvas = useRef<HTMLCanvasElement>(null);
  const [progress, setProgress] = useState(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [noise, setNoise] = useState(3);
  const [regression, setRegression] = useState(false);
  const [mode, setMode] = useState<"strict" | "canvas">("canvas");
  const [result, setResult] = useState<Comparison | null>(null);
  const [heavy, setHeavy] = useState(false);
  const [jank, setJank] = useState<JankReport | null>(null);
  const [running, setRunning] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const heavyRef = useRef(heavy);
  heavyRef.current = heavy;

  const scrubProgress = useCallback(() => {
    const el = scroller.current;
    const pin = el?.querySelector<HTMLElement>('[data-chapter="scrub"]');
    if (!el || !pin) return 0;
    const top = pin.offsetTop - el.scrollTop;
    return Math.min(Math.max(-top / (pin.offsetHeight - el.clientHeight), 0), 1);
  }, []);

  // Keep the scrub canvas and the progress readout in step with the page's scroll.
  useEffect(() => {
    const el = scroller.current;
    const ctx = scrub.current?.getContext("2d");
    if (!el || !ctx) return;
    setChapters(measureChapters(el));
    const onScroll = () => {
      if (heavyRef.current) {
        const until = performance.now() + 30;
        while (performance.now() < until) {
          // Simulated heavy scroll handler.
        }
      }
      setProgress(el.scrollTop / Math.max(el.scrollHeight - el.clientHeight, 1));
      renderFrame(ctx, scrubProgress());
    };
    renderFrame(ctx, 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [scrubProgress]);

  const goTo = (p: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({
      top: progressToScroll({ start: 0, end: el.scrollHeight - el.clientHeight }, p),
      behavior: "instant",
    });
  };

  // Compare the live frame (the baseline) with a re-render: noise, and optionally a regression.
  // `progress` is a dependency on purpose: scrolling moves the frame being compared.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-run when the scroll position changes
  useEffect(() => {
    const base = document.createElement("canvas");
    const next = document.createElement("canvas");
    base.width = next.width = W;
    base.height = next.height = H;
    const a = base.getContext("2d", { willReadFrequently: true });
    const b = next.getContext("2d", { willReadFrequently: true });
    if (!a || !b) return;
    const t = scrubProgress();
    renderFrame(a, t);
    renderFrame(b, t, noise, regression);
    const comparison = compareRgba(a.getImageData(0, 0, W, H), b.getImageData(0, 0, W, H), {
      canvas: mode === "canvas",
    });
    setResult(comparison);
    const out = diffCanvas.current;
    const ctx = out?.getContext("2d");
    if (out && ctx && comparison.diff.width) {
      out.width = comparison.diff.width;
      out.height = comparison.diff.height;
      ctx.putImageData(
        new ImageData(new Uint8ClampedArray(comparison.diff.data), comparison.diff.width),
        0,
        0,
      );
    }
  }, [noise, regression, mode, progress, scrubProgress]);

  const scrollThrough = () => {
    const el = scroller.current;
    if (!el || running) return;
    setRunning(true);
    const stamps: number[] = [];
    const end = el.scrollHeight - el.clientHeight;
    const start = performance.now();
    const step = (now: number) => {
      stamps.push(now);
      const t = Math.min((now - start) / 1500, 1);
      el.scrollTo({ top: end * t, behavior: "instant" });
      if (t < 1) requestAnimationFrame(step);
      else {
        setJank(summariseFrames(stamps, { budgetMs: 25 }));
        setRunning(false);
      }
    };
    el.scrollTo({ top: 0, behavior: "instant" });
    requestAnimationFrame(step);
  };

  const current = chapters.find((c) => progress >= c.start - 0.001 && progress <= c.end + 0.001);
  return (
    <div className={shared.demo} data-demo="dailies">
      <div className={shared.split}>
        <div className={styles.pageUnderTest}>
          <p className={styles.caption}>Page under test (scrolls)</p>
          {/* A scrollable region must be reachable by keyboard (WCAG 2.1.1). */}
          <section
            ref={scroller}
            className={styles.scroller}
            data-testid="dailies-scroller"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll region must be keyboard focusable
            tabIndex={0}
            aria-label="Page under test"
          >
            <section data-chapter="intro" className={styles.chapter}>
              <h3>Intro</h3>
              <p>A short page with a pinned image-sequence scrub in the middle.</p>
            </section>
            <section data-chapter="scrub" className={styles.pinned}>
              <div className={styles.sticky}>
                <canvas
                  ref={scrub}
                  width={W}
                  height={H}
                  className={styles.canvas}
                  aria-label="Scrubbed sequence frame"
                />
              </div>
            </section>
            <section data-chapter="outro" className={styles.chapter}>
              <h3>Outro</h3>
              <p>The last chapter.</p>
            </section>
          </section>
        </div>
        <div className={shared.side}>
          <Controls label="Scroll">
            <Slider
              label="scrollToProgress"
              value={progress}
              min={0}
              max={1}
              step={0.01}
              onChange={goTo}
              format={(v) => v.toFixed(2)}
            />
          </Controls>
          <fieldset className={styles.row}>
            <legend className="visually-hidden">Chapters found</legend>
            {chapters.map((c) => (
              <Button
                key={c.name}
                onClick={() => goTo((c.start + c.end) / 2)}
                pressed={current?.name === c.name}
              >
                {c.name} {c.start.toFixed(2)}–{c.end.toFixed(2)}
              </Button>
            ))}
          </fieldset>
          <Readout
            label="Position"
            rows={[
              ["Progress", progress.toFixed(2), "dl-progress"],
              ["Chapter", current?.name ?? "between", "dl-chapter"],
              ["Scrub frame", `${Math.round(scrubProgress() * 119) + 1} / 120`],
            ]}
          />
        </div>
      </div>

      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>Visual diff: this frame against a re-render</h3>
        <Controls label="Diff">
          <Slider
            label="Rasteriser speckle"
            value={noise}
            min={0}
            max={10}
            step={0.5}
            onChange={setNoise}
            format={(v) => `${v}% of pixels`}
          />
          <Toggle label="Introduce a regression" checked={regression} onChange={setRegression} />
          <Segmented legend="Compare" value={mode} choices={MODES} onChange={setMode} />
        </Controls>
        <div className={styles.row}>
          <canvas
            ref={diffCanvas}
            className={styles.diff}
            aria-label="Diff image: differing pixels in red"
          />
          {result && (
            <Readout
              label="Result"
              rows={[
                [
                  "Result",
                  <span key="r" className={result.pass ? shared.pass : shared.fail}>
                    {result.pass ? "Pass" : "Fail"}
                  </span>,
                  "dl-result",
                ],
                [
                  "Differing pixels",
                  `${result.diffPixels} (${(result.diffRatio * 100).toFixed(2)}%)`,
                  "dl-ratio",
                ],
                ["Compared at", `${result.width} x ${result.height}`],
              ]}
            />
          )}
        </div>
        <Note>
          Canvas and WebGL frames differ slightly between runs and GPUs. Strict comparison fails on
          that noise; canvas-tolerant mode averages 2 x 2 blocks, raises the colour threshold and
          allows 1% of pixels, and still fails a real change.
        </Note>
      </div>

      <div className={shared.panel}>
        <h3 className={shared.panelTitle}>Jank: frame timing while scrolling through</h3>
        <Controls label="Jank">
          <Button onClick={scrollThrough} disabled={running || reduced}>
            {running ? "Scrolling" : "Scroll through"}
          </Button>
          <Toggle label="Add 30 ms of work per scroll event" checked={heavy} onChange={setHeavy} />
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
        </Controls>
        {jank && (
          <Readout
            label="Jank report"
            rows={[
              ["Frames", jank.frames, "dl-frames"],
              ["Slow frames (over 25 ms)", jank.slowFrames, "dl-slow"],
              ["p95 frame", `${jank.p95FrameMs.toFixed(1)} ms`],
              ["Longest", `${jank.longestFrameMs.toFixed(1)} ms`],
            ]}
          />
        )}
        {reduced && (
          <Note>
            Reduced motion is on: the scroll-through moves the page, so it is off here. The chapter
            buttons and the progress slider jump without animation.
          </Note>
        )}
      </div>

      <Code>{`import { test, expect } from "@playwright/test";
import { screenshotChapters, matchSnapshot, captureJank, scrollThrough } from "@quartifex/dailies";

test("every chapter matches its baseline", async ({ page }) => {
  await page.goto("/launch");
  for (const shot of await screenshotChapters(page)) {
    const result = await matchSnapshot(shot.image, \`baselines/\${shot.chapter.name}.png\`, { canvas: true });
    expect(result.pass, result.diffFile).toBe(true);
  }
  const jank = await captureJank(page, () => scrollThrough(page, { durationMs: 2000 }));
  expect(jank.slowFrames).toBeLessThan(3);
});`}</Code>
    </div>
  );
}
