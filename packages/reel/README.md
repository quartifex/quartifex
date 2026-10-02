# @quartifex/reel

The image-sequence scrub engine behind a scroll-driven launch. Point it at a rushes
manifest and a canvas, and drive it with scroll. We pick the tier with `resolve` (screen,
pixel ratio, GPU tier, connection), load AVIF where the browser decodes it and WebP where it
does not, buffer the frames around the current position (fewer on Save-Data and slow
connections), decode with `createImageBitmap` (optionally in a worker), and draw to a
DPR-aware canvas with cover or contain fit. Under reduced motion it shows the poster and
loads no frames at all.

**Support level:** flagship

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/reel
npx rushes renders/jar --out public/sequences/jar   # the frames and manifest
```

```html
<section id="scene" style="height: 400vh">
  <canvas style="position: sticky; top: 0; width: 100%; height: 100vh"
          role="img" aria-label="The jar turning"></canvas>
</section>
```

With GSAP ScrollTrigger (GSAP is an optional peer; pass in your ScrollTrigger):

```ts
import { createReel, loadManifest } from "@quartifex/reel";
import { scrubReel } from "@quartifex/reel/gsap";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
const manifest = await loadManifest("/sequences/jar/manifest.json");
const reel = createReel(document.querySelector("#scene canvas")!, manifest, {
  baseUrl: "/sequences/jar/",
  fit: "cover",
});
scrubReel(reel, ScrollTrigger, { trigger: "#scene", start: "top top", end: "bottom bottom" });
```

Without GSAP:

```ts
import { bindScroll } from "@quartifex/reel";

const stop = bindScroll(reel, document.querySelector("#scene")!);
```

React:

```tsx
import { useReel } from "@quartifex/reel/react";

const [canvasRef, reel] = useReel(manifest, { baseUrl: "/sequences/jar/" });
```

## API

| Export | Kind | Description |
| --- | --- | --- |
| `createReel(canvas, manifest, options)` | function | Start a reel. Returns `seek(progress)`, `progress`, `stats()`, `setTier`, `setReducedMotion`, `ready`, `destroy` |
| `loadManifest(url)` | function | Fetch and validate a rushes manifest |
| `bindScroll(reel, section, scroller?)` | function | Drive from native scroll (the section's pinned range). Corrects for CSS-scaled ancestors |
| `scrubReel(reel, ScrollTrigger, vars?)` (`/gsap`) | function | A ScrollTrigger that seeks the reel; your `vars` pass through |
| `useReel(manifest, options)` (`/react`) | hook | `[canvasRef, reel]` |
| `supportsAvif()` | function | Whether this browser decodes AVIF (checked once) |
| `planLoads`, `evictable`, `nearestLoaded`, `fitRect` | functions | The buffering and fit maths, pure |
| `ReelOptions`, `ReelStats`, `Reel`, `BufferOptions` | types | |

**Options:** `baseUrl` (required: the folder of `manifest.json`), `tier` (force one), `format`
(`"auto"`, `"avif"`, `"webp"`), `fit` (`"cover"` or `"contain"`), `gpuTier`, `environment`
(override what resolve sees), `buffer` (`ahead` 16, `behind` 6, `sparse` 8, `concurrency` 4),
`reducedMotion`, `decode` (`"main"` or `"worker"`), `urlFor` (path to URL, for frames held in
memory or signed CDN links), `onFrame`, `onLoad`.

## How it loads

- The current frame first, then outwards, more ahead than behind in the scroll direction,
  then every 8th frame across the sequence so a fast scrub always has something close.
- Frames far outside the window are closed and dropped, so memory stays bounded.
- Until the exact frame arrives, the nearest loaded one is drawn: no blank canvas.
- On Save-Data or a 2G connection the window shrinks (6 ahead, 2 behind, no sparse pass) and
  only two frames load at a time.
- If the canvas size changes enough to need another tier, frames reload around the current
  position at the new tier.

## Reduced motion

With `prefers-reduced-motion: reduce` (or `reducedMotion: true`), reel draws the poster from
the manifest and loads no frames; scrolling changes nothing. Make sure the poster tells the
story on its own, and keep the copy around the scene readable without the motion.

## Browser support

Current Chrome, Edge, Firefox and Safari. AVIF where supported, otherwise WebP.
`createImageBitmap` and `ResizeObserver` are required (all current browsers). The worker
decoder needs `Worker` and a CSP that allows `blob:` workers; it falls back to the main
decoder when `Worker` is missing.

## Size

Enforced in CI (brotli, unminified ESM): core under 5 kB, React adapter under 1 kB, GSAP
adapter under 0.5 kB. It brings in `@quartifex/resolve` (under 3 kB).

## Limitations

- Canvas 2D only. WebGL sequence playback with shader crossfades is `inbetween`'s job (P8).
- One sequence per reel; pages with several create several reels and should keep the total
  buffer in mind on phones.
- ScrollTrigger cannot see through CSS transforms on the scroller's ancestors; inside a
  scaled preview pass numeric `start` and `end` (as the Lab demo does).
- No adaptive bitrate mid-scrub: a tier switch happens on resize, not when the network
  slows down.

## Licence

MIT.
