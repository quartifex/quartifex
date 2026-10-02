"use client";

// Chapter two: thirty minutes from ember to daylight.
// - full: the chapter is pinned; the scroll walks the light from 1800 K to 6500 K, and the
//   disc, the number and the marker on the scale follow it.
// - reduced: no pin and no scrub. The scale's seven steps fade in once, in order, on arrival.
// - static: the scale, all at once.
import { useStillness } from "@quartifex/stillness/react";
import { kelvinToCss } from "@quartifex/volumetric";
import { type CSSProperties, useEffect, useRef } from "react";
import styles from "./Sunrise.module.css";

const STEPS = [
  [1800, "Ember", 0],
  [2400, "Candle", 5],
  [3000, "Dawn", 10],
  [3600, "Early", 15],
  [4400, "Sunrise", 20],
  [5400, "Morning", 25],
  [6500, "Daylight", 30],
] as const;

const MIN = 1800;
const MAX = 6500;

export function Sunrise() {
  const { level } = useStillness();
  const section = useRef<HTMLElement>(null);
  const reading = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (level === "reduced") {
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            el.dataset.arrived = "";
            io.disconnect();
          }
        },
        { threshold: 0.35 },
      );
      io.observe(el);
      return () => io.disconnect();
    }
    if (level !== "full") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const range = Math.max(el.offsetHeight - innerHeight, 1);
      const p = Math.min(1, Math.max(0, -rect.top / range));
      const kelvin = Math.round((MIN + (MAX - MIN) * p) / 50) * 50;
      el.style.setProperty("--k", kelvinToCss(kelvin));
      el.style.setProperty("--p", String(p));
      if (reading.current) {
        reading.current.textContent = `${kelvin} K · minute ${Math.round(p * 30)} of 30`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      el.style.removeProperty("--k");
      el.style.removeProperty("--p");
    };
  }, [level]);

  return (
    <section id="sunrise" ref={section} className={styles.section} aria-labelledby="sunrise-title">
      <div className={styles.pin}>
        <div className={styles.copy}>
          <p className="mono">Chapter two · Sunrise</p>
          <h2 id="sunrise-title" className={styles.h2}>
            Thirty minutes, ember to daylight.
          </h2>
          <p className={styles.text}>
            Morrow climbs from 1800 K, the colour of a fire's last embers, to 6500 K, the colour of
            an overcast noon, in slow and even steps. The change is gentle enough that you notice
            the room before you notice the lamp.
          </p>
          <p ref={reading} className={`mono ${styles.reading}`} aria-hidden="true">
            1800 K · minute 0 of 30
          </p>
        </div>
        <div className={styles.disc} aria-hidden="true" />
        <ol className={styles.scale} aria-label="Morrow's colour, every five minutes">
          {STEPS.map(([kelvin, name, minute], i) => (
            <li key={kelvin} style={{ "--i": i } as CSSProperties}>
              <span className={styles.swatch} style={{ background: kelvinToCss(kelvin) }} />
              <span className="mono">{minute} min</span>
              <span>
                {name} <span className={styles.k}>{kelvin} K</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
