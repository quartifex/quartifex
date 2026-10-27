"use client";

// odometer (LB09, Lab). Figures in DM Mono that roll like a mechanical counter as the page
// scrolls: each column turns only while the column to its right passes 9, so the numbers
// read at every moment of the scroll. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  ReducedMotionToggle,
  Segmented,
  useReducedMotion,
} from "@/components/demo/kit";
import { Scroller } from "../Scroller";
import styles from "../seed.module.css";
import local from "./odometer.module.css";

const FIGURES = [
  { label: "Frames rendered", to: 12840, suffix: "" },
  { label: "Launch sites shipped", to: 48, suffix: "" },
  { label: "Lighthouse, mobile", to: 100, suffix: "" },
] as const;

/** The position (0 to 10, continuous) of column `i` (0 = units) for value `v`. */
export function columnPosition(v: number, i: number): number {
  const p = 10 ** i;
  const base = Math.floor(v / p) % 10;
  if (i === 0) return v % 10;
  const below = v % p;
  const carry = Math.max(0, below - (p - 1));
  return base + carry;
}

function Counter({ value, digits, roll }: { value: number; digits: number; roll: boolean }) {
  const v = roll ? value : Math.round(value);
  const cols = Array.from({ length: digits }, (_, k) => digits - 1 - k);
  return (
    <span className={local.counter} aria-hidden="true">
      {cols.map((i) => {
        const pos = roll ? columnPosition(v, i) : Math.floor(v / 10 ** i) % 10;
        const lead = 10 ** i > Math.max(1, Math.round(v)) && i > 0;
        return (
          <span key={i} className={local.col} data-lead={lead || undefined}>
            <span
              className={local.strip}
              style={{ transform: `translateY(${(-pos).toFixed(4)}em)` }}
            >
              {"01234567890".split("").map((d, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed digit strip
                <span key={j}>{d}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

const MODES = [
  { value: "roll", label: "Rolling" },
  { value: "tick", label: "Whole digits" },
] as const;
type Mode = (typeof MODES)[number]["value"];

export default function Odometer() {
  const [p, setP] = useState(0);
  const [mode, setMode] = useState<Mode>("roll");
  const [reduced, setReduced] = useReducedMotion();
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight;
      setP(max > 0 ? Math.min(1, el.scrollTop / max) : 0);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ease out, so the figures settle as the section ends
  const e = 1 - (1 - p) ** 3;
  const roll = mode === "roll" && !reduced;
  return (
    <div className={styles.seed} data-demo="odometer">
      <Controls label="Counter">
        <Segmented legend="Motion" value={mode} choices={MODES} onChange={setMode} />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div className={styles.stage}>
        <Scroller ref={scroller} label="Scroll to run the counters" testid="od-scroll">
          <div className={local.page}>
            <div className={local.sticky}>
              {FIGURES.map((f) => {
                const value = f.to * e;
                const digits = String(f.to).length;
                return (
                  <div key={f.label} className={local.figure}>
                    <Counter value={value} digits={digits} roll={roll} />
                    <span className="visually-hidden" data-testid={`od-${f.to}`}>
                      {Math.round(value)}
                    </span>
                    <span className={local.label}>{f.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Scroller>
        <span className={styles.hint}>Scroll here · {Math.round(p * 100)}%</span>
      </div>
      <Note>
        Each digit is a strip of 0 to 9 moved by a transform, so nothing is re-laid out while the
        page scrolls, and DM Mono&apos;s even figure widths keep the columns still. The units roll
        continuously; every other column turns only while the one to its right is passing from 9 to
        0. Reduced motion, or Whole digits, shows plain whole numbers.
      </Note>
    </div>
  );
}
