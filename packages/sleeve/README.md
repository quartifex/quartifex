# @quartifex/sleeve

Labels for jars, bottles and cans in three.js and React Three Fiber. Every packaging launch
we build needs a label wrapped around a vessel, and every time it gets rebuilt by hand: UVs
that stretch on a tapered jar, a seam in the wrong place, gloss that z-fights the print.
sleeve does it once. You describe the band the label sits on (straight or tapered), how much
of the circumference it covers and where the seam goes; it builds the geometry with UVs that
follow the flat die-cut, so art laid out on the real die-line lands undistorted. It also gives
you that die-line as SVG for the printer, places decals by angle and height, and stacks
layers with gloss, satin, matte, foil and spot-varnish finishes.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add @quartifex/sleeve three @react-three/fiber
```

```tsx
import { Sleeve } from "@quartifex/sleeve/react";

const band = { radius: 0.6, radiusTop: 0.5, height: 0.9, y: 0.25 }; // narrows upwards

<Canvas>
  <group>
    <JarBody />
    <Sleeve
      band={band}
      coverage={360}
      seam={180}
      layers={[
        { map: printTexture, finish: "satin" },
        { mask: wordmarkMask, finish: "varnish" },
      ]}
      decals={[{ at: 38, y: 0.95, width: 0.26, height: 0.26, layers: [{ map: sticker, mask: round, finish: "foil" }] }]}
    />
  </group>
</Canvas>;
```

Give the designer the die-line and the aspect to work at:

```ts
import { dielineSvg, labelAspect } from "@quartifex/sleeve";

const svg = dielineSvg({ radius: 60, radiusTop: 50, height: 90 }, { coverage: 360 }, { unit: "mm" });
const aspect = labelAspect({ radius: 60, radiusTop: 50, height: 90 }); // width / height of the art
```

Without React: `createSleeve(band, { layers })` from `@quartifex/sleeve/three` returns a
`Group`; `createSleeveGeometry(band, options)` returns just the `BufferGeometry`.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `sleeveGeometry(band, options?)` | function | Positions, normals, UVs and indices as typed arrays, plus the art's aspect. Framework-neutral |
| `labelAspect(band, options?)` | function | Width over height of the art to author |
| `dieline(band, options?)` | function | The flat label: `"rectangle"` or `"sector"`, size, slant, radii, angle and the SVG path |
| `dielineSvg(band, options?, { unit, stroke })` | function | The die-line as a standalone SVG document |
| `dielinePoint(band, options, t, s)` | function | Where a point of the label lands on the die-line (for placing art or marks) |
| `decalPatch(band, decal)` | function | The band and options for a sticker at an angle and height |
| `radiusAt(band, y)` | function | The band's radius at a height |
| `FINISHES` | object | Gloss, satin, matte, foil and varnish material values |
| `createSleeve(band, { layers, decals, ...options })` (`/three`) | function | A `Group`, one `MeshPhysicalMaterial` mesh per layer, decals above |
| `createSleeveGeometry`, `createLayerMaterial`, `disposeSleeve` (`/three`) | functions | The parts, and clean-up (your textures are left alone) |
| `<Sleeve band ...>` (`/react`) | component | The same, rebuilt when the band or a shape option changes |
| `Band`, `SleeveOptions`, `Decal`, `Dieline`, `SleeveLayer`, `Finish` | types | |

**Band:** `radius` (bottom edge), `radiusTop` (default: straight), `height`, `y` (bottom edge
on the vessel). Any unit, used consistently.

**Options:** `coverage` (degrees, default 360; above 360 the ends overlap, the outer end one
`thickness` higher), `seam` (degrees around Y, 0 facing +Z, default 180: the back; the label is
centred opposite), `mapping` (`"developed"` default, or `"stretch"`), `radialSegments`,
`heightSegments`, `lift` (gap off the vessel, fraction of the radius, default 0.002),
`thickness`, `layer` (stacking index).

**Layers:** `map` (the print), `mask` (where the layer exists: die-cut shapes, spot varnish,
foil areas), `color`, `finish` (a preset or your own values). `varnish` adds only reflections
(black, additive), so it sits on a print without hiding it.

### Developed or stretch

On a straight cylinder the two are the same. On a taper, a flat label cannot be a rectangle:
it is a sector of an annulus. `"developed"` maps UVs onto that sector, so the 3D matches what
prints (the unit tests check that UV distances stay proportional to surface distances).
`"stretch"` maps a plain rectangle around the band, which looks tidy but squeezes the art
toward the narrow end: no printed label can do that. Use it only for quick mock-ups.

## Reduced motion

sleeve draws a static label; it never animates anything. If you spin the product (the Lab demo
does), make the spin opt-in and stop it under `prefers-reduced-motion`, as the demo does, and
show the flat label beside the 3D so nothing depends on seeing it turn.

## Browser support

Wherever three.js runs (WebGL 2). Physical materials need a scene environment for gloss, foil
and varnish to read; the demo builds three's `RoomEnvironment` locally.

## Size

Enforced in CI (brotli, unminified ESM): core under 3.5 kB, three binding under 1.5 kB, R3F
component under 1 kB.

## Limitations

- Bands are straight-sided (cylinders and cones). Curved shoulders and waisted bottles need a
  shrink-sleeve simulation, which this is not.
- The die-line has no bleed or safe-area guides; add those in your artwork tool.
- Decals follow the band's surface but are mapped as their own small die-cut; very large decals
  on a strong taper are slightly curved, as real ones are.
- Overlap past 360 degrees is a single step of stock thickness; it does not model glue or a
  visible lap edge.

## Acknowledgments

The `/react` component builds on [react-three-fiber](https://github.com/pmndrs/react-three-fiber) by [Poimandres (pmndrs)](https://github.com/pmndrs), an optional peer. Thank you.

## Licence

MIT.
