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
| contactsheet after the switch, 36 profiles, every built page plus home and `/lab` | no flags on home, `/lab`, plumb, contactsheet, rushes, resolve, reel, dolly, anatomy, heft, spine, viewfinder, sleeve, freight, understudy, dailies. Remaining: see Known issues |

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

## Items

<!-- items:start -->
_62 items: 19 built, 43 not started. Generated by `pnpm status`; edit the catalog, not this table._

### Libraries (29)

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

### Sites (19)

| Id | Name | Gate | State | Note |
| --- | --- | --- | --- | --- |
| S14 | caret | P9 | not started | Concept (invented brand, labelled) |
| S01 | quasar | P14 | not started | Personal Concept |
| S13 | anyframe | P4 | built | Open-source demo |
| S15 | abacus | P9 | not started | Concept (invented brand, labelled) |
| S08 | halcyon | P6 | not started | Open-source demo |
| S04 | heftmark | P7 | not started | Free tool |
| S16 | orbis | P10 | not started | Personal Case Study |
| S17 | thumbly | P10 | not started | Concept (invented brand, labelled) |
| S18 | lumeo | P9 | not started | Concept (invented brand, labelled) |
| S03 | reelhouse | P6 | not started | Open-source demo |
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
| LB08 | blendframes | P8 | not started | Shader crossfade between sequence frames (seed for inbetween) |
| LB01 | glint | P8 | not started | Light sweep across a product surface on scroll |
| LB05 | grain | P8 | not started | TSL film grain with hairline vignette |
| LB02 | halftone | P8 | not started | Dither and halftone post-process with brand palette |
| LB03 | ink-dissolve | PW | not started | Noise-threshold mask reveal between two stills |
| LB07 | lit-grid | PW | not started | Cursor-lit hairline grid |
| LB09 | odometer | PW | not started | DM Mono odometer numbers driven by scroll |
| LB12 | mini-explode | PW | not started | Three-part exploded view in under 100 lines |
| LB06 | velocity | PW | not started | Scroll-velocity skew and chromatic split |
| LB04 | label-peel | PW | not started | Sticker peel and curl on hover |
| LB11 | draw-path | PW | not started | Scroll-drawn SVG paths for line-work logos |
| LB10 | logo-extrude | PW | not started | SVG marks from LogoFolio extruded to 3D with bevel |
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
| 8 | **anyframe's DNS.** `lab.quartifex.com` is live (checked 2 Oct 2026). anyframe's catalog entry is set to `"live": true`, but `anyframe.quartifex.com` does not resolve yet: finish its Vercel domain and DNS record. | anyframe going live |
| 9 | **Optional: KTX-Software.** Install `toktx` (KTX-Software 4) on this machine and in CI if you want freight's KTX2 path exercised; without it freight writes WebP and says so. | freight KTX2 |
| 10 | **NutriMuscle (optional).** The plan describes sleeve as extracted from the NutriMuscle jar work. No jar model or label art is in `assets-private`, and it is client work, so sleeve was built generically with a fictional demo brand. If NutriMuscle should appear (a case study, a demo), supply the model and label and confirm the client's permission in writing. | Any NutriMuscle showcase |

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

Next prompt: **P5V** (`volumetric`, L30), per the order in `docs/code-prompts.md`
(P5 > PX > PY > P5V > P6); PF and P6 both need it. From P8 on, see the positioning
note in `DECISIONS.md` (general-purpose libraries built to stand on their own).
