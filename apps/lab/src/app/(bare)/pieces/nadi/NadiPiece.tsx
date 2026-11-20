"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function NadiPiece() {
  return (
    <PieceShell
      title="Nadī"
      premise="Rain on new land. Nothing here is drawn: water runs downhill, fast water carries rock away and slow water lets it fall, and the valleys, canyons and deltas follow. Point to send rain to one place; hold Shift and drag to pour a river. Drag to move round, scroll to come closer."
      canvasLabel="A mountainous island being cut into valleys and river deltas by simulated rain"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note="Illustrative. Particle hydraulic erosion, after Hans Theobald Beyer (2015), with slope collapse, on a 512 × 512 grid: tens of thousands of raindrops a frame. The land is invented and time is not to scale."
      create={(canvas, options) =>
        import("@/pieces/nadi/engine").then((engine) => engine.createNadi(canvas, options))
      }
    />
  );
}
