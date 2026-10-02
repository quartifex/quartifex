# @quartifex/anatomy

Exploded views for three.js and React Three Fiber. Every hardware launch page fakes the
exploded view by hand, keyframing each part. We derive it from the model instead: each part's
explosion vector comes from where it sits in the assembly (or from an override on the node),
parts separate in a staggered order as progress runs from 0 to 1, nested sub-assemblies stay
together, and labelled parts get annotations that appear once they are clear.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/anatomy three @react-three/fiber @react-three/drei
```

Name the parts and label the ones that matter (in Blender: custom properties `label`, and
optionally `explode` as `[x, y, z]`; they arrive as `userData`).

```tsx
import { Anatomy } from "@quartifex/anatomy/react";

<Canvas>
  <Anatomy progress={() => scrollProgress.current} mode="axis" distance={1.6} stagger={0.5}>
    <primitive object={gltf.scene} />
  </Anatomy>
</Canvas>;
```

Without React:

```ts
import { createExplosion } from "@quartifex/anatomy/three";

const explosion = createExplosion(model, { mode: "radial", distance: 1.2 });
explosion.set(0.5); // returns offsets and annotations
```

## API

| Export | Kind | Description |
| --- | --- | --- |
| `explode(parts, progress, options?)` | function | Offsets and annotations at a progress. Pure |
| `explosionVectors(parts, options?)` | function | Each part's full offset |
| `partProgress(progress, index, count, stagger?, ease?)` | function | One part's progress under stagger |
| `moveOrder(parts)`, `bounds(parts)` | functions | Outer levels first, outermost first; assembly centre and radius |
| `createExplosion(root, options?)` (`/three`) | function | Parts from an Object3D hierarchy (`levels` deep); `set(progress)`, `reset()` |
| `<Anatomy>` (`/react`) | component | Wraps a model; drei `Html` labels; `onAnnotations` for an accessible list |
| `Part`, `ExplodeOptions`, `Exploded` | types | |

**Options:** `mode` (`"radial"` from the centre, or `"axis"`, evenly spread along `axis`),
`axis` (default up), `distance` (times the assembly radius), `stagger` (0 together, 1 one after
another), `ease` (per part), `levels` (hierarchy depth that counts as parts).

## Reduced motion

anatomy moves parts only as far as the progress you give it. Under reduced motion, drive it in
steps (assembled, exploded) rather than continuously, as the Lab demo does. Labels carry the
information: mirror them in the page with `onAnnotations` so nothing depends on seeing the 3D or
the motion.

## Browser support

Wherever three.js runs. drei's `Html` places labels as DOM elements over the canvas.

## Size

Enforced in CI (brotli, unminified ESM): core under 2 kB, three binding under 1.5 kB, R3F
component under 1.5 kB. It uses `@quartifex/dolly`'s easing.

## Limitations

- Directions come from bounding-box centres: parts that share a centre (concentric rings) need
  `axis` mode or an `explode` override to separate.
- Parts move in straight lines; curved or rotating explosions are keyframe work.
- Labels show as plain text in the canvas; leader lines are not drawn.

## Acknowledgments

The `/react` component builds on [react-three-fiber](https://github.com/pmndrs/react-three-fiber) and [drei](https://github.com/pmndrs/drei) (its `Html` labels), both by [Poimandres (pmndrs)](https://github.com/pmndrs), optional peers. Thank you.

## Licence

MIT.
