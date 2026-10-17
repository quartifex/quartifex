"use client";
// AVENUE Radio, docked on the page: what the seat you are in is playing, with play / pause,
// the two stations and a live visualiser. It routes audio the way a multi-zone cabin does:
// you hear only your own seat's music (the demo's seat). Silent until sound is turned on.
import { useEffect, useRef } from "react";
import { analyser, setVolume, silence, stream } from "@/demo/radio";
import { dispatch, useSystem } from "@/demo/store";
import { LIBRARY, MEDIA_BY_ID, SEAT_NAME, STATION_NAME, type Station } from "@/demo/system";
import { useStore } from "@/lib/store";
import { stage } from "@/stage/state";
import s from "./RadioDock.module.css";

const FIRST: Record<Station, string> = {
  edm: LIBRARY.find((m) => m.station === "edm")?.id ?? "",
  lofi: LIBRARY.find((m) => m.station === "lofi")?.id ?? "",
};

/** Plays the current seat's music through AVENUE Radio while sound is on. */
export function useRadio() {
  const seat = useStore(stage, (st) => st.seat);
  const sound = useSystem((st) => st.sound);
  const id = useSystem((st) => st.seats[seat].nowPlaying);
  const playing = useSystem((st) => st.seats[seat].playing);
  const volume = useSystem((st) => st.volume[seat]);
  const item = id ? MEDIA_BY_ID[id] : undefined;
  const station = item?.station;
  useEffect(() => {
    if (sound && playing && station && item) stream(station, item.seed);
    else silence();
  }, [sound, playing, station, item]);
  useEffect(() => setVolume(volume), [volume]);
  return { seat, sound, item, playing };
}

function Visualiser({ on }: { on: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    let raf = 0;
    const bins = new Uint8Array(64);
    const draw = () => {
      const a = analyser();
      const w = c.width;
      const h = c.height;
      ctx.clearRect(0, 0, w, h);
      const n = 14;
      if (a && on) a.getByteFrequencyData(bins);
      for (let i = 0; i < n; i++) {
        const v = on && a ? (bins[2 + i * 3] ?? 0) / 255 : 0.08 + 0.04 * Math.sin(i);
        const bh = Math.max(2, v * h);
        ctx.fillStyle = i % 4 === 0 ? "#9cc6ff" : "#2d63ee";
        ctx.fillRect(i * (w / n) + 1, h - bh, w / n - 3, bh);
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return (
    <span aria-hidden="true" className={s.visWrap}>
      <canvas ref={ref} className={s.vis} width={84} height={28} />
    </span>
  );
}

export function RadioDock() {
  const entered = useStore(stage, (st) => st.entered);
  // In the demo the cabin's own dock plays the seat's music; this one steps aside.
  const inDemo = useStore(stage, (st) => st.demo);
  const { seat, sound, item, playing } = useRadio();
  const music = item?.kind === "music";
  const live = sound && playing && music;
  const choose = (station: Station) => {
    if (!sound) {
      void import("@/demo/sound").then((m) => m.enableSound());
      dispatch({ type: "sound", on: true });
    }
    if (item?.station === station) {
      const i = LIBRARY.filter((m) => m.station === station);
      const next = i[(i.findIndex((m) => m.id === item.id) + 1) % i.length];
      if (next) dispatch({ type: "play", seat, id: next.id });
      return;
    }
    dispatch({ type: "play", seat, id: FIRST[station] });
  };
  const toggle = () => {
    if (!sound) {
      void import("@/demo/sound").then((m) => m.enableSound());
      dispatch({ type: "sound", on: true });
      if (!music) dispatch({ type: "play", seat, id: FIRST.lofi });
      else if (!playing) dispatch({ type: "toggle-play", seat });
      return;
    }
    if (!music) {
      dispatch({ type: "play", seat, id: FIRST.lofi });
      return;
    }
    dispatch({ type: "toggle-play", seat });
  };
  return (
    <aside
      className={s.dock}
      data-shown={entered && !inDemo ? "" : undefined}
      inert={!entered || inDemo}
      aria-label="AVENUE Radio"
    >
      <button
        type="button"
        className={s.play}
        onClick={toggle}
        aria-label={live ? "Pause AVENUE Radio" : "Play AVENUE Radio"}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {live ? <path d="M8 5v14M16 5v14" /> : <path d="M8 5.5v13l10.5-6.5Z" />}
        </svg>
      </button>
      <div className={s.meta}>
        <span className={s.kicker}>
          AVENUE Radio · {SEAT_NAME[seat]}
          {!sound ? " · sound off" : ""}
        </span>
        <span className={s.title}>
          {music && item
            ? `${item.title} · ${STATION_NAME[item.station ?? "lofi"]}`
            : "Pick a station"}
        </span>
      </div>
      <Visualiser on={Boolean(live)} />
      <div className={s.stations}>
        {(["edm", "lofi"] as const).map((st) => (
          <button
            key={st}
            type="button"
            className={s.station}
            aria-pressed={music && item?.station === st}
            onClick={() => choose(st)}
          >
            {STATION_NAME[st]}
          </button>
        ))}
      </div>
      <button
        type="button"
        className={s.mute}
        aria-pressed={sound}
        aria-label={sound ? "Turn sound off" : "Turn sound on"}
        onClick={() => {
          if (!sound) void import("@/demo/sound").then((m) => m.enableSound());
          dispatch({ type: "sound", on: !sound });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h4L13 5v14l-5-4.5H4Z" />
          {sound ? (
            <path d="M16.5 9a4.5 4.5 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11" />
          ) : (
            <path d="M17 9.5l5 5M22 9.5l-5 5" />
          )}
        </svg>
      </button>
    </aside>
  );
}
