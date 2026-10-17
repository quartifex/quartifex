"use client";
// The preloader: a truthful percentage of the car model's bytes as they arrive (the bytes the
// 3D needs before it can draw), then the engine starting. It lifts when the first frame is
// drawn, when there is nothing to load (no real-time 3D on this device), or after a few
// seconds whatever happens (the poster is already there underneath). Skipped on repeat visits.
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { stage } from "@/stage/state";
import s from "./Preloader.module.css";

const KEY = "avenue-visited";

export function Preloader() {
  const rung = useStore(stage, (st) => st.rung);
  const loaded = useStore(stage, (st) => st.loaded);
  const total = useStore(stage, (st) => st.total);
  const ready = useStore(stage, (st) => st.ready);
  const [gone, setGone] = useState(false);
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY)) setSkip(true);
    } catch {
      // Storage blocked: show the preloader.
    }
    const t = window.setTimeout(() => setGone(true), 4500);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready || (rung && rung !== "webgl")) {
      const t = window.setTimeout(() => setGone(true), ready ? 450 : 0);
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        // Fine: it shows again next time.
      }
      return () => window.clearTimeout(t);
    }
  }, [ready, rung]);

  const pct = total ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  const shown = ready ? 100 : pct;
  const label = ready
    ? "Ready"
    : total && loaded >= total
      ? "Starting the renderer"
      : total
        ? `Loading the cabin, ${(loaded / 1024).toFixed(0)} of ${(total / 1024).toFixed(0)} kB`
        : rung === "webgl"
          ? "Loading the 3D engine"
          : "Loading";
  return (
    <div className={s.preloader} data-gone={gone || skip ? "" : undefined} aria-hidden="true">
      <div className={s.inner}>
        <span className={s.pct}>
          {String(shown).padStart(2, "0")}
          <small>%</small>
        </span>
        <span className={s.label}>{label}</span>
        <span className={s.bar}>
          <i style={{ transform: `scaleX(${shown / 100})` }} />
        </span>
      </div>
    </div>
  );
}
