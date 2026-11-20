"use client";

import { PieceShell } from "@/pieces/PieceShell";

// The textures are raster, so they are served from outside the repo once deployed.
const ASSETS = process.env.NEXT_PUBLIC_PRITHVI_ASSETS ?? "/pieces/prithvi";

export function PrithviPiece() {
  return (
    <PieceShell
      title="Prithvi"
      premise="The Earth, with a sea you can move. Take it down and the land bridges of the ice age come back, green where the coast was green. Bring it up and the coasts go under. Drag to turn it, scroll to come closer; or use the arrow keys and + and −."
      canvasLabel="The Earth from space, with coastlines, ice, plant cover and cloud that change as the sea level is moved"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet, or its map data could not be loaded. It works in current Chrome, Edge and Safari."
      note="Illustrative. The elevation and the imagery are real; the ice, plant cover and weather are simple models, not a climate simulation. Elevation: Terrain Tiles on AWS (Mapzen; SRTM, GMTED2010, ETOPO1 and others). Imagery: NASA Earth Observatory, Blue Marble and Black Marble."
      create={(canvas, options) =>
        import("@/pieces/prithvi/engine").then((engine) =>
          engine.createPrithvi(canvas, { ...options, assets: ASSETS }),
        )
      }
    />
  );
}
