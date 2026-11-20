"use client";

import { PieceShell } from "@/pieces/PieceShell";

// The city files are served from outside the repo once deployed.
const ASSETS = process.env.NEXT_PUBLIC_SHAHAR_ASSETS ?? "/pieces/shahar";

export function ShaharPiece() {
  return (
    <PieceShell
      title="Shahar"
      premise="A real city in the real sun. The sun stands where it would on that day, at that hour, in that place, so the shadows are the ones you would walk through. Pick a city, a date and a time; at dusk the windows come on. Drag to move round, scroll to come closer."
      canvasLabel="A white model of a real city's buildings with long shadows from a low sun, turning to lit windows at night"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet, or its data could not be loaded. It works in current Chrome, Edge and Safari."
      note="Buildings, roads, parks and water: © OpenStreetMap contributors, Open Database License 1.0; our derived city files are offered under the same licence. Where a building has no height in OpenStreetMap (most of Delhi, Mumbai and London; few in New York), it is estimated from its floors or its kind. The sun's position follows NOAA's solar equations, in local standard time. Lit windows are an illustration."
      create={(canvas, options) =>
        import("@/pieces/shahar/engine").then((engine) =>
          engine.createShahar(canvas, { ...options, assets: ASSETS }),
        )
      }
    />
  );
}
