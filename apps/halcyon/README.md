# halcyon

Accessibility proof. **Open-source demo.** Planned address: `halcyon.quartifex.com`.

One launch story told three ways, with a live switch between them, and the axe and Lighthouse
results from CI on the page. The story is the launch of Morrow, a sunrise lamp we invented
for it (labelled fictional on the page). It proves that cinematic does not mean inaccessible.

- **Full:** the dawn sequence is pinned and scrubbed by the scroll (`reel`), and volumetric
  light shafts drift through the window from the rising sun (`volumetric`, its canvas overlay),
  their colour and strength following the scroll. The colour chapter is pinned and scrubbed;
  the lamp's glow breathes.
- **Reduced:** a different, calmer design, not the full one with effects removed: one framed,
  held picture of the room after sunrise with still light, on paper, beside the copy. Nothing
  is pinned or scrubbed; text and the colour steps fade in once. No sequence frames load.
- **Static:** a calm document: no motion at all, the picture as a framed still, one column. It
  is also what shows without JavaScript.

`@quartifex/stillness` is the policy: Auto follows the system's reduced-motion setting, the
switch overrides it (remembered on the device), and a `?motion=full|reduced|static` link sets it
for one visit. An inline script puts the level on `<html data-motion>` before first paint, so
each design is laid out from the start (CLS 0). Switching cross-fades with a View Transition,
except into static or when the system asks for reduced motion. stillness also draws the chapter
rail (`aria-current`, focus on arrival, polite announcements). `heft` holds the budget.

## Run

```sh
pnpm --filter @quartifex/site-halcyon dev      # http://localhost:3400
pnpm --filter @quartifex/site-halcyon build    # encodes the dawn sequence, then builds
pnpm --filter @quartifex/site-halcyon start
```

The build draws the 60 dawn frames in code (`scripts/dawn.mjs`) and encodes them with rushes
into `public/sequences/dawn/` (git-ignored, about 1.5 MB on disk).

## Checks

```sh
pnpm --filter @quartifex/site-halcyon e2e      # behaviour tests and the launch gate
PW_CHANNEL=chrome pnpm --filter @quartifex/site-halcyon sheet   # contactsheet, all 36 profiles
PW_CHANNEL=chrome pnpm --filter @quartifex/site-halcyon heft    # budget.json "halcyon" block
PW_CHANNEL=chrome pnpm --filter @quartifex/site-halcyon run a11y --strict   # axe + Lighthouse
```

## The audit on the page

`scripts/audit.mjs` runs axe-core (WCAG 2.0, 2.1 and 2.2, A and AA) and Lighthouse (default
mobile profile) against the production build in each level, and writes
`reports/halcyon/audit.json` and `audit.md`. The page reads `audit.json` at build time.

CI (`halcyon-audit` in `.github/workflows/ci.yml`) runs it on every push as a gate: no axe
violations and a Lighthouse accessibility score of 100 in every level. On `main`, when the
results change (axe findings, the accessibility, best-practice or SEO scores, the tool versions
or where it ran; not the date, and not performance, which moves between runs), CI commits the
new report with `[skip ci]`, and the next deploy shows what CI measured, with a link to the run.
Until CI's first publish, the page says the figures came from a local run.

## Deploy

`vercel.json` installs from the repo root and builds with Turborepo. Set the Vercel project's
root directory to `apps/halcyon` and the domain to `halcyon.quartifex.com`. Optional:
`QX_FONT_ORIGIN` for the brand fonts (see `licence-check.md`, Fonts).

## Provenance

- Morrow: a fictional product, invented for this demo. There is nothing to buy; its
  specification is illustrative.
- Dawn sequence: concept visual, drawn in code (procedural SVG frames encoded by rushes). Not a
  photograph.
- Light shafts: drawn live in the browser by `@quartifex/volumetric`, full level only.
- Lamp: an illustration drawn in code.
- Audit figures: produced by axe-core and Lighthouse against this page.
- Icon: from the Quartifex icon set (`assets/icons/svg/S08-halcyon.svg`).
- No photographs, video, models, datasets or sound are used.

## Launch gate

Do not deploy until every line is true.

- [x] The label is on the page and accurate: Open-source demo. Morrow is labelled fictional.
- [x] Rendered or generated visuals are captioned "Concept visual" or "Illustrative".
- [x] No raster, video or client-owned model is committed: the sequence is generated at build.
- [x] `prefers-reduced-motion` has a complete, usable path (reduced), and a no-motion path
      (static) that is also the no-JavaScript page. Nothing is conveyed by motion alone.
- [x] Keyboard: a skip link past the opening scene, the chapter rail moves focus, the switch is
      a radio group.
- [x] LCP under 2.5 s and CLS under 0.1 on a mid-range mobile profile (Playwright, Pixel 7, 4x
      CPU, Lighthouse mobile network): see `e2e/launch-gate.spec.ts`.
- [x] Page weight within the `halcyon` budget in `budget.json`, checked by heft.
- [x] contactsheet run across the device matrix, report in `reports/halcyon/`: no flags.
- [x] axe: no violations in any level; Lighthouse accessibility 100 in every level.
- [x] Playwright behaviour tests pass against the production build.
- [x] `pnpm check` is green. Catalog entry marked `built`. `STATUS.md` updated.

## Licence

MIT (code). The scene is generated by the code in `scripts/`, under the same licence.
