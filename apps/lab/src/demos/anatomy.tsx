"use client";

// Hub demo for @quartifex/anatomy, shown on /anatomy. A fountain pen exploding along its
// own axis into six parts: the cap comes off first, then the nib, section, converter, barrel
// and end cap spread out. Labels appear once each part is clear, and the same labels are
// listed beside the stage so nothing depends on seeing the 3D. The stage takes the width.
import type { Exploded } from "@quartifex/anatomy";
import { Anatomy } from "@quartifex/anatomy/react";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  useReducedMotion,
} from "@/components/demo/kit";
import { Pen3D, PenStage } from "@/scene/props/Pen3D";
import { Studio } from "@/scene/Studio";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./sequence.module.css";

const MODES = [
  { value: "axis", label: "Along the pen" },
  { value: "radial", label: "Radial" },
] as const;
const PARTS = 6;

export default function Demo() {
  const [progress, setProgress] = useState(0.6);
  const [mode, setMode] = useState<"axis" | "radial">("axis");
  const [distance, setDistance] = useState(1.1);
  const [stagger, setStagger] = useState(0.5);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useReducedMotion();
  const [labels, setLabels] = useState<Exploded["annotations"]>([]);
  const ref = useRef(progress);
  ref.current = progress;
  const onAnnotations = useCallback((a: Exploded["annotations"]) => setLabels(a), []);

  // Play explodes and reassembles on a loop. Off under reduced motion.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = ((now - start) / 4000) % 2;
      setProgress(t < 1 ? t : 2 - t);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const visible = labels.filter((l) => l.visible);
  return (
    <div className={shared.demo} data-demo="anatomy">
      <div className={layouts.lead}>
        <div className={layouts.stage3d} role="img" aria-label="An exploded view of a fountain pen">
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            dpr={[1, 2]}
            camera={{ fov: 30, position: [0.4, 3.4, 9.6] }}
            aria-hidden="true"
          >
            <Studio intensity={0.6} />
            <PenStage />
            <LookAt />
            <Anatomy
              progress={() => ref.current}
              mode={mode}
              axis={[1, 0, 0]}
              distance={distance}
              stagger={stagger}
              onAnnotations={onAnnotations}
            >
              <Pen3D />
            </Anatomy>
          </Canvas>
        </div>
        <div className={shared.side}>
          <Readout
            label="Parts"
            rows={[
              ["Parts", PARTS],
              ["Labels showing", visible.length, "an-visible"],
            ]}
          />
          <div>
            <h3 className={shared.panelTitle}>Labelled parts</h3>
            <ul className={shared.list} data-testid="an-list">
              {labels.map((l) => (
                <li key={l.id} data-visible={l.visible || undefined}>
                  {l.label}
                  {l.visible ? "" : " (inside the assembly)"}
                </li>
              ))}
            </ul>
          </div>
          <Note>
            {reduced
              ? "Reduced motion is on: Play is off. The slider and the two buttons move the parts in steps you control."
              : "The cap comes off first, then the rest spread along the pen; each label appears once its part is clear. Concept visual: a pen built in code."}
          </Note>
        </div>
      </div>
      <div className={layouts.controlGrid}>
        <Controls label="Explosion">
          <Slider
            label="Explode"
            value={progress}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => {
              setPlaying(false);
              setProgress(v);
            }}
            format={(v) => `${Math.round(v * 100)}%`}
          />
          <div className={styles.chapterButtons}>
            <Button onClick={() => setProgress(0)}>Assembled</Button>
            <Button onClick={() => setProgress(1)}>Exploded</Button>
            <Button
              onClick={() => setPlaying((p) => !p)}
              disabled={reduced}
              pressed={playing && !reduced}
            >
              {playing && !reduced ? "Pause" : "Play"}
            </Button>
          </div>
        </Controls>
        <Controls label="Direction">
          <Segmented legend="Direction" value={mode} choices={MODES} onChange={setMode} />
          <Slider
            label="Distance"
            value={distance}
            min={0.5}
            max={3}
            step={0.1}
            onChange={setDistance}
          />
          <Slider
            label="Stagger"
            value={stagger}
            min={0}
            max={1}
            step={0.05}
            onChange={setStagger}
          />
          <ReducedMotionToggle value={reduced} onChange={setReduced} />
        </Controls>
      </div>
      <Code>{`<Anatomy progress={() => scrollProgress} mode="axis" axis={[1, 0, 0]} distance={1.4} stagger={0.5}>
  <primitive object={gltf.scene} />  {/* children named, labels in userData.label */}
</Anatomy>`}</Code>
    </div>
  );
}

/** Aim the default camera at the middle of the pen. */
function LookAt() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 0.6, 0);
  }, [camera]);
  return null;
}
