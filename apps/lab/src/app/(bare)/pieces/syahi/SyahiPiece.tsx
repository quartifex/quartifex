"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function SyahiPiece() {
  return (
    <PieceShell
      title="Syāhi"
      premise="Ink in still water. Click to let a drop fall. Stir it, and you can't take it back."
      canvasLabel="Drops of ink sinking and curling through still water"
      unsupported="This piece needs WebGL 2, which this browser has turned off."
      tone="light"
      create={(canvas, options) =>
        import("@/pieces/syahi/engine").then((engine) => engine.createSyahi(canvas, options))
      }
    />
  );
}
