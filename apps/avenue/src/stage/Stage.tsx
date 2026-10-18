"use client";
import { gsap } from "gsap";
// The stage behind the journey: a sticky, full-viewport layer under the hero, the chapters and
// the demo. First paint is a still poster (pure CSS: the night road's light and the car's
// silhouette are left to the 3D). After first paint and an idle moment the 3D boots, if the
// device has WebGL; the lighter model goes to small screens, Save-Data and slow connections.
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store";
import { CHAPTER_BY_ID } from "./camera";
import styles from "./Stage.module.css";
import { frame, stage } from "./state";

const Scene = dynamic(() => import("./Scene"), { ssr: false });

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

function wantsLite() {
  const px = Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio || 1, 2);
  const conn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  return px < 1400 || Boolean(conn?.saveData) || (conn?.effectiveType ?? "4g") !== "4g";
}

export function Stage() {
  const root = useRef<HTMLDivElement>(null);
  const [boot, setBoot] = useState(false);
  const [lite, setLite] = useState(false);
  const [visible, setVisible] = useState(true);
  const rung = useStore(stage, (s) => s.rung);
  const ready = useStore(stage, (s) => s.ready);

  // Start after first paint and an idle moment, so the hero's words paint first.
  useEffect(() => {
    // `?rung=poster` forces the still picture (tests and reviews); `?rung=3d` skips the checks.
    const forced = new URLSearchParams(location.search).get("rung");
    if (forced === "poster" || (forced !== "3d" && !hasWebGL())) {
      stage.set({ rung: "poster" });
      return;
    }
    setLite(forced !== "3d" && wantsLite());
    const go = () => setBoot(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(go, { timeout: 900 });
      return () =>
        (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(go, 200);
    return () => window.clearTimeout(t);
  }, []);

  // Render only while the stage is on screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting)), {
      rootMargin: "20% 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Turn the car: a horizontal drag on the open picture (not on words, buttons or the demo)
  // turns it up to about 35 degrees either way; let go and it eases back, slowly.
  useEffect(() => {
    const proxy = { v: 0 };
    let start: { x: number; y: number; base: number } | null = null;
    let dragging = false;
    const exterior = () => !CHAPTER_BY_ID[frame.chapter]?.inside && !stage.get().demo;
    const down = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (!el?.closest("[data-slide]") || !exterior()) return;
      if (el.closest("a,button,input,textarea,select,label,[data-anim],[data-no-drag]")) return;
      gsap.killTweensOf(proxy);
      start = { x: e.clientX, y: e.clientY, base: frame.drag };
      dragging = false;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        dragging = true;
        document.documentElement.dataset.dragging = "";
      }
      if (dragging) frame.drag = Math.max(-0.6, Math.min(0.6, start.base + dx * 0.0042));
    };
    const up = () => {
      if (!start) return;
      start = null;
      delete document.documentElement.dataset.dragging;
      if (!dragging) return;
      dragging = false;
      proxy.v = frame.drag;
      gsap.to(proxy, {
        v: 0,
        delay: 0.8,
        duration: 2.8,
        ease: "power2.inOut",
        onUpdate: () => {
          frame.drag = proxy.v;
        },
      });
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      gsap.killTweensOf(proxy);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  // Pointer, for a touch of parallax in the hero.
  useEffect(() => {
    const on = (e: PointerEvent) => {
      frame.pointer.x = (e.clientX / innerWidth) * 2 - 1;
      frame.pointer.y = (e.clientY / innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", on, { passive: true });
    return () => window.removeEventListener("pointermove", on);
  }, []);

  return (
    <div
      ref={root}
      className={styles.stage}
      data-stage
      data-ready={ready ? "" : undefined}
      aria-hidden="true"
    >
      <div className={styles.poster} data-rung={rung ?? "boot"} />
      {boot ? (
        <div className={styles.canvas}>
          <Scene lite={lite} active={visible} />
        </div>
      ) : null}
      <div className={styles.letterbox} />
      <div className={styles.blink} data-blink />
    </div>
  );
}
