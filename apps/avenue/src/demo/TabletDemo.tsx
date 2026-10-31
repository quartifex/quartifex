"use client";
// One seat's screen as a whole page, for the tablet in the quartifex.com case study. The screen
// keeps time and plays media as it does in the cabin; the seat comes from `?seat=`.
// The page that shows it drives it with its own controls, by message: { avenue: { seat, moving,
// fleet } }. Only quartifex.com (and its previews, and local development) can; anything else is
// ignored. The screen answers with its state, so the host's controls stay in step.
import { useEffect, useState } from "react";
import { Screen } from "./Screen";
import { demo, dispatch } from "./store";
import { SEAT_IDS, type SeatId } from "./system";
import s from "./tablet.module.css";

const HOSTS =
  /^(https:\/\/(www\.)?quartifex\.com|https:\/\/quartifex-[a-z0-9-]+\.vercel\.app|http:\/\/localhost:\d+)$/;

type Command = { seat?: unknown; moving?: unknown; fleet?: unknown };

function seatFromQuery(): SeatId {
  const q = new URLSearchParams(location.search).get("seat");
  return SEAT_IDS.includes(q as SeatId) ? (q as SeatId) : "rearLeft";
}

const isSeat = (v: unknown): v is SeatId => SEAT_IDS.includes(v as SeatId);

export function TabletDemo() {
  const [seat, setSeat] = useState<SeatId | null>(null);

  useEffect(() => {
    setSeat(seatFromQuery());
    document.documentElement.dataset.motion = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "reduced"
      : "full";
    // Parked, so every app on the screen can be tried.
    dispatch({ type: "moving", on: false });
    const id = window.setInterval(() => dispatch({ type: "tick", seconds: 1 }), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (window.parent === window) return;
    let host = "";
    const report = () => {
      if (!host) return;
      const { moving, fleet } = demo.get().system;
      window.parent.postMessage({ avenueState: { moving, fleet } }, host);
    };
    const onMessage = (e: MessageEvent) => {
      if (!HOSTS.test(e.origin) || e.source !== window.parent) return;
      const cmd = (e.data as { avenue?: Command } | null)?.avenue;
      if (!cmd) return;
      host = e.origin;
      if (isSeat(cmd.seat)) setSeat(cmd.seat);
      if (typeof cmd.moving === "boolean") dispatch({ type: "moving", on: cmd.moving });
      if (typeof cmd.fleet === "boolean") dispatch({ type: "fleet", on: cmd.fleet });
      report();
    };
    window.addEventListener("message", onMessage);
    const off = demo.subscribe(report);
    return () => {
      window.removeEventListener("message", onMessage);
      off();
    };
  }, []);

  return (
    <main className={s.tablet} aria-label="AVENUE, the live demo">
      {seat ? <Screen seat={seat} /> : null}
    </main>
  );
}
