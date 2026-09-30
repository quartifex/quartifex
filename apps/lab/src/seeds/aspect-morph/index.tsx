"use client";

// aspect-morph (LB14, Lab). One slider morphs the jar scene between 9:16, 1:1, 16:9 and
// 32:9, and safeframe re-stages it continuously on the way. Lab code: no API promises.
import type { Frame } from "@quartifex/safeframe";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen } from "@/components/demo/DeviceStage";
import {
  Button,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { SceneView } from "@/scene/SceneView";
import type { StagingMode } from "@/scene/scene";
import styles from "../seed.module.css";

// Each stop is a real screen of that shape: a phone, a square window, a desktop, a
// super ultrawide. Width and height are interpolated in log space between stops.
const STOPS = [
  { label: "9:16", width: 390, height: 693 },
  { label: "1:1", width: 900, height: 900 },
  { label: "16:9", width: 1920, height: 1080 },
  { label: "32:9", width: 3840, height: 1080 },
] as const;

/** Screen size at slider position `p` (0 to 3). */
function sizeAt(p: number): { width: number; height: number } {
  const i = Math.min(Math.floor(p), STOPS.length - 2);
  const t = p - i;
  const a = STOPS[i] ?? STOPS[0];
  const b = STOPS[i + 1] ?? STOPS[0];
  const mix = (x: number, y: number) =>
    Math.round(Math.exp(Math.log(x) + (Math.log(y) - Math.log(x)) * t));
  return { width: mix(a.width, b.width), height: mix(a.height, b.height) };
}

const STAGING = [
  { value: "safeframe", label: "safeframe" },
  { value: "center", label: "Centred crop" },
] as const;

export default function AspectMorph() {
  const [position, setPosition] = useState(0);
  const [mode, setMode] = useState<StagingMode>("safeframe");
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const [staged, setStaged] = useState<Frame | null>(null);
  const onFrame = useCallback((frame: Frame) => setStaged(frame), []);
  const direction = useRef(1);

  // Auto-morph, back and forth, about four seconds end to end. Off under reduced motion.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPosition((p) => {
        let next = p + direction.current * dt * 0.75;
        if (next >= 3 || next <= 0) {
          direction.current *= -1;
          next = Math.min(Math.max(next, 0), 3);
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const { width, height } = sizeAt(position);
  const aspect = width / height;
  const distance = (stop: (typeof STOPS)[number]) =>
    Math.abs(Math.log(stop.width / stop.height / aspect));
  const nearest = STOPS.reduce((best, stop) => (distance(stop) < distance(best) ? stop : best));

  return (
    <div className={styles.seed} data-demo="aspect-morph">
      <Controls label="Morph">
        <Slider
          label="Aspect"
          value={position}
          min={0}
          max={3}
          step={0.01}
          onChange={(value) => {
            setPlaying(false);
            setPosition(value);
          }}
          format={() => `${aspect.toFixed(2)}:1`}
        />
        <fieldset className={styles.row}>
          <legend className="visually-hidden">Jump to an aspect</legend>
          {STOPS.map((stop, i) => (
            <Button
              key={stop.label}
              pressed={Math.abs(position - i) < 0.005}
              onClick={() => {
                setPlaying(false);
                setPosition(i);
              }}
            >
              {stop.label}
            </Button>
          ))}
        </fieldset>
        <Button
          onClick={() => setPlaying((p) => !p)}
          disabled={reduced}
          pressed={playing && !reduced}
        >
          {playing && !reduced ? "Pause" : "Play"}
        </Button>
        <Segmented legend="Staging" value={mode} choices={STAGING} onChange={setMode} />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <Screen device={{ width, height }} maxHeight={520}>
        <SceneView
          width={width}
          height={height}
          dpr={1}
          mode={mode}
          progress={position / 3}
          onFrame={onFrame}
        />
      </Screen>
      <Readout
        label="Current shape"
        rows={[
          ["Aspect", `${aspect.toFixed(2)}:1 (near ${nearest.label})`, "am-aspect"],
          ["Size", `${width} x ${height}`],
          ["Bucket", staged?.bucket ?? "", "am-bucket"],
          ["Subject", staged ? (staged.subjectClipped ? "Cut" : "Whole") : "", "am-subject"],
        ]}
      />
      <Note>
        Each stop is a real screen of that shape, from a 390 px phone to a 3840 px super ultrawide;
        in between, the size moves smoothly and safeframe re-stages every frame.
        {reduced
          ? " Reduced motion is on: Play is off, and the slider and buttons change the shape in steps you control."
          : " Play morphs back and forth; the slider and buttons stop it."}
      </Note>
    </div>
  );
}
