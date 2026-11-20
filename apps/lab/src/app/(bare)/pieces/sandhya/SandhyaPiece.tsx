"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function SandhyaPiece() {
  return (
    <PieceShell
      title="Sandhyā"
      premise="Dusk at sea. Each starling only follows the few around it, and the whole flock turns as one. Move the pointer and a falcon goes where you point; tap, or press space, to send it in. Drag, or use the arrow keys, to look around."
      canvasLabel="A calm sea at sunset with a huge flock of starlings wheeling over it as a dark, shifting cloud"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet. It works in current Chrome, Edge and Safari."
      note="Illustrative. The waves follow a measured wind-sea spectrum for the wind you set; the flock is a simulation of birds steering by their neighbours, not a recording."
      create={(canvas, options) =>
        import("@/pieces/sandhya/engine").then((engine) => engine.createSandhya(canvas, options))
      }
    />
  );
}
