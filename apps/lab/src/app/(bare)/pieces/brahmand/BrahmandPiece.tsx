"use client";

import { type ChangeEvent, type DragEvent, useEffect, useRef, useState } from "react";
import type { BrahmandHandle, BrahmandState } from "@/pieces/brahmand/engine";
import styles from "./brahmand.module.css";

type Status = "loading" | "ready" | "unsupported";

export function BrahmandPiece() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<BrahmandHandle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [state, setState] = useState<BrahmandState>("photograph");
  const [points, setPoints] = useState(0);
  const [sound, setSound] = useState(false);
  const [own, setOwn] = useState(false);
  const [problem, setProblem] = useState(false);
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("@/pieces/brahmand/engine")
      .then(({ createBrahmand }) => createBrahmand(canvas, { reducedMotion, onState: setState }))
      .then((handle) => {
        if (cancelled) {
          handle.dispose();
          return;
        }
        handleRef.current = handle;
        setPoints(handle.points);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });
    return () => {
      cancelled = true;
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, []);

  async function load(file: File | undefined) {
    if (!file || !handleRef.current) return;
    const ok = await handleRef.current.setPhoto(file);
    setProblem(!ok);
    if (ok) setOwn(true);
  }

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    void load(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setDropping(false);
    void load(event.dataTransfer.files[0]);
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = event.clipboardData?.files[0];
      if (file) void load(file);
    }
    function onKey(event: KeyboardEvent) {
      if (event.target !== document.body) return;
      if (event.key === " " || event.key === "Enter") handleRef.current?.toggle();
    }
    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  });

  function toggleSound() {
    const next = !sound;
    setSound(next);
    handleRef.current?.setSound(next);
  }

  const note = problem
    ? "That file could not be read as an image."
    : own
      ? "Your photo stays in this browser; nothing is uploaded."
      : "Illustrative sample, painted in code. Your photo stays in this browser; nothing is uploaded.";

  return (
    <main
      className={styles.page}
      onDragOver={(event) => {
        event.preventDefault();
        setDropping(true);
      }}
      onDragLeave={() => setDropping(false)}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        aria-label="A photograph that comes apart into a nebula and a field of stars made from its own colours"
      />
      <div className={styles.shade} aria-hidden="true" />

      <header className={styles.top}>
        <p className={styles.mono}>Quartifex Lab · Personal Concept</p>
        <p className={`${styles.mono} ${styles.right}`}>
          Points <b>{points ? points.toLocaleString("en-US") : "…"}</b>
          <br />
          <span aria-live="polite">{state === "universe" ? "Universe" : "Photograph"}</span>
        </p>
      </header>

      <footer className={styles.bottom}>
        <div>
          <h1 className={styles.title}>Brahmānd</h1>
          <p className={styles.premise}>
            Every photograph is a universe if you step to one side of it. Click to let it go. Drag
            to turn it, scroll to travel in, and move the pointer to part the gas. Click again to
            bring it home.
          </p>
          <p className={`${styles.mono} ${styles.note}`} role={problem ? "alert" : undefined}>
            {note}
          </p>
        </div>
        <div className={styles.actions}>
          <label className={`${styles.mono} ${styles.button} ${styles.primary}`}>
            Choose a photo
            <input type="file" accept="image/*" onChange={onPick} disabled={status !== "ready"} />
          </label>
          <button
            type="button"
            className={`${styles.mono} ${styles.button}`}
            aria-pressed={sound}
            onClick={toggleSound}
            disabled={status !== "ready"}
          >
            {sound ? "Sound on" : "Sound off"}
          </button>
        </div>
      </footer>

      {dropping && (
        <div className={styles.drop}>
          <p className={styles.mono}>Drop the photo anywhere</p>
        </div>
      )}
      {status === "unsupported" && (
        <div className={styles.message}>
          <p>
            This piece runs on WebGPU, which this browser does not offer yet. It works in current
            Chrome, Edge and Safari.
          </p>
        </div>
      )}
    </main>
  );
}
