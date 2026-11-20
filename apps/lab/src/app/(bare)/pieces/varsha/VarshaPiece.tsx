"use client";

import { PieceShell } from "@/pieces/PieceShell";

// The climate data and the Earth image are served from outside the repo once deployed.
const ASSETS = process.env.NEXT_PUBLIC_VARSHA_ASSETS ?? "/pieces/varsha";

export function VarshaPiece() {
  return (
    <PieceShell
      title="Varsha"
      premise="A year of the monsoon. Watch the winds over the Arabian Sea turn round in June, the rain climb the Western Ghats and spread north to the Himalaya, and leave again by October for the south-east coast. Drag to turn the Earth, scroll to come closer."
      canvasLabel="South Asia from space through a year: wind streaks swing round with the seasons and rain cloud gathers over India during the monsoon"
      unsupported="This piece runs on WebGPU, which this browser does not offer yet, or its data could not be loaded. It works in current Chrome, Edge and Safari."
      note="Winds and rain are the real monthly averages for 1991–2020: near-surface wind from the NCEP/NCAR Reanalysis and rainfall from GPCP version 2.3, provided by NOAA PSL. A single year never looks this smooth. The cloud texture, the greening of the land and the weaker-or-stronger dial are illustrations built on those averages. Imagery: NASA Earth Observatory, Blue Marble."
      create={(canvas, options) =>
        import("@/pieces/varsha/engine").then((engine) =>
          engine.createVarsha(canvas, { ...options, assets: ASSETS }),
        )
      }
    />
  );
}
