"use client";

import { bindScroll, createReel } from "@quartifex/reel";
// Chapter one, dawn, told at the visitor's motion level.
// - full: the dawn sequence is pinned and scrubbed by the scroll (reel), and volumetric light
//   shafts drift through the window from the rising sun; their colour and strength follow the
//   scroll. The three moments of the story light up in turn.
// - reduced: one held picture, the room just after sunrise, with still shafts; the moments are
//   listed beside it. Nothing travels; text fades in.
// - static: no canvas at all. A calm editorial page: the still as a framed figure, the
//   moments as a list. (The layout for each level is CSS on <html data-motion>.)
import { useStillness } from "@quartifex/stillness/react";
import { kelvinToCss, qualityFor } from "@quartifex/volumetric";
import { createOverlay } from "@quartifex/volumetric/overlay";
import { useEffect, useRef } from "react";
import { SEQUENCE_URL, SUN, useManifest } from "@/lib/sequence";
import styles from "./Hero.module.css";

const MOMENTS = [
  ["05:40", "Morrow begins at 1800 K, the colour of embers."],
  ["05:55", "The room warms. Nothing has made a sound."],
  ["06:10", "The sun clears the ridge and takes over."],
] as const;

const ease = (t: number) => t * t * (3 - 2 * t);

const SCENE = { width: 1600, height: 1000 };

/**
 * Cover-fit the scene into `box`, keeping the lamp and the sill in view: a wide, short box
 * crops mostly from the top of the picture, a tall one mostly from the left.
 */
function crop(box: { width: number; height: number }) {
  const k = Math.max(box.width / SCENE.width, box.height / SCENE.height);
  const width = box.width / k;
  const height = box.height / k;
  return {
    k,
    // Tall boxes keep the right half of the window, the sun and the lamp.
    x: (SCENE.width - width) * 0.7,
    y: (SCENE.height - height) * 0.8,
    width,
    height,
  };
}

export function Hero() {
  const { level } = useStillness();
  const manifest = useManifest();
  const section = useRef<HTMLElement>(null);
  const picture = useRef<HTMLCanvasElement>(null);
  const light = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (level === "static" || !manifest || !picture.current || !light.current) return;
    const el = section.current;
    const still = level === "reduced";
    const overlay = createOverlay(light.current, {
      settings: {
        source: SUN,
        density: still ? 0.45 : 0.15,
        scatter: 0.75,
        temperature: 3600,
        dust: still ? 0.35 : 0.55,
        drift: 0.5,
      },
      quality: qualityFor({ reducedMotion: still }),
      reducedMotion: still,
    });
    /** Light, moment and colour for story progress `p` (0 to 1). */
    const place = (p: number) => {
      // The light arrives with the sun: dim and warm early, fuller and whiter at the end.
      const sun = ease(Math.min(1, Math.max(0, (p - 0.3) / 0.7)));
      // The sun's place on this canvas, through the same crop as the picture.
      const cw = picture.current?.clientWidth || 1;
      const ch = picture.current?.clientHeight || 1;
      const c = crop({ width: cw, height: ch });
      const sunY = 0.86 - (0.86 - SUN.y) * sun;
      overlay.update({
        density: (still ? 0.6 : 0.1) + (still ? 0 : 0.55 * sun),
        temperature: 2200 + 2600 * sun,
        source: {
          x: ((SUN.x * SCENE.width - c.x) * c.k) / cw,
          y: ((sunY * SCENE.height - c.y) * c.k) / ch,
        },
      });
      if (!el) return;
      el.dataset.moment = String(p < 0.3 ? 0 : p < 0.65 ? 1 : 2);
      el.style.setProperty("--dawn", kelvinToCss(1800 + 4000 * p));
    };
    const reel = createReel(picture.current, manifest, {
      baseUrl: SEQUENCE_URL,
      stage: (box) => {
        const c = crop(box);
        return {
          source: { x: c.x, y: c.y, width: c.width, height: c.height },
          dest: { x: 0, y: 0, width: box.width, height: box.height },
        };
      },
      reducedMotion: still,
      onFrame: () => place(reel.progress),
    });
    const unbind = still || !el ? () => {} : bindScroll(reel, el);
    // Reduced: the held picture is the poster, the room just after sunrise.
    if (still) reel.ready.then(() => place(0.85)).catch(() => {});
    return () => {
      unbind();
      reel.destroy();
      overlay.destroy();
    };
  }, [level, manifest]);

  return (
    <section
      id="dawn"
      ref={section}
      className={styles.hero}
      data-moment="0"
      aria-labelledby="hero-title"
    >
      <div className={styles.stage}>
        <div className={styles.scene} aria-hidden={level === "static" ? true : undefined}>
          <canvas
            ref={picture}
            className={styles.canvas}
            role="img"
            aria-label="Concept visual: a bedroom window before sunrise. A lamp on the bedside table warms first, then the sky, then the sun clears a far ridge and light falls into the room."
          />
          {/* biome-ignore lint/a11y/noAriaHiddenOnFocusable: a canvas without tabindex is not focusable; the light is decoration over the described picture */}
          <canvas ref={light} className={styles.light} aria-hidden="true" />
          <p className={`mono ${styles.caption}`}>Concept visual · drawn in code</p>
        </div>
        <div className={styles.copy}>
          <p className="mono">Morrow · a fictional sunrise lamp</p>
          <h1 id="hero-title" className={styles.title}>
            Wake to light, not to noise.
          </h1>
          <p className={styles.lede}>
            Morrow is a bedside lamp that starts the sunrise half an hour before the sun does. It is
            invented for this page, which tells its launch story three ways.
          </p>
        </div>
        <ol className={styles.moments}>
          {MOMENTS.map(([time, text], i) => (
            <li key={time} data-index={i}>
              <span className="mono">{time}</span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </div>
      <figure className={styles.figure}>
        <picture>
          <source srcSet={`${SEQUENCE_URL}poster.avif`} type="image/avif" />
          <source srcSet={`${SEQUENCE_URL}poster.webp`} type="image/webp" />
          <img
            src={`${SEQUENCE_URL}poster.jpg`}
            width={1600}
            height={1000}
            loading="lazy"
            alt="Concept visual: the bedroom just after sunrise. The sun sits above a far ridge in the window's upper right pane, and light lies across the floor beside a glowing dome lamp."
          />
        </picture>
        <figcaption className="mono">Concept visual · the room at 06:10, drawn in code</figcaption>
      </figure>
    </section>
  );
}
