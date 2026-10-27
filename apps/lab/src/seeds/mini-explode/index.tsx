"use client";

// mini-explode (LB12, Lab). A three-part exploded view, base, body and lid, pulled apart by one
// value, with labels pinned to the parts. The whole scene is in scene.ts, about a hundred lines of logic; the
// fuller version with any number of parts and a radial layout is the anatomy library.
// Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Controls,
  Note,
  ReducedMotionToggle,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import styles from "../seed.module.css";
import local from "./mini-explode.module.css";
import type { Explode } from "./scene";

const PARTS = ["Base: weighted foot", "Body: tinted glass", "Lid: brushed metal"];

export default function MiniExplode() {
  const [t, setT] = useState(0.6);
  const [reduced, setReduced] = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLSpanElement[]>([]);
  const api = useRef<Explode | null>(null);
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    import("./scene")
      .then(({ mountExplode }) => {
        if (dead) return;
        api.current = mountExplode(el, labels.current);
        api.current.set(tRef.current);
      })
      .catch(() => setFailed(true));
    let down = false;
    let lx = 0;
    const pd = (e: PointerEvent) => {
      down = true;
      lx = e.clientX;
    };
    const pm = (e: PointerEvent) => {
      if (!down) return;
      api.current?.turn((e.clientX - lx) * 0.01);
      lx = e.clientX;
    };
    const pu = () => {
      down = false;
    };
    el.addEventListener("pointerdown", pd);
    addEventListener("pointermove", pm);
    addEventListener("pointerup", pu);
    return () => {
      dead = true;
      el.removeEventListener("pointerdown", pd);
      removeEventListener("pointermove", pm);
      removeEventListener("pointerup", pu);
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  useEffect(() => {
    api.current?.set(t);
  }, [t]);

  // Play: apart and back together, eased; reduced motion jumps instead
  const play = () => {
    const from = t > 0.5 ? 1 : 0;
    const to = 1 - from;
    if (reduced) {
      setT(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 900);
      const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      setT(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  return (
    <div className={styles.seed} data-demo="mini-explode">
      <Controls label="Explode">
        <Slider
          label="Explode"
          value={t}
          min={0}
          max={1}
          step={0.01}
          onChange={setT}
          format={(v) => `${Math.round(v * 100)}%`}
        />
        <Button onClick={play}>{t > 0.5 ? "Assemble" : "Explode"}</Button>
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div
        ref={host}
        className={`${styles.stage} ${local.stage}`}
        data-testid="me-stage"
        data-t={t.toFixed(2)}
      >
        {PARTS.map((p, i) => (
          <span
            key={p}
            className={local.label}
            ref={(el) => {
              if (el) labels.current[i] = el;
            }}
          >
            {p}
          </span>
        ))}
        <span className={styles.hint}>Drag to turn</span>
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
      </div>
      <Note>
        Each part has a resting height and an exploded height; one value from 0 to 1 moves all
        three, and the labels are projected from the scene to the page every frame. Nothing moves on
        its own: the slider, the button or a scroll position drives it.
      </Note>
    </div>
  );
}
