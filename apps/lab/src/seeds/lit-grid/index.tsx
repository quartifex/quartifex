"use client";

// lit-grid (LB07, Lab). A hairline grid behind a section that lights up around the pointer:
// lines brighten with distance, crossings glow, and the light eases after the pointer instead
// of snapping to it. With no pointer, it drifts slowly; with reduced motion, it rests.
// Canvas 2D, no WebGL. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import styles from "../seed.module.css";
import local from "./lit-grid.module.css";

const LIGHTS = {
  ganga: { label: "Ganga", rgb: "52,209,191" },
  sindoor: { label: "Sindoor", rgb: "255,90,60" },
  white: { label: "White", rgb: "237,234,228" },
} as const;
type Light = keyof typeof LIGHTS;
const LIGHT_CHOICES = (Object.keys(LIGHTS) as Light[]).map((value) => ({
  value,
  label: LIGHTS[value].label,
}));

export default function LitGrid() {
  const [cell, setCell] = useState(32);
  const [radius, setRadius] = useState(180);
  const [light, setLight] = useState<Light>("ganga");
  const [reduced, setReduced] = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const opts = useRef({ cell, radius, light, reduced });
  opts.current = { cell, radius, light, reduced };

  useEffect(() => {
    const host = stage.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!host || !cv || !ctx) return;
    let w = 0;
    let h = 0;
    let dpr = 1;
    const fit = () => {
      dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    const target = { x: w * 0.5, y: h * 0.5, on: false };
    const pos = { x: w * 0.5, y: h * 0.5 };
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      target.on = true;
    };
    const leave = () => {
      target.on = false;
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerdown", move);
    host.addEventListener("pointerleave", leave);
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
    });
    io.observe(host);
    let raf = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible) return;
      const o = opts.current;
      const rgb = LIGHTS[o.light].rgb;
      if (!target.on) {
        if (o.reduced) {
          target.x = w * 0.5;
          target.y = h * 0.5;
        } else {
          target.x = w * (0.5 + 0.32 * Math.sin(now / 2600));
          target.y = h * (0.5 + 0.28 * Math.sin(now / 3700 + 1.3));
        }
      }
      const k = o.reduced ? 1 : 0.12;
      pos.x += (target.x - pos.x) * k;
      pos.y += (target.y - pos.y) * k;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const c = o.cell;
      const r = o.radius;
      const ox = (w % c) / 2;
      const oy = (h % c) / 2;
      // base grid: hairlines at a low, even alpha
      ctx.lineWidth = 1 / dpr;
      ctx.strokeStyle = "rgba(237,234,228,0.07)";
      ctx.beginPath();
      for (let x = ox; x <= w; x += c) {
        ctx.moveTo(Math.round(x * dpr) / dpr + 0.5 / dpr, 0);
        ctx.lineTo(Math.round(x * dpr) / dpr + 0.5 / dpr, h);
      }
      for (let y = oy; y <= h; y += c) {
        ctx.moveTo(0, Math.round(y * dpr) / dpr + 0.5 / dpr);
        ctx.lineTo(w, Math.round(y * dpr) / dpr + 0.5 / dpr);
      }
      ctx.stroke();
      // lit grid: the same lines through a radial light
      const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r);
      g.addColorStop(0, `rgba(${rgb},0.85)`);
      g.addColorStop(0.45, `rgba(${rgb},0.3)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.strokeStyle = g;
      ctx.stroke();
      // a faint wash and glowing crossings
      const wash = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, r * 1.2);
      wash.addColorStop(0, `rgba(${rgb},0.08)`);
      wash.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, w, h);
      for (let x = ox; x <= w; x += c) {
        for (let y = oy; y <= h; y += c) {
          const d = Math.hypot(x - pos.x, y - pos.y);
          if (d > r) continue;
          const a = (1 - d / r) ** 2;
          ctx.fillStyle = `rgba(${rgb},${(a * 0.9).toFixed(3)})`;
          ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerdown", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className={styles.seed} data-demo="lit-grid">
      <Controls label="Grid">
        <Slider
          label="Cell"
          value={cell}
          min={16}
          max={72}
          step={2}
          onChange={setCell}
          format={(v) => `${v} px`}
        />
        <Slider
          label="Light radius"
          value={radius}
          min={60}
          max={360}
          step={10}
          onChange={setRadius}
          format={(v) => `${v} px`}
        />
        <Segmented legend="Light" value={light} choices={LIGHT_CHOICES} onChange={setLight} />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div ref={stage} className={`${styles.stage} ${local.stage}`} data-testid="lg-stage">
        <canvas ref={canvas} className={styles.canvas} />
        <div className={local.card}>
          <span className={local.label}>Section behind the grid</span>
          <b>Point anywhere</b>
          <p>The grid sits under the content and never takes a click.</p>
        </div>
      </div>
      <Note>
        One set of hairlines is stroked twice: once in a flat, quiet grey, then again through a
        radial gradient centred on the light, so only the lines near the pointer brighten. The light
        eases after the pointer; with no pointer it drifts, and with reduced motion it rests in the
        middle and follows the pointer without easing.
      </Note>
    </div>
  );
}
