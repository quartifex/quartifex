# @quartifex/freight

A GLB ships with a weight ticket. freight is our opinionated preset on top of
[glTF-Transform](https://gltf-transform.dev): it dedupes, prunes and welds, caps and re-encodes
textures (WebP, AVIF or KTX2), compresses geometry with Meshopt or Draco, checks names, judges
the result against a budget (pass or fail, exit code 1 in CI), writes a Markdown report and
generates a typed React Three Fiber module for the model. We are honest about the overlap:
glTF-Transform does the work and gltfjsx already types models. freight is the settings we
use on every 3D build, the verdict, and the report, in one command.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/freight sharp meshoptimizer
```

```sh
npx freight jar.glb public/models/jar.glb --max 2048 \
  --budget budget.json --app site --report reports/site \
  --types src/models/Jar.tsx --url /models/jar.glb --component Jar
```

`budget.json` holds a `freight` block per app (or one at the top level):

```json
{ "apps": [{ "app": "site", "freight": { "bytes": 512000, "triangles": 50000, "drawCalls": 20, "maxTextureSize": 2048 } }] }
```

From code:

```ts
import { freightFile } from "@quartifex/freight/node";

const { verdict, markdown } = await freightFile("jar.glb", "out/jar.glb", {
  textures: { format: "ktx2", maxSize: 2048 },
  budget: { bytes: 512_000 },
});
```

In the browser (a drop zone, an editor): `freightBuffer(arrayBuffer, { meshopt })` from
`@quartifex/freight/browser`, with `import * as meshopt from "meshoptimizer"`.

## What the preset does, in order

1. **Names.** Nodes, meshes and materials must be named, unique per kind, start with a letter
   and use letters, digits, `-` and `_`. Exporter leftovers (`Cube.001`, `Material.003`,
   `Object_7`) are refused. `--fix-names` renames: a node takes its mesh's name, a mesh its
   node's, otherwise `part-n`, `shape-n`, `finish-n`. Names matter because they become the keys
   of the typed module and the parts other tools (anatomy, bespoke) address.
2. **Dedupe** identical accessors, meshes, textures and materials; **prune** what nothing uses
   (and solid-colour textures, which become material factors); **weld** identical vertices.
3. **Join** (opt-in, `join: true`): flatten and merge meshes that share a material. Fewer draw
   calls, but the parts are no longer separate: keep it off for exploded views and configurators.
4. **Textures.** Capped to `maxSize` (default 2048) and re-encoded (Node default WebP). Colour
   maps and data maps (normals, roughness, occlusion) are treated differently: WebP near-lossless
   and KTX2 UASTC with a linear transfer for data; ETC1S and sRGB for colour.
5. **Compression.** Meshopt by default (small, fast to decode, quantized); Draco when asked.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `freight(doc, options?)` | function | Run the preset on a glTF-Transform `Document`, in place. Before and after stats, steps, names, warnings |
| `inspect(doc, bytes?)` | function | Triangles (per drawn node), vertices, draw calls, materials, textures and their sizes |
| `verdict(stats, budget)` | function | Pass or fail per budget metric |
| `checkNames(doc, rules?)`, `cleanName(name, fallback)` | functions | The naming rules, and the repair they use |
| `report(result, verdict?, file?)` | function | Markdown |
| `r3fModule(doc, { url, component })` | function | A typed R3F module: node and material types, a component on drei's `useGLTF`, a preload |
| `freightFile(in, out, options?)` (`/node`) | function | Read, run, write; with `budget`, `report` (folder) and `types` |
| `readBudget(file, app?)`, `createIO()`, `sharpEncoder()`, `ktx2Encoder()`, `hasToktx()` (`/node`) | functions | The parts of the Node runner |
| `freightBuffer(glb, options?)`, `canvasEncoder` (`/browser`) | functions | The same in a browser, textures through a canvas |
| `freight` (bin) | CLI | `freight <in> <out>`; `--help` lists the flags |

**Options:** `compress` (`"meshopt"` default, `"draco"`, `"none"`), `textures` (`format`:
`webp`, `avif`, `ktx2`, `png`, `jpeg` or `keep`; `maxSize`; `quality`), `dedupe`, `prune`,
`weld` (default on), `join` (default off), `names` (`pattern`, `defaults`, `kinds`, `fix`).

**Budget metrics:** `bytes`, `triangles`, `drawCalls`, `materials`, `textureBytes`,
`maxTextureSize`.

### Codecs and what is optional

`sharp` (textures), `meshoptimizer` and `draco3dgltf` are optional peers: freight says in its
warnings what it skipped when one is missing. KTX2 needs KTX-Software's `toktx` on the PATH (or
`FREIGHT_TOKTX`); without it freight writes WebP and says so. The browser runner writes WebP,
PNG and JPEG only, and no Draco.

The typed module loads through drei's `useGLTF`, which decodes Meshopt locally and fetches its
Draco decoder from a CDN unless you configure a local path; self-host it for strict CSPs.

## Reduced motion

freight has no motion: it is a build step. The Lab demo's preview turns slowly and holds still
under `prefers-reduced-motion`; every number it shows is in the table beside it.

## Browser support

The core and `/browser` run in current Chrome, Edge, Firefox and Safari (canvas WebP encoding
needs Safari 17 or later; where a browser cannot write a format, the texture is kept and a
warning says so). `/node` and the CLI need Node 22.

## Size

Enforced in CI (brotli, unminified ESM, our code only; glTF-Transform is a dependency): core
under 6 kB, Node runner under 3 kB, browser runner under 1.5 kB.

## Limitations

- KTX2 encoding was tested only for its missing-`toktx` path here; the encoding arguments follow
  KTX-Software 4's `toktx` and should be checked on your machine before relying on them.
- No simplification (LOD): reducing triangles is modelling work or a separate, deliberate step.
- The typed module covers single-primitive meshes as `<mesh>` elements; multi-primitive meshes
  and skinned meshes are kept as `<primitive>` objects, as three.js loads them. Animations are
  not wired up.
- Triangle counts are what is drawn (per node), not what is stored; instancing extensions
  (`EXT_mesh_gpu_instancing`) are counted once per node.

## Licence

MIT.
