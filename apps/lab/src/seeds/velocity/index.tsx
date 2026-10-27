"use client";

// velocity (LB06, Lab). Content leans into a fast scroll and splits into red and cyan edges,
// then settles as the scroll slows. The skew and split come from the scroll's speed, eased, so
// a slow read stays perfectly still. Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { Scroller } from "../Scroller";
import styles from "../seed.module.css";
import local from "./velocity.module.css";

const LINES = ["Launch", "day", "is a", "scroll", "story", "told", "at speed"];

export default function Velocity() {
  const [skew, setSkew] = useState(8);
  const [split, setSplit] = useState(6);
  const [reduced, setReduced] = useReducedMotion();
  const [speed, setSpeed] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const opts = useRef({ skew, split, reduced });
  opts.current = { skew, split, reduced };

  useEffect(() => {
    const el = scroller.current;
    const content = page.current;
    if (!el || !content) return;
    let last = el.scrollTop;
    let lastT = performance.now();
    let v = 0;
    let raf = 0;
    let shown = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.max(1, now - lastT);
      const raw = (el.scrollTop - last) / dt; // px per ms
      last = el.scrollTop;
      lastT = now;
      v += (raw - v) * 0.18;
      if (Math.abs(v) < 0.001) v = 0;
      const o = opts.current;
      const k = o.reduced ? 0 : Math.max(-1, Math.min(1, v / 3));
      content.style.setProperty("--skew", `${(k * o.skew).toFixed(3)}deg`);
      content.style.setProperty("--split", `${(Math.abs(k) * o.split).toFixed(2)}px`);
      const s = Math.round(Math.abs(v) * 1000);
      if (Math.abs(s - shown) > 40 || (s === 0 && shown !== 0)) {
        shown = s;
        setSpeed(s);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={styles.seed} data-demo="velocity">
      <Controls label="Velocity">
        <Slider
          label="Lean"
          value={skew}
          min={0}
          max={20}
          step={0.5}
          onChange={setSkew}
          format={(v) => `${v} deg at full speed`}
        />
        <Slider
          label="Colour split"
          value={split}
          min={0}
          max={16}
          step={0.5}
          onChange={setSplit}
          format={(v) => `${v} px at full speed`}
        />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div className={styles.stage}>
        <Scroller ref={scroller} label="Scroll fast, then slow" testid="ve-scroll">
          <div ref={page} className={local.page}>
            {[0, 1, 2].flatMap((r) =>
              LINES.map((l, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: repeated decorative lines
                <p key={`${r}-${i}`} className={local.line} data-accent={i === 4 || undefined}>
                  {l}
                </p>
              )),
            )}
          </div>
        </Scroller>
        <span className={styles.hint}>Flick to scroll</span>
      </div>
      <Readout label="Speed" rows={[["Scroll speed", `${speed} px/s`, "ve-speed"]]} />
      <Note>
        Speed is measured every frame from how far the page moved, then eased, and turned into a
        skew and a red/cyan text shadow through two CSS variables, so the browser only repaints the
        text. With reduced motion on, the page scrolls normally with no lean and no split.
      </Note>
    </div>
  );
}
