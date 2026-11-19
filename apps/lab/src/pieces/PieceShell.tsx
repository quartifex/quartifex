"use client";

import { type DragEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { ControlPanel } from "./ControlPanel";
import styles from "./piece.module.css";
import type { PieceHandle, PieceOptions } from "./types";

type DropHandlers = {
  onDragOver?(event: DragEvent<HTMLElement>): void;
  onDragLeave?(event: DragEvent<HTMLElement>): void;
  onDrop?(event: DragEvent<HTMLElement>): void;
};

type Props<H extends PieceHandle> = {
  title: string;
  premise: string;
  /** What the canvas shows, for someone who cannot see it. */
  canvasLabel: string;
  /** Shown in place of the piece where the browser cannot run it. */
  unsupported: string;
  tone?: "dark" | "light";
  note?: ReactNode;
  /** Extra buttons beside the sound button. */
  actions?: ReactNode;
  drop?: DropHandlers;
  create(canvas: HTMLCanvasElement, options: PieceOptions): H | Promise<H>;
  /** Called with the running piece, and with null when it stops. */
  onHandle?(handle: H | null): void;
  children?: ReactNode;
};

type Status = "loading" | "ready" | "unsupported";

/** The frame every Lab piece sits in: canvas, label, readout, title, premise, sound and controls. */
export function PieceShell<H extends PieceHandle>({
  title,
  premise,
  canvasLabel,
  unsupported,
  tone = "dark",
  note,
  actions,
  drop,
  create,
  onHandle,
  children,
}: Props<H>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const createRef = useRef(create);
  const onHandleRef = useRef(onHandle);
  const [handle, setHandle] = useState<H | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [readout, setReadout] = useState("");
  const [sound, setSound] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let running: H | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    Promise.resolve()
      .then(() => createRef.current(canvas, { reducedMotion, onReadout: setReadout }))
      .then((made) => {
        if (cancelled) {
          made.dispose();
          return;
        }
        running = made;
        setHandle(made);
        setStatus("ready");
        onHandleRef.current?.(made);
      })
      .catch(() => {
        if (!cancelled) setStatus("unsupported");
      });
    return () => {
      cancelled = true;
      running?.dispose();
      onHandleRef.current?.(null);
      setHandle(null);
    };
  }, []);

  function toggleSound() {
    const next = !sound;
    setSound(next);
    handle?.setSound(next);
  }

  const [first, ...rest] = readout.split("\n");

  return (
    <main className={styles.page} data-tone={tone} {...drop}>
      <canvas ref={canvasRef} className={styles.canvas} aria-label={canvasLabel} />
      <div className={styles.shade} aria-hidden="true" />

      <header className={styles.top}>
        <p className={styles.mono}>Quartifex Lab · Personal Concept</p>
        <p className={`${styles.mono} ${styles.readout}`} aria-live="polite">
          <b>{first}</b>
          {rest.length > 0 && <span>{rest.join("\n")}</span>}
        </p>
      </header>

      <footer className={styles.bottom}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.premise}>{premise}</p>
          {note && <p className={`${styles.mono} ${styles.note}`}>{note}</p>}
        </div>
        <div className={styles.actions}>
          {actions}
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

      {handle && handle.controls.length > 0 && (
        <ControlPanel
          title={title}
          controls={handle.controls}
          onChange={(key, value) => handle.set(key, value)}
        />
      )}
      {children}
      {status === "unsupported" && (
        <div className={styles.message}>
          <p>{unsupported}</p>
        </div>
      )}
    </main>
  );
}
