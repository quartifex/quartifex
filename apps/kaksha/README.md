# kaksha (S20)

**Free tool.** Planned address: `kaksha.quartifex.com`. Working name: the product name lives
in one constant, `PRODUCT_NAME` in `src/config.ts` (see "Name" below).

Kaksha (कक्षा, "classroom") is a free, installable, offline-first marking app for teachers in
India, and the one-page site that explains it. A teacher taps each child's answer (A to D,
right or wrong, or a rubric level), sees where the class stands, prints report cards and
backs up to a locked file. Student data stays on the phone: there is no account and no
server that receives it. It grew out of an assessment portal we designed for a classroom NGO
in 2019.

Uses `stillness` (motion policy for the scroll moment), and is measured with `heft` (budgets)
and `contactsheet` (device matrix).

## What is where

| Path | What |
| --- | --- |
| `src/product/` | The app at `/app`: React 19, Dexie, a static, code-split bundle built by `scripts/build-app.mjs` into `public/app/` |
| `src/lib/` | Data model, scoring rules, templates (Zod), encrypted backups, CSV, demo data. Unit tested |
| `src/i18n/locales/` | One JSON file per language (English, Hindi) |
| `src/sw/sw.ts` | The Serwist service worker, built by `scripts/sw.mjs` into `public/sw.js` |
| `src/site/`, `src/app/` | The product page at `/` and `/hi` (Next.js App Router), and `/api/contact` |
| `content/docs/` | The documentation, MDX |
| `public/templates/`, `public/schema/` | The three example templates and the published template schema |
| `public/brand/` | Tikki (the mark), the maskable icon, the wordmark lockup. `logo.svg` is the one file to swap for the final logo |
| `scripts/brand/` | Draws the brand SVGs from code |

## Run

```sh
pnpm --filter @quartifex/site-kaksha dev        # http://localhost:3500 and /app
pnpm --filter @quartifex/site-kaksha build
PW_CHANNEL=chrome pnpm --filter @quartifex/site-kaksha e2e
node apps/kaksha/scripts/shots.mjs   # install screenshots into public/shots (git-ignored)
node apps/kaksha/scripts/heft.mjs    # budgets, writes reports/kaksha/heft.*
node apps/kaksha/scripts/sheet.mjs   # contactsheet, site and app, plus low-end Android
node apps/kaksha/scripts/audit.mjs   # axe on 68 page states, and Lighthouse
```

Environment for the contact form (Vercel project settings, never in git):
`KAKSHA_RESEND_KEY`, `KAKSHA_CONTACT_TO`, `KAKSHA_CONTACT_FROM`. Without them the form says it
is not switched on yet (HTTP 503).

## Launch gate

Do not deploy to the custom domain until every line is true.

- [x] The label is on the page and accurate ("Free tool"). Demo data is invented and says so.
- [x] No raster, video or client-owned model is committed (screenshots and icons are generated at build).
- [x] `prefers-reduced-motion` has a complete path (three stills instead of the pinned run). Nothing is conveyed by motion alone.
- [x] axe: 0 violations across 68 page states (WCAG 2.2 AA). A manual keyboard and screen-reader pass is still to do.
- [x] Budgets: `/app` initial JS 112.4 kB gzip of 150; heft within budget; site LCP 1.3 to 1.4 s, CLS 0 to 0.002 on the mid-range profile.
- [ ] `/app` interactive under 3 s over slow 3G (400 ms, 400 kbit/s) on first visit: **4.8 s** (2.1 s on Lighthouse's mobile network). See STATUS.md.
- [x] Playwright behaviour tests pass against the production build.
- [ ] Hindi reviewed by a native speaker. Name confirmed. TFI wording confirmed.

## Name

"Kaksha" clashes: Samagra Shiksha Assam's e-Kaksha, an iOS app "eKaksha", Kaksha Live and
Kaksha Learning exist. It stays the working name until Nitesh chooses one.

## Licence

MIT (code), as the rest of this repository. Open code is how a school can check the privacy
claims for itself. Fonts: SIL Open Font License (see `licence-check.md`).
