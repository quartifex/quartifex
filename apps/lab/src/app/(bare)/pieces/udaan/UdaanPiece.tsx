"use client";

import { PieceShell } from "@/pieces/PieceShell";

// The flight list and the Earth images are served from outside the repo once deployed.
const ASSETS = process.env.NEXT_PUBLIC_UDAAN_ASSETS ?? "/pieces/udaan";

export function UdaanPiece() {
  return (
    <PieceShell
      title="Udaan"
      premise="A day of the world's flights. Watch the morning rush leave Europe as it wakes, the Gulf hubs fire off long hauls at night, and India's sky fill and empty. Drag to turn the Earth, scroll to come closer."
      canvasLabel="The Earth at night and by day, with tens of thousands of small lights tracing the world's flight paths"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet, or its data could not be loaded. It works in current Chrome, Edge and Safari."
      note="Routes: OpenFlights route and airport databases as of June 2014 (Open Database License 1.0; our derived flight list is offered under the same licence). Departure times are spread through each airport's day in a typical pattern, not taken from timetables, and each airline on a route counts as one flight a day, about half of real traffic. Imagery: NASA Earth Observatory, Blue Marble and Black Marble."
      create={(canvas, options) =>
        import("@/pieces/udaan/engine").then((engine) =>
          engine.createUdaan(canvas, { ...options, assets: ASSETS }),
        )
      }
    />
  );
}
