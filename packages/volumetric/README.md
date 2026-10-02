# @quartifex/volumetric

Light shafts through a translucent medium: sun through trees, beams through water, a soft
sweep across a product. It is the lighting signature we keep coming back to, so we built it
once. There are two variants under one settings API, and they degrade together:

- **WebGL** (`/three`, `/r3f`): screen-space god-rays for three.js and React Three Fiber.
  An occlusion pass (the light, with your scene drawn black over it), a radial blur toward
  the light, then the shafts added over your scene, tinted by colour temperature. Dust motes
  sample the shafts, so they glow only inside the light.
- **Canvas** (`/overlay`, `/react`): soft shafts and lit dust drawn with Canvas 2D over
  anything without WebGL: a scrubbed image sequence, a static hero, a poster. Same settings,
  same look.

Quality follows the device: the GPU tier (through `@quartifex/resolve`) sets blur samples,
pass resolution, beams and dust, and `@quartifex/understudy`'s live quality steps it down
with the rest of the scene. When understudy hands off from WebGL to the image sequence,
`variantFor` moves the light to the canvas overlay. Under reduced motion the light holds one
fixed arrangement.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/volumetric three @react-three/fiber
```

In a React Three Fiber scene (it draws the final frame, so put it last):

```tsx
import { qualityFor } from "@quartifex/volumetric";
import { VolumetricLight } from "@quartifex/volumetric/r3f";

<Canvas>
  <Scene />
  <VolumetricLight
    sun={[-7, 24, -26]}
    settings={{ density: 0.65, scatter: 0.7, temperature: 4800, dust: 0.6 }}
    quality={qualityFor({ gpuTier })}
  />
</Canvas>;
```

Over an image sequence or a hero image:

```tsx
import { VolumetricOverlay } from "@quartifex/volumetric/react";

<div style={{ position: "relative" }}>
  <canvas ref={reelCanvas} />
  <VolumetricOverlay settings={{ density: 0.65, source: { x: 0.28, y: -0.12 } }} />
</div>;
```

Without React: `createVolumetric(renderer, options)` from `/three` (call `render(scene,
camera)` instead of `renderer.render`), or `createOverlay(canvas, options)` from `/overlay`.

## Settings (both variants)

| Setting | Range | Default | What it does |
| --- | --- | --- | --- |
| `density` | 0 to 1 | 0.6 | How much light the shafts carry |
| `scatter` | 0 to 1 | 0.7 | How far the shafts reach before fading (the medium's thickness) |
| `temperature` | 1500 to 12000 K | 5200 | Colour of the light, from candle to blue sky |
| `source` | frame fractions | `{ x: 0.18, y: -0.08 }` | Where the light is on screen (canvas, and WebGL without `sun`) |
| `dust` | 0 to 1 | 0.5 | Dust motes lit by the shafts |
| `drift` | 0 to 1 | 0.4 | A slow sway of the source and a breathing density; none under reduced motion |

## API

| Export | Kind | Description |
| --- | --- | --- |
| `resolveSettings(partial?)`, `DEFAULTS` | function, object | Defaults and clamping |
| `qualityFor({ gpuTier, quality, reducedMotion, saveData })` | function | Samples, pass resolution, beams, dust and whether anything moves |
| `variantFor(rung, webgl?)` | function | `"webgl"` on understudy's WebGL rung, `"canvas"` below it |
| `kelvinToRgb(k)`, `kelvinToCss(k, alpha?)` | functions | Black-body colour for a temperature |
| `lightAt(settings, seconds, reducedMotion?)` | function | The light's drifting source and density (fixed under reduced motion) |
| `dustField(count, seed?)`, `moteAt(mote, seconds, reducedMotion?)` | functions | Deterministic dust and its slow rise |
| `shaftLight(point, source, settings, beams)`, `beamAngles(count, source)` | functions | How lit a point is by the overlay's shafts |
| `createVolumetric(renderer, { settings, quality, sun, reducedMotion })` (`/three`) | function | The WebGL pass: `render`, `setSize`, `update`, `setQuality`, `setSun`, `dispose` |
| `<VolumetricLight>` (`/r3f`) | component | The WebGL pass inside an R3F Canvas; follows the R3F camera (dolly-driven or not) |
| `createOverlay(canvas, { settings, quality, reducedMotion })` (`/overlay`) | function | The canvas variant: `update`, `setQuality`, `draw`, `destroy` |
| `<VolumetricOverlay>` (`/react`) | component | The canvas variant as an absolutely positioned, screen-blended layer |
| `Settings`, `VolumetricQuality`, `Mote` | types | |

**Quality by GPU tier** (0, 1, 2, 3): blur samples 16, 24, 48, 72; pass resolution 25%, 33%,
50%, 50%; overlay beams 5, 7, 9, 11; dust 40, 90, 180, 320. understudy turning
post-processing off halves the samples (to at least 12) and caps the pass at 33%; its
particle fraction scales the dust, and Save-Data halves it.

## Reduced motion

Under `prefers-reduced-motion` (or `reducedMotion: true`), the source does not sway, the
density does not breathe and the dust does not rise or twinkle: the light holds one fixed,
resting arrangement, and the overlay draws a single frame instead of animating. Every
setting still changes the light. The light is decorative and carries no information; the
overlay canvas is hidden from assistive technology.

## Browser support

WebGL 2 for the WebGL pass (half-float targets where the GPU supports them, 8-bit
otherwise); Canvas 2D for the overlay, everywhere. The overlay animates only while it is on
screen.

## Size

Enforced in CI (brotli, unminified ESM): core under 3 kB, canvas overlay under 2.5 kB,
WebGL pass under 3.5 kB, R3F and React components under 1 kB each.

## Limitations

- Screen-space: the shafts come from what is on screen. A light far outside the frame fades
  out, and a light behind the camera casts no shafts.
- `<VolumetricLight>` draws the final frame itself (R3F's `useFrame` priority 1), so it does
  not stack with another component that does the same, such as an `EffectComposer`. With
  three.js directly, call its `render` where you would call `renderer.render`.
- The canvas overlay has no occlusion: it does not know where your sequence's objects are,
  so its shafts fan from the source over everything. Place the source where the footage's
  light is.
- One light per pass.

## Acknowledgments

The `/r3f` component builds on [react-three-fiber](https://github.com/pmndrs/react-three-fiber)
by [Poimandres (pmndrs)](https://github.com/pmndrs), an optional peer. The radial-blur shafts
follow the screen-space technique described in GPU Gems 3, chapter 13 ("Volumetric Light
Scattering as a Post-Process", Kenny Mitchell). Thank you.

## Licence

MIT.
