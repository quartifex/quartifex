"use client";

// The jar scene at a given CSS size and pixel ratio: one sequence frame drawn to a
// canvas through safeframe's crop, with the overlay copy in the staged text zone.
import { drawFrame, type Frame } from "@quartifex/safeframe";
import { type ReactNode, useEffect, useMemo, useRef } from "react";
import { ART, drawArt } from "./art";
import styles from "./SceneView.module.css";
import { type StagingMode, stageJar, subjectAttribute } from "./scene";

let source: HTMLCanvasElement | null = null;
let sourceT = -1;

/** One shared 1600 x 900 frame buffer: the "image sequence" frame for progress `t`. */
function sequenceFrame(t: number): HTMLCanvasElement {
  if (!source) {
    source = document.createElement("canvas");
    source.width = ART.width;
    source.height = ART.height;
  }
  if (t !== sourceT) {
    const ctx = source.getContext("2d");
    if (ctx) drawArt(ctx, ART.width, ART.height, t);
    sourceT = t;
  }
  return source;
}

export type SceneViewProps = {
  width: number;
  height: number;
  dpr: number;
  mode: StagingMode;
  /** Position in the sequence, 0 to 1. */
  progress: number;
  /** Drawn over the scene, given the staging (guides, markers). */
  overlay?: (staged: Frame) => ReactNode;
  onFrame?: (staged: Frame) => void;
  /** Hide the copy, e.g. for a clean plate. */
  copy?: boolean;
  /** Render the call to action as a real button (the bare scene page); otherwise it is a mock. */
  interactive?: boolean;
};

export function SceneView({
  width,
  height,
  dpr,
  mode,
  progress,
  overlay,
  onFrame,
  copy = true,
  interactive = false,
}: SceneViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const staged = useMemo(() => stageJar(mode, { width, height }), [mode, width, height]);

  useEffect(() => {
    onFrame?.(staged);
  }, [staged, onFrame]);

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    // Snap to a real frame of the sequence, as an image-sequence player would.
    const t = Math.round(progress * (ART.frames - 1)) / (ART.frames - 1);
    drawFrame(ctx, sequenceFrame(t), staged, dpr);
  }, [staged, progress, dpr]);

  const text = staged.text;
  const naive = mode === "center";
  return (
    <div
      className={styles.scene}
      style={{ width, height }}
      data-sf-subject={subjectAttribute(staged)}
      data-sf-bucket={staged.bucket}
      data-sf-clipped={staged.subjectClipped ? "" : undefined}
      data-testid="scene"
    >
      <canvas
        ref={canvas}
        className={styles.canvas}
        width={Math.round(width * dpr)}
        height={Math.round(height * dpr)}
      />
      {copy && text && (
        <div
          className={styles.copy}
          data-sf-text=""
          style={{ left: text.x, top: text.y, width: text.width, height: text.height }}
        >
          <p className={styles.kicker}>Concept visual</p>
          <h2 className={styles.title}>A jar, staged for every screen.</h2>
          <p className={styles.body}>The subject stays whole and the copy stays clear.</p>
          {interactive ? (
            <button
              type="button"
              className={styles.cta}
              data-naive={naive || undefined}
              aria-label="See the specs"
            >
              {naive ? "›" : "See the specs"}
            </button>
          ) : (
            <span className={styles.cta} data-naive={naive || undefined} aria-hidden="true">
              {naive ? "›" : "See the specs"}
            </span>
          )}
        </div>
      )}
      {overlay?.(staged)}
    </div>
  );
}
