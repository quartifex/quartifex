"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { type LogoParams, qxDrawLogo } from "@/lib/logo/qx-draw";

const PAD = 26;
const LW = 2661 + PAD * 2;
const LH = 373 + PAD * 2;
const MARK = 186;
const IDLE_MS = 2400;

const easeInOut4 = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2);

const rgba = (hex: string, alpha: number) => {
  const h = hex.trim();
  const c = h.startsWith("#") && h.length >= 7 ? h : "#E5002A";
  const n = (a: number, b: number) => Number.parseInt(c.slice(a, b), 16);
  return `rgba(${n(1, 3)},${n(3, 5)},${n(5, 7)},${alpha})`;
};

type Props = {
  /** Height in px on desktop; 18% smaller under 480 px wide. */
  height?: number;
  href?: string;
  label?: string;
  className?: string;
  /** Reserve room for the short mark only, as the nav does. */
  compact?: boolean;
};

export function Logo({
  height = 38,
  href = "/",
  label = "Quartifex, home",
  className,
  compact = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvasRef.current;
    const host = cv?.closest("a");
    const ctx = cv?.getContext("2d");
    if (!cv || !host || !ctx) return;
    const root = document.documentElement;
    const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => reduceMq.matches || root.dataset.motion === "reduce";
    const touch = () => root.hasAttribute("data-touch");

    const params: LogoParams = {
      squareColor: "#0B0A0A",
      markColor: "#231F20",
      dark: false,
      light: null,
    };
    let tween = { from: 0, to: 0, t0: 0, dur: 0 };
    let hoverStart = -1;
    let raf = 0;
    let inside = false;
    let lightK = 0;
    let px = MARK;
    let py = MARK;
    let last = 0;
    let accent = "#E5002A";
    let visible = false;

    const progress = (now: number) =>
      tween.dur
        ? tween.from +
          (tween.to - tween.from) * easeInOut4(Math.min(1, (now - tween.t0) / tween.dur))
        : tween.to;

    const draw = (now: number) => {
      const s = cv.width / LW;
      if (!s) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = inside && !touch() && !reduce() ? 1 : 0;
      lightK += (target - lightK) * Math.min(1, dt * 7);
      if (Math.abs(target - lightK) < 0.01) lightK = target;
      if (lightK > 0.01 || inside) {
        const dx = px - MARK;
        const dy = py - MARK;
        const len = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, len / 420);
        params.light = [(dx / len) * (0.3 + 0.7 * k), (dy / len) * (0.3 + 0.7 * k), -0.38];
      } else params.light = null;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.setTransform(s, 0, 0, s, PAD * s, PAD * s);
      qxDrawLogo(ctx, progress(now), hoverStart >= 0 ? (now - hoverStart) / 1000 : -1, params);
      if (lightK > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        const g = ctx.createRadialGradient(px, py, 0, px, py, 300);
        g.addColorStop(0, rgba(accent, 0.95 * lightK));
        g.addColorStop(1, rgba(accent, 0));
        ctx.fillStyle = g;
        ctx.fillRect(-PAD, -PAD, LW, LH);
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      draw(now);
      const busy =
        now - tween.t0 < tween.dur ||
        (hoverStart >= 0 && now - hoverStart < 1100) ||
        inside ||
        lightK > 0;
      raf = busy ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const go = (to: number) => {
      const now = performance.now();
      const from = progress(now);
      const dur = reduce() ? 0 : (to > from ? 900 : 700) * Math.abs(to - from);
      tween = { from, to, t0: now, dur };
      kick();
    };

    const refresh = () => {
      const cs = getComputedStyle(cv);
      const dark = cs.getPropertyValue("--is-dark").trim() === "1";
      params.dark = dark;
      params.squareColor = dark ? "#F4F2EE" : "#0B0A0A";
      params.markColor = dark ? "#EDEAE4" : "#231F20";
      accent = cs.getPropertyValue("--accent").trim() || "#E5002A";
      draw(performance.now());
    };

    const fit = () => {
      const h = innerWidth < 480 ? Math.round(height * 0.82) : height;
      cv.style.height = `${h}px`;
      cv.style.width = `${(h * LW) / LH}px`;
      // compact: the link only reserves room for the short mark; the full name opens over the links
      if (compact) host.style.width = `${Math.round(((h * LW) / LH) * 0.67)}px`;
    };
    (cv as HTMLCanvasElement & { __prog?: () => number }).__prog = () =>
      progress(performance.now());
    const size = () => {
      const d = devicePixelRatio || 1;
      const w = cv.getBoundingClientRect().width;
      cv.width = Math.round(w * d);
      cv.height = Math.round((w * d * LH) / LW);
    };
    const toLogo = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * LW - PAD;
      py = ((e.clientY - r.top) / r.height) * LH - PAD;
    };
    const pulse = () => {
      if (reduce()) return;
      hoverStart = performance.now();
      kick();
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || touch()) return;
      inside = true;
      toLogo(e);
      if (!reduce()) hoverStart = performance.now();
      go(1);
    };
    const onMove = (e: PointerEvent) => {
      if (!inside) return;
      toLogo(e);
      kick();
    };
    const onLeave = () => {
      if (!inside) return;
      inside = false;
      go(0);
    };
    const onFocus = () => {
      if (!touch()) go(1);
    };
    const onBlur = () => go(0);

    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("focus", onFocus);
    host.addEventListener("blur", onBlur);

    fit();
    size();
    refresh();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible = entry.isIntersecting;
      },
      { threshold: 0.2 },
    );
    io.observe(cv);
    const ro = new ResizeObserver(() => {
      fit();
      size();
      draw(performance.now());
    });
    ro.observe(cv);
    const themeObserver = new MutationObserver(refresh);
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme", "data-brand"],
    });

    const first = setTimeout(pulse, 900);
    const idle = setInterval(() => {
      if (!inside && !document.hidden && visible) pulse();
    }, IDLE_MS);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(first);
      clearInterval(idle);
      io.disconnect();
      ro.disconnect();
      themeObserver.disconnect();
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("focus", onFocus);
      host.removeEventListener("blur", onBlur);
    };
  }, [height, compact]);

  return (
    <Link className={className ? `logo ${className}` : "logo"} href={href} aria-label={label}>
      <canvas
        ref={canvasRef}
        className="hv"
        data-h={height}
        data-compact={compact ? "" : undefined}
        role="img"
        aria-label="Quartifex"
      />
    </Link>
  );
}
