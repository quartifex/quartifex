"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function DhuanPiece() {
  return (
    <PieceShell
      title="Dhuān"
      premise="Smoke, or ink let fall into water, in a glass box. Each curl is solved, not drawn: heat lifts the smoke, weight sinks the ink, and both fold over themselves. Drag to stir; click to add a puff or a drop. Shift-drag or right-drag to turn the box, scroll to come closer."
      canvasLabel="Smoke or ink curling in a glass box, simulated as a three-dimensional fluid"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note="Illustrative. Stable fluids (Stam 1999) with vorticity confinement (Fedkiw, Stam and Jensen 2001) on a 128 × 128 × 128 grid, drawn by ray marching."
      create={(canvas, options) =>
        import("@/pieces/dhuan/engine").then((engine) => engine.createDhuan(canvas, options))
      }
    />
  );
}
