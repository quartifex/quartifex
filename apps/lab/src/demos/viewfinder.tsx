"use client";

// Hub demo for @quartifex/viewfinder, shown on /viewfinder. A real scroll scene on this page
// (a reel sequence pinned with GSAP ScrollTrigger), with the viewfinder overlay reading it:
// chapters, scene progress, the sequence's frame and buffer, frame times, markers, and
// record-and-replay of your scroll.
import { createReel, type Reel } from "@quartifex/reel";
import { scrubReel } from "@quartifex/reel/gsap";
import { createViewfinder, type ScrollPath, type Viewfinder } from "@quartifex/viewfinder";
import { gsapSource } from "@quartifex/viewfinder/gsap";
import { reelSource } from "@quartifex/viewfinder/reel";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Code,
  Controls,
  Note,
  Readout,
  ReducedMotionToggle,
  useReducedMotion,
} from "@/components/demo/kit";
import { SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import styles from "./viewfinder.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

export default function Demo() {
  const data = useSequence();
  const [reduced, setReduced] = useReducedMotion();
  const [open, setOpen] = useState(true);
  const [markers, setMarkers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [path, setPath] = useState<ScrollPath | null>(null);
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewfinder = useRef<Viewfinder | null>(null);
  const manifest = data?.manifest ?? null;

  useEffect(() => {
    if (!manifest || !section.current || !canvas.current) return;
    const reel: Reel = createReel(canvas.current, manifest, {
      baseUrl: SEQUENCE_URL,
      reducedMotion: reduced,
    });
    const trigger = scrubReel(reel, ScrollTrigger, {
      id: "jar sequence",
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
    });
    const vf = createViewfinder({
      sources: [gsapSource(ScrollTrigger), reelSource(reel, "jar")],
      open: true,
    });
    viewfinder.current = vf;
    setOpen(true);
    return () => {
      vf.destroy();
      viewfinder.current = null;
      trigger.kill();
      reel.destroy();
    };
  }, [manifest, reduced]);

  useEffect(() => {
    viewfinder.current?.showMarkers(markers);
  }, [markers]);

  const toggleRecording = () => {
    const vf = viewfinder.current;
    if (!vf) return;
    if (recording) setPath(vf.stop());
    else vf.record();
    setRecording(!recording);
  };

  return (
    <div className={shared.demo} data-demo="viewfinder">
      <Controls label="Viewfinder demo controls">
        <Button
          onClick={() => {
            viewfinder.current?.toggle();
            setOpen(viewfinder.current?.open ?? false);
          }}
          pressed={open}
        >
          {open ? "Hide viewfinder" : "Show viewfinder"} (Alt+V)
        </Button>
        <Button onClick={() => setMarkers((m) => !m)} pressed={markers}>
          Markers
        </Button>
        <Button onClick={toggleRecording} pressed={recording}>
          {recording ? "Stop recording" : "Record a scroll"}
        </Button>
        <Button onClick={() => void viewfinder.current?.replay()} disabled={!path || reduced}>
          Replay
        </Button>
        <ReducedMotionToggle value={reduced} onChange={setReduced} />
      </Controls>
      <Readout
        label="Recorded path"
        rows={[
          ["Samples", path?.samples.length ?? 0, "vf-samples"],
          ["Length", path ? `${((path.samples.at(-1)?.t ?? 0) / 1000).toFixed(1)} s` : "none"],
        ]}
      />
      <Note>
        The overlay sits in a Shadow DOM at the side of the window: open it, then scroll through the
        scene below. Replay re-runs a recorded scroll exactly, for comparing builds and for clean
        screen recordings.
        {reduced ? " Reduced motion is on: the scene shows its poster and Replay is off." : ""}
      </Note>

      <section className={styles.chapter} data-chapter="Before">
        <p>Scroll down into the scene.</p>
      </section>
      <section
        ref={section}
        className={styles.scene}
        data-chapter="Sequence"
        data-testid="vf-scene"
      >
        <div className={styles.sticky}>
          <canvas ref={canvas} role="img" aria-label="A jar turning (concept visual)" />
        </div>
      </section>
      <section className={styles.chapter} data-chapter="After">
        <p>The end of the scene.</p>
      </section>

      <Code>{`import { createViewfinder } from "@quartifex/viewfinder";
import { gsapSource } from "@quartifex/viewfinder/gsap";
import { reelSource } from "@quartifex/viewfinder/reel";

if (process.env.NODE_ENV !== "production") {
  createViewfinder({ sources: [gsapSource(ScrollTrigger), reelSource(reel, "hero")] });
}`}</Code>
    </div>
  );
}
