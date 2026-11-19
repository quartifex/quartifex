"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function ParvatPiece() {
  return (
    <PieceShell
      title="Parvat"
      premise="A mountain range that does not exist, drawn from millions of points. Steer with the pointer. Click to send light across it. It never ends."
      canvasLabel="A flight over an endless mountain range drawn entirely from points of light"
      unsupported="This piece needs WebGL 2, which this browser has turned off."
      tone="dark"
      create={(canvas, options) =>
        import("@/pieces/parvat/engine").then((engine) => engine.createParvat(canvas, options))
      }
    />
  );
}
