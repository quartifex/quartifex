"use client";

import { type ChangeEvent, useEffect, useRef, useState } from "react";
import type { BrahmandHandle } from "@/pieces/brahmand/engine";
import { PieceShell } from "@/pieces/PieceShell";
import styles from "@/pieces/piece.module.css";

export function BrahmandPiece() {
  const handleRef = useRef<BrahmandHandle | null>(null);
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
  }, []);

  const note = problem
    ? "That file could not be read as an image."
    : own
      ? "Your photo stays in this browser; nothing is uploaded."
      : "Illustrative sample, painted in code. Your photo stays in this browser; nothing is uploaded.";

  return (
    <PieceShell<BrahmandHandle>
      title="Brahmānd"
      premise="Every photograph is a universe if you step to one side of it. Click to let it go. Drag to turn it, scroll to travel in, and move the pointer to part the gas. Click again to bring it home."
      canvasLabel="A photograph that comes apart into a nebula and a field of stars made from its own colours"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note={note}
      create={(canvas, options) =>
        import("@/pieces/brahmand/engine").then((engine) => engine.createBrahmand(canvas, options))
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
          Choose a photo
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
