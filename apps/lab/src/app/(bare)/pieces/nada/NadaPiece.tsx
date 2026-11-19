"use client";

import { PieceShell } from "@/pieces/PieceShell";

export function NadaPiece() {
  return (
    <PieceShell
      title="Nāda"
      premise="A quarter of a million grains of sand on a plate. Move, and the note changes. Click, and it turns over. Hold still, and the sand finds where the silence is."
      canvasLabel="Sand grains on a vibrating plate, settling into geometric figures"
      unsupported="This piece needs WebGL 2, which this browser has turned off."
      tone="dark"
      create={(canvas, options) =>
        import("@/pieces/nada/engine").then((engine) => engine.createNada(canvas, options))
      }
    />
  );
}
