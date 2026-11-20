"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { KrishnavivarHandle } from "@/pieces/krishnavivar/engine";
import { PieceShell } from "@/pieces/PieceShell";
import styles from "@/pieces/piece.module.css";

export function KrishnavivarPiece() {
  const handleRef = useRef<KrishnavivarHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [own, setOwn] = useState(false);
  const [problem, setProblem] = useState(false);
  const [dropping, setDropping] = useState(false);

  async function load(file: File | undefined) {
    if (!file || !handleRef.current) return;
    const ok = await handleRef.current.setPhoto(file);
    setProblem(!ok);
    if (ok) setOwn(true);
  }
  const loadRef = useRef(load);
  loadRef.current = load;

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    void load(event.target.files?.[0]);
    event.target.value = "";
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = event.clipboardData?.files[0];
      if (file) void loadRef.current(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  const base =
    "Illustrative, but worked out: light is traced along its real bent paths round a non-rotating black hole, and the disk's colours follow its temperature, its motion and gravity's redshift.";
  const note = problem
    ? "That file could not be read as an image."
    : own
      ? `${base} Your photo stays in this browser; nothing is uploaded.`
      : base;

  return (
    <PieceShell<KrishnavivarHandle>
      title="Kṛṣṇavivar"
      premise="A black hole bends the light behind it into rings, and lets you see the far side of its own disk over its top. Drag to move round it, scroll to come closer, or fall in. Put a photo behind it to watch it bend."
      canvasLabel="A black hole: a dark disc ringed by a bright, warped accretion disk, with the stars around it bent into arcs"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note={note}
      create={(canvas, options) =>
        import("@/pieces/krishnavivar/engine").then((engine) =>
          engine.createKrishnavivar(canvas, options),
        )
      }
      onHandle={(handle) => {
        handleRef.current = handle;
        setReady(handle !== null);
      }}
      drop={{
        onDragOver: (event) => {
          event.preventDefault();
          setDropping(true);
        },
        onDragLeave: () => setDropping(false),
        onDrop: (event) => {
          event.preventDefault();
          setDropping(false);
          void load(event.dataTransfer.files[0]);
        },
      }}
      actions={
        <label className={`${styles.mono} ${styles.button} ${styles.primary}`}>
          Put a photo behind it
          <input type="file" accept="image/*" onChange={onPick} disabled={!ready} />
        </label>
      }
    >
      {dropping && (
        <div className={styles.drop}>
          <p className={styles.mono}>Drop the photo anywhere</p>
        </div>
      )}
    </PieceShell>
  );
}
