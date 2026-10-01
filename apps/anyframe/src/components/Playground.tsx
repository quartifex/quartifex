"use client";

// The playground: the same scene on a phone, a tablet, a laptop and an ultrawide at once,
// plus one screen of any shape from 9:19.5 to 32:9. Guides show safeframe's staging and
// resolve's decision; the panel shows plumb's live reading of this window.
import { usePlumb } from "@quartifex/plumb/react";
import type { EffectiveType } from "@quartifex/resolve";
import { bucketFor } from "@quartifex/safeframe";
import { type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./Playground.module.css";
import { type Screen, StagedReel } from "./StagedReel";
import { useManifest, useReducedMotion } from "./useManifest";

const DEVICES: Array<{ name: string; screen: Screen }> = [
  { name: "Phone", screen: { width: 390, height: 844, dpr: 3 } },
  { name: "Tablet", screen: { width: 820, height: 1180, dpr: 2 } },
  { name: "Laptop", screen: { width: 1440, height: 900, dpr: 2 } },
  { name: "Ultrawide", screen: { width: 3440, height: 1440, dpr: 1 } },
];

// Real screens along the aspect slider; sizes are interpolated in log space between them.
const STOPS = [
  { label: "9:19.5", width: 390, height: 844 },
  { label: "3:4", width: 820, height: 1093 },
  { label: "16:10", width: 1440, height: 900 },
  { label: "21:9", width: 3440, height: 1440 },
  { label: "32:9", width: 5120, height: 1440 },
];

function sizeAt(p: number): Screen {
  const i = Math.min(Math.floor(p), STOPS.length - 2);
  const t = p - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  if (!a || !b) return { width: 1440, height: 900, dpr: 2 };
  const mix = (x: number, y: number) =>
    Math.round(Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t));
  return { width: mix(a.width, b.width), height: mix(a.height, b.height), dpr: 2 };
}

/** Lays a screen out at its CSS size and scales it to a given height. */
function scaleFor(screen: Screen, height: number, maxWidth: number): number {
  // As tall as asked, but never wider than the page.
  return Math.min(height / screen.height, maxWidth / screen.width);
}

function Scaled({
  screen,
  height,
  children,
  name,
  maxWidth,
}: {
  screen: Screen;
  height: number;
  children: ReactNode;
  name: string;
  maxWidth: number;
}) {
  const scale = scaleFor(screen, height, maxWidth);
  return (
    <figure className={styles.device} data-testid="device" data-device={name}>
      <div
        className={styles.window}
        style={{ width: screen.width * scale, height: screen.height * scale }}
      >
        <div
          className={styles.inner}
          style={{ width: screen.width, height: screen.height, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      <figcaption>
        <span>{name}</span>
        <span className={styles.meta}>
          {screen.width} x {screen.height} @{screen.dpr}x · {bucketFor(screen)}
        </span>
      </figcaption>
    </figure>
  );
}

export function Playground() {
  const manifest = useManifest();
  const reduced = useReducedMotion();
  const plumb = usePlumb();
  const [progress, setProgress] = useState(0.6);
  const [aspect, setAspect] = useState(2);
  const [guides, setGuides] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [network, setNetwork] = useState<EffectiveType>("4g");
  const section = useRef<HTMLElement>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  // Start the reels only when the playground is near: nothing loads for it before then.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    const start = performance.now() - progressRef.current * 6000;
    const tick = (now: number) => {
      setProgress(((now - start) / 6000) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const any = sizeAt(aspect);
  const maxWidth = Math.max(240, (plumb?.width ?? 1280) - 48);
  const anyLabel = `${(any.width / any.height).toFixed(2)}:1`;
  return (
    <section
      ref={section}
      className={styles.playground}
      data-chapter="screens"
      aria-labelledby="screens-title"
    >
      <header className={styles.head}>
        <h2 id="screens-title" className={styles.h2}>
          Four screens, one scene
        </h2>
        <p className={styles.lede}>
          Each frame below runs the page logic at that screen's CSS size. safeframe keeps the core
          and its disk whole and moves the copy zone. resolve works out how many source pixels each
          screen really needs: cropping in around the core on a tall phone needs as many as a
          laptop, so the phone gets the top tier too, at a capped pixel ratio. Where it saves bytes
          is the connection: try 3G or 2G.
        </p>
      </header>

      <div className={styles.controls}>
        <label className={styles.control}>
          <span>Scene position</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={progress}
            onChange={(e) => {
              setPlaying(false);
              setProgress(Number(e.target.value));
            }}
          />
          <output>{Math.round(progress * 100)}%</output>
        </label>
        <button
          type="button"
          className={styles.button}
          onClick={() => setPlaying((p) => !p)}
          disabled={reduced}
          aria-pressed={playing && !reduced}
        >
          {playing && !reduced ? "Pause" : "Play"}
        </button>
        <fieldset className={styles.segments}>
          <legend>Connection</legend>
          {(["4g", "3g", "2g"] as const).map((n) => (
            <label key={n} className={styles.segment}>
              <input
                type="radio"
                name="network"
                value={n}
                checked={network === n}
                onChange={() => setNetwork(n)}
              />
              <span>{n.toUpperCase()}</span>
            </label>
          ))}
        </fieldset>
        <label className={styles.toggle}>
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
          <span>Safe frame and resolution guides</span>
        </label>
      </div>

      <div className={styles.devices}>
        {DEVICES.map(({ name, screen }) => (
          <Scaled
            key={name}
            screen={screen}
            height={name === "Ultrawide" ? 180 : 300}
            name={name}
            maxWidth={maxWidth}
          >
            {visible && manifest && (
              <StagedReel
                manifest={manifest}
                screen={screen}
                progress={progress}
                reducedMotion={reduced}
                guides={guides}
                label={name}
                network={network}
                scale={scaleFor(screen, name === "Ultrawide" ? 180 : 300, maxWidth)}
              />
            )}
          </Scaled>
        ))}
      </div>

      <div className={styles.any}>
        <label className={styles.control}>
          <span>Any aspect</span>
          <input
            type="range"
            min={0}
            max={STOPS.length - 1}
            step={0.01}
            value={aspect}
            onChange={(e) => setAspect(Number(e.target.value))}
            aria-valuetext={anyLabel}
          />
          <output data-testid="any-aspect">{anyLabel}</output>
        </label>
        <Scaled screen={any} height={260} name="Any aspect" maxWidth={maxWidth}>
          {visible && manifest && (
            <StagedReel
              manifest={manifest}
              screen={any}
              progress={progress}
              reducedMotion={reduced}
              guides={guides}
              label="Any aspect"
              network={network}
              scale={scaleFor(any, 260, maxWidth)}
            />
          )}
        </Scaled>
      </div>

      <aside className={styles.plumb} aria-label="This window, read by plumb">
        <h3 className={styles.h3}>This window, live</h3>
        {plumb ? (
          <dl data-testid="plumb">
            <div>
              <dt>Size</dt>
              <dd data-testid="plumb-size">
                {plumb.width} x {plumb.height}
              </dd>
            </div>
            <div>
              <dt>svh / lvh / dvh</dt>
              <dd>
                {plumb.svh} / {plumb.lvh} / {plumb.dvh}
              </dd>
            </div>
            <div>
              <dt>Pixel ratio</dt>
              <dd>{plumb.dpr}</dd>
            </div>
            <div>
              <dt>Orientation</dt>
              <dd>{plumb.orientation}</dd>
            </div>
            <div>
              <dt>Bucket</dt>
              <dd data-testid="plumb-bucket">{bucketFor(plumb)}</dd>
            </div>
          </dl>
        ) : (
          <p>Measuring.</p>
        )}
        {reduced && (
          <p className={styles.note}>
            Reduced motion is on: the hero shows its final frame and Play is off. Every screen still
            follows the position slider.
          </p>
        )}
      </aside>
    </section>
  );
}
