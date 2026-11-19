"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function NiyamPiece() {
  return (
    <PieceShell
      title="Niyam"
      premise="Three short equations. Every thread obeys them exactly, and no two ever take the same path. Drag to turn it. Click for another law."
      canvasLabel="Hundreds of thousands of fine threads tracing a strange attractor in three dimensions"
      unsupported="This piece needs WebGL 2, which this browser has turned off."
      tone="dark"
      create={(canvas, options) =>
        import("@/pieces/niyam/engine").then((engine) => engine.createNiyam(canvas, options))
      }
    />
  );
}
