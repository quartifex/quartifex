"use client";

// Hub demo for @quartifex/anatomy, shown on /anatomy. The jar explodes into its five parts
// as you scrub; labels appear once each part is apart, and the same labels are listed
// beside the canvas so nothing depends on seeing the 3D.
import type { Exploded } from "@quartifex/anatomy";
import { Anatomy } from "@quartifex/anatomy/react";
import { Canvas, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useRef, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
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
import { Jar3D, Stage } from "@/scene/Jar3D";
import shared from "./demos.module.css";
import styles from "./sequence.module.css";

const MODES = [
  { value: "axis", label: "Along an axis" },
  { value: "radial", label: "Radial" },
] as const;

export default function Demo() {
  const { device, controls } = useDevice("laptop", 2);
  const [progress, setProgress] = useState(0.6);
  const [mode, setMode] = useState<"axis" | "radial">("axis");
  const [distance, setDistance] = useState(1.6);
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
      <Controls label="Screen">{controls}</Controls>
      <div className={shared.split}>
        <Screen device={device} label="An exploded view of a jar">
          <div className={styles.stage}>
            <Canvas
              resize={{ offsetSize: true }}
              gl={{ preserveDrawingBuffer: true }}
              dpr={device.dpr}
              camera={{ fov: 34, position: [4.5, 3.2, 6.5] }}
              aria-hidden="true"
            >
              <Stage />
              <LookAt />
              <Anatomy
                progress={() => ref.current}
                mode={mode}
                distance={distance}
                stagger={stagger}
                onAnnotations={onAnnotations}
              >
                <Jar3D />
              </Anatomy>
            </Canvas>
          </div>
        </Screen>
        <div className={shared.side}>
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
          <Readout
            label="Parts"
            rows={[
              ["Parts", 5],
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
              : "Parts separate one after another, outer parts first; each label appears once its part is clear."}
          </Note>
        </div>
      </div>
      <Code>{`<Anatomy progress={() => scrollProgress} mode="axis" distance={1.6} stagger={0.5}>
  <primitive object={gltf.scene} />  {/* children named, labels in userData.label */}
</Anatomy>`}</Code>
    </div>
  );
}

/** Aim the default camera at the middle of the jar. */
function LookAt() {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(0, 1.4, 0);
  }, [camera]);
  return null;
}
