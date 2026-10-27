"use client";

// logo-extrude (LB10, Lab). A flat SVG mark becomes a 3D object: the paths are parsed, holes
// kept by their fill rule, extruded and bevelled, then lit in a small studio. The marks here
// are drawn for the seed; the LogoFolio marks drop in once their files are supplied.
// Lab code: no API promises.
import { useEffect, useRef, useState } from "react";
import {
  Controls,
  Note,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import styles from "../seed.module.css";
import local from "./logo-extrude.module.css";
import type { ExtrudeOptions, Extruder } from "./scene";

const svg = (paths: readonly string[]) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">${paths.map((d) => `<path fill-rule="evenodd" d="${d}"/>`).join("")}</svg>`;

/** Filled marks on a 200 x 200 grid, holes by the even-odd rule. */
const MARKS = {
  ring: {
    label: "Ring and pointer",
    d: [
      "M90 14a76 76 0 1 1 0 152a76 76 0 1 1 0-152zM90 46a44 44 0 1 0 0 88a44 44 0 1 0 0-88z",
      "M146 146l42 14-14 6-6 14z",
    ],
  },
  bindu: {
    label: "Q with bindu",
    d: [
      "M100 26a70 70 0 1 1 0 140a70 70 0 1 1 0-140zM100 54a42 42 0 1 0 0 84a42 42 0 1 0 0-84z",
      "M100 84a12 12 0 1 1 0 24a12 12 0 1 1 0-24z",
      "M136 146l36 36h-24l-28-28z",
    ],
  },
  gem: {
    label: "Facet gem",
    d: ["M60 40h80l40 50-80 90-80-90zM70 90h60l-30 50z"],
  },
} as const;
type Mark = keyof typeof MARKS;
const MARK_CHOICES = (Object.keys(MARKS) as Mark[]).map((value) => ({
  value,
  label: MARKS[value].label,
}));
const FINISHES = [
  { value: "metal", label: "Brushed metal" },
  { value: "clay", label: "Sindoor clay" },
  { value: "glass", label: "Ganga glass" },
] as const;

export default function LogoExtrude() {
  const [mark, setMark] = useState<Mark>("ring");
  const [finish, setFinish] = useState<ExtrudeOptions["finish"]>("metal");
  const [depth, setDepth] = useState(1);
  const [bevel, setBevel] = useState(0.6);
  const [segments, setSegments] = useState(6);
  const [reduced, setReduced] = useReducedMotion();
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const api = useRef<Extruder | null>(null);
  const opts: ExtrudeOptions = { svg: svg(MARKS[mark].d), depth, bevel, segments, finish };
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let dead = false;
    import("./scene")
      .then(({ mountExtruder }) => {
        if (dead) return;
        api.current = mountExtruder(el);
        api.current.build(optsRef.current);
      })
      .catch(() => setFailed(true));
    let down = false;
    let lx = 0;
    let ly = 0;
    const pd = (e: PointerEvent) => {
      down = true;
      lx = e.clientX;
      ly = e.clientY;
      api.current?.setAuto(false);
    };
    const pmv = (e: PointerEvent) => {
      if (!down) return;
      api.current?.turn((e.clientX - lx) * 0.01, (e.clientY - ly) * 0.006);
      lx = e.clientX;
      ly = e.clientY;
    };
    const pu = () => {
      down = false;
    };
    el.addEventListener("pointerdown", pd);
    addEventListener("pointermove", pmv);
    addEventListener("pointerup", pu);
    return () => {
      dead = true;
      el.removeEventListener("pointerdown", pd);
      removeEventListener("pointermove", pmv);
      removeEventListener("pointerup", pu);
      api.current?.dispose();
      api.current = null;
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: rebuild when any option changes
  useEffect(() => {
    api.current?.build(optsRef.current);
  }, [mark, finish, depth, bevel, segments]);

  useEffect(() => {
    api.current?.setAuto(!reduced);
  }, [reduced]);

  return (
    <div className={styles.seed} data-demo="logo-extrude">
      <Controls label="Extrude">
        <Segmented legend="Mark" value={mark} choices={MARK_CHOICES} onChange={setMark} />
        <Segmented legend="Finish" value={finish} choices={FINISHES} onChange={setFinish} />
        <Slider label="Depth" value={depth} min={0.2} max={3} step={0.1} onChange={setDepth} />
        <Slider label="Bevel" value={bevel} min={0} max={1.5} step={0.05} onChange={setBevel} />
        <Slider
          label="Bevel smoothness"
          value={segments}
          min={1}
          max={12}
          step={1}
          onChange={setSegments}
          format={(v) => `${v} steps`}
        />
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <div
        ref={host}
        className={`${styles.stage} ${local.stage}`}
        data-testid="le-stage"
        data-mark={mark}
      >
        <span className={styles.hint}>Drag to turn</span>
        {failed ? <span className={styles.status}>WebGL is not available here</span> : null}
      </div>
      <Note>
        three.js reads the SVG path, turns each closed shape into an outline with its holes, and
        extrudes it with a rounded bevel, which is what catches the light. The mark turns slowly on
        its own until you drag it; with reduced motion it holds still.
      </Note>
    </div>
  );
}
