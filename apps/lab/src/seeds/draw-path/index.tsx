"use client";

// draw-path (LB11, Lab). A line-work mark drawn by the scroll: every path gets a normalised
// length of 1, the scroll sets how much of it is drawn, and the paths start one after another
// so the mark builds in the order it was designed. Lab code: no API promises.
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { Controls, Note, Readout, Segmented, Slider, Toggle } from "@/components/demo/kit";
import { Scroller } from "../Scroller";
import styles from "../seed.module.css";
import local from "./draw-path.module.css";

/** Three line-work marks drawn for this seed, on a 200 x 200 grid, in drawing order. */
const MARKS = {
  gyro: {
    label: "Gyroscope",
    paths: [
      "M100 30a70 70 0 1 1 0 140a70 70 0 1 1 0-140",
      "M30 100a70 26 0 1 0 140 0a70 26 0 1 0-140 0",
      "M100 30a26 70 0 1 0 0 140a26 70 0 1 0 0-140",
      "M100 84a16 16 0 1 1 0 32a16 16 0 1 1 0-32",
      "M100 170v20M86 190h28",
    ],
  },
  jar: {
    label: "Jar",
    paths: [
      "M64 70h72v12H64z",
      "M70 82c-14 8-18 20-18 34v50c0 10 8 16 18 16h60c10 0 18-6 18-16v-50c0-14-4-26-18-34",
      "M58 112h84M58 152h84",
      "M80 124h40M80 138h26",
      "M96 50c0-10 8-14 12-20M104 50c4-6 12-8 16-6",
    ],
  },
  q: {
    label: "Ring and pointer",
    paths: [
      "M100 28a72 72 0 1 1-50.9 21.1",
      "M100 52a48 48 0 1 0 0 96a48 48 0 1 0 0-96",
      "M118 118l48 48",
      "M150 172l18-6 6-18",
      "M100 92a8 8 0 1 1 0 16a8 8 0 1 1 0-16",
    ],
  },
} as const;
type Mark = keyof typeof MARKS;
const MARK_CHOICES = (Object.keys(MARKS) as Mark[]).map((value) => ({
  value,
  label: MARKS[value].label,
}));

export default function DrawPath() {
  const [mark, setMark] = useState<Mark>("gyro");
  const [p, setP] = useState(0);
  const [stagger, setStagger] = useState(0.55);
  const [weight, setWeight] = useState(1.6);
  const [fill, setFill] = useState(true);
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

  const paths = MARKS[mark].paths;
  const n = paths.length;
  // each path draws over a window of the scroll; stagger spreads the windows out
  const span = 1 / (1 + (n - 1) * stagger);
  const drawn = (i: number) => Math.min(1, Math.max(0, (p * 1.1 - i * span * stagger) / span));
  return (
    <div className={styles.seed} data-demo="draw-path">
      <Controls label="Draw">
        <Segmented legend="Mark" value={mark} choices={MARK_CHOICES} onChange={setMark} />
        <Slider label="Stagger" value={stagger} min={0} max={1} step={0.05} onChange={setStagger} />
        <Slider
          label="Line"
          value={weight}
          min={0.8}
          max={4}
          step={0.1}
          onChange={setWeight}
          format={(v) => `${v} of 200`}
        />
        <Toggle label="Tint once drawn" checked={fill} onChange={setFill} />
      </Controls>
      <div className={styles.stage}>
        <svg viewBox="0 0 200 200" className={local.mark} aria-hidden="true">
          {paths.map((d, i) => {
            const k = drawn(i);
            return (
              <path
                key={d}
                d={d}
                pathLength={1}
                className={local.path}
                data-done={(fill && k >= 1) || undefined}
                style={{ strokeDashoffset: 1 - k, strokeWidth: weight } as CSSProperties}
              />
            );
          })}
        </svg>
        <Scroller ref={scroller} label="Scroll to draw the mark" testid="dp-scroll">
          <div style={{ height: "300cqh" }} />
        </Scroller>
        <span className={styles.hint}>Scroll here</span>
      </div>
      <Readout
        label="Drawing"
        rows={[
          ["Drawn", `${Math.round(Math.min(1, p * 1.1) * 100)}%`, "dp-drawn"],
          ["Paths", `${paths.filter((_, i) => drawn(i) >= 1).length} of ${n} complete`],
        ]}
      />
      <Note>
        Setting pathLength to 1 makes every path the same length to CSS, whatever its real length,
        so one dash offset from 1 to 0 draws any of them. The drawing only advances with the scroll,
        so it reads the same with reduced motion on.
      </Note>
    </div>
  );
}
