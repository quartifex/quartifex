# @quartifex/dolly

A scroll camera rig for three.js and React Three Fiber. We describe the camera move as
JSON (keyframes with position, target and field of view, chapters, an ease per segment),
pass smoothly through every key on a centripetal Catmull-Rom spline, damp the camera
towards the scroll position frame-rate independently, and widen the field of view on
portrait screens instead of pulling the camera back. Camera moves made in Blender come in
through the bundled exporter. drei's ScrollControls is basic; Theatre.js is a full studio
and a heavy dependency. dolly is the part in between that launch pages need.

**Support level:** flagship

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/dolly three @react-three/fiber
```

```json
{
  "version": 1,
  "keys": [
    { "at": 0, "position": [0, 1.4, 7], "target": [0, 1, 0], "fov": 32, "chapter": "Front", "ease": "inOut" },
    { "at": 0.35, "position": [5, 2.4, 3], "target": [0, 1, 0], "chapter": "Orbit" },
    { "at": 1, "position": [-1.6, 1.3, 2.2], "target": [0, 1.4, 0], "fov": 28, "chapter": "Close" }
  ],
  "buckets": { "tall-phone": { "distance": 1.2 } }
}
```

```tsx
import { parsePath } from "@quartifex/dolly";
import { useDolly } from "@quartifex/dolly/react";
import path from "./camera-path.json";

const cameraPath = parsePath(path);

function Rig({ progress }: { progress: { current: number } }) {
  useDolly(cameraPath, () => progress.current, { damping: 4 }); // inside <Canvas>
  return null;
}
```

Feed `progress` from anything: a ScrollTrigger (`onUpdate: (self) => (progress.current = self.progress)`),
`reel`'s section, a slider.

Without React:

```ts
import { createRig } from "@quartifex/dolly";
import { applyToCamera } from "@quartifex/dolly/three";

const rig = createRig(cameraPath);
renderer.setAnimationLoop((time) => {
  applyToCamera(camera, rig.update(scrollProgress, clock.getDelta(), width / height));
  renderer.render(scene, camera);
});
```

## From Blender

```sh
blender scene.blend --background --python node_modules/@quartifex/dolly/exporters/blender/dolly_export.py -- camera-path.json --step 10
```

The active camera is sampled every `--step` frames; timeline markers become chapters; Z-up
becomes Y-up; the field of view comes from the lens and sensor; the target sits along the view
axis at the depth-of-field focus distance (or 5 units).

## API

| Export | Kind | Description |
| --- | --- | --- |
| `parsePath(json)` | function | Validate a camera path |
| `sample(path, progress, bucket?)` | function | The camera at a progress, undamped: position, target, fov, chapter, segment |
| `createRig(path, options?)` | function | A damped rig: `update(progress, dt, aspect, bucket?)`, `snap`, `state`, `setReducedMotion` |
| `chapters(path)` | function | Chapters and where they start |
| `ease`, `catmullRom`, `damp` | functions | The maths |
| `applyToCamera(camera, state)`, `pathPoints(sampleAt, n?)` (`/three`) | functions | Apply to a PerspectiveCamera; points to draw the path |
| `useDolly(path, progress, options?)` (`/react`) | hook | Drive the R3F camera |
| `CameraPath`, `Key`, `CameraState`, `Ease` | types | |

**Keys:** `at` (0 to 1, in order), `position`, `target`, `fov` (vertical degrees, designed for
landscape), `ease` (of the segment starting here: `linear`, `in`, `out`, `inOut` or a cubic
Bézier `[x1, y1, x2, y2]`), `chapter`. **Buckets** (safeframe names) can replace the keys or dolly
the camera back by a factor. **Rig options:** `damping` (default 4), `reducedMotion`, `compensate`
(portrait FOV compensation, default on).

## Reduced motion

Under `prefers-reduced-motion: reduce` the camera holds each chapter's key pose and switches
between them with no travel and no damping. Scroll still moves through the chapters; nothing
glides.

## Browser support

Wherever three.js runs (WebGL 2 or WebGPU). The core is plain maths and runs anywhere.

## Size

Enforced in CI (brotli, unminified ESM): core under 3.5 kB, three glue under 0.5 kB, R3F hook
under 1 kB. It uses `@quartifex/safeframe` for FOV compensation.

## Limitations

- Spline progress is per key, not arc-length: segments of very different lengths move at
  different speeds unless you place `at` values to match.
- One camera per rig; cuts between cameras are two rigs and your own switch.
- The Blender exporter samples the evaluated camera; it does not read F-curve handles, so use
  a small `--step` for fast moves.

## Acknowledgments

The `/react` adapter builds on [react-three-fiber](https://github.com/pmndrs/react-three-fiber) by [Poimandres (pmndrs)](https://github.com/pmndrs), an optional peer. Thank you.

## Licence

MIT.
