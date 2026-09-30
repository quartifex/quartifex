# Decisions

Dated, one line each. Newest at the bottom. If a decision contradicts a rule in `CONTRIBUTING.md`, the rule wins and the decision gets reversed here.

- 2026-09-30: Repo lives at `C:\dev\quartifex`, outside OneDrive; `C:\dev\docs` and `C:\dev\assets-private` are junctions into OneDrive. `docs/` is never written to.
- 2026-09-30: pnpm installed with `npm install -g pnpm` (12.8.1) because Node 26 on this machine no longer ships corepack. `packageManager` is pinned in `package.json`.
- 2026-09-30: Target runtime is Node 22 (`.nvmrc`, `engines >=22`, CI on 22, `@types/node` 22). The local machine runs Node 26; nothing uses an API newer than 22.
- 2026-09-30: Tool versions are whatever resolved on this date (TypeScript 7.0, Biome 2.5, Vitest 5, Turbo 2.11, Next 16.3, Playwright 1.63, size-limit 14, Changesets 3). The lockfile pins them.
- 2026-09-30: Libraries build with `tsc` only (ESM + `.d.ts`), no bundler: it keeps the output readable and the toolchain small. Revisit per library if tree-shaking or multiple entry formats need more.
- 2026-09-30: One Vitest run at the repo root covers root tests, packages and apps; typecheck, build and size run per package through Turborepo.
- 2026-09-30: `pnpm check` = typecheck + lint + test + size, as specified. Playwright is a separate command (`pnpm e2e`) and a separate CI job, because it needs a production build and a browser.
- 2026-09-30: `@quartifex/tokens` is CSS custom properties only, prefixed `--qx-`, private for now. It becomes `restraint` (L20) at gate M8.
- 2026-09-30: Teal is `#3fbead` on dark and `#0b6f65` on light, taken from the Quartifex logo files. Sindoor red (`#c8322b` dark, `#a3241e` light) is provisional: no source file defines it.
- 2026-09-30: No font files are committed. Clash Display and Satoshi load from Fontshare in the hub; DM Mono is self-hosted at build by `next/font`. Tokens name the faces with system fallbacks.
- 2026-09-30: Hub icons are inlined into the HTML so each SVG keeps its own animation, hover palette and reduced-motion rule. Cost: the home page is about 1.5 MB raw, 47 kB gzipped. Cards use `content-visibility: auto`.
- 2026-09-30: Hub item pages are at `/<name>` (catalog names are unique across libraries, sites and Lab seeds; a test enforces it). A library demo is a file in `apps/lab/src/demos/`, registered by `pnpm new:lib`.
- 2026-09-30: Theme follows the OS by default; the toggle stores an explicit choice in `localStorage` (`qx-theme`) and an inline script applies it before first paint.
- 2026-09-30: The generators refuse any name that is not in the catalog, or is the wrong kind, and never overwrite an existing folder. They set the catalog state to `in progress`; `built` is set by hand once `pnpm check` is green.
- 2026-09-30: `STATUS.md` item tables are generated from the catalog by `pnpm status`, so the two cannot disagree.
- 2026-09-30: The release workflow is manual (`workflow_dispatch`) and also gated on the repository variable `RELEASE_ENABLED == 'true'`, which is not set. It uses npm trusted publishing (OIDC) with provenance; no npm token is stored.
- 2026-09-30: `.gitignore` blocks raster, video and 3D model formats repo-wide, to keep client-owned and heavy binaries out of git. The PNG copies of the icons were therefore not copied; only the 62 SVGs and `icons.json`.
- 2026-09-30: Commits are authored as `Nitesh <lab@quartifex.com>` (the planned open-source alias) rather than a personal address, since the repo is public. Change with `git config user.email` if another address should be used.
- 2026-09-30: Playwright's bundled Chromium could not be downloaded on this network, so local runs use the installed Chrome via `PW_CHANNEL=chrome`. CI installs the bundled browser.
- 2026-09-30: The catalog and icons.json are copied from the reference docs unchanged; the hub displays every entry exactly as the catalog names it.
- 2026-09-30: Repo rules and definitions of done are tracked in `CONTRIBUTING.md`. Local working notes and tool-generated guidance files are git-ignored, and Turborepo's generated guidance file is switched off (`agentGuidance: false`).
- 2026-10-01: Sindoor red is `#c1440e`, one value for both themes (confirmed by Nitesh). Contrast is 3.98:1 on the dark background and 4.58:1 on the light one: above the 3:1 non-text minimum in both, below 4.5:1 for small text on dark, which suits its role as a rare, dot-scale mark, never body text.
- 2026-10-01: Clash Display and Satoshi are self-hosted and never committed: `@quartifex/tokens/fonts.css` (`@font-face`, `font-display: swap`, `/fonts/*.woff2`), filled by `pnpm fonts` from `assets-private/fonts` or proxied to a private CDN path via `QX_FONT_ORIGIN`. The Fontshare stylesheet link is removed. Font formats are git-ignored.
- 2026-10-01: Catalog categories renamed: L23 "Claude skills" is now "process templates", S18 "AI product page" is now "product launch page". Ids, names and icon files unchanged; `catalog/catalog.json` and `assets/icons/icons.json` updated together. The copies in `docs/` are left as they are.
