"use client";

// Hub demo for @quartifex/dolly, shown on /dolly. Scroll a small page inside a simulated
// screen and the camera travels a four-chapter path around the jar: spline or straight,
// eased per segment, damped, with safeframe's portrait FOV compensation. Under reduced
// motion the camera holds each chapter's pose.
import { type CameraPath, type CameraState, chapters, type Ease, sample } from "@quartifex/dolly";
import { useDolly } from "@quartifex/dolly/react";
import { pathPoints } from "@quartifex/dolly/three";
import { bucketFor } from "@quartifex/safeframe";
import { Line } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Screen, useDevice } from "@/components/demo/DeviceStage";
import {
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  Segmented,
  Slider,
  Toggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { Jar3D, Stage } from "@/scene/Jar3D";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./sequence.module.css";

const EASES = [
  { value: "linear", label: "Linear" },
  { value: "inOut", label: "In-out" },
  { value: "out", label: "Out" },
] as const;
const SPLINES = [
  { value: "catmullrom", label: "Spline" },
  { value: "linear", label: "Straight" },
] as const;

function makePath(spline: "catmullrom" | "linear", segmentEase: Ease): CameraPath {
  return {
    version: 1,
    spline,
    keys: [
      {
        at: 0,
        position: [0, 1.4, 7],
        target: [0, 1, 0],
        fov: 32,
        chapter: "Front",
        ease: segmentEase,
      },
      {
        at: 0.35,
        position: [5, 2.4, 3],
        target: [0, 1, 0],
        fov: 32,
        chapter: "Orbit",
        ease: segmentEase,
      },
      {
        at: 0.7,
        position: [1.5, 4.5, -3.5],
        target: [0, 1.2, 0],
        fov: 40,
        chapter: "Top",
        ease: segmentEase,
      },
      { at: 1, position: [-1.6, 1.3, 2.2], target: [0, 1.4, 0], fov: 28, chapter: "Close" },
    ],
  };
}

function Rig({
  path,
  progress,
  damping,
  reduced,
  compensate,
  bucket,
  onState,
}: {
  path: CameraPath;
  progress: () => number;
  damping: number;
  reduced: boolean;
  compensate: boolean;
  bucket: string;
  onState: (s: CameraState) => void;
}) {
  const state = useDolly(path, progress, { damping, reducedMotion: reduced, compensate, bucket });
  const report = useRef(onState);
  report.current = onState;
  useEffect(() => {
    const id = window.setInterval(() => report.current(state.current), 150);
    return () => window.clearInterval(id);
  }, [state]);
  return null;
}

export default function Demo() {
  const { device, controls } = useDevice("laptop", 2);
  const [spline, setSpline] = useState<"catmullrom" | "linear">("catmullrom");
  const [segmentEase, setSegmentEase] = useState<"linear" | "inOut" | "out">("inOut");
  const [damping, setDamping] = useState(4);
  const [compensate, setCompensate] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [reduced, setReduced] = useReducedMotion();
  const [camera, setCamera] = useState<CameraState | null>(null);
  const [position, setPosition] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const progress = useRef(0);

  const path = useMemo(() => makePath(spline, segmentEase), [spline, segmentEase]);
  const [previewScale, setPreviewScale] = useState(1);
  const [windowDpr, setWindowDpr] = useState(1);
  useEffect(() => setWindowDpr(window.devicePixelRatio || 1), []);
  const points = useMemo(() => pathPoints((p) => sample(path, p), 96), [path]);
  const bucket = bucketFor(device);

  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const onScroll = () => {
      progress.current = box.scrollTop / Math.max(box.scrollHeight - box.clientHeight, 1);
      setPosition(progress.current);
    };
    box.addEventListener("scroll", onScroll, { passive: true });
    return () => box.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (p: number) => {
    const box = scroller.current;
    if (!box) return;
    box.scrollTo({ top: p * (box.scrollHeight - box.clientHeight), behavior: "instant" });
  };

  return (
    <div className={shared.demo} data-demo="dolly">
      <div className={layouts.stack}>
        <Screen
          device={device}
          maxHeight={560}
          onScale={setPreviewScale}
          label="A camera travelling around a jar as the page scrolls"
        >
          <div className={styles.stage}>
            <Canvas
              resize={{ offsetSize: true }}
              gl={{ preserveDrawingBuffer: true }}
              // Draw only the pixels the scaled preview shows (contactsheet flagged the full
              // device resolution rendered into a small preview).
              dpr={Math.min(device.dpr, previewScale * windowDpr)}
              camera={{ fov: 32, position: [0, 1.4, 7] }}
              data-testid="dolly-canvas"
              aria-hidden="true"
            >
              <Stage />
              <Jar3D />
              {showPath && (
                <Line
                  points={points}
                  color="#edeae4"
                  lineWidth={1}
                  dashed
                  dashSize={0.15}
                  gapSize={0.1}
                />
              )}
              <Rig
                path={path}
                progress={() => progress.current}
                damping={damping}
                reduced={reduced}
                compensate={compensate}
                bucket={bucket}
                onState={setCamera}
              />
            </Canvas>
            <div className={styles.overlayScroller} ref={scroller} data-testid="dolly-scroller">
              {chapters(path).map((c) => (
                <section key={c.name} className={styles.overlayChapter} data-chapter={c.name}>
                  <span>{c.name}</span>
                </section>
              ))}
            </div>
          </div>
        </Screen>
        <div className={layouts.controlGrid}>
          <Controls label="Rig">
            <Slider
              label="Scroll"
              value={position}
              min={0}
              max={1}
              step={0.01}
              onChange={scrollTo}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <fieldset className={styles.chapterButtons}>
              <legend className="visually-hidden">Jump to a chapter</legend>
              {chapters(path).map((c) => (
                <button key={c.name} type="button" onClick={() => scrollTo(c.at)}>
                  {c.name}
                </button>
              ))}
            </fieldset>
          </Controls>
          <Controls label="Path">
            <Segmented legend="Path" value={spline} choices={SPLINES} onChange={setSpline} />
            <Segmented
              legend="Segment ease"
              value={segmentEase}
              choices={EASES}
              onChange={setSegmentEase}
            />
            <Slider
              label="Damping"
              value={damping}
              min={0}
              max={10}
              step={0.5}
              onChange={setDamping}
            />
            <Toggle
              label="Portrait FOV compensation"
              checked={compensate}
              onChange={setCompensate}
            />
            <Toggle label="Show path" checked={showPath} onChange={setShowPath} />
            <ReducedMotionToggle value={reduced} onChange={setReduced} />
          </Controls>
          <Controls label="Screen">{controls}</Controls>
          {camera && (
            <Readout
              label="Camera"
              rows={[
                ["Chapter", camera.chapter ?? "", "dl-chapter"],
                ["Segment", camera.segment + 1, "dl-segment"],
                ["Position", camera.position.map((n) => n.toFixed(2)).join(", "), "dl-position"],
                ["FOV", `${camera.fov.toFixed(1)}°`, "dl-fov"],
                ["Bucket", bucket],
              ]}
            />
          )}
          <Note>
            {reduced
              ? "Reduced motion is on: the camera holds each chapter's pose and jumps between them; nothing glides."
              : "Scroll inside the screen, drag the slider or jump to a chapter. Damping smooths the camera towards the scroll position."}
          </Note>
        </div>
      </div>
      <Code>{JSON.stringify(path, null, 2)}</Code>
    </div>
  );
}
