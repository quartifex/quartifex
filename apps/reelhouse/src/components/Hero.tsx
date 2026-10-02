"use client";

// The hero: a lens iris opening onto a lamp, pinned for two screens of scroll and drawn by
// reel at the tier resolve picks for this canvas. The readout under it is reel's own
// stats, live. Under reduced motion it shows the poster (the open iris) and nothing moves.
import { bindScroll, createReel } from "@quartifex/reel";
import { useEffect, useRef } from "react";
import { SEQUENCE_URL, useManifest, useReducedMotion } from "@/lib/sequence";
import styles from "./Hero.module.css";

const STEPS = [
  ["Encode", "rushes", "A video or a frame folder becomes tiered AVIF and WebP frames."],
  ["Play", "reel", "Frames follow the scroll, at the size this screen needs."],
  ["Weigh", "heft", "The page is held to a budget, in CI and here."],
] as const;

export function Hero() {
  const manifest = useManifest();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!manifest || !canvas.current || !section.current) return;
    const el = section.current;
    const show = () => {
      const s = reel.stats();
      const pad = (n: number) => String(n + 1).padStart(3, "0");
      if (readout.current) {
        readout.current.textContent = s.reducedMotion
          ? `poster · ${s.tier} · ${s.format}`
          : `frame ${pad(Math.max(s.shown, 0))} / ${String(s.frames).padStart(3, "0")} · ${s.tier} · ${s.format} · ${s.dpr}x`;
      }
      el.dataset.step = String(Math.min(2, Math.floor(reel.progress * 3)));
    };
    const reel = createReel(canvas.current, manifest, {
      baseUrl: SEQUENCE_URL,
      reducedMotion: reduced,
      fit: "cover",
      onFrame: show,
    });
    // Under reduced motion only the poster is drawn, so no frame event comes.
    reel.ready.then(show).catch(() => {});
    const unbind = reduced ? () => {} : bindScroll(reel, el);
    if (reduced) reel.seek(1);
    return () => {
      unbind();
      reel.destroy();
    };
  }, [manifest, reduced]);

  return (
    <section ref={section} className={styles.hero} data-step="0" aria-labelledby="hero-title">
      <div className={styles.stage}>
        <div className={styles.copy}>
          <p className="mono">reelhouse · open-source demo</p>
          <h1 id="hero-title" className={styles.title}>
            Footage in. A scroll sequence out, weighed.
          </h1>
          <p className={styles.lede}>
            Docs and a live playground for our image-sequence pipeline. Drop a clip, encode it into
            tiers in this tab, play it back against a scroll and see what it costs.
          </p>
          <p className={styles.actions}>
            <a className={styles.primary} href="#playground">
              Open the playground
            </a>
            <a href="#docs">Read the docs</a>
          </p>
        </div>
        <figure className={styles.figure}>
          <div className={styles.frame}>
            <canvas
              ref={canvas}
              className={styles.canvas}
              role="img"
              aria-label="Concept visual: a nine-blade lens iris opening onto a warm projector lamp, drawn in code."
            />
          </div>
          <figcaption className={styles.caption}>
            <span ref={readout} className="mono" data-testid="hero-readout">
              loading
            </span>
            <span className="mono">Concept visual · drawn in code</span>
          </figcaption>
        </figure>
        <ol className={styles.steps}>
          {STEPS.map(([verb, lib, what], i) => (
            <li key={lib} data-index={i}>
              <span className="mono">
                {String(i + 1).padStart(2, "0")} · {lib}
              </span>
              <strong>{verb}</strong>
              <span className={styles.what}>{what}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
