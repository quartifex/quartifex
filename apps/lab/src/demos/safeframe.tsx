"use client";

// Hub demo for @quartifex/safeframe, shown on /safeframe: the same scene staged by
// safeframe or by a centred cover crop, on any aspect and pixel ratio, plus the 3D
// camera fit for that aspect.
import type { Frame } from "@quartifex/safeframe";
import { useCallback, useEffect, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
import {
  Button,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { SceneView } from "@/scene/SceneView";
import type { StagingMode } from "@/scene/scene";
import { guideFromFrame, type Layer, Overlay } from "@/seeds/frameguide/Overlay";
import { CameraFitPanel } from "./CameraFit";
import styles from "./demos.module.css";

const STAGING = [
  { value: "safeframe", label: "safeframe" },
  {
    value: "center",
    label: "Centred crop",
    hint: "object-fit: cover, copy where the desktop design put it",
  },
] as const;
const GUIDES: ReadonlySet<Layer> = new Set(["subject", "focal", "text"]);

export default function Demo() {
  const { device, controls } = useDevice("tall-phone", 3);
  const [mode, setMode] = useState<StagingMode>("safeframe");
  const [progress, setProgress] = useState(0.1);
  const [playing, setPlaying] = useState(false);
  const [guides, setGuides] = useState(true);
  const [reduced, setReduced] = useReducedMotion();
  const [staged, setStaged] = useState<Frame | null>(null);
  const onFrame = useCallback((frame: Frame) => setStaged(frame), []);

  // Play scrubs the sequence like a scroll would. Off under reduced motion.
  useEffect(() => {
    if (!playing || reduced) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setProgress((p) => (p + (now - last) / 5000) % 1);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduced]);

  const pixels = `${Math.round(device.width * device.dpr)} x ${Math.round(device.height * device.dpr)}`;
  return (
    <div className={styles.demo} data-demo="safeframe">
      <Controls label="Screen and staging">
        {controls}
        <Segmented legend="Staging" value={mode} choices={STAGING} onChange={setMode} />
      </Controls>

      <div className={styles.split}>
        <Screen device={device}>
          <SceneView
            {...device}
            mode={mode}
            progress={progress}
            onFrame={onFrame}
            overlay={(frame) =>
              guides ? <Overlay guide={guideFromFrame(frame)} layers={GUIDES} /> : null
            }
          />
        </Screen>
        <div className={styles.side}>
          <Controls label="Sequence">
            <Slider
              label="Sequence frame"
              value={progress}
              min={0}
              max={1}
              step={1 / 119}
              onChange={(v) => {
                setPlaying(false);
                setProgress(v);
              }}
              format={(v) => `${Math.round(v * 119) + 1} / 120`}
            />
            <Button
              onClick={() => setPlaying((p) => !p)}
              disabled={reduced}
              pressed={playing && !reduced}
            >
              {playing && !reduced ? "Pause" : "Play"}
            </Button>
            <Toggle label="Guides" checked={guides} onChange={setGuides} />
            <ReducedMotionToggle value={reduced} onChange={setReduced} />
          </Controls>
          {staged && (
            <Readout
              label="Staging"
              rows={[
                ["Bucket", staged.bucket, "sf-bucket"],
                ["Subject", staged.subjectClipped ? "Cut by the frame" : "Whole", "sf-subject"],
                [
                  "Copy",
                  staged.textOverlap > 0.02
                    ? `Over the subject (${Math.round(staged.textOverlap * 100)}%)`
                    : "Clear of the subject",
                  "sf-copy",
                ],
                ["Scale", `${staged.scale.toFixed(3)}x`],
                [
                  "Source crop",
                  `${Math.round(staged.source.x)}, ${Math.round(staged.source.y)}, ${Math.round(staged.source.width)} x ${Math.round(staged.source.height)}`,
                ],
                ["Canvas", `${pixels} px`, "sf-canvas"],
              ]}
            />
          )}
          <Note>
            The frames are a 1600 x 900 image sequence drawn in code. The centred crop is what
            object-fit: cover does with a desktop composition: on a tall phone the jar leaves the
            frame, and on a 32:9 screen its base is cut off. safeframe keeps the subject whole,
            moves the copy to a clear zone for the bucket, and draws at the device pixel ratio.
            {reduced
              ? " Reduced motion is on: Play is off; step through frames with the slider."
              : ""}
          </Note>
        </div>
      </div>

      <CameraFitPanel aspect={device.width / device.height} />
    </div>
  );
}
