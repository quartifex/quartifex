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
import { budgetPixelRatio } from "@/components/demo/pixels";
import { SEQUENCE_URL, useSequence } from "@/scene/sequence";
import shared from "./demos.module.css";
import layouts from "./layouts.module.css";
import styles from "./viewfinder.module.css";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

const CHAPTERS = [
  { id: "before", name: "Before", hint: "page" },
  { id: "sequence", name: "Sequence", hint: "pinned, 72 frames" },
  { id: "after", name: "After", hint: "page" },
] as const;

export default function Demo() {
  const data = useSequence();
  const [current, setCurrent] = useState<string>("before");

  // Mark the chapter in view, so the list beside the scene says where you are.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id.replace("vf-", ""));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    for (const c of CHAPTERS) {
      const el = document.getElementById(`vf-${c.id}`);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
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
    const el = canvas.current;
    const reel: Reel = createReel(el, manifest, {
      baseUrl: SEQUENCE_URL,
      reducedMotion: reduced,
      // Keep the canvas within contactsheet's 8.3 MP budget on very wide, dense windows
      // (a 32:9 window at 2x). Set when the scene is built.
      environment: {
        dpr: Math.min(
          window.devicePixelRatio || 1,
          budgetPixelRatio(el.clientWidth, el.clientHeight),
        ),
      },
    });
    const trigger = scrubReel(reel, ScrollTrigger, {
      id: "jar sequence",
      trigger: section.current,
      start: "top top",
      end: "bottom bottom",
    });
    const vf = createViewfinder({
      sources: [gsapSource(ScrollTrigger), reelSource(reel, "jar")],
      open: false,
    });
    viewfinder.current = vf;
    setOpen(false);
    // The overlay opens itself as the scene reaches the upper part of the window, so on
    // arrival it does not cover the page's own header and links.
    const film = section.current.parentElement;
    const arrive = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        vf.toggle(true);
        setOpen(true);
        arrive.disconnect();
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    if (film) arrive.observe(film);
    return () => {
      arrive.disconnect();
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
      <div className={layouts.toolbar}>
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
      </div>

      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Chapters in this scene">
          <p className={shared.panelTitle}>Chapters</p>
          <ol className={styles.chapters}>
            {CHAPTERS.map((c) => (
              <li key={c.id}>
                <a href={`#vf-${c.id}`} aria-current={current === c.id ? "step" : undefined}>
                  <span>{c.name}</span>
                  <span className={styles.hint}>{c.hint}</span>
                </a>
              </li>
            ))}
          </ol>
          <Readout
            label="Recorded path"
            rows={[
              ["Samples", path?.samples.length ?? 0, "vf-samples"],
              ["Length", path ? `${((path.samples.at(-1)?.t ?? 0) / 1000).toFixed(1)} s` : "none"],
            ]}
          />
          <Note>
            The viewfinder overlay sits in a Shadow DOM at the side of the window and reads this
            scene as you scroll: chapters, scene progress, the sequence frame and its buffer, frame
            times. Replay re-runs a recorded scroll exactly.
            {reduced ? " Reduced motion is on: the scene shows its poster and Replay is off." : ""}
          </Note>
        </nav>

        <div className={styles.film}>
          <section id="vf-before" className={styles.chapter} data-chapter="Before">
            <p className={styles.chapterKicker}>Chapter 1 · Before</p>
            <p className={styles.chapterTitle}>A launch page opens.</p>
            <p className={styles.chapterBody}>Scroll on: the pinned sequence starts below.</p>
          </section>
          <section
            id="vf-sequence"
            ref={section}
            className={styles.scene}
            data-chapter="Sequence"
            data-testid="vf-scene"
          >
            <div className={styles.sticky}>
              <canvas ref={canvas} role="img" aria-label="A jar turning (concept visual)" />
            </div>
          </section>
          <section id="vf-after" className={styles.chapter} data-chapter="After">
            <p className={styles.chapterKicker}>Chapter 3 · After</p>
            <p className={styles.chapterTitle}>The scene hands back to the page.</p>
            <p className={styles.chapterBody}>Scroll up to run it again, or record and replay.</p>
          </section>
        </div>
      </div>

      <Code>{`import { createViewfinder } from "@quartifex/viewfinder";
import { gsapSource } from "@quartifex/viewfinder/gsap";
import { reelSource } from "@quartifex/viewfinder/reel";

if (process.env.NODE_ENV !== "production") {
  createViewfinder({ sources: [gsapSource(ScrollTrigger), reelSource(reel, "hero")] });
}`}</Code>
    </div>
  );
}
