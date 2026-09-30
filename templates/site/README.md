# __NAME__

__CATEGORY__. **__LABEL__.** Planned address: `__HOST__`.

TODO: two sentences, in our voice, on what this site proves and which libraries it uses.

## Run

```sh
pnpm --filter @quartifex/site-__NAME__ dev
```

## Launch gate

Do not deploy until every line is true.

- [ ] The label above is on the page and accurate (Client Project, Personal Concept,
      Personal Case Study, Open-source demo or Free tool). Invented brands are marked fictional.
- [ ] Rendered or generated visuals are captioned "Concept visual" or "Illustrative".
- [ ] No raster, video or client-owned model is committed: they are served from Cloudinary or R2.
- [ ] `prefers-reduced-motion` has a complete, usable path. Nothing is conveyed by motion alone.
- [ ] Keyboard and screen-reader pass done.
- [ ] Budgets in `budget.json` met; LCP under 2.5 s and CLS under 0.1 on a mid-range mobile profile.
- [ ] Playwright behaviour tests pass against the production build.
- [ ] `pnpm check` is green. Catalog entry marked `built`. `STATUS.md` updated.

## Licence

MIT (code). Assets as noted per file.
