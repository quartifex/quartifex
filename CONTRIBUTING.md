# Contributing to Quartifex

How this repo is organised, the commands, and what "done" means for a library and for a
proof site. `STATUS.md` holds the state of every item; `DECISIONS.md` holds the decisions
taken along the way.

## Working rules
- Record decisions in `DECISIONS.md` (dated, one line). When something is blocked on an input only Nitesh can give (a file, key, account), add it to "Inputs needed" in `STATUS.md` and build everything that is not blocked.
- Do not assume what data or assets exist: check, and list gaps as questions in `STATUS.md`.
- Update `STATUS.md` at the end of every piece of work (item states, commands run with results, deviations, inputs needed).

## Brand and policy rules
- Voice on the Quartifex sites and READMEs is "we". Studio name Quartifex; founder Nitesh.
- Everything is showcased with an accurate label: Client Project, Personal Concept, Personal Case Study, Open-source demo, Free tool. Invented brands are labelled fictional. Rendered or generated visuals are "Concept visual" or "Illustrative", never presented as photography. Only Isha Foundation work is under NDA and must not appear.
- Brand system for site UI: light primary with a full dark mirror (flipped from dark-primary 2 Oct 2026, see DECISIONS.md), Ganga teal as the single accent, Sindoor red as a rare accent, hairlines instead of shadows, no gradients in site UI. Type: Clash Display (headings), Satoshi (body), DM Mono (metadata). Icons in `assets/icons` use light-and-depth gradients only and stay as they are.
- SVG and code live in git. Raster, video and client-owned models live on Cloudinary and are never committed.

## Engineering rules
- Default technique is GSAP + image sequence; WebGL/R3F only where justified. GSAP is an optional peer dependency; re-read its licence (`licence-check.md`) before any publish. Publishing to npm is a manual step that Nitesh runs.
- Stack: pnpm workspaces + Turborepo, Node 22, TypeScript strict, no `any`, ESM-only, Biome, Vitest, Playwright, size-limit, Changesets. Next.js App Router for apps, deployed on Vercel.
- Respect `prefers-reduced-motion` everywhere. Keyboard and screen-reader access are part of done.
- Performance: budgets in `budget.json`, LCP under 2.5 s, CLS under 0.1 on a mid-range mobile profile.
- `pnpm check` (typecheck, lint, test, size) must be green before an item is marked `built`.

## Layout

```
packages/*        libraries, published as @quartifex/<name> (tokens is internal)
apps/lab          the hub for lab.quartifex.com (Next.js App Router)
                  /<name> libraries and sites, /lab/<name> Lab seeds, /scene the bare test scene
apps/<site>       proof sites, one per catalog site
assets/icons      62 animated SVG icons + icons.json (do not restyle)
catalog/          catalog.json: the source of truth for what exists and its state
templates/        what `new:lib` and `new:site` copy
scripts/          generators and the STATUS table
reports/          audit and performance reports
budget.json       performance budgets per app
```

## Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Run every app in dev mode (the hub is on http://localhost:3100) |
| `pnpm build` | Build every package and app |
| `pnpm test` | Vitest, whole repo |
| `pnpm check` | typecheck + lint + test + size. Must be green before anything is `built` |
| `pnpm e2e` | Playwright behaviour tests: the hub and its demos (against the production build, so `pnpm build` first), plus `dailies` and `contactsheet` against synthetic pages |
| `pnpm fonts` | Copy the self-hosted brand fonts from `assets-private/fonts` into each app's git-ignored `public/fonts/` (runs before `dev` and `build`) |
| `pnpm lint` / `pnpm format` | Biome check / Biome check with fixes |
| `pnpm new:lib <name>` | Scaffold `packages/<name>` from the catalog entry, with a hub demo and a changeset |
| `pnpm new:site <name>` | Scaffold `apps/<name>` with its honest label and a budget entry |
| `pnpm status` | Regenerate the item table in `STATUS.md` from the catalog |
| `pnpm changeset` | Add a changeset for a package change |

Playwright needs a browser once: `pnpm --filter @quartifex/lab e2e:install`. If that
download is blocked, run with an installed browser: `PW_CHANNEL=chrome pnpm e2e`.

## Definition of done: every library
- Package in `packages/<name>`, published name `@quartifex/<name>`, ESM plus types, framework-neutral core, adapters as subpath exports (`/react`), GSAP as an optional peer dependency. Not published: publishing is Nitesh's action.
- README in the "we" voice: what it does, a 60-second quickstart, API table, support level (flagship / maintained / experimental), browser support, reduced-motion behaviour, size, honest limitations, licence (MIT).
- Tests: Vitest for logic, one Playwright behaviour test for anything that touches the DOM or scroll. Coverage of the public API, not a percentage target.
- `size-limit` budget set and passing. Types strict, no `any`.
- A demo page in `apps/lab` at `/<name>` with live controls, the library's icon from `assets/icons`, and a reduced-motion state.
- Accessibility: keyboard reachable, no information carried by motion alone, reduced motion honoured.
- A changeset file. An entry in `STATUS.md`. Catalog entry in `catalog/catalog.json` marked `built`.

## Definition of done: every proof site
- App in `apps/<name>`, its accurate label on the page, invented brands marked fictional.
- The launch gate in the site's README is fully ticked (label, captions, no committed binaries, reduced motion, keyboard and screen reader, budgets, Playwright, `pnpm check`).
- Catalog entry marked `built`, `STATUS.md` updated. Deploying is Nitesh's action.
