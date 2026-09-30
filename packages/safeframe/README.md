# @quartifex/safeframe

Art direction for scroll and 3D scenes on every screen. `object-fit` and `object-position`
handle one image; a launch scene is a pinned image sequence, a camera move and overlaid
copy together, and most of them are a desktop composition squeezed onto a phone. With
safeframe each scene declares its subject, its focal point and where copy may go, per aspect
bucket (tall phone, phone landscape, tablet, laptop, desktop, ultrawide). We then work out
the crop for image sequences, the camera for 3D, and the text zone that stays clear of the
subject, for any viewport.

**Support level:** flagship

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/safeframe
```

Declare the scene once. Boxes and points are normalised to the source art (0 to 1); text
zones are normalised to the viewport.

```ts
import { defineScene, createSafeframe, drawFrame } from "@quartifex/safeframe";

const scene = defineScene({
  width: 1600, // source frame size
  height: 900,
  focal: { x: 0.7, y: 0.52 },
  subject: { x: 0.61, y: 0.26, width: 0.18, height: 0.54 },
  textZones: [{ x: 0.06, y: 0.28, width: 0.4, height: 0.44 }],
  buckets: {
    "tall-phone": {
      textZones: [
        { x: 0.07, y: 0.035, width: 0.86, height: 0.2 },
        { x: 0.07, y: 0.8, width: 0.86, height: 0.17 },
      ],
    },
  },
});

const stage = document.querySelector<HTMLElement>(".scene")!;
const canvas = stage.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;

const safeframe = createSafeframe(stage, scene, {
  onFrame(frame) {
    const dpr = devicePixelRatio;
    canvas.width = frame.viewport.width * dpr;
    canvas.height = frame.viewport.height * dpr;
    drawFrame(ctx, currentSequenceFrame(), frame, dpr); // your image-sequence frame
  },
});
```

```css
/* The copy follows the text zone safeframe picked for this screen. */
.scene .copy {
  position: absolute;
  left: var(--sf-text-x);
  top: var(--sf-text-y);
  width: var(--sf-text-width);
  height: var(--sf-text-height);
}
```

3D (three.js or React Three Fiber): fit the camera to the subject's bounding box for the
current aspect.

```ts
import { Box3 } from "three";
import { applyCamera, fitCamera } from "@quartifex/safeframe";

const fit = fitCamera(new Box3().setFromObject(product), {
  aspect: width / height,
  fov: 35, // as designed for landscape
  padding: 0.1,
  direction: { x: 0.4, y: 0.25, z: 1 },
});
applyCamera(camera, fit);
```

React:

```tsx
import { useSafeframe } from "@quartifex/safeframe/react";

export function Scene() {
  const [ref, frame] = useSafeframe<HTMLDivElement>(scene);
  return <div ref={ref} className="scene">{frame?.bucket}</div>;
}
```

## API

| Export | Kind | Description |
| --- | --- | --- |
| `defineScene(scene)` | function | Validates a scene up front (values in range, boxes inside the frame, zoom at least 1) |
| `frame(scene, viewport, options?)` | function | Pure staging for a viewport: bucket, scale, source crop, destination, subject and focal point in viewport pixels, `subjectClipped`, the chosen text zone and its overlap with the subject |
| `createSafeframe(element, scene, options?)` | function | Stages inside an element and re-stages as it resizes (ResizeObserver, or a plumb instance). Writes `--sf-text-*`, `--sf-subject-*`, `--sf-focal-*`, `data-sf-bucket`, `data-sf-subject` |
| `drawFrame(ctx, image, frame, dpr?)` | function | Draw an image-sequence frame (image, bitmap, video frame, canvas) with the staged crop |
| `bucketFor(size, buckets?)`, `DEFAULT_BUCKETS` | function, data | Aspect buckets, tried in order; pass your own list to change the break points |
| `stagingFor(scene, bucket)` | function | A scene's defaults merged with one bucket's overrides |
| `fitCamera(bounds, options)` | function | Perspective camera position, target, field of view, near and far so a box fills the padded frame from any direction. Exact for boxes |
| `compensatedFov(fov, aspect, maxFov?)` | function | The vertical FOV that keeps the designed horizontal FOV on portrait screens |
| `sampleCamera(keys, progress)` | function | Interpolate per-bucket camera keyframes along scroll progress |
| `applyCamera(camera, fit)` | function | Apply a fit to a three.js `PerspectiveCamera` (duck-typed; no three.js dependency) |
| `overlapArea(a, b)` | function | Intersection area of two boxes |
| `useSafeframe(scene, options?)` (`/react`) | hook | `[ref, frame]` for an element |
| `Scene`, `Staging`, `Frame`, `Box`, `Point`, `Bucket`, `CameraFit`, `CameraKey`, `Bounds` | types | |

**Options** (`frame`, `createSafeframe`): `fit` is `"subject"` (default: zoom out, with bars
if needed, rather than cut the subject) or `"cover"` (always fill, and report the cut);
`buckets`; `viewport` (a `@quartifex/plumb` instance, for full-screen pinned scenes, so mobile
toolbars do not re-stage them); `onFrame`; `writeVars`.

## Reduced motion

safeframe computes layout; it does not animate. Camera keyframes are values you drive with
scroll: under `prefers-reduced-motion: reduce`, sample a single key (for example
`sampleCamera(keys, 0)`) or jump between keys instead of scrubbing. The demo on the Lab hub
turns its playback off under reduced motion and keeps every control stepwise.

## Browser support

Pure maths everywhere. `createSafeframe` needs `ResizeObserver` (all current browsers); without
it the element is staged once. `drawFrame` needs a 2D canvas context.

## Size

Enforced in CI by `size-limit` (brotli, unminified ESM as published): core (staging, camera,
element binding) under 5 kB, React adapter under 1 kB. It depends on `@quartifex/plumb` for types only.

## Limitations

- One subject box per scene and bucket. Scenes with two subjects that must both stay whole
  need a box around both, or separate scenes.
- The crop keeps the subject whole at the cost of bars when the art is narrower than the
  screen (for example 32:9 from 16:9 art). The fix is wider art for that bucket, which the
  scene can point to; we do not invent pixels.
- Text zones are candidates you design; safeframe picks the clearest one, it does not lay
  out the copy.
- `fitCamera` fits the bounding box, not the mesh silhouette, so round objects get a little
  more margin than the padding says.
- Adapters for `reel` (sequence player) and `dolly` (R3F camera rigs) arrive with those
  libraries; today `drawFrame` and `applyCamera` are the integration points.

## Licence

MIT.
