# @quartifex/resolve

A resolution ladder as data. From the screen's CSS pixels, its pixel ratio, the GPU tier
and the connection, we pick the image-sequence tier, the canvas pixel ratio, the texture
size and the shadow-map size, and give the reason for each so it can be debugged. A 390 px
phone at DPR 3 stops downloading 2560 px frames; a 4K desktop on a weak GPU stops rendering
at 3x. detect-gpu tells you the tier; resolve turns tier, viewport, DPR and network into
concrete assets and settings.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/resolve
```

```ts
import { decide, explain, readEnvironment, targetFromManifest } from "@quartifex/resolve";
import { getGpuTier } from "@quartifex/resolve/gpu"; // optional, needs detect-gpu

const manifest = await (await fetch("/sequences/jar/manifest.json")).json();
const decision = decide(readEnvironment(await getGpuTier()), targetFromManifest(manifest, { fit: "contain" }));

// On a 390 x 844 phone at DPR 3 with a tier 2 GPU:
console.log(explain(decision));
// tier w960: contain into 390 x 844 CSS px draws 390 px wide, 780 device px at 2x; smallest tier that covers it: w960 (960 px)
// dpr 2: device pixel ratio 3; capped at 2 for GPU tier 2
// texture 1024: 1024 covers 780 device px
// shadow map 2048: 2048 for GPU tier 2
```

React:

```tsx
import { useResolve } from "@quartifex/resolve/react";

const decision = useResolve(target, { gpuTier }); // re-decides on resize and connection change
```

## The rules

Rules are plain JSON, so they can live in a config file and be reviewed like one. Override
any part with `defineRules`.

| Rule | Default | Meaning |
| --- | --- | --- |
| `maxDpr` | `[1, 1.5, 2, 3]` | Highest canvas pixel ratio for GPU tiers 0 to 3 |
| `tolerance` | `0.9` | A tier at 90% of the needed width is good enough |
| `network["slow-2g" \| "2g"]` | max tier 0, DPR 1 | |
| `network["3g"]` | one tier down, DPR 1.5 | |
| `saveData` | one tier down, DPR 1, textures and shadows halved | Save-Data header or `prefers-reduced-data` |
| `texture.sizes` / `maxByGpu` | 512 to 4096 / `[1024, 2048, 4096, 4096]` | Next power of two that covers the needed width, within the GPU's limit |
| `shadowMap` | `[0, 1024, 2048, 2048]` | Per GPU tier; 0 is off |

"Needed width" is the device pixels the sequence actually covers: for `cover`, a landscape
sequence on a portrait phone is drawn much wider than the screen, and resolve accounts for it.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `decide(environment, target, rules?)` | function | The decision: `tier`, `dpr`, `needed`, `texture`, `shadowMap`, `reasons`. Pure |
| `explain(decision)` | function | Every choice with its reasons, one line each |
| `readEnvironment(gpuTier?, window?)` | function | Viewport, DPR, `navigator.connection` and `prefers-reduced-data` |
| `targetFromManifest(manifest, { fit?, box? })` | function | Tiers and aspect from a rushes manifest |
| `defineRules(overrides)`, `DEFAULT_RULES` | function, data | The rules |
| `getGpuTier(options?)` (`/gpu`) | function | detect-gpu's tier, or `undefined` without it |
| `useResolve(target, { gpuTier?, rules? })` (`/react`) | hook | |
| `Environment`, `Target`, `Decision`, `Rules`, `GpuTier` | types | |

## Reduced motion

resolve chooses assets; it does not animate. Under reduced motion, `reel` shows the poster
and resolve's tier decides which poster size to use.

## Browser support

All current browsers. The Network Information API (`navigator.connection`) is Chromium-only;
elsewhere the connection is unknown and only screen, DPR and GPU tier count. detect-gpu needs
WebGL, and by default fetches its benchmark data from a CDN, so we only call it when you do.
An unknown GPU is treated as tier 2, and the reasons say so.

## Size

Enforced in CI (brotli, unminified ESM): core under 3 kB, React adapter under 1 kB, GPU helper
under 0.5 kB, not counting detect-gpu.

## Limitations

- GPU tier is detect-gpu's estimate; new or unusual GPUs can be misjudged. Pass your own tier
  when you know better.
- The connection reading is a hint the browser gives, not a measurement.
- One sequence per decision; for a page with several, decide per sequence.

## Acknowledgments

`/gpu` reads the GPU tier with [detect-gpu](https://github.com/pmndrs/detect-gpu) by [Poimandres (pmndrs)](https://github.com/pmndrs), an optional peer that fetches its benchmark data from a CDN. Thank you.

## Licence

MIT.
