"use client";

// label-peel (LB04, Lab). Stickers whose corner lifts and curls when you point at them: the
// face is clipped along a 45 degree fold, and the corner's back is the same triangle mirrored
// over the fold, shaded like curling paper. CSS only, no canvas. Lab code: no API promises.
import { type CSSProperties, useState } from "react";
import {
  Controls,
  Note,
  ReducedMotionToggle,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import styles from "../seed.module.css";
import local from "./label-peel.module.css";

const STICKERS = [
  { title: "Quartifex Lab", sub: "Batch 01 · open source", tone: "ganga", rot: -6, x: 14, y: 18 },
  {
    title: "Built in the open",
    sub: "MIT · lab.quartifex.com",
    tone: "paper",
    rot: 4,
    x: 52,
    y: 12,
  },
  { title: "Frame 048", sub: "of 120 · scrubbed", tone: "sindoor", rot: -2, x: 30, y: 56 },
] as const;

export default function LabelPeel() {
  const [lift, setLift] = useState(46);
  const [hold, setHold] = useState<number | null>(null);
  const [reduced, setReduced] = useReducedMotion();
  return (
    <div className={styles.seed} data-demo="label-peel">
      <Controls label="Peel">
        <Slider
          label="Peel on hover"
          value={lift}
          min={10}
          max={90}
          step={1}
          onChange={setLift}
          format={(v) => `${v} px`}
        />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div className={`${styles.stage} ${local.surface}`} data-reduced={reduced || undefined}>
        {STICKERS.map((s, i) => (
          <button
            key={s.title}
            type="button"
            className={local.sticker}
            data-tone={s.tone}
            data-peeled={hold === i || undefined}
            data-testid={`lp-${i}`}
            aria-pressed={hold === i}
            aria-label={`${s.title}: peel the corner`}
            onClick={() => setHold((h) => (h === i ? null : i))}
            style={
              {
                "--lift": `${lift}px`,
                "--rot": `${s.rot}deg`,
                left: `${s.x}%`,
                top: `${s.y}%`,
              } as CSSProperties
            }
          >
            <span className={local.face}>
              <b>{s.title}</b>
              <small>{s.sub}</small>
            </span>
            <span className={local.flap} aria-hidden="true" />
          </button>
        ))}
        <span className={styles.hint}>Point at a sticker, or tap one</span>
      </div>
      <Note>
        The fold runs at 45 degrees, so the lifted corner&apos;s mirror image is simply a triangle
        with its right angle on the face: the face is clipped to a five-sided shape, the flap to
        that triangle, and both follow one CSS variable. Tap or press Enter to hold a sticker
        peeled.
        {reduced ? " Reduced motion is on: the corner lifts without easing." : ""}
      </Note>
    </div>
  );
}
