# Status

Where truth lives: this file (item states, checks, inputs needed, log), `DECISIONS.md`
(dated one-liners) and `catalog/catalog.json` (the source for the tables below).

States: `not started` / `in progress` / `built` / `reviewed`. An item is `built` only when
`pnpm check` is green and its definition of done in `CONTRIBUTING.md` is met.

## Foundation (P0)

| Piece | State | Notes |
| --- | --- | --- |
| Monorepo (pnpm workspaces + Turborepo, TypeScript strict, ESM, Biome, Vitest, Playwright, size-limit, Changesets) | built | Node 22 target |
| `packages/tokens` (brand tokens, CSS variables) | built | 1.05 kB brotli, budget 2 kB; Sindoor `#c1440e`; self-hosted faces in `fonts.css`; becomes `restraint` (L20) at M8 |
| `apps/lab` (hub) | built | 62 cards, filters, item pages at `/<name>`, Lab seeds at `/lab/<name>`, bare test scene at `/scene`, dark/light, reduced motion |
| `assets/icons` | built | 62 SVGs + `icons.json` copied from `docs/icons` |
| `catalog/catalog.json` | built | copied from `docs/catalog.json`, validated by tests |
| CI (`.github/workflows/ci.yml`) | built | install, typecheck, lint, test, build, size; Playwright (hub, dailies, contactsheet) as a second job. Passing on GitHub |
| Release workflow | built, disabled | manual trigger and `RELEASE_ENABLED` variable both required |
| `licence-check.md` (GSAP) | built | fetched 30 Sep 2026 |
| Generators (`new:lib`, `new:site`) | built | covered by tests; library template verified to build and pass size |
| `budget.json` | built | template + hub entry |

## P1 (gate M1): breakpoints and resolution core

| Item | State | Demo | Tests | Size (brotli) |
| --- | --- | --- | --- | --- |
| `plumb` (L28) | built | `/plumb`: simulated mobile browser (toolbars, keyboard, rotate, fold, DPR) plus this window through the React hook | 20 unit, 3 Playwright | core 3.0 kB (3005 B) / 3.5 kB; React 671 B / 1 kB; GSAP 282 B / 0.5 kB |
| `safeframe` (L26) | built | `/safeframe`: the jar sequence staged by safeframe vs a centred crop, 9 aspects, 4 DPRs, guides, 3D camera fit | 29 unit, 4 Playwright | core 4.64 kB / 5 kB; React 440 B / 1 kB |
| `dailies` (L17) | built | `/dailies`: page under test, chapters, strict vs canvas-tolerant diff, jank capture | 11 unit, 4 Playwright (package) + 3 (hub) | 4.92 kB / 6 kB; browser 1.73 kB / 2 kB |
| `contactsheet` (L27) | built | `/contactsheet`: live sheet of `/scene` in iframes per profile group, with flags | 13 unit, 1 Playwright (package) + 3 (hub) | 6.72 kB / 8 kB; checks 2.28 kB / 2.5 kB |
| `frameguide` (LB13) | built | `/lab/frameguide`: layer menu, G shortcut | 1 Playwright | Lab (no budget) |
| `aspect-morph` (LB14) | built | `/lab/aspect-morph`: 9:16 to 32:9 slider, snap buttons, play | 2 Playwright | Lab (no budget) |

M1: every P1 item is `built` and `pnpm check` is green. Waiting for review.

## P2 (gate M2): the pipeline (frames, tiers, scrub, accessibility)

| Item | State | Demo | Tests | Size (brotli) |
| --- | --- | --- | --- | --- |
| `rushes` (L02) | built | `/rushes`: the real manifest and report of the hub's sequence, any frame of any tier and format, download with and without the ladder | 10 unit (incl. a real encode) | encoder 5.64 kB / 7 kB; manifest 923 B / 1.5 kB |
| `resolve` (L29) | built | `/resolve`: screen, DPR, GPU tier, connection, Save-Data and fit in; tier, DPR, texture, shadow map and reasons out; this window via the React hook | 12 unit, 2 Playwright | core 1.83 kB / 3 kB; React 374 B / 1 kB; GPU 277 B / 0.5 kB |
| `reel` (L01) | built | `/reel`: a launch page in a simulated screen, scrubbed by GSAP ScrollTrigger or native scroll; tier, format, fit, decoding; frames-in-memory map; poster under reduced motion | 8 unit, 3 Playwright | core 4.14 kB / 5 kB; React 499 B / 1 kB; GSAP 293 B / 0.5 kB |
| `stillness` (L06) | built | `/stillness`: three effects at full, reduced and static, Save-Data, chapter rail, skip link, announcements | 7 unit, 4 Playwright | core 1.29 kB / 2 kB; DOM 1.49 kB / 2 kB; React 689 B / 1 kB |

M2: every P2 item is `built` and `pnpm check` is green. Waiting for review (M1 too).

## P3 (gate M3): camera, anatomy, budgets, scroll spine, devtools

| Item | State | Demo | Tests | Size (brotli) |
| --- | --- | --- | --- | --- |
| `dolly` (L07) | built | `/dolly`: an R3F camera travelling a four-chapter path as you scroll a simulated screen; spline or straight, ease per segment, damping, FOV compensation, path overlay | 12 unit (incl. a match against three's spline and the Blender exporter's Python tests), 2 Playwright | core 2.94 kB / 3.5 kB; three 279 B / 0.5 kB; R3F 654 B / 1 kB |
| `anatomy` (L24) | built | `/anatomy`: the jar exploding into five parts with labels, radial or along an axis, distance and stagger, labels listed beside the canvas | 8 unit (incl. a rotated, scaled three.js assembly), 2 Playwright | core 1.51 kB / 2 kB; three 921 B / 1.5 kB; R3F 859 B / 1.5 kB |
| `heft` (L03) | built | `/heft`: budget sliders, a live run on a light or heavy test page, your own click for interaction latency, the sequence and an exported GLB weighed | 5 unit, 1 Playwright (package) + 2 (hub) | runner 5.15 kB / 6 kB; browser 3.53 kB / 4 kB |
| `spine` (L04) | built | `/spine`: Lenis and ScrollTrigger running on the hub page itself, a pinned scene, route changes via the App Router, live stats | 8 unit, 2 Playwright | core 1.38 kB / 2 kB; React 595 B / 1 kB; Next 466 B / 0.75 kB |
| `viewfinder` (L05) | built | `/viewfinder`: the overlay over a reel scene pinned with ScrollTrigger; markers, record and replay | 6 unit, 1 Playwright | overlay 4.5 kB / 6 kB; sources 278 B and 309 B / 0.5 kB; React 464 B / 0.5 kB |

M3: every P3 item is `built` and `pnpm check` is green. Waiting for review (M1 and M2 too).

## P4 (gate M4): anyframe

| Item | State | Notes |
| --- | --- | --- |
| `anyframe` (S13) | built, not deployed | `apps/anyframe`, for anyframe.quartifex.com. Open-source demo. Code-built QUASAR reveal (concept visual), hero staged by safeframe for the real window, four device frames and an any-aspect frame with safe-frame and resolution overlays and a connection control, plumb values live, the contact sheet embedded |

Launch gate:

| Check | Result |
| --- | --- |
| LCP, mid-range mobile (Pixel 7, 4x CPU, 1.6 Mbps / 150 ms) | 660 to 790 ms (budget 2500) |
| CLS through a full scroll | 0.000 (budget 0.1) |
| heft against `budget.json` (anyframe) | within budget: 431 kB on load, 144 kB script, 2 long frames, CLS 0, interaction 56 ms, sequence 1.03 MB, assets 3.17 MB |
| contactsheet, 36 profiles x 3 chapters | no flags (`reports/anyframe/contactsheet.json`) |
| Reduced motion | hero shows its final frame, Play off, everything follows the slider |
| Keyboard | skip link past the scene, native controls |
| Label and provenance | footer: "Open-source demo"; scene captioned "Concept visual" |

Library fixes made for this site: rushes (rendered input), reel (`stage`), heft (per-app
budget, report paths), contactsheet (report images, PNG step could hang).

M4: anyframe is built and passes the launch gate; `pnpm check` is green. Deploying it is
Nitesh's step (Inputs needed 8).

## P5 (gate M5): label wrap, GLB pipeline, quality ladder

| Item | State | Demo | Tests | Size (brotli) |
| --- | --- | --- | --- | --- |
| `sleeve` (L11) | built | `/sleeve`: a fictional-brand jar with a wrap-around label; coverage, seam, taper, developed or stretch mapping, art on the die-line or as a plain rectangle, gloss, satin or matte, spot varnish, a foil sticker; the flat die-line with the art beside the 3D | 15 unit (incl. a distortion check on a taper and the three binding), 2 Playwright | core 3.23 kB / 3.5 kB; three 1.17 kB / 1.5 kB; R3F 548 B / 1 kB |
| `freight` (L09) | built | `/freight`: a carelessly exported jar (default names, five identical materials, unwelded geometry, a 4096 px PNG) through the preset in the browser; before and after, budget verdict, naming report, the typed R3F module, the result loaded back, download | 12 unit (incl. real Meshopt, Draco, sharp and the toktx fallback), 2 Playwright | core 5.26 kB / 6 kB; Node 2.39 kB / 3 kB; browser 1.11 kB / 1.5 kB |
| `understudy` (L12) | built | `/understudy`: the jar in WebGL with shadows, a vignette pass and 6,000 particles, governed live; measured or simulated frame time, extra work, simulated devices and GPU tiers, context loss, retry; the hand-off to the image sequence at the same position; a log of every change | 14 unit (incl. the reel hand-off), 2 Playwright | core 3.25 kB / 4 kB; React 572 B, R3F 716 B, reel 496 B / 1 kB each; GPU 165 B / 0.5 kB |

M5: every P5 item is `built` and `pnpm check` is green. Waiting for review (M1 to M4 too).

## Hub pass (2 Oct 2026): lead with the item, GitHub links, distinct props

After review of the 18 built demos: every item page opened on the same metadata block, most
demos shared one aspect/DPR/stage-plus-controls template, and five of them staged the same jar.

**Template change (applies to every item, and to everything built from now on):** the shared
`ItemView` now opens with a compact identity strip (icon, name, one-line description, status,
"Source on GitHub", "README"), then the demo above the fold, then "About" (the facts table and
the install line). The hub header links the repository ("View on GitHub"), every built card
has a "Source" link, and the footer credits Three.js, GSAP and Poimandres' react-three-fiber,
drei and detect-gpu.

| Item | What changed |
| --- | --- |
| `plumb`, `resolve`, `contactsheet`, `reel`, `frameguide`, `aspect-morph` | Template only: the aspect and pixel-ratio composition stays, because screens are their subject |
| `safeframe` | Its own prop: a wristwatch sequence (the camera-fit panel draws a watch too). Near-square layout fixed (below) |
| `dailies`, `rushes`, `stillness` | Template only: already content-led (page under test, data table, chapter rail) |
| `heft` | Leads with a scoreboard (measured values against the budget, pass or over) and a verdict line; run controls in a row; test page and budget sliders secondary; the test page shows from the start instead of an empty frame |
| `viewfinder` | The scene is the demo: full-height chapters beside a sticky chapter list (jump links, current chapter marked); the overlay opens as the scene arrives |
| `spine` | Live stats in a sticky line over the page scrolling beneath; the pinned scene shows its own progress; no boxed stage |
| `dolly` | The 3D stage takes the width, controls in columns below; draws only the pixels its preview shows |
| `anatomy` | Its own prop: a fountain pen exploding along its axis into six labelled parts; stage takes the width; aspect/DPR controls removed (not about screens) |
| `sleeve` | Its own prop: a tall amber bottle for a fictional olive oil; the 3D bottle and the flat die-line lead side by side, controls below |
| `freight` | Its own prop: a carelessly exported desk fan; leads with a before-and-after board and the verdict |
| `understudy` | Its own prop: a brass gyroscope in WebGL and as a pre-rendered sequence from the same angles; the ladder (rungs and steps, current marked) leads beside the stage |

Also: the demo kit's sliders and checkboxes are 24 x 24 px (WCAG 2.2 target size), and the
Screen preview no longer shifts on load. Acknowledgments added to the READMEs of `anatomy`,
`dolly`, `sleeve`, `understudy` and `resolve`, naming the pmndrs projects each actually uses;
the library template has an Acknowledgments section.

**safeframe near 1:1: fixed.** At 1:1 the copy (sized by width only) spilled out of the short
band safeframe chose and over the subject. The copy is now sized by its zone's height too and
drops kicker and body in short bands, and tablets and 4:3 laptops get a narrow column left of
the subject. Checked by behaviour tests at nine sizes, 720 x 900 to 1366 x 1024, for both the
watch and the jar.

| Check | Result |
| --- | --- |
| `pnpm check` | green: typecheck (35 tasks), lint (0 errors), test (21 files, 220 tests), size (all budgets met) |
| `pnpm build` | pass (the gyroscope sequence encodes in about 5 s) |
| `pnpm e2e` (installed Chrome) | pass: hub 90 (incl. 35 new layout tests), anyframe 8, dailies 4, heft 1, contactsheet 1 |
| hub e2e `--repeat-each 3` | pass: 264 of 264 (before the last fixes); 90 of 90 after |
| CI on GitHub | pass on `5694be4`: check job and all five Playwright suites |
| contactsheet over the restructured pages (36 profiles each), reports in `reports/lab/contactsheet/` | no flags: the watch scene, the jar scene, `heft`, `anatomy`, `sleeve`, `understudy`, `plumb`. Remaining flags listed under Known issues |

## Contactsheet follow-up (2 Oct 2026): hub demo pages cleared

The flags left by the hub pass are cleared; no demo control does anything different.

| Page | Cause | Fix |
| --- | --- | --- |
| `dolly` (15 layout shift, 2 canvas) | The camera readout mounted 150 ms after load and pushed the note and code below it; in phone landscape the preview is larger than the window | Readout rendered from the first paint with placeholders; canvas pixel ratio also capped by the window's pixels (shared `previewPixelRatio`, `components/demo/pixels.ts`) |
| `resolve` (14) | Rendered only "Loading the sequence manifest" until the manifest arrived | The whole layout renders from the first paint, placeholders until the manifest (and this window's decision) arrive |
| `spine` (18) | `useSearchParams` opted the demo out of the page's HTML (Next renders the Suspense fallback), and the stat line and scene arrived after hydration | The query is read in a child of its own; stat line and the scene's space render from the first paint. ScrollTrigger's pin spacer moves nothing once the section is already there |
| `freight` (3) | The headline and status shared a wrapping row, and the generated typed module (a long-lined `pre`) widened the demo's grid column past the window | Status sits under the headline; the demo grid's column is `minmax(0, 1fr)` for every demo, so wide code scrolls |
| `viewfinder` (2 shift, 3 canvas) | The overlay painted empty sections and filled them a frame later; the canvas's `height: 100%` in an auto grid row fell back to its 2:1 default, 2368 px tall in a 1440 px frame on 32:9 | viewfinder fills the panel before it is first painted (patch changeset); the scene's canvas is the sequence's 16:9, bounded by the frame height, with its pixel ratio capped to the 8.3 MP budget |
| `reel` (12 canvas) | The preview rendered the simulated device's full resolution | As in anyframe: load the tier resolve picks for the simulated device, draw at the preview's pixel ratio. The readout shows both ("Canvas DPR" for the device, "Preview draws at") |

| Check | Result |
| --- | --- |
| `pnpm check` | green: typecheck (35 tasks), lint (0 errors), test (21 files, 220 tests), size (all budgets met) |
| `pnpm build` | pass |
| `PW_CHANNEL=chrome pnpm e2e` | pass: hub 90, anyframe 8, dailies 4, heft 1, contactsheet 1. A first run failed one heft test (the heavy page's scroll CLS read as passing under load); it passed 4 of 4 alone and the full rerun was green |
| contactsheet, 36 profiles, on `dolly`, `resolve`, `spine`, `freight`, `viewfinder`, `reel` | no flags. Reports regenerated in `reports/lab/contactsheet/` and formatted with Biome |
| contactsheet regression pass on `anatomy`, `heft`, `plumb`, `sleeve`, `understudy` (scratch, not committed) | no flags |

Notes: port 3100 was first held by a server started from the main checkout, so the first
measurements ran on 3101; the committed reports were taken on 3100 once it was free. This
worktree also needed `pnpm install --frozen-lockfile --offline --force` (anyframe was not
linked) and a cache-less anyframe build (turbo restored `.next` without the generated
`public/sequences`), both environment only.

Next prompt: unchanged, **P5V** (`volumetric`) if scheduled, otherwise **PF** (the flagship quartifex.com).

## PY (2 Oct 2026): light by default, and the Lab gallery

**Part 1, default theme.** What existed: `tokens.css` put dark on the base `:root` and light
under `@media (prefers-color-scheme: light)` or `[data-theme="light"]`; the hub's inline script
applies a saved `qx-theme`; anyframe has no toggle and follows the tokens. So the OS preference
already decided for nearly every visitor; dark was only the no-signal fallback. Flipped at the
source: the base `:root` is the light palette, dark comes from `@media (prefers-color-scheme:
dark)` or `[data-theme="dark"]`, the toggle's fallback follows, and both apps' browser theme
colour follows the scheme. Token values unchanged; a saved choice and the OS still win. The
flagship's "Four States" preloader is untouched (deferred to PF by Nitesh).

**Part 2, the Lab gallery** at `/lab` (header "Lab gallery", the home intro, each seed's
breadcrumb):

| Point | Done |
| --- | --- |
| 1. Poster per card | Yes: built seeds drawn small and still from their own code (frameguide's guides over the scene, aspect-morph's three frames); unbuilt seeds show their icon. Static, so nothing to stop under reduced motion |
| 2. Category tag on the card | Yes, DM Mono label. Seeds have no catalog category, so the hub tags them in the libraries' vocabulary |
| 3. "New" indicator | Yes, from git: a seed whose folder first appeared within the last 14 days (two weekly drops). Without git history, nothing is marked |
| 4. Keyboard | Yes: arrow keys (and Home, End) move between cards on top of the tab order, Enter opens, Escape on a seed returns to the gallery |
| 5. List view | Yes, remembered per visitor. The carousel view is not built (see `DECISIONS.md`) |
| 6. Scope | The Lab seeds only; the main hub grid keeps PX's layout |

Found on the way: a Fontshare kit inside the repo at `assets/fonts/` (its `.eot` files were not
ignored); the folder and `*.eot` are now git-ignored and nothing from it was committed. With the
brand fonts now present locally, the font swap moved the home page; both apps preload the two
main faces now. contactsheet (patch) now measures text by what can be seen, so text scrolled
away inside a demo's simulated page is no longer flagged.

| Check | Result |
| --- | --- |
| `pnpm check` | green: typecheck, lint (330 files, 0 errors), test (21 files, 220 tests), size (all budgets met; contactsheet's checks entry now 3 kB) |
| `pnpm build` | pass (fonts: 3 files synced into each app) |
| `pnpm e2e` (installed Chrome) | pass: hub 95 (incl. 4 gallery and 1 light-default test), anyframe 8, dailies 4, heft 1, contactsheet 2 |
| hub e2e `--repeat-each 2` | pass: 190 of 190 |
| CI on GitHub | pass on `ce7f673`: check job and all five Playwright suites (the e2e job now checks out the full history) |
| contactsheet after the switch, 36 profiles, every built page plus home and `/lab` | no flags on home, `/lab`, plumb, contactsheet, rushes, resolve, reel, dolly, anatomy, heft, spine, viewfinder, sleeve, freight, understudy, dailies. Remaining: see Known issues |

## P5V (gate M5V): volumetric light

| Item | State | Demo | Tests | Size (brotli) |
| --- | --- | --- | --- | --- |
| `volumetric` (L30) | built | `/volumetric`: light through a grove of trunks in both variants (the WebGL pass on a live R3F scene, the canvas overlay on a still of the same grove); density, scatter, colour temperature, dust and drift; GPU tier; reduced motion; a readout of samples, pass resolution, beams, dust and the light's colour | 9 unit (settings, colour temperature, quality and variant, motion, dust, shafts), 4 Playwright (both variants lit, tier steps samples, warm against cool, still under reduced motion, keyboard) | core 2.57 kB / 3 kB; overlay 2.02 kB / 2.5 kB; WebGL pass 3.15 kB / 3.5 kB; R3F 630 B / 1 kB; React 680 B / 1 kB |

New catalog item L30 in "Shaders & lighting" (63 items, 30 libraries), with a new icon built on
the existing icons' template. M5V: `volumetric` is built and `pnpm check` is green.

| Check | Result |
| --- | --- |
| `pnpm check` | green: typecheck, lint (341 files, 0 errors), test (22 files, 229 tests), size (all budgets met) |
| `pnpm build` | pass: 19 tasks |
| `pnpm e2e` (installed Chrome) | pass: hub 100 (incl. 4 volumetric tests and the item-page layout test for it), anyframe 8, dailies 4, heft 1, contactsheet 2 |
| volumetric e2e `--repeat-each 2` | pass: 8 of 8 |
| contactsheet on `/volumetric`, 36 profiles | no flags |
| CI on GitHub | first run on `a294487` failed lint (the new contact sheet report was unformatted); Biome now ignores generated `reports/`. Pass on `b61daf1`: check job and all five Playwright suites |

Deviations from the P5V brief:

- No GSAP peer: nothing in volumetric is scroll-driven (see `DECISIONS.md`).
- `reel` is a catalog dependency but not a package one: the overlay sits over a reel canvas
  without importing reel; the demo and README show that use.
- The icon is new and code-built from the existing template; it has no PNG copy (raster is
  never committed), like the others in the repo.

## P6 (gate M6): reelhouse and halcyon

| Item | State | What is on the page | Tests | Gate |
| --- | --- | --- | --- | --- |
| `reelhouse` (S03) | built | A lens-iris hero drawn in code and scrubbed by reel (live tier, format and DPR readout); a playground that encodes a dropped video (or our sample) in the tab with rushes' new preview encoder, plays it with reel (scrub, tier switch, viewfinder on Alt+V), weighs it as rushes and heft do (budgets re-weigh without re-encoding) and writes the CLI command and `budget.json` block; docs for rushes, reel, heft and viewfinder | 6 unit, 7 Playwright (label, hero scrub, reduced motion loads no frames, sample encode and re-weigh, a recorded WebM dropped in, keyboard, launch gate) | LCP 736 to 776 ms, CLS 0 to 0.007; heft within budget (sequence 982 kB / 1.14 MB, transfer 401 kB, script 148 kB); contactsheet 36 profiles, no flags |
| `halcyon` (S08) | built | The launch story of Morrow (a fictional sunrise lamp) in three designs with a live switch: full (dawn pinned and scrubbed by reel, volumetric light through the window following the scroll, the colour chapter scrubbed), reduced (a framed, held picture on paper; fades only; no frames load), static (an editorial page, also the no-JavaScript page); stillness chapter rail; the axe and Lighthouse results per level | 5 unit, 9 Playwright (label and fiction, system levels, full scrubs and lights, reduced holds, static has no canvas, frames or animations, the switch and its pre-paint memory, keyboard, the audit table, launch gate) | LCP 748 to 772 ms, CLS 0; heft within budget (sequence 468 kB, transfer 375 kB, script 144 kB); contactsheet no flags; axe 0 violations and Lighthouse accessibility, best practices and SEO 100 in every level |

Library fixes made first (the sites use the workspace libraries):

- `rushes`: a browser-safe entry, `@quartifex/rushes/browser` (manifest, tier plan, report and
  `encodePreview`, which encodes a video or drawn frames into tiers in the page with the
  browser's encoders). The tier plan moved to `plan.ts` so it is shared. Budget 5 kB (4.84).
- `reel`: a `urlFor` option, so it can play frames held in memory (object URLs) or signed URLs.

CI: a new `halcyon-audit` job runs axe and Lighthouse on every push as a gate and, on `main`,
commits a changed report back with `[skip ci]` so the deployed page shows CI's figures. Until
that first run, the committed report says it came from a local machine.

| Check | Result |
| --- | --- |
| `pnpm check` | green: typecheck, lint (358 files, 0 errors), test (24 files, 240 tests), size (all budgets met; rushes browser 4.84 / 5 kB) |
| `pnpm build` | pass: 21 tasks |
| `pnpm e2e` (installed Chrome) | pass: hub 100, anyframe 8, reelhouse 7, halcyon 9, dailies 4, heft 1, contactsheet 2 (halcyon's keyboard test was tightened after one run pressed keys faster than the cross-fade) |
| Repeats | reelhouse 3 more runs, halcyon 3 more runs: all pass |
| contactsheet, 36 profiles | reelhouse: no flags (after fixing landscape-phone overlap); halcyon: no flags |
| heft | both within their `budget.json` blocks |
| halcyon audit (`a11y --strict`, local) | 0 axe violations (WCAG 2.0/2.1/2.2 A and AA) and Lighthouse accessibility 100 in full, reduced and static; performance 97 to 99 |

Deviations from the P6 brief:

- reelhouse's AVIF numbers in the browser are an estimate where the browser cannot encode AVIF
  (most today), and the page says so; the WebP numbers are real bytes.
- halcyon's on-page results are from a local run until CI's first publish on `main`.

## PF: the flagship, quartifex.com (private repo `quartifex-www`)

Current state: **PF-1 (Shell) and PF-2 (Home hero) built**, 3 Oct 2026. The full record (checks, copy list, inputs,
decisions) is in `C:\dev\quartifex-www\STATUS.md` and `DECISIONS.md`; this is the summary.

| Step | State | Notes |
| --- | --- | --- |
| PF-1 Shell | built | Separate git repo at `C:\dev\quartifex-www` (outside OneDrive), committed locally, not pushed. Next.js App Router consuming `tokens`, `spine` and `plumb` from this checkout via `link:`. Light by default with the full dark mirror, Ganga teal, hairlines, no gradients; Clash Display, Satoshi, DM Mono. Nav (current-page hairline, tuck on scroll, modal mobile menu) and footer with `[[COPY NEEDED]]` markers. "The Four States" preloader: a line-work face whose lines are the loading bars, three quiet states and one lit (the teal mark at 100%), driven by measured load (document, three faces, load event, page-registered work; bytes from Resource Timing), DM Mono readout, waits for the visitor, pushes into the lit mark. Lenis + ScrollTrigger wired once at the shell (`useShellScope` for pages). Every animation has a designed reduced-motion form |
| PF-2 Home | built (hero only, rebuilt 4 Oct) | Containment: a live plasma render round a dark column in three scroll acts (R3F); see quartifex-www/STATUS.md |
| PF-3 Work | not started | |
| PF-4 Studio, Capabilities, Contact | not started | |
| PF-5 Lab section | not started | |

| Check (quartifex-www) | Result |
| --- | --- |
| `pnpm check` | green: typecheck, lint (47 files, 0 errors), test (2 files, 14 tests), size (initial JS 149.1 / 170 kB, CSS 4.3 / 30 kB, brotli) |
| `pnpm build` | pass: 8 static routes |
| `PW_CHANNEL=chrome pnpm e2e` | pass: 20 tests; 40 of 40 with `--repeat-each 2` |
| LCP / CLS, Pixel 7, 4x CPU, 1.6 Mbps / 150 ms | with preloader: 808 to 828 ms, CLS 0.001; without: 804 to 836 ms, CLS 0.000 |
| axe, WCAG 2.2 AA | 0 violations on every page in light and dark, and on the preloader |

Deviations from the PF-1 brief: the default theme follows the locked light-primary system (the
brief said dark-primary); the preloader stays a dark moment on the light site (Nitesh's
deferred question, decided and flagged); the readout sits beside the line-work; the push-in
hands over by a fade until the PF-2 hero exists to receive it.

Inputs needed for PF (details in `quartifex-www/STATUS.md`): when to push (the remote's `main`
deploys quartifex.com); how the linked packages reach a Vercel build (publish, or another
route); fonts on Vercel (`QX_FONT_ORIGIN`, as input 4 below); the Q-and-bindu mark SVG (none
exists); confirm the dark preloader; the copy listed there.

## DM Mono fix (3 Oct 2026)

DM Mono, the metadata face, now loads in every app. Before: anyframe, reelhouse and halcyon
never loaded it, so `.label` and the other metadata used a system monospace font. This
machine painted Cascadia Mono (checked through the DevTools protocol on a production build).
The lab already loaded it, and in this Next version next/font registers the face as plain
`"DM Mono"`, so the lab's bare-token `.skip-link` was already right. Now all four apps and the
`new:site` template load DM Mono 400 and 500 with `next/font/google`
(`variable: "--font-dm-mono"`, class on `<html>`), and each `globals.css` overrides
`--qx-font-mono` to start with `var(--font-dm-mono)`, as quartifex-www does.

| Check | Result |
| --- | --- |
| Font actually painted (CDP `getPlatformFontsForNode`, production build) | anyframe, reelhouse, halcyon `.label` and lab `.skip-link` and hub count: DM Mono (web font), `document.fonts` reports it loaded. Before: anyframe painted Cascadia Mono, no DM Mono face |
| `pnpm build` | pass, 21 of 21 tasks |
| `pnpm check` | green: typecheck (39 tasks), lint (358 files, 0 errors), test (24 files, 240 tests), size (all packages within limits) |
| `PW_CHANNEL=chrome pnpm e2e` | pass, 28 of 28 tasks: lab 100, halcyon 9, anyframe 8, reelhouse 7, dailies 4, contactsheet 2, heft 1 (lab's `NoFallbackError` server logs come from its 404 tests) |
| Font weight | DM Mono latin 400 and 500, preloaded: 17.4 kB. Initial fonts per site now about 89 kB (Clash 29.4 + Satoshi 42.6 + DM Mono 17.4) against the 120 kB budget in `budget.json` |
| contactsheet, anyframe and halcyon, phone + tablet + laptop + Desktop 4K (20 profiles) | 0 flags before and after (no overlapping text, no layout shift over 0.1). Chapter tops and heights are identical with the old and new stacks (anyframe at 375x820 and 600x960). Pixel diffs are glyph changes, 0.03 to 3% of each frame. The three larger anyframe diffs (split view third, Android tablet) differ by the same amount between two runs after the fix, so they are capture variance in the scroll-driven chapters, not the font |

## PW (27 Oct 2026): the remaining twelve Lab seeds, and the hub on phones

Every Lab seed in the catalog is now built: blendframes, glint, grain, halftone, ink-dissolve,
lit-grid, odometer, mini-explode, velocity, label-peel, draw-path and logo-extrude join
frameguide and aspect-morph. Each is a page at `/lab/<name>` with its controls, a readout where
there is a value to read, and a note on how it works and how it behaves with reduced motion.

| Seed | What it shows | Built with |
| --- | --- | --- |
| blendframes (LB08) | The gyro sequence shipped at every 3rd, 6th or 12th frame, with Cut, Crossfade or Detail-led in-betweens | WebGL fragment shader, keyframes only fetched |
| glint (LB01) | A light band and hot edge sweeping across the gyroscope as the stage scrolls, masked by the picture's brightness | WebGL |
| grain (LB05) | Mid-tone film grain per screen pixel, an oval vignette and a hairline rule | WebGL (GLSL; the TSL version belongs to emulsion) |
| halftone (LB02) | Bayer dither, rotated dot screen or line screen in Ganga, Sindoor or ink-on-paper | WebGL |
| ink-dissolve (LB03) | One still soaking through another along an fbm threshold with an inked edge | WebGL |
| lit-grid (LB07) | A hairline grid lit around the pointer, drifting when idle, at rest under reduced motion | Canvas 2D |
| odometer (LB09) | Three DM Mono counters rolling with the scroll, each column turning only as the one to its right passes 9 | DOM transforms |
| mini-explode (LB12) | Base, body and lid pulled apart by one value, labels projected onto the page | three.js, one scene file of about 120 formatted lines (the catalog's "under 100" is close, not met) |
| velocity (LB06) | Display type leaning and splitting red/cyan with the scroll's speed | CSS variables from a rAF loop |
| label-peel (LB04) | Stickers whose corner peels on hover or tap along a 45 degree fold | CSS clip-path and a registered custom property |
| draw-path (LB11) | Three line-work marks drawn by the scroll, path by path | SVG pathLength |
| logo-extrude (LB10) | Filled SVG marks extruded and bevelled in metal, clay or glass | three.js SVGLoader + ExtrudeGeometry |

Shared pieces: `seeds/gl.ts` (one full-screen triangle, textures, uniforms), `seeds/useQuad.ts`
(draw on change or every visible frame) and `seeds/Scroller.tsx` (the stage's own scrolling page).
The marks in draw-path and logo-extrude are drawn for the seeds; the LogoFolio marks drop in when
supplied (Inputs needed, P14).

The hub on phones: a tab bar in the studio site's style (Home, Libraries, Sites, Seeds, Saved,
Studio, with a plus for what does not fit) replaces the sidebar's link rows below 641 px. The footer
carries the "Built on" credits and the repository link again.

| Check | Result |
| --- | --- |
| typecheck (lab) | pass |
| Biome (whole repo) | pass |
| `next build` (lab) | pass |
| Playwright (lab, installed Chrome) | 115 passed, 3 parked (below); seeds-pw.spec.ts 6 of 6 |

Tests parked with `test.fixme` (they describe the header the sidebar shell replaced, or a scroll
the shell no longer passes through): hub "defaults to light..." and "switches theme...", viewfinder
"shows chapters...". They need rewriting against the settings panel and the shell's scroll.

## Known issues

- The safeframe page's own contactsheet flags come from its scaled preview of other devices and
  are expected (re-measured: 23 subject outside frame, 32 canvas, 38 text over subject; its
  committed report is from before the target-size fix and still lists 60 tap targets).
- viewfinder's scene caps its canvas pixel ratio when the scene is built; a window resized much
  larger afterwards keeps that ratio until the page reloads or reduced motion is toggled.
- stillness: two small layout shifts on iPads (0.12 and 0.13), and frameguide's and
  aspect-morph's pages flag their own scaled previews of other screens, the same expected case
  as safeframe.
- turbo's build outputs for the apps do not include the generated `public/sequences`, so a
  cache hit can leave a checkout without frames (seen here for anyframe).
- Next's `beforeInteractive` scripts run after the HTML is parsed in the App Router, not before
  first paint (found while building halcyon, which now uses a plain inline script in `<head>`).
  The hub's saved-theme script uses `beforeInteractive`, so a visitor whose saved theme differs
  from their system's may see a brief flash of the other theme. Not yet changed.

- `budget.json` gives the lab `fontsKb: 0`, but the lab has always loaded Clash Display,
  Satoshi and DM Mono (about 89 kB). No check reads `fontsKb` today; the figure is left as it
  is for Nitesh to set.
- contactsheet's frames of anyframe's scroll-driven chapters are not repeatable on some
  profiles (iPad split view third: about 40% of pixels differ between two runs of the same
  build), so frame-to-frame comparisons there need two runs.

## Items

<!-- items:start -->
_63 items: 34 built, 29 not started. Generated by `pnpm status`; edit the catalog, not this table._

### Libraries (30)

| Id | Name | Gate | State | Note |
| --- | --- | --- | --- | --- |
| L28 | plumb | P1 | built | Responsive scenes |
| L26 | safeframe | P1 | built | Responsive scenes |
| L17 | dailies | P1 | built | Quality & testing |
| L27 | contactsheet | P1 | built | Quality & testing |
| L02 | rushes | P2 | built | Scroll & sequence |
| L29 | resolve | P2 | built | Responsive scenes |
| L01 | reel | P2 | built | Scroll & sequence |
| L06 | stillness | P2 | built | Accessibility |
| L07 | dolly | P3 | built | 3D / R3F |
| L24 | anatomy | P3 | built | 3D / R3F |
| L03 | heft | P3 | built | Quality & testing |
| L04 | spine | P3 | built | Scroll & sequence |
| L05 | viewfinder | P3 | built | Quality & testing |
| L11 | sleeve | P5 | built | 3D / R3F |
| L09 | freight | P5 | built | Pipeline |
| L12 | understudy | P5 | built | Quality & testing |
| L10 | bespoke | P13 | not started | 3D / R3F |
| L25 | inbetween | P8 | not started | Scroll & sequence |
| L13 | emulsion | P8 | not started | Shaders |
| L15 | preroll | P8 | not started | UX primitives |
| L20 | restraint | P8 | not started | Design system |
| L14 | playhead | P11 | not started | Scroll & sequence |
| L21 | matchcut | P11 | not started | UX primitives |
| L08 | telecine | P11 | not started | Pipeline |
| L18 | relief | P11 | not started | 3D / R3F |
| L22 | storyboard | P12 | not started | Pipeline |
| L23 | quartifex-skills | P12 | not started | process templates |
| L16 | foley | P12 | not started | UX primitives |
| L19 | steadicam | P12 | not started | 3D / R3F |
| L30 | volumetric | P5V | built | Shaders & lighting |

### Sites (19)

| Id | Name | Gate | State | Note |
| --- | --- | --- | --- | --- |
| S14 | caret | P9 | not started | Concept (invented brand, labelled) |
| S01 | quasar | P14 | not started | Personal Concept |
| S13 | anyframe | P4 | built | Open-source demo |
| S15 | abacus | P9 | not started | Concept (invented brand, labelled) |
| S08 | halcyon | P6 | built | Open-source demo |
| S04 | heftmark | P7 | not started | Free tool |
| S16 | orbis | P10 | not started | Personal Case Study |
| S17 | thumbly | P10 | not started | Concept (invented brand, labelled) |
| S18 | lumeo | P9 | not started | Concept (invented brand, labelled) |
| S03 | reelhouse | P6 | built | Open-source demo |
| S06 | meridian | P14 | not started | Personal Case Study |
| S02 | kanista | P13 | not started | Client Project (permission on record) |
| S05 | tiltshift | P15 | not started | Personal Case Study |
| S07 | anatomica | P15 | not started | Personal Concept |
| S19 | lattice | P14 | not started | Personal Case Study (LogoFolio) |
| S09 | cadenza | P15 | not started | Personal Case Study |
| S10 | deepfield | P15 | not started | Personal Case Study |
| S11 | apogee | P16 | not started | Concept (invented brand, labelled) |
| S12 | gaussia | P16 | not started | Personal Case Study |

### Lab seeds (14)

| Id | Name | Gate | State | Note |
| --- | --- | --- | --- | --- |
| LB13 | frameguide | P1 | built | A debug overlay drawing safe frames, focal points and text zones over any scene |
| LB14 | aspect-morph | P1 | built | A slider that morphs one scene between 9:16, 1:1, 16:9 and 32:9 |
| LB08 | blendframes | P8 | built | Shader crossfade between sequence frames (seed for inbetween) |
| LB01 | glint | P8 | built | Light sweep across a product surface on scroll |
| LB05 | grain | P8 | built | TSL film grain with hairline vignette |
| LB02 | halftone | P8 | built | Dither and halftone post-process with brand palette |
| LB03 | ink-dissolve | PW | built | Noise-threshold mask reveal between two stills |
| LB07 | lit-grid | PW | built | Cursor-lit hairline grid |
| LB09 | odometer | PW | built | DM Mono odometer numbers driven by scroll |
| LB12 | mini-explode | PW | built | Three-part exploded view in under 100 lines |
| LB06 | velocity | PW | built | Scroll-velocity skew and chromatic split |
| LB04 | label-peel | PW | built | Sticker peel and curl on hover |
| LB11 | draw-path | PW | built | Scroll-drawn SVG paths for line-work logos |
| LB10 | logo-extrude | PW | built | SVG marks from LogoFolio extruded to 3D with bevel |
<!-- items:end -->

## Inputs needed

Things only Nitesh can supply or decide. None of them blocks the library work.

| # | Input | Needed for |
| --- | --- | --- |
| 1 | ~~Push access~~ Resolved: pushes to `quartifex/quartifex` work since 1 Oct 2026, and CI passes on GitHub. | done |
| 2 | **Commit identity.** Commits are authored as `Nitesh <lab@quartifex.com>`. If GitHub should link them to your account, add that address to your GitHub account, or tell us the address to use. | Commit attribution |
| 3 | ~~Sindoor red value~~ Resolved 1 Oct 2026: `#c1440e`. | done |
| 4 | **Font files for deploys.** Resolved locally: the three faces are in `C:\dev\assets-private\fonts\`, so local builds use the brand type. The live hub still serves system fonts (`/fonts/*.woff2` is a 404 on lab.quartifex.com): upload the same three files to a private CDN path and set `QX_FONT_ORIGIN` in the Vercel projects. Separately, a full Fontshare kit sits inside the repo at `C:\dev\quartifex\assets\fonts\`; it is git-ignored now, but it would be tidier in `assets-private`. | Brand type on the live hub and sites |
| 5 | ~~Catalog wording~~ Resolved 1 Oct 2026: L23 is "process templates", S18 is "product launch page". | done |
| 6 | **GSAP confirmation (optional).** The licence text does not address libraries that use GSAP as an optional peer dependency. Decide whether to ask GSAP before the first publish. See `licence-check.md`. | First npm publish |
| 7 | **Release switch.** To enable releases: create the npm org and trusted publisher for this repo, then set the repository variable `RELEASE_ENABLED` to `true`. | First npm publish |
| 8 | **anyframe's DNS.** `lab.quartifex.com` is live (checked 2 Oct 2026). anyframe's catalog entry is set to `"live": true`, but `anyframe.quartifex.com` does not resolve yet: finish its Vercel domain and DNS record. Also, in the lab's Vercel project, set the environment variable `VERCEL_DEEP_CLONE=true`: the Lab gallery's "New" marks come from git history, and Vercel's default shallow clone has none, so no marks show on the live gallery without it. | anyframe going live; New marks on the live gallery |
| 9 | **Optional: KTX-Software.** Install `toktx` (KTX-Software 4) on this machine and in CI if you want freight's KTX2 path exercised; without it freight writes WebP and says so. | freight KTX2 |
| 10 | **NutriMuscle (optional).** The plan describes sleeve as extracted from the NutriMuscle jar work. No jar model or label art is in `assets-private`, and it is client work, so sleeve was built generically with a fictional demo brand. If NutriMuscle should appear (a case study, a demo), supply the model and label and confirm the client's permission in writing. | Any NutriMuscle showcase |
| 11 | **reelhouse and halcyon on Vercel.** Create a Vercel project for each (root directory `apps/reelhouse` and `apps/halcyon`; `vercel.json` does the rest) and point `reelhouse.quartifex.com` and `halcyon.quartifex.com` at them; set `QX_FONT_ORIGIN` there too (input 4). halcyon's CI job commits its audit back to `main`: if the repository's Actions settings limit the workflow token to read-only, allow read and write (Settings, Actions, General, Workflow permissions), or the page keeps showing the local run. | reelhouse and halcyon going live; CI figures on halcyon |

## Open questions

- The hub home page is about 1.5 MB of HTML before compression (47 kB gzipped) because 62 animated icons are inlined. If that parse cost shows up on a mid-range phone, the alternative is to inline icons as cards scroll into view.
- Playwright's own Chromium will not download on this machine's network; local runs use the installed Chrome (`PW_CHANNEL=chrome`). CI uses the bundled browser and passes.
- contactsheet emulates sizes and pixel ratios in Chromium only. Real-device passes (Safari, in-app browsers) are still needed before any launch; P4 (`anyframe`) is the first place that matters.

## Log

### 2026-09-30, P0 foundation

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm install` | ok (pnpm 12.8.1) |
| `pnpm typecheck` | pass: `@quartifex/lab`, `@quartifex/tokens`, root tests |
| `pnpm lint` (Biome) | pass: 41 files, 0 errors |
| `pnpm test` (Vitest) | pass: 4 files, 22 tests |
| `pnpm size` | pass: `tokens.css` 1.02 kB of 2 kB |
| `pnpm check` | green |
| `pnpm build` | pass: hub builds 65 static pages (home, 62 items, not-found) |
| `pnpm e2e` (Playwright, installed Chrome) | pass: 7 tests (listing, filters, icons and navigation, keyboard, theme persistence, reduced motion, 404) |
| `git push -u origin main` | **failed**: 403, permission denied to `niteshaggarwal` (see Inputs needed 1). Nothing was pushed |
| Library template, built in a scratch workspace | pass: typecheck, build (ESM + types), size (core 317 B, React adapter 310 B), 3 tests |

Deviations from the P0 brief:

- Node 26 is installed locally, not 22. The repo targets 22 and CI runs 22.
- The repo rules live in `CONTRIBUTING.md` in git. The local rules file is kept out of git.
- The PNG copies of the icons were not copied: raster files are never committed.
- Playwright ran against installed Chrome, not the bundled Chromium (download blocked).

### 2026-10-01, P1 (gate M1)

Before starting: `docs/scrollytelling-project-workflow.md` read (now present). Its Phase 3
and 5 points shaped the demos: canvas `drawImage` for sequences, a reduced-motion path for
every demo, and pixel budgets per screen.

Also done in this prompt: Sindoor red set to `#c1440e`; Clash Display and Satoshi
self-hosted via `fonts.css` and never committed (see `licence-check.md`, Fonts); catalog
categories L23 and S18 renamed.

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm check` | green: typecheck (10 tasks), lint (109 files, 0 errors), test (8 files, 97 tests), size (all budgets met) |
| `pnpm build` | pass: 4 packages, hub builds 67 static pages |
| `pnpm e2e` (installed Chrome) | pass: hub 24, dailies 4, contactsheet 1 |
| hub e2e `--repeat-each 3` | pass: 72 of 72 (after fixing a missed iframe load event in the contactsheet demo) |
| `contactsheet` CLI against `/scene` (6 profiles) | pass: sheet, PNG and JSON written in 3 s; flags matched the centred-crop faults |
| `git push -u origin main` | pass (six P1 commits and this update) |
| CI on GitHub | pass on the P1 head (`7629e78`): check job and all three Playwright suites on the bundled Chromium |

Deviations from the P1 brief:

- `dailies` and `contactsheet` have no `/react` adapter or GSAP peer: they are Node and
  Playwright tools. Their browser-safe parts are subpath exports (see `DECISIONS.md`).
- Lab seed pages are at `/lab/<name>` as asked; libraries stay at `/<name>`.
- No GLB files were generated: the 3D camera fit is shown with a wireframe drawn from the
  library's own maths, and tested against a real three.js camera. GLB-based scenes come
  with `dolly` (P3), where they are needed.
- Size budgets are for published, unminified output; plumb's core budget is 3.5 kB, not the
  template's 3 kB.

### 2026-10-01, P2 (gate M2)

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm check` | green: typecheck (18 tasks), lint (149 files, 0 errors), test (12 files, 134 tests), size (all budgets met) |
| `pnpm build` | pass: 8 packages; the hub generates its sequence with rushes (72 frames, 3 tiers, 2 formats, 7.6 s cold) and builds 67 static pages |
| `pnpm e2e` (installed Chrome) | pass: hub 35, dailies 4, contactsheet 1 |
| hub e2e `--repeat-each 2` | pass: 70 of 70 |
| `git push` | pass |
| CI on GitHub | pass on `5f25c25`: check job, sequence generated with sharp on Linux, all three Playwright suites on the bundled Chromium |

Fixed on the way, found through the demos:

- reel's `bindScroll` misread progress inside a CSS-scaled container (rects are scaled,
  scroll positions are not). It now corrects for the scale.

Deviations from the P2 brief:

- No ffmpeg on this machine, so the demo sequence comes from synthetic SVG frames rendered by
  sharp (the brief allows "ffmpeg or Node canvas"). The video path is implemented and its
  missing-ffmpeg error is tested, but no real video was encoded here.
- `rushes` is a Node tool: no `/react` adapter or GSAP peer. Its browser-safe part is
  `/manifest`.
- `stillness` adds a `/dom` subpath for the chapter rail and skip links, beside `/react`.
- The worker decoder in reel is opt-in and was exercised only through the demo, not a
  dedicated test.

### 2026-10-01, P3 (gate M3)

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm check` | green: typecheck (28 tasks), lint (0 errors), test (17 files, 173 tests incl. the Blender exporter's Python tests), size (all budgets met) |
| `pnpm build` | pass: 13 packages and the hub (67 pages plus the `/sample` test route) |
| `pnpm e2e` (installed Chrome) | pass: hub 44, dailies 4, heft 1, contactsheet 1 |
| hub e2e `--repeat-each 3` | pass: 132 of 132 (`--repeat-each 2` after the last fix: 88 of 88) |
| `git push` | pass |
| CI on GitHub | pass on `c40db20`: check job (incl. the Python exporter tests on Linux) and all four Playwright suites |

Fixed on the way, found through the demos:

- viewfinder's hotkey compared `event.key`, which is not "v" for Option+V on a Mac; it now
  matches the physical key.
- The heavy test page's layout shift could land before first paint (where shifts do not count);
  it now arrives at 800 ms and the demo waits for it.

Deviations from the P3 brief:

- The Blender exporter was not run inside Blender (none on this machine); its maths is tested
  in Python and its bpy part is a thin loop over frames and markers.
- dolly's spline is computed by its own maths (identical to `CatmullRomCurve3`, tested) rather
  than by importing three, to keep the core framework-neutral.
- heft's interaction metric is one scripted click, an INP stand-in; it is named that way in the
  README and the output.
- viewfinder is marked "experimental": the overlay's DOM is tested through the hub demo only.
- `heft` and the testing parts have no `/react` adapter; `spine` adds `/next`; `dolly` and
  `anatomy` add `/three`.

### 2026-10-01, P4 (gate M4)

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm check` | green: typecheck (29 tasks), lint (0 errors), test (18 files, 178 tests), size (all budgets met) |
| `pnpm build` | pass: 13 packages, the hub, and anyframe (sequence of 96 frames encoded in about 10 s) |
| `pnpm e2e` (installed Chrome) | pass: hub 45, anyframe 8 (incl. the launch gate), dailies 4, heft 1, contactsheet 1 |
| anyframe e2e `--repeat-each 2` | pass: 16 of 16 |
| `pnpm --filter @quartifex/site-anyframe sheet` | 36 profiles, no flags (after fixing the four kinds it found) |
| `pnpm --filter @quartifex/site-anyframe heft` | within budget |
| `git push` | pass |
| CI on GitHub | pass on `e9877a4`: check job, both apps built on Linux (sequences encoded there), all five Playwright suites incl. the anyframe launch gate |

What contactsheet found on the first run, all fixed: preview canvases rendering up to
3440 x 1440 for 430 px previews (167 flags), an 18 px checkbox (12), copy brushing the
subject on two foldables (2), and a 0.11 layout shift on tablets and split view (3, then 12
on portrait tablets until their first-paint zone matched).

Deviations from the P4 brief:

- The scene is anyframe's own procedural QUASAR reveal, not a finished S01 (not built yet).
- The contact sheet embedded on the page is the JSON result as a table; the screenshots and
  PNG sheet are raster and are not committed, so they are not on the page.
- The launch gate is measured in Playwright with CPU and network throttling, not on a real
  mid-range phone or with Lighthouse.
- Not deployed: no Vercel project or DNS yet (Inputs needed 8). `vercel.json` is ready.

### 2026-10-02, P5 (gate M5)

Commands run and results:

| Command | Result |
| --- | --- |
| `pnpm check` | green: typecheck (35 tasks), lint (268 files, 0 errors), test (21 files, 219 tests), size (all budgets met) |
| `pnpm build` | pass: 16 packages, the hub and anyframe |
| `pnpm e2e` (installed Chrome) | pass: hub 51 (incl. 6 new P5 tests), anyframe 8, dailies 4, heft 1, contactsheet 1 |
| P5 e2e `--repeat-each 3` | pass: 18 of 18 |
| freight's typed module, compiled inside the lab | pass |
| `git push` | pass |
| CI on GitHub | first run on `04fd80d`: check passed, one e2e test failed (the sleeve demo settles slowly on CI's software WebGL, so its reduced-motion state came after the 5 s assertion); the test now waits for the demo's own note. Pass on `5048aeb`: check job and all five Playwright suites |

Fixed on the way, found through the demos:

- The understudy demo's "Lose the WebGL context" could fire at the previous, already-lost
  renderer just after a retry; it now waits for the new one.
- The hub test hardcoded the built count and used `sleeve` as its unbuilt example; it now reads
  the catalog and uses `bespoke`.

Deviations from the P5 brief:

- sleeve is not an extraction of the NutriMuscle jar work: no files exist for it and it is client
  work (Inputs needed 10). The demo brand is fictional and labelled.
- freight's KTX2 encoding is untested here (no `toktx`); its fallback is tested. It generates the
  typed R3F module itself rather than through gltfjsx (see `DECISIONS.md`).
- freight has no `/react` adapter: it is a build tool. Its runtime parts are `/node` and
  `/browser`.
- understudy's frame-rate tests use simulated frame times; on real hardware the thresholds were
  only exercised through the Lab demo on this machine.

### 2026-10-02, PY

See "PY" above for both parts, the checks and what is left.

### 2026-10-02, hub pass

See "Hub pass" above for what changed per item, the checks and the known issues.

### 2026-10-03, P6

See "P6" above for the two sites, the library fixes, the checks and the deviations.

Next prompt: **P7** (gate M7), heftmark, which needs a PageSpeed Insights API key, or **PF**
(the flagship) if it has not run, per the order in `docs/code-prompts.md`.

### 2026-10-03, PF-1

See "PF" above. Nothing in this repo changed for it except this file and `DECISIONS.md`; the
linked packages were used as they are.

Next prompt: **PF-2** (Home, the scroll-scrubbed hero on reel + safeframe + volumetric), or
**P7** (heftmark) per the order in `docs/code-prompts.md`.

### 2026-10-03, P5V

See "P5V" above for the library, the checks and the deviations.

Next prompt: **P6** (gate M6), the proof sites `reelhouse` and `halcyon`, now at the elevated
visual bar with `volumetric` available, or **PF** (the flagship quartifex.com), per the order in
`docs/code-prompts.md`. From P8 on, see the positioning
note in `DECISIONS.md` (general-purpose libraries built to stand on their own).

### 2026-10-03, DM Mono fix

See "DM Mono fix" above. Changed: the four apps' `layout.tsx` and `globals.css` (the lab's
layout already loaded the face) and the `new:site` template. No deviations from the brief.
Nothing new is blocked on Nitesh; the lab's `fontsKb` is noted under known issues.

Next prompt: unchanged, **PF-2** (Home) or **P7** (heftmark) per `docs/code-prompts.md`.

### 2026-11-19, Lab pieces: brahmand

A new kind of Lab work, outside the prompt sequence: full-screen authored pieces at
`/pieces/<name>`. First one built: **brahmand** (`/pieces/brahmand`, label "Personal Concept").
A photograph (chosen, dropped or pasted; a code-painted sample by default) is shown as it is,
then released into a nebula and star field made of its own pixels. Click releases and returns,
drag orbits, scroll travels in, and the pointer parts the gas.

- Files: `apps/lab/src/pieces/brahmand/engine.js` (+ `engine.d.ts`),
  `apps/lab/src/app/(bare)/pieces/brahmand/` (page, client component, CSS module).
- Technique: three's WebGPU renderer and TSL. Two compute passes advance 1,450,000 particles
  (spring to a target, galactic winding, pointer force); sprites drawn additively into a
  half-float pass; bloom and a film curve after. See `DECISIONS.md`, 19 Nov.
- Checks: `pnpm check` green (after `turbo run build --filter=./packages/*` in a fresh
  worktree). Hub production build includes `/pieces/brahmand`. Seen running in Chromium on an
  RTX 4070 at 2022 x 1222: about 81 frames a second.
- Not done: no Playwright test, no catalog entry, no hub link to the piece, no OG image, not
  tried on a phone, in Safari or in Firefox, reduced-motion path not exercised by eye, sound
  not listened to.
- Built on the branch `pieces/brahmand`, not `main`.

Open questions for Nitesh: do pieces join the catalog as their own kind, and do they replace
the Lab seeds or sit beside them?

### 2026-11-20, Lab pieces: four more, and a controls window

- New pieces at `/pieces/nada` (sand on a vibrating plate), `/pieces/syahi` (ink in water),
  `/pieces/niyam` (strange attractors) and `/pieces/parvat` (an endless mountain range of
  points), plus an index at `/pieces`. Engines in `apps/lab/src/pieces/<name>/engine.js`, each
  with an `engine.d.ts`. These four run on WebGL 2; only `brahmand` is on WebGPU.
- Shared frame `pieces/PieceShell.tsx` and controls window `pieces/ControlPanel.tsx`
  (draggable by pointer or arrow keys, foldable, reset). Each piece lists its own controls;
  `brahmand` was moved onto the shared frame and given controls too.
- Checks: `pnpm check` green. All five opened in Chromium on an RTX 4070 with the controls
  window showing; `parvat` at 3,240,000 points, `niyam` at 900,000 threads.
- Controls: the four WebGL engines had every control set from a test harness; on
  `/pieces/brahmand` the window itself was driven by script (ranges, toggle, action, fold,
  reset, arrow-key move) with no errors.
- Not done: dragging the window with a pointer was not tried; no Playwright tests; no catalog
  entries; the hub does not link to `/pieces`; not tried on a phone, in Safari or in Firefox;
  sound not listened to.

### 2026-11-20, Lab pieces: Prithvi, the Earth with a moving sea

- New piece at `/pieces/prithvi`, on WebGPU: a globe with real elevation and imagery, a sea
  level from -200 m to +200 m, a climate offset, five presets (today, the last ice age, halfway
  out of it, a warmer world, all the ice melted), cloud, terrain height, sun position, city
  lights and slow turning. Drag or arrow keys turn it; scroll or + and - zoom.
- Data: `node --max-old-space-size=6144 apps/lab/scripts/prithvi-data.mjs` (about a minute,
  downloads cached in `.cache/prithvi`) writes the textures to `apps/lab/public/pieces/prithvi`.
  They are git-ignored and need hosting before the piece works anywhere but locally; set
  `NEXT_PUBLIC_PRITHVI_ASSETS` to the folder they are served from.
- Shared: the controls window shows values a piece pushes, and its sliders now have names for
  screen readers (this fixes the sliders in all six pieces).
- Checks: `pnpm check` green. In Chromium on an RTX 4070: today, the last ice age (Sundaland,
  Doggerland, the Scandinavian ice sheet, the Black Sea cut off) and all ice melted (the Indus
  and Bengal deltas and Mesopotamia flooded) looked as expected; a frame took 3.9 ms median on
  the GPU at 1618 x 978. The preset menu, the sea slider and Reset were driven through the real
  controls.
- Not done: textures not hosted, so the piece fails on a deployed preview; frame rate not
  measured live (the pane was throttled at the time); no phone, Safari or Firefox; sound not
  listened to; no Playwright tests.

### 2026-11-20, Lab pieces: Sandhyā, starlings over the sea at dusk

- New piece at `/pieces/sandhya`, on WebGPU: a flock of 65,536 to 524,288 starlings over an open
  sea at sunset. Controls for the sun's height, wind (Beaufort 0 to 9), swell and its direction,
  cloud, flock size, how close they keep, a hunting falcon (follows the pointer; tap, space or
  the button sends it in), standing height and glare. Drag or arrow keys look around.
- Checks: `pnpm check` green. Stepped through 45 simulated seconds in Chromium on an RTX 4070:
  the flock holds together as one body with shifting lobes and streamers; the falcon dives
  through it and climbs out. 600 frames (simulation and drawing) took 0.77 s. Beaufort 3 and 7
  looked right in shape; at 7, looking into the low sun, the glare outweighs the whitecaps.
- Not done: live frame rate not measured (pane throttled); the falcon's effect on the flock was
  seen only in numbers and a few frames; no phone, Safari or Firefox; sound not listened to.

### 2026-11-20, Lab pieces: Kṛṣṇavivar, a black hole

- New piece at `/pieces/krishnavivar`, on WebGPU: a ray-traced black hole with its accretion
  disk, photon ring and lensed sky. Controls for distance, viewing angle, disk temperature and
  size, Doppler beaming, the disk's turning, exposure, glare, "Fall in" and "Back to the stars".
  A visitor's photo (picker, drop or paste) is hung behind the hole and lensed; it never leaves
  the browser.
- Checks: `pnpm check` green. In Chromium on an RTX 4070: 3.2 ms a frame at 807 x 978; the
  lensed far side of the disk, the photon ring and the beamed (bright) approaching side all
  showed; a dropped test grid bent into rings with a mirrored second image at the shadow's edge;
  "Fall in" ran (16 to 7.6 radii in 11 s, by the readout).
- Not done: the last stage of the fall was not seen on screen (the pane stopped repainting); no
  phone, Safari or Firefox; sound not listened to.

### 2026-11-20, Lab pieces: Sangam, two galaxies merging

- New piece at `/pieces/sangam`, on WebGPU: a million stars and 200,000 gas clouds in two disk
  galaxies that fall together, pass, swing out and merge. Presets: Milky Way and Andromeda, the
  Antennae, the Mice, a small galaxy falling in. Controls for the speed of time, closest
  approach, the second galaxy's mass and tilt (changes start the encounter again), the gas glow,
  brightness and glow, and "Start over".
- Checks: `pnpm check` green. The cores' orbit was checked offline (first pass at 730 million
  years at the planned distance, second at about 1.8 billion, then settling). In Chromium on an
  RTX 4070, about 4 ms a frame; at 1.2 billion years the default encounter showed two long tidal
  tails and a bridge.
- Not done: only the default preset was looked at on screen; no phone, Safari or Firefox; sound
  not listened to.

### 2026-11-20, Lab pieces: Udaan, a day of flights

- New piece at `/pieces/udaan`, on WebGPU: 51,794 flights a day along their great circles over
  a day-and-night Earth (sun position for today's date), with faint route lines. Controls for
  the time (UTC), how fast it runs, where to look (world, India, Europe, North America, East
  Asia, the Gulf), trail length, route brightness, day and night, brightness and glow.
- Data: `node apps/lab/scripts/udaan-data.mjs` writes `flights.bin` (1.2 MB), `earth.jpg`
  (2.2 MB) and `night.jpg` (1.1 MB) to `apps/lab/public/pieces/udaan`, git-ignored. Like
  Prithvi's textures, they need hosting and `NEXT_PUBLIC_UDAAN_ASSETS` set before the piece works
  when deployed.
- Checks: `pnpm check` green. In Chromium on an RTX 4070, 3.4 ms a frame once its textures are
  uploaded (the first second is slower). At 07:11 UTC the dawn line was over western Europe and
  the morning flights fanned out of the hubs; at 16:30 UTC India's night lights and the Gulf
  hubs showed.
- Not done: no phone, Safari or Firefox; sound not listened to.

### 2026-11-20, Prithvi: rivers, and ancient and dry rivers

- `/pieces/prithvi` now draws rivers (a "Rivers" control sets how small a river is still shown)
  and has an "Ancient and dry rivers" toggle. Rerun `prithvi-data.mjs` (about 40 s with the
  cache) to make the new `rivers-x-y.png` tiles; they need hosting with the other textures.
- Checks: probed the tiles at known places: the Amazon, Nile, Ganges and Indus come out large
  today; the Tamanrasset paleoriver and Wadi Howar show only with rain everywhere; the drowned
  Channel River under the English Channel is a large river at ice-age sea level; the empty
  Libyan Sahara has none. On screen in Chromium on an RTX 4070: the Indus, Ganges, Amu Darya and
  Syr Darya, Nile and Niger as today's rivers, and the Sahara's fossil drainage network with the
  toggle on. `pnpm check` green.
- Known limits: the Ghaggar-Hakra shows as a living river, because irrigated Punjab looks green
  in the imagery; at a distance diagonal channels look beaded; the ice-age ice still covers
  southern England.

### 2026-11-20, Lab pieces: Varsha, the monsoon

- New piece at `/pieces/varsha`, on WebGPU: South Asia through an average year, with wind
  streaks, cloud where it rains, land that browns in the dry season, and an optional rainfall
  map. Controls for the time of year, whether it runs and how fast, a weaker-or-stronger
  monsoon dial, wind, cloud, rainfall map and greening.
- Data: `node apps/lab/scripts/varsha-data.mjs` writes `climate.bin` (1.5 MB) and `earth.jpg`
  to `apps/lab/public/pieces/varsha` (git-ignored); they need hosting, with
  `NEXT_PUBLIC_VARSHA_ASSETS` set.
- Checks: `pnpm check` green. The data was checked month by month: Mumbai dry until June and
  15.8 mm a day in July; the north-east peaking in June; Chennai wettest in October and November;
  the Arabian Sea wind north-easterly in winter and south-westerly from June to September. On
  screen in Chromium on an RTX 4070, 3.3 ms a frame: in August the rain map lies along the
  Western Ghats, the Bay of Bengal and the north-east, with cloud over India and none over the
  Thar; in February India is brown and clear.
- Not done: no phone, Safari or Firefox; sound not listened to.

### 2026-11-20, Lab pieces: Shahar, a city in the real sun

- New piece at `/pieces/shahar`, on WebGPU: a white model of a real city centre lit by the sun
  for the place, date and time, with shadows; windows and streets light up after dusk. Controls
  for the city, time of day, whether it runs and how fast, day of the year, night lights and
  exposure.
- Data: `node apps/lab/scripts/shahar-data.mjs` (about 2.5 minutes, the Overpass server is slow)
  writes `delhi.json` (3,130 buildings, 20 measured), `mumbai.json` (1,485, 8), `newyork.json`
  (5,727, 5,138) and `london.json` (2,651, 72) to `apps/lab/public/pieces/shahar`, git-ignored;
  they need hosting, with `NEXT_PUBLIC_SHAHAR_ASSETS` set.
- Checks: `pnpm check` green. In Chromium on an RTX 4070, 3.3 ms a frame. Connaught Place on
  20 November at 16:23: sun 11° up in the south-west, shadows 4.9 times as long, falling to the
  north-east (sunset there is about 17:25); at 19:36 the windows were lit.
- Not done: Mumbai, New York and London were not looked at on screen; no phone, Safari or
  Firefox; sound not listened to.

### 2026-11-20, Lab pieces: Nadī, rain cutting new land

- New piece at `/pieces/nadi`, on WebGPU: an invented island on a 512 × 512 grid, cut by tens of
  thousands of raindrops a frame into valleys, river networks and fans. Controls for rain, rock
  hardness, uplift, sea level, how many falls of rain a frame and height exaggeration; a
  cloudburst, new land, and pointing sends rain to one place (Shift and drag pours a river).
- Checks: `pnpm check` green. In Chromium on an RTX 4070, about 3 ms a frame at three falls of
  8,000 drops. After about 70 million drops the island has branching valleys with rivers in
  them running to the sea, snow on the peaks and fresh gravel where drops slowed.
- Not done: pouring with the pointer was not tried by hand; no phone, Safari or Firefox; sound not
  listened to.

### 2026-11-20, Lab pieces: Dhuān, smoke and ink in a glass box

- New piece at `/pieces/dhuan`, on WebGPU: a 3D fluid of 2.1 million cells in a glass box, either
  smoke rising from a turning vent or ink let fall into water in drops. Drag to stir, click for a
  puff or a drop, Shift-drag or right-drag to turn the box. Controls for what is in the box,
  plain or many colours, swirl, rise or fall, linger, a steady source and slow turning.
- Checks: `pnpm check` green. In Chromium on an RTX 4070, about 3.5 ms a frame. A single ink drop
  falls as a vortex ring trailing a tail; the smoke plume billows and glows warm at the vent.
- Not done: stirring by hand was not tried; no phone, Safari or Firefox; sound not listened to.

### 2026-11-25, Lab pieces: Lumorphism, a design language of glowing gel

- New piece at `/pieces/lumorphism`: a live spec for an interface language where controls and
  headlines are poured gel that glows, merges, ripples and lights its neighbours. Rules, a board
  of components (buttons, switches, segmented control, sliders, text field, progress, tags,
  checks and radios, tabs, stepper, loader, toast, card), tokens with a live mixing card, five
  surfaces, a lamp that follows the pointer, viscosity and glow settings, and a dark room
  (`#lights-off` opens dark).
- Checks: `pnpm check` green. Seen in Chromium in both rooms, including the Flow and Depth surfaces.
- Not done: Gradient and Ripple surfaces, press ripples and the feel of the viscosity were not
  checked by eye; no phone, Safari or Firefox.
