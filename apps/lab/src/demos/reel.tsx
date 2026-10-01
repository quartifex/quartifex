"use client";

// Hub demo for @quartifex/reel, shown on /reel. A small launch page inside a simulated
// screen: scroll it and reel scrubs the rushes sequence, driven by GSAP ScrollTrigger or
// by native scroll. Tier, format, fit and decoding are live controls; under reduced motion
// reel shows the poster and loads no frames.
import { bindScroll, createReel, type ReelStats } from "@quartifex/reel";
import { scrubReel } from "@quartifex/reel/gsap";
import type { Format } from "@quartifex/rushes/manifest";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
import {
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import styles from "./sequence.module.css";

const DRIVERS = [
  { value: "gsap", label: "GSAP ScrollTrigger" },
  { value: "native", label: "Native scroll" },
] as const;
const FORMATS = [
  { value: "auto", label: "Auto" },
  { value: "avif", label: "AVIF" },
  { value: "webp", label: "WebP" },
] as const;
const FIT = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
] as const;
const DECODE = [
  { value: "main", label: "Main thread" },
  { value: "worker", label: "Worker" },
] as const;

export default function Demo() {
  const data = useSequence();
  const { device, controls } = useDevice("tall-phone", 3);
  const [driver, setDriver] = useState<"gsap" | "native">("gsap");
  const [tier, setTier] = useState("auto");
  const [format, setFormat] = useState<Format | "auto">("auto");
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [decode, setDecode] = useState<"main" | "worker">("main");
  const [reduced, setReduced] = useReducedMotion();
  const [stats, setStats] = useState<ReelStats | null>(null);
  const [position, setPosition] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef<HTMLElement>(null);

  const manifest = data?.manifest ?? null;
  const { width, height, dpr } = device;

  // Build the reel and its scroll driver; rebuild when an option changes.
  useEffect(() => {
    const el = canvas.current;
    const section = pinned.current;
    const box = scroller.current;
    if (!el || !section || !box || !manifest) return;
    const reel = createReel(el, manifest, {
      baseUrl: SEQUENCE_URL,
      format,
      fit,
      decode,
      reducedMotion: reduced,
      environment: { width, height, dpr },
      ...(tier === "auto" ? {} : { tier }),
    });
    let stop: () => void;
    if (driver === "gsap") {
      gsap.registerPlugin(ScrollTrigger);
      // The preview is CSS-scaled, so give ScrollTrigger its range in scroll pixels.
      const trigger = scrubReel(reel, ScrollTrigger, {
        scroller: box,
        start: section.offsetTop,
        end: section.offsetTop + section.offsetHeight - box.clientHeight,
      });
      stop = () => trigger.kill();
    } else {
      stop = bindScroll(reel, section, box);
    }
    const tick = window.setInterval(() => setStats(reel.stats()), 200);
    return () => {
      window.clearInterval(tick);
      stop();
      reel.destroy();
    };
  }, [manifest, driver, tier, format, fit, decode, width, height, dpr, reduced]);

  // Keyboard-friendly scrolling of the simulated page.
  const scrollTo = (p: number) => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: p * (box.scrollHeight - box.clientHeight), behavior: "instant" });
    setPosition(p);
  };

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const onScroll = () =>
      setPosition(box.scrollTop / Math.max(box.scrollHeight - box.clientHeight, 1));
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  const loaded = new Set(stats?.indices ?? []);
  const tiers = [
    { value: "auto", label: "Auto (resolve)" },
    ...(manifest?.tiers.map((t) => ({ value: t.name, label: `${t.width} px` })) ?? []),
  ];

  return (
    <div className={shared.demo} data-demo="reel">
      <Controls label="Screen">{controls}</Controls>
      <div className={shared.split}>
        <Screen device={device} label="A launch page with a scrubbed image sequence">
          <div className={styles.scroller} ref={scroller} data-testid="reel-scroller">
            <section className={styles.section}>
              <h3>Scroll</h3>
              <p>The jar turns as you scroll through the next section.</p>
            </section>
            <section className={styles.pinned} ref={pinned}>
              <div className={styles.sticky}>
                <canvas
                  ref={canvas}
                  role="img"
                  aria-label="A jar turning on a hairline floor (concept visual)"
                  data-testid="reel-canvas"
                />
              </div>
            </section>
            <section className={styles.section}>
              <h3>Done</h3>
              <p>72 frames, three tiers, two formats, one manifest.</p>
            </section>
          </div>
        </Screen>
        <div className={shared.side}>
          <Controls label="Reel">
            <Slider
              label="Page position"
              value={position}
              min={0}
              max={1}
              step={0.01}
              onChange={scrollTo}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <Segmented legend="Driver" value={driver} choices={DRIVERS} onChange={setDriver} />
            <Segmented legend="Tier" value={tier} choices={tiers} onChange={setTier} />
            <Segmented legend="Format" value={format} choices={FORMATS} onChange={setFormat} />
            <Segmented legend="Fit" value={fit} choices={FIT} onChange={setFit} />
            <Segmented legend="Decode" value={decode} choices={DECODE} onChange={setDecode} />
            <ReducedMotionToggle value={reduced} onChange={setReduced} />
          </Controls>
          {stats && (
            <>
              {/* Recomputed with each stats tick (200 ms). */}
              <Readout
                label="Reel"
                rows={[
                  ["Tier", stats.tier, "rl-tier"],
                  ["Format", stats.format, "rl-format"],
                  ["Canvas DPR", stats.dpr],
                  [
                    "Frame",
                    stats.reducedMotion ? "poster" : `${stats.shown + 1} / ${stats.frames}`,
                    "rl-frame",
                  ],
                  ["Loaded", `${stats.loaded} / ${stats.frames}`, "rl-loaded"],
                  ["Mode", stats.reducedMotion ? "Reduced motion: poster" : "Scrubbing", "rl-mode"],
                ]}
              />
              <div
                className={styles.cells}
                role="img"
                aria-label={`${stats.loaded} of ${stats.frames} frames in memory`}
              >
                {Array.from({ length: stats.frames }, (_, i) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: one cell per frame index
                    key={i}
                    className={styles.cell}
                    data-loaded={loaded.has(i) ? "" : undefined}
                    data-current={i === stats.current ? "" : undefined}
                  />
                ))}
              </div>
            </>
          )}
          <Note>
            {reduced
              ? "Reduced motion is on: reel draws the poster and loads no frames. Scrolling changes nothing."
              : "Teal cells are the frames in memory: the current one first, then outwards, more ahead than behind, plus every 8th frame for fast scrubs."}
          </Note>
        </div>
      </div>
      <Code>{`import { createReel, loadManifest } from "@quartifex/reel";
import { scrubReel } from "@quartifex/reel/gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const manifest = await loadManifest("/sequences/jar/manifest.json");
const reel = createReel(canvas, manifest, { baseUrl: "/sequences/jar/", fit: "cover" });
scrubReel(reel, ScrollTrigger, { trigger: "#scene", start: "top top", end: "bottom bottom" });`}</Code>
    </div>
  );
}
