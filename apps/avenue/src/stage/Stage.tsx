"use client";
// The stage behind the journey: a sticky, full-viewport layer under the hero, the problem, the
// way into the cabin and the demo. First paint is the poster (SVG drawn from the car's own
// geometry, in the HTML). After first paint understudy picks the rung: real-time 3D (three's
// WebGPURenderer: WebGPU, then WebGL2), the image sequence through reel, or the poster alone.
// The 3D code and the car model only load on the 3D rung, and only after first paint.
import type { Manifest } from "@quartifex/rushes/manifest";
import { bucketFor } from "@quartifex/safeframe";
import { useUnderstudy } from "@quartifex/understudy/react";
import { createStandIn } from "@quartifex/understudy/reel";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import styles from "./Stage.module.css";
import { frame, stage } from "./state";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

type Rung = "webgl" | "sequence" | "poster";

/** `?rung=webgl|sequence|poster` forces a rung (tests and reviews). */
function forcedRung(): Rung | null {
  if (typeof location === "undefined") return null;
  const rung = new URLSearchParams(location.search).get("rung");
  return rung === "webgl" || rung === "sequence" || rung === "poster" ? rung : null;
}

/** The lighter model for small or weak devices. */
function wantsLite() {
  const px = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2);
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return px < 1500 || Boolean(conn?.saveData) || (conn?.effectiveType ?? "4g") !== "4g";
}

/** The rungs above the poster, mounted only after boot (so nothing probes the GPU earlier). */
function Rungs({ force, active }: { force: Rung | null; active: boolean }) {
  const sequence = useRef<HTMLCanvasElement>(null);
  const [state, understudy] = useUnderstudy(
    // Keep 3D under reduced motion: the camera cuts instead of flying, so there is no motion
    // to remove. The sequence and poster rungs still follow the device and Save-Data.
    {
      rungs: force ? [force] : ["webgl", "sequence", "poster"],
      reducedMotion: "keep",
      maxDpr: 2,
      // No GPU benchmark lookup (it needs a third-party fetch): start at full quality and let
      // the governor step down on the measured frame rate.
      start: { 0: 4, 1: 2, 2: 1, 3: 0, unknown: 0 },
    },
    force === "webgl" ? { webgl: true, majorPerformanceCaveat: false } : {},
  );
  const rung = state?.rung ?? null;
  const [lite] = useState(wantsLite);

  useEffect(() => {
    stage.set({ rung });
  }, [rung]);

  // The image-sequence rung: reel draws the frames, following the journey's progress.
  useEffect(() => {
    if (!understudy || rung !== "sequence" || !sequence.current) return;
    let stopped = false;
    let standIn: ReturnType<typeof createStandIn> | null = null;
    let raf = 0;
    fetch("/sequences/cabin/manifest.json")
      .then((r) => r.json() as Promise<Manifest>)
      .then((manifest) => {
        if (stopped || !sequence.current) return;
        standIn = createStandIn(sequence.current, manifest, {
          understudy,
          baseUrl: "/sequences/cabin/",
          progress: () => frame.progress,
          fit: "contain",
        });
        let last = -1;
        const loop = () => {
          if (frame.progress !== last) {
            last = frame.progress;
            standIn?.sync();
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      })
      .catch(() => {});
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      standIn?.destroy();
    };
  }, [understudy, rung]);

  return (
    <>
      {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabindex is not focusable; the sequence repeats the described poster */}
      <canvas
        ref={sequence}
        className={styles.sequence}
        aria-hidden="true"
        hidden={rung !== "sequence"}
      />
      {rung === "webgl" && understudy ? (
        <div className={styles.canvas}>
          <Scene understudy={understudy} lite={lite} active={active} />
        </div>
      ) : null}
    </>
  );
}

export function Stage({ poster }: { poster: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [booted, setBooted] = useState(false);
  const [active, setActive] = useState(true);
  const [force] = useState(forcedRung);
  const rung = useStore(stage, (s) => s.rung);
  const ready = useStore(stage, (s) => s.ready);
  // Start only after first paint and an idle moment, so the hero paints on its own first.
  useEffect(() => {
    const go = () => setBooted(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (n: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(go, { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(go, 300);
    return () => window.clearTimeout(id);
  }, []);

  // safeframe's bucket for this viewport: the camera path pulls back on tall phones and tablets.
  useEffect(() => {
    const on = () => stage.set({ bucket: bucketFor({ width: innerWidth, height: innerHeight }) });
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  // Pause rendering when the stage has scrolled away.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(Boolean(e?.isIntersecting)), {
      rootMargin: "100px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={root}
      className={styles.stage}
      data-rung={rung ?? "poster"}
      data-ready={ready ? "" : undefined}
    >
      {/* The poster: decorative, the same car the 3D shows. */}
      <div
        className={styles.poster}
        aria-hidden="true"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: an SVG drawn on the server from our own geometry, no input in it
        dangerouslySetInnerHTML={{ __html: poster }}
      />
      {booted ? <Rungs force={force} active={active} /> : null}
      <div className={styles.shade} aria-hidden="true" />
    </div>
  );
}
