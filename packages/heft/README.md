# @quartifex/heft

Page-weight and scroll-performance budgets as a CI check. Lighthouse CI measures a page
loading; a launch page lives or dies in a twelve-second scroll through a pinned scene. heft
weighs the build (rushes sequences, GLB models, textures), loads the page in Playwright,
scrolls all the way through it, clicks something, and fails the build when bytes, long
frames, layout shift or interaction latency go over budget. On GitHub it writes error
annotations and a summary table.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/heft @playwright/test
npx playwright install chromium
```

`budget.json`:

```json
{
  "heft": {
    "assets": { "glbBytes": 3000000, "triangles": 300000, "sequenceBytes": 4000000 },
    "page": { "transferBytes": 1500000, "scriptBytes": 300000 },
    "scroll": { "durationMs": 12000, "longFrames": 3, "cls": 0.1, "inp": 200 }
  }
}
```

```sh
npx heft --budget budget.json --dir out --url http://localhost:3000/launch
```

```text
pass  assets.glbBytes           2.31 MB / 2.86 MB  models/jar.glb
pass  page.transferBytes      840.2 kB / 1.43 MB
OVER  scroll.longFrames               5 / 3
pass  scroll.cls                  0.012 / 0.100
```

GitHub Actions (start your server in an earlier step):

```yaml
- uses: quartifex/quartifex/packages/heft@main
  with:
    budget: budget.json
    dir: out
    url: http://localhost:3000/launch
```

## What it measures

| Metric | How |
| --- | --- |
| `assets.glbBytes`, `assets.triangles` | Each `.glb` under `--dir`, read from its header and JSON chunk (no loading) |
| `assets.textureBytes` | Images and compressed textures, not counting sequence frames |
| `assets.sequenceBytes` | Each rushes manifest's largest tier |
| `page.transferBytes`, `scriptBytes`, `imageBytes` | Resource and navigation timing while loading |
| `scroll.longFrames` | Long animation frames over 50 ms during the scroll (rAF gaps where the browser does not report them) |
| `scroll.p95FrameMs` | 95th-percentile frame time during the scroll |
| `scroll.cls` | Layout shift from load to the end of the scroll |
| `scroll.inp` | The slowest scripted interaction (a click on the first button or link, or `interactions`) |

## API

| Export | Kind | Description |
| --- | --- | --- |
| `runHeft(options)` | function | Measure, evaluate, write `heft.json` / `heft.md`, annotate on GitHub |
| `heft` | CLI | `--budget`, `--url`, `--dir`, `--out`, `--channel`, `--width`, `--height`; exit 1 when over |
| `weighAssets(dir)` | function | The asset half alone |
| `evaluate(measurements, budget)` | function | Findings, pure |
| `parseGlb(bytes)` | function | Meshes, triangles, vertices, materials, embedded images, extensions |
| `findingsMarkdown`, `githubAnnotations`, `formatValue`, `readBudget` | functions | Output helpers |
| `installObservers`, `scrollThrough`, `readTransfer`, `readScroll` (`/browser`) | functions | The in-page collectors, for dashboards and live demos |
| `action.yml` | GitHub Action | Composite action around the CLI |

## Reduced motion

heft scrolls the page as a visitor would, so it measures the full-motion path. Run it a second
time with `prefers-reduced-motion: reduce` (for example from your own Playwright test with
`emulateMedia`) to hold the reduced path to the same budget.

## Browser support

Runs Chromium through Playwright. Long animation frames, layout shift and event timing come
from Chromium's performance entries.

## Size

A CI tool; budgets are still enforced (brotli, unminified ESM): runner under 6 kB, browser
collectors under 4 kB.

## Limitations

- The interaction metric is a stand-in for INP: one scripted click, not a field measurement.
- Transfer sizes come from timing entries; cross-origin resources without
  `Timing-Allow-Origin` report 0 bytes.
- GLB triangle counts are read from accessors; meshes compressed with Draco or meshopt report
  their decoded counts, but external `.gltf` + `.bin` pairs are not read.
- One page per run; loop in your workflow for several.

## Licence

MIT.
