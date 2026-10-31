"use client";
// One seat's screen as a whole page, for the tablet in the quartifex.com case study. The screen
// keeps time and plays media as it does in the cabin; the seat comes from `?seat=`.
import { useEffect, useState } from "react";
import { Screen } from "./Screen";
import { dispatch } from "./store";
import { SEAT_IDS, type SeatId } from "./system";
import s from "./tablet.module.css";

function seatFromQuery(): SeatId {
  const q = new URLSearchParams(location.search).get("seat");
  return SEAT_IDS.includes(q as SeatId) ? (q as SeatId) : "rearLeft";
}

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

  return (
    <main className={s.tablet} aria-label="AVENUE, the live demo">
      {seat ? <Screen seat={seat} /> : null}
    </main>
  );
}
