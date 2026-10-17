"use client";
// The preloader: the two lanes of the mark drawing themselves as the car model's bytes arrive
// (a truthful percentage), then a gate: enter with sound (AVENUE Radio and the interface
// sounds, which a browser only allows after a gesture) or enter quietly. It moves on to the
// gate on the first drawn frame, at once without real-time 3D, and after six seconds whatever
// happens. A scroll or a key press enters quietly. Repeat visits get a shorter version.
import { useEffect, useRef, useState } from "react";
import { dispatch } from "@/demo/store";
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
  const entered = useStore(stage, (st) => st.entered);
  const [timedOut, setTimedOut] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const soundButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let again = false;
    try {
      again = Boolean(localStorage.getItem(KEY));
    } catch {
      // Storage blocked: the full version.
    }
    setRepeat(again);
    const t = window.setTimeout(() => setTimedOut(true), again ? 2500 : 6000);
    return () => window.clearTimeout(t);
  }, []);

  const gate = ready || rung === "poster" || timedOut;

  // Any scroll or key (outside the gate's buttons) enters quietly.
  useEffect(() => {
    if (entered) return;
    const quiet = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-gate]")) return;
      if (e instanceof KeyboardEvent && ["Tab", "Shift", "Enter", " "].includes(e.key)) return;
      enter(false);
    };
    window.addEventListener("wheel", quiet, { passive: true });
    window.addEventListener("touchmove", quiet, { passive: true });
    window.addEventListener("keydown", quiet);
    return () => {
      window.removeEventListener("wheel", quiet);
      window.removeEventListener("touchmove", quiet);
      window.removeEventListener("keydown", quiet);
    };
  }, [entered]);

  useEffect(() => {
    if (gate && !entered) soundButton.current?.focus({ preventScroll: true });
  }, [gate, entered]);

  const pct = total ? Math.min(100, Math.floor((loaded / total) * 100)) : 0;
  const shown = gate ? 100 : pct;
  const label = gate
    ? "Ready"
    : total && loaded >= total
      ? "Starting the engine"
      : total
        ? `Loading the car · ${(loaded / 1024).toFixed(0)} of ${(total / 1024).toFixed(0)} kB`
        : "Warming up";
  return (
    <div
      className={s.preloader}
      data-gone={entered ? "" : undefined}
      data-gate={gate ? "" : undefined}
      data-repeat={repeat ? "" : undefined}
    >
      <div className={s.glow} aria-hidden="true" />
      <svg
        aria-hidden="true"
        className={s.mark}
        viewBox="10 6 100 106"
        style={{ "--p": shown / 100 } as React.CSSProperties}
      >
        {MARK.map((d, i) => (
          <path key={d} d={d} pathLength={1} style={{ "--i": i } as React.CSSProperties} />
        ))}
      </svg>
      <div className={s.gate} data-gate inert={!gate}>
        <p className={s.gateTitle}>
          <span>Avenue</span>
          <small>A cabin system for every seat</small>
        </p>
        <div className={s.gateActions}>
          <button
            ref={soundButton}
            type="button"
            className={s.enter}
            data-primary
            onClick={() => enter(true)}
          >
            <span className={s.eq} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            Enter with sound
          </button>
          <button type="button" className={s.enter} onClick={() => enter(false)}>
            Enter quietly
          </button>
        </div>
        <p className={s.gateNote}>
          Sound plays AVENUE Radio, EDM and lo-fi generated live in your browser. You can change it
          any time.
        </p>
      </div>
      <div className={s.readout} aria-hidden="true">
        <span className={s.pct}>
          {String(shown).padStart(2, "0")}
          <small>%</small>
        </span>
        <span className={s.label}>{label}</span>
      </div>
    </div>
  );
}

function enter(sound: boolean) {
  if (stage.get().entered) return;
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Fine: the full version next time.
  }
  if (sound) {
    void import("@/demo/sound").then((m) => m.enableSound());
    dispatch({ type: "sound", on: true });
  }
  stage.set({ entered: true });
}
