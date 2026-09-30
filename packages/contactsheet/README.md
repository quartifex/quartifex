# @quartifex/contactsheet

A contact sheet for a scroll scene: one run across 36 viewport, pixel-ratio and aspect
profiles (small and large phones, foldables open and closed, tablets in split view, laptops,
4K, 21:9 and 32:9 ultrawides, in-app browsers), a screenshot of every chapter on every
profile, and automatic flags for what usually goes wrong: the subject outside the frame,
copy over the subject, overlapping text, tap targets that are too small, canvases rendering
more pixels than the screen shows, and layout shift. Responsive checks stop being a manual
pass device by device, and every delivery gets a sheet in the handoff.

**Support level:** maintained

## Quickstart (60 seconds)

```sh
pnpm add -D @quartifex/contactsheet @playwright/test
npx playwright install chromium
npx contactsheet https://staging.example.com/launch --out reports/contactsheet
```

That writes `reports/contactsheet/contactsheet.html` (the sheet), `contactsheet.png` (the
same sheet as one image), `contactsheet.json` (every flag) and a screenshot per profile and
chapter. A subset:

```sh
npx contactsheet http://localhost:3000 --profiles phone,foldable,"Desktop 4K"
```

From code, for example in CI:

```ts
import { runSheet } from "@quartifex/contactsheet";

const { counts } = await runSheet({
  url: "http://localhost:3000/launch",
  out: "reports/contactsheet",
  profiles: ["phone", "tablet", "ultrawide"],
});
if (counts["subject-outside-frame"]) process.exitCode = 1;
```

Chapters are elements with `data-chapter` (as in `@quartifex/dailies`). Subjects are read
from `data-sf-subject`, which `@quartifex/safeframe` writes on every staged scene.

## API

| Export | Kind | Description |
| --- | --- | --- |
| `runSheet(options)` | function | Run the matrix and write the sheet. Returns the sheet, flag counts by kind and the output paths |
| `contactsheet <url>` | CLI | `--out`, `--profiles`, `--chapters`, `--at`, `--channel` |
| `PROFILES`, `GROUPS`, `selectProfiles(list?)` (also `/profiles`) | data, function | The matrix, and selection by group or name (unknown names throw) |
| `collectSnapshot(options?, window?)` (also `/checks`) | function | Runs in the page (Playwright, or a same-origin iframe): subjects, text, tap targets, canvases, layout shift |
| `evaluate(snapshot, options?)` (also `/checks`) | function | Turn a snapshot into flags. Pure |
| `LAYOUT_SHIFT_SCRIPT` | string | An init script that adds up layout shift from page load |
| `renderHtml(sheet)`, `summarise(sheet)` | functions | The HTML sheet, and flag counts |
| `Profile`, `Snapshot`, `Flag`, `FlagKind`, `Sheet`, `CheckOptions` | types | |

**runSheet options:** `url`, `out`, `profiles`, `chapters` (selector), `at` (where in each
chapter, 0 to 1, default 0.5), `checks`, `collect` (text and target selectors), `browser`
(reuse one) or `channel`, `ready(page)` (wait for fonts or a preloader), `thumbHeight`, `png`.

**Check options:** `minTarget` (default 24 CSS px, the WCAG 2.2 AA target size; links inside
running text are exempt, as the criterion allows), `maxCanvasPixels` (default one 4K frame),
`canvasOverscan` (default 1.1 times what the screen can show), `maxLayoutShift` (default 0.1),
`textOverlapTolerance` (default 2% of a text box).

## Reduced motion

The sheet is still images; nothing animates. To shoot the reduced-motion path, pass
`ready: (page) => page.emulateMedia({ reducedMotion: "reduce" })` and compare the two sheets.

## Browser support

Runs Chromium through Playwright, on Node 22 or later. Each profile sets viewport, pixel
ratio, touch, mobile mode and, for in-app browsers, a user agent. The checks module runs in
any current browser.

## Size

A test dependency; CI still enforces `size-limit` budgets (brotli, unminified ESM as
published): runner under 8 kB, the browser checks under 2.5 kB.

## Limitations

- Profiles emulate sizes and pixel ratios in Chromium. They do not reproduce Safari's or an
  in-app browser's rendering, toolbars or quirks; real-device passes are still needed before
  launch.
- Sizes are representative and rounded, not exact for every model.
- "Subject outside the frame" needs the subject marked (`data-sf-subject`, written by
  safeframe). Scenes staged another way get the other checks only.
- One screenshot per chapter, at one point in it. What happens between those points is the
  job of `dailies` (jank capture, scroll to progress).

## Licence

MIT.
