# @quartifex/rushes

One command from a render to a scroll-ready image sequence. Point it at a Blender frame
folder (or a video) and we write tiered AVIF and WebP sets, a `manifest.json` that `reel`
and `resolve` read, poster frames for reduced motion and no-JavaScript visitors, and a
page-weight report checked against your budget. It replaces the ffmpeg and ImageMagick
recipes copied between projects, and makes Phase 3 of a scroll build one step.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/rushes
npx rushes renders/jar --out public/sequences/jar
```

```text
encoded 72/72
w480   avif     96.4 kB  first screen   45.6 kB  pass
w960   avif    504.9 kB  first screen   97.9 kB  pass
w1600  avif    948.1 kB  first screen  172.3 kB  pass
...
public/sequences/jar/manifest.json
public/sequences/jar/report.md
```

From a video (needs ffmpeg on the PATH, or `--ffmpeg <path>`, or `RUSHES_FFMPEG`):

```sh
npx rushes footage/reveal.mp4 --fps 24 --out public/sequences/reveal --budget budget.json --strict
```

No footage yet? `npx rushes --synthetic 72 --out public/sequences/test` writes a generated
test sequence (a jar turning on a hairline floor) through the same pipeline.

From code:

```ts
import { rush } from "@quartifex/rushes";

const { manifest, report } = await rush({
  input: "renders/jar",
  out: "public/sequences/jar",
  widths: [480, 960, 1600, 2560],
  budget: { maxTierBytes: 4_000_000, maxInitialBytes: 400_000 },
});
if (!report.pass) process.exitCode = 1;
```

## Output

```text
public/sequences/jar/
  manifest.json      frames, fps, source size, formats, tiers (with total bytes), path pattern, posters
  report.md          the page-weight table
  report.json        the same, for CI
  poster.avif|webp|jpg
  w480/avif/0000.avif ... w1600/webp/0071.webp
```

Tiers up to 640 px wide keep every second frame by default (`step`), as phones need fewer
frames to read as smooth; larger tiers keep every frame.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `rush(options)` | function | Encode and write everything. Returns the manifest, report and paths |
| `rushes <input>` | CLI | `--out`, `--widths`, `--formats`, `--fps`, `--poster`, `--budget`, `--ffmpeg`, `--synthetic`, `--strict` |
| `planTiers(source, frames, widths?, step?)` | function | The tier ladder for a source, without encoding |
| `weigh(manifest, frameBytes, posterBytes, budget?)`, `reportMarkdown` | functions | The page-weight report, pure |
| `syntheticFrame(index, options?)` | function | One SVG frame of the test sequence |
| `naturalSort(names)` | function | frame2 before frame10 |
| `parseManifest`, `framePath`, `frameAt`, `Manifest`, `Tier`, `Format` (also `/manifest`) | functions, types | The manifest schema, browser-safe |
| `encodePreview(options)` (`/browser`) | function | Encode a preview in the page: a dropped video or drawn frames to tiered frames, posters, manifest and report, as blobs, with the browser's own encoders |
| `encodableFormats()` (`/browser`) | function | Which of AVIF and WebP this browser's canvas can encode |
| `planTiers`, `weigh`, `reportMarkdown`, `formatBytes`, `naturalSort` (also `/browser`) | functions | The plan and the report, browser-safe |

**Options:** `input` (folder, video, or `{ synthetic }`), `out`, `name`, `widths` (default 480,
960, 1600, capped at the source width), `formats` (default AVIF and WebP), `step(width)`,
`fps` (default 30), `quality` (AVIF 50, WebP 75, JPEG 80), `poster` (source frame index),
`budget`, `ffmpeg`, `concurrency`, `onProgress`.

**In the browser** (`@quartifex/rushes/browser`): `encodePreview({ input, widths, formats,
maxFrames, fps, quality, poster, budget, signal, onProgress })` returns `{ manifest, report,
files, url(path), dispose() }`; pass `url` to reel's `urlFor` to play it. A longer video is
sampled evenly down to `maxFrames` (default 96). It uses the browser's canvas encoders, so the
bytes are close to, not the same as, the CLI's: use it to preview and estimate, and the CLI to
ship. Browsers that cannot encode AVIF (most, today) get WebP only.

**Budget:** `maxTierBytes`, `tiers` (per-tier overrides), `maxInitialBytes` (poster plus the
first `initialFrames`, default 12). A `budget.json` with a `sequence` key works directly.

## Reduced motion

rushes writes the poster that reduced-motion and no-JavaScript visitors see (`poster.avif`,
`poster.webp`, `poster.jpg`, at the largest tier). Choose a frame that tells the story on its
own with `--poster`.

## Browser support

The output is plain AVIF, WebP and JPEG. AVIF decodes in all current browsers; `reel` falls
back to WebP where it does not. The tool runs on Node 22 or later, on Windows, macOS and Linux
(sharp ships prebuilt binaries).

## Size

A build tool, but CI still enforces a budget (brotli, unminified ESM): encoder under 7 kB and
the browser manifest helpers under 1.5 kB, not counting sharp.

## Limitations

- Video input needs ffmpeg installed; we do not bundle it.
- Frames are resized to the tier width with the source aspect; per-bucket crops are
  safeframe's job at draw time, not baked into files.
- EXR and other HDR render outputs are not read: export PNG, TIFF or JPEG from Blender.
- AVIF encoding is the slow part (effort 2 by default); a 4K, 300-frame sequence takes
  minutes, not seconds.

## Licence

MIT. Uses sharp (Apache-2.0).
