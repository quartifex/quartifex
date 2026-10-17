# Models, textures, environment and sound: provenance

AVENUE's 3D car is **original work**, modelled in code for this site by Quartifex
(`src/three/shape.ts`), built into `avenue-car.glb` and `avenue-car-lite.glb` at build time by
`scripts/car.mjs` and optimised by `@quartifex/freight`. It is an invented, unbadged four-seat
luxury EV: no third-party model, no real marque, no logos to strip. The GLBs are generated, so
they are not committed.

| Asset | Source | Licence |
| --- | --- | --- |
| Car body, glasshouse, wheels, cabin, screens | Code-built, `src/three/shape.ts` | MIT, with the rest of this repository |
| Environment (reflections) | Light strips rendered into an environment map at run time (`src/stage/Scene.tsx`) | MIT |
| Textures | None downloaded: screen contents are drawn live from the demo's state | MIT |
| Interface sounds | Synthesised with the Web Audio API (`src/demo/sound.ts`) | MIT |
| Image-sequence fallback and poster | Drawn from the same geometry (`src/stage/poster.ts`), encoded by `@quartifex/rushes` | MIT |

## Candidates considered

| Candidate | Licence | Why not |
| --- | --- | --- |
| Car Concept, Khronos glTF Sample Assets (Darmstadt Graphics Group, Eric Chadwick; from a CC0 Sketchfab model by Unity Fan) | CC-BY 4.0 (Khronos logos excluded) | Its silhouette closely follows a current production roadster (trade-dress risk on a commercial page), it carries Khronos marks to strip, and it is a 2+2, not a four-seat lounge cabin |
| "Future Car" by dennish2010, Sketchfab | CC-BY 4.0 | Downloads need a Sketchfab account token, unavailable to this build; not inspected for marque cues |
| Car Kit, Kenney | CC0 | Clean, but a low-poly toy style below the page's bar |
