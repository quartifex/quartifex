# avenue

AVENUE, a whole-car infotainment concept, at `avenue.quartifex.com`. **Personal Concept**
(see Inputs needed in `STATUS.md` for the final project label). One page does three jobs: a
playable demo of AVENUE inside a 3D car, a product page for partners, and the system's
documentation.

We built it on the workspace libraries: `spine` (Lenis and ScrollTrigger), `plumb` (the
viewport), `safeframe` (the camera's bucket per screen shape), `dolly` (the camera path from the
kerb into the cabin), `volumetric` (the light shafts, through its new TSL variant), `understudy`
(WebGPU or WebGL2, then the image sequence through `reel`, then the poster), `resolve`, `stillness`
(reduced motion), `freight` (the car's GLBs), `rushes` (the sequence), and `heft` and
`contactsheet` for the launch gate.

## Run

```sh
pnpm install
pnpm --filter @quartifex/site-avenue dev      # http://localhost:3500
pnpm --filter @quartifex/site-avenue build    # assets, then next build
pnpm --filter @quartifex/site-avenue start
```

`dev` and `build` first run `scripts/assets.mjs`, which writes the generated, git-ignored
assets: the car (`public/models/*.glb`, from `src/three/shape.ts`, through freight and the
budgets in `budget.json`) and the image-sequence fallback (`public/sequences/cabin`, through
rushes). Pass `--force` (`pnpm --filter @quartifex/site-avenue assets`) to rebuild them.

Add `?rung=webgl`, `?rung=sequence` or `?rung=poster` to the address to force a rung of the
quality ladder.

## Where things are

| What | Where |
| --- | --- |
| Design tokens (the one file the page, the demo and the docs read) | `src/design/tokens.ts` |
| The car, the seats and the screens, as numbers | `src/three/shape.ts` |
| Camera path, door, screens waking, the light | `src/stage/paths.ts` |
| The demo's shared state and the driver-lockout rules | `src/demo/system.ts` |
| Modules (names, states, requirement cards, driving rules) | `src/content/modules.ts` |
| The 25 Volere cards, the A/B results, site facts and credits | `src/content/` |
| Documentation (edit freely; MDX) | `content/docs/*.mdx` |
| The logo (one file; replace it with the final SVG) | `public/brand/avenue-logo.svg` (placeholder from `scripts/logo.py`) |
| Partner form endpoint | `src/app/api/partner/route.ts` |

Facts only Nitesh can supply are written as `[[NEEDED: ...]]` in `src/content/`; the page shows
them as "To be confirmed" until they are replaced.

## Environment variables (Vercel)

| Name | What |
| --- | --- |
| `RESEND_API_KEY` | Email provider key for the partner form (Resend) |
| `PARTNER_INBOX` | Where partner enquiries go |
| `PARTNER_FROM` | A sender address on a domain verified with Resend |

Without them the form validates but answers that it is not accepting messages yet (503).

## Checks

```sh
pnpm --filter @quartifex/site-avenue e2e     # behaviour tests and the launch gate
pnpm --filter @quartifex/site-avenue heft    # budgets in budget.json
pnpm --filter @quartifex/site-avenue sheet   # contactsheet across the device matrix
pnpm --filter @quartifex/site-avenue a11y    # axe in five states, plus Lighthouse
```

## Launch gate

- [x] The label is on the page and accurate; the footer says "AVENUE is a concept system by
      Quartifex, available for collaboration."
- [x] The car is captioned "Concept visual"; every model, environment and sound has a provenance line.
- [x] No raster, video or model is committed: the GLBs and the sequence are generated at build.
- [x] `prefers-reduced-motion` has a complete, usable path (no pins, no camera flights, cuts).
- [x] Keyboard and screen-reader pass done on the demo; axe clean (see `reports/avenue/`).
- [x] Budgets in `budget.json` met; LCP under 2.5 s and CLS under 0.1 on a mid-range mobile profile.
- [x] Playwright behaviour tests pass against the production build.
- [x] `pnpm check` is green.

## Licence

MIT (code). The car and everything in the scene are original; see
`public/models/LICENSES.md`. Fonts: SIL Open Font License 1.1, from their Fontsource packages.
