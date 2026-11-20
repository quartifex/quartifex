"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function SangamPiece() {
  return (
    <PieceShell
      title="Sangam"
      premise="Two galaxies fall together. Nothing here is drawn: a million stars simply keep orbiting, and gravity pulls them into tails, bridges and shells. Drag to move round, scroll to come closer; change the encounter and watch it again."
      canvasLabel="Two spiral galaxies passing through each other, throwing out long curved tails of stars"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note="Illustrative. Stars orbit two moving galaxy cores, as in Toomre and Toomre's 1972 models, rather than pulling on each other; the presets are set up to look like the Antennae, the Mice and our own galaxy's meeting with Andromeda, not fitted to them. The glow where stars form is an illustration."
      create={(canvas, options) =>
        import("@/pieces/sangam/engine").then((engine) => engine.createSangam(canvas, options))
      }
    />
  );
}
