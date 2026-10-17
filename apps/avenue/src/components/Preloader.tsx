"use client";
// The preloader: the lane mark drawing itself, and a truthful percentage of the car model's
// bytes as they arrive. It lifts on the first drawn frame, at once when the device gets no
// real-time 3D, and after five seconds whatever happens (the poster is already painted
// beneath). Skipped on repeat visits.
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { stage } from "@/stage/state";
import { MARK } from "./logo-paths";
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
    const t = window.setTimeout(() => setGone(true), 5000);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ready || rung === "poster") {
      const t = window.setTimeout(() => setGone(true), ready ? 500 : 0);
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
      ? "Starting the engine"
      : total
        ? `Loading the car · ${(loaded / 1024).toFixed(0)} of ${(total / 1024).toFixed(0)} kB`
        : "Warming up";
  return (
    <div className={s.preloader} data-gone={gone || skip ? "" : undefined} aria-hidden="true">
      <svg
        aria-hidden="true"
        className={s.mark}
        viewBox="10 6 100 106"
        style={{ "--p": shown / 100 } as React.CSSProperties}
      >
        {MARK.map((d, i) => (
          <path key={d} d={d} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </svg>
      <div className={s.readout}>
        <span className={s.pct}>
          {String(shown).padStart(2, "0")}
          <small>%</small>
        </span>
        <span className={s.label}>{label}</span>
      </div>
    </div>
  );
}
