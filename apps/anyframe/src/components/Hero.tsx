"use client";

// The hero: the QUASAR reveal pinned for three screens of scroll, staged by safeframe for
// this window (through plumb, so mobile toolbars do not re-stage it), drawn by reel at the
// tier resolve picks. The copy sits in the text zone safeframe chose.
import { createPlumb } from "@quartifex/plumb";
import { bindScroll, createReel } from "@quartifex/reel";
import { createSafeframe } from "@quartifex/safeframe";
import { useEffect, useRef } from "react";
import { SCENE, SEQUENCE_URL } from "@/scene/scene";
import styles from "./Hero.module.css";
import { useManifest, useReducedMotion } from "./useManifest";

export function Hero() {
  const manifest = useManifest();
  const reduced = useReducedMotion();
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  // Stage first (the copy needs its zone even before frames arrive).
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const plumb = createPlumb();
    const sf = createSafeframe(el, SCENE, { viewport: plumb });
    if (!manifest || !canvas.current || !section.current) {
      return () => {
        sf.destroy();
        plumb.destroy();
      };
    }
    const reel = createReel(canvas.current, manifest, {
      baseUrl: SEQUENCE_URL,
      reducedMotion: reduced,
      stage: () => sf.frame,
    });
    const unbind = reduced ? () => {} : bindScroll(reel, section.current);
    if (reduced) reel.seek(1);
    return () => {
      unbind();
      reel.destroy();
      sf.destroy();
      plumb.destroy();
    };
  }, [manifest, reduced]);

  return (
    <section ref={section} className={styles.hero} data-chapter="hero" aria-labelledby="hero-title">
      <div ref={stage} className={styles.stage}>
        <canvas
          ref={canvas}
          className={styles.canvas}
          role="img"
          aria-label="Concept visual: a slow zoom through a starfield into a bright core with an accretion disk and two jets, seen through an instrument reticle."
        />
        <div className={styles.copy}>
          <p className={styles.kicker}>anyframe · open-source demo</p>
          <h1 id="hero-title" className={styles.title}>
            One scene, every screen.
          </h1>
          <p className={styles.lede}>
            The same scroll scene, staged for a 390 px phone and a 5120 px ultrawide, at the
            resolution each one needs.
          </p>
        </div>
        <p className={styles.caption}>Concept visual · procedural, drawn in code</p>
      </div>
    </section>
  );
}
