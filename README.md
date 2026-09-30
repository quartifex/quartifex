# Quartifex

Open-source libraries, proof sites and small experiments for cinematic, scroll-driven web
launches. We build the tools we need for our own client work and publish them here.

This repo holds:

- **Libraries** (`packages/*`), published as `@quartifex/<name>`: ESM, typed,
  framework-neutral, with GSAP as an optional peer dependency.
- **The Lab hub** (`apps/lab`), a catalog of everything we are building, each item marked
  built or soon.
- **Proof sites** (`apps/<name>`), each carrying an accurate label of what it is.

Nothing here is published to npm yet. `STATUS.md` shows the state of every item.

## Requirements

Node 22 or newer, and pnpm.

```sh
pnpm install
pnpm dev      # the hub runs on http://localhost:3100
pnpm check    # typecheck, lint, test, size
```

## Principles

- Reduced motion is respected everywhere, and nothing is conveyed by motion alone.
- Keyboard and screen-reader access are part of done, not a later pass.
- Every library ships with a size budget that CI enforces.
- Every showcase carries an accurate label. Invented brands are marked fictional.

## Licence

MIT. See `LICENSE`. GSAP, where a library can use it, is installed separately and keeps
its own licence: see `licence-check.md`.
